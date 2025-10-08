import { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css"; 
import { registerLocale } from "react-datepicker";
import el from "date-fns/locale/el";
registerLocale("el", el);
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
const DURATION_OPTIONS = [20, 30, 40, 60, 90, 120];




function AppointmentForm({
  initialDate,
  onClose,
  onSubmit,
  onDelete,
  isEditing,
  appointmentData,
  customers = [],
}) {
  const formRef = useRef(null);
  const flatpickrRef = useRef(null);
  const MySwal = withReactContent(Swal);

  const { register, handleSubmit, reset, setValue ,control} = useForm({
    defaultValues: {
      customerName: appointmentData?.customerName || "",
      phoneNumber: appointmentData?.phoneNumber || "",
      barber: appointmentData?.barber || "ΛΕΜΟ",
      dateOfBirth: appointmentData?.dateOfBirth || "",
    },
  });
  const typeField = register("type");

  const [appointmentDateTime, setAppointmentDateTime] = useState(
    appointmentData?.appointmentDateTime || initialDate || new Date()
  );
  const [appointmentType, setAppointmentType] = useState(
    appointmentData?.type || "appointment"
  );
  const [duration, setDuration] = useState(appointmentData?.duration || 40);
  const [durationCustom, setDurationCustom] = useState(
    DURATION_OPTIONS.includes(appointmentData?.duration)
      ? ""
      : appointmentData?.duration || ""
  );
  const [recurrence, setRecurrence] = useState("none");
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [repeatCount, setRepeatCount] = useState(1);
  const [lockReasonValue, setLockReasonValue] = useState(
    appointmentData?.lockReason || ""
  );
  const [error, setError] = useState(null);

  // Click outside = close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        formRef.current &&
        !formRef.current.contains(event.target) &&
        (!flatpickrRef.current ||
          !flatpickrRef.current.flatpickr.calendarContainer.contains(
            event.target
          ))
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (formRef.current && !formRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // If editing, load fields
  useEffect(() => {
    if (appointmentData) {
      setValue("customerName", appointmentData.customerName);
      setValue("phoneNumber", appointmentData.phoneNumber);
      setValue("barber", appointmentData.barber || "ΛΕΜΟ");
      setValue("dateOfBirth", appointmentData.dateOfBirth || "");
      setAppointmentDateTime(appointmentData.appointmentDateTime || new Date());
      setAppointmentType(appointmentData.type || "appointment");
      setDuration(appointmentData.duration || 40);
      if (!DURATION_OPTIONS.includes(appointmentData.duration))
        setDurationCustom(appointmentData.duration || "");
      setLockReasonValue(appointmentData.lockReason || "");
    }
  }, [appointmentData, setValue]);

  useEffect(() => {
    if (appointmentType === "break") {
      setRecurrence("none");
      setRepeatInterval(1);
      setRepeatCount(1);
    }
    if (appointmentType === "appointment" && !appointmentData) {
      setLockReasonValue("");
    }
  }, [appointmentType, appointmentData]);

  useEffect(() => {
    if (appointmentType !== "appointment") {
      setValue("customerName", "");
      setValue("phoneNumber", "");
    }
  }, [appointmentType, setValue]);

const handleCustomerSelect = (e) => {
  const displayName = e.target.value; // preserve user-entered spacing exactly as typed
  const lookupName = displayName.trim(); // normalize only for matching
  const selectedCustomer = customers.find((c) =>
    (c.name || "").trim().toLowerCase() === lookupName.toLowerCase()
  );

  setValue("customerName", displayName);
  setValue("phoneNumber", selectedCustomer?.phoneNumber || "");

  const dob = selectedCustomer?.dateOfBirth;
  if (dob) {
    let iso = "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      iso = dob; // already YYYY-MM-DD
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
      const [dd, mm, yyyy] = dob.split("/");
      iso = `${yyyy}-${mm}-${dd}`; // dd/MM/yyyy -> YYYY-MM-DD
    } else {
      const d = new Date(dob);
      if (!isNaN(d.getTime())) iso = d.toISOString().slice(0, 10);
    }
    setValue("dateOfBirth", iso || "");
  } else {
    setValue("dateOfBirth", "");
  }
};


  // Unified duration handler
  const handleDurationChange = (e) => {
    if (e.target.value === "custom") {
      setDurationCustom("");
      setDuration("");
    } else {
      setDuration(Number(e.target.value));
      setDurationCustom("");
    }
  };

  const handleDurationCustomChange = (e) => {
    const val = e.target.value;
    setDurationCustom(val);
    setDuration(Number(val));
  };

  const submitForm = (data) => {
    const requiresCustomer = appointmentType === "appointment";
    const parsedDuration =
      Number(durationCustom) || Number(duration) || (appointmentType === "break" ? 0 : NaN);

    if (
      requiresCustomer &&
      (!data.customerName || !data.customerName.trim() || !data.phoneNumber)
    ) {
      setError("Πρέπει να συμπληρώσετε όνομα και τηλέφωνο για ραντεβού.");
      return;
    }
    if (!appointmentDateTime) {
      setError("Ημερομηνία/ώρα υποχρεωτικό πεδίο.");
      return;
    }
    if (
      (appointmentType === "appointment" || appointmentType === "lock") &&
      (!parsedDuration || parsedDuration < 10 || parsedDuration > 600)
    ) {
      setError("Διάρκεια 10-600 λεπτά.");
      return;
    }

    setError(null);

    const payload = {
      ...appointmentData,
      customerName: requiresCustomer ? data.customerName.trim() : "",
      phoneNumber: requiresCustomer ? data.phoneNumber : "",
      barber: data.barber || "ΛΕΜΟ",
      duration:
        appointmentType === "break" ? parsedDuration || 0 : parsedDuration,
      type: appointmentType || "appointment",
      appointmentDateTime: new Date(appointmentDateTime).toISOString(),
      recurrence:
        appointmentType !== "break" && recurrence !== "none"
          ? recurrence
          : null,
      repeatInterval:
        appointmentType !== "break" && recurrence === "weekly"
          ? repeatInterval
          : null,
      repeatCount:
        appointmentType !== "break" && recurrence === "weekly"
          ? repeatCount
          : null,
      dateOfBirth:
        requiresCustomer && data.dateOfBirth ? data.dateOfBirth : "",
      lockReason:
        appointmentType === "lock" ? lockReasonValue.trim() : undefined,
    };

    onSubmit(payload);
    reset();
    setLockReasonValue("");
    if (!isEditing) {
      setAppointmentType("appointment");
    }
    onClose();
  };

  // Delete handler (sweetalert confirm)
  const handleDelete = () => {
    MySwal.fire({
      title: "Είστε σίγουρος;",
      text: "Αυτό θα διαγράψει το ραντεβού οριστικά.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#a78bfa",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ναι, διαγραφή!",
      cancelButtonText: "Ακύρωση",
    }).then((result) => {
      if (result.isConfirmed) {
        onDelete(appointmentData?._id);
        onClose();
        MySwal.fire({
          title: "✅ Διαγραφή",
          text: "Το ραντεβού διαγράφηκε με επιτυχία.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    });
  };

  // Styles
  const fieldBase =
    "w-full px-4 py-2 rounded-lg border-2 bg-[#181a23] text-purple-100 border-purple-300 focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none placeholder:text-purple-300";
  const labelClass =
    "text-sm font-medium mb-1 text-purple-800 dark:text-purple-200";
  const buttonBase =
    "rounded-xl font-bold py-2 px-6 transition-all text-base shadow-button";
  const primary = buttonBase + " bg-purple-600 text-white hover:bg-purple-700";
  const secondary = buttonBase + " bg-gray-200 text-gray-900 hover:bg-gray-300";
  const deleteBtn =
    buttonBase +
    " bg-red-600 text-white hover:bg-red-700 focus:outline-none ml-auto";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-2 py-6">
      <div
        ref={formRef}
        className="
      w-full max-w-lg 
      sm:max-w-md 
      bg-[#17182a] text-white 
      rounded-3xl shadow-2xl p-6
      relative
      flex flex-col
      border border-purple-700
      ring-1 ring-purple-300
      transition-all
      min-h-[300px]
      max-h-[95vh]
      overflow-y-auto
      mx-auto
      sm:mx-0
      sm:p-8
    "
        style={{
          // Ensure smooth look on big screens
          boxShadow: "0 10px 38px 0 rgba(80,16,111,0.18)",
        }}
      >
        <h2 className="text-2xl font-bold text-center mb-4 text-purple-700 dark:text-purple-300">
          {isEditing ? "ΕΠΕΞΕΡΓΑΣΙΑ ΡΑΝΤΕΒΟΥ" : "ΚΛΕΙΣΤΕ ΕΝΑ ΡΑΝΤΕΒΟΥ"}
        </h2>

        {error && (
          <div className="mb-2 p-2 bg-red-100 text-red-700 rounded text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(submitForm)} className="space-y-4 ">
          {/* Customer Name */}
          {appointmentType === "appointment" && (
            <div>
              <label className={labelClass}>ΟΝΟΜΑ ΠΕΛΑΤΗ</label>
              <input
                {...register("customerName")}
                list="customerNameList"
                onChange={handleCustomerSelect}
                type="text"
                className={fieldBase + " placeholder:text-[#a78bfa]"}
                placeholder="Όνομα πελάτη"
                required={appointmentType === "appointment"}
              />
              <datalist id="customerNameList">
                {customers.map((customer) => (
                  <option key={customer.phoneNumber} value={customer.name} />
                ))}
              </datalist>
            </div>
          )}

          {/* Phone Number */}
          {appointmentType === "appointment" && (
            <div>
              <label className={labelClass}>ΤΗΛΕΦΩΝΟ</label>
              <input
                {...register("phoneNumber")}
                type="text"
                inputMode="tel"
                className={fieldBase + " placeholder:text-[#a78bfa]"}
                placeholder="Τηλέφωνο πελάτη"
                required={appointmentType === "appointment"}
              />
            </div>
          )}

          {/* Date/Time */}
          <div>
            <label className={labelClass}>ΗΜΕΡΑ & ΩΡΑ</label>
            <DatePicker
              selected={
                appointmentDateTime ? new Date(appointmentDateTime) : null
              }
              onChange={(date) => setAppointmentDateTime(date)}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={5}
              dateFormat="dd/MM/yyyy HH:mm"
              placeholderText="Επιλέξτε ημέρα & ώρα"
              className={fieldBase + " w-full !bg-[#181a23] !text-[#a78bfa]"}
              calendarClassName="!bg-[#161a23] !text-[#ede9fe] !rounded-lg !border !border-[#a78bfa]"
              popperClassName="z-[9999]"
              locale="el"
              popperPlacement="bottom"
              wrapperClassName="w-full"
            />
          </div>

          {/* Barber */}
          <div>
            <label className={labelClass}>ΚΟΥΡΕΑΣ</label>
            <select
              {...register("barber")}
              className={fieldBase + " text-[#a78bfa]"}
              defaultValue=""
            >
              <option value="" disabled hidden className="text-[#a78bfa]">
                Επιλέξτε κουρέα
              </option>
              <option value="ΛΕΜΟ" className="text-[#a78bfa]">
                ΛΕΜΟ
              </option>
              <option value="ΦΟΡΟΥ" className="text-[#a78bfa]">
                ΦΟΡΟΥ
              </option>
            </select>
          </div>

          {/* Type */}
          <div>
            <label className={labelClass}>ΤΥΠΟΣ ΚΑΤΑΧΩΡΗΣΗΣ</label>
            <select
              {...typeField}
              className={fieldBase + " text-[#a78bfa]"}
              value={appointmentType}
              onChange={(e) => {
                typeField.onChange(e);
                setAppointmentType(e.target.value);
              }}
            >
              <option value="" disabled hidden className="text-[#a78bfa]">
                Επιλέξτε τύπο
              </option>
              <option value="appointment">Ραντεβού</option>
              <option value="break">Διάλειμμα</option>
              <option value="lock">Κλείδωμα</option>
            </select>
            {appointmentType === "lock" && (
              <p className="text-xs text-purple-200 mt-1">
                Τα κλειδώματα αποκρύπτουν διαθέσιμα slots από το δημόσιο site,
                αλλά μπορείτε πάντα να κλείσετε ραντεβού εσωτερικά πάνω από αυτά.
              </p>
            )}
          </div>

          {appointmentType === "lock" && (
            <div>
              <label className={labelClass}>ΑΙΤΙΑ ΚΛΕΙΔΩΜΑΤΟΣ (Προαιρετικό)</label>
              <input
                type="text"
                value={lockReasonValue}
                onChange={(e) => setLockReasonValue(e.target.value)}
                className={fieldBase + " placeholder:text-[#a78bfa]"}
                placeholder="π.χ. Προσωπικές υποχρεώσεις"
              />
            </div>
          )}

          {/* Recurrence */}
          <div>
            <label className={labelClass}>ΕΠΑΝΑΛΑΗΨΗ ΡΑΝΤΕΒΟΥ</label>
            <select
              className={fieldBase + " text-[#a78bfa]"}
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
              disabled={appointmentType === "break"}
            >
              <option value="none">Κανένα</option>
              <option value="weekly">Εβδομαδιαίο</option>
            </select>
            {appointmentType !== "break" && recurrence === "weekly" && (
              <div className="flex gap-2 mt-2">
                <select
                  className={fieldBase + " text-[#a78bfa]"}
                  value={repeatInterval}
                  onChange={(e) => setRepeatInterval(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 10, 20].map((interval) => (
                    <option key={interval} value={interval}>
                      {interval} εβδομάδες
                    </option>
                  ))}
                </select>
                <select
                  className={fieldBase + " text-[#a78bfa]"}
                  value={repeatCount}
                  onChange={(e) => setRepeatCount(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
                    <option key={count} value={count}>
                      {count} ραντεβού
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Duration */}
          <div>
            <label className={labelClass}>ΔΙΑΡΚΕΙΑ (ΛΕΠΤΑ)</label>
            <div className="flex gap-2 items-center">
              <select
                className={fieldBase + " w-32 text-[#a78bfa]"}
                value={
                  DURATION_OPTIONS.includes(Number(duration))
                    ? duration
                    : "custom"
                }
                onChange={handleDurationChange}
              >
                {DURATION_OPTIONS.map((mins) => (
                  <option key={mins} value={mins}>
                    {mins} λεπτά
                  </option>
                ))}
                <option value="custom">Άλλο</option>
              </select>
              {(!DURATION_OPTIONS.includes(Number(duration)) ||
                duration === "" ||
                duration === "custom") && (
                <input
                  className={fieldBase + " w-20 placeholder:text-[#a78bfa]"}
                  type="number"
                  min={10}
                  max={600}
                  step={5}
                  value={durationCustom}
                  onChange={handleDurationCustomChange}
                  placeholder="π.χ. 75"
                  required={
                    appointmentType === "appointment" ||
                    appointmentType === "lock"
                  }
                />
              )}
            </div>
          </div>
{/* Date of Birth (optional) */}
          {appointmentType === "appointment" && (
            <div>
              <label className={labelClass}>ΗΜΕΡΟΜΗΝΙΑ ΓΕΝΝΗΣΗΣ (Προαιρετικό)</label>
             <Controller
  control={control}
  name="dateOfBirth"
  defaultValue=""
  render={({ field }) => (
    <DatePicker
      selected={field.value ? new Date(field.value) : null}
      onChange={(date) =>
        field.onChange(date ? date.toISOString().slice(0, 10) : "")
      }
     onChangeRaw={(e) => {
  let v = e.target.value.replace(/\D/g, ""); // remove non-numbers

  // Auto-pad day
  if (v.length === 1 && parseInt(v, 10) > 3) {
    v = "0" + v; // e.g. 4 → 04
  }

  // Auto-pad month when user just finished typing day
  if (v.length === 3 && parseInt(v[2], 10) > 1) {
    v = v.slice(0, 2) + "0" + v[2];
  }

  // Insert slashes
  if (v.length >= 5) {
    v = v.replace(/(\d{2})(\d{2})(\d{0,4})/, "$1/$2/$3");
  } else if (v.length >= 3) {
    v = v.replace(/(\d{2})(\d{0,2})/, "$1/$2");
  }

  e.target.value = v;
}}
      dateFormat="dd/MM/yyyy"
      placeholderText="ΗΗ/ΜΜ/ΧΧΧΧ"
      className={fieldBase + " w-full !bg-[#181a23] !text-[#a78bfa]"}
      calendarClassName="!bg-[#161a23] !text-[#ede9fe] !rounded-lg !border !border-[#a78bfa]"
      locale="el"
      showYearDropdown
      scrollableYearDropdown
      yearDropdownItemNumber={150}
      maxDate={new Date()}
      isClearable
    />
  )}
/>
            </div>
          )}



          {/* Buttons */}
          <div className="flex gap-2 mt-4">
            <button type="submit" className={primary}>
              {isEditing ? "Ενημέρωση" : "Προσθήκη"}
            </button>
            <button type="button" className={secondary} onClick={onClose}>
              Άκυρο
            </button>
            {isEditing && onDelete && (
              <button
                type="button"
                className={deleteBtn}
                onClick={handleDelete}
              >
                Διαγραφή
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default AppointmentForm;
