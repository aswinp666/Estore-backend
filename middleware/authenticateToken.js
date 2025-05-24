// middleware/authenticateToken.js
const jwt = require('jsonwebtoken');
const User = require('../models/Users'); // Adjust path if your models folder is elsewhere
const JWT_SECRET = process.env.JWT_SECRET || '2a441e973877c97407ecec0aaee9589b99520bb42b8ff30acb24a28a4adbee064a47171d1ae98802a16a1fa8e21f25ba0fc6f8c2b81b95f31df8a2c297e0bd0d'; // Must match the one in auth.js

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expected format: "Bearer TOKEN"

  if (token == null) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET); // Verifies token and decodes payload

    // Fetch user from DB to ensure they still exist and get up-to-date info
    // The decoded payload contains { userId, email } based on how we signed it in auth.js
    const user = await User.findById(decoded.userId).select('-password'); // Exclude password from user object

    if (!user) {
      return res.status(403).json({ message: 'User not found, token invalid' });
    }

    req.user = user; // Attach the authenticated user object to the request
    next();
  } catch (err) {
    console.error("JWT Authentication Error:", err.message);
    return res.status(403).json({ message: 'Token is not valid or has expired' });
  }
}

module.exports = authenticateToken;