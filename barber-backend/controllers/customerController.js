const Customer = require("../models/customer");

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

module.exports = {
  getCustomers,
  deleteAllCustomers,
  deleteCustomer,
};
