const bcrypt = require("bcryptjs");
const Admin = require("../models/admin");

const validatePassword = async (req, res, next) => {
  const { currentPassword } = req.body;

  if (!currentPassword) {
    return res.status(400).json({ message: "Current password is required" });
  }

  try {
    // Fetch admin password from the database
    const admin = await Admin.findOne();
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Validate the password
    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    next(); // Password is valid, proceed to the next middleware or route handler
  } catch (error) {
    next(error); // Pass errors to the error-handling middleware
  }
};

module.exports = validatePassword;
