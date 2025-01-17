const Appointment = require("../models/appointment");
const { sendSMS } = require("../utils/smsService");
const moment = require("moment-timezone");

const sendReminders = async () => {
  try {
    const now = moment().utc();

    const startOf24HourWindow = now.clone().add(24, "hours").startOf("minute");
    const endOf24HourWindow = startOf24HourWindow.clone().add(1, "hour");

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

    // Find daily appointments that haven't been reminded yet
    const dailyAppointments = await Appointment.find({
      appointmentDateTime: {
        $gte: startOf24HourWindow.toDate(),
        $lt: endOf24HourWindow.toDate(),
      },
      reminders: { $not: { $elemMatch: { type: "24-hour" } } }, // Check reminders
    });

    // Find recurring appointments that haven't been reminded yet
    const recurringAppointments = await Appointment.find({
      appointmentDateTime: {
        $gte: startOf7DayWindow.toDate(),
        $lt: endOf7DayWindow.toDate(),
      },
      reminders: { $not: { $elemMatch: { type: "7-day" } } }, // Check reminders
    });

    // Send reminders for daily appointments
    for (const appointment of dailyAppointments) {
      const appointmentDateTime = moment(appointment.appointmentDateTime)
        .tz("Europe/Athens")
        .format("DD/MM/YYYY HH:mm");
      const message = `Υπενθύμιση για το ραντεβού σας αύριο στις ${appointmentDateTime} στο Lemo Barber Shop.`;

      try {
        await sendSMS(appointment.phoneNumber, message);

        // Mark reminder as sent
        appointment.reminders.push({ type: "24-hour", sentAt: new Date() });
        await appointment.save();

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

    // Send reminders for recurring appointments
    for (const appointment of recurringAppointments) {
      const appointmentDateTime = moment(appointment.appointmentDateTime)
        .tz("Europe/Athens")
        .format("DD/MM/YYYY HH:mm");
      const message = `Υπενθύμιση: Το ραντεβού σας στο Lemo Barber Shop με τον ${appointment.barber} είναι στις ${appointmentDateTime}.`;

      try {
        await sendSMS(appointment.phoneNumber, message);

        // Mark reminder as sent
        appointment.reminders.push({ type: "7-day", sentAt: new Date() });
        await appointment.save();

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
