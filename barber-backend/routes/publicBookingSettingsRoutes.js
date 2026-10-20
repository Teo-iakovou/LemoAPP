const express = require("express");
const {
  getSettings,
  updateSettings,
  updateAnnouncement,
} = require("../controllers/publicBookingSettingsController");
const requirePublicUser = require("../middlewares/requirePublicUser");
const requirePublicRole = require("../middlewares/requirePublicRole");

const router = express.Router();

router.get("/", getSettings);
router.put("/", requirePublicUser, requirePublicRole(["barber", "admin"]), updateSettings);
router.put(
  "/announcement",
  requirePublicUser,
  requirePublicRole(["barber", "admin"]),
  updateAnnouncement
);

module.exports = router;
