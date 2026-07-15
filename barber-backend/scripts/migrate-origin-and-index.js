/**
 * Migration: backfill Appointment.origin + create the public-only partial unique index.
 *
 * SAFE BY DEFAULT: runs as a DRY RUN unless you pass --apply.
 *   Dry run (report only, no writes):   node scripts/migrate-origin-and-index.js
 *   Apply (backfill + tag + index):     node scripts/migrate-origin-and-index.js --apply
 *
 * Order of operations (apply):
 *   1. Backfill `origin`: default 'public', promote to 'admin' for staff/auto/break/lock/createdBy.
 *   2. Tag two known HISTORICAL double-booked rows as 'admin' (see DUPE_ADMIN_TAGS) so the
 *      unique index can build. These are NOT data errors — see the note below.
 *   3. Duplicate pre-check, scoped exactly like the index. Must be empty.
 *   4. Create the partial unique index. createIndex NEVER deletes documents.
 *
 * Does NOT drop any index and does NOT delete any data.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Appointment = require("../models/appointment");

const APPLY = process.argv.includes("--apply");

const INDEX_KEYS = { barber: 1, appointmentDateTime: 1, type: 1 };
const INDEX_OPTIONS = {
  unique: true,
  partialFilterExpression: { origin: "public", appointmentStatus: "confirmed" },
  name: "uniq_public_confirmed_slot",
};

// "Created by staff/admin" rules — evaluated independently (breakdown) and combined
// via $or (promotion) / $nor (would-be public).
const RULES = {
  "user set":        { user: { $exists: true, $ne: null } },
  "auto-customer":   { "source.kind": "auto-customer" },
  "break|lock type": { type: { $in: ["break", "lock"] } },
  "createdBy set":   { createdBy: { $exists: true, $ne: null } },
};
const ADMIN_OR = Object.values(RULES);
const ADMIN_MATCH = { $or: ADMIN_OR };

/**
 * WHY THESE TWO ROWS ARE TAGGED 'admin' (do NOT treat as a data error):
 * Both are genuine, historical (already-occurred) double-bookings — two different real
 * customers landed on the exact same barber+slot. They are exactly the race the new
 * partial unique index prevents going forward, but they predate the index and would
 * block its creation. Per policy we keep BOTH records (no deletion) and tag the LATER
 * booking (the one that "lost" the race, by ObjectId creation time) as 'admin' so it is
 * excluded from the public-only unique index. Zero functional impact (past appointments).
 *   • ΦΟΡΟΥ  2026-05-28 07:20 — tag "Mad clip"  (created 2026-05-28 07:16; kept public: Gewrgiou, 2026-05-25)
 *   • ΚΟΥΣΙΗΣ 2026-06-24 11:20 — tag "Prokopiou" (created 2026-06-24 08:26; kept public: Poupoukshios, 2026-06-20)
 */
const DUPE_ADMIN_TAGS = [
  { id: "6a17ebb2e4ceb113ca565a92", note: "ΦΟΡΟΥ 2026-05-28 07:20 — later of double-booked pair (Mad clip)" },
  { id: "6a3b94cf3cea863c0b4a5433", note: "ΚΟΥΣΙΗΣ 2026-06-24 11:20 — later of double-booked pair (Prokopiou)" },
];
const DUPE_TAG_OIDS = DUPE_ADMIN_TAGS.map((t) => new mongoose.Types.ObjectId(t.id));

// A row ends up 'public' iff it matches no admin rule AND is not one of the tagged dupes.
const PUBLIC_EFFECTIVE = { $and: [{ $nor: ADMIN_OR }, { _id: { $nin: DUPE_TAG_OIDS } }] };

async function tagDupe({ id, note }) {
  const now = new Date();
  const _id = new mongoose.Types.ObjectId(id);
  // GUARD: only mutate the exact _id, and only if it is currently 'public' AND in the past.
  const res = await Appointment.updateOne(
    { _id, origin: "public", appointmentDateTime: { $lt: now } },
    { $set: { origin: "admin" } }
  );
  if (res.modifiedCount === 1) {
    console.log(`  ✓ tagged admin: ${id} — ${note}`);
    return;
  }
  const d = await Appointment.findById(_id).select({ origin: 1, appointmentDateTime: 1 }).lean();
  if (!d) {
    console.error(`  ✗ LOUD: ${id} NOT FOUND — skipped, no mutation.`);
  } else if (d.origin === "admin") {
    console.log(`  = already 'admin' (idempotent re-run): ${id}`);
  } else {
    console.error(`  ✗ LOUD: ${id} guard failed — origin=${d.origin}, datetime=${d.appointmentDateTime?.toISOString()}, now=${now.toISOString()}. Skipped, no mutation.`);
  }
}

async function reportDupeTagsDryRun() {
  const now = new Date();
  for (const t of DUPE_ADMIN_TAGS) {
    const _id = new mongoose.Types.ObjectId(t.id);
    const d = await Appointment.findById(_id).select({ origin: 1, appointmentDateTime: 1, customerName: 1 }).lean();
    if (!d) { console.error(`  ✗ LOUD: ${t.id} NOT FOUND.`); continue; }
    const past = d.appointmentDateTime < now;
    const isAdminByRule = await Appointment.countDocuments({ _id, ...ADMIN_MATCH });
    const ok = past && isAdminByRule === 0;
    console.log(`  ${ok ? "would tag admin" : "✗ LOUD would NOT tag"}: ${t.id} — ${t.note} (past=${past}, adminByRule=${isAdminByRule > 0}, currentOrigin=${d.origin ?? "unset→public"})`);
  }
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(`Connected. Mode: ${APPLY ? "APPLY (writes enabled)" : "DRY RUN (no writes)"}\n`);

  const total = await Appointment.countDocuments({});
  const publicCount = await Appointment.countDocuments(PUBLIC_EFFECTIVE);
  console.log("=== ORIGIN BACKFILL PROJECTION (final state) ===");
  console.log(`Total appointments:     ${total}`);
  console.log(`→ end up 'admin':        ${total - publicCount}   (incl. 2 tagged historical dupes)`);
  console.log(`→ end up 'public':       ${publicCount}\n`);

  console.log("Admin promotions BY RULE (rules overlap; excludes the 2 explicit dupe tags):");
  for (const [label, filter] of Object.entries(RULES)) {
    console.log(`   ${label.padEnd(16)} ${await Appointment.countDocuments(filter)}`);
  }
  console.log("");

  console.log("=== SAMPLE: 5 rows promoted to 'admin' because `user` is set ===");
  const sample = await Appointment.find(RULES["user set"])
    .select({ customerName: 1, phoneNumber: 1, type: 1, appointmentStatus: 1, user: 1, createdBy: 1, "source.kind": 1, appointmentDateTime: 1 })
    .sort({ appointmentDateTime: -1 }).limit(5).lean();
  sample.length
    ? sample.forEach((a, i) => console.log(`   [${i + 1}] ${a.type}/${a.appointmentStatus} | name=${JSON.stringify(a.customerName)} phone=${a.phoneNumber ? "yes" : "no"} | user=${a.user} source=${a.source?.kind ?? "-"} | ${a.appointmentDateTime?.toISOString?.()}`))
    : console.log("   (none)");
  console.log("");

  // 1) BACKFILL then 2) TAG DUPES — order matters: the tag guard requires origin:'public',
  //    which the backfill sets. Dry run performs neither; it only reports.
  if (APPLY) {
    console.log("=== BACKFILL ===");
    const pub = await Appointment.updateMany({ origin: { $exists: false } }, { $set: { origin: "public" } });
    const adm = await Appointment.updateMany(ADMIN_MATCH, { $set: { origin: "admin" } });
    console.log(`  set public: ${pub.modifiedCount}, promoted admin: ${adm.modifiedCount}\n`);

    console.log("=== HISTORICAL DUPE TAGS ===");
    for (const t of DUPE_ADMIN_TAGS) await tagDupe(t);
    console.log("");
  } else {
    console.log("=== HISTORICAL DUPE TAGS (dry run) ===");
    await reportDupeTagsDryRun();
    console.log("");
  }

  // 3) DUPLICATE PRE-CHECK — over the rows that will remain 'public'.
  console.log("=== DUPLICATE PRE-CHECK (rows that will remain public) ===");
  const dupes = await Appointment.aggregate([
    { $match: { type: "appointment", appointmentStatus: "confirmed", ...PUBLIC_EFFECTIVE } },
    { $group: { _id: { barber: "$barber", t: "$appointmentDateTime" }, n: { $sum: 1 }, ids: { $push: "$_id" } } },
    { $match: { n: { $gt: 1 } } },
  ]);
  if (dupes.length > 0) {
    console.error(`✗ Found ${dupes.length} duplicate public slot group(s) — resolve before creating the index:`);
    dupes.forEach((d) => console.error(`   ${d._id.barber} @ ${d._id.t?.toISOString?.()} → ${d.n}: ${d.ids.join(", ")}`));
    if (APPLY) { console.error("\nIndex NOT created. No data deleted."); await mongoose.connection.close(); process.exit(1); }
  } else {
    console.log("✓ No duplicate public confirmed slots — safe to create the index.\n");
  }

  // 3) CREATE INDEX (apply only)
  if (APPLY) {
    const name = await Appointment.collection.createIndex(INDEX_KEYS, INDEX_OPTIONS);
    console.log(`✓ Index created: ${name}`);
  } else {
    console.log("(dry run — no writes made. Re-run with --apply to backfill, tag, and create the index.)");
  }

  await mongoose.connection.close();
  console.log("\nDone.");
}

main().catch(async (err) => {
  console.error("Migration failed:", err.message);
  try { await mongoose.connection.close(); } catch {}
  process.exit(1);
});
