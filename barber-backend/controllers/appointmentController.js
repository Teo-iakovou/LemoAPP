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

    if (!customerName || !phoneNumber || !appointmentDateTime || !barber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const appointmentDate = moment(appointmentDateTime).utc();
    if (
      !appointmentDate.isValid() ||
      appointmentDate.isBefore(moment().utc())
    ) {
      return res
        .status(400)
        .json({ message: "Invalid or past appointment date" });
    }

    const athensTime = appointmentDate.clone().tz("Europe/Athens");
    console.log("Appointment Date (Athens Time):", athensTime.format());

    let customer = await Customer.findOne({ phoneNumber });
    if (!customer) {
      customer = new Customer({ name: customerName, phoneNumber });
      await customer.save();
    }

    // Set fixed duration and calculate endTime
    const duration = 40; // 40 minutes
    const endTime = appointmentDate.clone().add(duration, "minutes").toDate();

    // Create and save the initial appointment
    const newAppointment = new Appointment({
      customerName,
      phoneNumber,
      appointmentDateTime: appointmentDate.toDate(),
      barber,
      duration,
      endTime,
    });
    const savedAppointment = await newAppointment.save();

    // Send confirmation SMS for the initial appointment
    try {
      const formattedLocalTime = athensTime.format("DD/MM/YYYY HH:mm");
      const message = `Επιβεβαιώνουμε το ραντεβού σας στο LEMO BARBER SHOP με τον ${barber} για τις ${formattedLocalTime}!`;
      await sendSMS(phoneNumber, message);
      console.log(
        "Confirmation SMS sent successfully for the first appointment."
      );
    } catch (smsError) {
      console.error("Failed to send confirmation SMS:", smsError.message);
    }

    // Generate additional appointments if recurrence is provided
    const additionalAppointments = [];
    if (recurrence === "weekly" && repeatWeeks) {
      let currentDate = appointmentDate.clone();
      for (let i = 1; i <= repeatWeeks; i++) {
        currentDate.add(1, "week");
        const recurringEndTime = currentDate
          .clone()
          .add(duration, "minutes")
          .toDate();

        const additionalAppointment = new Appointment({
          customerName,
          phoneNumber,
          appointmentDateTime: currentDate.toDate(),
          barber,
          duration,
          endTime: recurringEndTime,
        });
        const savedAdditionalAppointment = await additionalAppointment.save();
        additionalAppointments.push(savedAdditionalAppointment);
      }
    } else if (recurrence === "monthly" && repeatMonths) {
      let currentDate = appointmentDate.clone();
      for (let i = 1; i <= repeatMonths; i++) {
        currentDate.add(1, "month");
        const recurringEndTime = currentDate
          .clone()
          .add(duration, "minutes")
          .toDate();

        const additionalAppointment = new Appointment({
          customerName,
          phoneNumber,
          appointmentDateTime: currentDate.toDate(),
          barber,
          duration,
          endTime: recurringEndTime,
        });
        const savedAdditionalAppointment = await additionalAppointment.save();
        additionalAppointments.push(savedAdditionalAppointment);
      }
    }

    res.status(201).json({
      message: "Appointments created successfully",
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
