const Folder = require("../models/folder");
const Note = require("../models/note"); // Assuming notes are associated with folders

// Create a folder
const createFolder = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Folder name is required" });
    }

    const newFolder = await Folder.create({ name });
    res.status(201).json(newFolder);
  } catch (error) {
    console.error("Error creating folder:", error);
    res.status(500).json({ message: "Error creating folder", error });
  }
};

// Get all folders
const getAllFolders = async (req, res) => {
  try {
    const folders = await Folder.find().populate("notes");
    res.status(200).json(folders);
  } catch (error) {
    console.error("Error fetching folders:", error);
    res.status(500).json({ message: "Error fetching folders", error });
  }
};

// Update a folder
const updateFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Folder name is required" });
    }

    const updatedFolder = await Folder.findByIdAndUpdate(
      id,
      { name },
      { new: true, runValidators: true }
    );

    if (!updatedFolder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    res.status(200).json(updatedFolder);
  } catch (error) {
    console.error("Error updating folder:", error);
    res.status(500).json({ message: "Error updating folder", error });
  }
};

// Delete a folder
const deleteFolder = async (req, res) => {
  try {
    const { id } = req.params;

    const folder = await Folder.findById(id);

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    // Delete associated notes
    await Note.deleteMany({ _id: { $in: folder.notes } });

    // Delete the folder
    await Folder.findByIdAndDelete(id);

    res.status(200).json({ message: "Folder deleted successfully" });
  } catch (error) {
    console.error("Error deleting folder:", error);
    res.status(500).json({ message: "Error deleting folder", error });
  }
};
// Get a folder by ID
const getFolderById = async (req, res) => {
  try {
    const { id } = req.params;
    const folder = await Folder.findById(id).populate("notes"); // Ensure notes are populated
    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }
    res.status(200).json(folder);
  } catch (error) {
    console.error("Error fetching folder:", error);
    res.status(500).json({ message: "Failed to fetch folder." });
  }
};

module.exports = {
  createFolder,
  getAllFolders,
  updateFolder,
  deleteFolder,
  getFolderById,
};
