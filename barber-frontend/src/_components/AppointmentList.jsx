import React, { useEffect, useState } from "react";
import { fetchAppointments, createAppointment } from "../utils/api";

function AppointmentList({ onEdit }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchAppointments();
        setAppointments(data);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch appointments", error);
      }
    };
    fetchData();
  }, []);

  const deleteAppointment = async (id) => {
    try {
      await fetch(`http://localhost:5001/api/appointments/${id}`, {
        method: "DELETE",
      });
      setAppointments((prev) =>
        prev.filter((appointment) => appointment._id !== id)
      );
    } catch (error) {
      console.error("Failed to delete appointment", error);
    }
  };

  if (loading) {
    return <p>Loading appointments...</p>;
  }

  return (
    <div className="mt-6 bg-white rounded-md shadow-md p-4">
      <h3 className="text-lg font-bold mb-4">Appointments</h3>
      {appointments.length === 0 ? (
        <p>No appointments found.</p>
      ) : (
        <ul>
          {appointments.map((appointment) => (
            <li
              key={appointment._id}
              className="p-4 border-b flex justify-between items-center"
            >
              <div>
                <p>
                  <strong>Name:</strong> {appointment.customerName}
                </p>
                <p>
                  <strong>Phone:</strong> {appointment.phoneNumber}
                </p>
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(appointment.appointmentDateTime).toLocaleString()}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  className="bg-yellow-500 text-white py-1 px-3 rounded"
                  onClick={() => onEdit(appointment)}
                >
                  Edit
                </button>
                <button
                  className="bg-red-500 text-white py-1 px-3 rounded"
                  onClick={() => deleteAppointment(appointment._id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AppointmentList;
