// server/routes/email.js
const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

router.post('/send-email', async (req, res) => {
  const { to, subject, text, html } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Electronics Store" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });

    res.status(200).json({ message: "Email sent" });
  } catch (error) {
    console.error("Email send failed:", error);
    res.status(500).json({ error: "Email send failed" });
  }
});

module.exports = router;
