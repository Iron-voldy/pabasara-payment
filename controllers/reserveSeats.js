const BusSchedule = require("../models/busScheduleModel");
const Trip = require("../models/tripModel");

// Check if seats are available before payment
const checkSeatAvailability = async (req, res) => {
  try {
    const { reservationId, bookedSeats } = req.body;

    if (!reservationId || !bookedSeats || bookedSeats.length === 0) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    const schedule = await BusSchedule.findOne({ _id: reservationId });

    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    // Check if seats are already booked
    const alreadyBooked = bookedSeats.filter((seat) => schedule.bookedSeats.includes(seat));

    if (alreadyBooked.length > 0) {
      return res.status(400).json({ 
        message: `Seats ${alreadyBooked.join(", ")} are already booked!`,
        success: false,
        availableSeats: false
      });
    }

    res.status(200).json({ 
      message: "Seats are available", 
      success: true,
      availableSeats: true
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Failed to check seat availability", 
      error: error.message,
      success: false 
    });
  }
};

// This now gets called via the payment notification handler
const reserveSeats = async (req, res) => {
  try {
    const { reservationId, bookedSeats } = req.body;

    if (!reservationId || !bookedSeats || bookedSeats.length === 0) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    const schedule = await BusSchedule.findOne({ _id: reservationId });

    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    // Check if seats are already booked
    const alreadyBooked = bookedSeats.filter((seat) => schedule.bookedSeats.includes(seat));

    if (alreadyBooked.length > 0) {
      return res.status(400).json({ message: `Seats ${alreadyBooked.join(", ")} are already booked!` });
    }

    // Add the booked seats
    schedule.bookedSeats.push(...bookedSeats);
    await schedule.save();

    res.status(200).json({ 
      message: "Seats reserved successfully", 
      updatedSeats: schedule.bookedSeats 
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Failed to reserve seats", 
      error: error.message 
    });
  }
};

// Get all booked seats for a schedule
const getBookedSeats = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    
    const schedule = await BusSchedule.findById(scheduleId);
    
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }
    
    res.status(200).json({
      bookedSeats: schedule.bookedSeats
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch booked seats",
      error: error.message
    });
  }
};

// Calculate price for given seats
const calculatePrice = async (req, res) => {
  try {
    const { reservationId, seatCount } = req.body;
    
    if (!reservationId || !seatCount) {
      return res.status(400).json({ message: "Invalid request data" });
    }
    
    const schedule = await BusSchedule.findById(reservationId).populate('tripId');
    
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }
    
    const pricePerSeat = schedule.tripId.price;
    const totalPrice = pricePerSeat * seatCount;
    
    res.status(200).json({
      pricePerSeat,
      totalPrice,
      currency: 'LKR'
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to calculate price",
      error: error.message
    });
  }
};

module.exports = { 
  reserveSeats,
  checkSeatAvailability,
  getBookedSeats,
  calculatePrice
};