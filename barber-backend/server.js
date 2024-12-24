const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./utils/db");
const appointmentRoutes = require("./routes/appointmentRoutes");
const customerRoutes = require("./routes/customerRoutes");
const authRoutes = require("./routes/authRoutes");
const errorHandler = require("./middlewares/errorHandler");

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 5001;
const corsOptions = {
  origin: ["https://lemoapp-production.up.railway.app"], // Use your frontend's URL
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Allow cookies and other credentials
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(errorHandler);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/auth", authRoutes);
// Add this route for GET /api
app.get("/api", (req, res) => {
  res.status(200).json({ message: "API is working" });
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
