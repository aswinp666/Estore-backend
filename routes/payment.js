const express = require("express");
const Razorpay = require("razorpay");
const User = require("../models/Users"); // Ensure your User model has an 'orders' field.
const router = express.Router();

// Initialize Razorpay with your credentials.
// Note: In production, store these credentials in environment variables.
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_0rqSTvIDKUiY3m",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "r2AXHnli6T3xeduPvznVGXLS",
});

/*
  Endpoint: POST /create-order
  Description:
    - Expects JSON body with "amount" (number in paise) and "email" (user's email).
    - Creates an order with Razorpay.
    - If the email is provided and a matching user is found, it appends the order
      (with a "pending" status and the Razorpay order ID) to the user's persisted orders.
*/
router.post("/create-order", async (req, res) => {
  const { amount, email } = req.body; // "amount" should be in paise
  try {
    // Create the Razorpay order
    const order = await razorpay.orders.create({
      amount,          // Amount in paise
      currency: "INR",
      receipt: `order_rcptid_${Date.now()}`,
    });

    // If a user email is provided, link this Razorpay order to the user's persisted orders.
    if (email) {
      const user = await User.findOne({ email });
      if (user) {
        user.orders.push({
          products: [],             // Optionally add actual product details if available.
          orderDate: new Date(),    // Save the current date/time
          status: "pending",        // Initial status, update later based on payment confirmation.
          razorpayOrderId: order.id // Store the Razorpay order ID for reference
        });
        await user.save();
      }
    }

    res.json(order);
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ message: "Error creating order" });
  }
});

module.exports = router;
