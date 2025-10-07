const express = require("express");
const { sendReminders, processScheduledMessages } = require("../controllers/reminderScheduler");

const router = express.Router();

router.post("/send-reminders", async (req, res) => {
  try {
    await sendReminders();
    await processScheduledMessages();
    res.status(200).json({ message: "Reminders and scheduled messages processed" });
  } catch (error) {
    console.error("Failed to send reminders:", error.message);
    res.status(500).json({ message: "Failed to send reminders" });
  }
});

module.exports = router;
