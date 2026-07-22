// Deny-by-default gate for endpoints a limited 'calendar' user may also reach.
// MUST be chained AFTER requireUser, which verifies the JWT and loads the fresh
// user document onto req.user. Authorization is based on the DB value
// (req.user.role) — never the JWT claim — so a tampered token cannot escalate.
//
// This is deliberately NOT a general "any logged-in user" gate: the allowed set is
// listed explicitly, so a future role added to the User enum is denied until it is
// named here.
const ALLOWED_ROLES = new Set(["admin", "calendar"]);

module.exports = function requireCalendarOrAdmin(req, res, next) {
  if (!req.user) {
    // requireUser should have run first; treat a missing user as unauthenticated.
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!ALLOWED_ROLES.has(req.user.role)) {
    return res.status(403).json({ message: "Insufficient permissions" });
  }
  return next();
};
