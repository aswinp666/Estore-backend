const mongoose = require('mongoose'); // Use require for mongoose

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
      name: String,
      quantity: Number,
      price: Number,
      discountedPrice: Number,
    },
  ],
  shippingFee: Number,
  grandTotal: Number,
  paymentStatus: {
    type: String,
    enum: ["Pending", "Paid", "Failed"],
    default: "Pending", // Set default as "Pending"
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.Invoice || mongoose.model("Invoice", invoiceSchema);
