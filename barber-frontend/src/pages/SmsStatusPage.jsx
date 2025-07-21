import { useEffect, useState } from "react";
import { getSmsStatuses, resendSMS } from "../utils/api";
import { RefreshCcw } from "lucide-react";

const STATUS_COLOR = {
  delivered: "text-green-400",
  sent: "text-gray-400",
  failed: "text-red-500",
  expired: "text-yellow-500",
  rejected: "text-pink-500",
};

const SmsStatusPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState(null);

  useEffect(() => {
    fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
    setLoading(true);
    try {
      const data = await getSmsStatuses();
      setAppointments(data);
    } catch (error) {
      console.error("Αποτυχία ανάκτησης κατάστασης SMS:", error);
    } finally {
      setLoading(false);
    }
  };

  // const handleResend = async (appointmentId) => {
  //   setResendingId(appointmentId);
  //   try {
  //     await resendSMS(appointmentId);
  //     alert("📲 Το SMS επαναστάλθηκε!");
  //     fetchStatuses();
  //   } catch (error) {
  //     alert("❌ Η αποστολή απέτυχε");
  //   } finally {
  //     setResendingId(null);
  //   }
  // };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("el-GR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/Athens",
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 text-white">
      <h1 className="text-3xl font-bold mb-8 tracking-wide text-white">
        🔎 Παρακολούθηση Κατάστασης SMS
      </h1>

      <div className="flex justify-end mb-6">
        <button
          onClick={fetchStatuses}
          className="p-2 bg-purple-800 hover:bg-purple-700 text-white rounded-md shadow"
          title="Επαναφόρτωση"
        >
          <RefreshCcw size={18} />
        </button>
      </div>

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
                <th className="px-4 py-3">Κατάσταση SMS</th>
                <th className="px-4 py-3">Απεστάλη</th>
                <th className="px-4 py-3">Μήνυμα</th>
                <th className="px-4 py-3">Αποστολέας</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt, index) => {
                const { reminder } = appt;
                const status = reminder?.status || "no status";

                return (
                  <tr
                    key={`${appt._id}-${index}`}
                    className="border-t border-gray-700 hover:bg-purple-900/30 transition duration-150"
                  >
                    <td className="px-4 py-3">{appt.customerName}</td>
                    <td className="px-4 py-3">{appt.phoneNumber}</td>
                    <td
                      className={`px-4 py-3 font-semibold ${
                        STATUS_COLOR[status] || "text-gray-500"
                      }`}
                    >
                      {status === "delivered" && "🟢 Παραδόθηκε"}
                      {status === "failed" && "🔴 Απέτυχε"}
                      {status === "sent" && "⚪ Εστάλη"}
                      {status === "expired" && "🟡 Έληξε"}
                      {status === "rejected" && "🔶 Απορρίφθηκε"}
                      {status === "no status" && "–"}
                    </td>
                    <td className="px-4 py-3">
                      {reminder?.sentAt ? formatDateTime(reminder.sentAt) : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-pre-wrap max-w-xs">
                      {reminder?.messageText || "—"}
                    </td>
                    <td className="px-4 py-3">{reminder?.senderId || "—"}</td>
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
