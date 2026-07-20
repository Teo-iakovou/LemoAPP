const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5002/api";

let on401Handler = null;
export const setOn401Handler = (fn) => { on401Handler = fn; };
export async function apiFetch(url, options = {}) {
  // Auto-attach the admin JWT so protected routes work without every call site
  // wiring the header. If the stored token is expired, end the session (logout +
  // redirect) rather than sending a stale token to a newly-protected route.
  const token = localStorage.getItem("token");
  if (token && isTokenExpired(token)) {
    endSessionIfExpired(); // clears token + fires on401Handler
  } else if (token) {
    const headers = new Headers(options.headers || {});
    if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
    options = { ...options, headers };
  }
  const res = await fetch(url, options);
  // Only react to 401 while a token is still present, so we don't double-fire the
  // logout after endSessionIfExpired already cleared it above.
  if (res.status === 401 && on401Handler && localStorage.getItem("token")) on401Handler();
  return res;
}

// --- Session / token helpers ------------------------------------------------
// Decode a JWT payload (no signature check — just to read `exp` on the client).
export function decodeJwt(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// True if the token is missing an exp, unreadable, or expired (within `skewSeconds`).
export function isTokenExpired(token, skewSeconds = 30) {
  const payload = token && decodeJwt(token);
  if (!payload || typeof payload.exp !== "number") return true;
  return Date.now() >= (payload.exp - skewSeconds) * 1000;
}

// Proactively end an expired session: clear the token and fire the global 401
// handler (logout + message). Returns true if the session had lapsed.
export function endSessionIfExpired() {
  const token = localStorage.getItem("token");
  if (token && isTokenExpired(token)) {
    localStorage.removeItem("token");
    if (on401Handler) on401Handler();
    return true;
  }
  return false;
}

// Fetch the signed-in admin user (id, username, dob, role) from the server.
// The role returned here is the authoritative DB value; the copy inside the JWT
// is only a hint used to render instantly without a flash. Neither is a security
// boundary — the backend re-checks the DB role on every protected route.
export const fetchMe = async () => {
  const response = await apiFetch(`${API_BASE_URL}/auth/me`);
  if (!response.ok) {
    throw new Error("Failed to fetch current user.");
  }
  const data = await response.json();
  return data?.user || null;
};

export const fetchCustomerAppointments = async (customerId) => {
  try {
    const res = await apiFetch(
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
  const response = await apiFetch(`${API_BASE_URL}/customers`, {
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

  const response = await apiFetch(
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
    const response = await apiFetch(`${API_BASE_URL}/customers/${customerId}`);
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
  const response = await apiFetch(
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
  const response = await apiFetch(
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
    const response = await apiFetch(`${API_BASE_URL}/customers`);
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
    const response = await apiFetch(
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
    const response = await apiFetch(`${API_BASE_URL}/appointments/upcoming`);
    if (!response.ok) {
      throw new Error("Failed to fetch upcoming appointments.");
    }
    return await response.json(); // returns just an array
  } catch (error) {
    console.error("Error fetching upcoming appointments:", error);
    return []; // Fallback
  }
};

// Locks from the last 12 months onward (past + future), for the Bulk Locks grouping
// view. Includes lockReason so the stored "ΜΟΝΙΜΟ" tag is available to the client.
export const fetchRecentLocks = async () => {
  try {
    const response = await apiFetch(`${API_BASE_URL}/appointments/locks`);
    if (!response.ok) {
      throw new Error("Failed to fetch locks.");
    }
    return await response.json(); // returns just an array
  } catch (error) {
    console.error("Error fetching locks:", error);
    return []; // Fallback
  }
};

export const fetchPastAppointments = async (page = 1, limit = 100) => {
  try {
    const response = await apiFetch(
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

export const updateAppointment = async (appointmentId, updatedData, token) => {
  try {
    const response = await apiFetch(
      `${API_BASE_URL}/appointments/${appointmentId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
  const res = await apiFetch(`${API_BASE_URL}/waitingList`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch the waiting list.");
  }
  return res.json();
}

// Add a customer to the waiting list
export async function addToWaitingList(customerId) {
  const response = await apiFetch(`${API_BASE_URL}/waitingList`, {
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

// ---- Recurring / Auto Customers ----

export const fetchAutoCustomers = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_BASE_URL}/auto-customers?${query}` : `${API_BASE_URL}/auto-customers`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error("Failed to fetch recurring customers.");
  const data = await res.json();
  return data?.data ?? [];
};

export const fetchAutoCustomerLastAppointments = async (autoCustomerIds = [], options = {}) => {
  const params = new URLSearchParams();
  if (Array.isArray(autoCustomerIds) && autoCustomerIds.length) {
    params.set("ids", autoCustomerIds.join(","));
  }
  if (options.autoOnly) {
    params.set("autoOnly", "true");
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await apiFetch(`${API_BASE_URL}/auto-customers/last-appointments${query}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || "Failed to fetch last auto customer appointments.");
  }
  return data?.data ?? {};
};

export const createAutoCustomer = async (payload) => {
  const res = await apiFetch(`${API_BASE_URL}/auto-customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.errors?.join(" ") || error.message || "Failed to create recurring customer.");
  }
  return res.json();
};

export const updateAutoCustomer = async (id, payload) => {
  const res = await apiFetch(`${API_BASE_URL}/auto-customers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.errors?.join(" ") || error.message || "Failed to update recurring customer.");
  }
  return res.json();
};

export const deleteAutoCustomer = async (id) => {
  const res = await apiFetch(`${API_BASE_URL}/auto-customers/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Failed to delete recurring customer.");
  }
  return res.json();
};

export const pushAutoCustomers = async (payload) => {
  const res = await apiFetch(`${API_BASE_URL}/auto-customers/push`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Failed to push recurring customers to calendar.");
  }
  return res.json();
};

export const fetchAutoCustomerBatches = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_BASE_URL}/auto-customers/batches?${query}` : `${API_BASE_URL}/auto-customers/batches`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error("Failed to fetch auto-generation history.");
  return res.json();
};

export const fetchAutoCustomerBatch = async (batchId) => {
  const res = await apiFetch(`${API_BASE_URL}/auto-customers/batches/${batchId}`);
  if (!res.ok) throw new Error("Failed to fetch batch details.");
  return res.json();
};

export const undoAutoCustomerBatch = async (batchId, reason) => {
  const res = await apiFetch(`${API_BASE_URL}/auto-customers/batches/${batchId}/undo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reason ? { reason } : {}),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Failed to undo batch.");
  }
  return res.json();
};

export const overrideAutoCustomerOccurrence = async (id, payload) => {
  const res = await apiFetch(`${API_BASE_URL}/auto-customers/${id}/occurrences/override`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Failed to override occurrence.");
  }
  return res.json();
};

export const skipAutoCustomerOccurrence = async (id, payload) => {
  const res = await apiFetch(`${API_BASE_URL}/auto-customers/${id}/occurrences/skip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Failed to skip occurrence.");
  }
  return res.json();
};

// Remove a customer from the waiting list
export async function removeFromWaitingList(id) {
  const response = await apiFetch(`${API_BASE_URL}/waitingList/${id}`, {
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

  const response = await apiFetch(`${API_BASE_URL}/waitingList/${id}/note`, {
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
  const res = await apiFetch(`${API_BASE_URL}/sms-statuses`);
  if (!res.ok) throw new Error("Failed to fetch SMS statuses");
  return res.json();
}

export async function resendSMS(appointmentId) {
  const res = await apiFetch(`${API_BASE_URL}/sms-resend/${appointmentId}`, {
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
  // Proactively surface an expired admin session instead of silently sending a
  // stale token (which the backend would treat as public → confusing 409s).
  if (endSessionIfExpired()) {
    throw new Error("SESSION_EXPIRED");
  }
  // Attach the logged-in barber's token so the backend can recognise staff
  // bookings (barbers may book on top of a "lock"; the public site may not).
  const token = localStorage.getItem("token");
  const response = await apiFetch(`${API_BASE_URL}/appointments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(appointmentData),
  });

  if (!response.ok) {
    throw new Error("Failed to create appointment.");
  }

  return response.json();
};

export const deleteAppointment = async (appointmentId, token) => {
  const response = await apiFetch(`${API_BASE_URL}/appointments/${appointmentId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to delete appointment.");
  }

  return response.json();
};

export const fetchAllCustomerAppointments = async (customerId) => {
  try {
    const res = await apiFetch(
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
  const res = await apiFetch(`${API_BASE_URL}/customers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update customer");
  return res.json();
};
