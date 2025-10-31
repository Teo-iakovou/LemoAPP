const express = require("express");
const {
  createAppointment,
  getAppointments,
  updateAppointment,
  deleteAppointment,
  getPastAppointments,
  getUpcomingAppointments,
  getMyAppointments,
} = require("../controllers/appointmentController");
const requireUser = require("../middlewares/requireUser");
// const validatePassword = require("../middlewares/validatePassword");

const router = express.Router();

router.post("/", createAppointment);
router.get("/", getAppointments);
router.put("/:id", updateAppointment); //, validatePassword it used to be here
router.delete("/:id", deleteAppointment); //, validatePassword it used to be here
router.get("/upcoming", getUpcomingAppointments);
router.get("/past", getPastAppointments);
router.get("/mine", requireUser, getMyAppointments);
module.exports = router;
