const express = require("express");
const { 
  reserveSeats, 
  checkSeatAvailability, 
  getBookedSeats,
  calculatePrice
} = require("../controllers/reserveSeats");

const router = express.Router();

// Check seat availability before payment
router.post("/check", checkSeatAvailability);

// Reserve seats (now handled via payment notification)
router.post("/reserve", reserveSeats);

// Get all booked seats for a schedule
router.get("/booked/:scheduleId", getBookedSeats);

// Calculate price for seats
router.post("/calculate-price", calculatePrice);

module.exports = router;