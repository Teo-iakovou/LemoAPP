const express = require("express");
const {
  getCustomers,
  deleteAllCustomers,
} = require("../controllers/appointmentController");

const router = express.Router();

router.get("/", getCustomers);
router.delete("/", deleteAllCustomers);

module.exports = router;
