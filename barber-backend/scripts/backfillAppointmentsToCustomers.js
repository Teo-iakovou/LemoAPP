#!/usr/bin/env node
"use strict";

const mongoose = require("mongoose");
const connectDB = require("../utils/db");
const Appointment = require("../models/appointment");
const Customer = require("../models/customer");
const {
  buildPhoneLookupVariants,
  normalizePhone,
  upsertCustomerFromIdentity,
} = require("../utils/customerSync");

const DRY_RUN = !process.argv.includes("--apply");

async function findExistingCustomerByPhone(phoneInput) {
  const { normalized, variants } = buildPhoneLookupVariants(phoneInput);
  if (variants.length) {
    const byVariants = await Customer.findOne({ $or: variants });
    if (byVariants) return byVariants;
  }
  if (normalized) {
    return Customer.findOne({ phoneNumber: normalized });
  }
  return null;
}

function shouldSkipAppointment(appointment) {
  const name = String(appointment.customerName || "").trim();
  const phone = String(appointment.phoneNumber || "").trim();
  return !name || !phone;
}

async function run() {
  await connectDB();
  console.log("✅ Connected to MongoDB");

  const appointments = await Appointment.find(
    {
      $or: [
        { type: "appointment" },
        { type: { $exists: false } },
        { type: null },
      ],
    },
    {
      customerName: 1,
      phoneNumber: 1,
      barber: 1,
      type: 1,
    }
  ).lean();

  const stats = {
    scannedAppointments: appointments.length,
    customersAlreadyExisting: 0,
    customersCreated: 0,
    customersUpdated: 0,
    skippedInvalidRecords: 0,
    failed: 0,
    dryRun: DRY_RUN,
  };

  for (const appointment of appointments) {
    try {
      if (shouldSkipAppointment(appointment)) {
        stats.skippedInvalidRecords += 1;
        continue;
      }

      const name = String(appointment.customerName || "").trim();
      const phone = normalizePhone(String(appointment.phoneNumber || "").trim());
      const barber = appointment.barber || undefined;

      const existing = await findExistingCustomerByPhone(phone);
      if (DRY_RUN) {
        if (!existing) {
          stats.customersCreated += 1;
          continue;
        }

        const wouldUpdateName = !existing.name && !!name;
        const wouldUpdateBarber = !!barber && existing.barber !== barber;
        if (wouldUpdateName || wouldUpdateBarber) {
          stats.customersUpdated += 1;
        } else {
          stats.customersAlreadyExisting += 1;
        }
        continue;
      }

      const result = await upsertCustomerFromIdentity({
        name,
        phoneNumber: phone,
        barber,
      });

      if (result?.status === "created") {
        stats.customersCreated += 1;
      } else if (result?.status === "updated") {
        stats.customersUpdated += 1;
      } else {
        stats.customersAlreadyExisting += 1;
      }
    } catch (error) {
      stats.failed += 1;
      console.error("❌ Backfill item failed:", error.message);
    }
  }

  console.log("🎉 Backfill complete:", stats);
}

run()
  .catch((error) => {
    console.error("❌ Backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.connection.close();
    } catch {
      // ignore close errors
    }
  });
