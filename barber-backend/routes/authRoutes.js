const express = require("express");
const {
  signup,
  login,
  updateProfile,
  me,
} = require("../controllers/authController");
const requireUser = require("../middlewares/requireUser");

const router = express.Router();

// User signup
router.post("/signup", signup);

// User login
router.post("/signin", login);
router.post("/login", login);

// Current user
router.get("/me", requireUser, me);

// Update user profile
router.put("/update-profile", updateProfile);

module.exports = router;
