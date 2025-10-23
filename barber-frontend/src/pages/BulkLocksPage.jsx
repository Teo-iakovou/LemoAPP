import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { FiPlus } from "react-icons/fi";
import {
  createAppointment,
  deleteAppointment,
  fetchUpcomingAppointments,
  updateAppointment,
} from "../utils/api";
import "flatpickr/dist/themes/dark.css";
import {
  BARBER_OPTIONS,
  CREATED_LOCKS_STORAGE_KEY,
  DURATION_OPTIONS,
  REPEAT_WEEKS,
  WEEKDAY_OPTIONS,
  addDays,
  aggregateLocks,
  createModalSlot,
  generateId,
  getLockRowKey,
  getNextDateForWeekday,
  toTimeString,
} from "./BulkLocksPage/utils";
import PendingLocksTable from "./BulkLocksPage/PendingLocksTable";
import CreatedLocksSection from "./BulkLocksPage/CreatedLocksSection";
import ResultsSection from "./BulkLocksPage/ResultsSection";
import BulkLockModal from "./BulkLocksPage/BulkLockModal";

const BulkLocksPage = () => {
  const [locks, setLocks] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const defaultBarber = BARBER_OPTIONS[0]?.value ?? "";
  const [modalData, setModalData] = useState({
    weekday: WEEKDAY_OPTIONS[0]?.value ?? 1,
    barber: defaultBarber,
    slots: [createModalSlot()],
    repeatWeekly: false,
  });
  const [editingId, setEditingId] = useState(null);
  const [editingValues, setEditingValues] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState([]);
  const [unlocking, setUnlocking] = useState(false);
  const [createdLocks, setCreatedLocks] = useState([]);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [loadingCalendarLocks, setLoadingCalendarLocks] = useState(false);
  const [calendarError, setCalendarError] = useState("");
  const [pendingExpandedIds, setPendingExpandedIds] = useState(() => new Set());
  const [expandedLockIds, setExpandedLockIds] = useState(() => new Set());
  const [savedEditState, setSavedEditState] = useState(null);
  const [updatingSaved, setUpdatingSaved] = useState(false);
  const [unlockingOccurrenceId, setUnlockingOccurrenceId] = useState(null);

  const sortedLocks = useMemo(() => {
    const next = [...locks];
    next.sort(
      (a, b) =>
        a.date - b.date ||
        a.time.localeCompare(b.time) ||
        a.barber.localeCompare(b.barber, "el-GR")
    );
    return next;
  }, [locks]);

  const pendingGroupKeys = useMemo(() => {
    const counts = new Map();
    sortedLocks.forEach((lock) => {
      if (!lock || !lock.recurring) return;
      const weekday =
        lock.weekday ??
        (lock.date instanceof Date ? lock.date.getDay() : undefined);
      if (weekday === undefined) return;
      const key = `${lock.barber || "unknown"}-${weekday}-${lock.time}-${lock.duration}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return new Set(
      Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([key]) => key)
    );
  }, [sortedLocks]);

  const displayLocks = createdLocks;

  const refreshCalendarLocks = async () => {
    setLoadingCalendarLocks(true);
    setCalendarError("");
    try {
      const appointments = await fetchUpcomingAppointments();
      const locks = (appointments || [])
        .filter((appointment) => appointment.type === "lock")
        .map((appointment) => {
          const date = new Date(appointment.appointmentDateTime);
          return {
            uid: appointment._id || appointment.id || generateId(),
            responseId: appointment._id || appointment.id || null,
            date,
            time: toTimeString(date),
            duration: appointment.duration || 40,
            barber: appointment.barber || "",
            recurring: Boolean(
              appointment.recurring || appointment.lockReason === "ΜΟΝΙΜΟ"
            ),
            weekday: date.getDay(),
            lockReason: appointment.lockReason,
          };
        })
        .sort((a, b) => a.date - b.date || a.time.localeCompare(b.time));
      const activeLocks = locks.filter((lock) => lock.responseId);
      setCreatedLocks(aggregateLocks(activeLocks));
    } catch (error) {
      console.error("Failed to load calendar locks", error);
      setCalendarError(
        error?.message || "Αποτυχία φόρτωσης κλειδωμάτων από το ημερολόγιο."
      );
    } finally {
      setLoadingCalendarLocks(false);
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CREATED_LOCKS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const restored = parsed
            .map((item) => ({
              ...item,
              uid: item.uid || item.responseIds?.[0] || generateId(),
              startDate: item.startDate ? new Date(item.startDate) : new Date(),
              endDate: item.endDate ? new Date(item.endDate) : new Date(),
              occurrences: Array.isArray(item.occurrences)
                ? item.occurrences
                    .map((occurrence) => ({
                      ...occurrence,
                      startDate: occurrence.startDate
                        ? new Date(occurrence.startDate)
                        : null,
                      endDate: occurrence.endDate
                        ? new Date(occurrence.endDate)
                        : null,
                    }))
                    .filter((occurrence) => {
                      if (!(occurrence.startDate instanceof Date)) return false;
                      return !Number.isNaN(occurrence.startDate.getTime());
                    })
                : [],
            }))
            .filter((item) => item.time && item.barber);
          setCreatedLocks(restored);
        }
      }
    } catch (error) {
      console.error("Failed to load stored locks", error);
    } finally {
      setStorageLoaded(true);
    }
  }, []);

  useEffect(() => {
    setPendingExpandedIds((prev) => {
      if (!(prev instanceof Set)) {
        return new Set();
      }
      if (prev.size === 0) {
        return prev;
      }
      const validKeys = new Set(pendingGroupKeys);
      let changed = false;
      const next = new Set();
      prev.forEach((value) => {
        if (validKeys.has(value)) {
          next.add(value);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [pendingGroupKeys]);

  const clearPendingLocks = () => {
    setLocks([]);
    setEditingId(null);
    setEditingValues(null);
    setPendingExpandedIds(new Set());
  };

  useEffect(() => {
    if (!storageLoaded) return;
    try {
      const payload = createdLocks
        .filter((item) => item.responseIds && item.responseIds.length > 0)
        .map((item) => ({
          ...item,
          startDate:
            item.startDate instanceof Date
              ? item.startDate.toISOString()
              : item.startDate,
          endDate:
            item.endDate instanceof Date
              ? item.endDate.toISOString()
              : item.endDate,
          occurrences: Array.isArray(item.occurrences)
            ? item.occurrences.map((occurrence) => ({
                ...occurrence,
                startDate:
                  occurrence.startDate instanceof Date
                    ? occurrence.startDate.toISOString()
                    : occurrence.startDate,
                endDate:
                  occurrence.endDate instanceof Date
                    ? occurrence.endDate.toISOString()
                    : occurrence.endDate,
              }))
            : [],
        }));
      localStorage.setItem(
        CREATED_LOCKS_STORAGE_KEY,
        JSON.stringify(payload)
      );
    } catch (error) {
      console.error("Failed to persist locks", error);
    }
  }, [createdLocks, storageLoaded]);

  useEffect(() => {
    refreshCalendarLocks();
  }, []);

  useEffect(() => {
    setExpandedLockIds((prev) => {
      if (!(prev instanceof Set)) {
        return new Set();
      }
      if (prev.size === 0) {
        return prev;
      }
      const validKeys = new Set(createdLocks.map((item) => getLockRowKey(item)));
      let hasChanges = false;
      const next = new Set();
      prev.forEach((value) => {
        if (validKeys.has(value)) {
          next.add(value);
        } else {
          hasChanges = true;
        }
      });
      return hasChanges ? next : prev;
    });
  }, [createdLocks]);

  useEffect(() => {
    if (!savedEditState?.responseId) return;
    const exists = createdLocks.some((lock) =>
      Array.isArray(lock.responseIds)
        ? lock.responseIds.includes(savedEditState.responseId)
        : false
    );
    if (!exists) {
      setSavedEditState(null);
    }
  }, [createdLocks, savedEditState]);

  const resetModal = () => {
    setModalData({
      weekday: WEEKDAY_OPTIONS[0]?.value ?? 1,
      barber: defaultBarber,
      slots: [createModalSlot()],
      repeatWeekly: false,
    });
  };

  const closeModal = () => {
    setModalOpen(false);
    resetModal();
  };

  const openModal = (initialData) => {
    const baseBarber = initialData?.barber ?? defaultBarber;
    const derivedWeekday =
      initialData?.weekday ??
      (initialData?.date instanceof Date
        ? initialData.date.getDay()
        : WEEKDAY_OPTIONS[0]?.value ?? 1);
    const slots =
      initialData?.slots?.length > 0
        ? initialData.slots.map((slot) =>
            createModalSlot(slot.time, slot.duration)
          )
        : [
            createModalSlot(
              initialData?.time ?? "09:00",
              initialData?.duration ?? 40
            ),
          ];

    setModalData({
      weekday: derivedWeekday,
      barber: baseBarber,
      slots,
      repeatWeekly: Boolean(initialData?.repeatWeekly),
    });
    setModalOpen(true);
  };

  const selectModalWeekday = (weekday) => {
    setModalData((prev) => ({
      ...prev,
      weekday,
    }));
  };

  const selectModalBarber = (barber) => {
    setModalData((prev) => ({
      ...prev,
      barber,
    }));
  };

  const toggleModalRepeat = (repeatWeekly) => {
    setModalData((prev) => ({
      ...prev,
      repeatWeekly,
    }));
  };

  const addModalSlot = () => {
    setModalData((prev) => {
      const last = prev.slots[prev.slots.length - 1];
      return {
        ...prev,
        slots: [
          ...prev.slots,
          createModalSlot(last?.time ?? "09:00", last?.duration ?? 40),
        ],
      };
    });
  };

  const updateModalSlot = (id, field, value) => {
    setModalData((prev) => ({
      ...prev,
      slots: prev.slots.map((slot) =>
        slot.id === id
          ? {
              ...slot,
              [field]: field === "duration" ? Number(value) : value,
            }
          : slot
      ),
    }));
  };

  const removeModalSlot = (id) => {
    setModalData((prev) => {
      if (prev.slots.length === 1) return prev;
      return {
        ...prev,
        slots: prev.slots.filter((slot) => slot.id !== id),
      };
    });
  };

  const handleModalAdd = () => {
    const { weekday, barber, slots, repeatWeekly } = modalData;
    if (weekday === undefined || weekday === null) {
      toast.error("Επιλέξτε ημέρα.");
      return;
    }
    if (!barber) {
      toast.error("Επιλέξτε κουρέα.");
      return;
    }
    if (!slots || slots.length === 0) {
      toast.error("Προσθέστε τουλάχιστον μία ώρα.");
      return;
    }
    if (slots.some((slot) => !slot.time || !slot.duration)) {
      toast.error("Συμπληρώστε όλες τις ώρες και διάρκειες.");
      return;
    }

    const baseDate = getNextDateForWeekday(weekday);
    const locksToAdd = [];

    slots.forEach((slot) => {
      for (let offset = 0; offset < (repeatWeekly ? REPEAT_WEEKS : 1); offset += 1) {
        const dateInstance = addDays(baseDate, offset * 7);
        locksToAdd.push({
          id: generateId(),
          date: dateInstance,
          time: slot.time,
          duration: slot.duration,
          barber,
          recurring: repeatWeekly,
          weekday,
          lockReason: repeatWeekly ? "ΜΟΝΙΜΟ" : undefined,
        });
      }
    });

    setLocks((prev) => [...prev, ...locksToAdd]);
    closeModal();
  };

  const handleDeleteLock = (id) => {
    setLocks((prev) => prev.filter((lock) => lock.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditingValues(null);
    }
  };

  const startEditing = (lock) => {
    setEditingId(lock.id);
    setEditingValues({
      date: lock.date,
      time: lock.time,
      duration: lock.duration,
      barber: lock.barber,
      recurring: lock.recurring ?? false,
      weekday: lock.weekday ?? lock.date.getDay(),
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingValues(null);
  };

  const saveEditing = () => {
    if (
      editingValues?.weekday === undefined ||
      editingValues?.weekday === null ||
      !editingValues?.time ||
      !editingValues?.barber
    ) {
      toast.error("Συμπληρώστε όλα τα πεδία.");
      return;
    }
    const baseDate = getNextDateForWeekday(editingValues.weekday, editingValues.date);
    setLocks((prev) =>
      prev.map((lock) =>
        lock.id === editingId
          ? {
              ...lock,
              date: baseDate,
              time: editingValues.time,
              duration: editingValues.duration,
              barber: editingValues.barber,
              recurring: editingValues.recurring ?? lock.recurring ?? false,
              weekday: editingValues.weekday,
            }
          : lock
      )
    );
    setEditingId(null);
    setEditingValues(null);
  };

  const duplicateLock = (lock) => {
    openModal({
      weekday: lock.weekday ?? lock.date.getDay(),
      barber: lock.barber,
      slots: [{ time: lock.time, duration: lock.duration }],
      repeatWeekly: lock.recurring,
    });
  };

  const buildPayload = (lock) => {
    const [hours, minutes] = lock.time.split(":").map(Number);
    const start = new Date(
      lock.date.getFullYear(),
      lock.date.getMonth(),
      lock.date.getDate(),
      hours,
      minutes,
      0,
      0
    );

    return {
      barber: lock.barber,
      type: "lock",
      appointmentDateTime: start.toISOString(),
      duration: lock.duration,
      lockReason: lock.recurring ? "ΜΟΝΙΜΟ" : lock.lockReason,
    };
  };

  const handleSubmit = async () => {
    if (locks.length === 0) {
      toast.error("Δεν υπάρχουν κλειδώματα για αποστολή.");
      return;
    }

    setSubmitting(true);
    setResults([]);

    const summary = [];

    for (const lock of sortedLocks) {
      const payload = buildPayload(lock);
      try {
        const response = await createAppointment(payload);
        summary.push({
          status: "success",
          lock,
          responseId:
            response?._id ||
            response?.id ||
            response?.appointment?._id ||
            response?.appointment?.id ||
            null,
        });
      } catch (error) {
        console.error("Failed to create lock", error);
        summary.push({
          status: "error",
          lock,
          message:
            error?.response?.data?.message ||
            error?.message ||
            "Κάτι πήγε στραβά.",
        });
      }
    }

    const successEntries = summary.filter((item) => item.status === "success");
    const successCount = successEntries.length;
    const failureCount = summary.length - successCount;

    if (successCount > 0) {
      toast.success(`Δημιουργήθηκαν ${successCount} κλειδώματα.`);
    }
    if (failureCount > 0) {
      toast.error(`${failureCount} κλειδώματα απέτυχαν.`);
    }

    setSubmitting(false);
    setResults(summary);
    setLocks([]);
    refreshCalendarLocks();
  };

  const unlockByIds = async (ids) => {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) {
      toast("Δεν υπάρχουν κλειδώματα για ξεκλείδωμα.");
      return;
    }

    setUnlocking(true);
    const failed = [];

    for (const id of uniqueIds) {
      try {
        await deleteAppointment(id);
      } catch (error) {
        console.error("Failed to delete lock", error);
        failed.push({ id, error });
      }
    }

    if (failed.length > 0) {
      toast.error("Κάποια κλειδώματα δεν αφαιρέθηκαν.");
    } else {
      toast.success("Τα κλειδώματα αφαιρέθηκαν.");
    }

    setCreatedLocks((prev) =>
      prev.filter((lock) => !uniqueIds.includes(lock.responseId))
    );
    refreshCalendarLocks();
    setUnlocking(false);
  };

  const handleUnlockAll = async () => {
    const ids = displayLocks.flatMap((lock) => lock.responseIds || []);
    await unlockByIds(ids);
  };

  const handleUnlockAllPermanent = async () => {
    const permanentIds = displayLocks
      .filter((lock) => lock.recurring)
      .flatMap((lock) => lock.responseIds || []);
    if (permanentIds.length === 0) {
      toast("Δεν υπάρχουν μόνιμα κλειδώματα.");
      return;
    }
    await unlockByIds(permanentIds);
  };
  const handleUnlockEntry = async (entry) => {
    await unlockByIds(entry.responseIds || []);
  };

  const togglePendingGroup = (key) => {
    if (!key) return;
    setPendingExpandedIds((prev) => {
      const next = new Set(prev instanceof Set ? prev : []);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleLockDetails = (key) => {
    setExpandedLockIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const startSavedOccurrenceEditing = (lock, occurrence, rowKey) => {
    if (!occurrence?.responseId) {
      toast.error("Δεν είναι δυνατή η επεξεργασία αυτού του κλειδώματος.");
      return;
    }
    const startDate =
      occurrence.startDate instanceof Date
        ? occurrence.startDate
        : new Date(occurrence.startDate);
    if (!startDate || Number.isNaN(startDate.getTime())) {
      toast.error("Μη έγκυρη ημερομηνία για επεξεργασία.");
      return;
    }
    const durationMinutes =
      Math.round(
        ((occurrence.endDate instanceof Date
          ? occurrence.endDate
          : new Date(occurrence.endDate)) -
          startDate) /
          60000
      ) || lock.duration || DURATION_OPTIONS[0];

    setSavedEditState({
      lockKey: rowKey,
      responseId: occurrence.responseId,
      lock,
      occurrence,
      values: {
        date: startDate,
        time: toTimeString(startDate),
        duration: durationMinutes,
        barber: lock.barber,
      },
    });
  };

  const updateSavedEditField = (field, value) => {
    setSavedEditState((prev) => {
      if (!prev) return prev;
      const nextValues = { ...prev.values };
      if (field === "date") {
        nextValues.date = value;
      } else if (field === "duration") {
        nextValues.duration = Number(value) || prev.values.duration;
      } else {
        nextValues[field] = value;
      }
      return {
        ...prev,
        values: nextValues,
      };
    });
  };

  const cancelSavedEditing = () => {
    setSavedEditState(null);
  };

  const saveSavedEditing = async () => {
    if (!savedEditState?.responseId) {
      toast.error("Δεν βρέθηκε το κλείδωμα για ενημέρωση.");
      return;
    }

    const { values, responseId, lockKey } = savedEditState;
    const { date, time, duration, barber } = values || {};

    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      toast.error("Επιλέξτε έγκυρη ημερομηνία.");
      return;
    }
    if (!time) {
      toast.error("Επιλέξτε ώρα.");
      return;
    }
    if (!barber) {
      toast.error("Επιλέξτε κουρέα.");
      return;
    }
    const [hours, minutes] = time.split(":").map(Number);
    const start = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      Number.isFinite(hours) ? hours : 0,
      Number.isFinite(minutes) ? minutes : 0,
      0,
      0
    );

    const payload = {
      barber,
      type: "lock",
      appointmentDateTime: start.toISOString(),
      duration: Number.isFinite(duration) ? duration : 40,
      lockReason: "ΜΟΝΙΜΟ",
    };

    setUpdatingSaved(true);
    try {
      await updateAppointment(responseId, payload);
      toast.success("Το κλείδωμα ενημερώθηκε.");
      setSavedEditState(null);
      setExpandedLockIds((prev) => {
        const next = new Set(prev instanceof Set ? prev : []);
        next.add(lockKey);
        return next;
      });
      await refreshCalendarLocks();
    } catch (error) {
      console.error("Failed to update lock", error);
      toast.error("Αποτυχία ενημέρωσης κλειδώματος.");
    } finally {
      setUpdatingSaved(false);
    }
  };

  const unlockSavedOccurrence = async (responseId, rowKey) => {
    if (!responseId) {
      toast.error("Δεν βρέθηκε το κλείδωμα για ξεκλείδωμα.");
      return;
    }
    if (savedEditState?.responseId === responseId) {
      setSavedEditState(null);
    }
    setUnlockingOccurrenceId(responseId);
    try {
      await deleteAppointment(responseId);
      toast.success("Το κλείδωμα αφαιρέθηκε.");
      setExpandedLockIds((prev) => {
        const next = new Set(prev instanceof Set ? prev : []);
        if (rowKey) {
          next.add(rowKey);
        }
        return next;
      });
      await refreshCalendarLocks();
    } catch (error) {
      console.error("Failed to unlock occurrence", error);
      toast.error("Αποτυχία ξεκλειδώματος.");
    } finally {
      setUnlockingOccurrenceId(null);
    }
  };

  const resetBatch = () => {
    setResults([]);
    setLocks([]);
    setSubmitting(false);
    setUnlocking(false);
  };

  return (
    <div className="h-full overflow-y-auto text-gray-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              Μαζικό Κλείδωμα Ωρών
            </h1>
            <p className="text-sm text-gray-400">
              Επέλεξε ημέρες και ώρες για να τις κλειδώσεις μαζικά στο ημερολόγιο.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openModal()}
              className="inline-flex items-center gap-2 rounded-2xl border border-violet-500/60 px-4 py-2 text-sm font-semibold text-violet-100 transition hover:border-violet-500 hover:text-white"
            >
              <FiPlus className="h-4 w-4" />
              Προσθήκη ημέρας
            </button>
            {locks.length > 0 && results.length === 0 && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-gray-700"
              >
                {submitting ? "Αποστολή..." : "Δημιουργία κλειδωμάτων"}
              </button>
            )}
          </div>
        </header>

        {results.length === 0 ? (
          <section className="rounded-3xl border border-gray-800/80 bg-gray-900/70 p-6 shadow-lg">
            <div className="mt-4 overflow-x-auto">
              <PendingLocksTable
                sortedLocks={sortedLocks}
                editingId={editingId}
                editingValues={editingValues}
                onStartEditing={startEditing}
                onCancelEditing={cancelEditing}
                onSaveEditing={saveEditing}
                onDeleteLock={handleDeleteLock}
                onDuplicateLock={duplicateLock}
                onUpdateEditingValues={setEditingValues}
                pendingExpandedIds={pendingExpandedIds}
                onTogglePendingGroup={togglePendingGroup}
                onClearAll={clearPendingLocks}
                canSubmit={sortedLocks.length > 0}
                onSubmit={handleSubmit}
                submitting={submitting}
              />
            </div>
          </section>
        ) : (
          <ResultsSection results={results} onReset={resetBatch} />
        )}
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-10 sm:px-6 lg:px-8">
        <CreatedLocksSection
          locks={displayLocks}
          calendarError={calendarError}
          loadingCalendarLocks={loadingCalendarLocks}
          onRefresh={refreshCalendarLocks}
          onUnlockAll={handleUnlockAll}
          onUnlockAllPermanent={handleUnlockAllPermanent}
          unlocking={unlocking}
          expandedLockIds={expandedLockIds}
          onToggleLockDetails={toggleLockDetails}
          onUnlockEntry={handleUnlockEntry}
          savedEditState={savedEditState}
          onStartOccurrenceEdit={startSavedOccurrenceEditing}
          onUpdateSavedField={updateSavedEditField}
          onCancelSavedEditing={cancelSavedEditing}
          onSaveSavedEditing={saveSavedEditing}
          updatingSaved={updatingSaved}
          unlockingOccurrenceId={unlockingOccurrenceId}
          onUnlockOccurrence={unlockSavedOccurrence}
        />
      </div>

      <BulkLockModal
        open={modalOpen}
        modalData={modalData}
        onClose={closeModal}
        onSelectWeekday={selectModalWeekday}
        onSelectBarber={selectModalBarber}
        onAddSlot={addModalSlot}
        onUpdateSlot={updateModalSlot}
        onRemoveSlot={removeModalSlot}
        onToggleRepeat={toggleModalRepeat}
        onSubmit={handleModalAdd}
      />
    </div>
  );
};

export default BulkLocksPage;
