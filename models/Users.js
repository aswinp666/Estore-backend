const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  _id: { type: Number, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  discountedPrice: { type: Number },
  quantity: { type: Number, required: true },
  imageUrl: { type: String }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  cartItems: [cartItemSchema], // Add cart items to user schema
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);