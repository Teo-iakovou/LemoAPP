"use strict";

const mongoose = require("mongoose");

const resultSummarySchema = new mongoose.Schema(
  {
    autoCustomerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AutoCustomer",
    },
    customerName: String,
    barber: String,
    scheduledFor: Date,
    // For "out-of-window"/"after-until" skips: the customer's next on-phase date, so the
    // record shows why they were skipped (e.g. biweekly turn falls on a later week).
    nextOccurrence: Date,
    status: {
      type: String,
      enum: ["inserted", "moved", "skipped", "existing"],
    },
    reason: String,
    shiftMinutes: Number,
    smsStatus: String,
    smsReason: String,
    smsError: String,
  },
  { _id: false }
);

const autoGenerationBatchSchema = new mongoose.Schema(
  {
    batchId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    range: {
      from: { type: Date, required: true },
      to: { type: Date, required: true },
    },
    totals: {
      attempted: { type: Number, default: 0 },
      inserted: { type: Number, default: 0 },
      moved: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      existing: { type: Number, default: 0 },
      smsSent: { type: Number, default: 0 },
      smsFailed: { type: Number, default: 0 },
      smsSkipped: { type: Number, default: 0 },
    },
    autoCustomerIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AutoCustomer",
      },
    ],
    appointmentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Appointment",
      },
    ],
    summary: [resultSummarySchema],
    dryRun: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    undoneAt: { type: Date },
    undoReason: { type: String },
  },
  {
    timestamps: false,
  }
);

autoGenerationBatchSchema.index({ createdAt: -1 });

module.exports =
  mongoose.models.AutoGenerationBatch ||
  mongoose.model("AutoGenerationBatch", autoGenerationBatchSchema);
