const express = require("express");
const router = express.Router();
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../utils/cloudinaryConfig");
console.log("Cloudinary config:", cloudinary.config());
const { sendBirthdaySMS } = require("../controllers/birthdaySms");
const { sendChristmasSMS } = require("../controllers/christmasSms");
const {
  getCustomers,
  deleteAllCustomers,
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

// Customer analytics/statistics

router.get("/CustomerCounts", getCustomerCounts);
router.get("/WeeklyCustomerCounts", getWeeklyCustomerCounts);
// Main customer data
router.get("/", getCustomers);
router.delete("/", deleteAllCustomers);
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
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to run birthday SMS script",
        error: err.message,
      });
  }
});

// Trigger Christmas SMS broadcast (defaults to running only on 25/12)
router.post("/send-christmas-sms", async (req, res) => {
  try {
    const force = Boolean(req.body?.force);
    const result = await sendChristmasSMS({ force });
    res.json({
      success: true,
      message: "Christmas SMS script executed!",
      result,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to run Christmas SMS script",
      error: err.message,
    });
  }
});

module.exports = router;
