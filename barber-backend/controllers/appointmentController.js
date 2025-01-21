const Appointment = require("../models/appointment");
const Customer = require("../models/customer");
const { sendSMS } = require("../utils/smsService");
const moment = require("moment-timezone");
// Create an appointment

const createAppointment = async (req, res, next) => {
  try {
    console.log("Received Payload on Server:", req.body);

    const {
      customerName,
      phoneNumber,
      appointmentDateTime,
      barber,
      recurrence,
      repeatWeeks,
      repeatMonths,
    } = req.body;

    // Validate required fields
    if (!customerName || !phoneNumber || !appointmentDateTime || !barber) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Validate appointment date
    const appointmentDateUTC = moment(appointmentDateTime).utc();
    if (
      !appointmentDateUTC.isValid() ||
      appointmentDateUTC.isBefore(moment().utc())
    ) {
      return res
        .status(400)
        .json({ message: "Invalid or past appointment date." });
    }

    // Convert to Athens time for logging and SMS
    const appointmentDateAthens = appointmentDateUTC
      .clone()
      .tz("Europe/Athens");
    console.log(
      "Appointment Date (Athens Time):",
      appointmentDateAthens.format()
    );

    // Check if customer exists, otherwise create a new one
    let customer = await Customer.findOne({ phoneNumber });
    if (!customer) {
      customer = new Customer({ name: customerName, phoneNumber });
      await customer.save();
    }

    // Calculate end time in UTC
    const duration = 40; // Fixed duration of 40 minutes
    const endTimeUTC = appointmentDateUTC
      .clone()
      .add(duration, "minutes")
      .toDate();

    // Create the initial appointment
    const newAppointment = new Appointment({
      customerName,
      phoneNumber,
      appointmentDateTime: appointmentDateUTC.toDate(), // Store in UTC
      barber,
      duration,
      endTime: endTimeUTC, // Store in UTC
      recurrence: recurrence || "one-time", // Default to one-time if not specified
    });
    const savedAppointment = await newAppointment.save();

    // Send confirmation SMS
    try {
      const formattedLocalTime =
        appointmentDateAthens.format("DD/MM/YYYY HH:mm");
      const message = `Επιβεβαιώνουμε το ραντεβού σας στο LEMO BARBER SHOP με τον ${barber} για τις ${formattedLocalTime}!`;
      await sendSMS(phoneNumber, message);
      console.log("Confirmation SMS sent successfully.");
    } catch (smsError) {
      console.error("Failed to send confirmation SMS:", smsError.message);
    }

    // Generate recurring appointments if applicable
    const additionalAppointments = [];
    if (recurrence === "weekly" && repeatWeeks) {
      additionalAppointments.push(
        ...(await generateRecurringAppointments({
          customerName,
          phoneNumber,
          barber,
          initialAppointmentDate: appointmentDateUTC,
          duration,
          recurrenceType: "weekly",
          repeatCount: repeatWeeks,
          interval: "week",
        }))
      );
    } else if (recurrence === "monthly" && repeatMonths) {
      additionalAppointments.push(
        ...(await generateRecurringAppointments({
          customerName,
          phoneNumber,
          barber,
          initialAppointmentDate: appointmentDateUTC,
          duration,
          recurrenceType: "monthly",
          repeatCount: repeatMonths,
          interval: "month",
        }))
      );
    }

    res.status(201).json({
      message: "Appointments created successfully.",
      customer: {
        name: customer.name,
        phoneNumber: customer.phoneNumber,
      },
      initialAppointment: savedAppointment,
      recurringAppointments: additionalAppointments,
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to generate recurring appointments
const generateRecurringAppointments = async ({
  customerName,
  phoneNumber,
  barber,
  initialAppointmentDate,
  duration,
  recurrenceType,
  repeatCount,
  interval,
}) => {
  const appointments = [];
  let currentDateUTC = initialAppointmentDate.clone();

  for (let i = 1; i <= repeatCount; i++) {
    currentDateUTC.add(1, interval);
    const recurringEndTimeUTC = currentDateUTC
      .clone()
      .add(duration, "minutes")
      .toDate();

    const additionalAppointment = new Appointment({
      customerName,
      phoneNumber,
      appointmentDateTime: currentDateUTC.toDate(), // Store in UTC
      barber,
      duration,
      endTime: recurringEndTimeUTC, // Store in UTC
      recurrence: recurrenceType,
    });
    const savedAppointment = await additionalAppointment.save();
    appointments.push(savedAppointment);
  }

  return appointments;
};

module.exports = { createAppointment };

// Get all appointments
const getAppointments = async (req, res, next) => {
  try {
    const appointments = await Appointment.find().sort({
      appointmentDateTime: 1,
    });
    res.json(appointments);
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

    // Validate if the appointmentDateTime is in the future
    if (appointmentDateTime) {
      const appointmentStart = new Date(appointmentDateTime);
      if (appointmentStart <= new Date()) {
        return res
          .status(400)
          .json({ message: "Appointment date must be in the future" });
      }

      // Recalculate endTime
      updateData.endTime = new Date(
        appointmentStart.getTime() + duration * 60 * 1000
      );
      updateData.appointmentDateTime = appointmentStart; // Ensure it's updated in the database
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true, // Return the updated document
        runValidators: true, // Ensure validations are run
      }
    );

    if (!updatedAppointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Send SMS notification for the updated appointment
    try {
      const formattedDateTime = moment(updatedAppointment.appointmentDateTime)
        .tz("Europe/Athens")
        .format("DD/MM/YYYY HH:mm");
      const message = `Το ραντεβού σας στο LEMO BARBER SHOP με τον ${barber} έχει αλλάξει στις ${formattedDateTime}.`;

      await sendSMS(phoneNumber || updatedAppointment.phoneNumber, message);
      console.log("Update SMS sent successfully");
    } catch (smsError) {
      console.error("Failed to send update SMS:", smsError.message);
    }

    res.status(200).json({
      success: true,
      message: "Appointment updated successfully and SMS sent",
      updatedAppointment,
    });
  } catch (error) {
    console.error("Error updating appointment:", error);
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
      try {
        const formattedDateTime = moment(deletedAppointment.appointmentDateTime)
          .tz("Europe/Athens")
          .format("DD/MM/YYYY HH:mm");
        const message = `Θα θέλαμε να σας ενημερώσουμε ότι το ραντεβού σας για ${formattedDateTime} ακυρώνεται.`;

        await sendSMS(deletedAppointment.phoneNumber, message);
        console.log("Deletion SMS sent successfully");
      } catch (smsError) {
        console.error("Failed to send deletion SMS:", smsError.message);
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

module.exports = {
  createAppointment,
  getAppointments,
  updateAppointment,
  deleteAppointment,
};
