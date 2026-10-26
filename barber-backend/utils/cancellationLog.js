const moment = require("moment-timezone");
const Appointment = require("../models/appointment");
const CancellationLog = require("../models/cancellationLog");

const TZ = "Europe/Athens";

// Records a cancelled appointment for the barbers' bell. Call AFTER the appointment has been
// deleted (so the sibling lookup can't find the cancelled row itself). Best-effort: a logging
// failure must never fail or roll back the cancellation, so this never throws.
async function recordCancellation(appointment, { cancelledBy, user } = {}) {
  try {
    if (!appointment || appointment.type !== "appointment") return null;
    const when = moment(appointment.appointmentDateTime);
    if (!when.isValid()) return null;
    const now = moment();

    let sibling;
    if (appointment.groupId) {
      const other = await Appointment.findOne({
        groupId: appointment.groupId,
        _id: { $ne: appointment._id },
        type: "appointment",
      })
        .select("barber appointmentDateTime bookedFor")
        .lean();
      if (other) {
        sibling = {
          barber: other.barber,
          appointmentDateTime: other.appointmentDateTime,
          bookedFor: other.bookedFor || undefined,
        };
      }
    }

    return await CancellationLog.create({
      appointmentId: appointment._id,
      customerName: appointment.customerName || "",
      phoneNumber: appointment.phoneNumber || "",
      bookedFor: appointment.bookedFor || undefined,
      barber: appointment.barber,
      appointmentDateTime: appointment.appointmentDateTime,
      duration: Number(appointment.duration) || 40,
      cancelledAt: now.toDate(),
      cancelledBy,
      cancelledByUserId: user?._id || null,
      cancelledByName: user ? user.barberName || user.username || "" : "",
      sameDay: when.clone().tz(TZ).format("YYYY-MM-DD") === now.clone().tz(TZ).format("YYYY-MM-DD"),
      fromAutoCustomer: appointment.source?.kind === "auto-customer",
      sibling,
      // Whoever deleted it already knows — don't count it as new for them.
      seenBy: user?._id ? [user._id] : [],
    });
  } catch (error) {
    console.error("⚠️ Failed to record cancellation:", error.message);
    return null;
  }
}

module.exports = { recordCancellation };
