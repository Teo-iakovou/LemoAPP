import React, { useEffect, useState } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip);

const CustomerCounts = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Track authentication
  const [authError, setAuthError] = useState(""); // For authentication errors
  const [username, setUsername] = useState(""); // Input username
  const [password, setPassword] = useState(""); // Input password

  const [counts, setCounts] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [error, setError] = useState(null);

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

  const months = [
    "Ιανουάριος",
    "Φεβρουάριος",
    "Μάρτιος",
    "Απρίλιος",
    "Μάιος",
    "Ιούνιος",
    "Ιούλιος",
    "Αύγουστος",
    "Σεπτέμβριος",
    "Οκτώβριος",
    "Νοέμβριος",
    "Δεκέμβριος",
  ];

  // Fetch counts from the backend
  const fetchCounts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/CustomerCounts`, {
        params: { month, year },
        headers: { Authorization: `Bearer ${token}` },
      });
      setCounts(response.data.counts);
    } catch (err) {
      console.error("Error fetching customer counts:", err);
      setError("Failed to fetch customer counts.");
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchCounts();
    }
  }, [isAuthenticated, month, year]);

  // Handle login submission
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/signin`, {
        username,
        password,
      });
      localStorage.setItem("token", response.data.token); // Store token
      setIsAuthenticated(true); // Mark as authenticated
    } catch (err) {
      console.error("Authentication failed:", err);
      setAuthError("Invalid username or password.");
    }
  };

  // Prepare chart data
  const chartData = counts
    ? {
        labels: ["ΛΕΜΟ", "ΦΟΡΟΥ"],
        datasets: [
          {
            label: `Customer Counts for ${months[month]} ${year}`,
            data: [counts["ΛΕΜΟ"], counts["ΦΟΡΟΥ"]],
            backgroundColor: ["#6A0DAD", "#9B59B6"],
          },
        ],
      }
    : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => `${context.raw} customers`,
        },
      },
      legend: {
        position: "top",
        labels: { color: "white" },
      },
    },
    scales: {
      x: {
        ticks: { color: "white" },
      },
      y: {
        beginAtZero: true,
        ticks: { color: "white", stepSize: 10 },
        grid: { color: "#444" },
      },
    },
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900">
        <form
          onSubmit={handleLogin}
          className="bg-gray-800 p-6 rounded-lg shadow-md text-white"
        >
          <h1 className="text-2xl font-bold mb-4">ΣΥΝΔΕΣΗ</h1>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <div className="mb-4">
            <label className="block text-white">ΟΝΟΜΑ ΧΡΗΣΤΗ</label>
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
            <label className="block text-white">ΚΩΔΙΚΟΣ</label>
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
  }

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex flex-col items-center justify-center pt-16">
      <h1 className="text-2xl font-bold mb-4 text-white">ΜΗΝΙΑΙΟΙ ΠΕΛΑΤΕΣ</h1>
      {error && <div className="text-red-500">{error}</div>}
      <div className="mb-6">
        <label className="block mb-2 text-white">ΕΠΕΛΕΞΕ ΜΗΝΑ</label>
        <select
          value={month}
          onChange={(e) => setMonth(parseInt(e.target.value, 10))}
          className="p-2 border rounded-md"
        >
          {months.map((m, index) => (
            <option key={index} value={index}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-6">
        <label className="block mb-2 text-white">ΕΠΕΛΕΞΕ ΧΡΟΝΙΑ</label>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value, 10))}
          className="p-2 border rounded-md"
        />
      </div>
      {counts && (
        <div className="bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-4xl h-[400px] flex items-center justify-center">
          <Bar data={chartData} options={chartOptions} />
        </div>
      )}
    </div>
  );
};

export default CustomerCounts;
