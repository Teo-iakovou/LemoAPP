const express = require("express");
const router = express.Router();
const { getCustomerCounts } = require("../controllers/customerController");

router.get("/CustomerCounts", getCustomerCounts);

module.exports = router;
