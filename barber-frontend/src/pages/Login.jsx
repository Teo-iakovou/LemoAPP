import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LemoLogo from "../assets/LemoLogo.png";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5002/api";

const Login = ({ setAuth }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // Track loading state
  const [mounted, setMounted] = useState(false); // entrance animation only (visual)
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <form
        onSubmit={handleLogin}
        className={`w-full max-w-sm rounded-3xl border border-[#8B2FF0]/30 bg-gray-950/80 p-8 shadow-2xl shadow-[#8B2FF0]/10 backdrop-blur transition-all duration-500 ease-out ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-[#8B2FF0]/15 ring-1 ring-[#8B2FF0]/40">
            <img
              src={LemoLogo}
              alt="Lemo Barber Shop"
              className="h-12 w-12 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-wide text-white">ΣΥΝΔΕΣΗ</h1>
          <p className="mt-1 text-sm text-gray-400">LEMO BARBER · Admin</p>
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="mb-4">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-300">
            Όνομα χρήστη
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-xl border border-gray-700 bg-gray-900/70 px-4 py-2.5 text-white placeholder:text-gray-500 transition focus:border-[#8B2FF0] focus:outline-none focus:ring-2 focus:ring-[#8B2FF0]/40"
            placeholder="Εισάγετε όνομα χρήστη"
            required
          />
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-300">
            Κωδικός
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-gray-700 bg-gray-900/70 px-4 py-2.5 text-white placeholder:text-gray-500 transition focus:border-[#8B2FF0] focus:outline-none focus:ring-2 focus:ring-[#8B2FF0]/40"
            placeholder="Εισάγετε κωδικό"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-white transition active:scale-[.98] ${
            isLoading
              ? "cursor-not-allowed bg-[#8B2FF0]/50"
              : "bg-[#8B2FF0] hover:bg-[#7a29d6]"
          }`}
        >
          {isLoading && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-90"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          )}
          {isLoading ? "Σύνδεση..." : "ΣΥΝΔΕΣΗ"}
        </button>
      </form>
    </div>
  );
};

export default Login;
