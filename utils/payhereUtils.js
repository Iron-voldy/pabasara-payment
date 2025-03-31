const crypto = require('crypto');
const payhereConfig = require('../config/payhere');

/**
 * Verify PayHere notification signature
 * @param {Object} payload - The PayHere notification payload
 * @returns {Boolean} - Whether the signature is valid
 */
const verifyPayHereSignature = (payload) => {
  const { merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig } = payload;

  // Generate the local signature for verification
  const localSignature = crypto
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

  // Compare with the signature received from PayHere
  return localSignature === md5sig;
};

/**
 * Generate a unique order ID for PayHere transactions
 * @returns {String} - Unique order ID
 */
const generateOrderId = () => {
  return `ORDER-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};

/**
 * Generate PayHere checkout URL
 * @param {Object} paymentInfo - Payment information
 * @returns {String} - PayHere checkout URL
 */
const generateCheckoutUrl = (paymentInfo) => {
  const {
    orderId,
    amount,
    currency = 'LKR',
    itemTitle,
    firstName,
    lastName = '',
    email,
    phone,
    address = '',
    city = '',
    country = 'Sri Lanka',
    customFields = {}
  } = paymentInfo;

  const baseUrl = payhereConfig.isSandbox 
    ? 'https://sandbox.payhere.lk/pay/checkout' 
    : 'https://www.payhere.lk/pay/checkout';
  
  const params = new URLSearchParams({
    merchant_id: payhereConfig.merchantId,
    return_url: payhereConfig.returnUrl,
    cancel_url: payhereConfig.cancelUrl,
    notify_url: payhereConfig.notifyUrl,
    order_id: orderId,
    items: itemTitle,
    amount: amount.toString(),
    currency: currency,
    first_name: firstName,
    last_name: lastName,
    email: email,
    phone: phone,
    address: address,
    city: city,
    country: country
  });

  // Add custom fields if provided
  Object.keys(customFields).forEach((key, index) => {
    params.append(`custom_${index + 1}`, customFields[key]);
  });

  // Generate hash
  const hash = crypto
    .createHash('md5')
    .update(
      payhereConfig.merchantId + 
      orderId + 
      amount.toFixed(2) + 
      currency + 
      payhereConfig.merchantSecret
    )
    .digest('hex')
    .toUpperCase();
  
  params.append('hash', hash);
  
  return `${baseUrl}?${params.toString()}`;
};

module.exports = {
  verifyPayHereSignature,
  generateOrderId,
  generateCheckoutUrl
};