const express = require("express");
const {
  signup,
  login,
  updateProfile,
  me,
  updateMe,
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
router.patch("/me", requireUser, updateMe);

// Update user profile (admin-only)
router.put("/update-profile", requireUser, updateProfile);

module.exports = router;
