const express = require("express");
const { getCustomers } = require("../controllers/appointmentController");

const router = express.Router();

router.get("/", getCustomers);

module.exports = router;
