const { isOwner } = require("../utils/ownerAccess");

// Chain AFTER requireUser (which loads the fresh DB user onto req.user).
module.exports = function requireOwner(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (!isOwner(req.user)) {
    return res.status(403).json({ message: "Access restricted for this page" });
  }
  return next();
};
