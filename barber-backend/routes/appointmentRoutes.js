const express = require("express");
const {
  createAppointment,
  createLockSeriesBatch,
  getAppointments,
  updateAppointment,
  deleteAppointment,
  getPastAppointments,
  getUpcomingAppointments,
  getRecentLocks,
  getMyAppointments,
} = require("../controllers/appointmentController");
const requireUser = require("../middlewares/requireUser");
const requireFullAdmin = require("../middlewares/requireFullAdmin");
// const validatePassword = require("../middlewares/validatePassword");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const bookingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: "Πάρα πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο / Too many attempts. Please try again shortly." });
  },
});

// PUBLIC: the booking site creates appointments here (anonymous or public-user
// token). Staff callers are identified from their token inside the controller.
router.post("/", bookingLimiter, createAppointment);

// STAFF-ONLY bulk locks (Bulk Locks page): one request for the whole batch, each series
// committed atomically server-side. Deliberately NOT behind bookingLimiter — it's a single
// authenticated admin action, not a public booking. Does not touch the public POST "/" above.
router.post("/lock-series", requireUser, createLockSeriesBatch);

// Admin-only: returns full customer PII + reminder history, and has no callers in
// either frontend. Locked rather than scoped.
router.get("/", requireUser, requireFullAdmin, getAppointments);

router.put("/:id", requireUser, updateAppointment); //, validatePassword it used to be here
router.delete("/:id", requireUser, deleteAppointment); //, validatePassword it used to be here

// Authenticated staff only — these return customer names/phones. The controller
// additionally scopes a 'calendar' user to their own barber.
router.get("/upcoming", requireUser, getUpcomingAppointments);
router.get("/locks", requireUser, getRecentLocks);
router.get("/past", requireUser, getPastAppointments);
router.get("/mine", requireUser, getMyAppointments);
module.exports = router;
