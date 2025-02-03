import React, { useState, useEffect } from "react";
import FolderList from "../_components/FolderList";
import axios from "axios";
import WaitingList from "../_components/WaitingList";

const NotePage = () => {
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [showTextArea, setShowTextArea] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [editingNote, setEditingNote] = useState(null);

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/folders`);
        setFolders(response.data);
      } catch (error) {
        console.error("Error fetching folders:", error);
      }
    };

    fetchFolders();
  }, []);

  const fetchSelectedFolder = async (folderId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/folders/${folderId}`);
      setSelectedFolder(response.data);
    } catch (error) {
      console.error("Error fetching selected folder:", error);
    }
  };

  const handleAddNote = async () => {
    if (newNoteContent.trim() === "") {
      alert("Note content cannot be empty.");
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/notes`, {
        description: newNoteContent,
        title: newNoteContent.slice(0, 20),
        folderId: selectedFolder._id,
        category: "General",
        priority: "Medium",
      });

      setNewNoteContent("");
      setShowTextArea(false);

      // Refetch folder data to sync the state
      fetchSelectedFolder(selectedFolder._id);
    } catch (error) {
      console.error("Error adding note:", error);
    }
  };

  const handleEditNote = async (updatedContent) => {
    if (!editingNote || updatedContent.trim() === "") {
      alert("Note content cannot be empty.");
      return;
    }

    try {
      await axios.put(`${API_BASE_URL}/notes/${editingNote._id}`, {
        description: updatedContent,
        title: updatedContent.slice(0, 20),
      });

      setEditingNote(null);

      // Refetch folder data to sync the state
      fetchSelectedFolder(selectedFolder._id);
    } catch (error) {
      console.error("Error editing note:", error);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (window.confirm("Are you sure you want to delete this note?")) {
      try {
        await axios.delete(`${API_BASE_URL}/notes/${noteId}`);

        // Refetch folder data to sync the state
        fetchSelectedFolder(selectedFolder._id);
      } catch (error) {
        console.error("Error deleting note:", error);
      }
    }
  };

  const handleFolderClick = (folder) => {
    setSelectedFolder(folder);
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white p-6">
      {!selectedFolder ? (
        <>
          {/* Render Folder List */}
          <FolderList
            folders={folders}
            onFolderClick={handleFolderClick}
            onAddFolder={(folderName) =>
              axios
                .post(`${API_BASE_URL}/folders`, { name: folderName })
                .then((response) =>
                  setFolders((prev) => [...prev, response.data])
                )
            }
            onDeleteFolder={(folderId) =>
              axios
                .delete(`${API_BASE_URL}/folders/${folderId}`)
                .then(() =>
                  setFolders((prev) =>
                    prev.filter((folder) => folder._id !== folderId)
                  )
                )
            }
          />

          {/* Render WaitingList Below Folder List */}
          <div className="mt-6">
            <WaitingList />
          </div>
        </>
      ) : (
        <div>
          <button
            className="mb-4 bg-yellow-500 text-black px-4 py-2 rounded-lg"
            onClick={() => setSelectedFolder(null)}
          >
            ΠΙΣΩ ΣΤΟΥΣ ΦΑΚΕΛΟΥΣ
          </button>
          <h1 className="text-2xl font-bold mb-4">{selectedFolder.name}</h1>

          <button
            className="mb-4 bg-green-500 text-black px-4 py-2 rounded-lg"
            onClick={() => setShowTextArea(!showTextArea)}
          >
            {showTextArea ? "ΑΚΥΡΩΣΗ" : "ΠΡΟΣΘΗΚΗ ΣΗΜΕΙΩΣΗΣ"}
          </button>

          {showTextArea && (
            <div className="mb-4">
              <textarea
                className="w-full h-32 p-2 border bg-gray-900 text-white rounded"
                placeholder="Γράψε την σημείωση σου εδώ..."
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
              />
              <button
                className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
                onClick={handleAddNote}
              >
                ΑΠΟΘΗΚΕΥΣΗ ΣΗΜΕΙΩΣΗΣ
              </button>
            </div>
          )}

          <ul>
            {selectedFolder.notes.map((note) => (
              <li
                key={note._id}
                className="bg-gray-800 p-4 rounded-lg shadow-md mb-2 flex justify-between items-center"
              >
                <div>
                  {editingNote && editingNote._id === note._id ? (
                    <>
                      <textarea
                        className="w-full bg-gray-700 text-white p-2 rounded mb-2"
                        value={editingNote.description}
                        onChange={(e) =>
                          setEditingNote({
                            ...editingNote,
                            description: e.target.value,
                          })
                        }
                      />
                      <button
                        className="bg-blue-500 text-white px-4 py-2 rounded"
                        onClick={() => handleEditNote(editingNote.description)}
                      >
                        ΑΠΟΘΗΚΕΥΣΗ
                      </button>
                      <button
                        className="ml-2 bg-gray-500 text-white px-4 py-2 rounded"
                        onClick={() => setEditingNote(null)}
                      >
                        ΑΚΥΡΩΣΗ
                      </button>
                    </>
                  ) : (
                    <>
                      <h2 className="font-bold text-white">{note.title}</h2>
                      <p className="text-sm text-gray-400">
                        {note.description}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex items-center">
                  {!editingNote && (
                    <button
                      className="text-blue-500 mr-2"
                      onClick={() => setEditingNote(note)}
                    >
                      Edit
                    </button>
                  )}
                  <button
                    className="text-red-500"
                    onClick={() => handleDeleteNote(note._id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NotePage;
