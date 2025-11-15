const mongoose = require("mongoose");

const wishSchema = new mongoose.Schema({
  name: String,
  email: String,
  date: Date,
  message: String,
});

module.exports = mongoose.model("Wish", wishSchema);
