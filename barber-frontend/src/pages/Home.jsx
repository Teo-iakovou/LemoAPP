import { useNavigate } from "react-router-dom";
import barbershopBg from "../assets/LemoBarberShop.JPG";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div
      className="flex flex-col rounded-none sm:rounded-3xl items-center justify-center h-full w-full text-center bg-cover bg-center p-4 sm:p-8"
      style={{
        backgroundImage: `url(${barbershopBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 sm:mb-4">LEMOBARBERSHOP</h1>
      <p className="text-base sm:text-lg text-white mb-5 sm:mb-6 font-bold max-w-[680px]">
        Διαχειριστείτε και προγραμματίστε τα ραντεβού με ευκολία χρησιμοποιώντας
        την εφαρμογή
      </p>
      <button
        onClick={() => navigate("/calendar")}
        className="bg-purple-600 text-white px-5 sm:px-6 py-3 font-bold rounded-lg hover:bg-purple-950 transition"
      >
        ΚΛΕΙΣΕ ΡΑΝΤΕΒΟΥ
      </button>
    </div>
  );
};

export default Home;
