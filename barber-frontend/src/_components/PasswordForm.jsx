import React, { useState } from "react";

function PasswordForm({ onPasswordSubmit, onCancel }) {
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onPasswordSubmit(password); // Sends password to parent
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-gray-700">
        ΚΑΤΑΧΩΡΗΣΕ ΚΩΔΙΚΟ:
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="mt-1 block w-full p-2 border rounded"
          required
        />
      </label>
      <button
        type="submit"
        className="w-full bg-green-500 text-white py-2 rounded"
      >
        ΥΠΟΒΟΛΗ
      </button>
      <button
        type="button"
        className="w-full bg-gray-500 text-white py-2 rounded"
        onClick={onCancel}
      >
        ΑΚΥΡΩΣΗ
      </button>
    </form>
  );
}

export default PasswordForm;
