const express = require("express");
const router = express.Router();
const Invoice = require("../models/Invoice");

// Save invoice to database
router.post("/save", async (req, res) => {
  try {
    const { billingData, cartItems, shippingFee, grandTotal, paymentStatus } = req.body;
    
    const newInvoice = new Invoice({
      billingData,
      cartItems,
      shippingFee,
      grandTotal,
      paymentStatus: paymentStatus || "Pending" 
    });

    const savedInvoice = await newInvoice.save();
    res.status(201).json(savedInvoice);
  } catch (error) {
    console.error("Invoice save error:", error);
    res.status(500).json({ error: "Failed to save invoice" });
  }
});

// Get all invoices (optional)
router.get("/", async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

module.exports = router;