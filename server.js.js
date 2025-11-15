require("dotenv").config();
// backend/server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const schedule = require('node-schedule');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const Wish = require('./wishModel'); // CommonJS

// Read config from env
const MONGODB_URI = process.env.MONGODB_URI;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*'); // set when deployed

// Connect MongoDB
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.log('❌ Mongo Error:', err));

const app = express();
app.use(bodyParser.json());
// allow CORS from your frontend domain(s)
app.use(cors({ origin: ALLOWED_ORIGINS }));

// Gmail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: GMAIL_USER, pass: GMAIL_PASS }
});

// Utility: schedule a job for a wish object
function scheduleWish(wish) {
  try {
    const when = new Date(wish.date);
    if (when <= new Date()) return; // skip past dates

    schedule.scheduleJob(wish._id.toString(), when, async () => {
      console.log(`🎉 Auto wish sent to ${wish.name}: "${wish.message}"`);
      try {
        await transporter.sendMail({
          from: `"WishClock" <${GMAIL_USER}>`,
          to: wish.email,
          subject: `🎉 Wish for ${wish.name} from WishClock`,
          text: wish.message
        });
        console.log(`📧 Email sent to ${wish.email}`);
      } catch (err) {
        console.error('❌ Email send error:', err);
      }
    });
    console.log('⏰ Scheduled job for', wish._id);
  } catch (e) {
    console.error('Schedule error', e);
  }
}

// On server start: load all future wishes and schedule them
async function loadAndScheduleAll() {
  const now = new Date();
  const futureWishes = await Wish.find({ date: { $gt: now } }).lean();
  futureWishes.forEach(scheduleWish);
  console.log(`Loaded and scheduled ${futureWishes.length} wishes`);
}

// Routes
app.post('/add-wish', async (req, res) => {
  try {
    const { name, email, date, message } = req.body;
    const wish = new Wish({ name, email, date, message });
    await wish.save();
    scheduleWish(wish); // schedule immediately
    console.log('✅ Wish saved:', wish._id);
    res.json({ success: true, msg: 'Wish scheduled successfully!' });
  } catch (err) {
    console.error('❌ Add wish error:', err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

app.get('/wishes', async (req, res) => {
  try {
    const wishes = await Wish.find().sort({ date: 1 }).lean();
    res.json(wishes);
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// health route
app.get('/', (req, res) => res.send('WishClock backend running'));

// Start server and load schedules
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 WishClock backend running on port ${PORT}`);
  await loadAndScheduleAll();
});
