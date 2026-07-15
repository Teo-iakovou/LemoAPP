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

// Mirrors requirePublicUser's secret resolution so we can recognise a valid PUBLIC
// (customer) token on shared routes without rejecting it as a broken admin session.
function getPublicJwtSecret() {
  const { PUBLIC_JWT_SECRET, JWT_SECRET } = process.env;
  if (PUBLIC_JWT_SECRET && PUBLIC_JWT_SECRET.trim()) return PUBLIC_JWT_SECRET.trim();
  if (JWT_SECRET && JWT_SECRET.trim()) return `${JWT_SECRET.trim()}_public`;
  return null;
}

function getPublicUserIdFromRequest(req) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  const secret = getPublicJwtSecret();
  if (!secret) return null;
  try {
    const payload = jwt.verify(token, secret);
    return payload?.publicUserId || null;
  } catch {
    return null;
  }
}

// True when an Authorization: Bearer <token> header is present (regardless of validity).
function hasBearerToken(req) {
  return Boolean(getTokenFromRequest(req));
}

module.exports = {
  getUserIdFromRequest,
  getPublicUserIdFromRequest,
  hasBearerToken,
};
