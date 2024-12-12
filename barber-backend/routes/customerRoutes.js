const express = require("express");
const {
  getCustomers,
  deleteAllCustomers,
  deleteCustomer,
} = require("../controllers/customerController");

const router = express.Router();

router.get("/", getCustomers);
router.delete("/", deleteAllCustomers);
router.delete("/:id", deleteCustomer);

module.exports = router;
