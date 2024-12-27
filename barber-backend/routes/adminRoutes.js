const express = require("express");
const router = express.Router();
const { updatePassword } = require("../controllers/adminController"); // Import your controller
const validateAdmin = require("../middlewares/validatePassword"); // Middleware for admin validation (if needed)

// Route for updating the admin password
router.put("/update-password", validateAdmin, updatePassword);

module.exports = router;
