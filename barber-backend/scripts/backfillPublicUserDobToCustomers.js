#!/usr/bin/env node
"use strict";

const connectDB = require("../utils/db");
const PublicUser = require("../models/publicUser");
const Customer = require("../models/customer");
const {
  buildPhoneLookupVariants,
  normalizePhone,
  upsertCustomerFromIdentity,
} = require("../utils/customerSync");

const DRY_RUN = process.argv.includes("--dry-run");

function hasUsablePhone(phoneValue) {
  const digits = String(phoneValue || "").replace(/\D+/g, "");
  return digits.length >= 8;
}

function toDobDate(dobValue) {
  const dob = String(dobValue || "").trim();
  if (!dob) return null;
  const dt = new Date(`${dob}T00:00:00.000Z`);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

async function detectStatusForDryRun(user, dobDate) {
  const { normalized, variants } = buildPhoneLookupVariants(user.phoneNumber || "");
  const query = variants.length
    ? { $or: variants }
    : { phoneNumber: normalized || String(user.phoneNumber || "").trim() };
  const existing = await Customer.findOne(query);
  if (!existing) return "created";

  const incomingDobIso = dobDate.toISOString().slice(0, 10);
  const existingDobIso = existing.dateOfBirth
    ? new Date(existing.dateOfBirth).toISOString().slice(0, 10)
    : "";
  return incomingDobIso !== existingDobIso ? "updated" : "existing";
}

async function run() {
  await connectDB();
  console.log("✅ Connected to MongoDB");

  const publicUsers = await PublicUser.find({
    phoneNumber: { $exists: true, $ne: null, $ne: "" },
    dob: { $exists: true, $ne: null, $ne: "" },
  }).lean();

  console.log(`🔎 Public users with DOB found: ${publicUsers.length}`);

  const stats = {
    created: 0,
    updated: 0,
    existing: 0,
    skipped: 0,
    failed: 0,
    dryRun: DRY_RUN,
  };

  for (const user of publicUsers) {
    try {
      if (!hasUsablePhone(user.phoneNumber)) {
        stats.skipped += 1;
        console.log(`⚠️ Skipping non-phone identifier: ${user.username || user.phoneNumber}`);
        continue;
      }

      const dobDate = toDobDate(user.dob);
      if (!dobDate) {
        stats.skipped += 1;
        console.log(`⚠️ Skipping invalid DOB: ${user.username || user.phoneNumber}`);
        continue;
      }

      const displayName =
        String(user.displayName || user.username || normalizePhone(user.phoneNumber) || "Πελάτης").trim();

      if (DRY_RUN) {
        const status = await detectStatusForDryRun(user, dobDate);
        stats[status] += 1;
        console.log(`🟡 DRY RUN ${status}: ${displayName} (${user.phoneNumber})`);
        continue;
      }

      const result = await upsertCustomerFromIdentity({
        name: displayName,
        phoneNumber: user.phoneNumber,
        dateOfBirth: dobDate,
      });
      const status = result?.status || "skipped";
      if (stats[status] === undefined) stats[status] = 0;
      stats[status] += 1;
      console.log(`✅ Synced (${status}): ${displayName} (${user.phoneNumber})`);
    } catch (error) {
      stats.failed += 1;
      console.error(
        `❌ Failed for ${user?.username || user?.phoneNumber || "unknown"}: ${error.message}`
      );
    }
  }

  console.log("🎉 Backfill complete:", stats);
}

run()
  .catch((err) => {
    console.error("❌ Script failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      const mongoose = require("mongoose");
      await mongoose.connection.close();
    } catch {
      // ignore close errors
    }
  });
