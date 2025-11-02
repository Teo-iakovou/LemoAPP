const express = require("express");
const {
  getAppointmentsForPublicUser,
  cancelUpcomingAppointment,
} = require("../controllers/publicAppointmentController");
const requirePublicUser = require("../middlewares/requirePublicUser");

const router = express.Router();

router.get("/mine", requirePublicUser, getAppointmentsForPublicUser);
router.delete("/mine/:id", requirePublicUser, cancelUpcomingAppointment);

module.exports = router;
