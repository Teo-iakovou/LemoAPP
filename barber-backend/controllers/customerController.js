const Customer = require("../models/customer");
const Appointment = require("../models/appointment");
const User = require("../models/user");
const moment = require("moment");
const jwt = require("jsonwebtoken");

const ALLOWED_COUNTS_USERNAMES = new Set(["lemo"]);

function parseDateOfBirthInput(rawValue) {
  if (rawValue === undefined) {
    return { ok: true, value: undefined };
  }

  if (rawValue === null || rawValue === "") {
    return { ok: true, value: null };
  }

  if (rawValue instanceof Date && !Number.isNaN(rawValue.getTime())) {
    return { ok: true, value: rawValue };
  }

  if (typeof rawValue === "string") {
    const value = rawValue.trim();
    const yyyyMmDd = moment(value, "YYYY-MM-DD", true);
    if (yyyyMmDd.isValid()) {
      return { ok: true, value: yyyyMmDd.startOf("day").toDate() };
    }

    const ddMmYyyy = moment(value, "DD/MM/YYYY", true);
    if (ddMmYyyy.isValid()) {
      return { ok: true, value: ddMmYyyy.startOf("day").toDate() };
    }
  }

  return {
    ok: false,
    error: "Invalid dateOfBirth format. Use YYYY-MM-DD or DD/MM/YYYY.",
  };
}

async function ensureCountsAccess(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ message: "Authorization header is required" });
    return null;
  }

  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (!decoded?.userId) {
    res.status(401).json({ message: "Invalid token" });
    return null;
  }

  const user = await User.findById(decoded.userId).select("username").lean();
  if (!user?.username) {
    res.status(401).json({ message: "User not found" });
    return null;
  }

  const username = String(user.username || "").trim().toLowerCase();
  if (!ALLOWED_COUNTS_USERNAMES.has(username)) {
    res.status(403).json({ message: "Access restricted for this page" });
    return null;
  }

  return user;
}


// Create (Add) a new customer
const createCustomer = async (req, res) => {
  try {
    const { name, phoneNumber, barber, dateOfBirth } = req.body;
    // Validate input
    if (!name || !phoneNumber) {
      return res.status(400).json({ error: "Name and phone number are required." });
    }

    const parsedDob = parseDateOfBirthInput(dateOfBirth);
    if (!parsedDob.ok) {
      return res.status(400).json({ error: parsedDob.error });
    }
   
    // Create new customer
    const customerPayload = { name, phoneNumber, barber };
    if (parsedDob.value !== undefined) {
      customerPayload.dateOfBirth = parsedDob.value;
    }

    const customer = new Customer(customerPayload);
    await customer.save();
    res.status(201).json(customer);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        error: "Customer with this phone number already exists.",
      });
    }
    console.error("Error creating customer:", error);
    res.status(500).json({ error: "Failed to create customer." });
  }
};

const getCustomerCounts = async (req, res, next) => {
  try {
    const accessUser = await ensureCountsAccess(req, res);
    if (!accessUser) return;

    // Fetch counts for the given month and year
    const { month, year } = req.query;

    const startOfMonth = moment()
      .year(year || moment().year())
      .month(month || moment().month())
      .startOf("month");
    const endOfMonth = startOfMonth.clone().endOf("month");

    const typeMatch = { $or: [
      { type: "appointment" },
      { type: { $exists: false } },
      { type: null }
    ] };

    const lemoCount = await Appointment.countDocuments({
      barber: "ΛΕΜΟ",
      appointmentDateTime: {
        $gte: startOfMonth.toDate(),
        $lte: endOfMonth.toDate(),
      },
      ...typeMatch,
    });

    const forouCount = await Appointment.countDocuments({
      barber: "ΦΟΡΟΥ",
      appointmentDateTime: {
        $gte: startOfMonth.toDate(),
        $lte: endOfMonth.toDate(),
      },
      ...typeMatch,
    });

    const koushisCount = await Appointment.countDocuments({
      barber: "ΚΟΥΣΙΗΣ",
      appointmentDateTime: {
        $gte: startOfMonth.toDate(),
        $lte: endOfMonth.toDate(),
      },
      ...typeMatch,
    });

    res.status(200).json({
      success: true,
      counts: {
        ΛΕΜΟ: lemoCount,
        ΦΟΡΟΥ: forouCount,
        ΚΟΥΣΙΗΣ: koushisCount,
      },
    });
  } catch (error) {
    console.error("Error fetching customer counts:", error);
    next(error);
  }
};

const getWeeklyCustomerCounts = async (req, res, next) => {
  try {
    const accessUser = await ensureCountsAccess(req, res);
    if (!accessUser) return;

    const { year, week } = req.query;

    const startOfWeek = moment()
      .year(year || moment().year())
      .week(week || moment().week())
      .startOf("week");
    const endOfWeek = startOfWeek.clone().endOf("week");

    const weeklyTypeMatch = { $or: [
      { type: "appointment" },
      { type: { $exists: false } },
      { type: null }
    ] };

    const lemoWeeklyCount = await Appointment.countDocuments({
      barber: "ΛΕΜΟ",
      appointmentDateTime: {
        $gte: startOfWeek.toDate(),
        $lte: endOfWeek.toDate(),
      },
      ...weeklyTypeMatch,
    });

    const forouWeeklyCount = await Appointment.countDocuments({
      barber: "ΦΟΡΟΥ",
      appointmentDateTime: {
        $gte: startOfWeek.toDate(),
        $lte: endOfWeek.toDate(),
      },
      ...weeklyTypeMatch,
    });

    const koushisWeeklyCount = await Appointment.countDocuments({
      barber: "ΚΟΥΣΙΗΣ",
      appointmentDateTime: {
        $gte: startOfWeek.toDate(),
        $lte: endOfWeek.toDate(),
      },
      ...weeklyTypeMatch,
    });

    res.status(200).json({
      success: true,
      weeklyCounts: {
        ΛΕΜΟ: lemoWeeklyCount,
        ΦΟΡΟΥ: forouWeeklyCount,
        ΚΟΥΣΙΗΣ: koushisWeeklyCount,
      },
    });
  } catch (error) {
    console.error("Error fetching weekly customer counts:", error);
    next(error);
  }
};

// Get a single customer by ID
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found." });
    }
    res.json(customer);
  } catch (error) {
    console.error("Error fetching customer by ID:", error);
    res.status(500).json({ message: "Failed to fetch customer." });
  }
};

// Get all customers
const getCustomers = async (req, res, next) => {
  try {
    // 1. Get all latest appointments by phoneNumber
    const latestAppointments = await Appointment.aggregate([
      { $match: { type: "appointment" } }, // Only normal appointments
      { $sort: { appointmentDateTime: -1 } },
      {
        $group: {
          _id: "$phoneNumber",
          customerName: { $first: "$customerName" },
          barber: { $first: "$barber" },
          appointmentDateTime: { $first: "$appointmentDateTime" },
        },
      },
    ]);

    // 2. Map by phone number for easy lookup
    const latestBarberByPhone = {};
    latestAppointments.forEach((a) => {
      latestBarberByPhone[a._id] = {
        barber: a.barber,
        appointmentDateTime: a.appointmentDateTime,
      };
    });

    // 3. Fetch all customers as before
    const customers = await Customer.find().sort({ name: 1 }).lean();

    // 4. Merge barber info in one pass (no per-customer query)
    const barberColors = {
      ΛΕΜΟ: "text-purple-600",
      ΦΟΡΟΥ: "text-orange-500",
      ΚΟΥΣΙΗΣ: "text-emerald-500",
    };

    const customersWithBarber = customers.map((customer) => {
      const latest = latestBarberByPhone[customer.phoneNumber] || {};
      const barber = latest.barber || customer.barber;
      const color = barber ? barberColors[barber] : "text-white";
      return {
        ...customer,
        barber,
        barberColor: color,
        lastAppointment: latest.appointmentDateTime,
      };
    });

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
  const { id } = req.params;
  const { name, phoneNumber, barber, profilePicture, dateOfBirth } = req.body;

  try {
    // Validate input
    if (!name || !phoneNumber) {
      return res
        .status(400)
        .json({ error: "Name and phone number are required." });
    }
    if (barber && !["ΛΕΜΟ", "ΦΟΡΟΥ", "ΚΟΥΣΙΗΣ"].includes(barber)) {
      return res
        .status(400)
        .json({ error: "Invalid barber value. Must be 'ΛΕΜΟ', 'ΦΟΡΟΥ', or 'ΚΟΥΣΙΗΣ'." });
    }

    const parsedDob = parseDateOfBirthInput(dateOfBirth);
    if (!parsedDob.ok) {
      return res.status(400).json({ error: parsedDob.error });
    }

    // Build update object dynamically
    const updateFields = { name, phoneNumber, barber };
    if (profilePicture !== undefined)
      updateFields.profilePicture = profilePicture;
    if (parsedDob.value !== undefined) updateFields.dateOfBirth = parsedDob.value;

    const updatedCustomer = await Customer.findByIdAndUpdate(id, updateFields, {
      new: true,
      runValidators: true,
    });

    if (!updatedCustomer) {
      return res.status(404).json({ error: "Customer not found." });
    }

    res.status(200).json(updatedCustomer);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        error: "Customer with this phone number already exists.",
      });
    }
    console.error("Error updating customer:", error);
    res.status(500).json({ error: "Failed to update customer." });
  }
};

const getCustomerAppointments = async (req, res) => {
  const { id } = req.params;
  const { month, year } = req.query;

  const customer = await Customer.findById(id);
  if (!customer) {
    return res.status(404).json({ error: "Customer not found." });
  }

  // Build query for appointments of this customer, exclude breaks
  const query = {
    phoneNumber: customer.phoneNumber,
    type: "appointment",
  };

  if (month && year) {
    const start = new Date(year, month, 1);
    const end = new Date(year, parseInt(month) + 1, 0, 23, 59, 59, 999);
    query.appointmentDateTime = { $gte: start, $lte: end };
  }

  const appointments = await Appointment.find(query).sort({
    appointmentDateTime: -1,
  });
  // Return only the info you want
  res.json(
    appointments.map((a) => ({
      customerName: a.customerName,
      appointmentDateTime: a.appointmentDateTime,
      barber: a.barber,
    }))
  );
};

const uploadProfilePicture = async (req, res) => {
  try {
    console.log("req.file:", req.file); // <--- What does this show now?
    console.log("req.params.id:", req.params.id);

    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const imageUrl = req.file.path;
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { profilePicture: imageUrl },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ error: "Customer not found." });
    }

    res.status(200).json(customer);
  } catch (error) {
    console.error("❌ FULL ERROR:", error); // <--- ADD THIS
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// Fetch ALL appointment history for a customer
const getAllCustomerAppointments = async (req, res) => {
  try {
    const { id } = req.params;

    // Find customer
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found." });
    }

    // Fetch all appointments for this customer's phone number (excluding breaks)
    const appointments = await Appointment.find({
      phoneNumber: customer.phoneNumber,
      // Remove type: "appointment" filter for a moment to debug
    }).sort({ appointmentDateTime: -1 });

    // Optionally: print the earliest date
    if (appointments.length) {
      console.log(
        "Earliest date:",
        appointments[appointments.length - 1].appointmentDateTime
      );
    }

    res.status(200).json(
      appointments.map((a) => ({
        customerName: a.customerName,
        appointmentDateTime: a.appointmentDateTime,
        barber: a.barber,
      }))
    );
  } catch (error) {
    console.error("Error fetching all appointment history:", error);
    res.status(500).json({ error: "Failed to fetch appointment history." });
  }
};

module.exports = {
  getCustomers,
  deleteAllCustomers,
  deleteCustomer,
  updateCustomer,
  getCustomerCounts,
  getWeeklyCustomerCounts,
  getCustomerAppointments,
  getCustomerById,
  uploadProfilePicture,
  getAllCustomerAppointments,
  createCustomer,
};
