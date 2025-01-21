const Appointment = require("../models/appointment");
const { sendSMS } = require("../utils/smsService");
const moment = require("moment-timezone");

// Function to fetch and persist the last run timestamp (replace with your implementation)
let lastRunTimestamp = null; // In-memory for simplicity; use persistent storage in production

const getLastRunTimestamp = () => lastRunTimestamp;
const saveLastRunTimestamp = (timestamp) => {
  lastRunTimestamp = timestamp;
};

const sendReminders = async () => {
  try {
    const now = moment().utc();
    const lastRunTime =
      getLastRunTimestamp() || now.clone().subtract(1, "hour").toDate(); // Default to 1 hour earlier if no timestamp

    // Define the reminder windows
    const startOf24HourWindow = now.clone().add(24, "hours").startOf("minute");
    const startOf7DayWindow = now.clone().add(7, "days").startOf("minute");

    console.log("Checking reminders for:");
    console.log("24-hour window:", startOf24HourWindow.toDate());
    console.log("7-day window:", startOf7DayWindow.toDate());

    // Query for daily appointments (exclude already sent reminders)
    const dailyAppointments = await Appointment.find({
      appointmentDateTime: {
        $gte: startOf24HourWindow.toDate(),
        $lt: startOf24HourWindow.clone().add(1, "hour").toDate(),
      },
      reminderLogs: { $ne: "24-hour" },
    });

    // Query for recurring appointments (exclude already sent reminders)
    const recurringAppointments = await Appointment.find({
      appointmentDateTime: {
        $gte: startOf7DayWindow.toDate(),
        $lt: startOf7DayWindow.clone().add(1, "hour").toDate(),
      },
      $or: [{ recurrence: "weekly" }, { recurrence: "monthly" }],
      reminderLogs: { $ne: "7-day" },
    });

    // Process daily appointments
    for (const appointment of dailyAppointments) {
      const appointmentDateTime = moment(appointment.appointmentDateTime)
        .tz("Europe/Athens")
        .format("DD/MM/YYYY HH:mm");
      const message = `Υπενθύμιση για το ραντεβού σας αύριο στις ${appointmentDateTime} στο Lemo Barber Shop.`;

      try {
        await sendSMS(appointment.phoneNumber, message);
        await Appointment.updateOne(
          { _id: appointment._id },
          { $push: { reminderLogs: "24-hour" } }
        );
        console.log(
          `Reminder sent and logged for daily appointment ${appointment._id}.`
        );
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
        await sendSMS(appointment.phoneNumber, message);
        await Appointment.updateOne(
          { _id: appointment._id },
          { $push: { reminderLogs: "7-day" } }
        );
        console.log(
          `Reminder sent and logged for recurring appointment ${appointment._id}.`
        );
      } catch (error) {
        console.error(
          `Failed to send recurring reminder for ${appointment._id}:`,
          error.message
        );
      }
    }

    // Save the current timestamp as the last run time
    saveLastRunTimestamp(now.toDate());
    console.log("Reminders processed successfully.");
  } catch (error) {
    console.error("Error while sending reminders:", error.message);
  }
};

module.exports = { sendReminders };
