"use strict";

const express = require("express");
const {
  listAutoCustomers,
  getLastAutoCustomerAppointments,
  createAutoCustomer,
  updateAutoCustomer,
  deleteAutoCustomer,
  pushAutoCustomers,
  listGenerationBatches,
  getGenerationBatch,
  undoGenerationBatch,
  overrideAutoCustomerOccurrence,
  skipAutoCustomerOccurrence,
} = require("../controllers/autoCustomerController");
const requireUser = require("../middlewares/requireUser");
const requireFullAdmin = require("../middlewares/requireFullAdmin");

const router = express.Router();

// Auto-customers are an admin-only feature; the public site never touches them.
router.use(requireUser, requireFullAdmin);

router.get("/", listAutoCustomers);
router.get("/last-appointments", getLastAutoCustomerAppointments);
router.post("/", createAutoCustomer);
router.post("/push", pushAutoCustomers);
router.put("/:id", updateAutoCustomer);
router.post("/:id/occurrences/override", overrideAutoCustomerOccurrence);
router.post("/:id/occurrences/skip", skipAutoCustomerOccurrence);
router.delete("/:id", deleteAutoCustomer);
router.get("/batches", listGenerationBatches);
router.get("/batches/:batchId", getGenerationBatch);
router.post("/batches/:batchId/undo", undoGenerationBatch);

module.exports = router;
