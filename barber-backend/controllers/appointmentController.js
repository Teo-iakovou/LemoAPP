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
    const appointmentDate = moment(appointmentDateTime).utc(); // Assume input is in UTC
    if (
      !appointmentDate.isValid() ||
      appointmentDate.isBefore(moment().utc())
    ) {
      return res
        .status(400)
        .json({ message: "Invalid or past appointment date" });
    }

    console.log(
      "Parsed Appointment Date (UTC):",
      appointmentDate.toISOString()
    );

    // Convert to Europe/Athens for local display purposes
    const athensTime = appointmentDate.clone().tz("Europe/Athens");
    console.log("Appointment Date (Athens Time):", athensTime.format());

    // Validate barber value
    if (!["Lemo", "Forou"].includes(barber)) {
      return res
        .status(400)
        .json({ message: "Barber must be either 'Lemo' or 'Forou'" });
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
      appointmentDateTime: appointmentDate.toDate(), // Save in UTC
      barber,
    });

    // Save the initial appointment
    const savedAppointment = await newAppointment.save();

    // Send SMS confirmation for the initial appointment
    try {
      const formattedLocalTime = athensTime.format("DD/MM/YYYY HH:mm"); // Local time format
      const message = `Επιβεβαιώνουμε το ραντεβού σας στο LEMO BARBER SHOP με τον ${barber} για τις ${formattedLocalTime}!`;

      await sendSMS(phoneNumber, message);
      console.log("Confirmation SMS sent successfully");
    } catch (smsError) {
      console.error("Failed to send confirmation SMS:", smsError.message);
    }

    // Generate additional appointments if recurrence is provided
    const additionalAppointments = [];
    if (recurrence === "weekly" && repeatWeeks) {
      let currentDate = appointmentDate.clone(); // Start from the initial date
      for (let i = 1; i <= repeatWeeks; i++) {
        currentDate.add(1, "week");

        // Create and save additional appointment
        const additionalAppointment = new Appointment({
          customerName,
          phoneNumber,
          appointmentDateTime: currentDate.toDate(),
          barber,
        });
        const savedAdditionalAppointment = await additionalAppointment.save();
        additionalAppointments.push(savedAdditionalAppointment);
      }
    } else if (recurrence === "monthly" && repeatMonths) {
      let currentDate = appointmentDate.clone(); // Start from the initial date
      for (let i = 1; i <= repeatMonths; i++) {
        currentDate.add(1, "month");

        // Create and save additional appointment
        const additionalAppointment = new Appointment({
          customerName,
          phoneNumber,
          appointmentDateTime: currentDate.toDate(),
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
        const message = `Θα θέλαμε να σας ενημερώσουμε ότι το ραντεβού σας για ${formattedDateTime} ακυρώνεται. Αν θέλετε να κανονίσουμε μια νέα συνάντηση, μη διστάσετε να επικοινωνήσετε μαζί μας. Ευχαριστούμε πολύ!`;

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
