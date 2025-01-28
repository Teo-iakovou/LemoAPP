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

const getWeek = (date) => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear + 86400000) / 86400000;

  // Adjust the week calculation to start from Monday
  const weekNumber = Math.ceil(
    (pastDaysOfYear +
      (firstDayOfYear.getDay() === 0 ? 6 : firstDayOfYear.getDay() - 1)) /
      7
  );
  return weekNumber;
};

const getWeeksInMonth = (month, year) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const weeks = [];

  let currentWeek = getWeek(firstDay);
  let startOfWeek = new Date(firstDay);

  // Adjust the start of the week to Monday
  if (startOfWeek.getDay() !== 1) {
    startOfWeek.setDate(
      startOfWeek.getDate() -
        (startOfWeek.getDay() === 0 ? 6 : startOfWeek.getDay() - 1)
    );
  }

  while (startOfWeek <= lastDay) {
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    weeks.push({
      week: currentWeek,
      startDate: new Date(startOfWeek),
      endDate: new Date(Math.min(endOfWeek, lastDay)), // Ensure it doesn't exceed the month's end
    });

    startOfWeek.setDate(startOfWeek.getDate() + 7);
    currentWeek++;
  }

  return weeks;
};

const CustomerCounts = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [counts, setCounts] = useState(null); // Monthly counts
  const [weeklyCounts, setWeeklyCounts] = useState(null); // Weekly counts
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [week, setWeek] = useState(getWeek(new Date()));
  const [error, setError] = useState(null);
  const [view, setView] = useState("monthly"); // Track the current view
  const [isWeekStabilized, setIsWeekStabilized] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      const weeksInMonth = getWeeksInMonth(month, year);

      if (!weeksInMonth.some((w) => w.week === week)) {
        console.log("Resetting week to:", weeksInMonth[0].week);
        setIsWeekStabilized(false); // Mark week as not stabilized
        setWeek(weeksInMonth[0].week); // Update the week
      } else {
        setIsWeekStabilized(true); // Mark week as stabilized
      }
    }
  }, [isAuthenticated, month, year]);

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
  const shortMonths = [
    "Ιαν", // January
    "Φεβ", // February
    "Μαρ", // March
    "Απρ", // April
    "Μάι", // May
    "Ιουν", // June
    "Ιουλ", // July
    "Αυγ", // August
    "Σεπ", // September
    "Οκτ", // October
    "Νοέ", // November
    "Δεκ", // December
  ];

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

  const fetchWeeklyCounts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/WeeklyCustomerCounts`, {
        params: { week, year },
        headers: { Authorization: `Bearer ${token}` },
      });
      setWeeklyCounts(response.data.weeklyCounts);
    } catch (err) {
      console.error("Error fetching weekly customer counts:", err);
      setError("Failed to fetch weekly customer counts.");
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      const weeksInMonth = getWeeksInMonth(month, year);

      // Check if the current week is valid
      if (!weeksInMonth.some((w) => w.week === week)) {
        console.log("Resetting week to:", weeksInMonth[0].week);
        setWeek(weeksInMonth[0].week); // Reset to the first valid week
      }

      // Fetch data based on the current view
      console.log("Fetching data with", { week, month, year, view });
      if (view === "monthly") {
        fetchCounts();
      } else if (view === "weekly") {
        fetchWeeklyCounts();
      }
    }
  }, [isAuthenticated, week, month, year, view]);

  // Generate week options dynamically based on the selected month and year
  const weekOptions = getWeeksInMonth(month, year).map(
    ({ week, startDate, endDate }) => ({
      value: week,
      label: `${startDate.getDate()}-${endDate.getDate()} ${
        shortMonths[month]
      }`, // Use short month names
    })
  );

  const chartData = counts
    ? {
        labels: ["ΛΕΜΟ", "ΦΟΡΟΥ"],
        datasets: [
          {
            label: `Monthly Customer Counts for ${months[month]} ${year}`,
            data: [counts["ΛΕΜΟ"], counts["ΦΟΡΟΥ"]],
            backgroundColor: ["#6A0DAD", "#9B59B6"],
          },
        ],
      }
    : null;
  const greekWeekLabels = Array.from(
    { length: 53 },
    (_, i) => `Εβδομάδα ${i + 1}`
  );

  const weeklyChartData = weeklyCounts
    ? {
        labels: ["ΛΕΜΟ", "ΦΟΡΟΥ"],
        datasets: [
          {
            label: `Εβδομαδιαίος Αριθμός Πελατών (${
              greekWeekLabels[week - 1]
            }, ${months[month]} ${year})`,
            data: [weeklyCounts["ΛΕΜΟ"], weeklyCounts["ΦΟΡΟΥ"]],
            backgroundColor: ["#1E90FF", "#00CED1"],
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
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/signin`, {
        username,
        password,
      });
      localStorage.setItem("token", response.data.token);
      setIsAuthenticated(true);
      setAuthError("");
    } catch (err) {
      console.error("Authentication failed:", err);
      setAuthError(
        err.response?.data?.message || "An unexpected error occurred."
      );
    }
  };
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900">
        <form
          onSubmit={handleLogin}
          className="bg-gray-800 p-6 rounded-lg shadow-md text-white"
        >
          <h1 className="text-2xl font-bold mb-4">ΣΥΝΔΕΣΗ</h1>
          {authError && <p className="text-red-500 mb-4">{authError}</p>}
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
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900">
        <form
          onSubmit={handleLogin}
          className="bg-gray-800 p-6 rounded-lg shadow-md text-white"
        >
          <h1 className="text-2xl font-bold mb-4">ΣΥΝΔΕΣΗ</h1>
          {authError && <p className="text-red-500 mb-4">{authError}</p>}
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
      <h1 className="text-2xl font-bold mb-4 text-white">ΠΕΛΑΤΕΣ</h1>
      {error && <div className="text-red-500">{error}</div>}

      <div className="mb-6 flex items-center space-x-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            ΕΠΕΛΕΞΕ ΜΗΝΑ
          </label>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
            className="p-2 border border-gray-400 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {months.map((m, index) => (
              <option key={index} value={index}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {view === "weekly" && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              ΕΠΕΛΕΞΕ ΕΒΔΟΜΑΔΑ
            </label>
            <select
              value={week}
              onChange={(e) => setWeek(parseInt(e.target.value, 10))}
              className="p-2 border border-gray-400 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {weekOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            ΕΠΕΛΕΞΕ ΧΡΟΝΙΑ
          </label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="p-2 border border-gray-400 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            ΕΠΕΛΕΞΕ ΘΕΑ
          </label>
          <select
            value={view}
            onChange={(e) => setView(e.target.value)}
            className="p-2 border border-gray-400 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="monthly">Μηνιαία</option>
            <option value="weekly">Εβδομαδιαία</option>
          </select>
        </div>
      </div>

      {view === "monthly" && counts && (
        <div className="bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-4xl h-[400px] flex items-center justify-center">
          <Bar data={chartData} options={chartOptions} />
        </div>
      )}

      {view === "weekly" && weeklyCounts && (
        <div className="bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-4xl h-[400px] flex items-center justify-center mt-8">
          <Bar data={weeklyChartData} options={chartOptions} />
        </div>
      )}
    </div>
  );
};

export default CustomerCounts;
