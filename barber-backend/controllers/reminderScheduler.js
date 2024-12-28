const Appointment = require("../models/appointment");
const { sendSMS } = require("../utils/smsService");
const moment = require("moment-timezone");

const sendReminders = async () => {
  try {
    // Current time in UTC
    const now = moment().utc();

    // Define the 24-hour window for reminders
    const startOfWindow = now.clone().add(24, "hours").startOf("minute"); // Start of the window: 24 hours from now
    const endOfWindow = startOfWindow.clone().add(1, "hour"); // End of the window: 24 hours + 1 hour

    console.log(
      "Querying appointments for reminders between:",
      startOfWindow.toDate(),
      "and",
      endOfWindow.toDate()
    );

    // Find appointments scheduled within the window
    const appointments = await Appointment.find({
      appointmentDateTime: {
        $gte: startOfWindow.toDate(),
        $lt: endOfWindow.toDate(),
      },
    });

    console.log("Appointments scheduled for reminders:", appointments);

    // Send SMS reminders for each appointment
    for (const appointment of appointments) {
      const appointmentDateTime = moment(appointment.appointmentDateTime)
        .tz("Europe/Athens")
        .format("DD/MM/YYYY HH:mm");
      const message = `Υπενθύμιση για το ραντεβού σας αύριο στις ${appointmentDateTime} στο Lemo Barber Shop.`;

      try {
        await sendSMS(appointment.phoneNumber, message);
        console.log(`Reminder sent successfully to ${appointment.phoneNumber}`);
      } catch (error) {
        console.error(
          `Failed to send reminder to ${appointment.phoneNumber}:`,
          error.message
        );
      }
    }
  } catch (error) {
    console.error("Error while sending reminders:", error.message);
  }
};

module.exports = { sendReminders };
