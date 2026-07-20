"use strict";

/**
 * Backfill the `until` ("Λήξη") field for existing auto-customers.
 *
 * Targets cards that HAVE a count (maxOccurrences) but whose `until` is null/missing,
 * and computes:
 *     firstDate = first occurrence of the card's weekday on/after startFrom
 *     until     = firstDate + cadenceWeeks * (count - 1) weeks
 * `until` is stored as UTC midnight of that calendar date, matching how the app writes it.
 *
 * SAFE BY DEFAULT: running with no flag is a DRY RUN — it prints exactly what would
 * change, per customer, and writes NOTHING. Re-run with `--apply` to perform the writes.
 * Cards that already have a `until` are never touched.
 *
 *   node scripts/backfillAutoCustomerUntil.js            # dry run (prints the plan)
 *   node scripts/backfillAutoCustomerUntil.js --apply    # writes after you approve
 */

const mongoose = require("mongoose");
const moment = require("moment-timezone");
const dotenv = require("dotenv");
dotenv.config();

const AutoCustomer = require("../models/autoCustomer");

const TZ = "Europe/Athens";
const APPLY = process.argv.includes("--apply");

const WEEKDAY_LABELS = ["Κυριακή", "Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο"];

const fmt = (date) => (date ? moment(date).tz(TZ).format("DD/MM/YYYY") : "—");

// Same formula as the frontend auto-fill, computed in Athens time for determinism.
const computeUntil = (customer) => {
  const count = Number(customer.maxOccurrences);
  const weekday = Number(customer.weekday);
  const cadence = Number(customer.cadenceWeeks) || 1;
  if (!customer.startFrom) return null;
  if (!Number.isFinite(count) || count < 1) return null;
  if (!Number.isFinite(weekday)) return null;

  const start = moment(customer.startFrom).tz(TZ).startOf("day");
  const firstDate = start.clone();
  const diff = (weekday - firstDate.day() + 7) % 7; // first weekday on/after startFrom
  firstDate.add(diff, "days");
  const end = firstDate.clone().add(cadence * (count - 1), "weeks");

  return new Date(Date.UTC(end.year(), end.month(), end.date()));
};

const run = async () => {
  if (!process.env.MONGODB_URI) {
    console.error("❌ MONGODB_URI is not set. Add it to barber-backend/.env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("🔌 Connected to MongoDB\n");

  const candidates = await AutoCustomer.find({
    maxOccurrences: { $ne: null, $gt: 0 },
    $or: [{ until: null }, { until: { $exists: false } }],
  }).lean();

  console.log(
    `Λειτουργία: ${APPLY ? "ΕΓΓΡΑΦΗ (--apply)" : "ΔΟΚΙΜΗ (dry run — καμία εγγραφή)"}`
  );
  console.log(`Υποψήφιοι πελάτες (count χωρίς Λήξη): ${candidates.length}\n`);

  const toUpdate = [];
  const skipped = [];

  for (const customer of candidates) {
    const until = computeUntil(customer);
    if (!until) {
      skipped.push(customer);
      continue;
    }
    toUpdate.push({ customer, until });
    console.log(
      `• ${customer.customerName}` +
        `  | Έναρξη ${fmt(customer.startFrom)}` +
        `  | ${WEEKDAY_LABELS[Number(customer.weekday)] || customer.weekday}` +
        `  | ανά ${customer.cadenceWeeks || 1} εβδ.` +
        `  | πλήθος ${customer.maxOccurrences}` +
        `  →  Λήξη ${fmt(until)}`
    );
  }

  if (skipped.length) {
    console.log(`\n⚠️  Παραλείφθηκαν ${skipped.length} (λείπουν στοιχεία για υπολογισμό):`);
    skipped.forEach((customer) =>
      console.log(`   - ${customer.customerName} (${customer._id})`)
    );
  }

  if (!APPLY) {
    console.log(
      `\n📝 ΔΟΚΙΜΗ: θα ενημερώνονταν ${toUpdate.length} πελάτες. ` +
        `Καμία αλλαγή δεν γράφτηκε.\n` +
        `   Για να εφαρμοστούν: node scripts/backfillAutoCustomerUntil.js --apply`
    );
    await mongoose.disconnect();
    process.exit(0);
  }

  let written = 0;
  for (const { customer, until } of toUpdate) {
    await AutoCustomer.updateOne({ _id: customer._id }, { $set: { until } });
    written += 1;
  }

  console.log(`\n✅ Ενημερώθηκαν ${written} πελάτες.`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (error) => {
  console.error("❌ Απέτυχε:", error.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
