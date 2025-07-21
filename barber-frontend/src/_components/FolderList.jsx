import React, { useState } from "react";
import { FaFolderPlus, FaTrash } from "react-icons/fa";

const FolderList = ({
  folders,
  onFolderClick,
  onAddFolder,
  onDeleteFolder,
}) => {
  const [showInput, setShowInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const handleAddFolder = () => {
    if (newFolderName.trim() === "") {
      alert("Folder name cannot be empty.");
      return;
    }
    onAddFolder(newFolderName);
    setNewFolderName("");
    setShowInput(false);
  };

  const handleDeleteClick = (folderId) => {
    if (window.confirm("Are you sure you want to delete this folder?")) {
      onDeleteFolder(folderId);
    }
  };

  return (
    <div className="relative">
      <h1 className="text-2xl font-bold mb-4">ΦΑΚΕΛΟΙ</h1>
      <div className="absolute top-0 right-0">
        {!showInput ? (
          <button
            className="text-yellow-500 text-2xl"
            onClick={() => setShowInput(true)}
          >
            <FaFolderPlus />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="ΟΝΟΜΑ ΦΑΚΕΛΟΥ"
              className="p-2 rounded border bg-gray-800 text-white"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
            <button
              className="bg-green-500 text-white px-4 py-2 rounded"
              onClick={handleAddFolder}
            >
              ΠΡΟΣΘΕΣΗ
            </button>
            <button
              className="bg-red-500 text-white px-4 py-2 rounded"
              onClick={() => setShowInput(false)}
            >
              ΑΚΥΡΩΣΗ
            </button>
          </div>
        )}
      </div>
      <ul>
        {folders.map((folder) => (
          <li
            key={folder._id}
            className="bg-gray-800 p-4 rounded-lg shadow-md mb-2 flex justify-between items-center"
          >
            <span
              className="cursor-pointer hover:underline"
              onClick={() => onFolderClick(folder)}
            >
              {folder.name}
            </span>
            <button
              className="text-red-500 hover:text-red-700"
              onClick={() => handleDeleteClick(folder._id)}
            >
              <FaTrash />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FolderList;
