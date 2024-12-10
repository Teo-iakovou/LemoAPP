import React, { useEffect, useState } from "react";
import {
  fetchAppointments,
  deleteAppointment as apiDeleteAppointment,
} from "../utils/api";

function AppointmentList({ onEdit }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [password, setPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [action, setAction] = useState(""); // Action: "edit" or "delete"
  const [error, setError] = useState("");

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
      await apiDeleteAppointment(id, password); // Backend password validation
      setAppointments((prev) =>
        prev.filter((appointment) => appointment._id !== id)
      );
      setShowPasswordModal(false);
      setPassword("");
      setError("");
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to delete appointment."
      );
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault(); // Prevent page reload
    const correctPassword =
      selectedAppointment.barber === "Lemo" ? "1234" : "5678";

    if (password === correctPassword) {
      if (action === "delete") {
        deleteAppointment(selectedAppointment._id);
      } else if (action === "edit") {
        onEdit(selectedAppointment); // Trigger the edit function passed as a prop
        setShowPasswordModal(false);
        setPassword("");
        setError("");
      }
    } else {
      setError("Incorrect password. Please try again.");
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
              className={`p-4 border-b flex justify-between items-center ${
                appointment.barber === "Lemo" ? "bg-blue-100" : "bg-orange-100"
              }`}
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
                <p>
                  <strong>Barber:</strong> {appointment.barber}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  className="bg-yellow-500 text-white py-1 px-3 rounded"
                  onClick={() => {
                    setSelectedAppointment(appointment);
                    setAction("edit");
                    setShowPasswordModal(true);
                  }}
                >
                  Edit
                </button>
                <button
                  className="bg-red-500 text-white py-1 px-3 rounded"
                  onClick={() => {
                    setSelectedAppointment(appointment);
                    setAction("delete");
                    setShowPasswordModal(true);
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-md w-80">
            <h2 className="text-lg font-bold mb-4">
              Enter Password for {selectedAppointment?.barber}
            </h2>
            <form onSubmit={handlePasswordSubmit}>
              {error && <p className="text-red-500 mb-2">{error}</p>}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="border rounded p-2 w-full mb-4"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPassword("");
                    setError("");
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppointmentList;
