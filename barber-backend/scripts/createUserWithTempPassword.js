// Provision an admin-app User with a randomly generated TEMPORARY password and a
// given role. The password is generated at runtime and printed ONCE to stdout —
// it is never hardcoded here, written to disk, or logged anywhere else. Copy it
// from the terminal, hand it over, and have the person change it via the Profile
// page on first login.
//
// Usage: node scripts/createUserWithTempPassword.js <username> <admin|calendar>
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const crypto = require("crypto");
const User = require("../models/user");

const [, , usernameArg, roleArg] = process.argv;

// 18 random bytes -> 24 base64url chars. Strong, no ambiguity, easy to hand over once.
const generatePassword = () => crypto.randomBytes(18).toString("base64url");

(async () => {
  if (!usernameArg || !roleArg) {
    console.error("Usage: node scripts/createUserWithTempPassword.js <username> <admin|calendar>");
    process.exit(1);
  }
  if (!["admin", "calendar"].includes(roleArg)) {
    console.error(`Invalid role "${roleArg}". Must be 'admin' or 'calendar'.`);
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await User.findOne({ username: usernameArg });
  if (existing) {
    console.error(
      `User "${usernameArg}" already exists (role: ${existing.role}). Refusing to overwrite.`
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const tempPassword = generatePassword();
  // Assign the plain password; the model's pre('save') hook bcrypt-hashes it.
  const user = new User({ username: usernameArg, password: tempPassword, role: roleArg });
  await user.save();

  const check = await User.findOne({ username: usernameArg }, { username: 1, role: 1 }).lean();
  console.log("Created user:");
  console.log(`  username: ${check.username}`);
  console.log(`  role:     ${check.role}`);
  console.log("");
  console.log("  TEMPORARY PASSWORD (shown once, not stored anywhere — copy it now):");
  console.log(`  ${tempPassword}`);
  console.log("");
  console.log("  Have them log in and change it via the Profile page.");

  await mongoose.disconnect();
})().catch((e) => {
  console.error("Create failed:", e.message);
  process.exit(1);
});
