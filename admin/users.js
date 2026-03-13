const adminCheck = require('../middlewares/adminCheck');
const User = require('../models/User');

module.exports = async (bot, msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  try {
    // অ্যাডমিন চেক
    const isAdmin = await adminCheck(userId);
    if (!isAdmin) {
      return bot.sendMessage(chatId, '⛔ আপনি অ্যাডমিন নন।');
    }
    
    // ইউজার স্ট্যাটিস্টিক্স
    const totalUsers = await User.countDocuments();
    const approved = await User.countDocuments({ approved: true });
    const pending = await User.countDocuments({ approved: false, banned: false });
    const banned = await User.countDocuments({ banned: true });
    
    // রিসেন্ট ইউজার
    const recentUsers = await User.find()
      .sort({ joinedAt: -1 })
      .limit(5);
    
    let userList = '';
    recentUsers.forEach((user, index) => {
      let status = user.banned ? '❌ ব্যান' : (user.approved ? '✅ অ্যাপ্রুভড' : '⏳ পেন্ডিং');
      userList += `\n${index+1}. ${user.firstName} (${user.userId})\n` +
        `📛 স্ট্যাটাস: ${status}\n` +
        `📅 জয়েন: ${user.joinedAt.toLocaleDateString()}\n`;
    });
    
    const message = `👥 𝐔𝐒𝐄𝐑 𝐌𝐀𝐍𝐀𝐆𝐄𝐌𝐄𝐍𝐓 𝐃𝐀𝐒𝐇𝐁𝐎𝐀𝐑𝐃\n\n` +
      `📊 টোটাল ইউজার: ${totalUsers}\n` +
      `✅ অ্যাপ্রুভড: ${approved}\n` +
      `⏳ পেন্ডিং: ${pending}\n` +
      `❌ ব্যানড: ${banned}\n\n` +
      `📋 রিসেন্ট ইউজার:\n${userList}\n\n` +
      `🔍 সার্চ: /users search [টার্ম]\n` +
      `📥 এক্সপোর্ট: /users export`;
    
    await bot.sendMessage(chatId, message);
    
  } catch (error) {
    console.error('Users Command Error:', error);
    await bot.sendMessage(chatId, '❌ এরর হয়েছে।');
  }
};