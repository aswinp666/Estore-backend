const express = require("express");
const router = express.Router();
const { addToCart, getCart, removeFromCart } = require("../controllers/cartController");
const verifyToken = require("../middleware/verifyToken");

router.post("/add", verifyToken, addToCart);
router.get("/", verifyToken, getCart);
router.delete("/:productId", verifyToken, removeFromCart);

module.exports = router;
