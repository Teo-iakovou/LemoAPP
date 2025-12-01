const WaitingList = require("../models/WaitingList");
const Customer = require("../models/customer");

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function normalizeBarber(input = "") {
  const value = (input || "").toString().toLowerCase();
  if (value === "lemo" || value === "λεμο") return "ΛΕΜΟ";
  if (value === "forou" || value === "φορου") return "ΦΟΡΟΥ";
  return input || "";
}

function normalizePhone(phone = "") {
  return phone.replace(/[^\d+]/g, "");
}

function normalizeTimeValue(value = "") {
  const trimmed = (value || "").trim();
  if (!trimmed) return null;
  if (!HHMM_RE.test(trimmed)) return null;
  return trimmed;
}

function normalizeTimeList(timesInput = [], fallback = "") {
  const base = Array.isArray(timesInput) ? timesInput : [];
  const normalized = [];
  for (const raw of base) {
    const value = normalizeTimeValue(raw);
    if (value) normalized.push(value);
  }
  const fallbackValue = normalizeTimeValue(fallback);
  if (fallbackValue) normalized.push(fallbackValue);
  return Array.from(new Set(normalized));
}

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

    const newEntry = new WaitingList({
      customerId,
      customerName: customerExists.name,
      phoneNumber: customerExists.phoneNumber,
      barber: customerExists.barber || "",
      source: "internal",
    });
    await newEntry.save();

    const populatedEntry = await newEntry.populate("customerId");

    res.status(201).json(populatedEntry);
  } catch (error) {
    console.error("Error adding to waiting list:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.addPublicRequest = async (req, res) => {
  try {
    const {
      name,
      phoneNumber,
      preferredDate,
      preferredTime,
      preferredTimes,
      serviceId,
      barberId,
    } = req.body || {};

    const cleanName = (name || "").trim();
    const normalizedPhone = normalizePhone(phoneNumber || "");
    const trimmedDate = (preferredDate || "").trim();
    const trimmedTime = (preferredTime || "").trim();
    const normalizedTimes = normalizeTimeList(preferredTimes, trimmedTime);

    if (!cleanName || !normalizedPhone || !trimmedDate || !normalizedTimes.length) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const barber = normalizeBarber(barberId);

    let customer = await Customer.findOne({ phoneNumber: normalizedPhone });
    if (!customer) {
      customer = await Customer.create({
        name: cleanName,
        phoneNumber: normalizedPhone,
        barber: barber || null,
      });
    }

    const entry = new WaitingList({
      customerId: customer?._id,
      customerName: cleanName,
      phoneNumber: normalizedPhone,
      preferredDate: trimmedDate,
      preferredTime: normalizedTimes[0] || "",
      preferredTimes: normalizedTimes,
      serviceId: serviceId || "",
      barber,
      source: "public",
    });

    await entry.save();
    const populated = await entry.populate("customerId");
    res.status(201).json(populated);
  } catch (error) {
    console.error("Error adding public wait request:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get all waiting list customers (sorted by oldest first)
exports.getWaitingList = async (req, res) => {
  try {
    const waitingList = await WaitingList.find()
      .populate("customerId")
      .sort({ addedAt: 1 });
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
