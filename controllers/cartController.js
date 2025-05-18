const User = require("../models/Users");

exports.addToCart = async (req, res) => {
  const userId = req.user.id;
  const { productId, quantity } = req.body;

  try {
    const user = await User.findById(userId);
    const existingItem = user.cart.find(item => item.productId.toString() === productId);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      user.cart.push({ productId, quantity });
    }

    await user.save();
    res.json({ message: "Cart updated", cart: user.cart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCart = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findById(userId).populate("cart.productId");
    res.json({ cart: user.cart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.removeFromCart = async (req, res) => {
  const userId = req.user.id;
  const { productId } = req.params;

  try {
    await User.findByIdAndUpdate(userId, {
      $pull: { cart: { productId } },
    });
    res.json({ message: "Item removed from cart" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
