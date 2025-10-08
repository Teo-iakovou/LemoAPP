const Appointment = require("../models/appointment");
const Customer = require("../models/customer");
const { sendSMS } = require("../utils/smsService");
const moment = require("moment-timezone");
function normalizePhone(input = "") {
  try {
    return String(input).replace(/\s+/g, "");
  } catch {
    return String(input || "");
  }
}

// Create an appointment
const createAppointment = async (req, res, next) => {
  try {
    console.log("📥 Received Payload on Server:", req.body);

    const {
      customerName,
      phoneNumber,
      appointmentDateTime,
      barber,
      type,
      recurrence,
      repeatInterval, // How many weeks between each appointment
      repeatCount, // Total number of appointments
      dateOfBirth,
      duration: rawDuration,
      endTime: rawEndTime,
      lockReason,
      createdBy,
    } = req.body;

    const appointmentType = ["appointment", "break", "lock"].includes(
      type
    )
      ? type
      : "appointment";

    // Validate required fields
    if (
      appointmentType === "appointment" &&
      (!customerName || !phoneNumber)
    ) {
      return res
        .status(400)
        .json({ error: "Customer name and phone number are required." });
    }

    if (!appointmentDateTime) {
      return res.status(400).json({ error: "Appointment time is required." });
    }

    // Ensure repeatCount does not exceed 5 (total occurrences)
    const maxRepeat = Math.min(parseInt(repeatCount, 10) || 1, 5);
    // Allow weekly interval up to 20 weeks
    const intervalWeeks = Math.min(parseInt(repeatInterval, 10) || 1, 20);

    // Validate appointment date
    const appointmentDateUTC = moment(appointmentDateTime).utc();
    if (!appointmentDateUTC.isValid()) {
      return res.status(400).json({ message: "Invalid appointment date." });
    }

    // Check if appointment is in the past
    const isPastDate = appointmentDateUTC.isBefore(moment().utc());

    // Convert to Athens time for logging
    const appointmentDateAthens = appointmentDateUTC
      .clone()
      .tz("Europe/Athens");
    console.log(
      "📅 Appointment Date (Athens Time):",
      appointmentDateAthens.format()
    );

    // Normalize phone to avoid duplicates caused by spaces
    const phone = phoneNumber ? normalizePhone(phoneNumber) : "";

    // Check if customer exists, otherwise create a new one
    let customer = null;
    if (appointmentType === "appointment") {
      customer = await Customer.findOne({ phoneNumber: phone });
      if (!customer) {
        customer = new Customer({
          name: customerName,
          phoneNumber: phone,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        });
        await customer.save();
      } else {
        // Optionally update DOB if provided and different
        if (dateOfBirth && (!customer.dateOfBirth || customer.dateOfBirth.toISOString().slice(0,10) !== dateOfBirth)) {
          customer.dateOfBirth = new Date(dateOfBirth);
        }
        // If a different name is provided, keep this as the same person
        // by updating the stored customer name to the latest provided name.
        if (customerName && typeof customerName === 'string') {
          const incoming = customerName.trim();
          const existing = (customer.name || "").trim();
          if (incoming && incoming.toLowerCase() !== existing.toLowerCase()) {
            customer.name = incoming;
          }
        }
        await customer.save();
      }
    }


    // Calculate end time in UTC
    // Accept duration from req.body or fallback to default
    const parsedDuration = Number(rawDuration);
    let duration;
    let endTimeUTC;

    if (appointmentType === "lock") {
      if (!barber) {
        return res.status(400).json({ error: "Barber is required to lock time." });
      }
      let lockDuration = Number.isFinite(parsedDuration) ? parsedDuration : null;
      if ((!lockDuration || lockDuration <= 0) && rawEndTime) {
        const endMoment = moment(rawEndTime).utc();
        if (endMoment.isValid()) {
          lockDuration = Math.max(
            1,
            Math.round(
              (endMoment.toDate().getTime() - appointmentDateUTC.toDate().getTime()) /
                60000
            )
          );
        }
      }
      if (!lockDuration || lockDuration <= 0) {
        return res
          .status(400)
          .json({ error: "Lock duration must be greater than 0 or provide a valid end time." });
      }
      duration = lockDuration;
      endTimeUTC = appointmentDateUTC.clone().add(lockDuration, "minutes").toDate();
    } else if (appointmentType === "break") {
      duration = Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : 0;
      endTimeUTC = duration
        ? appointmentDateUTC.clone().add(duration, "minutes").toDate()
        : appointmentDateUTC.toDate();
    } else {
      duration = Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : 40;
      endTimeUTC = appointmentDateUTC.clone().add(duration, "minutes").toDate();
    }

    const effectiveName = customer ? customer.name : customerName;
    const newAppointment = new Appointment({
      customerName: effectiveName,
      phoneNumber: appointmentType === "appointment" ? phone : undefined,
      appointmentDateTime: appointmentDateUTC.toDate(),
      barber,
      duration,
      appointmentStatus: "confirmed",
      type: appointmentType,
      endTime: endTimeUTC,
      recurrence: recurrence === "weekly" ? "weekly" : "one-time",
      repeatInterval: recurrence === "weekly" ? intervalWeeks : null,
      repeatCount: recurrence === "weekly" ? maxRepeat : null,
      lockReason:
        appointmentType === "lock" && typeof lockReason === "string"
          ? lockReason.trim()
          : appointmentType === "lock"
          ? ""
          : undefined,
      createdBy: createdBy || undefined,
    });

    const savedAppointment = await newAppointment.save();

    // Generate recurring appointments if applicable
    let additionalAppointments = [];
    if (recurrence === "weekly" && maxRepeat > 1) {
      if (appointmentType === "appointment") {
        additionalAppointments = await generateRecurringAppointments({
          customerName,
          phoneNumber,
          barber,
          initialAppointmentDate: appointmentDateUTC,
          duration,
          intervalWeeks,
          repeatCount: maxRepeat - 1, // Since the first appointment is already created
        });
      } else if (appointmentType === "lock") {
        additionalAppointments = await generateRecurringLocks({
          barber,
          initialAppointmentDate: appointmentDateUTC,
          duration,
          intervalWeeks,
          repeatCount: maxRepeat - 1,
          lockReason: lockReason || "",
          createdBy,
        });
      }
    }

    // Send confirmation SMS (split for 10/20-week recurrences)
    if (appointmentType === "appointment" && !isPastDate) {
      try {
        let result;
        if (recurrence === "weekly" && maxRepeat > 1) {
          const allMoments = [
            appointmentDateAthens.clone(),
            ...additionalAppointments.map((appt) =>
              moment(appt.appointmentDateTime).tz("Europe/Athens")
            ),
          ];
          const labels = allMoments.map((m) => m.format("DD/MM/YYYY HH:mm"));

          const shouldSplit = (intervalWeeks === 10 || intervalWeeks === 20) && maxRepeat > 5;
          if (shouldSplit) {
            const firstHalf = labels.slice(0, 5);
            const secondHalf = labels.slice(5);
            const msg1 = `Επιβεβαιώνουμε τα ραντεβού σας στο LEMO BARBER SHOP με τον ${barber} για τις ημερομηνίες: ${firstHalf.join(", ")}.`;
            result = await sendSMS(phoneNumber, msg1);
            savedAppointment.reminders.push({
              type: "confirmation",
              sentAt: new Date(),
              messageId: result?.message_id || result?.messageId || null,
              status: result?.success ? "sent" : "failed",
              messageText: msg1,
              senderId: "Lemo Barber",
              retryCount: 0,
            });

            const halfWeeks = Math.floor(intervalWeeks / 2);
            const sendAt = appointmentDateUTC.clone().add(halfWeeks, "weeks").toDate();
            const ScheduledMessage = require("../models/ScheduledMessage");
            await ScheduledMessage.create({
              phoneNumber,
              messageText: `Επιβεβαιώνουμε τα επιπλέον ραντεβού σας στο LEMO BARBER SHOP με τον ${barber}: ${secondHalf.join(", ")}.`,
              sendAt,
              status: "pending",
              type: "recurrence-followup",
              appointmentIds: [savedAppointment._id, ...additionalAppointments.map((a) => a._id)],
              barber,
            });
          } else {
            const msg = `Επιβεβαιώνουμε τα ραντεβού σας στο LEMO BARBER SHOP με τον ${barber} για τις ημερομηνίες: ${labels.join(", ")}.`;
            result = await sendSMS(phoneNumber, msg);
            savedAppointment.reminders.push({
              type: "confirmation",
              sentAt: new Date(),
              messageId: result?.message_id || result?.messageId || null,
              status: result?.success ? "sent" : "failed",
              messageText: msg,
              senderId: "Lemo Barber",
              retryCount: 0,
            });
          }
        } else {
          const formattedLocalTime = appointmentDateAthens.format("DD/MM/YYYY HH:mm");
          const msg = `Επιβεβαιώνουμε το ραντεβού σας στο LEMO BARBER SHOP με τον ${barber} για τις ${formattedLocalTime}!`;
          result = await sendSMS(phoneNumber, msg);
          savedAppointment.reminders.push({
            type: "confirmation",
            sentAt: new Date(),
            messageId: result?.message_id || result?.messageId || null,
            status: result?.success ? "sent" : "failed",
            messageText: msg,
            senderId: "Lemo Barber",
            retryCount: 0,
          });
        }
        await savedAppointment.save();
      } catch (smsError) {
        console.error("❌ Failed to send confirmation SMS:", smsError.message);
      }
    }

    res.status(201).json({
      message: "Appointments created successfully.",
      ...(customer && {
        customer: {
          name: customer.name,
          phoneNumber: customer.phoneNumber,
        },
      }),
      initialAppointment: savedAppointment,
      recurringAppointments: additionalAppointments,
    });
  } catch (error) {
    next(error);
  }
};

// 🔄 Generate Recurring Appointments with Dynamic Week Intervals
const generateRecurringAppointments = async ({
  customerName,
  phoneNumber,
  barber,
  initialAppointmentDate,
  duration,
  intervalWeeks,
  repeatCount,
}) => {
  const appointments = [];
  let currentDateUTC = initialAppointmentDate.clone();

  for (let i = 1; i <= repeatCount; i++) {
    currentDateUTC.add(intervalWeeks, "weeks"); // Apply the interval dynamically
    const recurringEndTimeUTC = currentDateUTC
      .clone()
      .add(duration, "minutes")
      .toDate();

    const additionalAppointment = new Appointment({
      customerName,
      phoneNumber,
      appointmentDateTime: currentDateUTC.toDate(),
      barber,
      duration,
      endTime: recurringEndTimeUTC,
      recurrence: "weekly",
      appointmentStatus: "confirmed",
      type: "appointment",
    });

    const savedAppointment = await additionalAppointment.save();
    appointments.push(savedAppointment);
  }

  return appointments;
};

const generateRecurringLocks = async ({
  barber,
  initialAppointmentDate,
  duration,
  intervalWeeks,
  repeatCount,
  lockReason,
  createdBy,
}) => {
  const locks = [];
  let currentDateUTC = initialAppointmentDate.clone();

  for (let i = 1; i <= repeatCount; i++) {
    currentDateUTC.add(intervalWeeks, "weeks");

    const lock = new Appointment({
      appointmentDateTime: currentDateUTC.toDate(),
      barber,
      duration,
      endTime: currentDateUTC.clone().add(duration, "minutes").toDate(),
      appointmentStatus: "confirmed",
      type: "lock",
      lockReason: lockReason || "",
      createdBy: createdBy || undefined,
      recurrence: "weekly",
      repeatInterval: intervalWeeks,
      repeatCount: null,
    });

    const savedLock = await lock.save();
    locks.push(savedLock);
  }

  return locks;
};

// Get all appointments
const getAppointments = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;

  try {
    // Only fetch necessary fields; adjust as needed
    const appointments = await Appointment.find(
      {},
      {
        customerName: 1,
        phoneNumber: 1,
        appointmentDateTime: 1,
        barber: 1,
        type: 1,
        appointmentStatus: 1,
        duration: 1,
        endTime: 1,
        reminders: 1,
        lockReason: 1,
      }
    )
      .sort({ appointmentDateTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(); // 🚀

    const total = await Appointment.countDocuments();

    res.json({
      total,
      page,
      limit,
      appointments,
    });
  } catch (error) {
    next(error);
  }
};

// Update an appointment
const updateAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      appointmentDateTime,
      duration,
      endTime,
      phoneNumber,
      barber,
      ...updateData
    } = req.body;

    console.log("🔥 Incoming Update Request:", req.body);
    console.log("🔍 Appointment ID:", id);

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    console.log("📅 Existing Appointment Before Update:", appointment);

    const oldFormattedDate = moment(appointment.appointmentDateTime)
      .tz("Europe/Athens")
      .format("DD/MM/YYYY HH:mm");

    if (appointmentDateTime) {
      const newDate = new Date(appointmentDateTime);
      appointment.appointmentDateTime = newDate;
      const effectiveDuration =
        typeof duration === "number" && duration > 0
          ? duration
          : appointment.duration || 40;
      appointment.duration = effectiveDuration;
      appointment.endTime = new Date(
        newDate.getTime() + effectiveDuration * 60 * 1000
      );
    }

    if (typeof duration === "number" && duration > 0 && !appointmentDateTime) {
      appointment.duration = duration;
      appointment.endTime = new Date(
        appointment.appointmentDateTime.getTime() + duration * 60 * 1000
      );
    }

    if (endTime) {
      const newEnd = new Date(endTime);
      if (!Number.isNaN(newEnd.getTime())) {
        appointment.endTime = newEnd;
        const diff = Math.max(
          1,
          Math.round(
            (newEnd.getTime() - appointment.appointmentDateTime.getTime()) /
              60000
          )
        );
        appointment.duration = diff;
      }
    }

    if (barber) {
      appointment.barber = barber;
    }

    Object.assign(appointment, updateData);

    // ✅ Ensure 'type' is present for reminder compatibility
    if (!appointment.type) {
      appointment.type = "appointment";
    }

    const newFormattedDate = moment(appointment.appointmentDateTime)
      .tz("Europe/Athens")
      .format("DD/MM/YYYY HH:mm");

    const now = moment().utc();
    const isPast = moment(appointment.appointmentDateTime).isBefore(now);

    if (appointment.type === "appointment" && !isPast) {
      try {
        const message = `Το ραντεβού σας στο LEMO BARBER SHOP στις ${oldFormattedDate}, έχει αλλάξει για ${newFormattedDate}.`;
        const smsResponse = await sendSMS(
          phoneNumber || appointment.phoneNumber,
          message
        );

        const messageId = smsResponse?.message_id || smsResponse?.messageId;

        appointment.reminders.push({
          type: "update",
          sentAt: new Date(),
          messageId: messageId || null,
          messageText: message,
          senderId: "Lemo Barber",
          status: smsResponse?.success ? "sent" : "failed",
          retryCount: 0,
        });

        console.log("📲 Update SMS sent successfully");
      } catch (smsError) {
        console.error("❌ Failed to send update SMS:", smsError.message);
      }
    } else {
      console.log("📵 No Update SMS sent because appointment is in the past.");
    }

    await appointment.save();

    res.status(200).json({
      success: true,
      message:
        appointment.type === "appointment"
          ? "Appointment updated successfully and SMS sent"
          : "Appointment updated successfully",
      updatedAppointment: appointment,
    });
  } catch (error) {
    console.error("❌ Error updating appointment:", error);
    next(error);
  }
};

// Delete an appointment
const deleteAppointment = async (req, res, next) => {
  try {
    const { id } = req.params; // Appointment ID from the route

    // Find the appointment before deleting it to retrieve customer details
    const appointmentToDelete = await Appointment.findById(id);

    if (!appointmentToDelete) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });
    }

    // Delete the appointment
    const deletedAppointment = await Appointment.findByIdAndDelete(id);

    if (deletedAppointment) {
      // Send SMS confirmation for deleted appointment
      const now = moment().utc();
      const isPastAppointment = moment(
        deletedAppointment.appointmentDateTime
      ).isBefore(now);

      if (deletedAppointment.type === "appointment" && !isPastAppointment) {
        try {
          const formattedDateTime = moment(
            deletedAppointment.appointmentDateTime
          )
            .tz("Europe/Athens")
            .format("DD/MM/YYYY HH:mm");
          const message = `Θα θέλαμε να σας ενημερώσουμε ότι το ραντεβού σας για ${formattedDateTime} ακυρώνεται.`;

          await sendSMS(deletedAppointment.phoneNumber, message);
          console.log("📲 Deletion SMS sent successfully");
        } catch (smsError) {
          console.error("❌ Failed to send deletion SMS:", smsError.message);
        }
      } else {
        console.log(
          "📵 No Deletion SMS sent because appointment was in the past or not a standard appointment."
        );
      }

      return res.status(200).json({
        success: true,
        message:
          deletedAppointment.type === "appointment"
            ? "Appointment deleted successfully and SMS sent"
            : "Appointment deleted successfully",
      });
    }
  } catch (error) {
    next(error); // Pass any errors to the error-handling middleware
  }
};

const getUpcomingAppointments = async (req, res) => {
  try {
    const startOfYesterday = moment()
      .subtract(1, "day")
      .startOf("day")
      .toDate();

    const appointments = await Appointment.find(
      {
        appointmentDateTime: { $gte: startOfYesterday },
        appointmentStatus: "confirmed",
        type: { $in: ["appointment", "break", "lock"] },
      },
      {
        customerName: 1,
        phoneNumber: 1,
        appointmentDateTime: 1,
        barber: 1,
        type: 1,
        duration: 1,
        endTime: 1,
        _id: 1,
      }
    )
      .sort({ appointmentDateTime: 1 })
      .lean();

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch upcoming appointments" });
  }
};

const getPastAppointments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const today = new Date();

    const appointments = await Appointment.find({
      appointmentDateTime: { $lt: today },
    })
      .sort({ appointmentDateTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Appointment.countDocuments({
      appointmentDateTime: { $lt: today },
    });

    res.json({ total, page, limit, appointments });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch past appointments" });
  }
};
module.exports = {
  createAppointment,
  getAppointments,
  updateAppointment,
  deleteAppointment,
  getUpcomingAppointments,
  getPastAppointments,
};
