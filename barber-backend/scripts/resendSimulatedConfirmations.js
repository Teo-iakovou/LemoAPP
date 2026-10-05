/**
 * resendSimulatedConfirmations.js
 *
 * Recovery for the 05/10/2026 14:51 UTC auto-customer push that was run from a LOCAL backend
 * (NODE_ENV=development, SMS_ENABLED unset) against the production database. sendSMS simulated
 * every confirmation, but the push recorded them as reminders { type: "confirmation",
 * status: "sent", messageId: "SIMULATED" } — so the customers were never actually told.
 *
 * Sends ONE confirmation per customer, built from the appointments that exist NOW:
 *   - only appointments of batch BATCH_ID still confirmed and still in the future
 *   - only reminders still carrying messageId "SIMULATED" (already-resent ones are excluded,
 *     so re-running never sends twice)
 *   - same wording as the push (autoCustomerScheduler.js)
 *
 * DRY-RUN by default: prints customer / phone / exact text and writes nothing.
 *
 * With --send (and SMS_ENABLED=true in the environment) each customer is processed as:
 *   1. claim:  SIMULATED -> "CLAIMED:<runId>" on that customer's reminders (atomic per appt)
 *   2. send
 *   3. success -> real messageId, real sentAt, the text actually sent
 *      failure / 429 -> claim reverted to "SIMULATED" so a later run can retry it
 * If the process dies between 2 and 3 the reminder stays "CLAIMED:..." and is NOT re-sent by a
 * later run (it is reported instead) — a possible missed record beats a duplicate SMS.
 *
 * Usage:
 *   node scripts/resendSimulatedConfirmations.js                          # dry-run
 *   node scripts/resendSimulatedConfirmations.js --exclude=avgousti       # dry-run without a customer
 *   SMS_ENABLED=true node scripts/resendSimulatedConfirmations.js --send  # really send
 *   --only=<name|autoCustomerId>,...   --exclude=<name|autoCustomerId>,...
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const moment = require("moment-timezone");
const { sendSMS } = require("../utils/smsService");

const BATCH_ID = "6ac3b97153a87ee9ce54234a";
const SIMULATED = "SIMULATED";
const TZ = "Europe/Athens";
const SEND_DELAY_MS = 250;

const SEND = process.argv.includes("--send");
const listArg = (name) => {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!arg) return null;
  return new Set(
    arg
      .slice(name.length + 3)
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
};
const ONLY = listArg("only");
const EXCLUDE = listArg("exclude");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Same as autoCustomerScheduler.getBarberDisplayName (not exported there).
const getBarberDisplayName = (barber = "") => (barber === "ΚΟΥΣΙΗΣ" ? "ΚΟΥΣΙΗ" : barber);

// Same wording as the push confirmation in autoCustomerScheduler.js.
const buildMessage = (barber, dates) => {
  const displayBarber = getBarberDisplayName(barber);
  const formattedDates = dates.join(", ");
  return `Επιβεβαιώνουμε τα ραντεβού σας στο LEMO BARBER SHOP με τον ${displayBarber} για τις ημερομηνίες: ${formattedDates}.\nWe confirm your appointments at LEMO BARBER SHOP with ${displayBarber} for the dates: ${formattedDates}.`;
};

const matches = (set, group) =>
  set.has(String(group.customerName || "").toLowerCase()) || set.has(group.key.toLowerCase());

async function main() {
  if (SEND && String(process.env.SMS_ENABLED || "").toLowerCase() !== "true") {
    console.error("❌ --send requires SMS_ENABLED=true in the environment. Nothing done.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  const appointments = db.collection("appointments");
  const now = new Date();
  const runId = `CLAIMED:${now.toISOString()}`;

  console.log(`DB host: ${mongoose.connection.host} / ${db.databaseName}`);
  console.log(`Mode: ${SEND ? "🚨 SEND" : "dry-run (nothing is sent or written)"}`);
  console.log(`Now: ${moment(now).tz(TZ).format("DD/MM/YYYY HH:mm")} (Athens)\n`);

  // Reminders left mid-flight by an earlier crashed run: never auto-resend, just report.
  const stuck = await appointments
    .find({ "source.batchId": BATCH_ID, "reminders.messageId": /^CLAIMED:/ })
    .project({ customerName: 1, appointmentDateTime: 1 })
    .toArray();
  if (stuck.length) {
    console.warn(`⚠️  ${stuck.length} appointment(s) have a CLAIMED reminder from an interrupted run (not re-sent):`);
    stuck.forEach((a) => console.warn(`   ${a.customerName} ${a.appointmentDateTime.toISOString()}`));
    console.warn("");
  }

  const pending = await appointments
    .find({
      "source.batchId": BATCH_ID,
      appointmentStatus: "confirmed",
      type: "appointment",
      appointmentDateTime: { $gt: now },
      reminders: { $elemMatch: { type: "confirmation", messageId: SIMULATED } },
    })
    .sort({ appointmentDateTime: 1 })
    .toArray();

  // One SMS per customer (auto-customer card; phone as fallback key).
  const groups = new Map();
  for (const appt of pending) {
    const key = appt.source?.autoCustomerId ? String(appt.source.autoCustomerId) : String(appt.phoneNumber);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        customerName: appt.customerName,
        phoneNumber: appt.phoneNumber,
        barber: appt.barber,
        appts: [],
      });
    }
    groups.get(key).appts.push(appt);
  }

  let list = Array.from(groups.values());
  if (ONLY) list = list.filter((g) => matches(ONLY, g));
  if (EXCLUDE) list = list.filter((g) => !matches(EXCLUDE, g));

  // Possible double booking: another confirmed appointment for the same phone within 3 days
  // of one being confirmed here (e.g. a slot that was moved, then refilled by the push).
  for (const g of list) {
    g.warnings = [];
    for (const appt of g.appts) {
      const near = await appointments.findOne({
        _id: { $ne: appt._id },
        phoneNumber: appt.phoneNumber,
        appointmentStatus: "confirmed",
        type: "appointment",
        appointmentDateTime: {
          $gte: new Date(appt.appointmentDateTime.getTime() - 3 * 864e5),
          $lte: new Date(appt.appointmentDateTime.getTime() + 3 * 864e5),
        },
      });
      if (near) {
        g.warnings.push(
          `${moment(appt.appointmentDateTime).tz(TZ).format("DD/MM HH:mm")} is near another appointment on ${moment(near.appointmentDateTime).tz(TZ).format("DD/MM HH:mm")}`
        );
      }
    }
  }

  list.forEach((g, index) => {
    g.dates = g.appts.map((a) => moment(a.appointmentDateTime).tz(TZ).format("DD/MM/YYYY HH:mm"));
    g.message = buildMessage(g.barber, g.dates);
    console.log(`#${index + 1}  ${g.customerName}  |  ${g.phoneNumber || "— NO PHONE (skipped)"}  |  ${g.barber}  |  ${g.appts.length} ραντεβού`);
    console.log(g.message.split("\n").map((line) => `    ${line}`).join("\n"));
    g.warnings.forEach((w) => console.log(`    ⚠️  possible double booking: ${w}`));
    console.log("");
  });

  const sendable = list.filter((g) => g.phoneNumber);
  console.log(`Total: ${sendable.length} SMS to send (${list.length - sendable.length} without phone).`);

  if (!SEND) {
    console.log("\nDry-run only. Nothing sent, nothing written.");
    await mongoose.disconnect();
    return;
  }

  const result = { sent: 0, failed: 0, skipped: 0 };
  for (const g of sendable) {
    const ids = g.appts.map((a) => a._id);

    // 1. Claim. Only reminders still SIMULATED are touched, so a concurrent/previous run that
    //    already claimed or sent them makes this a no-op and we skip the customer.
    const claim = await appointments.updateMany(
      { _id: { $in: ids }, reminders: { $elemMatch: { type: "confirmation", messageId: SIMULATED } } },
      { $set: { "reminders.$[r].messageId": runId } },
      { arrayFilters: [{ "r.type": "confirmation", "r.messageId": SIMULATED }] }
    );
    if (claim.modifiedCount !== ids.length) {
      console.warn(`⏭  ${g.customerName}: claimed ${claim.modifiedCount}/${ids.length} — skipping, releasing claim.`);
      await appointments.updateMany(
        { _id: { $in: ids } },
        { $set: { "reminders.$[r].messageId": SIMULATED } },
        { arrayFilters: [{ "r.messageId": runId }] }
      );
      result.skipped += 1;
      continue;
    }

    const release = (error) =>
      appointments.updateMany(
        { _id: { $in: ids } },
        { $set: { "reminders.$[r].messageId": SIMULATED, "reminders.$[r].error": error } },
        { arrayFilters: [{ "r.messageId": runId }] }
      );

    // 2. Send.
    let response;
    try {
      response = await sendSMS(g.phoneNumber, g.message, { smsType: "confirmation" });
    } catch (error) {
      await release(error.message);
      console.error(`❌ ${g.customerName} (${g.phoneNumber}): ${error.message} — left as SIMULATED for retry.`);
      result.failed += 1;
      await sleep(SEND_DELAY_MS);
      continue;
    }

    if (response?.simulated) {
      await release("simulated again — SMS sending not enabled");
      console.error("❌ sendSMS simulated instead of sending. Check SMS_ENABLED. Stopping.");
      break;
    }
    if (response?.rateLimited) {
      await release("sms.to rate limited (429)");
      console.warn(`⏳ Rate limited at ${g.customerName}. Stopping; re-run later to continue.`);
      break;
    }
    if (!response?.success) {
      await release("provider returned no success");
      console.error(`❌ ${g.customerName} (${g.phoneNumber}): provider returned no success — left as SIMULATED.`);
      result.failed += 1;
      await sleep(SEND_DELAY_MS);
      continue;
    }

    // 3. Record the real send.
    const messageId = response.message_id || response.messageId || null;
    const sentAt = new Date();
    await appointments.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          "reminders.$[r].messageId": messageId,
          "reminders.$[r].sentAt": sentAt,
          "reminders.$[r].status": "sent",
          "reminders.$[r].messageText": g.message,
        },
        $unset: { "reminders.$[r].error": "" },
      },
      { arrayFilters: [{ "r.messageId": runId }] }
    );
    console.log(`✅ ${g.customerName} (${g.phoneNumber}) messageId=${messageId} at ${sentAt.toISOString()}`);
    result.sent += 1;
    await sleep(SEND_DELAY_MS);
  }

  console.log(`\nDone: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped.`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("❌ Script failed:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
