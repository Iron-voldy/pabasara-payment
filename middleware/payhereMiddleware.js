const crypto = require('crypto');
const payhereConfig = require('../config/payhere');

/**
 * Middleware to verify PayHere IPN (Instant Payment Notification) requests
 * This ensures the request is genuinely from PayHere
 */
const verifyPayhereRequest = (req, res, next) => {
  try {
    // For notification endpoint
    if (req.path === '/notify' && req.method === 'POST') {
      const { merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig } = req.body;
      
      // Check if required fields are present
      if (!merchant_id || !order_id || !payhere_amount || !payhere_currency || !status_code || !md5sig) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Verify merchant ID
      if (merchant_id !== payhereConfig.merchantId) {
        console.error('Invalid merchant ID');
        return res.status(400).json({ message: 'Invalid merchant ID' });
      }
      
      // Calculate signature using the same method as in PayHere
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
      
      // Verify signature
      if (localSig !== md5sig) {
        console.error('Invalid signature');
        return res.status(400).json({ message: 'Invalid signature' });
      }
    }
    
    // If everything is okay, proceed
    next();
  } catch (error) {
    console.error('PayHere verification error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { verifyPayhereRequest };