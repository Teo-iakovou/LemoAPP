const Customer = require("../models/customer");
const Appointment = require("../models/appointment");
const moment = require("moment");
const jwt = require("jsonwebtoken");
const getCustomerCounts = async (req, res, next) => {
  try {
    // Validate JWT token and extract user ID
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res
        .status(401)
        .json({ message: "Authorization header is required" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Restrict access to a specific user (e.g., user with _id: 676581f2a97ae0e3cf8375e7)
    if (decoded.userId !== "676581f2a97ae0e3cf8375e7") {
      return res
        .status(403)
        .json({ message: "Access restricted to authorized user only" });
    }

    // Fetch counts for the given month and year
    const { month, year } = req.query;

    const startOfMonth = moment()
      .year(year || moment().year())
      .month(month || moment().month())
      .startOf("month");
    const endOfMonth = startOfMonth.clone().endOf("month");

    const lemoCount = await Appointment.countDocuments({
      barber: "ΛΕΜΟ",
      appointmentDateTime: {
        $gte: startOfMonth.toDate(),
        $lte: endOfMonth.toDate(),
      },
    });

    const forouCount = await Appointment.countDocuments({
      barber: "ΦΟΡΟΥ",
      appointmentDateTime: {
        $gte: startOfMonth.toDate(),
        $lte: endOfMonth.toDate(),
      },
    });

    res.status(200).json({
      success: true,
      counts: {
        ΛΕΜΟ: lemoCount,
        ΦΟΡΟΥ: forouCount,
      },
    });
  } catch (error) {
    console.error("Error fetching customer counts:", error);
    next(error);
  }
};
const getWeeklyCustomerCounts = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res
        .status(401)
        .json({ message: "Authorization header is required" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userId !== "676581f2a97ae0e3cf8375e7") {
      return res
        .status(403)
        .json({ message: "Access restricted to authorized user only" });
    }

    const { year, week } = req.query;

    const startOfWeek = moment()
      .year(year || moment().year())
      .week(week || moment().week())
      .startOf("week");
    const endOfWeek = startOfWeek.clone().endOf("week");

    const lemoWeeklyCount = await Appointment.countDocuments({
      barber: "ΛΕΜΟ",
      appointmentDateTime: {
        $gte: startOfWeek.toDate(),
        $lte: endOfWeek.toDate(),
      },
    });

    const forouWeeklyCount = await Appointment.countDocuments({
      barber: "ΦΟΡΟΥ",
      appointmentDateTime: {
        $gte: startOfWeek.toDate(),
        $lte: endOfWeek.toDate(),
      },
    });

    res.status(200).json({
      success: true,
      weeklyCounts: {
        ΛΕΜΟ: lemoWeeklyCount,
        ΦΟΡΟΥ: forouWeeklyCount,
      },
    });
  } catch (error) {
    console.error("Error fetching weekly customer counts:", error);
    next(error);
  }
};

// Get all customers
const getCustomers = async (req, res, next) => {
  try {
    // Define barber colors
    const barberColors = {
      ΛΕΜΟ: "text-purple-600",
      ΦΟΡΟΥ: "text-orange-500",
    };

    // Fetch all customers
    const customers = await Customer.find().sort({ name: 1 }).lean();

    // Fetch the latest barber information for each customer and calculate color
    const customersWithBarber = await Promise.all(
      customers.map(async (customer) => {
        // Get the most recent appointment for this customer
        const latestAppointment = await Appointment.findOne({
          phoneNumber: customer.phoneNumber,
        })
          .sort({ appointmentDateTime: -1 }) // Sort by appointment date in descending order
          .lean();

        // Determine the barber and color
        const barber = latestAppointment
          ? latestAppointment.barber
          : customer.barber;
        const color = barber ? barberColors[barber] : "text-white"; // Default to white if no barber

        return {
          ...customer,
          barber, // Use the barber from the latest appointment if available
          barberColor: color, // Include the dynamically calculated color
        };
      })
    );

    // Respond with customers and their associated barber and color information
    res.status(200).json(customersWithBarber);
  } catch (error) {
    console.error("Error fetching customers with barber info:", error);
    next(error);
  }
};

// Delete all customers
const deleteAllCustomers = async (req, res, next) => {
  try {
    await Customer.deleteMany();
    res
      .status(200)
      .json({ message: "All customers have been deleted successfully." });
  } catch (error) {
    next(error);
  }
};

const deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Customer ID is required" });
    }

    const customer = await Customer.findByIdAndDelete(id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.status(200).json({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting customer" });
  }
};
// Controller to update a customer
const updateCustomer = async (req, res) => {
  const { id } = req.params; // Extract customer ID from URL
  const { name, phoneNumber, barber } = req.body; // Extract fields from request body

  try {
    // Validate input
    if (!name || !phoneNumber) {
      return res
        .status(400)
        .json({ error: "Name and phone number are required." });
    }

    // Validate barber field if provided
    if (barber && !["ΛΕΜΟ", "ΦΟΡΟΥ"].includes(barber)) {
      return res
        .status(400)
        .json({ error: "Invalid barber value. Must be 'ΛΕΜΟ' or 'ΦΟΡΟΥ'." });
    }

    // Define barber colors
    const barberColors = {
      ΛΕΜΟ: "#7C3AED", // Purple for ΛΕΜΟ
      ΦΟΡΟΥ: "orange", // Orange for ΦΟΡΟΥ
    };

    // Assign color dynamically based on barber
    const color = barber ? barberColors[barber] || "#ffffff" : "#ffffff";

    // Find and update the customer, including the color
    const updatedCustomer = await Customer.findByIdAndUpdate(
      id,
      { name, phoneNumber, barber, color }, // Include color in the update
      { new: true, runValidators: true } // Return updated document and run validation
    );

    if (!updatedCustomer) {
      return res.status(404).json({ error: "Customer not found." });
    }

    res.status(200).json(updatedCustomer); // Send updated customer back to client
  } catch (error) {
    console.error("Error updating customer:", error);
    res.status(500).json({ error: "Failed to update customer." });
  }
};

module.exports = {
  getCustomers,
  deleteAllCustomers,
  deleteCustomer,
  updateCustomer,
  getCustomerCounts,
  getWeeklyCustomerCounts,
};
