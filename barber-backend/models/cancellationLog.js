const mongoose = require("mongoose");

// One row per cancelled appointment, written right before/after the appointment itself is
// deleted, so the barbers can see cancellations (bell in the admin navbar). The appointment
// collection is left untouched: availability, the unique slot index and the SMS flows all
// assume every stored appointment is a live, confirmed one.
// Kept forever (no TTL): the owner wants the full cancellation history, both on the
// Cancellations page and on each customer's card.

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
cancellationLogSchema.index({ barber: 1, cancelledAt: -1 });
cancellationLogSchema.index({ phoneNumber: 1, cancelledAt: -1 });

const CancellationLog = mongoose.model("CancellationLog", cancellationLogSchema);

// Earlier (never released) builds declared TTL indexes that auto-deleted rows. If a dev
// server ever created one, drop it so nothing expires.
mongoose.connection.once("open", () => {
  ["ttl_cancelledAt", "ttl_cancelledAt_1y"].forEach((name) =>
    CancellationLog.collection.dropIndex(name).catch(() => {})
  );
});

module.exports = CancellationLog;
