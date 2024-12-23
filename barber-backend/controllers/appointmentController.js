const Appointment = require("../models/appointment");
const Customer = require("../models/customer");
const { sendSMS } = require("../utils/smsService");

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
      repeatWeeks, // Added for weekly recurrence
      repeatMonths, // Optional for monthly recurrence
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

    // Send SMS confirmation for the initial appointment
    try {
      const formattedDate = new Date(appointmentDateTime).toLocaleString(
        "en-GB",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );

      const message = `Dear ${customerName}, your appointment with ${barber} is confirmed for ${formattedDate}. Thank you for choosing Lemo Barber Shop!`;
      await sendSMS(phoneNumber, message);
      console.log("Confirmation SMS sent successfully");
    } catch (smsError) {
      console.error("Failed to send confirmation SMS:", smsError.message);
    }

    // Generate additional appointments if recurrence is provided
    const additionalAppointments = [];
    if (recurrence === "weekly" && repeatWeeks) {
      // Generate weekly appointments
      let currentDate = new Date(appointmentDateTime); // Start from the initial date
      for (let i = 1; i <= repeatWeeks; i++) {
        currentDate.setDate(currentDate.getDate() + 7); // Increment by 7 days

        // Create and save additional appointment
        const additionalAppointment = new Appointment({
          customerName,
          phoneNumber,
          appointmentDateTime: new Date(currentDate), // Use updated currentDate
          barber,
        });
        const savedAdditionalAppointment = await additionalAppointment.save();
        additionalAppointments.push(savedAdditionalAppointment);
      }
    } else if (recurrence === "monthly" && repeatMonths) {
      // Generate monthly appointments
      let currentDate = new Date(appointmentDateTime); // Start from the initial date
      for (let i = 1; i <= repeatMonths; i++) {
        currentDate.setMonth(currentDate.getMonth() + 1); // Increment by 1 month

        // Create and save additional appointment
        const additionalAppointment = new Appointment({
          customerName,
          phoneNumber,
          appointmentDateTime: new Date(currentDate), // Use updated currentDate
          barber,
        });
        const savedAdditionalAppointment = await additionalAppointment.save();
        additionalAppointments.push(savedAdditionalAppointment);
      }
    }

    // Respond with all created appointments and customer details
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
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Appointment updated successfully",
      updatedAppointment, // Ensure this key is returned
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
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Appointment deleted successfully",
    });
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
