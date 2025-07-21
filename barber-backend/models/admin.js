const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  password: { type: String, required: true }, // Store hashed password
});

module.exports = mongoose.model("Admin", adminSchema);
