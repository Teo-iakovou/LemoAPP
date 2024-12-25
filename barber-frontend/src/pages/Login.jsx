import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// Base API URL
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

const Login = ({ setAuth }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      localStorage.setItem("token", data.token); // Save token
      setAuth(true); // Notify parent component of authentication
      navigate("/"); // Redirect to Home
    } catch (err) {
      setError(err.message); // Display error message
    }
  };

  return (
    <div className="flex justify-center items-center h-screen ">
      <form
        onSubmit={handleLogin}
        className="p-6 bg-white rounded shadow-md w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold mb-4">ΣΥΝΔΕΣΗ</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <div className="mb-4">
          <label className="block text-gray-700">ΟΝΟΜΑ ΧΡΗΣΤΗ</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Εισάγετε όνομα χρήστη"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">ΚΩΔΙΚΟΣ</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Εισάγετε κωδικό"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          ΣΥΝΔΕΣΗ
        </button>
      </form>
    </div>
  );
};

export default Login;
