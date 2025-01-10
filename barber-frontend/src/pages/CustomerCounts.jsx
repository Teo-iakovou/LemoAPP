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
  const [counts, setCounts] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth()); // Default to current month
  const [year, setYear] = useState(new Date().getFullYear()); // Default to current year
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

  const fetchCounts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/CustomerCounts`, {
        params: { month, year },
      });
      setCounts(response.data.counts);
    } catch (err) {
      console.error("Error fetching customer counts:", err);
      setError("Failed to fetch customer counts.");
    }
  };

  useEffect(() => {
    fetchCounts();
  }, [month, year]);

  const handleMonthChange = (e) => {
    setMonth(parseInt(e.target.value, 10));
  };

  const handleYearChange = (e) => {
    setYear(parseInt(e.target.value, 10));
  };

  const chartData = counts
    ? {
        labels: ["ΛΕΜΟ", "ΦΟΡΟΥ"],
        datasets: [
          {
            label: `Customer Counts for ${months[month]} ${year}`,
            data: [counts["ΛΕΜΟ"], counts["ΦΟΡΟΥ"]],
            backgroundColor: ["#6A0DAD", "#9B59B6"], // Purple shades
          },
        ],
      }
    : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, // Adjust for better centering
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => `${context.raw} customers`,
        },
      },
      datalabels: {
        display: true,
        color: "white", // Numbers on bars are white
        font: {
          size: 16,
          weight: "bold",
        },
        formatter: (value) => value,
      },
      legend: {
        position: "top",
        labels: {
          color: "white", // Legend text is white
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: "white", // X-axis labels are white
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: "white", // Y-axis labels are white
          stepSize: 10,
        },
        grid: {
          color: "#444", // Grid lines are darker
        },
      },
    },
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex flex-col items-center justify-center pt-16">
      <h1 className="text-2xl font-bold mb-4 text-white">ΜΗΝΙΑΙΟΙ ΠΕΛΑΤΕΣ</h1>
      {error && <div className="text-red-500">{error}</div>}
      <div className="mb-6">
        <label className="block mb-2 text-white">ΕΠΕΛΕΞΕ ΜΗΝΑ</label>
        <select
          value={month}
          onChange={handleMonthChange}
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
          onChange={handleYearChange}
          className="p-2 border rounded-md"
        />
      </div>
      {counts && (
        <div className="bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-4xl h-[400px] flex items-center justify-center">
          <Bar data={chartData} options={chartOptions} />
        </div>
      )}
      {!counts && !error && <div className="text-white">Loading...</div>}
    </div>
  );
};

export default CustomerCounts;
