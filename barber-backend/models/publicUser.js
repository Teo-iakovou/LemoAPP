const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const publicUserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    displayName: { type: String, trim: true },
    password: { type: String, required: true },
    phoneNumber: { type: String, required: true, unique: true, trim: true },
    role: {
      type: String,
      enum: ["customer", "barber", "admin"],
      default: "customer",
    },
    resetToken: { type: String, default: null },
    resetTokenExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

publicUserSchema.pre("save", async function (next) {
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

publicUserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("PublicUser", publicUserSchema);
