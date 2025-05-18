const express = require("express");
const Razorpay = require("razorpay");
const router = express.Router();

const razorpay = new Razorpay({
  key_id: "rzp_test_0rqSTvIDKUiY3m",
  key_secret: "r2AXHnli6T3xeduPvznVGXLS",
});

router.post("/create-order", async (req, res) => {
  const { amount } = req.body; // amount is already in paise

  try {
    const order = await razorpay.orders.create({
      amount: amount, // ✅ no conversion needed
      currency: "INR",
      receipt: `order_rcptid_${Date.now()}`,
    });

    res.json(order);
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ message: "Error creating order" });
  }
});


module.exports = router;
