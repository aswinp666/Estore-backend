const express = require("express");
const router = express.Router();
const Invoice = require("../models/Invoice");
const authenticateToken = require("../middleware/authenticateToken");

// Save invoice to database - MODIFIED
router.post("/save", async (req, res) => {
  try {
    const {
      billingData,
      cartItems,
      shippingFee,
      grandTotal,
      paymentMethod,
      paymentStatus,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    if (!billingData || !cartItems || !grandTotal || !paymentMethod || !paymentStatus) {
      return res.status(400).json({ error: "Missing required invoice data." });
    }

    const newInvoiceData = {
      billingData,
      cartItems,
      shippingFee: shippingFee || 0,
      grandTotal,
      paymentMethod,
      paymentStatus,
      orderStatus: "Processing",
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    };

    const newInvoice = new Invoice(newInvoiceData);
    const savedInvoice = await newInvoice.save();
    res.status(201).json(savedInvoice);

  } catch (error) {
    console.error("Invoice save error:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to save invoice. Please try again later." });
  }
});

// Get all invoices
router.get("/", async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 }).lean();
    res.json(invoices);
  } catch (error) {
    console.error("Fetch all invoices error:", error);
    res.status(500).json({ error: "Failed to fetch invoices." });
  }
});

//--NEW ROUTE: Get Orders for the currently logged-in user---
router.get("/my-orders", authenticateToken, async (req, res) => {
  try {
    const userOrders = await Invoice.find({ 'billingData.email': req.user.email })
      .sort({ createdAt: -1 })
      .lean();
      res.json(userOrders);
  }catch (error) {
    console.error("Fetch user orders error:", error);
    res.status(500).json({ error: "Failed to fetch user orders." });
  }
});
//End of NEW ROUTE

// Get a single invoice by ID - NEW or ensure it exists and is correct
router.get("/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).lean();
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found." });
    }
    res.json(invoice);
  } catch (error) {
    console.error("Fetch single invoice error:", error);
    if (error.name === 'CastError') {
        return res.status(400).json({ error: "Invalid invoice ID format." });
    }
    res.status(500).json({ error: "Failed to fetch invoice details." });
  }
});

// Update order status - NEW
router.put("/:id/status", async (req, res) => {
  try {
    const { orderStatus } = req.body;

    const validOrderStatuses = Invoice.schema.path('orderStatus').enumValues;
    if (!orderStatus || !validOrderStatuses.includes(orderStatus)) {
      return res.status(400).json({ error: "Invalid or missing order status provided." });
    }

    const updatedInvoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { orderStatus },
      { new: true, runValidators: true }
    );

    if (!updatedInvoice) {
      return res.status(404).json({ error: "Invoice not found to update." });
    }
    res.json(updatedInvoice);
  } catch (error) {
    console.error("Order status update error:", error);
    if (error.name === 'CastError') {
        return res.status(400).json({ error: "Invalid invoice ID format." });
    }
    if (error.name === 'ValidationError') {
        return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to update order status." });
  }
});

// --- NEW ROUTE: Request a return for a specific item in an order ---
router.put("/order/:orderId/item/:itemId/return", authenticateToken, async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason, details } = req.body;

    if (!reason) {
      return res.status(400).json({ error: "Return reason is required." });
    }

    const order = await Invoice.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    // Optional: Verify if the order belongs to the authenticated user
    // if (order.billingData.email !== req.user.email) {
    //     return res.status(403).json({ error: "Forbidden: You cannot modify this order." });
    // }

    const itemToReturn = order.cartItems.find(item => item._id.toString() === itemId);

    if (!itemToReturn) {
      return res.status(404).json({ error: "Item not found in this order." });
    }

    if (itemToReturn.returnStatus !== "NotReturned") {
        return res.status(400).json({ error: `Item return status is already '${itemToReturn.returnStatus}'.` });
    }

    itemToReturn.returnStatus = "ReturnRequested";
    itemToReturn.returnReason = reason;
    itemToReturn.returnDetails = details || "";

    await order.save();

    res.json({ message: "Return requested successfully.", order });

  } catch (error) {
    console.error("Return request error:", error);
    if (error.name === 'CastError') {
        return res.status(400).json({ error: "Invalid Order ID or Item ID format." });
    }
    res.status(500).json({ error: "Failed to process return request." });
  }
});

// --- NEW ROUTE: Admin Update a specific item's return status in an order ---
router.put("/order/:orderId/item/:itemId/update-return-status", authenticateToken, async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { newReturnStatus } = req.body; // e.g., "Returned", "ReturnRejected"

    if (!newReturnStatus) {
      return res.status(400).json({ error: "New return status is required." });
    }

    const validAdminReturnStatuses = ["Returned", "ReturnRejected"];
    if (!validAdminReturnStatuses.includes(newReturnStatus)) {
      return res.status(400).json({ error: "Invalid return status provided for update." });
    }

    const order = await Invoice.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    // Ensure the user updating is authorized (e.g., admin check)
    // This is a placeholder; you'd need actual admin role verification here.
    // if (!req.user.isAdmin) {
    //     return res.status(403).json({ error: "Forbidden: Not authorized to update return status." });
    // }

    const itemToUpdate = order.cartItems.find(item => item._id.toString() === itemId);

    if (!itemToUpdate) {
      return res.status(404).json({ error: "Item not found in this order." });
    }

    // Only allow status change if it's currently "ReturnRequested"
    if (itemToUpdate.returnStatus !== "ReturnRequested") {
        return res.status(400).json({ error: `Cannot update return status from '${itemToUpdate.returnStatus}'. It must be 'ReturnRequested'.` });
    }

    itemToUpdate.returnStatus = newReturnStatus;
    // Optionally, you might want to log who updated it, or a timestamp

    await order.save();

    res.json({ message: "Return status updated successfully.", order });

  } catch (error) {
    console.error("Update return status error:", error);
    if (error.name === 'CastError') {
        return res.status(400).json({ error: "Invalid Order ID or Item ID format." });
    }
    res.status(500).json({ error: "Failed to update return status." });
  }
});


module.exports = router;