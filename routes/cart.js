const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");

// GET /api/cart?email=user@example.com - Get cart by email (or any identifier)
router.get("/cart", async (req, res) => {
  try {
    const userEmail = req.query.email;
    if (!userEmail) {
      return res.status(400).json({ message: "User email is required" });
    }

    let cart = await Cart.findOne({ userEmail });

    if (!cart) {
      cart = new Cart({ userEmail, items: [] });
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

    let cart = await Cart.findOne({ userEmail });

    if (!cart) {
      cart = new Cart({ userEmail, items: cartItems });
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
