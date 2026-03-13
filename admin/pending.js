const adminCheck = require('../middlewares/adminCheck');
const User = require('../models/User');
const helpers = require('../utils/helpers');

class PendingCommand {
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    
    try {
      const isAdmin = await adminCheck(userId);
      if (!isAdmin) {
        return bot.sendMessage(chatId, '⛔ আপনি অ্যাডমিন নন।');
      }
      
      const parts = text.split(' ');
      let page = 1;
      
      if (parts.length > 1 && parts[1] === 'page' && parts[2]) {
        page = parseInt(parts[2]);
      }
      
      const pageSize = 10;
      const skip = (page - 1) * pageSize;
      
      const pendingUsers = await User.find({ approved: false, banned: false })
        .sort({ joinedAt: -1 })
        .skip(skip)
        .limit(pageSize);
      
      const totalPending = await User.countDocuments({ approved: false, banned: false });
      const totalPages = Math.ceil(totalPending / pageSize);
      
      if (pendingUsers.length === 0) {
        return bot.sendMessage(chatId, '✅ কোনো পেন্ডিং ইউজার নেই।');
      }
      
      // ড্যাশবোর্ড হেডার
      let message = `⏳ 𝐏𝐄𝐍𝐃𝐈𝐍𝐆 𝐀𝐏𝐏𝐑𝐎𝐕𝐀𝐋𝐒\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      message += `📊 মোট পেন্ডিং: ${totalPending}\n`;
      message += `পৃষ্ঠা ${page}/${totalPages}\n\n`;
      
      // ইউজার লিস্ট
      pendingUsers.forEach((user, index) => {
        const joinTime = helpers.formatTime(user.joinedAt, 'hh:mm A, DD MMM');
        
        message += `${index + 1 + skip}. **${user.firstName}** (${user.userId})\n`;
        message += `📛 ইউজারনেম: @${user.username || 'না'}\n`;
        message += `📅 জয়েন: ${joinTime}\n`;
        
        // কুইক অ্যাকশন বাটন (টেক্সট বাটন)
        message += `🔘 /approve_${user.userId}  |  /reject_${user.userId}\n\n`;
      });
      
      // নেভিগেশন
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      if (page > 1) {
        message += `⬅️ পূর্ববর্তী: /pending page ${page - 1}\n`;
      }
      if (page < totalPages) {
        message += `➡️ পরবর্তী: /pending page ${page + 1}\n`;
      }
      message += `✅ অল অ্যাপ্রুভ: /approve_all\n`;
      message += `❌ অল রিজেক্ট: /reject_all\n`;
      message += `🔄 রিফ্রেশ: /pending`;
      
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      
    } catch (error) {
      console.error('Pending Command Error:', error);
      await bot.sendMessage(chatId, '❌ পেন্ডিং লিস্ট দেখাতে সমস্যা হয়েছে।');
    }
  }
  
  // ইনলাইন বাটন হ্যান্ডলার (যদি ব্যবহার করো)
  async handleInlineButton(bot, callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;
    
    try {
      if (data.startsWith('approve_')) {
        const userId = parseInt(data.replace('approve_', ''));
        await this.approveUser(bot, chatId, userId);
      } else if (data.startsWith('reject_')) {
        const userId = parseInt(data.replace('reject_', ''));
        await this.rejectUser(bot, chatId, userId);
      }
      
      await bot.answerCallbackQuery(callbackQuery.id);
      
    } catch (error) {
      console.error('Inline Button Error:', error);
      await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ এরর হয়েছে' });
    }
  }
  
  async approveUser(bot, chatId, targetId) {
    try {
      const user = await User.findOne({ userId: targetId });
      if (!user) {
        return bot.sendMessage(chatId, '❌ ইউজার পাওয়া যায়নি।');
      }
      
      if (user.approved) {
        return bot.sendMessage(chatId, 'ℹ️ ইউজার ইতিমধ্যে অ্যাপ্রুভড।');
      }
      
      user.approved = true;
      await user.save();
      
      // ইউজারকে নোটিফিকেশন
      await bot.sendMessage(targetId,
        `🎉 𝐀𝐂𝐂𝐄𝐒𝐒 𝐆𝐑𝐀𝐍𝐓𝐄𝐃!\n\n` +
        `অভিনন্দন ${user.firstName}! 🥳\n\n` +
        `আপনাকে DarkByte Crew Pro Bot ব্যবহারের অনুমতি দেওয়া হয়েছে।\n\n` +
        `✅ এখন আপনি সব কমান্ড ব্যবহার করতে পারবেন।\n\n` +
        `⚠️ দয়া করে নিয়ম মেনে ব্যবহার করুন।`
      );
      
      await bot.sendMessage(chatId, `✅ ${user.firstName} অ্যাপ্রুভড করা হয়েছে।`);
      
    } catch (error) {
      console.error('Approve User Error:', error);
      await bot.sendMessage(chatId, '❌ অ্যাপ্রুভ করতে সমস্যা হয়েছে।');
    }
  }
  
  async rejectUser(bot, chatId, targetId) {
    try {
      const user = await User.findOne({ userId: targetId });
      if (!user) {
        return bot.sendMessage(chatId, '❌ ইউজার পাওয়া যায়নি।');
      }
      
      // ইউজার ডিলিট
      await User.deleteOne({ userId: targetId });
      
      // ইউজারকে নোটিফিকেশন
      await bot.sendMessage(targetId,
        `❌ 𝐀𝐂𝐂𝐄𝐒𝐒 𝐑𝐄𝐉𝐄𝐂𝐓𝐄𝐃\n\n` +
        `${user.firstName}, আপনার অনুরোধ রিজেক্ট করা হয়েছে।\n\n` +
        `সম্ভাব্য কারণ:\n` +
        `• ভুল তথ্য দেওয়া হয়েছে\n` +
        `• একাধিক অ্যাকাউন্ট খোলা হয়েছে\n` +
        `• অ্যাডমিনের সিদ্ধান্ত\n\n` +
        `📞 পুনরায় আবেদন: @DarkByteCrew_Admin`
      );
      
      await bot.sendMessage(chatId, `✅ ${user.firstName} রিজেক্ট করা হয়েছে।`);
      
    } catch (error) {
      console.error('Reject User Error:', error);
      await bot.sendMessage(chatId, '❌ রিজেক্ট করতে সমস্যা হয়েছে।');
    }
  }
}

module.exports = new PendingCommand();
