const Note = require("../models/note");
const Folder = require("../models/folder"); // Update the path based on your file structure

// Create a new note
const createNote = async (req, res) => {
  try {
    const { title, description, category, priority, folderId } = req.body;

    // Log folderId to verify it is being sent
    console.log("Folder ID:", folderId);

    if (!folderId) {
      return res.status(400).json({ message: "Folder ID is required" });
    }

    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    const newNote = await Note.create({
      title,
      description,
      category,
      priority,
      folderId, // Ensure this is included
    });

    folder.notes.push(newNote._id); // Add the note to the folder
    await folder.save();

    res.status(201).json(newNote);
  } catch (error) {
    console.error("Error creating note:", error);
    res.status(500).json({ message: "Error creating note", error });
  }
};

// Get all notes
const getAllNotes = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query; // Default values
    const notes = await Note.find()
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Note.countDocuments();
    res.status(200).json({ notes, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).json({ message: "Failed to fetch notes." });
  }
};

// Get a specific note by ID
const getNoteById = async (req, res) => {
  try {
    const { id } = req.params;
    const note = await Note.findById(id);
    if (!note) {
      return res.status(404).json({ message: "Note not found." });
    }
    res.status(200).json(note);
  } catch (error) {
    console.error("Error fetching note by ID:", error);
    res.status(500).json({ message: "Failed to fetch note." });
  }
};

// Update a note
const updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, priority } = req.body;

    const updatedNote = await Note.findByIdAndUpdate(
      id,
      { title, description, category, priority },
      { new: true, runValidators: true }
    );

    if (!updatedNote) {
      return res.status(404).json({ message: "Note not found." });
    }

    res.status(200).json(updatedNote);
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(500).json({ message: "Failed to update note." });
  }
};

// Delete a note
const deleteNote = async (req, res) => {
  try {
    console.log("Deleting note with ID:", req.params.id); // Debug log
    const note = await Note.findByIdAndDelete(req.params.id);
    if (!note) {
      return res.status(404).json({ message: "Note not found." });
    }
    res.status(200).json({ message: "Note deleted successfully." });
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).json({ message: "Failed to delete note." });
  }
};

module.exports = {
  createNote,
  getAllNotes,
  getNoteById,
  updateNote,
  deleteNote,
};
