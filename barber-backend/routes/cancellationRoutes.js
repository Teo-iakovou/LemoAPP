const express = require("express");
const requireUser = require("../middlewares/requireUser");
const requireOwner = require("../middlewares/requireOwner");
const {
  listCancellations,
  markCancellationsSeen,
} = require("../controllers/cancellationController");

const router = express.Router();

// Owner-only, like the Customer Counts page.
router.get("/", requireUser, requireOwner, listCancellations);
router.post("/seen", requireUser, requireOwner, markCancellationsSeen);

module.exports = router;
