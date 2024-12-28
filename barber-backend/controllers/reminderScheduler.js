const Appointment = require("../models/appointment");
const { sendSMS } = require("../utils/smsService");
const moment = require("moment-timezone");

const sendReminders = async () => {
  try {
    // Get all appointments for the next day
    const now = moment().utc();
    const tomorrow = now.clone().add(1, "day").startOf("day");
    const dayAfterTomorrow = tomorrow.clone().add(1, "day");

    const appointments = await Appointment.find({
      appointmentDateTime: {
        $gte: tomorrow.toDate(),
        $lt: dayAfterTomorrow.toDate(),
      },
    });

    console.log("Appointments scheduled for reminders:", appointments);

    // Send SMS reminders
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
