const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";
export const createAppointment = async (appointmentData) => {
  const response = await fetch(`${API_BASE_URL}/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(appointmentData),
  });

  if (!response.ok) {
    throw new Error("Failed to create appointment.");
  }

  return response.json();
};

export const loginUser = async (credentials) => {
  const response = await fetch(`${API_BASE_URL}/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    throw new Error("Failed to login.");
  }

  return response.json(); // Returns the JWT token
};

export const fetchCustomers = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/customers`);
    if (!response.ok) {
      throw new Error("Failed to fetch customers.");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching customers:", error);
    return [];
  }
};

export const fetchAppointments = async () => {
  const response = await fetch(`${API_BASE_URL}/appointments`);
  if (!response.ok) {
    throw new Error("Failed to fetch appointments.");
  }
  return response.json();
};
export const updateAppointment = async (appointmentId, updatedData) => {
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

  try {
    const response = await fetch(
      `${API_BASE_URL}/appointments/${appointmentId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error Response from API:", errorData);
      throw new Error(errorData.message || "Failed to update the appointment.");
    }

    const updatedAppointment = await response.json();
    console.log("API Response:", updatedAppointment); // Debug API response
    return updatedAppointment;
  } catch (error) {
    console.error("Error updating appointment:", error.message);
    throw error;
  }
};
