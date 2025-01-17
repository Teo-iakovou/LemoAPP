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
      validator: function (v) {
        return v > new Date(); // Ensure appointment is in the future
      },
      message: "Appointment date must be in the future",
    },
  },
  duration: {
    type: Number,
    required: true,
    default: 40, // Default to 40 minutes
  },
  endTime: {
    type: Date,
    required: true,
  },
  barber: {
    type: String,
    enum: ["ΛΕΜΟ", "ΦΟΡΟΥ"],
    required: true,
  },
  appointmentStatus: {
    type: String,
    enum: ["confirmed", "pending", "canceled"],
    default: "pending",
  },
  reminders: [
    {
      type: { type: String, required: true }, // e.g., "24-hour", "7-day"
      sentAt: { type: Date, required: true },
    },
  ],
});

// Pre-save middleware to calculate endTime based on a fixed 40-minute duration
appointmentSchema.pre("save", function (next) {
  const appointmentDate = new Date(this.appointmentDateTime);

  // Set fixed duration
  this.duration = 40;

  // Calculate end time based on duration
  this.endTime = new Date(
    appointmentDate.getTime() + this.duration * 60 * 1000
  );

  next();
});

// Pre-update middleware to handle `findByIdAndUpdate` and similar methods
appointmentSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();

  if (update.appointmentDateTime) {
    const appointmentStart = new Date(update.appointmentDateTime);

    // Ensure `appointmentDateTime` is valid and in the future
    if (isNaN(appointmentStart) || appointmentStart <= new Date()) {
      return next(new Error("Invalid or past appointmentDateTime"));
    }

    // Recalculate `endTime` based on the updated `appointmentDateTime`
    update.endTime = new Date(
      appointmentStart.getTime() + (update.duration || 40) * 60 * 1000
    );
  }

  next();
});

// Add an index to optimize status-based queries
appointmentSchema.index({ appointmentStatus: 1 });
appointmentSchema.index({ appointmentDateTime: 1 });

module.exports = mongoose.model("Appointment", appointmentSchema);
