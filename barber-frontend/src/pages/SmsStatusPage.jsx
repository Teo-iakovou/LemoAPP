import { useEffect, useState } from "react";
import { getSmsStatuses, resendSMS } from "../utils/api";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import { RefreshCcw } from "lucide-react";

const STATUS_COLOR = {
  delivered: "text-green-400",
  sent: "text-gray-400",
  failed: "text-red-500",
  expired: "text-yellow-500",
};

const SmsStatusPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  useEffect(() => {
    const formattedDate = selectedDate.toISOString().split("T")[0];
    fetchStatuses(formattedDate);
  }, [selectedDate]);

  const fetchStatuses = async (date) => {
    setLoading(true);
    try {
      const data = await getSmsStatuses(date);
      setAppointments(data);
    } catch (error) {
      console.error("Αποτυχία ανάκτησης κατάστασης SMS:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (appointmentId) => {
    setResendingId(appointmentId);
    try {
      await resendSMS(appointmentId);
      alert("📲 Το SMS επαναστάλθηκε!");
      const date = selectedDate.toISOString().split("T")[0];
      fetchStatuses(date);
    } catch (error) {
      alert("❌ Η αποστολή απέτυχε");
    } finally {
      setResendingId(null);
    }
  };

  const getLatestReminder = (reminders) => {
    if (!reminders || reminders.length === 0) return null;
    return reminders[reminders.length - 1];
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("el-GR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Athens",
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 text-white">
      <h1 className="text-3xl font-bold mb-8 tracking-wide text-white">
        🔎 Παρακολούθηση Κατάστασης SMS
      </h1>

      {/* Ημερομηνία */}
      <div className="flex items-center justify-between mb-6">
        <Flatpickr
          value={selectedDate}
          options={{
            dateFormat: "d/m/Y",
            locale: "el",
          }}
          onChange={([date]) => {
            if (date) {
              setSelectedDate(date);
            }
          }}
          className="px-3 py-2 rounded-lg text-black w-full sm:w-auto"
        />
        <button
          onClick={() =>
            fetchStatuses(selectedDate.toISOString().split("T")[0])
          }
          className="mb-4 p-2 bg-purple-800 hover:bg-purple-700 text-white rounded-md shadow"
          title="Επαναφόρτωση"
        >
          <RefreshCcw size={18} />
        </button>
      </div>

      {/* Πίνακας */}
      {loading ? (
        <p className="text-gray-300">Φόρτωση δεδομένων...</p>
      ) : appointments.length === 0 ? (
        <p className="text-gray-400">Δεν βρέθηκαν αποτελέσματα.</p>
      ) : (
        <div className="overflow-y-auto max-h-[500px] rounded-lg shadow-lg border border-purple-800">
          <table className="min-w-full text-sm text-left bg-[#0d1117]">
            <thead className="bg-purple-950 text-white text-md uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Πελάτης</th>
                <th className="px-4 py-3">Τηλέφωνο</th>
                <th className="px-4 py-3">Ραντεβού</th>
                <th className="px-4 py-3">Κατάσταση SMS</th>
                <th className="px-4 py-3">Μήνυμα</th>
                <th className="px-4 py-3">Αποστολέας</th>
                <th className="px-4 py-3">Προσπάθειες</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => {
                const latest = getLatestReminder(appt.reminders);
                const status = latest?.status || "no status";
                return (
                  <tr
                    key={appt._id}
                    className="border-t border-gray-700 hover:bg-purple-900/30 transition duration-150"
                  >
                    <td className="px-4 py-3 font-medium">
                      {appt.customerName}
                    </td>
                    <td className="px-4 py-3">{appt.phoneNumber}</td>
                    <td className="px-4 py-3">
                      {formatDateTime(appt.appointmentDateTime)}
                    </td>
                    <td
                      className={`px-4 py-3 font-semibold ${
                        STATUS_COLOR[status] || "text-gray-500"
                      }`}
                    >
                      {status === "delivered" && "🟢 Παραδόθηκε"}
                      {status === "failed" && "🔴 Απέτυχε"}
                      {status === "sent" && "⚪ Εστάλη"}
                      {status === "expired" && "🟡 Έληξε"}
                      {status === "no status" && "–"}
                    </td>
                    <td className="px-4 py-3 max-w-xs whitespace-pre-wrap overflow-y-auto">
                      {latest?.messageText || "—"}
                    </td>
                    <td className="px-4 py-3">{latest?.senderId || "—"}</td>
                    <td className="px-4 py-3">
                      {["failed", "expired"].includes(status) && (
                        <button
                          disabled={resendingId === appt._id}
                          onClick={() => handleResend(appt._id)}
                          className="text-blue-400 hover:text-blue-500 hover:underline transition disabled:opacity-50"
                        >
                          {resendingId === appt._id
                            ? "Επαναποστολή..."
                            : "🔁 Επανάληψη"}
                        </button>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        Προσπάθειες: {latest?.retryCount || 0}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SmsStatusPage;
