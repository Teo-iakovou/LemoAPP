const mongoose = require("mongoose");

const appointmentSourceSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ["manual", "auto-customer"],
      default: "manual",
    },
    autoCustomerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AutoCustomer",
    },
    batchId: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const appointmentSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: function () {
      return this.type === "appointment";
    },
  },
  phoneNumber: {
    type: String,
    required: function () {
      return this.type === "appointment";
    },
    validate: {
      validator: function (v) {
        if (this.type !== "appointment") return true;
        return typeof v === "string" && v.length >= 6 && v.length <= 15;
      },
      message: "Phone number must be between 6 and 15 characters",
    },
  },
  appointmentDateTime: {
    type: Date,
    required: true,
  },
  duration: {
    type: Number,
    required: function () {
      return this.type === "appointment";
    },
    min: 0,
    max: 600, // you can set a max if you want (e.g. 10 hours)
    default: 40, // default to 40 if not provided
  },
  endTime: {
    type: Date,
    required: function () {
      return this.type !== "break";
    },
  },
  barber: {
    type: String,
    enum: ["ΛΕΜΟ", "ΦΟΡΟΥ"],
    required: true,
  },
  appointmentStatus: {
    type: String,
    enum: ["confirmed"],
    default: "confirmed",
  },
  type: {
    type: String,
    enum: ["appointment", "break", "lock"],
    default: "appointment",
  },
  lockReason: {
    type: String,
    default: "",
    trim: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true,
    default: null,
  },
  createdBy: {
    type: String,
    default: null,
    trim: true,
  },
  source: {
    type: appointmentSourceSchema,
    default: () => ({ kind: "manual" }),
  },
  meta: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: undefined,
  },

  reminders: [
    {
      type: { type: String, required: true },
      sentAt: { type: Date, required: true },
      messageId: { type: String },
      messageText: { type: String },
      senderId: { type: String },
      status: {
        type: String,
        enum: ["sent", "delivered", "failed", "expired", "rejected"],
        default: "sent",
      },
      retryCount: { type: Number, default: 0 },
      error: String,
    },
  ],
});

// --- PRE-SAVE: Automatically calculate endTime ---
appointmentSchema.pre("save", function (next) {
  const start = new Date(this.appointmentDateTime);
  if (Number.isNaN(start.getTime())) {
    return next(new Error("Invalid appointmentDateTime"));
  }

  if (this.type === "appointment") {
    const durationToUse = this.duration || 40;
    this.duration = durationToUse;
    this.endTime = new Date(start.getTime() + durationToUse * 60 * 1000);
  } else if (this.type === "lock") {
    if (this.endTime) {
      const end = new Date(this.endTime);
      if (!Number.isNaN(end.getTime())) {
        const diffMinutes = Math.max(
          1,
          Math.round((end.getTime() - start.getTime()) / 60000)
        );
        this.duration = diffMinutes;
        this.endTime = new Date(start.getTime() + diffMinutes * 60 * 1000);
      } else if (this.duration) {
        this.endTime = new Date(start.getTime() + this.duration * 60 * 1000);
      } else {
        this.duration = 40;
        this.endTime = new Date(start.getTime() + 40 * 60 * 1000);
      }
    } else if (this.duration) {
      this.endTime = new Date(start.getTime() + this.duration * 60 * 1000);
    } else {
      // Fallback to 40 minutes if nothing provided
      this.duration = 40;
      this.endTime = new Date(start.getTime() + 40 * 60 * 1000);
    }
  } else {
    // Break: allow arbitrary duration but default to zero-length block
    if (this.endTime && !Number.isNaN(new Date(this.endTime).getTime())) {
      const end = new Date(this.endTime);
      const diffMinutes = Math.max(
        0,
        Math.round((end.getTime() - start.getTime()) / 60000)
      );
      this.duration = diffMinutes;
    } else {
      this.endTime = start;
      this.duration = 0;
    }
  }
  next();
});

// Add indexes for optimized queries
appointmentSchema.index({
  appointmentDateTime: 1,
  appointmentStatus: 1,
  type: 1,
});

// Compound index used by range/month availability lookups
appointmentSchema.index({ appointmentDateTime: 1, barber: 1, type: 1, appointmentStatus: 1 });
appointmentSchema.index({ "source.kind": 1, "source.autoCustomerId": 1, appointmentDateTime: 1 });

// --- Log Reminder Utility (needed for reminders and scripts) ---
appointmentSchema.methods.logReminder = async function (type, data = {}) {
  this.reminders.push({
    type,
    sentAt: new Date(),
    ...data,
  });
  return this.save();
};
module.exports = mongoose.model("Appointment", appointmentSchema);
