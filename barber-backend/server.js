const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./utils/db");
const cron = require("node-cron");
const noteRoutes = require("./routes/noteRoutes");
const { autoRetryFailedSMS } = require("./controllers/autoRetryFailedSMS");
const { sendBirthdaySMS } = require("./controllers/birthdaySms");

const smsStatusRoutes = require("./routes/smsStatusRoutes");
const smsResendRoute = require("./routes/smsResendRoute");
const folderRoutes = require("./routes/folderRoutes");
const waitingListRoutes = require("./routes/waitingList");
const adminRoutes = require("./routes/adminRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const { sendReminders } = require("./controllers/reminderScheduler");
const customerRoutes = require("./routes/customerRoutes");
const reminderSchedulerRoute = require("./routes/reminderSchedulerRoute");
const authRoutes = require("./routes/authRoutes");
const availabilityRoutes = require("./routes/availabilityRoutes");
const errorHandler = require("./middlewares/errorHandler");
const helmet = require("helmet");
dotenv.config();

connectDB();

const app = express();
const PORT = process.env.PORT || 5002;
// Add Helmet middleware

const corsOptions = {
  origin: [
    "https://lemoapp-k4ob.onrender.com", // Production frontend
    "https://lemoapp.netlify.app", // Netlify frontend
    "https://lemobarbershop.com",
    "https://www.lemobarbershop.com",
    "http://localhost:5173", // Local development
    "http://localhost:3001",
  ],
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Allow cookies and other credentials
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'", "https://lemoapp-k4ob.onrender.com"],
        "style-src": ["'self'", "'unsafe-inline'"], // Allow inline styles
        "img-src": ["'self'", "data:", "https://*"], // Allow base64 and external images
        "script-src": [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://*",
        ], // Allow third-party scripts if needed
        "connect-src": [
          "'self'",
          "https://lemoapp.netlify.app",
          "https://lemoapp-k4ob.onrender.com",
          "https://lemobarbershop.com",
          "https://www.lemobarbershop.com",
        ],
        "frame-src": ["'self'"], // Allow iframes from the same origin
        "font-src": ["'self'", "https://*"], // Allow fonts from external sources
        "worker-src": ["'self'", "blob:"], // Allow web workers
      },
    },
  })
);
app.get("/", (req, res) => {
  res.send("Welcome to the LemoApp Backend!");
});
app.use("/api/notes", noteRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api", smsStatusRoutes);
app.use("/api", smsResendRoute);
app.use("/api/customers", customerRoutes);

app.use("/api/waitingList", waitingListRoutes);
app.use("/api/reminders", reminderSchedulerRoute);
app.use("/api/auth", authRoutes);
app.use("/api", availabilityRoutes);
// Minimal public services endpoint to support direct frontend calls
app.get("/api/services", (req, res) => {
  res.set("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=86400");
  res.json([
    { id: "haircut", name: "Haircut", price: 15, duration: 40 },
  ]);
});
// Add this route for GET /api
app.get("/api", (req, res) => {
  res.status(200).json({ message: "API is working" });
});
app.head("/api/ping", (req, res) => {
  res.status(200).end(); // No body needed for HEAD
});

app.get("/api/ping", (req, res) => {
  const now = new Date().toLocaleString("en-GB", {
    timeZone: "Europe/Athens",
  });
  console.log(`📡 Ping received from UptimeRobot at ${now}`);
  res.status(200).json({ message: "Ping OK" });
});


// Run reminder cron only in production
if (process.env.NODE_ENV === "production") {
  cron.schedule("* * * * *", async () => {
    console.log(`[${new Date().toISOString()}] ⏰ Running 1-minute reminder scheduler...`);
    try {
      await sendReminders();
      console.log("✅ Reminders sent successfully.");
    } catch (error) {
      console.error("❌ Error while sending reminders:", error.message);
    }
  });
  


  // Run birthday SMS every day at 9:00 AM Athens time
  cron.schedule("0 9 * * *", async () => {
    console.log(`[${new Date().toISOString()}] 🎂 Running birthday SMS scheduler...`);
    try {
      await sendBirthdaySMS();
      console.log("🎉 Birthday SMS sent successfully.");
    } catch (error) {
      console.error("❌ Error while sending birthday SMS:", error.message);
    }
  });
}

// TEMPORARY TEST ROUTE for triggering birthday SMS
app.get("/api/test-birthday-sms", async (req, res) => {
  try {
    await sendBirthdaySMS();
    res.status(200).json({ message: "✅ Birthday SMS check triggered" });
  } catch (err) {
    console.error("❌ Error in test-birthday-sms:", err.message);
    res.status(500).json({ error: err.message });
  }
});
app.use(errorHandler);
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
