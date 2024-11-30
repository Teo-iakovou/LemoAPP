const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  phoneNumber: {
    type: String,
    required: true,
    validate: {
      validator: (v) => v.length >= 6 && v.length <= 15, // Allow numbers of reasonable lengths
      message: "Phone number must be between 6 and 15 characters",
    },
  },
  appointmentDateTime: {
    type: Date,
    required: true,
    validate: {
      validator: (v) => v > new Date(),
      message: "Appointment date must be in the future",
    },
  },
  appointmentEndTime: {
    type: Date,
    required: true,
  },
  appointmentStatus: {
    type: String,
    enum: ["confirmed", "pending", "canceled"],
    default: "pending",
  },
});

// Pre-save hook to automatically calculate `appointmentEndTime`
appointmentSchema.pre("save", function (next) {
  this.appointmentEndTime = new Date(this.appointmentDateTime);
  this.appointmentEndTime.setMinutes(this.appointmentEndTime.getMinutes() + 30); // Add 30 minutes
  next();
});

module.exports = mongoose.model("Appointment", appointmentSchema);
