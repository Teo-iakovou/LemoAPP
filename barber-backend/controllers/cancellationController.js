const CancellationLog = require("../models/cancellationLog");
const Appointment = require("../models/appointment");
const { resolveBarberScope } = require("../utils/appointmentScope");

const LIST_LIMIT = 50;

// Cancellations visible to this staff user: a 'calendar' user only sees their own barber.
function scopedQuery(user) {
  const scope = resolveBarberScope(user);
  if (scope.status) return { error: scope };
  return { query: scope.barber ? { barber: scope.barber } : {} };
}

// GET /api/cancellations → { items, unreadCount }
const listCancellations = async (req, res, next) => {
  try {
    const { query, error } = scopedQuery(req.user);
    if (error) return res.status(error.status).json({ message: error.message });

    const userId = req.user._id;
    const [rows, unreadCount] = await Promise.all([
      CancellationLog.find(query).sort({ cancelledAt: -1 }).limit(LIST_LIMIT).lean(),
      CancellationLog.countDocuments({ ...query, seenBy: { $ne: userId } }),
    ]);

    // Has someone else already taken the freed slot? (only matters for future slots)
    const now = new Date();
    const future = rows.filter((r) => new Date(r.appointmentDateTime) > now);
    const rebooked = new Set();
    if (future.length) {
      const clashes = await Appointment.find({
        type: "appointment",
        appointmentStatus: "confirmed",
        $or: future.map((r) => {
          const start = new Date(r.appointmentDateTime);
          const end = new Date(start.getTime() + (Number(r.duration) || 40) * 60000);
          return { barber: r.barber, appointmentDateTime: { $lt: end }, endTime: { $gt: start } };
        }),
      })
        .select("barber appointmentDateTime endTime")
        .lean();
      future.forEach((r) => {
        const start = new Date(r.appointmentDateTime);
        const end = new Date(start.getTime() + (Number(r.duration) || 40) * 60000);
        if (
          clashes.some(
            (c) =>
              c.barber === r.barber &&
              new Date(c.appointmentDateTime) < end &&
              new Date(c.endTime) > start
          )
        ) {
          rebooked.add(String(r._id));
        }
      });
    }

    const items = rows.map((r) => ({
      _id: r._id,
      customerName: r.customerName,
      phoneNumber: r.phoneNumber,
      bookedFor: r.bookedFor,
      barber: r.barber,
      appointmentDateTime: r.appointmentDateTime,
      cancelledAt: r.cancelledAt,
      cancelledBy: r.cancelledBy,
      cancelledByName: r.cancelledByName,
      sameDay: r.sameDay,
      fromAutoCustomer: r.fromAutoCustomer,
      sibling: r.sibling,
      isPast: new Date(r.appointmentDateTime) <= now,
      slotRebooked: rebooked.has(String(r._id)),
      unread: !(r.seenBy || []).some((id) => String(id) === String(userId)),
    }));

    res.json({ items, unreadCount });
  } catch (error) {
    next(error);
  }
};

// POST /api/cancellations/seen → marks everything this user can see as seen by them.
const markCancellationsSeen = async (req, res, next) => {
  try {
    const { query, error } = scopedQuery(req.user);
    if (error) return res.status(error.status).json({ message: error.message });
    await CancellationLog.updateMany(
      { ...query, seenBy: { $ne: req.user._id } },
      { $addToSet: { seenBy: req.user._id } }
    );
    res.json({ unreadCount: 0 });
  } catch (error) {
    next(error);
  }
};

module.exports = { listCancellations, markCancellationsSeen };
