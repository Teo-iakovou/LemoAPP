const Appointment = require("../models/appointment");
const Customer = require("../models/customer");

// Create a new appointment
const createAppointment = async (req, res, next) => {
  try {
    const {
      customerName,
      phoneNumber,
      appointmentDateTime,
      barber,
      recurrence,
    } = req.body;

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

    // Validate appointment date
    const appointmentDate = new Date(appointmentDateTime);
    if (isNaN(appointmentDate.getTime()) || appointmentDate <= new Date()) {
      return res
        .status(400)
        .json({ message: "Invalid or past appointment date" });
    }

    // Validate barber value
    if (!["Lemo", "Assistant"].includes(barber)) {
      return res
        .status(400)
        .json({ message: "Barber must be either 'Lemo' or 'Assistant'" });
    }

    // Check if the customer exists or create a new one
    let customer = await Customer.findOne({ phoneNumber });
    if (!customer) {
      customer = new Customer({ name: customerName, phoneNumber });
      await customer.save();
    }

    // Create the initial appointment
    const newAppointment = new Appointment({
      customerName,
      phoneNumber,
      appointmentDateTime,
      barber,
    });

    // Save the initial appointment
    const savedAppointment = await newAppointment.save();

    // Generate additional appointments if recurrence is provided
    const additionalAppointments = [];
    if (recurrence && ["daily", "weekly", "monthly"].includes(recurrence)) {
      let startDate = new Date(appointmentDateTime);

      for (let i = 1; i <= 5; i++) {
        let nextDate = new Date(startDate);
        if (recurrence === "daily") {
          nextDate.setDate(startDate.getDate() + i);
        } else if (recurrence === "weekly") {
          nextDate.setDate(startDate.getDate() + i * 7);
        } else if (recurrence === "monthly") {
          nextDate.setMonth(startDate.getMonth() + i);
        }

        // Create additional appointments
        additionalAppointments.push(
          new Appointment({
            customerName,
            phoneNumber,
            appointmentDateTime: nextDate,
            barber,
          }).save()
        );
      }
    }

    // Save all additional appointments
    const savedAdditionalAppointments = await Promise.all(
      additionalAppointments
    );

    // Respond with all created appointments and customer details
    res.status(201).json({
      message: "Appointments created successfully",
      customer: {
        name: customer.name,
        phoneNumber: customer.phoneNumber,
      },
      initialAppointment: savedAppointment,
      recurringAppointments: savedAdditionalAppointments,
    });
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
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
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
