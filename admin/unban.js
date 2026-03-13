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

    const parts = text.split(' ');
    if (parts.length < 2) {
      return bot.sendMessage(
        chatId,
        '🔓 আনব্যান কমান্ড\n\nফরম্যাট: /unban [user_id বা @username]\n\nউদাহরণ:\n/unban 123456789\n/unban @username'
      );
    }

    let targetId = parts[1];

    if (targetId.startsWith('@')) {
      const user = await User.findOne({ username: targetId.substring(1) });
      if (!user) {
        return bot.sendMessage(chatId, '❌ ইউজার পাওয়া যায়নি।');
      }
      targetId = user.userId;
    } else {
      targetId = parseInt(targetId, 10);
    }

    const targetUser = await User.findOne({ userId: targetId });
    if (!targetUser) {
      return bot.sendMessage(chatId, '❌ ইউজার পাওয়া যায়নি।');
    }

    if (!targetUser.banned) {
      return bot.sendMessage(chatId, 'ℹ️ এই ইউজার বর্তমানে ব্যান অবস্থায় নেই।');
    }

    targetUser.banned = false;
    await targetUser.save();

    try {
      await bot.sendMessage(
        targetId,
        `🎉 আপনার অ্যাকাউন্ট থেকে ব্যান সরানো হয়েছে।\n\n⏰ সময়: ${helpers.formatTime(new Date())}\n👤 আনব্যান করেছেন: @${msg.from.username || 'Admin'}`
      );
    } catch (notifyError) {
      console.error('Unban notify error:', notifyError.message);
    }

    await bot.sendMessage(
      chatId,
      `✅ ইউজার আনব্যান করা হয়েছে\n\n👤 ইউজার: ${targetUser.firstName} (${targetUser.userId})`
    );
  } catch (error) {
    console.error('Unban Command Error:', error);
    await bot.sendMessage(chatId, '❌ আনব্যান করতে সমস্যা হয়েছে।');
  }
};
