/**
 * restoreAutoCustomerDates.js
 *
 * Recovery for the 21/07/2026 12:04 bulk "Δημιουργία ραντεβού" run, which
 * overwrote startFrom / until / maxOccurrences on every auto-customer card
 * with the modal's values (from=21/07, to=27/07, count=10).
 *
 * READ-ONLY by default. Prints a three-way diff table:
 *   live  vs  backup 18/07 16:40  vs  backup 15/07 12:04
 *
 * With --apply it copies startFrom / until / maxOccurrences from the chosen
 * backup onto the live cards. NOTHING ELSE IS TOUCHED — no appointments, no
 * other fields, no customers created after the backup.
 *
 * Usage:
 *   node scripts/restoreAutoCustomerDates.js                    # dry-run, source=18/07
 *   node scripts/restoreAutoCustomerDates.js --source=20260715  # dry-run, source=15/07
 *   node scripts/restoreAutoCustomerDates.js --apply            # write
 *   node scripts/restoreAutoCustomerDates.js --apply --only=<id>,<id>
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");

const APPLY = process.argv.includes("--apply");

const sourceArg = process.argv.find((a) => a.startsWith("--source="));
const SOURCE_TAG = sourceArg ? sourceArg.split("=")[1] : "20260718";

const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const ONLY_IDS = onlyArg
  ? new Set(
      onlyArg
        .split("=")[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    )
  : null;

const LIVE_DB = "test";
const BACKUPS = {
  20260718: { db: "lemo_restore_20260718", label: "18/07 16:40" },
  20260715: { db: "lemo_restore_20260715", label: "15/07 12:04" },
};

// The values the bad bulk run stamped onto every card. Used only to label rows.
const DAMAGE = {
  startFrom: "2026-07-21",
  until: "2026-07-27",
  maxOccurrences: 10,
};

const FIELDS = ["startFrom", "until", "maxOccurrences"];

// ---------- formatting helpers ----------

const fmtDate = (v) => {
  if (v === null || v === undefined) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  // stored as UTC midnight; render the calendar date as-is
  return d.toISOString().slice(0, 10);
};

const fmtVal = (field, v) =>
  field === "maxOccurrences" ? (v === null || v === undefined ? "—" : String(v)) : fmtDate(v);

const fmtTriple = (doc) =>
  doc ? FIELDS.map((f) => fmtVal(f, doc[f])).join(" / ") : "ΑΠΩΝ";

const sameVal = (field, a, b) => {
  const av = a === undefined ? null : a;
  const bv = b === undefined ? null : b;
  if (av === null && bv === null) return true;
  if (av === null || bv === null) return false;
  if (field === "maxOccurrences") return Number(av) === Number(bv);
  return new Date(av).getTime() === new Date(bv).getTime();
};

const pad = (s, w) => {
  const str = String(s);
  // crude width: Greek/Latin both count as 1
  return str.length >= w ? str.slice(0, w) : str + " ".repeat(w - str.length);
};

const looksDamaged = (doc) =>
  doc &&
  fmtDate(doc.startFrom) === DAMAGE.startFrom &&
  fmtDate(doc.until) === DAMAGE.until &&
  Number(doc.maxOccurrences) === DAMAGE.maxOccurrences;

// ---------- main ----------

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error("❌ MONGODB_URI is not set");
    process.exit(1);
  }
  if (!BACKUPS[SOURCE_TAG]) {
    console.error(`❌ Unknown --source=${SOURCE_TAG}. Use one of: ${Object.keys(BACKUPS).join(", ")}`);
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const conn = mongoose.connection;

  const liveCol = conn.client.db(LIVE_DB).collection("autocustomers");
  const b18Col = conn.client.db(BACKUPS["20260718"].db).collection("autocustomers");
  const b15Col = conn.client.db(BACKUPS["20260715"].db).collection("autocustomers");

  const [live, b18, b15] = await Promise.all([
    liveCol.find({}).toArray(),
    b18Col.find({}).toArray(),
    b15Col.find({}).toArray(),
  ]);

  console.log(`\n📊 Έγγραφα: live=${live.length}  18/07=${b18.length}  15/07=${b15.length}`);
  console.log(`   Πηγή επαναφοράς: ${BACKUPS[SOURCE_TAG].label}  (--source=${SOURCE_TAG})`);
  console.log(`   Λειτουργία: ${APPLY ? "🔴 APPLY (θα γραφτούν αλλαγές)" : "🟢 DRY-RUN (μόνο ανάγνωση)"}`);
  if (ONLY_IDS) console.log(`   Περιορισμός σε ${ONLY_IDS.size} κάρτες (--only)`);

  // Index backups by _id and by phone (fallback).
  const idx = (docs) => {
    const byId = new Map();
    const byPhone = new Map();
    for (const d of docs) {
      byId.set(String(d._id), d);
      const p = (d.phoneNumber || "").trim();
      if (p) {
        if (!byPhone.has(p)) byPhone.set(p, []);
        byPhone.get(p).push(d);
      }
    }
    return { byId, byPhone };
  };

  const i18 = idx(b18);
  const i15 = idx(b15);
  const iLive = idx(live);

  // Match a live doc to a backup doc: _id first, then unambiguous phone.
  const match = (liveDoc, index) => {
    const byId = index.byId.get(String(liveDoc._id));
    if (byId) return { doc: byId, via: "_id" };
    const p = (liveDoc.phoneNumber || "").trim();
    if (p) {
      const cands = index.byPhone.get(p) || [];
      if (cands.length === 1) return { doc: cands[0], via: "phone" };
      if (cands.length > 1) return { doc: null, via: "phone-ambiguous" };
    }
    return { doc: null, via: "none" };
  };

  const rows = [];
  const onlyInLive = [];
  const phoneMatched = [];
  const ambiguous = [];

  for (const l of live) {
    if (ONLY_IDS && !ONLY_IDS.has(String(l._id))) continue;

    const m18 = match(l, i18);
    const m15 = match(l, i15);
    const src = SOURCE_TAG === "20260718" ? m18 : m15;

    if (!src.doc) {
      if (src.via === "phone-ambiguous") ambiguous.push({ live: l, via: src.via });
      else onlyInLive.push(l);
      continue;
    }
    if (src.via === "phone") phoneMatched.push({ live: l, backup: src.doc });

    const changed = FIELDS.filter((f) => !sameVal(f, l[f], src.doc[f]));
    rows.push({ live: l, b18: m18.doc, b15: m15.doc, src: src.doc, changed, via: src.via });
  }

  // Backup docs with no live counterpart.
  const onlyInBackup = [];
  const srcDocs = SOURCE_TAG === "20260718" ? b18 : b15;
  for (const b of srcDocs) {
    if (iLive.byId.has(String(b._id))) continue;
    const p = (b.phoneNumber || "").trim();
    const cands = p ? iLive.byPhone.get(p) || [] : [];
    if (cands.length === 1) continue; // matched by phone from the live side
    onlyInBackup.push(b);
  }

  // ---------- diff table ----------
  const W = { name: 22, val: 26 };
  console.log("\n" + "═".repeat(108));
  console.log(
    pad("ΠΕΛΑΤΗΣ", W.name) +
      pad("LIVE (τώρα)", W.val) +
      pad("BACKUP 18/07", W.val) +
      pad("BACKUP 15/07", W.val) +
      "ΔΙΑΦ."
  );
  console.log(pad("", W.name) + pad("από/έως/αριθμός", W.val) + pad("από/έως/αριθμός", W.val) + pad("από/έως/αριθμός", W.val));
  console.log("═".repeat(108));

  const toChange = rows.filter((r) => r.changed.length > 0);
  const unchanged = rows.filter((r) => r.changed.length === 0);

  for (const r of toChange) {
    const flag = r.via === "phone" ? " ☎" : "";
    const b18damaged = looksDamaged(r.b18) ? " ⚠" : "";
    console.log(
      pad((r.live.customerName || "?") + flag, W.name) +
        pad(fmtTriple(r.live), W.val) +
        pad(fmtTriple(r.b18) + b18damaged, W.val) +
        pad(fmtTriple(r.b15), W.val) +
        r.changed.map((f) => f[0].toUpperCase()).join("")
    );
  }
  console.log("═".repeat(108));

  // ---------- summary ----------
  console.log(`\n📋 ΣΥΝΟΨΗ`);
  console.log(`   Θα αλλάξουν:            ${toChange.length}`);
  console.log(`   Ήδη ίδια (καμία αλλαγή): ${unchanged.length}`);
  if (phoneMatched.length) {
    console.log(`\n   ☎ Ταίριασαν με τηλέφωνο (όχι _id) — έλεγξέ τα:`);
    phoneMatched.forEach((x) =>
      console.log(`      ${x.live.customerName} (${x.live.phoneNumber})  live=${x.live._id}  backup=${x.backup._id}`)
    );
  }
  if (ambiguous.length) {
    console.log(`\n   ⚠ ΑΣΑΦΗ (πολλαπλά ίδια τηλέφωνα στο backup) — ΠΑΡΑΛΕΙΠΟΝΤΑΙ:`);
    ambiguous.forEach((x) => console.log(`      ${x.live.customerName} (${x.live.phoneNumber})  live=${x.live._id}`));
  }
  if (onlyInLive.length) {
    console.log(`\n   ➕ ΜΟΝΟ ΣΤΟ LIVE (δημιουργήθηκαν μετά το backup) — ΔΕΝ ΑΓΓΙΖΟΝΤΑΙ:`);
    onlyInLive.forEach((d) =>
      console.log(
        `      ${d.customerName} (${d.phoneNumber})  _id=${d._id}  created=${fmtDate(d.createdAt)}  [${fmtTriple(d)}]`
      )
    );
  }
  if (onlyInBackup.length) {
    console.log(`\n   ➖ ΜΟΝΟ ΣΤΟ BACKUP (διαγράφηκαν μετά) — ΔΕΝ ΕΠΑΝΑΔΗΜΙΟΥΡΓΟΥΝΤΑΙ:`);
    onlyInBackup.forEach((d) =>
      console.log(`      ${d.customerName} (${d.phoneNumber})  _id=${d._id}  [${fmtTriple(d)}]`)
    );
  }

  // Rows where the two backups disagree — the 18/07 batch contamination check.
  const backupsDiffer = rows.filter(
    (r) => r.b18 && r.b15 && FIELDS.some((f) => !sameVal(f, r.b18[f], r.b15[f]))
  );
  if (backupsDiffer.length) {
    console.log(`\n   🔎 ΤΑ ΔΥΟ BACKUP ΔΙΑΦΩΝΟΥΝ (${backupsDiffer.length}) — άλλαξαν 15/07→18/07:`);
    backupsDiffer.forEach((r) =>
      console.log(`      ${pad(r.live.customerName, 20)} 18/07=[${fmtTriple(r.b18)}]  15/07=[${fmtTriple(r.b15)}]`)
    );
  }

  // ---------- apply ----------
  if (!APPLY) {
    console.log(`\n🟢 DRY-RUN — δεν γράφτηκε τίποτα. Ξανατρέξε με --apply αφού εγκρίνεις.\n`);
    await mongoose.disconnect();
    return;
  }

  if (toChange.length === 0) {
    console.log(`\n✅ Καμία αλλαγή να εφαρμοστεί.\n`);
    await mongoose.disconnect();
    return;
  }

  console.log(`\n🔴 APPLY — ενημέρωση ${toChange.length} καρτών (μόνο ${FIELDS.join(" / ")})...`);
  let ok = 0;
  let failed = 0;

  for (const r of toChange) {
    const $set = {};
    const $unset = {};
    for (const f of r.changed) {
      const v = r.src[f];
      if (v === undefined || v === null) $unset[f] = "";
      else $set[f] = v;
    }
    const update = {};
    if (Object.keys($set).length) update.$set = $set;
    if (Object.keys($unset).length) update.$unset = $unset;

    try {
      const res = await liveCol.updateOne({ _id: r.live._id }, update);
      if (res.matchedCount === 1) {
        ok += 1;
        console.log(`   ✅ ${r.live.customerName}: ${fmtTriple(r.live)} → ${fmtTriple(r.src)}`);
      } else {
        failed += 1;
        console.log(`   ⚠️ ${r.live.customerName}: δεν βρέθηκε (_id=${r.live._id})`);
      }
    } catch (err) {
      failed += 1;
      console.log(`   ❌ ${r.live.customerName}: ${err.message}`);
    }
  }

  console.log(`\n✅ Ολοκληρώθηκε: ${ok} ενημερώθηκαν, ${failed} απέτυχαν.`);
  console.log(`   Δεν άλλαξε κανένα ραντεβού και κανένα άλλο πεδίο.\n`);

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("❌ Σφάλμα:", err);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
