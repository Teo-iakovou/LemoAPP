// One-off backfill: give every existing admin User an explicit role of 'admin'
// so nobody is accidentally limited when the role system goes live.
// Idempotent — only touches docs missing a `role` field. Safe to re-run.
//
// Usage:  node scripts/backfillUserRoles.js
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const col = mongoose.connection.db.collection("users");

  const before = await col.countDocuments({ role: { $exists: false } });
  console.log(`Users missing a role: ${before}`);

  const result = await col.updateMany(
    { role: { $exists: false } },
    { $set: { role: "admin" } }
  );
  console.log(`Matched: ${result.matchedCount} | Modified: ${result.modifiedCount}`);

  // Confirm final state.
  const summary = await col
    .find({}, { projection: { username: 1, role: 1 } })
    .toArray();
  console.log("\nFinal roles:");
  for (const u of summary) console.log(`- ${u.username}: ${u.role}`);
  const stillMissing = summary.filter((u) => u.role === undefined).length;
  console.log(`\nStill missing a role: ${stillMissing}`);

  await mongoose.disconnect();
})().catch((e) => {
  console.error("Backfill failed:", e.message);
  process.exit(1);
});
