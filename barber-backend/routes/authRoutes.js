const express = require("express");
const {
  signup,
  login,
  updateProfile,
} = require("../controllers/authController");

const router = express.Router();

// User signup
router.post("/signup", signup);

// User login
router.post("/signin", login);

// Update user profile
router.put("/update-profile", updateProfile);

module.exports = router;
