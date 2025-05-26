const express = require("express");
const router = express.Router();
const Invoice = require("../models/Invoice");
const authenticateToken = require("../middleware/authenticateToken"); // Ensure this path is correct

// Save invoice to database
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

// Get all invoices (authenticate for admin dashboard if needed, or keep public if for general list)
// For admin dashboard, you might want authenticateToken here.
router.get("/", authenticateToken, async (req, res) => { // Added authenticateToken for admin dashboard usage
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 }).lean();
    res.json(invoices);
  } catch (error) {
    console.error("Fetch all invoices error:", error);
    res.status(500).json({ error: "Failed to fetch invoices." });
  }
});

//--NEW ROUTE: Get Orders for the currently logged-in user (customer view) ---
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

// Get a single invoice by ID (e.g., for customer-facing order details page)
router.get("/:id", authenticateToken, async (req, res) => { // Added authenticateToken here
  try {
    const invoice = await Invoice.findById(req.params.id).lean();
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found." });
    }
    // Optional: Verify if the invoice belongs to the authenticated user for non-admin access
    // if (req.user && invoice.billingData.email !== req.user.email) {
    //     return res.status(403).json({ error: "Forbidden: You do not have access to this order." });
    // }
    res.json(invoice); // Returns the invoice object directly
  } catch (error) {
    console.error("Fetch single invoice error:", error);
    if (error.name === 'CastError') {
        return res.status(400).json({ error: "Invalid invoice ID format." });
    }
    res.status(500).json({ error: "Failed to fetch invoice details." });
  }
});

// NEW ROUTE: Get a single invoice by 'orderId' specifically (if you prefer this path)
// This is a redundant route if /:id serves the same purpose, but matches frontend's `urlsToTry`
router.get("/order/:orderId", authenticateToken, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.orderId).lean();
    if (!invoice) {
      return res.status(404).json({ message: "Order not found." });
    }
    // Optional: Verify if the order belongs to the authenticated user
    // if (req.user && invoice.billingData.email !== req.user.email) {
    //     return res.status(403).json({ error: "Forbidden: You do not have access to this order." });
    // }
    res.json({ order: invoice }); // Return wrapped in 'order' if frontend expects it
  } catch (error) {
    console.error("Fetch single order by orderId error:", error);
    if (error.name === 'CastError') {
        return res.status(400).json({ error: "Invalid order ID format." });
    }
    res.status(500).json({ error: "Failed to fetch order details." });
  }
});


// Update order status (Admin)
router.put("/:id/status", authenticateToken, async (req, res) => { // Added authenticateToken here
  try {
    const { orderStatus } = req.body;

    const validOrderStatuses = Invoice.schema.path('orderStatus').enumValues;
    if (!orderStatus || !validOrderStatuses.includes(orderStatus)) {
      return res.status(400).json({ error: "Invalid or missing order status provided." });
    }

    // Optional: Admin role check
    // if (!req.user || !req.user.isAdmin) { return res.status(403).json({ error: "Unauthorized access." }); }

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

// --- ROUTE: Customer Request a return for a specific item in an order ---
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

    // Customer specific authorization: Ensure the order belongs to the authenticated user
    if (req.user && order.billingData.email !== req.user.email) {
        return res.status(403).json({ error: "Forbidden: You cannot request a return for this order." });
    }

    const itemToReturn = order.cartItems.find(item => item._id.toString() === itemId);

    if (!itemToReturn) {
      return res.status(404).json({ error: "Item not found in this order." });
    }

    // Check if the item can be returned (e.g., not already returned/requested/rejected)
    if (itemToReturn.returnStatus !== "NotReturned") {
        return res.status(400).json({ error: `Item return status is already '${itemToReturn.returnStatus}'.` });
    }
    // Optional: Add logic to check if orderStatus is 'Delivered' before allowing return request

    itemToReturn.returnStatus = "ReturnRequested"; // Set status to 'ReturnRequested'
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
      return res.status(400).json({ error: "Invalid return status provided for update. Must be 'Returned' or 'ReturnRejected'." });
    }

    const order = await Invoice.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    // IMPORTANT: Implement robust ADMIN ROLE CHECK here
    // Example (assuming `req.user.role` exists and is set by `authenticateToken`):
    // if (!req.user || req.user.role !== 'admin') {
    //     return res.status(403).json({ error: "Forbidden: Only administrators can update return status." });
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
    // You might want to add a timestamp or log who made this change here

    await order.save();

    res.json({ message: "Return status updated successfully.", order });

  } catch (error) {
    console.error("Admin - Update return status error:", error);
    if (error.name === 'CastError') {
        return res.status(400).json({ error: "Invalid Order ID or Item ID format." });
    }
    res.status(500).json({ error: "Failed to update return status." });
  }
});


module.exports = router;