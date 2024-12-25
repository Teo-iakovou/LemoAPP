import React from "react";
import { useNavigate } from "react-router-dom";

const Home = ({ isDarkMode }) => {
  const navigate = useNavigate();

  return (
    <div
      className={`flex flex-col items-center justify-center h-full text-center mt-[14px] min-h-[calc(100vh-64px)] ${
        isDarkMode ? " text-white" : " text-gray-900"
      }`}
    >
      <h1 className="text-4xl font-bold mb-4">
        ΚΑΛΩΣΟΡΙΣΑΤΕ ΣΤΟ LEMOBARBERSHOP
      </h1>
      <p className="text-lg mb-6">
        Διαχειριστείτε και προγραμματίστε τα ραντεβούμε ευκολία χρησιμοποιώντας
        την εφαρμογή
      </p>
      <button
        onClick={() => navigate("/calendar")}
        className={`text-white px-6 py-3 rounded-lg ${
          isDarkMode
            ? "bg-purple-500 hover:bg-purple-600 transition"
            : "bg-blue-500 hover:bg-blue-600 transition"
        }`}
      >
        ΚΛΕΙΣΕ ΡΑΝΤΕΒΟΥ
      </button>
    </div>
  );
};

export default Home;
