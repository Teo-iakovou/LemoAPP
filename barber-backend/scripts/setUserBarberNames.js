// Link each admin-app User to the barber they ARE (user.barberName).
//
//   koushis -> ΚΟΥΣΙΗΣ   (role 'calendar' — scopes him to his own appointments)
//   lemo    -> ΛΕΜΟ      (admin; barberName is only for Phase B default selection)
//   forou   -> ΦΟΡΟΥ     (admin; same)
//   teo     -> null      (admin; not a barber)
//
// Visibility is governed by `role`, NOT by barberName: an admin with a barberName
// still sees every barber. Only role 'calendar' is filtered.
// Idempotent — safe to re-run.
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");

const MAPPING = {
  koushis: "ΚΟΥΣΙΗΣ",
  lemo: "ΛΕΜΟ",
  forou: "ΦΟΡΟΥ",
  teo: null,
};

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const col = mongoose.connection.db.collection("users");

  for (const [username, barberName] of Object.entries(MAPPING)) {
    const r = await col.updateOne({ username }, { $set: { barberName } });
    console.log(
      `${username.padEnd(8)} -> ${String(barberName).padEnd(8)} (matched: ${r.matchedCount}, modified: ${r.modifiedCount})`
    );
  }

  console.log("\nFinal state:");
  const all = await col
    .find({}, { projection: { username: 1, role: 1, barberName: 1 } })
    .toArray();
  for (const u of all) {
    console.log(
      `  ${String(u.username).padEnd(8)} role=${String(u.role).padEnd(8)} barberName=${JSON.stringify(u.barberName)}`
    );
  }

  await mongoose.disconnect();
})().catch((e) => {
  console.error("Migration failed:", e.message);
  process.exit(1);
});
