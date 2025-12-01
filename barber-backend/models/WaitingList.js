const mongoose = require("mongoose");

const waitingListSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: false,
  },
  customerName: { type: String, default: "" },
  phoneNumber: { type: String, default: "" },
  preferredDate: { type: String, default: "" }, // YYYY-MM-DD
  preferredTime: { type: String, default: "" }, // HH:MM
  preferredTimes: {
    type: [String],
    default: [],
  },
  serviceId: { type: String, default: "" },
  barber: { type: String, default: "" },
  source: {
    type: String,
    enum: ["internal", "public"],
    default: "internal",
  },
  addedAt: { type: Date, default: Date.now },
  note: { type: String, default: "" },
});

module.exports =
  mongoose.models.WaitingList ||
  mongoose.model("WaitingList", waitingListSchema);
