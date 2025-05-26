const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  billingData: {
    firstName: String,
    lastName: String,
    companyName: String,
    country: String,
    address: String,
    addressTwo: String,
    town: String,
    phone: String,
    email: String,
  },
 cartItems: [
  {
    // _id: mongoose.Schema.Types.ObjectId, // Unique ID for the cart item instance
    name: String,
    quantity: Number,
    price: Number,
    discountedPrice: Number,
    image: String, // Assuming 'image' from frontend maps to 'imageUrl' or similar
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, // Reference to the actual product

    // New fields for return tracking
    returnStatus: {
      type: String,
      enum: ["NotReturned", "ReturnRequested", "Returned", "ReturnRejected"],
      default: "NotReturned"
    },
    returnReason: String,
    returnDetails: String
  },
],
  shippingFee: Number,
  grandTotal: Number,
  paymentStatus: {
    type: String,
    enum: ["Pending", "Paid", "Failed", "Cash On Delivery"], // Added "Cash On Delivery"
    default: "Pending",
  },
  paymentMethod: { // To store how the payment was made (e.g., 'razorpay', 'cod')
    type: String,
    enum: ["razorpay", "cod", "other"], // Add other methods if needed
    required: true // Make this required to know how the order was placed
  },
  orderStatus: { // For tracking the order progression
    type: String,
    enum: ["Processing", "Packaged", "Shipped", "Out For Delivery", "Delivered", "Cancelled"],
    default: "Processing", // Default status when an order is successfully placed
  },
  razorpayOrderId: { // Optional: To store Razorpay's order_id
    type: String,
    trim: true,
  },
  razorpayPaymentId: { // Optional: To store Razorpay's payment_id after successful payment
    type: String,
    trim: true,
  },
  razorpaySignature: { // Optional: For webhook verification if you implement it
    type: String,
    trim: true,
  },
  // `createdAt` is automatically managed by timestamps: true
  // `updatedAt` will also be automatically managed
}, { timestamps: true }); // Added timestamps for createdAt and updatedAt

module.exports = mongoose.models.Invoice || mongoose.model("Invoice", invoiceSchema);