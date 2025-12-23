const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: (v) => v.length >= 6 && v.length <= 15,
      message: "Phone number must be between 6 and 15 characters",
    },
  },
  barber: { type: String, enum: ["ΛΕΜΟ", "ΦΟΡΟΥ"], default: null },
  profilePicture: { type: String, default: null }, // New, optional
  lastBirthdaySMS: { type: Date, default: null }, // To track last year SMS was sent
  lastChristmasSMS: { type: Date, default: null },

  dateOfBirth: { type: Date, default: null }, // New, optional
});

// ✅ Prevent model overwrite
module.exports =
  mongoose.models.Customer || mongoose.model("Customer", customerSchema);
