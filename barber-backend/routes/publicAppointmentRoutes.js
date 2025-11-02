const express = require("express");
const { getAppointmentsForPublicUser } = require("../controllers/publicAppointmentController");
const requirePublicUser = require("../middlewares/requirePublicUser");

const router = express.Router();

router.get("/mine", requirePublicUser, getAppointmentsForPublicUser);

module.exports = router;
