import React, { useEffect, useState } from "react";
import { fetchCustomer } from "../utils/api";
import { FaUserCircle } from "react-icons/fa"; // Avatar fallback icon

const CustomerDetailsDrawer = ({ customerId, onClose }) => {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    fetchCustomer(customerId)
      .then((data) => setCustomer(data))
      .finally(() => setLoading(false));
  }, [customerId]);

  if (!customerId) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 flex justify-end z-50"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm h-full bg-gradient-to-b from-slate-900 to-slate-800 p-8 shadow-2xl overflow-y-auto transition-all border-l border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-5 right-5 text-gray-400 hover:text-rose-500 text-2xl"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        {loading ? (
          <div className="text-white text-center mt-20">Loading...</div>
        ) : !customer ? (
          <div className="text-red-500">Customer not found.</div>
        ) : (
          <div>
            {/* Avatar/Profile */}
            <div className="flex flex-col items-center mb-6">
              {customer.profilePicture ? (
                <img
                  src={customer.profilePicture}
                  alt="Profile"
                  className="w-24 h-24 rounded-full border-4 border-rose-400 shadow-md mb-2 object-cover"
                />
              ) : (
                <FaUserCircle className="w-24 h-24 text-slate-600 mb-2" />
              )}
              <h2 className="text-2xl font-bold text-white text-center">
                {customer.name}
              </h2>
              <p className="text-sm text-slate-400">{customer.phoneNumber}</p>
            </div>

            {/* Info Section */}
            <div className="space-y-4 bg-slate-800 rounded-xl px-4 py-6 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-300">Barber:</span>
                <span className="font-bold text-pink-400">
                  {customer.barber}
                </span>
              </div>
              {customer.dateOfBirth && (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-300">Birthday:</span>
                  <span className="font-bold text-slate-200">
                    {customer.dateOfBirth.slice(0, 10)}
                  </span>
                </div>
              )}
            </div>

            {/* Appointment history placeholder */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-slate-300 mb-2">
                Appointment History
              </h3>
              <div className="bg-slate-900 rounded-lg p-3 text-slate-400 text-center border border-dashed border-slate-700">
                [Appointment history coming soon]
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDetailsDrawer;
