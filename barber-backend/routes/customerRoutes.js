const express = require("express");
const router = express.Router();
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../utils/cloudinaryConfig");
const { sendBirthdaySMS } = require("../controllers/birthdaySms");
const { sendNewYearSMS } = require("../controllers/newYearSms");
const requireUser = require("../middlewares/requireUser");
const requireFullAdmin = require("../middlewares/requireFullAdmin");
const requireCalendarOrAdmin = require("../middlewares/requireCalendarOrAdmin");
const {
  getCustomers,
  getCustomersForLookup,
  deleteCustomer,
  updateCustomer,
  uploadProfilePicture,
  getCustomerCounts,
  getWeeklyCustomerCounts,
  getCustomerAppointments, // Add this if implementing
  getCustomerById,
  getAllCustomerAppointments,
  createCustomer,
} = require("../controllers/customerController");

// ---------------------------------------------------------------------------
// The ONLY customer route a limited 'calendar' user may reach.
//
// Registered ABOVE the admin gate below on purpose: Express runs middleware in
// registration order, so this route is matched before `router.use(...)` is ever
// applied, and everything declared after it stays admin-only by default. Opening
// a route therefore requires an explicit line up here — nothing can be exposed by
// forgetting to add a guard further down.
//
// Read-only, and role-dispatched: a 'calendar' user gets the reduced autocomplete
// projection, an admin keeps the full list the Customers page depends on.
// ---------------------------------------------------------------------------
router.get("/", requireUser, requireCalendarOrAdmin, (req, res, next) =>
  req.user.role === "admin"
    ? getCustomers(req, res, next)
    : getCustomersForLookup(req, res, next)
);

// Every other customer route is admin-only. The public booking site never calls
// /api/customers (booking creates customers implicitly via the upsert).
router.use(requireUser, requireFullAdmin);

// NOTE: the bulk "delete ALL customers" route was removed — unused by the admin UI
// and far too dangerous to expose. Restore behind an explicit confirm payload only
// if genuinely needed.

// Customer analytics/statistics

router.get("/CustomerCounts", getCustomerCounts);
router.get("/WeeklyCustomerCounts", getWeeklyCustomerCounts);
// Main customer data
// NOTE: GET "/" is declared above the admin gate (role-dispatched) — not here.
router.delete("/:id", deleteCustomer);
router.patch("/:id", updateCustomer);
router.post("/", createCustomer); 
router.put("/:id", updateCustomer);
router.get("/:id", getCustomerById);
router.get("/:id/all-appointments", getAllCustomerAppointments);




// Customer appointment history (new)
router.get("/:id/appointments", getCustomerAppointments);

// Set up Multer with Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "customer_avatars",
    allowed_formats: ["jpg", "jpeg", "png", "webp"], // Add "webp"!
    transformation: [{ width: 300, height: 300, crop: "limit" }],
  },
});

const upload = multer({ storage: storage });
// POST /customers/:id/profile-picture
router.post(
  "/:id/profile-picture",
  upload.single("profilePicture"),
  uploadProfilePicture
);

// Trigger birthday SMS for all customers with today's birthday
router.post("/send-birthday-sms", async (req, res) => {
  try {
    await sendBirthdaySMS();
    res.json({ success: true, message: "Birthday SMS script executed!" });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to run birthday SMS script",
      error: err.message,
    });
  }
});

// Trigger New Year SMS manually (force optional)
router.post("/send-newyear-sms", async (req, res) => {
  try {
    const force = Boolean(req.body?.force);
    const result = await sendNewYearSMS({ force });
    res.json({
      success: true,
      message: "New Year SMS script executed!",
      result,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to run New Year SMS script",
      error: err.message,
    });
  }
});

module.exports = router;
