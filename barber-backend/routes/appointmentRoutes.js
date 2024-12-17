const express = require("express");
const {
  createAppointment,
  getAppointments,
  updateAppointment,
  deleteAppointment,
} = require("../controllers/appointmentController");
const validatePassword = require("../middlewares/validatePassword");

const router = express.Router();

router.post("/", createAppointment);
router.get("/", getAppointments);
router.put("/:id", validatePassword, updateAppointment);
router.delete("/:id", validatePassword, deleteAppointment);

module.exports = router;
