// backend/wishModel.js
const Wish = require("./wishModel");

const wishSchema = new mongoose.Schema({
  name: String,
  email: String,
  date: Date,
  message: String,
});

module.exports = mongoose.model('Wish', wishSchema);
