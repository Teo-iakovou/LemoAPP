const mongoose = require("mongoose");

const publicBookingSettingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: "global" },
    closedMonths: {
      type: [Number],
      default: [11],
    },
    blockedDates: {
      type: [String],
      default: [],
    },
    allowedDates: {
      type: [String],
      default: [],
    },
    specialDayHours: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    extraDaySlots: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PublicUser",
      default: null,
    },
  },
  { timestamps: true }
);

publicBookingSettingsSchema.statics.getSingleton = async function getSingleton() {
  let doc = await this.findOne({ _id: "global" });
  if (!doc) {
    doc = await this.create({ _id: "global" });
  }
  return doc;
};

module.exports = mongoose.model("PublicBookingSettings", publicBookingSettingsSchema);
