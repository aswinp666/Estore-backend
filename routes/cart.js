const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");
const User = require("../models/User"); // Import User model to find user by email

// GET /api/cart?email=user@example.com - Get cart by user email
router.get("/cart", async (req, res) => {
  try {
    const userEmail = req.query.email;
    if (!userEmail) {
      return res.status(400).json({ message: "User email is required" });
    }

    // Find user by email first
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find cart by userId
    let cart = await Cart.findOne({ userId: user._id });

    if (!cart) {
      cart = new Cart({ userId: user._id, items: [] });
      await cart.save();
    }

    res.json({ cartItems: cart.items });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ message: "Failed to fetch cart" });
  }
});

// POST /api/cart - Save or update cart (pass email and cartItems in body)
router.post("/cart", async (req, res) => {
  try {
    const { userEmail, cartItems } = req.body;

    if (!userEmail) {
      return res.status(400).json({ message: "User email is required" });
    }

    // Find user by email first
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find cart by userId
    let cart = await Cart.findOne({ userId: user._id });

    if (!cart) {
      cart = new Cart({ userId: user._id, items: cartItems });
    } else {
      cart.items = cartItems;
      cart.updatedAt = Date.now();
    }

    await cart.save();

    res.status(200).json({ message: "Cart saved successfully" });
  } catch (error) {
    console.error("Error saving cart:", error);
    res.status(500).json({ message: "Failed to save cart" });
  }
});

module.exports = router;
