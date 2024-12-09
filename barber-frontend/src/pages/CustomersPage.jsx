import React, { useEffect, useState } from "react";
import { fetchCustomers, fetchAppointments } from "../utils/api";

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredAppointments, setFilteredAppointments] = useState([]);

  // Fetch customers and appointments on page load
  useEffect(() => {
    const loadData = async () => {
      const customerData = await fetchCustomers();
      const appointmentData = await fetchAppointments();
      setCustomers(customerData);
      setAppointments(appointmentData);
    };
    loadData();
  }, []);

  // Filter appointments as the user types
  useEffect(() => {
    if (searchTerm) {
      setFilteredAppointments(
        appointments.filter((appointment) =>
          appointment.customerName
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredAppointments([]);
    }
  }, [searchTerm, appointments]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Customers</h1>
      <input
        type="text"
        placeholder="Search customers..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4 p-2 border rounded w-full"
      />
      {/* Dropdown for filtered appointments */}
      {filteredAppointments.length > 0 && (
        <ul className="border rounded max-h-40 overflow-y-auto bg-white shadow-md absolute w-full">
          {filteredAppointments.map((appointment) => (
            <li
              key={appointment._id}
              className="p-2 hover:bg-gray-100 cursor-pointer"
            >
              {appointment.customerName} - {appointment.appointmentDateTime}
            </li>
          ))}
        </ul>
      )}
      {/* Display "No customers found" or the customer list */}
      {customers.length === 0 ? (
        <p>No customers found.</p>
      ) : (
        <ul className="space-y-2">
          {customers.map((customer) => (
            <li
              key={customer.phoneNumber}
              className="flex justify-between items-center border-b pb-2"
            >
              <span className="font-medium">{customer.name}</span>
              <span className="text-gray-600">{customer.phoneNumber}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Customers;
