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
const errorHandler = require("./middlewares/errorHandler");
const helmet = require("helmet");
dotenv.config();

connectDB();

const app = express();
const PORT = process.env.PORT || 5001;
// Add Helmet middleware

const corsOptions = {
  origin: [
    "https://lemoapp-k4ob.onrender.com", // Production frontend

    "https://lemoapp.netlify.app", // Netlify frontend
    "http://localhost:5173", // Local development
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
          ,
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
// Add this route for GET /api
app.get("/api", (req, res) => {
  res.status(200).json({ message: "API is working" });
});

// Schedule reminders every 10 minutes for accurate 24h-ahead delivery
cron.schedule("*/10 * * * *", async () => {
  console.log("⏰ Running 10-minute reminder scheduler...");
  try {
    await sendReminders();
    console.log("Reminders sent successfully.");
  } catch (error) {
    console.error("Error while sending reminders:", error.message);
  }
});

// Run birthday SMS every day at 9:00 AM Athens time
cron.schedule("0 9 * * *", async () => {
  console.log("🎂 Running daily birthday SMS scheduler...");
  try {
    await sendBirthdaySMS();
    console.log("Birthday SMS sent successfully.");
  } catch (error) {
    console.error("Error while sending birthday SMS:", error.message);
  }
});

app.use(errorHandler);
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
