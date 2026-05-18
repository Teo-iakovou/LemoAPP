#!/usr/bin/env node
"use strict";

const mongoose = require("mongoose");
const connectDB = require("../utils/db");
const PublicBookingSettings = require("../models/publicBookingSettings");

const DRY_RUN = !process.argv.includes("--apply");
const BARBERS = ["LEMO", "FOROU", "KOUSHIS"];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

async function run() {
  await connectDB();
  console.log("✅ Connected to MongoDB");

  const doc = await PublicBookingSettings.getSingleton();
  const globalBlocked = asArray(doc.blockedDates);
  const globalClosed = asArray(doc.closedMonths);
  const beforeBlocked = doc.barberBlockedDates && typeof doc.barberBlockedDates === "object" ? doc.barberBlockedDates : {};
  const beforeClosed = doc.barberClosedMonths && typeof doc.barberClosedMonths === "object" ? doc.barberClosedMonths : {};

  const nextBlocked = { ...beforeBlocked };
  const nextClosed = { ...beforeClosed };

  BARBERS.forEach((key) => {
    nextBlocked[key] = asArray(nextBlocked[key]).length ? asArray(nextBlocked[key]) : [...globalBlocked];
    nextClosed[key] = asArray(nextClosed[key]).length ? asArray(nextClosed[key]) : [...globalClosed];
  });

  console.log("🔎 Migration preview:", {
    dryRun: DRY_RUN,
    globalBlockedCount: globalBlocked.length,
    globalClosedCount: globalClosed.length,
    beforeBarberBlockedKeys: Object.keys(beforeBlocked),
    beforeBarberClosedKeys: Object.keys(beforeClosed),
    afterBarberBlockedCounts: Object.fromEntries(BARBERS.map((k) => [k, asArray(nextBlocked[k]).length])),
    afterBarberClosedCounts: Object.fromEntries(BARBERS.map((k) => [k, asArray(nextClosed[k]).length])),
  });

  if (DRY_RUN) {
    console.log("🟡 Dry-run only. Re-run with --apply to persist.");
    return;
  }

  doc.barberBlockedDates = nextBlocked;
  doc.barberClosedMonths = nextClosed;
  await doc.save();

  console.log("✅ Migration applied.");
}

run()
  .catch((err) => {
    console.error("❌ Script failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.connection.close();
    } catch {
      // ignore
    }
  });

