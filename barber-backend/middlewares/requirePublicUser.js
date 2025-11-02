const jwt = require("jsonwebtoken");
const PublicUser = require("../models/publicUser");

function getPublicJwtSecret() {
  const { PUBLIC_JWT_SECRET, JWT_SECRET } = process.env;
  if (PUBLIC_JWT_SECRET && PUBLIC_JWT_SECRET.trim()) return PUBLIC_JWT_SECRET.trim();
  if (JWT_SECRET && JWT_SECRET.trim()) return `${JWT_SECRET.trim()}_public`;
  throw new Error("Missing PUBLIC_JWT_SECRET or JWT_SECRET environment variable");
}

module.exports = async function requirePublicUser(req, res, next) {
  try {
    const header = req.headers?.authorization || "";
    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization header missing" });
    }
    const token = header.slice(7).trim();
    if (!token) {
      return res.status(401).json({ message: "Authorization token missing" });
    }
    const payload = jwt.verify(token, getPublicJwtSecret());
    if (!payload?.publicUserId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }
    const user = await PublicUser.findById(payload.publicUserId).lean();
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    req.publicUser = user;
    req.publicUserId = user._id;
    next();
  } catch (err) {
    console.error("Public auth error:", err.message);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
