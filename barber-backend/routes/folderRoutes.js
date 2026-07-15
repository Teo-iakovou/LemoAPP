const express = require("express");
const {
  createFolder,
  getAllFolders,
  updateFolder,
  getFolderById,
  deleteFolder,
} = require("../controllers/folderController");
const requireUser = require("../middlewares/requireUser");

const router = express.Router();

// Folders are admin-only.
router.use(requireUser);

// Route for creating a folder
router.post("/", createFolder);

// Route for fetching all folders
router.get("/", getAllFolders);

// Route for updating a folder by ID
router.put("/:id", updateFolder);

// Route for deleting a folder by ID
router.delete("/:id", deleteFolder);
router.get("/:id", getFolderById);
module.exports = router;
