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
  barber: {
    type: String,
    enum: ["Lemo", "Assistant"],
    required: true,
  },
  appointmentStatus: {
    type: String,
    enum: ["confirmed", "pending", "canceled"],
    default: "pending",
  },
});
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
});

const Appointment = mongoose.model("Appointment", appointmentSchema);
const Customer = mongoose.model("Customer", customerSchema);

module.exports = { Appointment, Customer };
