const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const multer = require('multer');
const { storage } = require('../utils/cloudinary');
const upload = multer({ storage });
const authenticateToken = require("../middleware/authenticateToken"); // Assuming you have this middleware

// Add new product
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category } = req.body;
    const imageUrl = req.file.path;

    // Parse options if sent
    let options = {};
    if (req.body.options) {
      try {
        options = JSON.parse(req.body.options);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid options format' });
      }
    }

    const newProduct = await Product.create({
      name,
      description,
      price,
      category,
      imageUrl,
      options,
    });

    res.status(201).json(newProduct);
  } catch (err) {
    console.error("❌ Failed to add product:", err);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// Get products (optional category filter)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const products = category
      ? await Product.find({ category })
      : await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get products' });
  }
});

// Get single product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get product' });
  }
});

// Update product
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category } = req.body;
    const imageUrl = req.file ? req.file.path : undefined;

    // Parse options if sent
    let options;
    if (req.body.options) {
      try {
        options = JSON.parse(req.body.options);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid options format' });
      }
    }

    const update = { name, description, price, category };
    if (imageUrl) update.imageUrl = imageUrl;
    if (options) update.options = options;

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(updatedProduct);
  } catch (err) {
    console.error("❌ Failed to update product:", err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// NEW ROUTE: POST /api/products/:id/review - Submit a review for a product
router.post('/:id/review', authenticateToken, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const productId = req.params.id;
    const userId = req.user.id; // Assuming authenticateToken adds user info to req.user

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be a number between 1 and 5.' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // Check if the user has already reviewed this product
    const alreadyReviewedIndex = product.ratings.findIndex(
      (r) => r.userId.toString() === userId.toString()
    );

    if (alreadyReviewedIndex > -1) {
      // Update existing review
      product.ratings[alreadyReviewedIndex].rating = rating;
      product.ratings[alreadyReviewedIndex].comment = comment || '';
      product.ratings[alreadyReviewedIndex].createdAt = Date.now(); // Update timestamp
    } else {
      // Add new review
      product.ratings.push({ userId, rating, comment: comment || '' });
    }

    await product.save(); // The pre-save hook will update averageRating and numOfReviews

    // You might want to return the updated product or just a success message
    res.status(200).json({ message: 'Review added/updated successfully.', product });
  } catch (err) {
    console.error("❌ Failed to add/update review:", err);
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid product ID format.' });
    }
    res.status(500).json({ error: 'Failed to add/update review.' });
  }
});


// NEW ROUTE: GET /api/products/:productId/reviews - Get all reviews for a specific product
router.get('/:productId/reviews', async (req, res) => { // Change :id to :productId for clarity
  try {
    const productId = req.params.productId;
    // Find the product and populate its ratings (reviews)
    const product = await Product.findById(productId).populate({
      path: 'ratings.userId', // Path to the user field within the ratings array
      select: 'name'         // Only select the 'name' field of the user
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    // Return the ratings array
    // Map to simplify review object if needed, or directly return product.ratings
    const reviewsWithUserNames = product.ratings.map(rating => ({
        _id: rating._id,
        user: {
            _id: rating.userId._id,
            name: rating.userId.name
        },
        rating: rating.rating,
        comment: rating.comment,
        createdAt: rating.createdAt
    }));


    res.status(200).json(reviewsWithUserNames);
  } catch (err) {
    console.error("❌ Failed to fetch reviews for product:", err);
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid product ID format.' });
    }
    res.status(500).json({ message: 'Failed to fetch reviews.' });
  }
});


module.exports = router;