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
  console.log("📤 API Request Sent with Data:", updatedData); // ✅ Debugging

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
      console.error("❌ Error Response from API:", errorData);
      throw new Error(errorData.message || "Failed to update the appointment.");
    }

    const updatedAppointment = await response.json();
    console.log("✅ API Response - Updated Appointment:", updatedAppointment); // 🔥 Debugging

    return updatedAppointment;
  } catch (error) {
    console.error("❌ Error updating appointment:", error.message);
    throw error;
  }
};

// Fetch the entire waiting list
export async function fetchWaitingList() {
  const res = await fetch(`${API_BASE_URL}/waitingList`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch the waiting list.");
  }
  return res.json();
}

// Add a customer to the waiting list
export async function addToWaitingList(customerId) {
  const response = await fetch(`${API_BASE_URL}/waitingList`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to add to waiting list.");
  }

  return response.json();
}

// Remove a customer from the waiting list
export async function removeFromWaitingList(id) {
  const response = await fetch(`${API_BASE_URL}/waitingList/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to remove from waiting list.");
  }
  return response.json();
}
export async function updateWaitingListNote(id, note) {
  console.log("Updating note for ID:", id, "Note:", note);

  const response = await fetch(`${API_BASE_URL}/waitingList/${id}/note`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(note),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Failed to update note:", error);
    throw new Error(error.error || "Failed to update note");
  }

  return response.json();
}
