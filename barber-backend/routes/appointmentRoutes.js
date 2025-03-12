const express = require("express");
const {
  createAppointment,
  getAppointments,
  updateAppointment,
  deleteAppointment,
} = require("../controllers/appointmentController");
// const validatePassword = require("../middlewares/validatePassword");

const router = express.Router();

router.post("/", createAppointment);
router.get("/", getAppointments);
router.put("/:id", updateAppointment); //, validatePassword it used to be here
router.delete("/:id", deleteAppointment); //, validatePassword it used to be here

module.exports = router;
