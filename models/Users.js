const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  addresses: [
    {
      firstName: String,
      lastName: String,
      companyName: String,
      country: String,
      address: String,
      addressTwo: String,
      town: String,
      phone: String,
      email: String,
    },
  ],
});

module.exports = mongoose.model("User", userSchema);
