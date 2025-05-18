const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  // Array of items in the cart: each item has a product id and a quantity
  cart: [
    {
      productId: { type: String, required: true },
      quantity: { type: Number, required: true, default: 1 },
    },
  ],
  // Array of orders
  orders: [
    {
      products: [
        {
          productId: { type: String, required: true },
          quantity: { type: Number, required: true, default: 1 },
        },
      ],
      orderDate: { type: Date, default: Date.now },
      status: { type: String, default: "pending" },
    },
  ],
});

module.exports = mongoose.model("User", userSchema);
