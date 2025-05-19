const express = require('express');
const User = require('../models/Users');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');

// 🔒 Hardcoded credentials (use ONLY in dev/test, not production)
const GOOGLE_CLIENT_ID = '304953165466-lgjotkqf05kqkliatr0mh0ba0p2pu4n9.apps.googleusercontent.com';
const EMAIL_USER = 'dredwardkenway@gmail.com';
const EMAIL_PASS = 'dczw shov zusu fbwo'; // Gmail App Password

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// OTP storage (in-memory)
const otpStore = {};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});


// Google OAuth login
router.post('/google', async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name;

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        name,
        email,
        password: '',
      });
      await user.save();
    }

    res.status(200).json({ message: 'User authenticated successfully', user });
  } catch (error) {
    res.status(400).json({ message: 'Invalid Google token' });
  }
});

// Signup
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    let user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user = new User({
      name,
      email,
      password: hashedPassword,
    });

    await user.save();
    res.status(200).json({ message: "User created successfully", user });
  } catch (err) {
    res.status(500).json({ message: "Error during signup", error: err.message });
  }
});

// Signin
router.post('/signin', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user || !user.password) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.status(200).json({ message: "User signed in successfully", user });
  } catch (err) {
    res.status(500).json({ message: "Error during signin", error: err.message });
  }
});

// Send OTP via Gmail
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found with this email' });
    }

    const otp = generateOTP();
    otpStore[email] = {
      otp,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is ${otp}. It is valid for 15 minutes.`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send OTP', error: error.message });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const storedOtp = otpStore[email];

    if (!storedOtp || storedOtp.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (new Date() > storedOtp.expiresAt) {
      delete otpStore[email];
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    res.status(200).json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to verify OTP', error: error.message });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const storedOtp = otpStore[email];

    if (!storedOtp || storedOtp.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (new Date() > storedOtp.expiresAt) {
      delete otpStore[email];
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    delete otpStore[email];

    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reset password', error: error.message });
  }
});


// Get user's cart
router.get('/cart', async (req, res) => {
  try {
    const { email } = req.query;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.status(200).json({ cartItems: user.cartItems || [] });
  } catch (err) {
    res.status(500).json({ message: "Error fetching cart", error: err.message });
  }
});

// Update user's cart
router.post('/update-cart', async (req, res) => {
  try {
    const { email, cartItems } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    user.cartItems = cartItems;
    await user.save();
    
    res.status(200).json({ message: "Cart updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error updating cart", error: err.message });
  }
});

module.exports = router;
