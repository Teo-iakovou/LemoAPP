"use strict";

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const AutoCustomer = require("../models/autoCustomer");
const { upsertCustomerFromIdentity } = require("../utils/customerSync");

dotenv.config();

const DRY_RUN = process.argv.includes("--dry-run");

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing in env");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  const autoCustomers = await AutoCustomer.find().lean();
  console.log(`🔎 Auto customers found: ${autoCustomers.length}`);

  const stats = {
    created: 0,
    updated: 0,
    existing: 0,
    skipped: 0,
    failed: 0,
  };

  for (const item of autoCustomers) {
    const payload = {
      name: item.customerName,
      phoneNumber: item.phoneNumber,
      barber: item.barber,
    };

    try {
      if (DRY_RUN) {
        console.log(`🟡 DRY RUN sync: ${payload.name || "(no-name)"} (${payload.phoneNumber || "no-phone"})`);
        stats.existing += 1;
        continue;
      }

      const result = await upsertCustomerFromIdentity(payload);
      if (result?.status && stats[result.status] !== undefined) {
        stats[result.status] += 1;
      } else {
        stats.skipped += 1;
      }
    } catch (error) {
      stats.failed += 1;
      console.error(
        `❌ Failed syncing ${payload.name || "(no-name)"} (${payload.phoneNumber || "no-phone"}):`,
        error.message
      );
    }
  }

  await mongoose.disconnect();
  console.log("🎉 Backfill complete:", { ...stats, dryRun: DRY_RUN });
}

run().catch((error) => {
  console.error("❌ Backfill failed:", error.message);
  mongoose.disconnect();
});
