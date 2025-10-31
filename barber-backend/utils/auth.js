const jwt = require("jsonwebtoken");

function getTokenFromRequest(req) {
  const header = req.headers?.authorization || "";
  if (typeof header !== "string") return null;
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

function getUserIdFromRequest(req) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return payload?.userId || null;
  } catch {
    return null;
  }
}

module.exports = {
  getUserIdFromRequest,
};
