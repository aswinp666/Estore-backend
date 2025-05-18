const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");

// Routers (ensure these files exist and contain the full implementations)
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/productRoutes");
const paymentRoutes = require("./routes/payment");       // Contains Razorpay endpoints, etc.
const invoiceRoutes = require("./routes/invoice");         // Invoice routes
const cartOrdersRouter = require("./routes/cartOrders");   // New router for cart & orders persistence

const User = require("./models/Users");

const app = express();
const PORT = process.env.PORT || 5000;

// For demonstration purposes; you may later use a more robust solution for OTP storage.
const otpStore = {};

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "https://estore-frontend-x1sy.vercel.app", // Your frontend URL
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.static("public"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api", paymentRoutes);
app.use("/api/invoice", invoiceRoutes);
app.use("/api", cartOrdersRouter); // Mounts endpoints for cart (e.g., /api/cart/add) and orders (e.g., /api/order/place)

// Email sending endpoint
app.post("/api/send-email", async (req, res) => {
  const { to, subject, text, html, attachment } = req.body;

  // Set up the transporter with environment variables if provided
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER || "dr.edwardkenway@gmail.com",
      pass: process.env.EMAIL_PASS || "dczw shov zusu fbwo",
    },
  });

  const mailOptions = {
    from: '"Estore Online" <dr.edwardkenway@gmail.com>',
    to,
    subject,
    text,
    html,
    attachments: attachment
      ? [
          {
            filename: attachment.filename,
            content: attachment.content,
            encoding: "base64",
          },
        ]
      : [],
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

// MongoDB Connection (make sure to use your connection string or environment variable)
mongoose
  .connect(
    process.env.MONGO_URI ||
      "mongodb+srv://dredwardkenway:edward2001@cluster1.yujpok5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1",
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
