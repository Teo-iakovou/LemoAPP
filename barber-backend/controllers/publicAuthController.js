const jwt = require("jsonwebtoken");
const PublicUser = require("../models/publicUser");
const { sendSMS } = require("../utils/smsService");

function getPublicJwtSecret() {
  const { PUBLIC_JWT_SECRET, JWT_SECRET } = process.env;
  if (PUBLIC_JWT_SECRET && PUBLIC_JWT_SECRET.trim()) return PUBLIC_JWT_SECRET.trim();
  if (JWT_SECRET && JWT_SECRET.trim()) return `${JWT_SECRET.trim()}_public`;
  throw new Error("Missing PUBLIC_JWT_SECRET or JWT_SECRET environment variable");
}

function signPublicToken(userId) {
  return jwt.sign({ publicUserId: userId }, getPublicJwtSecret(), {
    expiresIn: "30d",
  });
}

function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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
    variants.push({
      phoneNumber: new RegExp(`${escapeForRegex(digits)}$`, "i"),
    });
    if (digits.length >= 8) {
      const lastEight = digits.slice(-8);
      variants.push({ phoneNumber: lastEight });
      variants.push({
        phoneNumber: new RegExp(`${escapeForRegex(lastEight)}$`, "i"),
      });
    }
  }

  return {
    normalized,
    variants,
  };
}

function normalizeDobInput(input = "") {
  return String(input || "").trim();
}

function parseDob(input = "") {
  const normalized = normalizeDobInput(input);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return { valid: false, message: "DOB must be in YYYY-MM-DD format" };
  }
  const [year, month, day] = normalized.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { valid: false, message: "DOB is not a valid date" };
  }
  const minDate = new Date(Date.UTC(1900, 0, 1));
  const today = new Date();
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  if (date < minDate) {
    return { valid: false, message: "DOB is out of allowed range" };
  }
  if (date > todayUtc) {
    return { valid: false, message: "DOB cannot be in the future" };
  }
  return { valid: true, value: normalized };
}

function serializePublicUser(user) {
  const dob = user?.dob ? String(user.dob) : null;
  return {
    id: user._id,
    username: user.username,
    displayName: user.displayName,
    phoneNumber: user.phoneNumber,
    role: user.role || "customer",
    dob,
    requiresDob: !dob,
  };
}

const signup = async (req, res, next) => {
  try {
    const username = String(req.body?.username || req.body?.name || "").trim();
    const password = String(req.body?.password || "");
    const { normalized: phoneNumber, variants } = buildPhoneLookupVariants(
      req.body?.phoneNumber || req.body?.phone || ""
    );
    const dobInput = req.body?.dob;
    const displayName = req.body?.displayName || req.body?.name || username;

    if (!username || !password || !phoneNumber || !dobInput) {
      return res.status(400).json({ message: "Username, password, phone, and dob are required" });
    }

    const parsedDob = parseDob(dobInput);
    if (!parsedDob.valid) {
      return res.status(400).json({ message: parsedDob.message });
    }

    const existingUser = await PublicUser.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const existingByPhone = variants.length
      ? await PublicUser.findOne({ $or: variants })
      : null;
    if (existingByPhone) {
      return res.status(400).json({ message: "Phone number already in use" });
    }

    const user = new PublicUser({
      username,
      password,
      displayName,
      phoneNumber,
      dob: parsedDob.value,
    });
    await user.save();

    const token = signPublicToken(user._id);

    res.status(201).json({
      message: "Account created successfully",
      token,
      user: serializePublicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const identifier = req.body?.phoneNumber || req.body?.phone || req.body?.username || req.body?.name || "";
    const password = String(req.body?.password || "");

    if (!identifier || !password) {
      return res.status(400).json({ message: "Missing credentials" });
    }

    const { normalized: phoneNumber, variants } = buildPhoneLookupVariants(identifier);
    let user = null;

    if (phoneNumber) {
      user = variants.length
        ? await PublicUser.findOne({ $or: variants })
        : await PublicUser.findOne({ phoneNumber });
    }

    if (!user) {
      const username = String(identifier).trim();
      if (username) {
        user = await PublicUser.findOne({ username });
      }
    }

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = signPublicToken(user._id);

    res.status(200).json({
      token,
      user: serializePublicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

const me = async (req, res) => {
  const user = req.publicUser;
  res.status(200).json({
    user: serializePublicUser(user),
  });
};

const completeProfile = async (req, res, next) => {
  try {
    const parsedDob = parseDob(req.body?.dob);
    if (!parsedDob.valid) {
      return res.status(400).json({ message: parsedDob.message });
    }

    const user = await PublicUser.findByIdAndUpdate(
      req.publicUserId,
      { $set: { dob: parsedDob.value } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Profile updated",
      user: serializePublicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

const requestPasswordReset = async (req, res, next) => {
  try {
    const { normalized: phoneNumber, variants } = buildPhoneLookupVariants(
      req.body?.phoneNumber || req.body?.phone || ""
    );
    if (!phoneNumber) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    const user = variants.length
      ? await PublicUser.findOne({ $or: variants })
      : null;

    if (!user) {
      return res.status(404).json({ message: "No account found for this phone number" });
    }

    const otp = generateOtpCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.resetToken = otp;
    user.resetTokenExpires = expiresAt;
    await user.save();

    const friendlyName = user.displayName || user.username || "πελάτη";
    const message = `Αγαπητέ/ή ${friendlyName}, ο κωδικός OTP είναι: ${otp}`;
    await sendSMS(user.phoneNumber, message);

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    next(error);
  }
};

const resetPasswordWithOtp = async (req, res, next) => {
  try {
    const { normalized: phoneNumber, variants } = buildPhoneLookupVariants(
      req.body?.phoneNumber || req.body?.phone || ""
    );
    const otp = String(req.body?.otp || "").trim();
    const newPassword = String(req.body?.password || "");

    if (!phoneNumber || !otp || !newPassword) {
      return res.status(400).json({ message: "Phone, OTP, and new password are required" });
    }

    const user = variants.length
      ? await PublicUser.findOne({
          $or: variants,
          resetToken: otp,
          resetTokenExpires: { $gt: new Date() },
        })
      : null;

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.password = newPassword;
    user.resetToken = null;
    user.resetTokenExpires = null;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  login,
  me,
  completeProfile,
  requestPasswordReset,
  resetPasswordWithOtp,
};
