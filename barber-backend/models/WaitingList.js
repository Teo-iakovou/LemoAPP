const mongoose = require("mongoose");

const waitingListSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  addedAt: { type: Date, default: Date.now }, // Tracks when the customer was added
});

module.exports =
  mongoose.models.WaitingList ||
  mongoose.model("WaitingList", waitingListSchema);
