"use strict";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchAutoCustomers,
  createAutoCustomer,
  updateAutoCustomer,
  deleteAutoCustomer,
  pushAutoCustomers,
  fetchCustomers,
} from "../utils/api";
import { toast } from "react-hot-toast";
import DatePicker, { registerLocale } from "react-datepicker";
import el from "date-fns/locale/el";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("el", el);

const BARBER_OPTIONS = [
  { value: "ΛΕΜΟ", label: "ΛΕΜΟ" },
  { value: "ΦΟΡΟΥ", label: "ΦΟΡΟΥ" },
];

const WEEKDAY_OPTIONS = [
  { value: 0, label: "Κυριακή / Sunday" },
  { value: 1, label: "Δευτέρα / Monday" },
  { value: 2, label: "Τρίτη / Tuesday" },
  { value: 3, label: "Τετάρτη / Wednesday" },
  { value: 4, label: "Πέμπτη / Thursday" },
  { value: 5, label: "Παρασκευή / Friday" },
  { value: 6, label: "Σάββατο / Saturday" },
];

const CADENCE_OPTIONS = [
  { value: 1, label: "Κάθε εβδομάδα / Every week" },
  { value: 2, label: "Ανά 2 εβδομάδες / Every 2 weeks" },
  { value: 3, label: "Ανά 3 εβδομάδες / Every 3 weeks" },
  { value: 4, label: "Ανά 4 εβδομάδες / Every 4 weeks" },
  { value: 5, label: "Ανά 5 εβδομάδες / Every 5 weeks" },
];

const emptyForm = {
  customerName: "",
  phoneNumber: "",
  barber: "ΛΕΜΟ",
  weekday: 1,
  timeOfDay: "09:00",
  durationMin: 40,
  cadenceWeeks: 1,
  startFrom: new Date().toISOString().slice(0, 10),
  until: "",
  maxOccurrences: "",
};

const toDateInput = (value) => {
  if (!value) return "";
  try {
    return value.slice(0, 10);
  } catch {
    return "";
  }
};

const AutoCustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formState, setFormState] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [pushOpen, setPushOpen] = useState(false);
  const [pushState, setPushState] = useState({
    from: new Date().toISOString().slice(0, 10),
    to: "",
  });
  const [pushResult, setPushResult] = useState(null);
  const [directory, setDirectory] = useState([]);
  const formRef = useRef(null);
  const pushRef = useRef(null);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await fetchAutoCustomers();
      setCustomers(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Αποτυχία φόρτωσης επαναλαμβανόμενων πελατών.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
    (async () => {
      try {
        const list = await fetchCustomers();
        setDirectory(Array.isArray(list) ? list : []);
      } catch (error) {
        console.error("Failed loading customer directory", error);
      }
    })();
  }, []);

  const directoryByName = useMemo(() => {
    const map = new Map();
    directory.forEach((customer) => {
      if (!customer?.name) return;
      map.set(customer.name.trim().toLowerCase(), customer);
    });
    return map;
  }, [directory]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormState(emptyForm);
    setFormOpen(true);
  };

  const handleEdit = (customer) => {
    setEditingId(customer._id);
    setFormState({
      customerName: customer.customerName || "",
      phoneNumber: customer.phoneNumber || "",
      barber: customer.barber || "ΛΕΜΟ",
      weekday: customer.weekday ?? 1,
      timeOfDay: customer.timeOfDay || "09:00",
      durationMin: customer.durationMin ?? 40,
      cadenceWeeks: customer.cadenceWeeks ?? 1,
      startFrom: toDateInput(customer.startFrom) || new Date().toISOString().slice(0, 10),
      until: toDateInput(customer.until),
      maxOccurrences: customer.maxOccurrences ? String(customer.maxOccurrences) : "",
    });
    setFormOpen(true);
  };

  const handleDelete = async (customer) => {
    if (!window.confirm(`Διαγραφή ${customer.customerName};`)) return;
    try {
      await deleteAutoCustomer(customer._id);
      toast.success("Ο πελάτης αφαιρέθηκε.");
      loadCustomers();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Αποτυχία διαγραφής.");
    }
  };

  const handleFormChange = (field, value) => {
    setFormState((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "customerName") {
        const lookup = directoryByName.get(String(value).trim().toLowerCase());
        if (lookup?.phoneNumber) {
          next.phoneNumber = lookup.phoneNumber;
        }
      }
      return next;
    });
  };

const timeStringToDate = (timeString) => {
  if (!timeString) return null;
  const [hours, minutes] = timeString.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes || 0, 0, 0);
  return date;
};

const formatTimeValue = (date) => {
  if (!date) return "";
  return date.toLocaleTimeString("el-GR", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
};

  const parseFormPayload = () => {
    const payload = {
      customerName: formState.customerName.trim(),
      phoneNumber: formState.phoneNumber.trim(),
      barber: formState.barber,
      weekday: Number(formState.weekday),
      timeOfDay: formState.timeOfDay,
      durationMin: Number(formState.durationMin) || 40,
      cadenceWeeks: Number(formState.cadenceWeeks) || 1,
      startFrom: formState.startFrom ? new Date(formState.startFrom).toISOString() : undefined,
      until: formState.until ? new Date(formState.until).toISOString() : undefined,
      maxOccurrences: formState.maxOccurrences ? Number(formState.maxOccurrences) : undefined,
    };
    return payload;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const payload = parseFormPayload();

    if (!payload.customerName || !payload.phoneNumber) {
      toast.error("Το όνομα και το τηλέφωνο είναι υποχρεωτικά.");
      return;
    }

    try {
      if (editingId) {
        await updateAutoCustomer(editingId, payload);
        toast.success("Ο πελάτης ενημερώθηκε.");
      } else {
        await createAutoCustomer(payload);
        toast.success("Ο πελάτης δημιουργήθηκε.");
      }
      setFormOpen(false);
      setEditingId(null);
      setFormState(emptyForm);
      loadCustomers();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Αποτυχία αποθήκευσης.");
    }
  };

  useEffect(() => {
    if (!formOpen && !pushOpen) return;

    const handleClickOutside = (event) => {
      const target = event.target;
      if (target.closest && target.closest(".react-datepicker")) return;

      if (formOpen && formRef.current && !formRef.current.contains(target)) {
        setFormOpen(false);
        setEditingId(null);
      }

      if (pushOpen && pushRef.current && !pushRef.current.contains(target)) {
        setPushOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [formOpen, pushOpen]);

  const handlePushSubmit = async (e) => {
    e.preventDefault();

    if (!pushState.from) {
      toast.error("Η ημερομηνία έναρξης είναι υποχρεωτική.");
      return;
    }

    try {
      const payload = {
        from: pushState.from,
        to: pushState.to || undefined,
        dryRun: false,
      };
      const response = await pushAutoCustomers(payload);
      const data = response?.data || response;

      setPushResult(data || null);
      toast.success("Οι επαναλαμβανόμενοι πελάτες προστέθηκαν.");

      loadCustomers();
      setPushOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Αποτυχία δημιουργίας ραντεβού.");
    }
  };

  return (
    <div className="h-full overflow-y-auto text-gray-100">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Επαναλαμβανόμενοι Πελάτες</h1>
            <p className="text-sm text-gray-400">
              Διαχειριστείτε τις επαναλαμβανόμενες κρατήσεις και δημιουργήστε ραντεβού μαζικά.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleOpenCreate}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition"
            >
              Νέος Πελάτης
            </button>
            <button
              onClick={() => {
                setPushOpen(true);
                setPushResult(null);
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition"
            >
              Push στο Ημερολόγιο
            </button>
          </div>
        </header>

        <section className="bg-gray-800 border border-gray-700 rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Λίστα Πελατών</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-700 text-gray-200 uppercase text-xs">
                <tr>
                  <th className="px-3 py-2">Πελάτης</th>
                  <th className="px-3 py-2">Barber</th>
                  <th className="px-3 py-2">Ημέρα</th>
                  <th className="px-3 py-2">Ώρα</th>
                  <th className="px-3 py-2">Συχνότητα</th>
                  <th className="px-3 py-2">Από</th>
                  <th className="px-3 py-2">Έως</th>
                  <th className="px-3 py-2 text-right">Ενέργειες</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                      Φόρτωση...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                      Δεν υπάρχουν επαναλαμβανόμενοι πελάτες.
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr
                      key={customer._id}
                      className="border-t border-gray-700 hover:bg-gray-750 transition"
                    >
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-100">{customer.customerName}</div>
                        <div className="text-xs text-gray-400">{customer.phoneNumber}</div>
                      </td>
                      <td className="px-3 py-2">{customer.barber}</td>
                      <td className="px-3 py-2">
                        {
                          WEEKDAY_OPTIONS.find((opt) => opt.value === customer.weekday)?.label ||
                          customer.weekday
                        }
                      </td>
                      <td className="px-3 py-2">{customer.timeOfDay}</td>
                      <td className="px-3 py-2">
                        {CADENCE_OPTIONS.find((opt) => opt.value === customer.cadenceWeeks)?.label ||
                          `${customer.cadenceWeeks} εβδομάδες`}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-400">
                        {customer.startFrom ? toDateInput(customer.startFrom) : "-"}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-400">
                        {customer.until ? toDateInput(customer.until) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right space-x-2">
                        <button
                          className="text-blue-400 hover:text-blue-300 text-sm"
                          onClick={() => handleEdit(customer)}
                        >
                          Επεξεργασία
                        </button>
                        <button
                          className="text-rose-400 hover:text-rose-300 text-sm"
                          onClick={() => handleDelete(customer)}
                        >
                          Διαγραφή
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {pushResult && (
          <section className="bg-gray-800 border border-gray-700 rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Περίληψη Δημιουργίας</h2>
              <div className="text-sm text-gray-400">
                Περίοδος: {" "}
                <span className="text-gray-200">
                  {new Date(pushResult.range.from).toLocaleDateString("el-GR")} &rarr; {" "}
                  {new Date(pushResult.range.to).toLocaleDateString("el-GR")}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <Metric label="Σύνολο" value={pushResult.totals.attempted} />
              <Metric label="Νέα" value={pushResult.totals.inserted} highlight />
              <Metric label="Μετακινήσεις" value={pushResult.totals.moved} />
              <Metric label="Παραλείφθηκαν" value={pushResult.totals.skipped} />
              <Metric label="Υπήρχαν ήδη" value={pushResult.totals.existing} />
              <Metric label="SMS Εστάλησαν" value={pushResult.totals.smsSent} />
              <Metric label="SMS Απέτυχαν" value={pushResult.totals.smsFailed} />
              <Metric label="SMS Παραλείφθηκαν" value={pushResult.totals.smsSkipped} />
            </div>

            {pushResult.summary && pushResult.summary.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-700 text-gray-200 uppercase text-xs">
                    <tr>
                      <th className="px-3 py-2">Πελάτης</th>
                      <th className="px-3 py-2">Barber</th>
                      <th className="px-3 py-2">Προγραμματισμένο</th>
                      <th className="px-3 py-2">Κατάσταση</th>
                      <th className="px-3 py-2">Μετατόπιση</th>
                      <th className="px-3 py-2">SMS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pushResult.summary.map((item, idx) => (
                      <tr key={`${item.autoCustomerId || "unknown"}_${idx}`} className="border-t border-gray-700">
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-100">{item.customerName || "-"}</div>
                        </td>
                        <td className="px-3 py-2">{item.barber}</td>
                        <td className="px-3 py-2 text-xs text-gray-300">
                          {item.scheduledFor
                            ? new Date(item.scheduledFor).toLocaleString("el-GR", {
                                timeZone: "Europe/Athens",
                              })
                            : "-"}
                        </td>
                        <td className="px-3 py-2 capitalize">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-300">
                          {item.shiftMinutes ? `+${item.shiftMinutes}’` : "-"}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-300">
                          {item.smsStatus || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>

      {/* Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div
            ref={formRef}
            className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {editingId ? "Επεξεργασία Πελάτη" : "Νέος Επαναλαμβανόμενος Πελάτης"}
              </h2>
              <button
                onClick={() => {
                  setFormOpen(false);
                  setEditingId(null);
                }}
                className="text-gray-400 hover:text-gray-200 text-xl"
              >
                &times;
              </button>
            </div>
            <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={handleFormSubmit}>
              <label className="flex flex-col text-sm gap-1">
                Όνομα Πελάτη
                <input
                  type="text"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={formState.customerName}
                  onChange={(e) => handleFormChange("customerName", e.target.value)}
                  required
                  list="known-customers"
                />
                <datalist id="known-customers">
                  {directory.map((customer) => (
                    <option key={customer._id || customer.name} value={customer.name}>
                      {customer.phoneNumber}
                    </option>
                  ))}
                </datalist>
              </label>
              <label className="flex flex-col text-sm gap-1">
                Τηλέφωνο
                <input
                  type="tel"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={formState.phoneNumber}
                  onChange={(e) => handleFormChange("phoneNumber", e.target.value)}
                  required
                />
              </label>
              <label className="flex flex-col text-sm gap-1">
                Barber
                <select
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={formState.barber}
                  onChange={(e) => handleFormChange("barber", e.target.value)}
                >
                  {BARBER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-sm gap-1">
                Ημέρα
                <select
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={formState.weekday}
                  onChange={(e) => handleFormChange("weekday", Number(e.target.value))}
                >
                  {WEEKDAY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-sm gap-1">
                Ώρα
                <DatePicker
                  selected={timeStringToDate(formState.timeOfDay)}
                  onChange={(date) => handleFormChange("timeOfDay", formatTimeValue(date))}
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={5}
                  timeCaption="Ώρα"
                  dateFormat="hh:mm aa"
                  locale="el"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#a78bfa]"
                  calendarClassName="!bg-[#161a23] !text-[#ede9fe] !rounded-lg !border !border-[#a78bfa] !shadow-lg"
                  wrapperClassName="w-full"
                  placeholderText="Επιλέξτε ώρα"
                  timeClassName={() => "!bg-[#181a23] !text-[#ede9fe] !border-b !border-[#1f1f2d]"}
                  required
                />
                <span className="text-xs text-gray-500">Εμφανίζεται ως π.μ. / μ.μ.</span>
              </label>
              <label className="flex flex-col text-sm gap-1">
                Διάρκεια (λεπτά)
                <input
                  type="number"
                  min={5}
                  max={600}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={formState.durationMin}
                  onChange={(e) => handleFormChange("durationMin", e.target.value)}
                />
              </label>
              <label className="flex flex-col text-sm gap-1">
                Συχνότητα
                <select
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={formState.cadenceWeeks}
                  onChange={(e) => handleFormChange("cadenceWeeks", Number(e.target.value))}
                >
                  {CADENCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-sm gap-1">
                Πλήθος ραντεβού
                <input
                  type="number"
                  min={1}
                  max={52}
                  placeholder="π.χ. 5"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={formState.maxOccurrences}
                  onChange={(e) => handleFormChange("maxOccurrences", e.target.value)}
                />
                <span className="text-xs text-gray-500">
                  Αφήστε το κενό για απεριόριστη δημιουργία (μέχρι την ημερομηνία λήξης).
                </span>
              </label>
              <label className="flex flex-col text-sm gap-1">
                Έναρξη
                <DatePicker
                  selected={formState.startFrom ? new Date(formState.startFrom) : null}
                  onChange={(date) =>
                    handleFormChange("startFrom", date ? date.toISOString().slice(0, 10) : "")
                  }
                  dateFormat="dd/MM/yyyy"
                  locale="el"
                  className="bg-[#181a23] border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#a78bfa]"
                  calendarClassName="!bg-[#161a23] !text-[#ede9fe] !rounded-lg !border !border-[#a78bfa]"
                  wrapperClassName="w-full"
                  placeholderText="Επιλέξτε ημερομηνία"
                />
              </label>
              <label className="flex flex-col text-sm gap-1">
                Λήξη (προαιρετικό)
                <DatePicker
                  selected={formState.until ? new Date(formState.until) : null}
                  onChange={(date) =>
                    handleFormChange("until", date ? date.toISOString().slice(0, 10) : "")
                  }
                  dateFormat="dd/MM/yyyy"
                  locale="el"
                  className="bg-[#181a23] border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#a78bfa]"
                  calendarClassName="!bg-[#161a23] !text-[#ede9fe] !rounded-lg !border !border-[#a78bfa]"
                  wrapperClassName="w-full"
                  placeholderText="Επιλέξτε ημερομηνία"
                  isClearable
                />
              </label>
              <div className="col-span-1 sm:col-span-2 flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setFormOpen(false);
                    setEditingId(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Άκυρο
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Αποθήκευση
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Push Modal */}
      {pushOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div
            ref={pushRef}
            className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Push στο Ημερολόγιο</h2>
              <button
                onClick={() => setPushOpen(false)}
                className="text-gray-400 hover:text-gray-200 text-xl"
              >
                &times;
              </button>
            </div>
            <form className="space-y-4" onSubmit={handlePushSubmit}>
              <label className="flex flex-col text-sm gap-1">
                Από
                <DatePicker
                  selected={pushState.from ? new Date(pushState.from) : null}
                  onChange={(date) =>
                    setPushState((prev) => ({
                      ...prev,
                      from: date ? date.toISOString().slice(0, 10) : "",
                    }))
                  }
                  dateFormat="dd/MM/yyyy"
                  locale="el"
                  className="bg-[#181a23] border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#a78bfa]"
                  calendarClassName="!bg-[#161a23] !text-[#ede9fe] !rounded-lg !border !border-[#a78bfa]"
                  wrapperClassName="w-full"
                  placeholderText="Επιλέξτε ημερομηνία"
                  required
                />
              </label>
              <label className="flex flex-col text-sm gap-1">
                Έως (προαιρετικό)
                <DatePicker
                  selected={pushState.to ? new Date(pushState.to) : null}
                  onChange={(date) =>
                    setPushState((prev) => ({
                      ...prev,
                      to: date ? date.toISOString().slice(0, 10) : "",
                    }))
                  }
                  dateFormat="dd/MM/yyyy"
                  locale="el"
                  className="bg-[#181a23] border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#a78bfa]"
                  calendarClassName="!bg-[#161a23] !text-[#ede9fe] !rounded-lg !border !border-[#a78bfa]"
                  wrapperClassName="w-full"
                  placeholderText="Επιλέξτε ημερομηνία"
                  isClearable
                />
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPushOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Άκυρο
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white"
                >
                  Εκτέλεση
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const Metric = ({ label, value, highlight = false }) => (
  <div
    className={`p-3 rounded-lg border ${
      highlight ? "border-emerald-500 bg-emerald-500/10 text-emerald-100" : "border-gray-700"
    }`}
  >
    <div className="text-xs uppercase text-gray-400">{label}</div>
    <div className="text-lg font-semibold text-gray-100">{value ?? 0}</div>
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    inserted: "bg-emerald-600",
    moved: "bg-amber-500",
    skipped: "bg-rose-600",
    existing: "bg-indigo-600",
  };
  return (
    <span className={`px-2 py-1 rounded text-xs ${styles[status] || "bg-gray-600"}`}>
      {status}
    </span>
  );
};

export default AutoCustomersPage;
