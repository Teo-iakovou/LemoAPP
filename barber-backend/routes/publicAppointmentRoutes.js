const express = require("express");
const {
  getAppointmentsForPublicUser,
  cancelUpcomingAppointment,
  rescheduleAppointment,
} = require("../controllers/publicAppointmentController");
const requirePublicUser = require("../middlewares/requirePublicUser");

const router = express.Router();

router.get("/mine", requirePublicUser, getAppointmentsForPublicUser);
router.delete("/mine/:id", requirePublicUser, cancelUpcomingAppointment);
router.put("/mine/:id", requirePublicUser, rescheduleAppointment);

module.exports = router;
