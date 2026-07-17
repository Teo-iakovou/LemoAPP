const User = require("../models/user");
const jwt = require("jsonwebtoken");

const signup = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Directly pass the plain-text password, as it will be hashed in the pre("save") hook
    const user = new User({ username, password });
    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "User created successfully",
      token,
      user: { id: user._id, username: user.username, role: user.role },
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (!user) {
      console.log("User not found");
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordMatch = await user.comparePassword(password); // Use instance method

    if (!isPasswordMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      token,
      user: { id: user._id, username: user.username, role: user.role },
    });
  } catch (error) {
    console.error("Error during login:", error);
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { currentPassword, newUsername, newPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({ message: "Current password is required" });
    }

    // SESSION-SCOPED: always act on the authenticated user (requireUser sets
    // req.userId from the verified token). Any `username` in the body is ignored,
    // so a signed-in user can never target someone else's account.
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ message: "Invalid current credentials" });
    }

    // Update username if provided
    if (newUsername) {
      user.username = newUsername;
    }

    // Update password if provided
    if (newPassword) {
      user.password = newPassword; // Assign plain password; let middleware hash it
    }

    await user.save();

    res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating profile:", error);
    next(error);
  }
};

const me = async (req, res) => {
  const user = req.user;
  res.status(200).json({
    user: {
      id: user._id,
      username: user.username,
      dob: user.dob || null,
      role: user.role || "admin",
    },
  });
};

const updateMe = async (req, res, next) => {
  try {
    const dob = String(req.body?.dob || "").trim();
    if (!dob) {
      return res.status(400).json({ message: "dob is required" });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      return res.status(400).json({ message: "dob must be in YYYY-MM-DD format" });
    }

    const parsedDob = new Date(`${dob}T00:00:00Z`);
    if (Number.isNaN(parsedDob.getTime())) {
      return res.status(400).json({ message: "dob is invalid" });
    }
    const today = new Date();
    const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    if (parsedDob > todayUtc) {
      return res.status(400).json({ message: "dob cannot be in the future" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { $set: { dob } },
      { new: true, runValidators: true, select: "_id username dob" }
    ).lean();

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Profile updated",
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        dob: updatedUser.dob || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  login,
  updateProfile,
  me,
  updateMe,
};
