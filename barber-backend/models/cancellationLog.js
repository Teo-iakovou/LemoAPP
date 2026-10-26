const mongoose = require("mongoose");

// One row per cancelled appointment, written right before/after the appointment itself is
// deleted, so the barbers can see cancellations (bell in the admin navbar). The appointment
// collection is left untouched: availability, the unique slot index and the SMS flows all
// assume every stored appointment is a live, confirmed one.
const RETENTION_DAYS = 60;

const cancellationLogSchema = new mongoose.Schema({
  appointmentId: { type: mongoose.Schema.Types.ObjectId, index: true },
  customerName: { type: String, default: "" },
  phoneNumber: { type: String, default: "" },
  bookedFor: { type: String, default: undefined },
  barber: { type: String, required: true, index: true },
  appointmentDateTime: { type: Date, required: true },
  duration: { type: Number, default: 40 },
  cancelledAt: { type: Date, default: Date.now },
  // "customer" = cancelled from the public site; "barber" = deleted from the admin.
  cancelledBy: { type: String, enum: ["customer", "barber"], required: true },
  // Staff account that deleted it (cancelledBy "barber"); hidden from that account's badge.
  cancelledByUserId: { type: mongoose.Schema.Types.ObjectId, default: null },
  cancelledByName: { type: String, default: "" },
  // Cancelled on the same (Athens) day as the appointment — shown red.
  sameDay: { type: Boolean, default: false },
  // The appointment came from a recurring auto-customer card (the next push may re-create it).
  fromAutoCustomer: { type: Boolean, default: false },
  // Multi-slot booking: the other slot of the group that is still booked, if any.
  sibling: {
    type: new mongoose.Schema(
      { barber: String, appointmentDateTime: Date, bookedFor: String },
      { _id: false }
    ),
    default: undefined,
  },
  // Staff users who have opened the bell since this was logged.
  seenBy: { type: [mongoose.Schema.Types.ObjectId], default: [] },
});

cancellationLogSchema.index({ cancelledAt: -1 });
cancellationLogSchema.index(
  { cancelledAt: 1 },
  { expireAfterSeconds: RETENTION_DAYS * 24 * 60 * 60, name: "ttl_cancelledAt" }
);

module.exports = mongoose.model("CancellationLog", cancellationLogSchema);
module.exports.RETENTION_DAYS = RETENTION_DAYS;
