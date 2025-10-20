"use strict";

const express = require("express");
const {
  listAutoCustomers,
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

const router = express.Router();

router.get("/", listAutoCustomers);
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
