"use strict";

const Customer = require("../models/customer");

function normalizePhone(input = "") {
  try {
    return String(input)
      .trim()
      .replace(/\s+/g, "")
      .replace(/^00/, "+");
  } catch {
    return String(input || "");
  }
}

function normalizePhoneDigits(input = "") {
  try {
    return String(input).replace(/\D+/g, "");
  } catch {
    return "";
  }
}

function escapeForRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildPhoneLookupVariants(rawInput = "") {
  const normalized = normalizePhone(rawInput);
  const digits = normalizePhoneDigits(normalized);
  const variants = [];

  if (normalized) variants.push({ phoneNumber: normalized });

  if (digits) {
    variants.push({ phoneNumber: digits });
    variants.push({ phoneNumber: new RegExp(`${escapeForRegex(digits)}$`, "i") });

    if (digits.length >= 8) {
      const lastEight = digits.slice(-8);
      variants.push({ phoneNumber: lastEight });
      variants.push({ phoneNumber: new RegExp(`${escapeForRegex(lastEight)}$`, "i") });
    }
  }

  return {
    normalized,
    variants,
  };
}

async function upsertCustomerFromIdentity({
  name,
  phoneNumber,
  barber,
  dateOfBirth,
}) {
  const fallbackName = String(name || "").trim();
  const phoneInput = String(phoneNumber || "").trim();
  if (!phoneInput) {
    return { status: "skipped", reason: "missing-phone" };
  }

  const { normalized, variants } = buildPhoneLookupVariants(phoneInput);
  const canonicalPhone = normalized || phoneInput;

  let customer = variants.length
    ? await Customer.findOne({ $or: variants })
    : await Customer.findOne({ phoneNumber: canonicalPhone });

  if (!customer) {
    customer = await Customer.create({
      name: fallbackName || canonicalPhone,
      phoneNumber: canonicalPhone,
      barber: barber || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
    });

    return { status: "created", customerId: String(customer._id) };
  }

  let changed = false;

  if (fallbackName && !customer.name) {
    customer.name = fallbackName;
    changed = true;
  }

  if (barber && !customer.barber) {
    customer.barber = barber;
    changed = true;
  }

  if (dateOfBirth) {
    const incomingDobIso = new Date(dateOfBirth).toISOString().slice(0, 10);
    const existingDobIso = customer.dateOfBirth
      ? new Date(customer.dateOfBirth).toISOString().slice(0, 10)
      : "";
    if (incomingDobIso && incomingDobIso !== existingDobIso) {
      customer.dateOfBirth = new Date(dateOfBirth);
      changed = true;
    }
  }

  if (changed) {
    await customer.save();
    return { status: "updated", customerId: String(customer._id) };
  }

  return { status: "existing", customerId: String(customer._id) };
}

module.exports = {
  normalizePhone,
  buildPhoneLookupVariants,
  upsertCustomerFromIdentity,
};
