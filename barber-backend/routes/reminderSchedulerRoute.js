const express = require("express");
const { sendReminders, processScheduledMessages } = require("../controllers/reminderScheduler");
const requireUser = require("../middlewares/requireUser");

const router = express.Router();

// Manual trigger only — the cron scheduler calls sendReminders() in-process, not
// this HTTP route, so admin auth is the right gate (no shared-secret cron path).
router.post("/send-reminders", requireUser, async (req, res) => {
  try {
    const dryRun = String(req.query.dryRun || "") === "1";
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 0;
    if (!dryRun && !limit) {
      return res
        .status(400)
        .json({ message: "Set dryRun=1 or provide limit" });
    }
    await sendReminders({ dryRun, limit, trigger: "manual" });
    await processScheduledMessages();
    res.status(200).json({ message: "Reminders and scheduled messages processed" });
  } catch (error) {
    console.error("Failed to send reminders:", error.message);
    res.status(500).json({ message: "Failed to send reminders" });
  }
});

module.exports = router;
