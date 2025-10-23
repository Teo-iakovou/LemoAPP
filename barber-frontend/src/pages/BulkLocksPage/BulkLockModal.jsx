import Flatpickr from "react-flatpickr";
import {
  BARBER_OPTIONS,
  DURATION_OPTIONS,
  TIME_PICKER_OPTIONS,
  WEEKDAY_OPTIONS,
  parseTimeToDate,
  toTimeString,
} from "./utils";
import { FiPlus, FiTrash2 } from "react-icons/fi";

const BulkLockModal = ({
  open,
  modalData,
  onClose,
  onSelectWeekday,
  onSelectBarber,
  onAddSlot,
  onUpdateSlot,
  onRemoveSlot,
  onToggleRepeat,
  onSubmit,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Προσθήκη κλειδώματος</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-700 p-2 text-gray-400 transition hover:border-gray-500 hover:text-white"
            aria-label="Κλείσιμο"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-5">
          <div>
            <p className="text-sm font-medium text-gray-300">Ημέρα</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {WEEKDAY_OPTIONS.map((option) => {
                const isActive = modalData.weekday === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onSelectWeekday(option.value)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "border-violet-500 bg-violet-500/30 text-white shadow"
                        : "border-gray-700 bg-gray-900/60 text-gray-300 hover:border-violet-500/60 hover:text-white"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block text-sm font-medium text-gray-300">
            Barber
            <select
              value={modalData.barber}
              onChange={(event) => onSelectBarber(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-gray-700 bg-gray-950/60 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
            >
              <option value="" disabled>
                Επιλέξτε κουρέα
              </option>
              {BARBER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-gray-300">Ώρες κλειδώματος</p>
              <button
                type="button"
                onClick={onAddSlot}
                className="inline-flex items-center gap-2 rounded-full bg-violet-500/90 px-3 py-1 text-xs font-semibold text-white transition hover:bg-violet-500"
              >
                <FiPlus className="h-4 w-4" />
                Προσθήκη ώρας
              </button>
            </div>
            <div className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
              {modalData.slots.map((slot, index) => (
                <div
                  key={slot.id}
                  className="flex flex-col gap-3 rounded-2xl border border-gray-800 bg-gray-950/60 p-3 sm:flex-row sm:items-center sm:gap-4"
                >
                  <label className="flex-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Ώρα
                    <Flatpickr
                      value={parseTimeToDate(slot.time)}
                      options={TIME_PICKER_OPTIONS}
                      onChange={(selectedDates) => {
                        const [selected] = selectedDates;
                        if (selected) {
                          onUpdateSlot(slot.id, "time", toTimeString(selected));
                        }
                      }}
                      className="mt-2 w-full rounded-xl border border-gray-800 bg-gray-900 px-2 py-2 text-sm text-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
                    />
                  </label>
                  <label className="flex-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Διάρκεια
                    <select
                      value={slot.duration}
                      onChange={(event) =>
                        onUpdateSlot(slot.id, "duration", Number(event.target.value))
                      }
                      className="mt-2 w-full rounded-xl border border-gray-800 bg-gray-900 px-2 py-2 text-sm text-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
                    >
                      {DURATION_OPTIONS.map((value) => (
                        <option key={value} value={value}>
                          {value}′
                        </option>
                      ))}
                    </select>
                  </label>
                  {modalData.slots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveSlot(slot.id)}
                      className="self-start rounded-xl border border-transparent bg-gray-800 p-2 text-gray-300 transition hover:bg-gray-700 hover:text-white"
                      aria-label={`Αφαίρεση ώρας ${index + 1}`}
                    >
                      <FiTrash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-800/70 bg-gray-950/60 px-4 py-3">
            <label className="flex items-start gap-3 text-sm text-gray-200">
              <input
                type="checkbox"
                checked={modalData.repeatWeekly}
                onChange={(event) => onToggleRepeat(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-600 bg-gray-900 text-violet-500 focus:ring-violet-400"
              />
              <span>
                Κλείδωμα επαναλαμβανόμενο (για πάντα)
                <span className="block text-xs text-gray-500">
                  Δημιουργεί εβδομαδιαία κλειδώματα χωρίς λήξη (52 εβδομάδες).
                </span>
              </span>
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:border-gray-500 hover:text-white"
          >
            Άκυρο
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="rounded-2xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400"
          >
            Προσθήκη κλειδωμάτων
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkLockModal;
