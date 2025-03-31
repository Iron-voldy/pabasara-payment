const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db");

const tripRoutes = require("./routes/tripRoutes");
const scheduleRoutes = require("./routes/sheduleRoutes");
const reserveSeats = require("./routes/reserveSeats");
const trackingRoutes = require("./routes/tracking.route");
const paymentRoutes = require("./routes/paymentRoutes"); 

const { errorHandler } = require("./middleware/errorMiddleware");

dotenv.config();
connectDB();

const app = express();

app.use(
  cors({ origin: '*' })
);

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.use("/api/trips", tripRoutes);
app.use("/api/shedules", scheduleRoutes);
app.use("/api/reserve", reserveSeats);
app.use("/api/tracking", trackingRoutes);
app.use("/api/payments", paymentRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
