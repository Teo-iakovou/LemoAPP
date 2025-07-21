const mongoose = require("mongoose");

const folderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  notes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Note" }], // Array of note references
});

module.exports = mongoose.model("Folder", folderSchema);
