const express = require("express");
const {
  getCustomers,
  deleteAllCustomers,
  deleteCustomer,
  updateCustomer,
} = require("../controllers/customerController");

const router = express.Router();

router.get("/", getCustomers);
router.delete("/", deleteAllCustomers);
router.delete("/:id", deleteCustomer);
router.put("/:id", updateCustomer);

module.exports = router;
