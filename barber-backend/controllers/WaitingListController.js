const WaitingList = require("../models/WaitingList");
const Customer = require("../models/customer");

exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ name: 1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: "Error fetching customers" });
  }
};

// Add a customer to the waiting list
exports.addToWaitingList = async (req, res) => {
  console.log("Request body:", req.body); // Debug request data
  try {
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: "Customer ID is required." });
    }

    const customerExists = await Customer.findById(customerId);
    if (!customerExists) {
      return res.status(404).json({ error: "Customer not found." });
    }

    const newEntry = new WaitingList({ customerId });
    await newEntry.save();

    // Populate the customerId field with full customer details
    const populatedEntry = await newEntry.populate("customerId");

    res.status(201).json(populatedEntry);
  } catch (error) {
    console.error("Error adding to waiting list:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get all waiting list customers (sorted by oldest first)
exports.getWaitingList = async (req, res) => {
  try {
    const waitingList = await WaitingList.find().populate("customerId");
    res.json(waitingList);
  } catch (error) {
    res.status(500).json({ error: "Error fetching waiting list" });
  }
};

// Remove a customer from the waiting list (manual deletion)
exports.removeFromWaitingList = async (req, res) => {
  try {
    await WaitingList.findByIdAndDelete(req.params.id);
    res.json({ message: "Removed from waiting list" });
  } catch (error) {
    res.status(500).json({ error: "Error removing from waiting list" });
  }
};
// Update the note for a specific waiting list entry
exports.updateWaitingListNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const updatedEntry = await WaitingList.findByIdAndUpdate(
      id,
      { note },
      { new: true }
    );

    if (!updatedEntry) {
      return res.status(404).json({ error: "Waiting list entry not found" });
    }

    res.json(updatedEntry);
  } catch (error) {
    res.status(500).json({ error: "Failed to update note" });
  }
};
