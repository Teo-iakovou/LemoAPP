"use strict";

/**
 * STEP 1 — READ-ONLY detection of legacy one-off locks that form a weekly/biweekly
 * pattern and could be consolidated into a single recurring ("ΜΟΝΙΜΟ") lock.
 *
 * Locks live in the `appointments` collection as `type: "lock"` rows. A recurring lock is
 * NOT a single record — it is a set of individual rows tagged `lockReason: "ΜΟΝΙΜΟ"`.
 * Everything else is treated as an individual/legacy lock.
 *
 * This script GROUPS the individual (non-ΜΟΝΙΜΟ) locks by (barber, weekday, time,
 * duration), sorts each group by date, and reports a group as a CANDIDATE only when it
 * has 3+ locks at ONE consistent interval (7 days = weekly, 14 = biweekly) with no gaps.
 * If a ΜΟΝΙΜΟ lock already covers the same slot, the group is flagged OVERLAP and shown
 * separately (do not merge those).
 *
 * WRITES NOTHING. Run it, read the report, then decide.
 *
 *   node scripts/detectLockPatterns.js
 */

const mongoose = require("mongoose");
const moment = require("moment-timezone");
const dotenv = require("dotenv");
dotenv.config();

const Appointment = require("../models/appointment");

const TZ = "Europe/Athens";
const RECURRING_REASON = "ΜΟΝΙΜΟ";
const VALID_INTERVALS = new Set([7, 14]); // weekly, biweekly (days)
const MIN_GROUP = 3;

const WEEKDAY_LABEL = ["Κυρ", "Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ"];
const intervalLabel = (days) =>
  days === 7 ? "εβδομαδιαίο (7 ημέρες)" : days === 14 ? "δεκαπενθήμερο (14 ημέρες)" : `${days} ημέρες`;

// Athens-local view of a lock, so weekday/time/date are what the shop sees.
const describe = (lock) => {
  const m = moment(lock.appointmentDateTime).tz(TZ);
  return {
    id: String(lock._id),
    barber: lock.barber,
    duration: Number(lock.duration) || 0,
    reason: lock.lockReason || "",
    isRecurring: (lock.lockReason || "") === RECURRING_REASON,
    weekday: m.day(),
    time: m.format("HH:mm"),
    dateKey: m.format("YYYY-MM-DD"),
    m,
  };
};

const keyOf = (d) => `${d.barber}|${d.weekday}|${d.time}|${d.duration}`;
const daysBetween = (aKey, bKey) =>
  moment.tz(bKey, "YYYY-MM-DD", TZ).diff(moment.tz(aKey, "YYYY-MM-DD", TZ), "days");

const run = async () => {
  if (!process.env.MONGODB_URI) {
    console.error("❌ MONGODB_URI is not set. Add it to barber-backend/.env");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("🔌 Connected to MongoDB\n");

  const rows = await Appointment.find(
    { type: "lock" },
    { appointmentDateTime: 1, endTime: 1, duration: 1, barber: 1, lockReason: 1 }
  ).lean();

  const locks = rows.map(describe);
  const todayKey = moment.tz(TZ).format("YYYY-MM-DD");

  const recurring = locks.filter((l) => l.isRecurring);
  const individual = locks.filter((l) => !l.isRecurring);

  // Existing ΜΟΝΙΜΟ locks indexed by slot key, for the OVERLAP check.
  const recurringByKey = new Map();
  recurring.forEach((l) => {
    const arr = recurringByKey.get(keyOf(l)) || [];
    arr.push(l);
    recurringByKey.set(keyOf(l), arr);
  });

  // Group individual locks by slot.
  const groups = new Map();
  individual.forEach((l) => {
    const arr = groups.get(keyOf(l)) || [];
    arr.push(l);
    groups.set(keyOf(l), arr);
  });

  const candidates = [];
  const overlaps = [];

  groups.forEach((entries, key) => {
    // Unique dates, sorted (a slot should not hold two locks on the same date).
    const byDate = new Map();
    entries.forEach((e) => byDate.set(e.dateKey, e));
    const uniq = Array.from(byDate.values()).sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1));
    if (uniq.length < MIN_GROUP) return;

    const diffs = [];
    for (let i = 1; i < uniq.length; i++) diffs.push(daysBetween(uniq[i - 1].dateKey, uniq[i].dateKey));
    const interval = diffs[0];
    const consistent = diffs.every((d) => d === interval) && VALID_INTERVALS.has(interval);
    if (!consistent) return; // irregular / has gaps → not a clean candidate

    const first = uniq[0];
    const last = uniq[uniq.length - 1];

    // OVERLAP: a ΜΟΝΙΜΟ lock on the same slot whose date sits within the pattern span.
    const rec = (recurringByKey.get(key) || []).filter(
      (r) => r.dateKey >= first.dateKey && r.dateKey <= last.dateKey
    );

    const group = {
      key,
      barber: first.barber,
      weekday: first.weekday,
      time: first.time,
      duration: first.duration,
      interval,
      count: uniq.length,
      firstDate: first.dateKey,
      lastDate: last.dateKey,
      dates: uniq.map((u) => u.dateKey),
      ids: uniq.map((u) => u.id),
      pastCount: uniq.filter((u) => u.dateKey < todayKey).length,
      overlapWith: rec.map((r) => r.dateKey),
    };
    (rec.length ? overlaps : candidates).push(group);
  });

  candidates.sort((a, b) => a.firstDate.localeCompare(b.firstDate) || a.time.localeCompare(b.time));
  overlaps.sort((a, b) => a.firstDate.localeCompare(b.firstDate) || a.time.localeCompare(b.time));

  const absorbable = candidates.reduce((sum, g) => sum + g.count, 0);

  const printGroup = (g, i) => {
    console.log(
      `  [${i + 1}] ${g.barber}  ${WEEKDAY_LABEL[g.weekday]}  ${g.time}  (${g.duration}′)  —  ${intervalLabel(g.interval)}`
    );
    console.log(`      ${g.count} μεμονωμένα κλειδώματα · ${g.firstDate} → ${g.lastDate}` +
      (g.pastCount ? `  (${g.pastCount} στο παρελθόν)` : ""));
    if (g.overlapWith.length) {
      console.log(`      ⚠️  OVERLAP με υπάρχον ΜΟΝΙΜΟ στις: ${g.overlapWith.join(", ")}`);
    }
    console.log(`      Ημερομηνίες: ${g.dates.join(", ")}`);
  };

  console.log("──────────────────────────────────────────────────────────────");
  console.log("ΣΥΝΟΨΗ");
  console.log("──────────────────────────────────────────────────────────────");
  console.log(`Σύνολο κλειδωμάτων (type:lock):        ${locks.length}`);
  console.log(`  · Recurring (lockReason "ΜΟΝΙΜΟ"):   ${recurring.length}`);
  console.log(`  · Μεμονωμένα (individual):           ${individual.length}`);
  console.log(`Υποψήφιες ομάδες προς ενοποίηση:       ${candidates.length}`);
  console.log(`Μεμονωμένα που θα απορροφηθούν:         ${absorbable}`);
  console.log(`Ομάδες με OVERLAP (δεν ενοποιούνται):  ${overlaps.length}`);
  console.log("");

  console.log("──────────────────────────────────────────────────────────────");
  console.log(`ΥΠΟΨΗΦΙΕΣ ΟΜΑΔΕΣ (${candidates.length})`);
  console.log("──────────────────────────────────────────────────────────────");
  if (!candidates.length) console.log("  (καμία)");
  candidates.forEach(printGroup);
  console.log("");

  console.log("──────────────────────────────────────────────────────────────");
  console.log(`ΟΜΑΔΕΣ ΜΕ OVERLAP — δείξε τες ξεχωριστά, ΜΗΝ τις ενοποιήσεις (${overlaps.length})`);
  console.log("──────────────────────────────────────────────────────────────");
  if (!overlaps.length) console.log("  (καμία)");
  overlaps.forEach(printGroup);
  console.log("");

  console.log("📝 READ-ONLY: τίποτα δεν γράφτηκε στη βάση.");
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
