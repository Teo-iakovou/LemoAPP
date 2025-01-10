const Customer = require("../models/customer");
const Appointment = require("../models/appointment");
const moment = require("moment");
const getCustomerCounts = async (req, res, next) => {
  try {
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
// Get all customers
const getCustomers = async (req, res, next) => {
  try {
    const customers = await Customer.find().sort({ name: 1 });
    res.status(200).json(customers);
  } catch (error) {
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
  const { name, phoneNumber } = req.body; // Extract fields from request body

  try {
    // Validate input (optional)
    if (!name || !phoneNumber) {
      return res
        .status(400)
        .json({ error: "Name and phone number are required." });
    }

    // Find and update the customer
    const updatedCustomer = await Customer.findByIdAndUpdate(
      id,
      { name, phoneNumber },
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
};
