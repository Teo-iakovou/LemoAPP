const express = require("express");
const router = express.Router();

const {
  getCustomers,
  deleteAllCustomers,
  deleteCustomer,
  updateCustomer,
  getCustomerCounts,
  getWeeklyCustomerCounts,
  getCustomerAppointments, // Add this if implementing
} = require("../controllers/customerController");

// Main customer data
router.get("/", getCustomers);
router.delete("/", deleteAllCustomers);
router.delete("/:id", deleteCustomer);
router.put("/:id", updateCustomer);

// Customer analytics/statistics
router.get("/CustomerCounts", getCustomerCounts);
router.get("/WeeklyCustomerCounts", getWeeklyCustomerCounts);

// Customer appointment history (new)
router.get("/:id/appointments", getCustomerAppointments);

module.exports = router;
