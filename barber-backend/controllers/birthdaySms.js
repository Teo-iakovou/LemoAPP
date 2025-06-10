const Customer = require("../models/customer");
const { sendSMS } = require("../utils/smsService");
const moment = require("moment-timezone");

const sendBirthdaySMS = async () => {
  try {
    const tz = "Europe/Athens";
    const nowAthens = moment().tz(tz);
    const todayDay = nowAthens.date();
    const todayMonth = nowAthens.month() + 1; // month is 0-based
    const thisYear = nowAthens.year();

    // Find all customers with a dateOfBirth set
    const customers = await Customer.find({
      dateOfBirth: { $exists: true, $ne: null },
    });

    // Filter for today's birthdays (by day & month)
    const birthdayCustomers = customers.filter((c) => {
      const dob = moment(c.dateOfBirth);
      // Already sent this year? (to avoid double-send)
      const lastSMSYear = c.lastBirthdaySMS
        ? moment(c.lastBirthdaySMS).year()
        : null;
      return (
        dob.date() === todayDay &&
        dob.month() + 1 === todayMonth &&
        lastSMSYear !== thisYear
      );
    });

    console.log(
      `🎂 Found ${birthdayCustomers.length} customers with birthday today (${todayDay}/${todayMonth})`
    );

    for (const customer of birthdayCustomers) {
      const message =
        "Χρόνια σας πολλά! Σας ευχόμαστε μια υπέροχη ημέρα γενεθλίων και μια χρονιά γεμάτη υγεία και χαρά. Με εκτίμηση, LemoBarberShop";

      try {
        const result = await sendSMS(customer.phoneNumber, message);

        // Save lastBirthdaySMS to avoid duplicate sends
        customer.lastBirthdaySMS = nowAthens.toDate();
        await customer.save();

        // Optionally, add log entry for auditing (if you use a logs/reminders array)
        if (typeof customer.logReminder === "function") {
          await customer.logReminder("birthday", {
            messageId: result?.message_id || result?.messageId || null,
            status: result?.success ? "sent" : result?.status || "failed",
            messageText: message,
            senderId: "LemoBarberShop",
            retryCount: 0,
          });
        }

        console.log(
          `✅ Birthday SMS sent to ${customer.phoneNumber} (${
            customer.name || "no name"
          })`
        );
      } catch (err) {
        console.error(
          `❌ SMS failed for ${customer.phoneNumber}:`,
          err.message
        );

        // Optionally, log failed attempt
        if (typeof customer.logReminder === "function") {
          await customer.logReminder("birthday", {
            messageId: null,
            status: "failed",
            messageText: message,
            senderId: "LemoBarberShop",
            retryCount: 0,
          });
        }
      }
    }
  } catch (err) {
    console.error("❌ Birthday SMS script failed:", err.message);
  }
};

module.exports = { sendBirthdaySMS };
