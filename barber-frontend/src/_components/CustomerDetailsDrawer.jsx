import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";
import el from "date-fns/locale/el";
registerLocale("el", el);

import {
  fetchCustomer,
  uploadCustomerPhoto,
  fetchAllCustomerAppointments,
  patchCustomer,
} from "../utils/api";
import {
  FaUserCircle,
  FaChevronDown,
  FaChevronUp,
  FaEdit,
  FaCheck,
  FaTimes,
} from "react-icons/fa";

const CustomerDetailsDrawer = ({ customerId, onClose }) => {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    phoneNumber: "",
    dateOfBirth: "",
  });
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    fetchCustomer(customerId)
      .then((data) => setCustomer(data))
      .finally(() => setLoading(false));
  }, [customerId]);

  useEffect(() => {
    if (customer) {
      setEditData({
        name: customer.name || "",
        phoneNumber: customer.phoneNumber || "",
        dateOfBirth: customer.dateOfBirth
          ? customer.dateOfBirth.slice(0, 10)
          : "",
      });
    }
  }, [customer]);

  useEffect(() => {
    if (!customerId) return;
    setAppointmentsLoading(true);
    fetchAllCustomerAppointments(customerId)
      .then((data) => setAppointments(data))
      .finally(() => setAppointmentsLoading(false));
  }, [customerId]);

  if (!customerId) return null;

  const startEditing = () => setEditing(true);
  const cancelEditing = () => {
    setEditData({
      name: customer.name || "",
      phoneNumber: customer.phoneNumber || "",
      dateOfBirth: customer.dateOfBirth
        ? customer.dateOfBirth.slice(0, 10)
        : "",
    });
    setEditing(false);
  };
  const handleChange = (field, value) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };
  const saveEdit = async () => {
    if (!editData.name || !editData.phoneNumber) {
      toast("Name and phone are required.", { icon: "⚠️" });
      return;
    }

    setSaving(true);
    try {
      // Call PATCH API (see below for helper)
      const updated = await patchCustomer(customerId, editData);
      setCustomer(updated);
      setEditing(false);
    } catch (e) {
      toast.error("Failed to update.");
    } finally {
      setSaving(false); // <---- This is what was missing
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const updatedCustomer = await uploadCustomerPhoto(customerId, file);
      setCustomer(updatedCustomer); // update customer with new photo
    } catch (error) {
      setError("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };
  const dirty =
    editData.name !== (customer?.name || "") ||
    editData.phoneNumber !== (customer?.phoneNumber || "") ||
    editData.dateOfBirth !==
      (customer?.dateOfBirth ? customer.dateOfBirth.slice(0, 10) : "");

  const saveDisabled =
    !dirty || !editData.name || !editData.phoneNumber || saving;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 flex justify-end z-50"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm h-full bg-[#161a23] p-8 overflow-y-auto transition-all border-l border-[#a78bfa] rounded-r-2xl flex flex-col items-center"
        style={{
          boxShadow: "0 8px 40px #0008",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-5 right-5 text-[#7c72a6] hover:text-[#a78bfa] text-2xl"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        {loading ? (
          <div className="text-[#a78bfa] text-center mt-20">Loading...</div>
        ) : !customer ? (
          <div className="text-red-400">Customer not found.</div>
        ) : (
          <div className="w-full">
            {/* Avatar/Profile */}
            <div className="flex flex-col items-center mb-8 w-full">
              {customer.profilePicture ? (
                <img
                  src={customer.profilePicture}
                  alt="Profile"
                  className="w-28 h-28 rounded-full border-4 border-[#a78bfa] shadow-xl mb-3 object-cover"
                />
              ) : (
                <FaUserCircle className="w-28 h-28 text-[#393a50] mb-3" />
              )}

              {/* Upload Button */}
              <label
                className="bg-[#a78bfa] text-[#161a23] font-semibold px-5 py-2 rounded-lg cursor-pointer hover:bg-[#ede9fe] transition mb-2 text-base shadow-md"
                htmlFor="profilePhotoInput"
              >
                {uploading ? "Uploading..." : "Add/Change Photo"}
                <input
                  id="profilePhotoInput"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              {error && (
                <div className="text-[#e879f9] text-xs mt-2">{error}</div>
              )}

              <h2 className="text-2xl font-bold text-[#ede9fe] text-center flex items-center gap-2 w-full justify-center mt-2 tracking-wide">
                {editing ? (
                  <input
                    value={editData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="bg-[#181c2b] text-[#ede9fe] border-b border-[#a78bfa] px-3 py-2 rounded w-full sm:w-44 focus:outline-none focus:ring-2 focus:ring-[#a78bfa]"
                  />
                ) : (
                  <>
                    {customer.name}
                    <button
                      onClick={startEditing}
                      className="ml-2 text-[#a78bfa] hover:text-[#ede9fe]"
                      title="Edit Profile"
                    >
                      <FaEdit />
                    </button>
                  </>
                )}
              </h2>
              <p className="text-l text-[#9ba3ce] text-center flex items-center gap-2 w-full justify-center mt-2 tracking-wide">
                {editing ? (
                  <input
                    value={editData.phoneNumber}
                    onChange={(e) =>
                      handleChange("phoneNumber", e.target.value)
                    }
                    className="bg-[#181c2b] text-[#ede9fe] border-b border-[#a78bfa] px-3 py-2 rounded w-full sm:w-44 focus:outline-none focus:ring-2 focus:ring-[#a78bfa]"
                    type="tel"
                  />
                ) : (
                  customer.phoneNumber
                )}
              </p>

              {/* Birthday Row */}
              <div className="w-full flex items-center justify-between bg-[#23263b] border border-[#a78bfa] rounded-xl px-5 py-3 mt-4 mb-5">
                <span className="font-medium text-[#ede9fe]">Birthday:</span>
                {editing ? (
                  <DatePicker
                    selected={
                      editData.dateOfBirth
                        ? new Date(editData.dateOfBirth)
                        : null
                    }
                    onChange={(date) =>
                      handleChange(
                        "dateOfBirth",
                        date ? date.toISOString().slice(0, 10) : ""
                      )
                    }
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Επιλέξτε ημερομηνία"
                    showYearDropdown
                    scrollableYearDropdown
                    yearDropdownItemNumber={120}
                    minDate={new Date(1920, 0, 1)}
                    maxDate={new Date()}
                    className="w-full sm:w-44"
                    calendarClassName="!bg-[#161a23] !text-[#ede9fe] !rounded-lg !border !border-[#a78bfa]"
                    locale="el"
                    weekStartsOn={1}
                  />
                ) : customer.dateOfBirth ? (
                  <span className="font-semibold text-[#a78bfa]">
                    {new Date(customer.dateOfBirth).toLocaleDateString("el-GR")}
                  </span>
                ) : (
                  <button onClick={startEditing} className="birthday-link">
                    Add Birthday
                  </button>
                )}
              </div>
            </div>

            {/* Save/Cancel controls */}
            {editing && (
              <div className="flex justify-center gap-3 mb-4">
                <button
                  onClick={saveEdit}
                  disabled={saveDisabled}
                  className={`bg-[#a78bfa] text-[#161a23] font-bold px-6 py-2 rounded-lg hover:bg-[#ede9fe] hover:text-[#181c2b] shadow transition flex items-center gap-2 ${
                    saveDisabled ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <FaCheck /> {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={cancelEditing}
                  className="bg-[#393a50] text-[#ede9fe] font-bold px-6 py-2 rounded-lg hover:bg-[#23263b] shadow transition flex items-center gap-2"
                >
                  <FaTimes /> Cancel
                </button>
              </div>
            )}

            {/* Appointment History Dropdown */}
            <div className="w-full mt-2">
              <button
                onClick={() => setHistoryOpen((prev) => !prev)}
                className="flex items-center justify-between w-full bg-[#a78bfa] px-6 py-4 rounded-xl cursor-pointer border-0 shadow-md text-lg font-bold text-[#161a23] tracking-wide transition"
              >
                Ιστορικό ραντεβού
                <span className="ml-3 font-extrabold">
                  ({appointments.length})
                </span>
                {historyOpen ? <FaChevronUp /> : <FaChevronDown />}
              </button>
              {historyOpen && (
                <div className="bg-[#161a23] rounded-b-xl border border-t-0 border-[#a78bfa] py-1">
                  {appointmentsLoading ? (
                    <div className="text-[#a78bfa] text-center py-3">
                      Loading...
                    </div>
                  ) : appointments.length === 0 ? (
                    <div className="text-[#7c72a6] text-center py-3">
                      No appointments found.
                    </div>
                  ) : (
                    <ul className="divide-y divide-[#23263b]">
                      {appointments.map((appt, idx) => (
                        <li
                          key={idx}
                          className="py-2 flex justify-between items-center px-4"
                        >
                          <span className="text-[#ede9fe]">
                            {new Date(appt.appointmentDateTime).toLocaleString(
                              "el-GR",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                          <span
                            className={`font-bold ml-2 ${
                              appt.barber === "ΛΕΜΟ"
                                ? "text-[#a78bfa]"
                                : "text-orange-400"
                            }`}
                          >
                            {appt.barber}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDetailsDrawer;
