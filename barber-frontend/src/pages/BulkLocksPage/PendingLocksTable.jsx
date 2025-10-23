import { Fragment, useMemo } from "react";
import Flatpickr from "react-flatpickr";
import {
  BARBER_OPTIONS,
  DURATION_OPTIONS,
  TIME_PICKER_OPTIONS,
  WEEKDAY_OPTIONS,
  dateFormatter,
  getWeekdayLabel,
  parseTimeToDate,
  simpleDateFormatter,
  timeFormatter,
  toTimeString,
} from "./utils";
import { FiChevronDown, FiChevronUp, FiCopy, FiEdit2, FiTrash2 } from "react-icons/fi";

const PendingLocksTable = ({
  sortedLocks,
  editingId,
  editingValues,
  onStartEditing,
  onCancelEditing,
  onSaveEditing,
  onDeleteLock,
  onDuplicateLock,
  onUpdateEditingValues,
  pendingExpandedIds,
  onTogglePendingGroup,
  onClearAll,
  canSubmit,
  onSubmit,
  submitting,
}) => {
  const { rows, hasRows } = useMemo(() => {
    const groupMap = new Map();
    const lockToGroup = new Map();

    sortedLocks.forEach((lock) => {
      if (!lock || !lock.recurring) return;
      const weekday =
        lock.weekday ??
        (lock.date instanceof Date ? lock.date.getDay() : undefined);
      if (weekday === undefined) return;
      const key = `${lock.barber || "unknown"}-${weekday}-${lock.time}-${lock.duration}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          key,
          locks: [],
          weekday,
          barber: lock.barber,
          time: lock.time,
          duration: lock.duration,
        });
      }
      const group = groupMap.get(key);
      group.locks.push(lock);
      lockToGroup.set(lock.id, key);
    });

    const pendingRows = [];
    const processedGroups = new Set();

    const generateEditingRow = (lock, nested = false) => {
      if (!editingValues) return null;
      return (
        <tr
          key={lock.id}
          className={`border-b border-gray-800 bg-gray-900/60 text-sm text-gray-200 ${
            nested ? "bg-gray-900/80" : ""
          }`}
        >
          <td className={`px-3 py-3 align-middle ${nested ? "pl-8" : ""}`}>
            <select
              value={editingValues.weekday}
              onChange={(event) =>
                onUpdateEditingValues((prev) => ({
                  ...prev,
                  weekday: Number(event.target.value),
                }))
              }
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-1 text-sm text-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
            >
              {WEEKDAY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </td>
          <td className="px-3 py-3 align-middle">
            <Flatpickr
              value={parseTimeToDate(editingValues.time)}
              options={TIME_PICKER_OPTIONS}
              onChange={(selectedDates) => {
                const [selected] = selectedDates;
                if (selected) {
                  onUpdateEditingValues((prev) => ({
                    ...prev,
                    time: toTimeString(selected),
                  }));
                }
              }}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-1 text-sm text-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
            />
          </td>
          <td className="px-3 py-3 align-middle">
            <select
              value={editingValues.duration}
              onChange={(event) =>
                onUpdateEditingValues((prev) => ({
                  ...prev,
                  duration: Number(event.target.value),
                }))
              }
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-1 text-sm text-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
            >
              {DURATION_OPTIONS.map((durationOption) => (
                <option key={durationOption} value={durationOption}>
                  {durationOption}′
                </option>
              ))}
            </select>
          </td>
          <td className="px-3 py-3 align-middle">
            <select
              value={editingValues.barber}
              onChange={(event) =>
                onUpdateEditingValues((prev) => ({
                  ...prev,
                  barber: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-1 text-sm text-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
            >
              {BARBER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </td>
          <td className="px-3 py-3 align-middle text-center">
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={onSaveEditing}
                className="rounded-lg bg-violet-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-violet-400"
              >
                Αποθήκευση
              </button>
              <button
                type="button"
                onClick={onCancelEditing}
                className="rounded-lg border border-gray-700 px-3 py-1 text-xs font-semibold text-gray-300 transition hover:border-gray-500 hover:text-white"
              >
                Άκυρο
              </button>
            </div>
          </td>
        </tr>
      );
    };

    const generateDisplayRow = (lock, nested = false) => {
      const [hours, minutes] = lock.time.split(":").map(Number);
      const start = new Date(
        lock.date.getFullYear(),
        lock.date.getMonth(),
        lock.date.getDate(),
        hours,
        minutes
      );
      const end = new Date(start.getTime() + lock.duration * 60000);
      const rowClass = `border-b border-gray-800/80 text-sm text-gray-200 ${
        nested ? "bg-gray-900/40 hover:bg-gray-900/50" : "hover:bg-gray-900/40"
      }`;
      const firstCellClass = `whitespace-nowrap px-3 py-3 align-middle font-medium text-white ${
        nested ? "pl-8" : ""
      }`;

      return (
        <tr key={lock.id} className={rowClass}>
          <td className={firstCellClass}>{dateFormatter.format(lock.date)}</td>
          <td className="whitespace-nowrap px-3 py-3 align-middle">
            <div className="flex items-center gap-2">
              <span>
                {timeFormatter.format(start)} — {timeFormatter.format(end)}
              </span>
              {lock.recurring && (
                <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-200">
                  Μόνιμο
                </span>
              )}
            </div>
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
          <td className="px-3 py-3 align-middle">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onStartEditing(lock)}
                className="rounded-full border border-gray-700 p-2 text-gray-300 transition hover:border-violet-500 hover:text-white"
                aria-label="Επεξεργασία"
              >
                <FiEdit2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onDuplicateLock(lock)}
                className="rounded-full border border-gray-700 p-2 text-gray-300 transition hover:border-violet-500 hover:text-white"
                aria-label="Διπλασιασμός"
              >
                <FiCopy className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteLock(lock.id)}
                className="rounded-full border border-red-500/40 p-2 text-red-300 transition hover:border-red-500 hover:text-red-200"
                aria-label="Διαγραφή"
              >
                <FiTrash2 className="h-4 w-4" />
              </button>
            </div>
          </td>
        </tr>
      );
    };

    sortedLocks.forEach((lock) => {
      const groupKey = lockToGroup.get(lock.id);
      if (!groupKey) {
        if (lock.id === editingId) {
          pendingRows.push(generateEditingRow(lock));
        } else {
          pendingRows.push(generateDisplayRow(lock));
        }
        return;
      }

      const group = groupMap.get(groupKey);
      if (!group || group.locks.length <= 1) {
        if (lock.id === editingId) {
          pendingRows.push(generateEditingRow(lock));
        } else {
          pendingRows.push(generateDisplayRow(lock));
        }
        return;
      }

      if (processedGroups.has(groupKey)) {
        return;
      }
      processedGroups.add(groupKey);

      group.locks.sort((a, b) => a.date - b.date);
      const firstLock = group.locks[0];
      const lastLock = group.locks[group.locks.length - 1];
      const startDate = firstLock.date;
      const endDate = lastLock.date;
      const durationMs = (group.duration || 0) * 60000;
      const rangeEnd = new Date(startDate.getTime() + durationMs);
      const groupLabel = `${getWeekdayLabel(group.weekday)} από ${simpleDateFormatter.format(
        startDate
      )} - ${simpleDateFormatter.format(endDate)}`;
      const isExpanded = pendingExpandedIds.has(groupKey);

      pendingRows.push(
        <tr
          key={`${groupKey}-summary`}
          className="border-b border-gray-800/80 bg-gray-900/60 text-sm text-gray-200"
        >
          <td className="whitespace-nowrap px-3 py-3 align-middle font-semibold text-white">
            <div className="flex flex-wrap items-center gap-2">
              <span>{groupLabel}</span>
              <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-200">
                Μόνιμο
              </span>
              <span className="text-xs text-gray-400">
                ({group.locks.length} κλειδώματα)
              </span>
            </div>
          </td>
          <td className="whitespace-nowrap px-3 py-3 align-middle">
            {timeFormatter.format(startDate)} — {timeFormatter.format(rangeEnd)}
          </td>
          <td className="whitespace-nowrap px-3 py-3 align-middle">
            <span className="rounded-full bg-violet-500/20 px-2.5 py-1 text-xs font-semibold text-violet-100">
              {group.duration}′
            </span>
          </td>
          <td className="whitespace-nowrap px-3 py-3 align-middle">
            <span className="rounded-full border border-gray-700 px-2.5 py-1 text-xs font-semibold text-gray-200">
              {group.barber}
            </span>
          </td>
          <td className="px-3 py-3 align-middle text-center">
            <button
              type="button"
              onClick={() => onTogglePendingGroup(groupKey)}
              className="inline-flex items-center gap-1 rounded-full border border-gray-700 px-3 py-1 text-xs font-semibold text-gray-300 transition hover:border-violet-500 hover:text-white"
            >
              {isExpanded ? <FiChevronUp className="h-4 w-4" /> : <FiChevronDown className="h-4 w-4" />}
              {isExpanded ? "Απόκρυψη" : "Προβολή"}
            </button>
          </td>
        </tr>
      );

      if (isExpanded) {
        group.locks.forEach((groupLock) => {
          if (groupLock.id === editingId) {
            pendingRows.push(generateEditingRow(groupLock, true));
          } else {
            pendingRows.push(generateDisplayRow(groupLock, true));
          }
        });
      }
    });

    return {
      rows: pendingRows,
      hasRows: pendingRows.length > 0,
    };
  }, [
    sortedLocks,
    editingId,
    editingValues,
    onTogglePendingGroup,
    onDuplicateLock,
    onDeleteLock,
    onStartEditing,
    onCancelEditing,
    onSaveEditing,
    onUpdateEditingValues,
    pendingExpandedIds,
  ]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClearAll}
            disabled={!hasRows}
            className="rounded-full border border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-300 transition hover:border-rose-500 hover:text-rose-200 disabled:cursor-not-allowed disabled:border-gray-800 disabled:text-gray-600"
          >
            Διαγραφή όλων
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!hasRows || submitting || !canSubmit}
            className="rounded-full bg-violet-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-gray-700"
          >
            {submitting ? "Αποστολή..." : "Δημιουργία κλειδωμάτων"}
          </button>
        </div>
      </div>
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
          {hasRows ? (
            rows
          ) : (
            <tr>
              <td
                className="px-3 py-6 text-center text-sm text-gray-500"
                colSpan={5}
              >
                Δεν υπάρχουν κλειδώματα. Πρόσθεσε μία ημέρα για να ξεκινήσεις.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PendingLocksTable;
