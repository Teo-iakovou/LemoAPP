const Appointment = require("../models/appointment");
const mongoose = require("mongoose");
// Create a new appointment
const createAppointment = async (req, res, next) => {
  try {
    const { customerName, phoneNumber, appointmentDateTime, barber } = req.body;

    // Validate required fields
    if (!customerName || !phoneNumber || !appointmentDateTime || !barber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate data types
    if (
      typeof customerName !== "string" ||
      typeof phoneNumber !== "string" ||
      typeof barber !== "string"
    ) {
      return res.status(400).json({ message: "Invalid data format" });
    }

    // Validate barber value
    if (!["Lemo", "Assistant"].includes(barber)) {
      return res
        .status(400)
        .json({ message: "Barber must be either 'Lemo' or 'Assistant'" });
    }

    // Create and save the new appointment
    const newAppointment = new Appointment({
      customerName,
      phoneNumber,
      appointmentDateTime,
      barber,
    });

    const savedAppointment = await newAppointment.save();
    res
      .status(201)
      .json({ message: "Appointment created successfully", savedAppointment });
  } catch (error) {
    next(error); // Pass the error to the error-handling middleware
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
    const { barber } = req.body;

    // Validate barber if provided
    if (barber && !["Lemo", "Assistant"].includes(barber)) {
      return res
        .status(400)
        .json({ message: "Barber must be either 'Lemo' or 'Assistant'" });
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
      req.body, // Update all provided fields, including barber
      {
        new: true, // Return the updated document
      }
    );

    if (!updatedAppointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.json({
      message: "Appointment updated successfully",
      updatedAppointment,
    });
  } catch (error) {
    next(error);
  }
};

// Delete an appointment
const deleteAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate if the `id` is a valid MongoDB ObjectId
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid appointment ID" });
    }

    const deletedAppointment = await Appointment.findByIdAndDelete(id);
    if (!deletedAppointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.json({ message: "Appointment deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAppointment,
  getAppointments,
  updateAppointment,
  deleteAppointment,
};
