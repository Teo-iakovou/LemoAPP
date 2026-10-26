const express = require("express");
const requireUser = require("../middlewares/requireUser");
const requireCalendarOrAdmin = require("../middlewares/requireCalendarOrAdmin");
const {
  listCancellations,
  markCancellationsSeen,
} = require("../controllers/cancellationController");

const router = express.Router();

router.get("/", requireUser, requireCalendarOrAdmin, listCancellations);
router.post("/seen", requireUser, requireCalendarOrAdmin, markCancellationsSeen);

module.exports = router;
