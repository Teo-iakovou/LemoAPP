const moment = require("moment-timezone");
const Customer = require("../models/customer");
const { sendSMS } = require("../utils/smsService");

const CHRISTMAS_MESSAGE =
  "Η ομάδα του Lemobarbershop σας εύχεται Καλά Χριστούγεννα! Σας ευχαριστούμε για την εμπιστοσύνη και ανυπομονούμε να σας περιποιηθούμε ξανά μέσα στη νέα χρονιά. 🎄";

/**
 * Broadcast a single Christmas SMS to every customer.
 * Only runs on 25/12 Athens time unless `force` is true.
 */
const sendChristmasSMS = async ({ force = false } = {}) => {
  const tz = "Europe/Athens";
  const nowAthens = moment().tz(tz);
  const todayDay = nowAthens.date();
  const todayMonth = nowAthens.month() + 1; // zero-based internally
  const currentYear = nowAthens.year();
  const timestamp = nowAthens.format("YYYY-MM-DD HH:mm:ss");

  if (!force && (todayDay !== 25 || todayMonth !== 12)) {
    console.log(
      `[${timestamp}] 🎄 Christmas broadcast skipped - not 25/12 in ${tz}.`
    );
    return {
      skipped: true,
      reason: "not-christmas",
    };
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
    const lastYear =
      customer.lastChristmasSMS &&
      moment(customer.lastChristmasSMS).tz(tz).year();

    if (lastYear === currentYear) {
      stats.alreadySent += 1;
      continue;
    }

    try {
      const result = await sendSMS(customer.phoneNumber, CHRISTMAS_MESSAGE);
      customer.lastChristmasSMS = nowAthens.toDate();
      await customer.save();

      // Attach lightweight reminder history when available
      if (typeof customer.logReminder === "function") {
        await customer.logReminder("christmas", {
          messageId: result?.message_id || result?.messageId || null,
          status: result?.success ? "sent" : result?.status || "sent",
          messageText: CHRISTMAS_MESSAGE,
          senderId: "Lemobarbershop",
          retryCount: 0,
        });
      }

      stats.sent += 1;
    } catch (err) {
      console.error(
        `[${timestamp}] ❌ Christmas SMS failed for ${customer.phoneNumber}: ${err.message}`
      );

      if (typeof customer.logReminder === "function") {
        await customer.logReminder("christmas", {
          messageId: null,
          status: "failed",
          messageText: CHRISTMAS_MESSAGE,
          senderId: "Lemobarbershop",
          retryCount: 0,
          error: err.message,
        });
      }

      stats.failed += 1;
    }
  }

  console.log(
    `[${timestamp}] 🎄 Christmas SMS broadcast finished: ${JSON.stringify(
      stats
    )}`
  );
  return stats;
};

module.exports = { sendChristmasSMS };
