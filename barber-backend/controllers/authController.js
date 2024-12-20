const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const signup = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    console.log("Signup request body:", req.body);

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Directly pass the plain-text password, as it will be hashed in the pre("save") hook
    const user = new User({ username, password });
    await user.save();
    console.log("User saved:", user);

    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    console.log("Login request body:", req.body);

    const user = await User.findOne({ username });
    console.log("Found user for login:", user);

    if (!user) {
      console.log("User not found");
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordMatch = await user.comparePassword(password); // Use instance method
    console.log("Password match result:", isPasswordMatch);

    if (!isPasswordMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    console.log("Generated token:", token);

    res.status(200).json({ token });
  } catch (error) {
    console.error("Error during login:", error);
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { username, currentPassword, newUsername, newPassword } = req.body;
    console.log("Update request body:", req.body);

    const user = await User.findOne({ username });
    console.log("Found user for update:", user);

    // Verify current password
    if (!user || !(await user.comparePassword(currentPassword))) {
      console.log("Invalid current credentials");
      return res.status(400).json({ message: "Invalid current credentials" });
    }

    // Update username if provided
    if (newUsername) {
      console.log("Updating username to:", newUsername);
      user.username = newUsername;
    }

    // Update password if provided
    if (newPassword) {
      console.log("Updating password...");
      user.password = newPassword; // Assign plain password; let middleware hash it
    }

    await user.save();
    console.log("User updated successfully:", user);

    res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating profile:", error);
    next(error);
  }
};

module.exports = {
  signup,
  login,
  updateProfile,
};
