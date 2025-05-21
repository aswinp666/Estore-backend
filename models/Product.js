// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price must be a positive number'],
  },
  category: { 
    type: String, 
    required: true,
    enum: ['TV', 'Mobile', 'Consoles', 'Earpods', 'Tablets', 'Offer Products', 'Camera', 'Groceries'],
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required'],
  },
   options: {
    type: Map,
    of: [String], // key-value pairs like { Color: ["Red", "Black"], RAM: ["8GB", "12GB"] }
    default: {},
  },
});

// ✅ This avoids the OverwriteModelError
module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
