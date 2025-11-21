module.exports = function requirePublicRole(roles = []) {
  const allowedRoles = Array.isArray(roles) && roles.length ? roles : null;
  return function roleMiddleware(req, res, next) {
    if (!req.publicUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const role = req.publicUser.role || "customer";
    if (allowedRoles && !allowedRoles.includes(role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    return next();
  };
};
