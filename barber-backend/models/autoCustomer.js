"use strict";

const mongoose = require("mongoose");

const VALID_BARBERS = ["ΛΕΜΟ", "ΦΟΡΟΥ"];
const VALID_CADENCE = [1, 2, 3, 4, 5];

const autoCustomerSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    barber: {
      type: String,
      enum: VALID_BARBERS,
      required: true,
    },
    weekday: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
      // 0 = Sunday, 6 = Saturday
    },
    timeOfDay: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/, // HH:mm 24h
    },
    durationMin: {
      type: Number,
      min: 5,
      max: 600,
      default: 40,
    },
    cadenceWeeks: {
      type: Number,
      enum: VALID_CADENCE,
      default: 1,
    },
    startFrom: {
      type: Date,
      required: true,
    },
    until: {
      type: Date,
    },
    recursive: {
      type: Boolean,
      default: true,
    },
    maxOccurrences: {
      type: Number,
      min: 1,
      max: 52,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    active: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    lastPushedAt: {
      type: Date,
    },
    skippedOccurrences: {
      type: [Date],
      default: [],
    },
    occurrenceOverrides: [
      {
        originalStart: { type: Date, required: true },
        overrideStart: { type: Date, required: true },
        durationMin: {
          type: Number,
          min: 5,
          max: 600,
        },
        barber: {
          type: String,
          enum: VALID_BARBERS,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

autoCustomerSchema.index({ phoneNumber: 1, barber: 1, weekday: 1, timeOfDay: 1 }, { unique: false });

module.exports = mongoose.models.AutoCustomer || mongoose.model("AutoCustomer", autoCustomerSchema);
