const express = require("express");
const {
  signup,
  login,
  updateProfile,
  me,
  updateMe,
} = require("../controllers/authController");
const requireUser = require("../middlewares/requireUser");
const requireFullAdmin = require("../middlewares/requireFullAdmin");

const router = express.Router();

// Account creation is admin-only: only an existing full admin may provision
// accounts. (Previously this route was public — anyone could self-register a
// full-admin account.)
router.post("/signup", requireUser, requireFullAdmin, signup);

// User login
router.post("/signin", login);
router.post("/login", login);

// Current user
router.get("/me", requireUser, me);
router.patch("/me", requireUser, updateMe);

// Update user profile (admin-only)
router.put("/update-profile", requireUser, updateProfile);

module.exports = router;
