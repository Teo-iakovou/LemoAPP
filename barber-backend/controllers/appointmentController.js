const Appointment = require("../models/appointment");
const mongoose = require("mongoose");
const Joi = require("joi");
const { format } = require("date-fns");
// Validation Schema
const appointmentSchema = Joi.object({
  customerName: Joi.string().required(),
  phoneNumber: Joi.string().required(),
  appointmentDateTime: Joi.date().required(),
});

// Utility for ObjectId validation
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Standardized Response
const response = (res, status, message, data = null) => {
  res.status(status).json({ message, data });
};

// Create a new appointment
const createAppointment = async (req, res, next) => {
  try {
    const { error } = appointmentSchema.validate(req.body);
    if (error) return response(res, 400, error.details[0].message);

    const { appointmentDateTime } = req.body;

    const startTime = new Date(appointmentDateTime);
    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + 30); // Add 30 minutes

    // Check for overlapping appointments
    const overlappingAppointment = await Appointment.findOne({
      $or: [
        {
          appointmentDateTime: { $lt: endTime },
          appointmentEndTime: { $gt: startTime },
        },
      ],
    });

    if (overlappingAppointment) {
      return response(res, 400, "Appointment time conflict");
    }

    // Create and save the new appointment
    const newAppointment = new Appointment({
      ...req.body,
      appointmentDateTime: startTime,
    });

    const savedAppointment = await newAppointment.save();

    // Format the response times into 24-hour format
    const formattedAppointment = {
      ...savedAppointment._doc,
      appointmentDateTime: format(
        new Date(savedAppointment.appointmentDateTime),
        "HH:mm"
      ),
      appointmentEndTime: format(
        new Date(savedAppointment.appointmentEndTime),
        "HH:mm"
      ),
    };

    response(
      res,
      201,
      "Appointment created successfully",
      formattedAppointment
    );
  } catch (error) {
    next(error);
  }
};

// Get all appointments
const getAppointments = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sortBy = "appointmentDateTime" } = req.query;

    const appointments = await Appointment.find()
      .sort({ [sortBy]: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Appointment.countDocuments();

    // Format appointment times into 24-hour format
    const formattedAppointments = appointments.map((appointment) => ({
      ...appointment,
      appointmentDateTime: format(
        new Date(appointment.appointmentDateTime),
        "HH:mm"
      ),
      appointmentEndTime: format(
        new Date(appointment.appointmentEndTime),
        "HH:mm"
      ),
    }));

    res.json({ total, page, appointments: formattedAppointments });
  } catch (error) {
    next(error);
  }
};

// Update an appointment
const updateAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return response(res, 400, "Invalid appointment ID");

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    if (!updatedAppointment) return response(res, 404, "Appointment not found");

    response(res, 200, "Appointment updated successfully", updatedAppointment);
  } catch (error) {
    next(error);
  }
};

// Delete an appointment
const deleteAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return response(res, 400, "Invalid appointment ID");

    const deletedAppointment = await Appointment.findByIdAndDelete(id);
    if (!deletedAppointment) return response(res, 404, "Appointment not found");

    response(res, 200, "Appointment deleted successfully");
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
