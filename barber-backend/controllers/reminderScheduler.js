const Appointment = require("../models/appointment");
const { sendSMS } = require("../utils/smsService");
const moment = require("moment-timezone");

// Main function to send 24-hour reminders
const sendReminders = async () => {
  try {
    const now = moment().utc();
    const reminderTime = now.clone().add(24, "hours").startOf("minute");

    console.log("Checking reminders for:", reminderTime.toDate());

    // Find all confirmed appointments exactly 24 hours away
    const appointments = await Appointment.find({
      appointmentDateTime: {
        $gte: reminderTime.toDate(), // 24 hours from now
        $lt: reminderTime.clone().add(24, "hours").toDate(), // Up to 48 hours
      },
      appointmentStatus: "confirmed",
    });

    for (const appointment of appointments) {
      const appointmentDateTime = moment(appointment.appointmentDateTime)
        .tz("Europe/Athens")
        .format("DD/MM/YYYY HH:mm");

      // Reminder message (unchanged)
      const message = `Υπενθύμιση για το ραντεβού σας αύριο στις ${appointmentDateTime} στο Lemo Barber Shop.`;

      try {
        await sendSMS(appointment.phoneNumber, message);
        console.log(`Reminder sent for appointment ${appointment._id}`);
      } catch (error) {
        console.error(
          `Failed to send reminder for appointment ${appointment._id}:`,
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
