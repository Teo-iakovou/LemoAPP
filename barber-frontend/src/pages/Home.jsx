import React from "react";
import { useNavigate } from "react-router-dom";
import barbershopBg from "../assets/LemoBarberShop.JPG";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div
      className="flex flex-col rounded-3xl items-center justify-center min-h-screen min-w-full text-center bg-cover bg-center"
      style={{
        backgroundImage: `url(${barbershopBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <h1 className="text-4xl font-bold text-white mb-4">LEMOBARBERSHOP</h1>
      <p className="text-lg text-white mb-6 font-bold">
        Διαχειριστείτε και προγραμματίστε τα ραντεβού με ευκολία χρησιμοποιώντας
        την εφαρμογή
      </p>
      <button
        onClick={() => navigate("/calendar")}
        className="bg-purple-600 text-white px-6 py-3 font-bold rounded-lg hover:bg-purple-950 transition"
      >
        ΚΛΕΙΣΕ ΡΑΝΤΕΒΟΥ
      </button>
    </div>
  );
};

export default Home;
