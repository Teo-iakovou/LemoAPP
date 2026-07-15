const express = require("express");
const {
  createNote,
  getAllNotes,
  getNoteById,
  updateNote,
  deleteNote,
} = require("../controllers/noteController");
const requireUser = require("../middlewares/requireUser");
const router = express.Router();

// Notes are admin-only.
router.use(requireUser);

// POST /api/notes - Create a new note
router.post("/", createNote);

// GET /api/notes - Get all notes
router.get("/", getAllNotes);

// GET /api/notes/:id - Get a specific note by ID
router.get("/:id", getNoteById);

// PUT /api/notes/:id - Update a note
router.put("/:id", updateNote);

// DELETE /api/notes/:id - Delete a note
router.delete("/:id", deleteNote);

module.exports = router;
