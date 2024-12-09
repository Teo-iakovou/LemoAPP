const API_BASE_URL = "http://localhost:5001/api";

export const createAppointment = async (appointmentData) => {
  const response = await fetch(`${API_BASE_URL}/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(appointmentData),
  });
  return response.json();
};

export const fetchCustomers = async () => {
  try {
    const response = await fetch("/api/customers");
    if (!response.ok) {
      throw new Error("Failed to fetch customers");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching customers:", error);
    return [];
  }
};

export const fetchAppointments = async () => {
  const response = await fetch(`${API_BASE_URL}/appointments`);
  return response.json();
};
