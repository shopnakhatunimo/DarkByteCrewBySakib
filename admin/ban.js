const adminCheck = require('../middlewares/adminCheck');
const User = require('../models/User');
const helpers = require('../utils/helpers');

module.exports = async (bot, msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;
  
  try {
    const isAdmin = await adminCheck(userId);
    if (!isAdmin) {
      return bot.sendMessage(chatId, '⛔ আপনি অ্যাডমিন নন।');
    }
    
    // কমান্ড পার্স
    const parts = text.split(' ');
    if (parts.length < 2) {
      return bot.sendMessage(chatId,
        `🚫 𝐁𝐀𝐍 𝐂𝐎𝐌𝐌𝐀𝐍𝐃\n\n` +
        `ফরম্যাট: /ban [user_id] [কারণ]\n\n` +
        `উদাহরণ:\n` +
        `/ban 123456789 স্প্যামিং\n` +
        `/ban @username নিয়ম ভঙ্গ`
      );
    }
    
    let targetId = parts[1];
    let reason = parts.slice(2).join(' ') || 'কোনো কারণ দেওয়া হয়নি';
    
    // ইউজারনেম থেকে আইডি বের করা
    if (targetId.startsWith('@')) {
      const user = await User.findOne({ username: targetId.substring(1) });
      if (!user) {
        return bot.sendMessage(chatId, '❌ ইউজার পাওয়া যায়নি।');
      }
      targetId = user.userId;
    } else {
      targetId = parseInt(targetId);
    }
    
    const targetUser = await User.findOne({ userId: targetId });
    if (!targetUser) {
      return bot.sendMessage(chatId, '❌ ইউজার পাওয়া যায়নি।');
    }
    
    if (targetUser.banned) {
      return bot.sendMessage(chatId, 'ℹ️ ইউজার ইতিমধ্যে ব্যান করা আছে।');
    }
    
    // ব্যান করা
    targetUser.banned = true;
    await targetUser.save();
    
    // ইউজারকে নোটিফিকেশন
    await bot.sendMessage(targetId,
      `🚫 𝐀𝐂𝐂𝐎𝐔𝐍𝐓 𝐁𝐀𝐍𝐍𝐄𝐃\n\n` +
      `${targetUser.firstName}, আপনার অ্যাকাউন্ট ব্যান করা হয়েছে।\n\n` +
      `📋 কারণ: ${reason}\n` +
      `⏰ ব্যান সময়: ${helpers.formatTime(new Date())}\n` +
      `👤 ব্যান করেছেন: @${msg.from.username || 'Admin'}\n\n` +
      `📞 আপিলের জন্য: @head_admin`
    );
    
    // অ্যাডমিনকে কনফার্মেশন
    await bot.sendMessage(chatId,
      `✅ ইউজার ব্যান করা হয়েছে\n\n` +
      `👤 ইউজার: ${targetUser.firstName} (${targetUser.userId})\n` +
      `📋 কারণ: ${reason}`
    );
    
  } catch (error) {
    console.error('Ban Command Error:', error);
    await bot.sendMessage(chatId, '❌ এরর হয়েছে।');
  }
};