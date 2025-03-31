const express = require('express');
const {
  initializePayment,
  handlePaymentNotification,
  handlePaymentCancellation,
  getPaymentStatus
} = require('../controllers/paymentController');
const { verifyPayhereRequest } = require('../middleware/payhereMiddleware');

const router = express.Router();

// Initialize payment and get checkout URL
router.post('/initialize', initializePayment);

// PayHere notification endpoint (server-to-server)
// Use the verification middleware for this route
router.post('/notify', verifyPayhereRequest, handlePaymentNotification);

// PayHere payment cancellation
router.get('/cancel', handlePaymentCancellation);

// Get payment status by order ID
router.get('/status/:orderId', getPaymentStatus);

module.exports = router;