const payhereConfig = {
    merchantId: process.env.PAYHERE_MERCHANT_ID,
    merchantSecret: process.env.PAYHERE_MERCHANT_SECRET,
    isSandbox: process.env.NODE_ENV !== 'production', // Use sandbox for non-production environments
    returnUrl: process.env.PAYHERE_RETURN_URL || 'http://localhost:5000/api/payments/notify',
    cancelUrl: process.env.PAYHERE_CANCEL_URL || 'http://localhost:5000/api/payments/cancel',
    notifyUrl: process.env.PAYHERE_NOTIFY_URL || 'http://localhost:5000/api/payments/notify',
  };
  
  module.exports = payhereConfig;