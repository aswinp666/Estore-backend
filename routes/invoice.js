const express = require("express");
const router = express.Router();
const Invoice = require("../models/Invoice"); // Ensure this path is correct
const authenticateToken = require("../middleware/authenticateToken"); // Ensure this path is correct

// Save invoice to database - MODIFIED
router.post("/save", async (req, res) => {
  try {
    // Destructure all expected fields from the request body, including new ones
    const {
      billingData,
      cartItems,
      shippingFee,
      grandTotal,
      paymentMethod, // Crucial: 'razorpay' or 'cod'
      paymentStatus, // Expected from frontend logic (e.g., "Paid", "Cash On Delivery", "Failed")
      razorpayOrderId, // Optional, for Razorpay payments
      razorpayPaymentId, // Optional, for Razorpay payments
      razorpaySignature, // Optional, for Razorpay payments
    } = req.body;

    // Validate required fields
    if (!billingData || !cartItems || !grandTotal || !paymentMethod || !paymentStatus) {
      return res.status(400).json({ error: "Missing required invoice data." });
    }

    const newInvoiceData = {
      billingData,
      cartItems,
      shippingFee: shippingFee || 0, // Default shipping fee if not provided
      grandTotal,
      paymentMethod,
      paymentStatus,
      orderStatus: "Processing", // Default order status on creation
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    };

    // If it's a COD order and paymentStatus is "Cash On Delivery",
    // orderStatus can remain "Processing" or you might have a specific initial COD status.
    // If it's a successful online payment ("Paid"), orderStatus is "Processing".
    // If payment failed, you still might want to record the attempt.

    const newInvoice = new Invoice(newInvoiceData);
    const savedInvoice = await newInvoice.save();
    res.status(201).json(savedInvoice);

  } catch (error) {
    console.error("Invoice save error:", error);
    // Provide more specific error messages if possible (e.g., validation errors)
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to save invoice. Please try again later." });
  }
});

// Get all invoices
router.get("/", async (req, res) => {
  try {
    // .lean() can make queries faster if you don't need Mongoose documents (e.g., for read-only ops)
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
      res.json(userOrders); //send the array of orders
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
    // Handle CastError if ID format is invalid
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

    // Validate the incoming orderStatus against the enum defined in your schema
    const validOrderStatuses = Invoice.schema.path('orderStatus').enumValues;
    if (!orderStatus || !validOrderStatuses.includes(orderStatus)) {
      return res.status(400).json({ error: "Invalid or missing order status provided." });
    }

    const updatedInvoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { orderStatus },
      { new: true, runValidators: true } // `new: true` returns the modified document
                                       // `runValidators: true` ensures schema validations are run on update
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
    const { reason, details } = req.body; // Reason and details from the frontend

    if (!reason) {
      return res.status(400).json({ error: "Return reason is required." });
    }

    const order = await Invoice.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    // Optional: Verify if the order belongs to the authenticated user
    if (order.billingData.email !== req.user.email) {
        // This check assumes req.user.email is populated by authenticateToken
        // Adjust if admin users have different authorization logic
        // return res.status(403).json({ error: "Forbidden: You cannot modify this order." });
    }

    const itemToReturn = order.cartItems.find(item => item._id.toString() === itemId);

    if (!itemToReturn) {
      return res.status(404).json({ error: "Item not found in this order." });
    }

    // Check if the item can be returned (e.g., not already returned/requested)
    if (itemToReturn.returnStatus !== "NotReturned") {
        return res.status(400).json({ error: `Item return status is already '${itemToReturn.returnStatus}'.` });
    }

    itemToReturn.returnStatus = "ReturnRequested"; // Or "Returned" if auto-approved
    itemToReturn.returnReason = reason;
    itemToReturn.returnDetails = details || ""; // Optional details

    await order.save();

    // Optionally: Send notification email to admin about the return request

    res.json({ message: "Return requested successfully.", order }); // Send back the updated order

  } catch (error) {
    console.error("Return request error:", error);
    if (error.name === 'CastError') {
        return res.status(400).json({ error: "Invalid Order ID or Item ID format." });
    }
    res.status(500).json({ error: "Failed to process return request." });
  }
});

module.exports = router;