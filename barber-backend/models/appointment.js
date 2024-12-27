const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  phoneNumber: {
    type: String,
    required: true,
    validate: {
      validator: (v) => v.length >= 6 && v.length <= 15,
      message: "Phone number must be between 6 and 15 characters",
    },
  },
  appointmentDateTime: {
    type: Date,
    required: true,
    validate: {
      validator: (v) => v > new Date(Date.now() + 60 * 1000), // Ensure at least 1 minute in the future
      message: "Appointment date must be in the future",
    },
  },
  barber: {
    type: String,
    enum: ["Lemo", "Assistant"], // Replace with a reference to a `Barber` model if needed
    required: true,
  },
  appointmentStatus: {
    type: String,
    enum: ["confirmed", "pending", "canceled"],
    default: "pending",
  },
});

// Pre-save middleware to ensure dates are stored in UTC
appointmentSchema.pre("save", function (next) {
  if (this.appointmentDateTime) {
    this.appointmentDateTime = new Date(this.appointmentDateTime).toISOString();
  }
  next();
});

// Add an index to optimize status-based queries
appointmentSchema.index({ appointmentStatus: 1 });

module.exports = mongoose.model("Appointment", appointmentSchema);
