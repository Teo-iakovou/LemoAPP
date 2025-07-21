const validateAdminPassword = (req, res, next) => {
  const { adminPassword } = req.headers; // Password should be passed in the headers
  const storedPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return res.status(401).json({ message: "Admin password is required" });
  }

  if (adminPassword !== storedPassword) {
    return res.status(403).json({ message: "Invalid admin password" });
  }

  next(); // Proceed if the password matches
};

module.exports = validateAdminPassword;
