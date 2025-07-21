import React, { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Base API URL
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

const Profile = () => {
  const [currentUsername, setCurrentUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE_URL}/auth/update-profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: currentUsername,
          currentPassword,
          newUsername,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Show success message
        toast.success("Profile updated successfully!");
        // Clear input fields
        setCurrentUsername("");
        setCurrentPassword("");
        setNewUsername("");
        setNewPassword("");
      } else {
        // Show error message
        toast.error(data.message || "Failed to update profile");
      }
    } catch (error) {
      toast.error("Error: Unable to update profile");
      console.error("Error updating profile:", error);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 mt-[14px] bg-white shadow-md rounded-3xl ">
      <ToastContainer />
      <h2 className="text-xl font-bold mb-4">ΕΝΗΜΕΡΩΣΗ ΠΡΟΦΙΛ</h2>
      <form onSubmit={handleUpdate}>
        <div className="mb-4">
          <label className="block text-gray-700">ΤΡΕΧΟΝ ΟΝΟΜΑ ΧΡΗΣΤΗ</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            value={currentUsername}
            onChange={(e) => setCurrentUsername(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">ΤΡΕΧΟΝ ΚΩΔΙΚΟΣ</label>
          <input
            type="password"
            className="w-full p-2 border rounded"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">ΝΕΟ ΟΝΟΜΑ ΧΡΗΣΤΗ</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">ΝΕΟΣ ΚΩΔΙΚΟΣ</label>
          <input
            type="password"
            className="w-full p-2 border rounded"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          ΕΝΗΜΕΡΩΣΗ ΠΡΟΦΙΛ
        </button>
      </form>
    </div>
  );
};

export default Profile;
