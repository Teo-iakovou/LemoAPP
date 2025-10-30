import { Fragment, useMemo } from "react";
import Flatpickr from "react-flatpickr";
import {
  BARBER_OPTIONS,
  DURATION_OPTIONS,
  TIME_PICKER_OPTIONS,
  dateFormatter,
  formatDateInputValue,
  getLockRowKey,
  getWeekdayLabel,
  parseDateInputValue,
  parseTimeToDate,
  simpleDateFormatter,
  timeFormatter,
  toTimeString,
} from "./utils";
import {
  FiChevronDown,
  FiChevronUp,
  FiCheck,
  FiEdit2,
  FiUnlock,
  FiX,
} from "react-icons/fi";

const CreatedLocksSection = ({
  locks,
  calendarError,
  loadingCalendarLocks,
  onRefresh,
  onUnlockAll,
  onUnlockAllPermanent,
  unlocking,
  expandedLockIds,
  onToggleLockDetails,
  onUnlockEntry,
  savedEditState,
  onStartOccurrenceEdit,
  onUpdateSavedField,
  onCancelSavedEditing,
  onSaveSavedEditing,
  updatingSaved,
  unlockingOccurrenceId,
  onUnlockOccurrence,
}) => {
  const rows = useMemo(() => {
    if (!Array.isArray(locks)) return [];

    return locks.map((lock) => {
      const rowKey = getLockRowKey(lock);
      const startDate =
        lock.startDate instanceof Date
          ? lock.startDate
          : new Date(lock.startDate);
      if (!startDate || Number.isNaN(startDate.getTime())) {
        return null;
      }
      const rawEndDate =
        lock.endDate instanceof Date
          ? lock.endDate
          : new Date(lock.endDate || startDate);
      const endDate = lock.recurring
        ? rawEndDate
        : rawEndDate || new Date(startDate.getTime() + lock.duration * 60000);
      const startTimeLabel = timeFormatter.format(startDate);
      const endTimeLabel = timeFormatter.format(
        new Date(startDate.getTime() + lock.duration * 60000)
      );
      const dateLabel = lock.recurring
        ? `${getWeekdayLabel(lock.weekday)} από ${simpleDateFormatter.format(
            startDate
          )} - ${simpleDateFormatter.format(endDate)}`
        : dateFormatter.format(startDate);
      const occurrences = Array.isArray(lock.occurrences)
        ? lock.occurrences
        : [];
      const isExpanded = expandedLockIds.has(rowKey);

      return (
        <Fragment key={rowKey}>
          <tr className="border-b border-gray-800/80 text-sm text-gray-200 hover:bg-gray-900/40">
            <td className="whitespace-nowrap px-3 py-3 align-middle font-medium text-white">
              {dateLabel}
              {lock.recurring && (
                <span className="ml-2 inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-200">
                  Μόνιμο
                  {lock.repeatInterval && lock.repeatInterval > 1
                    ? ` · κάθε ${lock.repeatInterval} εβδομάδες`
                    : ""}
                </span>
              )}
            </td>
            <td className="whitespace-nowrap px-3 py-3 align-middle">
              {startTimeLabel} — {endTimeLabel}
            </td>
            <td className="whitespace-nowrap px-3 py-3 align-middle">
              <span className="rounded-full bg-violet-500/20 px-2.5 py-1 text-xs font-semibold text-violet-100">
                {lock.duration}′
              </span>
            </td>
            <td className="whitespace-nowrap px-3 py-3 align-middle">
              <span className="rounded-full border border-gray-700 px-2.5 py-1 text-xs font-semibold text-gray-200">
                {lock.barber}
              </span>
            </td>
            <td className="px-3 py-3 align-middle text-center">
              <div className="flex items-center justify-center gap-2">
                {lock.recurring && occurrences.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onToggleLockDetails(rowKey)}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-700 px-3 py-1 text-xs font-semibold text-gray-300 transition hover:border-violet-500 hover:text-white"
                  >
                    {isExpanded ? (
                      <FiChevronUp className="h-4 w-4" />
                    ) : (
                      <FiChevronDown className="h-4 w-4" />
                    )}
                    {isExpanded ? "Απόκρυψη" : "Προβολή"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onUnlockEntry(lock)}
                  disabled={
                    unlocking ||
                    !(lock.responseIds && lock.responseIds.length)
                  }
                  className="inline-flex items-center gap-1 rounded-full border border-gray-700 px-3 py-1 text-xs font-semibold text-gray-300 transition hover:border-rose-500 hover:text-rose-200 disabled:cursor-not-allowed"
                >
                  <FiUnlock className="h-4 w-4" />
                  Ξεκλείδωμα
                </button>
              </div>
            </td>
          </tr>
          {lock.recurring && isExpanded ? (
            <tr>
              <td colSpan={5} className="bg-gray-900/60 px-4 py-3">
                <div className="space-y-2 text-xs text-gray-300">
                  {occurrences.map((occurrence, index) => {
                    const occurrenceStart =
                      occurrence.startDate instanceof Date
                        ? occurrence.startDate
                        : new Date(occurrence.startDate);
                    if (
                      !occurrenceStart ||
                      Number.isNaN(occurrenceStart.getTime())
                    ) {
                      return null;
                    }
                    const rawOccurrenceEnd =
                      occurrence.endDate instanceof Date
                        ? occurrence.endDate
                        : new Date(
                            occurrence.endDate ||
                              occurrenceStart.getTime() +
                                lock.duration * 60000
                          );
                    const occurrenceEnd =
                      rawOccurrenceEnd &&
                      !Number.isNaN(rawOccurrenceEnd.getTime())
                        ? rawOccurrenceEnd
                        : new Date(
                            occurrenceStart.getTime() +
                              lock.duration * 60000
                          );
                    const detailKey = `${rowKey}-${
                      occurrence.responseId || index
                    }`;
                    const isEditing =
                      savedEditState &&
                      savedEditState.responseId === occurrence.responseId &&
                      savedEditState.lockKey === rowKey;
                    const editable = Boolean(occurrence.responseId);

                    if (isEditing) {
                      const editValues = savedEditState.values || {};
                      const dateInputValue = formatDateInputValue(
                        editValues.date instanceof Date
                          ? editValues.date
                          : occurrenceStart
                      );
                      return (
                        <div
                          key={`${detailKey}-editing`}
                          className="space-y-3 rounded-xl border border-violet-500/40 bg-gray-950/60 px-3 py-3"
                        >
                          <div className="flex flex-wrap items-center gap-3">
                            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-gray-400">
                              Ημερομηνία
                              <input
                                type="date"
                                value={dateInputValue}
                                onChange={(event) => {
                                  const parsed = parseDateInputValue(
                                    event.target.value,
                                    editValues.time
                                  );
                                  if (parsed) {
                                    onUpdateSavedField("date", parsed);
                                  }
                                }}
                                className="mt-1 w-full rounded-lg border border-gray-800 bg-gray-900 px-2 py-2 text-sm text-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                              />
                            </label>
                            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-gray-400">
                              Ώρα
                              <Flatpickr
                                value={parseTimeToDate(editValues.time)}
                                options={TIME_PICKER_OPTIONS}
                                onChange={(selectedDates) => {
                                  const [selected] = selectedDates;
                                  if (selected) {
                                    onUpdateSavedField(
                                      "time",
                                      toTimeString(selected)
                                    );
                                  }
                                }}
                                className="mt-1 w-full rounded-lg border border-gray-800 bg-gray-900 px-2 py-2 text-sm text-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                              />
                            </label>
                            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-gray-400">
                              Διάρκεια
                              <select
                                value={editValues.duration ?? lock.duration}
                                onChange={(event) =>
                                  onUpdateSavedField(
                                    "duration",
                                    Number(event.target.value)
                                  )
                                }
                                className="mt-1 w-full rounded-lg border border-gray-800 bg-gray-900 px-2 py-2 text-sm text-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                              >
                                {DURATION_OPTIONS.map((valueOption) => (
                                  <option key={valueOption} value={valueOption}>
                                    {valueOption}′
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-gray-400">
                              Barber
                              <select
                                value={editValues.barber ?? lock.barber}
                                onChange={(event) =>
                                  onUpdateSavedField("barber", event.target.value)
                                }
                                className="mt-1 w-full rounded-lg border border-gray-800 bg-gray-900 px-2 py-2 text-sm text-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                              >
                                {BARBER_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={onSaveSavedEditing}
                              disabled={updatingSaved}
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-700"
                            >
                              <FiCheck className="h-4 w-4" />
                              {updatingSaved ? "Αποθήκευση..." : "Αποθήκευση"}
                            </button>
                            <button
                              type="button"
                              onClick={onCancelSavedEditing}
                              disabled={updatingSaved}
                              className="inline-flex items-center gap-1 rounded-full border border-gray-700 px-3 py-1 text-xs font-semibold text-gray-300 transition hover:border-rose-500 hover:text-rose-200 disabled:cursor-not-allowed"
                            >
                              <FiX className="h-4 w-4" />
                              Άκυρο
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={detailKey}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-800 bg-gray-950/40 px-3 py-2"
                      >
                        <span className="font-medium text-white">
                          {dateFormatter.format(occurrenceStart)}
                        </span>
                        <div className="flex flex-wrap items-center gap-3 text-gray-400">
                          <span>
                            {timeFormatter.format(occurrenceStart)} —{" "}
                            {timeFormatter.format(occurrenceEnd)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {editable && (
                            <button
                              type="button"
                              onClick={() =>
                                onStartOccurrenceEdit(lock, occurrence, rowKey)
                              }
                              disabled={
                                updatingSaved ||
                                unlockingOccurrenceId === occurrence.responseId
                              }
                              className="inline-flex items-center gap-1 rounded-full border border-gray-700 px-2.5 py-1 text-[11px] font-semibold text-gray-300 transition hover:border-violet-500 hover:text-white disabled:cursor-not-allowed disabled:border-gray-700"
                            >
                              <FiEdit2 className="h-3.5 w-3.5" />
                              Επεξεργασία
                            </button>
                          )}
                          {editable && (
                            <button
                              type="button"
                              onClick={() =>
                                onUnlockOccurrence(occurrence.responseId, rowKey)
                              }
                              disabled={
                                unlockingOccurrenceId === occurrence.responseId
                              }
                              className="inline-flex items-center gap-1 rounded-full border border-gray-700 px-2.5 py-1 text-[11px] font-semibold text-gray-300 transition hover:border-rose-500 hover:text-rose-200 disabled:cursor-not-allowed disabled:border-gray-700"
                            >
                              <FiUnlock className="h-3.5 w-3.5" />
                              {unlockingOccurrenceId === occurrence.responseId
                                ? "Ξεκλείδωμα..."
                                : "Ξεκλείδωμα"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </td>
            </tr>
          ) : null}
        </Fragment>
      );
    });
  }, [
    locks,
    expandedLockIds,
    savedEditState,
    updatingSaved,
    unlockingOccurrenceId,
    onToggleLockDetails,
    onUnlockOccurrence,
    onStartOccurrenceEdit,
  ]);

  return (
    <section className="rounded-3xl border border-gray-800/80 bg-gray-900/70 p-6 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Δημιουργημένα κλειδώματα</h2>
          <p className="text-sm text-gray-400">
            Συνολικά {locks.length} κλειδώματα που είναι ενεργά στο ημερολόγιο.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {calendarError && (
            <span className="text-xs text-rose-300">{calendarError}</span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-full border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-violet-500 hover:text-white"
          >
            {loadingCalendarLocks ? "Φόρτωση..." : "Ανανέωση"}
          </button>
          <button
            type="button"
            onClick={onUnlockAll}
            disabled={unlocking}
            className="rounded-full border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-rose-500 hover:text-rose-200 disabled:cursor-not-allowed disabled:border-gray-700"
          >
            {unlocking ? "Ξεκλείδωμα..." : "Ξεκλείδωμα όλων"}
          </button>
          <button
            type="button"
            onClick={onUnlockAllPermanent}
            disabled={unlocking}
            className="rounded-full bg-rose-600/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-gray-700"
          >
            {unlocking ? "Ξεκλείδωμα..." : "Ξεκλείδωμα μόνιμων"}
          </button>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-800 text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-gray-400">
            <tr>
              <th className="px-3 py-2">Ημερομηνία</th>
              <th className="px-3 py-2">Ώρα</th>
              <th className="px-3 py-2">Διάρκεια</th>
              <th className="px-3 py-2">Barber</th>
              <th className="px-3 py-2 text-center">Ενέργειες</th>
            </tr>
          </thead>
          <tbody>
            {locks.length === 0 && !loadingCalendarLocks ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-sm text-gray-500"
                >
                  Δεν υπάρχουν κλειδώματα στη λίστα.
                </td>
              </tr>
            ) : null}
            {loadingCalendarLocks ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-sm text-gray-500"
                >
                  Φόρτωση...
                </td>
              </tr>
            ) : (
              rows
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default CreatedLocksSection;
