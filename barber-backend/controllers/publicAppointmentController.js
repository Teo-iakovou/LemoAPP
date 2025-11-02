const Appointment = require("../models/appointment");

function normalizePhone(input = "") {
  try {
    return String(input).replace(/\s+/g, "");
  } catch {
    return String(input || "");
  }
}

const getAppointmentsForPublicUser = async (req, res, next) => {
  try {
    const phoneNumber = normalizePhone(req.publicUser?.phoneNumber || "");
    if (!phoneNumber) {
      return res.status(400).json({ message: "Missing phone number" });
    }

    const appointments = await Appointment.find(
      {
        phoneNumber,
        appointmentStatus: "confirmed",
        type: { $in: ["appointment", "break", "lock"] },
      },
      {
        customerName: 1,
        appointmentDateTime: 1,
        barber: 1,
        type: 1,
        duration: 1,
        endTime: 1,
        repeatInterval: 1,
        repeatCount: 1,
        _id: 1,
      }
    )
      .sort({ appointmentDateTime: 1 })
      .lean();

    res.json({ appointments });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAppointmentsForPublicUser,
};
