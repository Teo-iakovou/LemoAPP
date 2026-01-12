const moment = require("moment-timezone");
const Customer = require("../models/customer");
const { sendSMS } = require("../utils/smsService");

const NEW_YEAR_MESSAGE =
  "Η ομάδα του Lemobarbershop σας εύχεται Καλή Χρονιά! Σας ευχαριστούμε και σας περιμένουμε ξανά μέσα στο 2026.🎉";

/**
 * Broadcast the New Year greeting to every customer once per year.
 * Pass `{ force: true }` when triggering manually outside 1/1 Athens time.
 */
const sendNewYearSMS = async ({ force = false } = {}) => {
  const tz = "Europe/Athens";
  const nowAthens = moment().tz(tz);
  const day = nowAthens.date();
  const month = nowAthens.month() + 1; // zero-based
  const currentYear = nowAthens.year();
  const timestamp = nowAthens.format("YYYY-MM-DD HH:mm:ss");

  if (!force && (day !== 1 || month !== 1)) {
    console.log(
      `[${timestamp}] 🗓️ New Year broadcast skipped — not 1/1 in ${tz}.`
    );
    return { skipped: true, reason: "not-new-year" };
  }

  const customers = await Customer.find({
    phoneNumber: { $exists: true, $ne: null },
  });

  const stats = {
    totalCustomers: customers.length,
    sent: 0,
    failed: 0,
    alreadySent: 0,
  };

  for (const customer of customers) {
    const phone = customer.phoneNumber;
    if (!phone) {
      stats.failed += 1;
      continue;
    }

    const lastYear =
      customer.lastNewYearSMS &&
      moment(customer.lastNewYearSMS).tz(tz).year();

    if (lastYear === currentYear) {
      stats.alreadySent += 1;
      continue;
    }

    try {
      const result = await sendSMS(phone, NEW_YEAR_MESSAGE);
      customer.lastNewYearSMS = nowAthens.toDate();
      await customer.save();

      if (typeof customer.logReminder === "function") {
        await customer.logReminder("new-year", {
          messageId: result?.message_id || result?.messageId || null,
          status: result?.success ? "sent" : result?.status || "sent",
          messageText: NEW_YEAR_MESSAGE,
          senderId: "Lemobarbershop",
          retryCount: 0,
        });
      }

      stats.sent += 1;
    } catch (err) {
      stats.failed += 1;
      console.error(
        `[${timestamp}] ❌ New Year SMS failed for ${phone}: ${err.message}`
      );
      if (typeof customer.logReminder === "function") {
        await customer.logReminder("new-year", {
          messageId: null,
          status: "failed",
          messageText: NEW_YEAR_MESSAGE,
          senderId: "Lemobarbershop",
          retryCount: 0,
          error: err.message,
        });
      }
    }
  }

  console.log(
    `[${timestamp}] 🎉 New Year SMS broadcast finished: ${JSON.stringify(
      stats
    )}`
  );
  return stats;
};

module.exports = { sendNewYearSMS };
