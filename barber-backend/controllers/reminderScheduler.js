const Appointment = require("../models/appointment");
const { sendSMS } = require("../utils/smsService");
const moment = require("moment-timezone");

const sendReminders = async () => {
  try {
    // Current time in UTC
    const now = moment().utc();

    // Define the 24-hour window for daily reminders
    const startOf24HourWindow = now.clone().add(24, "hours").startOf("minute");
    const endOf24HourWindow = startOf24HourWindow.clone().add(1, "hour");

    // Define the 7-day window for weekly/monthly recurring reminders
    const startOf7DayWindow = now.clone().add(7, "days").startOf("minute");
    const endOf7DayWindow = startOf7DayWindow.clone().add(1, "hour");

    console.log("Checking reminders for:");
    console.log(
      "24-hour window:",
      startOf24HourWindow.toDate(),
      endOf24HourWindow.toDate()
    );
    console.log(
      "7-day window:",
      startOf7DayWindow.toDate(),
      endOf7DayWindow.toDate()
    );

    // Find appointments within the 24-hour window for daily appointments
    const dailyAppointments = await Appointment.find({
      appointmentDateTime: {
        $gte: startOf24HourWindow.toDate(),
        $lt: endOf24HourWindow.toDate(),
      },
    });

    // Find appointments within the 7-day window for recurring appointments
    const recurringAppointments = await Appointment.find({
      appointmentDateTime: {
        $gte: startOf7DayWindow.toDate(),
        $lt: endOf7DayWindow.toDate(),
      },
    });

    // Send reminders for daily appointments (24 hours before)
    for (const appointment of dailyAppointments) {
      const appointmentDateTime = moment(appointment.appointmentDateTime)
        .tz("Europe/Athens")
        .format("DD/MM/YYYY HH:mm");
      const message = `Υπενθύμιση για το ραντεβού σας αύριο στις ${appointmentDateTime} στο Lemo Barber Shop.`;

      try {
        await sendSMS(appointment.phoneNumber, message);
        console.log(
          `Reminder sent successfully to ${appointment.phoneNumber} for daily appointment.`
        );
      } catch (error) {
        console.error(
          `Failed to send daily reminder to ${appointment.phoneNumber}:`,
          error.message
        );
      }
    }

    // Send reminders for recurring appointments (7 days before)
    for (const appointment of recurringAppointments) {
      const appointmentDateTime = moment(appointment.appointmentDateTime)
        .tz("Europe/Athens")
        .format("DD/MM/YYYY HH:mm");
      const message = `Επιβεβαιώνουμε το ραντεβού σας στο LEMO BARBER SHOP με τον ${appointment.barber} για τις ${appointmentDateTime}!`;

      try {
        await sendSMS(appointment.phoneNumber, message);
        console.log(
          `Reminder sent successfully to ${appointment.phoneNumber} for recurring appointment.`
        );
      } catch (error) {
        console.error(
          `Failed to send recurring reminder to ${appointment.phoneNumber}:`,
          error.message
        );
      }
    }
  } catch (error) {
    console.error("Error while sending reminders:", error.message);
  }
};

module.exports = { sendReminders };
