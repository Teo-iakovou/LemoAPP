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
  barber: { type: String, enum: ["ΛΕΜΟ", "ΦΟΡΟΥ"], default: null }, // Add this field
});

// ✅ Prevent model overwrite
module.exports =
  mongoose.models.Customer || mongoose.model("Customer", customerSchema);
