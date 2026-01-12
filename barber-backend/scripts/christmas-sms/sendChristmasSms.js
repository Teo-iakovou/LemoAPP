#!/usr/bin/env node
/**
 * Manual Christmas SMS broadcast script
 *
 * Usage:
 *   NODE_ENV=production node scripts/christmas-sms/sendChristmasSms.js
 *
 * Make sure the process has access to the same environment variables that the
 * backend uses (at minimum MONGODB_URI and SMS_TO_API_KEY).
 */

const mongoose = require("mongoose");
const connectDB = require("../../utils/db");
const Customer = require("../../models/customer");
const { sendSMS } = require("../../utils/smsService");

const CHRISTMAS_MESSAGE =
  "Η ομάδα του Lemobarbershop σας εύχεται Καλά Χριστούγεννα! Σας ευχαριστούμε για την εμπιστοσύνη και ανυπομονούμε να σας περιποιηθούμε ξανά μέσα στη νέα χρονιά. 🎄";

async function broadcastChristmasSMS() {
  await connectDB();

  const customers = await Customer.find({
    phoneNumber: { $exists: true, $ne: null },
  });

  if (!customers.length) {
    console.log("⚠️ No customers with phone numbers found.");
    return;
  }

  console.log(`📣 Sending Christmas SMS to ${customers.length} customers...`);

  const stats = {
    total: customers.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  const currentYear = new Date().getFullYear();

  for (const customer of customers) {
    const recipient = customer.phoneNumber;

    if (customer.lastChristmasSMS) {
      const lastYear = customer.lastChristmasSMS.getFullYear();
      if (lastYear === currentYear) {
        stats.skipped += 1;
        console.log(
          `⏭️  Skipping ${customer.name || recipient} (already sent this year)`
        );
        continue;
      }
    }
    if (!recipient) {
      stats.failed += 1;
      stats.errors.push({
        customerId: customer._id,
        name: customer.name,
        reason: "missing phone number",
      });
      continue;
    }

    try {
      await sendSMS(recipient, CHRISTMAS_MESSAGE);
      customer.lastChristmasSMS = new Date();
      await customer.save();
      stats.sent += 1;
      console.log(`✅ SMS sent to ${customer.name || recipient}`);
    } catch (err) {
      stats.failed += 1;
      stats.errors.push({
        customerId: customer._id,
        name: customer.name,
        phoneNumber: recipient,
        reason: err.message,
      });
      console.error(`❌ Failed for ${customer.name || recipient}: ${err.message}`);
    }
  }

  console.log("🎄 Christmas SMS broadcast complete:", stats);
  if (stats.errors.length) {
    console.log("⚠️ Errors:", stats.errors);
  }
}

broadcastChristmasSMS()
  .catch((err) => {
    console.error("🚨 Script failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
  });
