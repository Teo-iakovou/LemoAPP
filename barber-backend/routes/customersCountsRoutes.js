const express = require("express");
const router = express.Router();
const {
  getCustomerCounts,
  getWeeklyCustomerCounts,
} = require("../controllers/customerController");

router.get("/CustomerCounts", getCustomerCounts);
router.get("/WeeklyCustomerCounts", getWeeklyCustomerCounts);

module.exports = router;
