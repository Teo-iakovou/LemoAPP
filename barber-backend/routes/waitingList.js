const express = require("express");
const router = express.Router();
const waitingListController = require("../controllers/WaitingListController");

// Define Routes
router.get("/customers", waitingListController.getAllCustomers);
router.post("/", waitingListController.addToWaitingList);
router.get("/", waitingListController.getWaitingList);
router.delete("/:id", waitingListController.removeFromWaitingList);
router.patch("/:id/note", waitingListController.updateWaitingListNote);
module.exports = router;
