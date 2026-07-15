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

const MAX_APPOINTMENT_MINUTES = 600;
const MAX_BREAK_MINUTES = 14 * 60; // matches 07:00-21:00 window

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
    validate: {
      validator: function (value) {
        if (typeof value !== "number") return false;
        if (this.type === "break") {
          return value <= MAX_BREAK_MINUTES;
        }
        return value <= MAX_APPOINTMENT_MINUTES;
      },
      message: function () {
        return this.type === "break"
          ? `Break duration cannot exceed ${MAX_BREAK_MINUTES} minutes.`
          : `Duration cannot exceed ${MAX_APPOINTMENT_MINUTES} minutes.`;
      },
    },
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
    enum: ["ΛΕΜΟ", "ΦΟΡΟΥ", "ΚΟΥΣΙΗΣ"],
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
  // Who created this appointment: 'admin' = authenticated LemoApp user (any account),
  // 'public' = public booking site. Drives conflict-validation bypass for admins and
  // membership of the public-only partial unique index (see scripts/migrate-origin-and-index.js).
  // NOTE: the unique index is created by that migration, NOT declared here, because
  // autoIndex is on and would build it out of order / before the backfill.
  origin: {
    type: String,
    enum: ["admin", "public"],
    default: "public",
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

// PUBLIC-ONLY partial UNIQUE index (atomic race backstop): prevents two PUBLIC
// confirmed bookings from occupying the exact same (barber, appointmentDateTime,
// type). Admin rows (origin:'admin') are excluded from the partial filter, so
// admins may create overlapping / same-time appointments freely. This was created
// out-of-band by scripts/migrate-origin-and-index.js; declared here (exact-match
// name + spec) so fresh databases get it — autoIndex is a no-op when it already
// exists. See that migration for the origin backfill + duplicate resolution.
appointmentSchema.index(
  { barber: 1, appointmentDateTime: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { origin: "public", appointmentStatus: "confirmed" },
    name: "uniq_public_confirmed_slot",
  }
);

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
