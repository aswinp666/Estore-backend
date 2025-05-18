const express = require('express');
const User = require('../models/Users');
const router = express.Router();

/* 
  Add a product to the cart:
  Expects: { "email": "...", "productId": "...", "quantity": 1 }
*/
router.post('/cart/add', async (req, res) => {
  const { email, productId, quantity } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if the product is already in the cart
    const itemIndex = user.cart.findIndex(item => item.productId === productId);
    if (itemIndex > -1) {
      user.cart[itemIndex].quantity += quantity;
    } else {
      user.cart.push({ productId, quantity });
    }
    await user.save();
    res.status(200).json({ message: "Product added to cart", cart: user.cart });
  } catch (error) {
    res.status(500).json({ message: "Error adding product to cart", error: error.message });
  }
});

/* 
  Retrieve the user's cart
  Expects a query parameter like: /cart?email=user@example.com
*/
router.get('/cart', async (req, res) => {
  const { email } = req.query;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ cart: user.cart });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving cart", error: error.message });
  }
});

/* 
  Place an order: this endpoint moves items from the cart to orders and empties the cart.
  Expects: { "email": "user@example.com" }
*/
router.post('/order/place', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.cart.length) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Create a new order with the current cart items
    const newOrder = {
      products: user.cart,
      orderDate: new Date(),
      status: "pending",
    };

    user.orders.push(newOrder);
    // Empty out the cart
    user.cart = [];
    await user.save();
    res.status(200).json({ message: "Order placed successfully", orders: user.orders });
  } catch (error) {
    res.status(500).json({ message: "Error placing order", error: error.message });
  }
});

/*
  Retrieve all orders for a user:
  Expects: /orders?email=user@example.com
*/
router.get('/orders', async (req, res) => {
  const { email } = req.query;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ orders: user.orders });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving orders", error: error.message });
  }
});

module.exports = router;
