const Appointment = require("../models/appointment");
const { sendSMS } = require("../utils/smsService");
const moment = require("moment-timezone");
const LastRun = require("../models/lastRun"); // Example model for storing last run timestamp

// Function to fetch and persist the last run timestamp in the database
const getLastRunTimestamp = async () => {
  const lastRun = await LastRun.findOne({ key: "sendReminders" });
  return lastRun ? lastRun.timestamp : null;
};

const saveLastRunTimestamp = async (timestamp) => {
  await LastRun.findOneAndUpdate(
    { key: "sendReminders" },
    { key: "sendReminders", timestamp },
    { upsert: true } // Create if not exists
  );
};

const sendReminders = async () => {
  try {
    const now = moment().utc();

    // Define the reminder windows
    const startOf24HourWindow = now.clone().add(24, "hours").startOf("minute");
    const startOf7DayWindow = now.clone().add(7, "days").startOf("minute");
    const cooldownPeriod = now.clone().subtract(10, "minutes").toDate();

    console.log("Checking reminders for:");
    console.log("24-hour window:", startOf24HourWindow.toDate());
    console.log("7-day window:", startOf7DayWindow.toDate());

    // Query for daily appointments (exclude already sent reminders)
    const dailyAppointments = await Appointment.find({
      appointmentDateTime: {
        $gte: startOf24HourWindow.toDate(),
        $lt: startOf24HourWindow.clone().add(1, "hour").toDate(),
      },
      "reminderLogs.type": { $ne: "24-hour" }, // Check reminder type
      $or: [
        { "reminderLogs.timestamp": { $exists: false } }, // If no reminders exist
        { "reminderLogs.timestamp": { $lte: cooldownPeriod } }, // Ensure no recent reminders
      ],
    });

    // Query for recurring appointments (exclude already sent reminders)
    const recurringAppointments = await Appointment.find({
      appointmentDateTime: {
        $gte: startOf7DayWindow.toDate(),
        $lt: startOf7DayWindow.clone().add(1, "hour").toDate(),
      },
      $or: [{ recurrence: "weekly" }, { recurrence: "monthly" }],
      "reminderLogs.type": { $ne: "7-day" },
      $or: [
        { "reminderLogs.timestamp": { $exists: false } },
        { "reminderLogs.timestamp": { $lte: cooldownPeriod } },
      ],
    });

    // Process daily appointments
    for (const appointment of dailyAppointments) {
      const appointmentDateTime = moment(appointment.appointmentDateTime)
        .tz("Europe/Athens")
        .format("DD/MM/YYYY HH:mm");
      const message = `Υπενθύμιση για το ραντεβού σας αύριο στις ${appointmentDateTime} στο Lemo Barber Shop.`;

      try {
        const updatedAppointment = await Appointment.findOneAndUpdate(
          {
            _id: appointment._id,
            "reminderLogs.type": { $ne: "24-hour" },
            $or: [
              { "reminderLogs.timestamp": { $exists: false } },
              { "reminderLogs.timestamp": { $lte: cooldownPeriod } },
            ],
          },
          {
            $push: {
              reminderLogs: {
                type: "24-hour",
                timestamp: new Date(),
              },
            },
          },
          { new: true }
        );

        if (updatedAppointment) {
          await sendSMS(appointment.phoneNumber, message);
          console.log(
            `Reminder sent and logged for daily appointment ${appointment._id}.`
          );
        } else {
          console.log(
            `Skipping duplicate reminder for daily appointment ${appointment._id}.`
          );
        }
      } catch (error) {
        console.error(
          `Failed to send daily reminder for ${appointment._id}:`,
          error.message
        );
      }
    }

    // Process recurring appointments
    for (const appointment of recurringAppointments) {
      const appointmentDateTime = moment(appointment.appointmentDateTime)
        .tz("Europe/Athens")
        .format("DD/MM/YYYY HH:mm");
      const message = `Επιβεβαιώνουμε το ραντεβού σας στο LEMO BARBER SHOP με τον ${appointment.barber} για τις ${appointmentDateTime}!`;

      try {
        const updatedAppointment = await Appointment.findOneAndUpdate(
          {
            _id: appointment._id,
            "reminderLogs.type": { $ne: "7-day" },
            $or: [
              { "reminderLogs.timestamp": { $exists: false } },
              { "reminderLogs.timestamp": { $lte: cooldownPeriod } },
            ],
          },
          {
            $push: {
              reminderLogs: {
                type: "7-day",
                timestamp: new Date(),
              },
            },
          },
          { new: true }
        );

        if (updatedAppointment) {
          await sendSMS(appointment.phoneNumber, message);
          console.log(
            `Reminder sent and logged for recurring appointment ${appointment._id}.`
          );
        } else {
          console.log(
            `Skipping duplicate reminder for recurring appointment ${appointment._id}.`
          );
        }
      } catch (error) {
        console.error(
          `Failed to send recurring reminder for ${appointment._id}:`,
          error.message
        );
      }
    }

    console.log("Reminders processed successfully.");
  } catch (error) {
    console.error("Error while sending reminders:", error.message);
  }
};

module.exports = { sendReminders };
