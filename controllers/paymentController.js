const Payment = require('../models/paymentModel');
const BusSchedule = require('../models/busScheduleModel');
const Trip = require('../models/tripModel');
const crypto = require('crypto');
const axios = require('axios');
const payhereConfig = require('../config/payhere');

// Create a new payment and get the checkout URL
const initializePayment = async (req, res) => {
  try {
    const { 
      reservationId, 
      bookedSeats, 
      passengerName, 
      passengerEmail, 
      passengerPhone 
    } = req.body;

    if (!reservationId || !bookedSeats || bookedSeats.length === 0) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    // Find the schedule and check if seats are available
    const schedule = await BusSchedule.findById(reservationId).populate('tripId');
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    // Check if seats are already booked
    const alreadyBooked = bookedSeats.filter((seat) => schedule.bookedSeats.includes(seat));
    if (alreadyBooked.length > 0) {
      return res.status(400).json({ 
        message: `Seats ${alreadyBooked.join(", ")} are already booked!` 
      });
    }

    // Calculate the total amount based on number of seats and trip price
    const seatCount = bookedSeats.length;
    const pricePerSeat = schedule.tripId.price;
    const totalAmount = seatCount * pricePerSeat;

    // Generate a unique order ID
    const orderId = `ORDER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create payment record in database
    const payment = new Payment({
      orderId,
      reservationId,
      amount: totalAmount,
      passengerDetails: {
        name: passengerName,
        email: passengerEmail,
        phone: passengerPhone
      },
      bookedSeats,
      status: 'pending'
    });

    await payment.save();

    // Generate PayHere checkout URL directly
    const baseUrl = payhereConfig.isSandbox 
      ? 'https://sandbox.payhere.lk/pay/checkout' 
      : 'https://www.payhere.lk/pay/checkout';
    
    const checkoutParams = new URLSearchParams({
      merchant_id: payhereConfig.merchantId,
      return_url: payhereConfig.returnUrl,
      cancel_url: payhereConfig.cancelUrl,
      notify_url: payhereConfig.notifyUrl,
      order_id: orderId,
      items: `Bus Reservation - ${schedule.tripId.from} to ${schedule.tripId.to}`,
      amount: totalAmount.toString(),
      currency: 'LKR',
      first_name: passengerName,
      last_name: '',
      email: passengerEmail,
      phone: passengerPhone,
      address: '',
      city: '',
      country: 'Sri Lanka',
      custom_1: JSON.stringify({ reservationId, bookedSeats })
    });

    // Generate hash
    const hash = crypto
      .createHash('md5')
      .update(
        payhereConfig.merchantId + 
        orderId + 
        totalAmount.toFixed(2) + 
        'LKR' + 
        payhereConfig.merchantSecret
      )
      .digest('hex')
      .toUpperCase();
    
    checkoutParams.set('hash', hash);
    
    const checkoutUrl = `${baseUrl}?${checkoutParams.toString()}`;

    res.status(200).json({
      message: "Payment initialized",
      orderId,
      checkoutUrl,
      amount: totalAmount
    });

  } catch (error) {
    console.error("Payment initialization error:", error);
    res.status(500).json({
      message: "Failed to initialize payment",
      error: error.message
    });
  }
};

// Handle PayHere notification (server-to-server)
const handlePaymentNotification = async (req, res) => {
  try {
    const { merchant_id, order_id, payment_id, payhere_amount, payhere_currency, status_code, md5sig } = req.body;

    // Verify the MD5 signature from PayHere
    const localSig = crypto
      .createHash('md5')
      .update(
        merchant_id + 
        order_id + 
        payhere_amount + 
        payhere_currency + 
        status_code + 
        payhereConfig.merchantSecret.toUpperCase()
      )
      .digest('hex')
      .toUpperCase();

    if (localSig !== md5sig) {
      console.error('Invalid MD5 signature');
      return res.status(400).json({ message: 'Invalid signature' });
    }

    // Find the payment by order ID
    const payment = await Payment.findOne({ orderId: order_id });
    if (!payment) {
      console.error('Payment not found');
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Update payment status based on PayHere status code
    if (status_code === '2') {
      // PayHere status 2 means success
      payment.status = 'completed';
      payment.paymentId = payment_id;
      payment.paymentResponse = req.body;
      await payment.save();

      // Update the bus schedule to mark seats as booked
      const schedule = await BusSchedule.findById(payment.reservationId);
      if (schedule) {
        schedule.bookedSeats.push(...payment.bookedSeats);
        await schedule.save();
      }

      console.log(`Payment ${order_id} completed successfully`);
      return res.status(200).json({ message: 'Payment completed' });
    } else if (status_code === '0') {
      // PayHere status 0 means pending
      payment.status = 'pending';
      payment.paymentResponse = req.body;
      await payment.save();
      console.log(`Payment ${order_id} is pending`);
      return res.status(200).json({ message: 'Payment pending' });
    } else {
      // Other status codes are considered as failed
      payment.status = 'failed';
      payment.paymentResponse = req.body;
      await payment.save();
      console.log(`Payment ${order_id} failed`);
      return res.status(200).json({ message: 'Payment failed' });
    }
  } catch (error) {
    console.error('Payment notification error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Handle payment cancellation
const handlePaymentCancellation = async (req, res) => {
  try {
    const { order_id } = req.query;
    
    if (!order_id) {
      return res.status(400).json({ message: 'Order ID is required' });
    }

    const payment = await Payment.findOne({ orderId: order_id });
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    payment.status = 'cancelled';
    await payment.save();

    res.status(200).json({ message: 'Payment cancelled' });
  } catch (error) {
    console.error('Payment cancellation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get payment status by order ID
const getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const payment = await Payment.findOne({ orderId }).populate('reservationId');
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.status(200).json({
      status: payment.status,
      orderId: payment.orderId,
      amount: payment.amount,
      bookedSeats: payment.bookedSeats,
      createdAt: payment.createdAt
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  initializePayment,
  handlePaymentNotification,
  handlePaymentCancellation,
  getPaymentStatus
};