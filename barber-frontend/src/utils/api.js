const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5002/api";

export const fetchCustomerAppointments = async (customerId) => {
  try {
    const res = await fetch(
      `${API_BASE_URL}/customers/${customerId}/appointments`
    );
    if (!res.ok) throw new Error("Failed to fetch appointment history.");
    return await res.json(); // Array of appointments
  } catch (error) {
    console.error("Error fetching appointment history:", error);
    return [];
  }
};

// ADD NEW CUSTOMER
export const addCustomer = async (customerData) => {
  const response = await fetch(`${API_BASE_URL}/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(customerData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to add customer.");
  }

  return response.json(); // returns the created customer object
};

export const uploadCustomerPhoto = async (customerId, file) => {
  const formData = new FormData();
  formData.append("profilePicture", file);

  const response = await fetch(
    `${API_BASE_URL}/customers/${customerId}/profile-picture`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error("Failed to upload profile picture.");
  }
  return await response.json(); // returns the updated customer object
};

export const fetchCustomer = async (customerId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/customers/${customerId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch customer.");
    }
    return await response.json(); // Single customer object
  } catch (error) {
    console.error("Error fetching customer:", error);
    return null;
  }
};

export const fetchCustomerCounts = async (month, year, token) => {
  const response = await fetch(
    `${API_BASE_URL}/customers/CustomerCounts?month=${month}&year=${year}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) {
    throw new Error("Failed to fetch customer counts.");
  }
  return response.json();
};


export const fetchWeeklyCustomerCounts = async (week, year, token) => {
  const response = await fetch(
    `${API_BASE_URL}/customers/WeeklyCustomerCounts?week=${week}&year=${year}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) {
    throw new Error("Failed to fetch weekly customer counts.");
  }
  return response.json();
};


export const fetchCustomers = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/customers`);
    if (!response.ok) {
      throw new Error("Failed to fetch customers.");
    }
    return await response.json(); // Just an array
  } catch (error) {
    console.error("Error fetching customers:", error);
    return [];
  }
};

export const fetchAppointments = async (page = 1, limit = 100) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/appointments?page=${page}&limit=${limit}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch appointments.");
    }
    return await response.json(); // includes appointments, total, page, limit
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return { appointments: [] }; // Fallback shape to avoid destructure errors
  }
};

export const fetchUpcomingAppointments = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/appointments/upcoming`);
    if (!response.ok) {
      throw new Error("Failed to fetch upcoming appointments.");
    }
    return await response.json(); // returns just an array
  } catch (error) {
    console.error("Error fetching upcoming appointments:", error);
    return []; // Fallback
  }
};

export const fetchPastAppointments = async (page = 1, limit = 100) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/appointments/past?page=${page}&limit=${limit}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch past appointments.");
    }
    return await response.json(); // returns { appointments, total, page, limit }
  } catch (error) {
    console.error("Error fetching past appointments:", error);
    return { appointments: [] }; // Fallback
  }
};

export const updateAppointment = async (appointmentId, updatedData) => {
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
export async function getSmsStatuses() {
  const res = await fetch(`${API_BASE_URL}/sms-statuses`);
  if (!res.ok) throw new Error("Failed to fetch SMS statuses");
  return res.json();
}

export async function resendSMS(appointmentId) {
  const res = await fetch(`${API_BASE_URL}/sms-resend/${appointmentId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const result = await res.json();
  if (!res.ok) throw new Error(result.error || "Resend failed");
  return result;
}
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

export const fetchAllCustomerAppointments = async (customerId) => {
  try {
    const res = await fetch(
      `${API_BASE_URL}/customers/${customerId}/all-appointments`
    );
    if (!res.ok) throw new Error("Failed to fetch all appointment history.");
    return await res.json();
  } catch (error) {
    console.error("Error fetching all appointment history:", error);
    return [];
  }
};

// PATCH single customer
export const patchCustomer = async (id, data) => {
  const res = await fetch(`${API_BASE_URL}/customers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update customer");
  return res.json();
};
