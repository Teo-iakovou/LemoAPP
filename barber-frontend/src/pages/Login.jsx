import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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
    <div className="login-glass-root fixed inset-0 z-50 flex items-center justify-center overflow-hidden px-4 py-8">
      {/* Animated gradient base + drifting violet glows (decorative) */}
      <div className="login-glass-bg" aria-hidden="true" />
      <div className="login-glow login-glow--1" aria-hidden="true" />
      <div className="login-glow login-glow--2" aria-hidden="true" />
      <div className="login-glow login-glow--3" aria-hidden="true" />

      <form
        onSubmit={handleLogin}
        className={`relative z-10 w-full max-w-sm rounded-2xl border border-white/15 bg-white/5 p-8 backdrop-blur-xl transition-all duration-700 ease-out ${
          mounted
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-5 scale-95 opacity-0"
        }`}
        style={{
          boxShadow:
            "0 24px 70px -20px rgba(0,0,0,0.65), inset 0 1px 0 0 rgba(255,255,255,0.06)",
        }}
      >
        <h1 className="mb-7 text-center text-2xl font-semibold tracking-wide text-white">
          Σύνδεση
        </h1>

        {error && (
          <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        {/* Username — floating label */}
        <div className="relative mb-4">
          <input
            id="login-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder=" "
            required
            className="peer w-full rounded-xl border border-white/10 bg-white/5 px-4 pb-2 pt-5 text-white outline-none transition-all duration-200 focus:border-[#8B2FF0]/70 focus:bg-white/[0.07] focus:ring-2 focus:ring-[#8B2FF0]/40"
          />
          <label
            htmlFor="login-username"
            className="pointer-events-none absolute left-4 top-2 text-xs text-[#c9a3ff] transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-white/50 peer-focus:top-2 peer-focus:text-xs peer-focus:text-[#c9a3ff]"
          >
            Όνομα χρήστη
          </label>
        </div>

        {/* Password — floating label */}
        <div className="relative mb-6">
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder=" "
            required
            className="peer w-full rounded-xl border border-white/10 bg-white/5 px-4 pb-2 pt-5 text-white outline-none transition-all duration-200 focus:border-[#8B2FF0]/70 focus:bg-white/[0.07] focus:ring-2 focus:ring-[#8B2FF0]/40"
          />
          <label
            htmlFor="login-password"
            className="pointer-events-none absolute left-4 top-2 text-xs text-[#c9a3ff] transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-white/50 peer-focus:top-2 peer-focus:text-xs peer-focus:text-[#c9a3ff]"
          >
            Κωδικός
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold text-white transition-all duration-200 active:scale-[.97] ${
            isLoading
              ? "cursor-not-allowed bg-[#8B2FF0]/50"
              : "bg-[#8B2FF0] shadow-lg shadow-[#8B2FF0]/30 hover:bg-[#7a29d6] hover:shadow-[#8B2FF0]/50"
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
          {isLoading ? "Σύνδεση..." : "Σύνδεση"}
        </button>
      </form>

      {/* Self-contained styles for the animated glass background */}
      <style>{`
        .login-glass-root { background: #05050a; }
        .login-glass-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(130deg, #0a0a14 0%, #140a24 45%, #0a0a14 100%);
          background-size: 220% 220%;
          animation: loginGradientShift 20s ease-in-out infinite;
        }
        .login-glow {
          position: absolute;
          border-radius: 9999px;
          filter: blur(90px);
          opacity: 0.55;
          will-change: transform;
          pointer-events: none;
        }
        .login-glow--1 {
          width: 440px; height: 440px;
          background: rgba(139, 47, 240, 0.45);
          top: -130px; left: -110px;
          animation: loginFloat1 15s ease-in-out infinite;
        }
        .login-glow--2 {
          width: 380px; height: 380px;
          background: rgba(139, 47, 240, 0.30);
          bottom: -150px; right: -90px;
          animation: loginFloat2 17s ease-in-out infinite;
        }
        .login-glow--3 {
          width: 320px; height: 320px;
          background: rgba(96, 32, 190, 0.28);
          top: 42%; left: 55%;
          animation: loginFloat3 22s ease-in-out infinite;
        }
        @keyframes loginGradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes loginFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(45px, 35px) scale(1.08); }
        }
        @keyframes loginFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-35px, -45px) scale(1.1); }
        }
        @keyframes loginFloat3 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-45%, -55%) scale(1.12); }
        }
        @media (prefers-reduced-motion: reduce) {
          .login-glass-bg, .login-glow { animation: none; }
        }
      `}</style>
    </div>
  );
};

export default Login;
