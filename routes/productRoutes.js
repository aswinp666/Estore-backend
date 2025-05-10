const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const multer = require('multer');
const { storage } = require('../utils/cloudinary');
const upload = multer({ storage });

// Add new product
router.post('/', upload.single('image'), async (req, res) => {
    try {
      const { name, description, price, category } = req.body;
      const imageUrl = req.file.path;
  
      const newProduct = await Product.create({ name, description, price, category, imageUrl });
      res.status(201).json(newProduct);
    } catch (err) {
      console.error("❌ Failed to add product:", err); // <-- Add this
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

    const update = { name, description, price, category };
    if (imageUrl) update.imageUrl = imageUrl;

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(updatedProduct);
  } catch (err) {
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

module.exports = router;
