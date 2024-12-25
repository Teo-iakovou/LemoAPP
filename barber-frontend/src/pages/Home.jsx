import React from "react";
import { useNavigate } from "react-router-dom";
import barbershopBg from "../assets/LemoBarberShop.JPG";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div
      className=" rounded-full flex flex-col items-center justify-center h-screen text-center bg-cover bg-center"
      style={{
        backgroundImage: `url(${barbershopBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <h1 className="text-4xl font-bold text-white mb-4">
        ΚΑΛΩΣΟΡΙΣΑΤΕ ΣΤΟ LEMOBARBERSHOP
      </h1>
      <p className="text-lg text-white  mb-6">
        Διαχειριστείτε και προγραμματίστε τα ραντεβούμε ευκολία χρησιμοποιώντας
        την εφαρμογή
      </p>
      <button
        onClick={() => navigate("/calendar")}
        className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition"
      >
        ΚΛΕΙΣΕ ΡΑΝΤΕΒΟΥ
      </button>
    </div>
  );
};

export default Home;
