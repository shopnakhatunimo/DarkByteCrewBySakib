const User = require('../models/User');
const helpers = require('../utils/helpers');
const { ensureChannelJoined } = require('../middlewares/channelCheck');

module.exports = async (bot, msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userName = msg.from.first_name;
  const username = msg.from.username || '';
  
  try {
    let user = await User.findOne({ userId });
    
    if (!user) {
      // নতুন ইউজার
      user = new User({
        userId,
        username,
        firstName: userName,
        lastName: msg.from.last_name || ''
      });
      
      await user.save();
      
      // ওয়েলকাম মেসেজ
      const welcomeMsg = `✨ 𝐃𝐀𝐑𝐊𝐁𝐘𝐓𝐄 𝐂𝐑𝐄𝐖 𝐏𝐑𝐎 ✨\n\n` +
        `আসসালামু আলাইকুম ${userName}! 👋\n\n` +
        `🤖 আমি একটি অ্যাডভান্সড সিকিউরিটি টেস্টিং বট\n` +
        `🛡️ পেনিট্রেশন টেস্টিং ও এথিক্যাল হ্যাকিং টুলস\n\n` +
        `📌 আপনার আইডি: ${userId}\n` +
        `📌 আপনার স্ট্যাটাস: ⏳ পেন্ডিং\n\n` +
        `✅ অনুমতি পেতে অ্যাডমিনের সাথে যোগাযোগ করুন:\n` +
        `👤 @DarkByteCrew_Admin\n\n` +
        `⚠️ নোট: এই বট শুধু শিক্ষামূলক ও টেস্টিং উদ্দেশ্যে তৈরি`;
      
      await bot.sendMessage(chatId, welcomeMsg);
      
      // অ্যাডমিন নোটিফিকেশন
      const adminMsg = `🆕 𝐍𝐄𝐖 𝐔𝐒𝐄𝐑 𝐉𝐎𝐈𝐍𝐄𝐃 🆕\n\n` +
        `👤 নাম: ${userName}\n` +
        `🆔 আইডি: ${userId}\n` +
        `📛 ইউজারনেম: @${username}\n` +
        `📅 জয়েন: ${helpers.formatTime(new Date())}\n\n` +
        `⚡ কুইক অ্যাকশন:\n` +
        `/approve ${userId}\n` +
        `/reject ${userId}`;
      
      // অ্যাডমিনদের পাঠাও
      const adminIds = (process.env.ADMIN_IDS || '')
        .split(',')
        .map(id => parseInt(id.trim(), 10))
        .filter(Number.isInteger);
      for (const adminId of adminIds) {
        await bot.sendMessage(adminId, adminMsg);
      }

      const joined = await ensureChannelJoined(bot, msg);
      if (!joined) {
        return;
      }
    } else {
      const joined = await ensureChannelJoined(bot, msg);
      if (!joined) {
        return;
      }

      // পুরনো ইউজার
      if (user.banned) {
        await bot.sendMessage(chatId, 
          `❌ আপনাকে ব্যান করা হয়েছে! অ্যাডমিনের সাথে যোগাযোগ করুন @DarkByteCrew_Admin`
        );
      } else if (user.approved) {
        await bot.sendMessage(chatId, 
          `✅ স্বাগতম ${userName}! আপনার সব টুল একটিভ আছে`
        );
      } else {
        await bot.sendMessage(chatId, 
          `⏳ আপনার অনুমতি এখনও পেন্ডিং আছে। অ্যাডমিনের সাথে যোগাযোগ করুন @DarkByteCrew_Admin`
        );
      }
    }
  } catch (error) {
    console.error('Start Command Error:', error);
    await bot.sendMessage(chatId, '❌ একটি এরর হয়েছে। পরে আবার চেষ্টা করুন।');
  }
};
