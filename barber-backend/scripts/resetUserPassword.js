// Reset an existing admin-app User's password to a freshly generated TEMPORARY
// password, printed ONCE to stdout. Never hardcoded, written to disk, or logged
// elsewhere. The model's pre('save') hook does the bcrypt hashing.
//
// Usage: node scripts/resetUserPassword.js <username>
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const crypto = require("crypto");
const User = require("../models/user");

const [, , usernameArg] = process.argv;
const generatePassword = () => crypto.randomBytes(18).toString("base64url");

(async () => {
  if (!usernameArg) {
    console.error("Usage: node scripts/resetUserPassword.js <username>");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);

  const user = await User.findOne({ username: usernameArg });
  if (!user) {
    console.error(`User "${usernameArg}" not found.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const tempPassword = generatePassword();
  user.password = tempPassword; // plain; pre('save') hashes it
  await user.save();

  console.log(`Password reset for "${user.username}" (role: ${user.role})`);
  console.log("");
  console.log("  TEMPORARY PASSWORD (shown once, not stored anywhere — copy it now):");
  console.log(`  ${tempPassword}`);
  console.log("");

  await mongoose.disconnect();
})().catch((e) => {
  console.error("Reset failed:", e.message);
  process.exit(1);
});
