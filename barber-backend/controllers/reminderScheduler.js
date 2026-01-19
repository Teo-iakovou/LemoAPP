const Appointment = require("../models/appointment");
const ScheduledMessage = require("../models/ScheduledMessage");
const { sendSMS } = require("../utils/smsService");
const moment = require("moment-timezone");

const sendReminders = async () => {
  try {
    const tz = "Europe/Athens";
    const nowAthens = moment().tz(tz);
    const timestamp = nowAthens.format("YYYY-MM-DD HH:mm:ss");

    const windowStart = nowAthens.clone().add(24, "hours").subtract(10, "minutes");
    const windowEnd = nowAthens.clone().add(24, "hours").add(10, "minutes");

    const windowStartUTC = windowStart.clone().utc().toDate();
    const windowEndUTC = windowEnd.clone().utc().toDate();

    const appointments = await Appointment.find({
      appointmentDateTime: {
        $gte: windowStartUTC,
        $lt: windowEndUTC,
      },
      appointmentStatus: "confirmed",
      type: "appointment",
      reminders: {
        $not: {
          $elemMatch: {
            type: "24-hour",
            status: { $ne: "failed" },
          },
        },
      },
    }).lean();

    if (appointments.length === 0) {
      console.log(`[${timestamp}] 🔍 No appointments found in window.`);
      return;
    }

    console.log(
      `[${timestamp}] 📋 Found ${appointments.length} appointments for reminders between ${windowStart.format("YYYY-MM-DD HH:mm")} and ${windowEnd.format("YYYY-MM-DD HH:mm")} Athens time`
    );

    for (const appointment of appointments) {
      const appointmentTimeAthens = moment(appointment.appointmentDateTime)
        .tz(tz)
        .format("DD/MM/YYYY HH:mm");

      const message = `Υπενθύμιση για το ραντεβού σας αύριο στις ${appointmentTimeAthens} στο Lemo Barber Shop. Reminder for your appointment tomorrow at ${appointmentTimeAthens} at Lemo Barber Shop.`;

      const claimed = await Appointment.findOneAndUpdate(
        {
          _id: appointment._id,
          reminders: {
            $not: {
              $elemMatch: {
                type: "24-hour",
                status: { $ne: "failed" },
              },
            },
          },
        },
        {
          $push: {
            reminders: {
              type: "24-hour",
              sentAt: new Date(),
              messageId: null,
              status: "pending",
              messageText: message,
              senderId: "Lemo Barber",
              retryCount: 0,
            },
          },
        },
        { new: true }
      );

      if (!claimed) {
        console.log(
          `[${timestamp}] ⚠️ Skipping ${appointment.customerName} (${appointmentTimeAthens}) - already claimed by another process.`
        );
        continue;
      }

      const reminderEntry =
        claimed.reminders[claimed.reminders.length - 1];
      const reminderId = reminderEntry?._id;

      try {
        const result = await sendSMS(appointment.phoneNumber, message, {
          smsType: "24-hour",
        });

        const successStatus = result?.success ? "sent" : result?.status || "sent";
        await Appointment.updateOne(
          { _id: appointment._id, "reminders._id": reminderId },
          {
            $set: {
              "reminders.$.status": successStatus,
              "reminders.$.messageId":
                result?.message_id || result?.messageId || null,
              "reminders.$.sentAt": new Date(),
              "reminders.$.messageText": message,
            },
          }
        );

        console.log(`[${timestamp}] ✅ Reminder sent to ${appointment.customerName} (${appointmentTimeAthens})`);
      } catch (err) {
        console.error(
          `[${timestamp}] ❌ SMS failed for ${appointment.customerName}: ${err.message}`
        );
        await Appointment.updateOne(
          { _id: appointment._id, "reminders._id": reminderId },
          {
            $set: {
              "reminders.$.status": "failed",
              "reminders.$.sentAt": new Date(),
              "reminders.$.error": err?.message || "Failed to send SMS",
            },
            $inc: { "reminders.$.retryCount": 1 },
          }
        );
      }
    }
  } catch (err) {
    const errorTime = moment().tz("Europe/Athens").format("YYYY-MM-DD HH:mm:ss");
    console.error(`[${errorTime}] ❌ Reminder script failed: ${err.message}`);
  }
};

module.exports = { sendReminders };

// Process scheduled messages due to be sent (e.g., recurrence follow-ups)
async function processScheduledMessages() {
  const tz = "Europe/Athens";
  const now = moment().tz(tz).toDate();
  const due = await ScheduledMessage.find({ status: 'pending', sendAt: { $lte: now } }).limit(50).lean();
  if (!due.length) return;
  for (const msg of due) {
    try {
      const result = await sendSMS(msg.phoneNumber, msg.messageText, {
        smsType: "recurrence-followup",
      });
      await ScheduledMessage.updateOne({ _id: msg._id }, { $set: { status: 'sent' } });
      // Best-effort: attach a reminder log to the first appointment in the series
      if (msg.appointmentIds && msg.appointmentIds.length) {
        await Appointment.updateOne(
          { _id: msg.appointmentIds[0] },
          {
            $push: {
              reminders: {
                type: 'recurrence-followup',
                sentAt: new Date(),
                status: result?.success ? 'sent' : result?.status || 'sent',
                messageText: msg.messageText,
                senderId: 'Lemo Barber',
                retryCount: 0,
              },
            },
          }
        );
      }
    } catch (e) {
      await ScheduledMessage.updateOne({ _id: msg._id }, { $set: { status: 'failed' }, $inc: { retryCount: 1 } });
    }
  }
}

module.exports.processScheduledMessages = processScheduledMessages;
