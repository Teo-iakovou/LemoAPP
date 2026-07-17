const express = require("express");
const router = express.Router();
const waitingListController = require("../controllers/WaitingListController");
const requireUser = require("../middlewares/requireUser");
const requireFullAdmin = require("../middlewares/requireFullAdmin");

// PUBLIC: the booking site submits waiting-list requests here. Registered BEFORE
// the requireUser gate below so it stays open. Keep this first.
router.post("/public", waitingListController.addPublicRequest);

// Everything below is admin-only.
router.use(requireUser, requireFullAdmin);
router.get("/customers", waitingListController.getAllCustomers);
router.post("/", waitingListController.addToWaitingList);
router.get("/", waitingListController.getWaitingList);
router.delete("/:id", waitingListController.removeFromWaitingList);
router.patch("/:id/note", waitingListController.updateWaitingListNote);
module.exports = router;
