const express = require("express");
const {
  signup,
  login,
  updateProfile,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

const router = express.Router();

// User signup
router.post("/signup", signup);

// User login
router.post("/signin", login);

// Update user profile
router.put("/update-profile", updateProfile);

// Forgot password
router.post("/forgot-password", forgotPassword);

// Reset password
router.post("/reset-password", resetPassword);

module.exports = router;
