const Appointment = require("../models/appointment");
const { sendSMS } = require("../utils/smsService");
const moment = require("moment-timezone");

const sendReminders = async () => {
  try {
    // Current time in UTC
    const now = moment().utc();
    const startOfWindow = now.clone();
    const endOfWindow = now.clone().add(1, "hour"); // Define a window of 1 hour

    // Find appointments scheduled exactly 24 hours from now
    const appointments = await Appointment.find({
      appointmentDateTime: {
        $gte: startOfWindow.add(23, "hours").toDate(), // 24 hours from now (start of window)
        $lt: endOfWindow.add(1, "hour").toDate(), // 24 hours + 1 hour (end of window)
      },
    });

    console.log("Appointments scheduled for reminders:", appointments);

    // Send SMS reminders for each appointment
    for (const appointment of appointments) {
      const appointmentDateTime = moment(appointment.appointmentDateTime)
        .tz("Europe/Athens")
        .format("DD/MM/YYYY HH:mm");
      const message = `Υπενθύμιση για το ραντεβού σας αύριο στις ${appointmentDateTime} στο Lemo Barber Shop. Αν χρειαστεί αλλαγή, παρακαλούμε ενημερώστε μας έγκαιρα. Ευχαριστούμε και σας περιμένουμε!`;

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
