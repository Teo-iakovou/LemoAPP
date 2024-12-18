require("dotenv").config();

const validatePassword = (req, res, next) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: "Password is required" });
  }

  const correctPassword = process.env.ADMIN_PASSWORD || "defaultPassword"; // Default for testing

  if (password !== correctPassword) {
    return res.status(401).json({ message: "Invalid password" });
  }

  next(); // Password is valid, proceed to the next middleware or route handler
};

module.exports = validatePassword;
