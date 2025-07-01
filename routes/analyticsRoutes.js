const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const User = require('../models/Users');
const Product = require('../models/Product'); // Assuming you want product-related analytics

// Helper to get start and end dates for a period
const getPeriodDates = (period) => {
  const now = new Date();
  let startDate;

  switch (period) {
    case 'weekly':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'monthly':
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case 'yearly':
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default: // All time
      startDate = new Date(0); // Epoch
  }
  return { startDate, endDate: new Date() };
};

// GET /api/analytics/summary-metrics
// Provides total sales, new users, and total orders for a given period
router.get('/summary-metrics', async (req, res) => {
  const { period = 'all' } = req.query; // 'weekly', 'monthly', 'yearly', 'all'
  const { startDate, endDate } = getPeriodDates(period);

  try {
    // Total Sales
    const salesAggregate = await Invoice.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate }, paymentStatus: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);
    const totalSales = salesAggregate.length > 0 ? salesAggregate[0].total : 0;

    // New Users
    const newUsersCount = await User.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } });

    // Total Orders
    const totalOrdersCount = await Invoice.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } });

    res.json({
      totalSales,
      newUsersCount,
      totalOrdersCount,
    });

  } catch (error) {
    console.error('Error fetching summary metrics:', error);
    res.status(500).json({ message: 'Failed to fetch summary metrics', error: error.message });
  }
});

// GET /api/analytics/sales-by-category
// Provides sales aggregated by product category
router.get('/sales-by-category', async (req, res) => {
  try {
    const salesByCategory = await Invoice.aggregate([
      { $unwind: '$cartItems' },
      { $match: { paymentStatus: 'Paid' } }, // Only consider paid invoices
      {
        $lookup: {
          from: 'products', // The actual collection name for your Product model
          localField: 'cartItems.productId',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: '$productDetails' },
      {
        $group: {
          _id: '$productDetails.category',
          totalSales: { $sum: '$cartItems.price' },
          totalQuantitySold: { $sum: '$cartItems.quantity' }
        }
      },
      { $sort: { totalSales: -1 } }
    ]);

    const categories = salesByCategory.map(item => item._id || 'Uncategorized');
    const seriesData = salesByCategory.map(item => item.totalSales);

    res.json({ categories, series: [{ name: 'Total Sales', data: seriesData }] });

  } catch (error) {
    console.error('Error fetching sales by category:', error);
    res.status(500).json({ message: 'Failed to fetch sales by category', error: error.message });
  }
});

// GET /api/analytics/order-status-distribution
// Provides the count of orders by their current status
router.get('/order-status-distribution', async (req, res) => {
  try {
    const statusDistribution = await Invoice.aggregate([
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 }
        }
      },
      { $project: { _id: 0, label: '$_id', value: '$count' } }
    ]);

    res.json({ series: statusDistribution });

  } catch (error) {
    console.error('Error fetching order status distribution:', error);
    res.status(500).json({ message: 'Failed to fetch order status distribution', error: error.message });
  }
});

// GET /api/analytics/recent-orders
// Provides a list of recent orders for the timeline
router.get('/recent-orders', async (req, res) => {
  try {
    const recentOrders = await Invoice.find({})
      .sort({ createdAt: -1 }) // Sort by most recent
      .limit(5) // Get the 5 most recent orders
      .select('billingData.firstName billingData.lastName grandTotal orderStatus createdAt'); // Select relevant fields

    const formattedOrders = recentOrders.map(order => ({
      id: order._id,
      type: order.orderStatus.replace(/\s/g, '').toLowerCase(), // e.g., "processing", "delivered"
      title: `Order from ${order.billingData.firstName || ''} ${order.billingData.lastName || ''} - ${order.orderStatus}`,
      time: order.createdAt,
      grandTotal: order.grandTotal
    }));

    res.json({ list: formattedOrders });

  } catch (error) {
    console.error('Error fetching recent orders:', error);
    res.status(500).json({ message: 'Failed to fetch recent orders', error: error.message });
  }
});

module.exports = router;