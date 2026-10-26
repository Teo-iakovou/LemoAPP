const CancellationLog = require("../models/cancellationLog");
const Customer = require("../models/customer");
const Appointment = require("../models/appointment");
const { resolveBarberScope } = require("../utils/appointmentScope");

const PAGE_SIZE_DEFAULT = 50;
const PAGE_SIZE_MAX = 200;
const BARBERS = ["ΛΕΜΟ", "ΦΟΡΟΥ", "ΚΟΥΣΙΗΣ"];

// Cancellations visible to this staff user: a 'calendar' user only sees their own barber.
function scopedQuery(user) {
  const scope = resolveBarberScope(user);
  if (scope.status) return { error: scope };
  return { query: scope.barber ? { barber: scope.barber } : {} };
}

// GET /api/cancellations?page=1&limit=50&barber=ΛΕΜΟ → { items, total, page, limit, unreadCount }
// Full history (newest first), paged. `barber` is an optional filter. unreadCount ignores the
// filter (it drives the navbar badge). ?countOnly=1 returns just { unreadCount }.
const listCancellations = async (req, res, next) => {
  try {
    const { query, error } = scopedQuery(req.user);
    if (error) return res.status(error.status).json({ message: error.message });

    const userId = req.user._id;
    const unreadQuery = { ...query, seenBy: { $ne: userId } };
    if (req.query.countOnly) {
      return res.json({ unreadCount: await CancellationLog.countDocuments(unreadQuery) });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      PAGE_SIZE_MAX,
      Math.max(1, parseInt(req.query.limit, 10) || PAGE_SIZE_DEFAULT)
    );
    const listQuery = { ...query };
    if (BARBERS.includes(req.query.barber) && !query.barber) listQuery.barber = req.query.barber;

    const [rows, total, unreadCount] = await Promise.all([
      CancellationLog.find(listQuery)
        .sort({ cancelledAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CancellationLog.countDocuments(listQuery),
      CancellationLog.countDocuments(unreadQuery),
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

    res.json({ items, total, page, limit, unreadCount });
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

// GET /api/customers/:id/cancellations → every logged cancellation for this customer's phone
// (matched on the last 8 digits, so "+357…" and bare numbers both match). Owner-only.
const listCustomerCancellations = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id).select("phoneNumber").lean();
    if (!customer) return res.status(404).json({ message: "Customer not found." });
    const digits = String(customer.phoneNumber || "").replace(/\D+/g, "").slice(-8);
    if (!digits) return res.json({ items: [] });
    const rows = await CancellationLog.find({ phoneNumber: new RegExp(`${digits}$`) })
      .sort({ cancelledAt: -1 })
      .limit(100)
      .lean();
    res.json({
      items: rows.map((r) => ({
        _id: r._id,
        barber: r.barber,
        appointmentDateTime: r.appointmentDateTime,
        bookedFor: r.bookedFor,
        cancelledAt: r.cancelledAt,
        cancelledBy: r.cancelledBy,
        cancelledByName: r.cancelledByName,
        sameDay: r.sameDay,
      })),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { listCancellations, markCancellationsSeen, listCustomerCancellations };
