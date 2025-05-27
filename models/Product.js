// models/Product.js
const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true, maxlength: 500, default: "" }, // Added comment field
  createdAt: { type: Date, default: Date.now }
});

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
  ratings: [ratingSchema], // Array of individual ratings
  averageRating: { // Calculated average rating
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  numOfReviews: { // Total number of reviews
    type: Number,
    default: 0
  }
});

// Pre-save hook to calculate average rating and number of reviews
productSchema.pre('save', function(next) {
  if (this.isModified('ratings') || this.isNew) { // Also recalculate if new product or ratings change
    const totalRatings = this.ratings.reduce((acc, item) => item.rating + acc, 0);
    this.averageRating = this.ratings.length > 0 ? (totalRatings / this.ratings.length) : 0;
    this.numOfReviews = this.ratings.length;
  }
  next();
});

// ✅ This avoids the OverwriteModelError
module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);