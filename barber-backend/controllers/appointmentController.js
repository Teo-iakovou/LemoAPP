const Appointment = require("../models/appointment");
const Customer = require("../models/customer");
const { sendSMS } = require("../utils/smsService");
const moment = require("moment-timezone");
// Create an appointment
const createAppointment = async (req, res, next) => {
  try {
    console.log("📥 Received Payload on Server:", req.body);

    const {
      customerName,
      phoneNumber,
      appointmentDateTime,
      barber,
      type,
      recurrence,
      repeatInterval, // How many weeks between each appointment
      repeatCount, // Total number of appointments
    } = req.body;

    // Validate required fields
    if (type !== "break" && (!customerName || !phoneNumber)) {
      return res
        .status(400)
        .json({ error: "Customer name and phone number are required." });
    }

    if (!appointmentDateTime) {
      return res.status(400).json({ error: "Appointment time is required." });
    }

    // Ensure repeatCount does not exceed 5
    const maxRepeat = Math.min(parseInt(repeatCount, 10) || 1, 5);
    const intervalWeeks = Math.min(parseInt(repeatInterval, 10) || 1, 5);

    // Validate appointment date
    const appointmentDateUTC = moment(appointmentDateTime).utc();
    if (!appointmentDateUTC.isValid()) {
      return res.status(400).json({ message: "Invalid appointment date." });
    }

    // Check if appointment is in the past
    const isPastDate = appointmentDateUTC.isBefore(moment().utc());

    // Convert to Athens time for logging
    const appointmentDateAthens = appointmentDateUTC
      .clone()
      .tz("Europe/Athens");
    console.log(
      "📅 Appointment Date (Athens Time):",
      appointmentDateAthens.format()
    );

    // Check if customer exists, otherwise create a new one
    let customer = null;

    if (type !== "break") {
      customer = await Customer.findOne({ phoneNumber });
      if (!customer) {
        customer = new Customer({ name: customerName, phoneNumber });
        await customer.save();
      }
    }

    // Calculate end time in UTC
    // Accept duration from req.body or fallback to default
    const duration = Number(req.body.duration) || 40;
    const endTimeUTC = appointmentDateUTC
      .clone()
      .add(duration, "minutes")
      .toDate();

    const newAppointment = new Appointment({
      customerName,
      phoneNumber,
      appointmentDateTime: appointmentDateUTC.toDate(),
      barber,
      duration,
      appointmentStatus: "confirmed",
      type: type || "appointment",
      endTime: endTimeUTC,
      recurrence: recurrence === "weekly" ? "weekly" : "one-time",
      repeatInterval: recurrence === "weekly" ? intervalWeeks : null,
      repeatCount: recurrence === "weekly" ? maxRepeat : null,
    });

    const savedAppointment = await newAppointment.save();

    // Generate recurring appointments if applicable
    let additionalAppointments = [];
    if (recurrence === "weekly" && maxRepeat > 1) {
      additionalAppointments = await generateRecurringAppointments({
        customerName,
        phoneNumber,
        barber,
        initialAppointmentDate: appointmentDateUTC,
        duration,
        intervalWeeks,
        repeatCount: maxRepeat - 1, // Since the first appointment is already created
      });
    }

    // Send confirmation SMS for all appointments
    if (!isPastDate) {
      try {
        let message;

        if (recurrence === "weekly" && maxRepeat > 1) {
          const allDates = [
            appointmentDateAthens.format("DD/MM/YYYY HH:mm"),
            ...additionalAppointments.map((appt) =>
              moment(appt.appointmentDateTime)
                .tz("Europe/Athens")
                .format("DD/MM/YYYY HH:mm")
            ),
          ].join(", ");

          message = `Επιβεβαιώνουμε τα ραντεβού σας στο LEMO BARBER SHOP με τον ${barber} για τις ημερομηνίες: ${allDates}.`;
        } else {
          const formattedLocalTime =
            appointmentDateAthens.format("DD/MM/YYYY HH:mm");
          message = `Επιβεβαιώνουμε το ραντεβού σας στο LEMO BARBER SHOP με τον ${barber} για τις ${formattedLocalTime}!`;
        }

        const result = await sendSMS(phoneNumber, message);
        console.log("📲 Confirmation SMS sent.");
        console.log("📦 SMS API Response:", result);

        savedAppointment.reminders.push({
          type: "confirmation", // ✅ CORRECT
          sentAt: new Date(),
          messageId: result?.message_id || result?.messageId || null,
          status: result?.success ? "sent" : "failed",
          messageText: message,
          senderId: "Lemo Barber",
          retryCount: 0,
        });

        await savedAppointment.save();
      } catch (smsError) {
        console.error("❌ Failed to send confirmation SMS:", smsError.message);
      }
    }

    res.status(201).json({
      message: "Appointments created successfully.",
      ...(customer && {
        customer: {
          name: customer.name,
          phoneNumber: customer.phoneNumber,
        },
      }),
      initialAppointment: savedAppointment,
      recurringAppointments: additionalAppointments,
    });
  } catch (error) {
    next(error);
  }
};

// 🔄 Generate Recurring Appointments with Dynamic Week Intervals
const generateRecurringAppointments = async ({
  customerName,
  phoneNumber,
  barber,
  initialAppointmentDate,
  duration,
  intervalWeeks,
  repeatCount,
}) => {
  const appointments = [];
  let currentDateUTC = initialAppointmentDate.clone();

  for (let i = 1; i <= repeatCount; i++) {
    currentDateUTC.add(intervalWeeks, "weeks"); // Apply the interval dynamically
    const recurringEndTimeUTC = currentDateUTC
      .clone()
      .add(duration, "minutes")
      .toDate();

    const additionalAppointment = new Appointment({
      customerName,
      phoneNumber,
      appointmentDateTime: currentDateUTC.toDate(),
      barber,
      duration,
      endTime: recurringEndTimeUTC,
      recurrence: "weekly",
      appointmentStatus: "confirmed",
      type: "appointment",
    });

    const savedAppointment = await additionalAppointment.save();
    appointments.push(savedAppointment);
  }

  return appointments;
};

// Get all appointments
const getAppointments = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;

  try {
    // Only fetch necessary fields; adjust as needed
    const appointments = await Appointment.find(
      {},
      {
        customerName: 1,
        phoneNumber: 1,
        appointmentDateTime: 1,
        barber: 1,
        type: 1,
        appointmentStatus: 1,
        duration: 1,
        endTime: 1,
        reminders: 1,
      }
    )
      .sort({ appointmentDateTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(); // 🚀

    const total = await Appointment.countDocuments();

    res.json({
      total,
      page,
      limit,
      appointments,
    });
  } catch (error) {
    next(error);
  }
};

// Update an appointment
const updateAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      appointmentDateTime,
      duration = 40,
      phoneNumber,
      barber,
      ...updateData
    } = req.body;

    console.log("🔥 Incoming Update Request:", req.body);
    console.log("🔍 Appointment ID:", id);

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    console.log("📅 Existing Appointment Before Update:", appointment);

    const oldFormattedDate = moment(appointment.appointmentDateTime)
      .tz("Europe/Athens")
      .format("DD/MM/YYYY HH:mm");

    if (appointmentDateTime) {
      const newDate = new Date(appointmentDateTime);
      appointment.appointmentDateTime = newDate;
      appointment.endTime = new Date(newDate.getTime() + duration * 60 * 1000);
    }

    if (barber) {
      appointment.barber = barber;
    }

    Object.assign(appointment, updateData);

    // ✅ Ensure 'type' is present for reminder compatibility
    if (!appointment.type) {
      appointment.type = "appointment";
    }

    const newFormattedDate = moment(appointment.appointmentDateTime)
      .tz("Europe/Athens")
      .format("DD/MM/YYYY HH:mm");

    const now = moment().utc();
    const isPast = moment(appointment.appointmentDateTime).isBefore(now);

    if (!isPast) {
      try {
        const message = `Το ραντεβού σας στο LEMO BARBER SHOP στις ${oldFormattedDate}, έχει αλλάξει για ${newFormattedDate}.`;
        const smsResponse = await sendSMS(
          phoneNumber || appointment.phoneNumber,
          message
        );

        const messageId = smsResponse?.message_id || smsResponse?.messageId;

        appointment.reminders.push({
          type: "update",
          sentAt: new Date(),
          messageId: messageId || null,
          messageText: message,
          senderId: "Lemo Barber",
          status: smsResponse?.success ? "sent" : "failed",
          retryCount: 0,
        });

        console.log("📲 Update SMS sent successfully");
      } catch (smsError) {
        console.error("❌ Failed to send update SMS:", smsError.message);
      }
    } else {
      console.log("📵 No Update SMS sent because appointment is in the past.");
    }

    await appointment.save();

    res.status(200).json({
      success: true,
      message: "Appointment updated successfully and SMS sent",
      updatedAppointment: appointment,
    });
  } catch (error) {
    console.error("❌ Error updating appointment:", error);
    next(error);
  }
};

// Delete an appointment
const deleteAppointment = async (req, res, next) => {
  try {
    const { id } = req.params; // Appointment ID from the route

    // Find the appointment before deleting it to retrieve customer details
    const appointmentToDelete = await Appointment.findById(id);

    if (!appointmentToDelete) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });
    }

    // Delete the appointment
    const deletedAppointment = await Appointment.findByIdAndDelete(id);

    if (deletedAppointment) {
      // Send SMS confirmation for deleted appointment
      const now = moment().utc();
      const isPastAppointment = moment(
        deletedAppointment.appointmentDateTime
      ).isBefore(now);

      if (!isPastAppointment) {
        try {
          const formattedDateTime = moment(
            deletedAppointment.appointmentDateTime
          )
            .tz("Europe/Athens")
            .format("DD/MM/YYYY HH:mm");
          const message = `Θα θέλαμε να σας ενημερώσουμε ότι το ραντεβού σας για ${formattedDateTime} ακυρώνεται.`;

          await sendSMS(deletedAppointment.phoneNumber, message);
          console.log("📲 Deletion SMS sent successfully");
        } catch (smsError) {
          console.error("❌ Failed to send deletion SMS:", smsError.message);
        }
      } else {
        console.log(
          "📵 No Deletion SMS sent because appointment was in the past."
        );
      }

      return res.status(200).json({
        success: true,
        message: "Appointment deleted successfully and SMS sent",
      });
    }
  } catch (error) {
    next(error); // Pass any errors to the error-handling middleware
  }
};

const getUpcomingAppointments = async (req, res) => {
  try {
    const startOfYesterday = moment()
      .subtract(1, "day")
      .startOf("day")
      .toDate();

    const appointments = await Appointment.find(
      {
        appointmentDateTime: { $gte: startOfYesterday },
        appointmentStatus: "confirmed",
        type: { $in: ["appointment", "break"] },
      },
      {
        customerName: 1,
        phoneNumber: 1,
        appointmentDateTime: 1,
        barber: 1,
        type: 1,
        duration: 1,
        endTime: 1,
        _id: 1,
      }
    )
      .sort({ appointmentDateTime: 1 })
      .lean();

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch upcoming appointments" });
  }
};

const getPastAppointments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const today = new Date();

    const appointments = await Appointment.find({
      appointmentDateTime: { $lt: today },
    })
      .sort({ appointmentDateTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Appointment.countDocuments({
      appointmentDateTime: { $lt: today },
    });

    res.json({ total, page, limit, appointments });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch past appointments" });
  }
};
module.exports = {
  createAppointment,
  getAppointments,
  updateAppointment,
  deleteAppointment,
  getUpcomingAppointments,
  getPastAppointments,
};
