const mongoose = require('mongoose');

const ScheduledMessageSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true },
  messageText: { type: String, required: true },
  sendAt: { type: Date, required: true, index: true },
  status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending', index: true },
  type: { type: String, default: 'recurrence-followup' },
  appointmentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' }],
  barber: { type: String },
  retryCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('ScheduledMessage', ScheduledMessageSchema);

