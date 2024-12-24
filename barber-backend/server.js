const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./utils/db");
const appointmentRoutes = require("./routes/appointmentRoutes");
const customerRoutes = require("./routes/customerRoutes");
const authRoutes = require("./routes/authRoutes");
const errorHandler = require("./middlewares/errorHandler");
const helmet = require("helmet");
dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 5001;
// Add Helmet middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"], // Allow resources from the same origin
        "style-src": ["'self'", "'unsafe-inline'"], // Allow inline styles
        "img-src": ["'self'", "data:"], // Allow images from same origin and base64
      },
    },
  })
);
const corsOptions = {
  origin: [
    "https://lemoapp-production.up.railway.app", // Production frontend
    "https://lemoapp.netlify.app", // Netlify frontend
    "http://localhost:5173", // Local development
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Allow cookies and other credentials
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

app.use("/api/appointments", appointmentRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/auth", authRoutes);
// Add this route for GET /api
app.get("/api", (req, res) => {
  res.status(200).json({ message: "API is working" });
});
app.use(errorHandler);
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
