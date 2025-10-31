const jwt = require("jsonwebtoken");
const User = require("../models/user");

module.exports = async function requireUser(req, res, next) {
  try {
    const header = req.headers?.authorization || "";
    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization header missing" });
    }
    const token = header.slice(7).trim();
    if (!token) {
      return res.status(401).json({ message: "Authorization token missing" });
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload?.userId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }
    const user = await User.findById(payload.userId).lean();
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    req.user = user;
    req.userId = user._id;
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
