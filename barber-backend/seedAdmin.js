const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("./models/admin");
require("dotenv").config();

const seedAdmin = async () => {
  const password = "apoel"; // Default admin password
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const hashedPassword = await bcrypt.hash(password, 10);

    const existingAdmin = await Admin.findOne();
    if (existingAdmin) {
      console.log("Admin already exists!");
      return;
    }

    const admin = new Admin({ password: hashedPassword });
    await admin.save();
    console.log("Admin seeded successfully!");
  } catch (error) {
    console.error("Error seeding admin:", error.message);
  } finally {
    mongoose.connection.close();
  }
};

seedAdmin();
