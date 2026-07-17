const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },

  password: { type: String, required: true },
  // Access role: 'admin' = full access; 'calendar' = limited (Calendar page only).
  // Enforcement is server-side (requireFullAdmin reads this field from the DB per request);
  // the JWT/frontend copy is convenience only and is never trusted for authorization.
  role: { type: String, enum: ["admin", "calendar"], default: "admin" },
  // Stored as YYYY-MM-DD to avoid timezone shifts for birth dates.
  dob: { type: String, default: null, trim: true },
  resetToken: String,
  resetTokenExpires: Date,
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
