import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

const Login = ({ setAuth }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // Track loading state
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    // Clear previous error messages
    setError(null);
    // Prevent submission if inputs are empty
    if (!username || !password) {
      setError("Both username and password are required.");
      return;
    }

    try {
      setIsLoading(true); // Start loading
      const response = await fetch(`${API_BASE_URL}/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error codes
        if (response.status === 400) {
          throw new Error("Invalid username or password.");
        } else if (response.status === 500) {
          throw new Error("Server error. Please try again later.");
        } else {
          throw new Error(data.message || "Login failed.");
        }
      }

      // Save token and update auth state
      localStorage.setItem("token", data.token);
      setAuth(true);
      navigate("/"); // Redirect to home page
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false); // End loading
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
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
          className={`w-full p-2 rounded ${
            isLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
          disabled={isLoading} // Disable button when loading
        >
          {isLoading ? "Loading..." : "ΣΥΝΔΕΣΗ"}
        </button>
      </form>
    </div>
  );
};

export default Login;
