#!/usr/bin/env node
"use strict";

const mongoose = require("mongoose");
const connectDB = require("../utils/db");
const PublicUser = require("../models/publicUser");
const { buildPhoneLookupVariants } = require("../utils/customerSync");

const phoneArg = process.argv.find((arg) => arg.startsWith("--phone="));
const roleArg = process.argv.find((arg) => arg.startsWith("--role="));
const allowCreate = process.argv.includes("--allow-create");

const phoneInput = phoneArg ? phoneArg.split("=")[1] : "97869631";
const role = roleArg ? roleArg.split("=")[1] : "barber";

async function run() {
  if (!["customer", "barber", "admin"].includes(role)) {
    throw new Error("Invalid role. Use customer|barber|admin");
  }

  const { normalized, variants } = buildPhoneLookupVariants(phoneInput);
  if (!normalized) {
    throw new Error("Invalid --phone value");
  }

  await connectDB();
  console.log("✅ Connected to MongoDB");

  const query = variants.length ? { $or: variants } : { phoneNumber: normalized };
  let user = await PublicUser.findOne(query);

  if (!user) {
    if (!allowCreate) {
      console.log(`⚠️ No PublicUser found for phone ${phoneInput}. Use --allow-create to create one.`);
      return;
    }
    user = await PublicUser.create({
      username: `user_${normalized}`,
      displayName: "Teo",
      phoneNumber: normalized,
      password: Math.random().toString(36).slice(2) + "!A9",
      role,
    });
    console.log("🆕 User created:", {
      id: String(user._id),
      username: user.username,
      phoneNumber: user.phoneNumber,
      role: user.role,
    });
    return;
  }

  const before = user.role || "customer";
  if (before === role) {
    console.log("ℹ️ No change needed:", {
      id: String(user._id),
      username: user.username,
      phoneNumber: user.phoneNumber,
      role: user.role,
    });
    return;
  }

  user.role = role;
  await user.save();
  console.log("✅ Updated role:", {
    id: String(user._id),
    username: user.username,
    phoneNumber: user.phoneNumber,
    before,
    after: user.role,
  });
}

run()
  .catch((err) => {
    console.error("❌ Script failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.connection.close();
    } catch {
      // ignore
    }
  });

