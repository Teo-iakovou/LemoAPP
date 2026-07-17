// Deny-by-default full-admin gate. MUST be chained AFTER requireUser, which
// verifies the JWT and loads the fresh user document onto req.user.
// Authorization is based on the DB value (req.user.role) — never the JWT claim —
// so a limited 'calendar' user cannot escalate by tampering with their token.
module.exports = function requireFullAdmin(req, res, next) {
  if (!req.user) {
    // requireUser should have run first; treat a missing user as unauthenticated.
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Insufficient permissions" });
  }
  return next();
};
