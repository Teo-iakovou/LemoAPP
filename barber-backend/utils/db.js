// utils/db.js
const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI = process.env.MONGODB_URI;

mongoose.set("strictQuery", true);
// Don’t buffer model ops before connect; fail fast instead of hanging:
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // 10s to find a server
      maxPoolSize: 10,
    });
    console.log("MongoDB connected:", mongoose.connection.host);
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    throw err; // let caller decide to exit
  }
}

module.exports = connectDB;