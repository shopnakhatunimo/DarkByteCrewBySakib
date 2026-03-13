const adminCheck = require('../middlewares/adminCheck');
const User = require('../models/User');
const logger = require('../middlewares/logger');

class BroadcastCommand {
  constructor() {
    this.types = {
      all: 'সব ইউজার',
      approved: 'অ্যাপ্রুভড ইউজার',
      pending: 'পেন্ডিং ইউজার',
      banned: 'ব্যানড ইউজার',
      test: 'টেস্ট (শুধু অ্যাডমিন)'
    };
  }
  
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    
    try {
      // অ্যাডমিন চেক
      const isAdmin = await adminCheck(userId);
      if (!isAdmin) {
        return bot.sendMessage(chatId, '⛔ আপনি অ্যাডমিন নন।');
      }
      
      // কমান্ড পার্স
      const parts = text.split(' ');
      if (parts.length < 3) {
        return this.showHelp(bot, chatId);
      }
      
      const type = parts[1].toLowerCase();
      const message = parts.slice(2).join(' ');
      
      // টাইপ ভ্যালিডেশন
      if (!this.types[type]) {
        return bot.sendMessage(chatId, '❌ ভুল টাইপ। সঠিক টাইপ: all, approved, pending, banned, test');
      }
      
      // টার্গেট ইউজার ফেচ
      const users = await this.getTargetUsers(type);
      
      if (users.length === 0) {
        return bot.sendMessage(chatId, '❌ এই গ্রুপে কোনো ইউজার নেই।');
      }
      
      // প্রিভিউ দেখাও
      await this.showPreview(bot, chatId, type, message, users.length);
      
      // কনফার্মেশন সেশন সেভ (টেম্পোরারি)
      global.broadcastSessions = global.broadcastSessions || {};
      global.broadcastSessions[chatId] = {
        type,
        message,
        users,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('Broadcast Error:', error);
      await bot.sendMessage(chatId, '❌ ব্রডকাস্ট করতে সমস্যা হয়েছে।');
    }
  }
  
  async getTargetUsers(type) {
    switch(type) {
      case 'all':
        return await User.find({});
      case 'approved':
        return await User.find({ approved: true, banned: false });
      case 'pending':
        return await User.find({ approved: false, banned: false });
      case 'banned':
        return await User.find({ banned: true });
      case 'test':
        const adminIds = (process.env.ADMIN_IDS || '')
          .split(',')
          .map(id => parseInt(id.trim(), 10))
          .filter(Number.isInteger);
        return adminIds.map(id => ({ userId: id, firstName: 'Admin' }));
      default:
        return [];
    }
  }
  
  async showPreview(bot, chatId, type, message, userCount) {
    const preview = `📋 𝐁𝐑𝐎𝐀𝐃𝐂𝐀𝐒𝐓 𝐏𝐑𝐄𝐕𝐈𝐄𝐖\n\n` +
      `টার্গেট: ${this.types[type]}\n` +
      `রিসিভার: ${userCount} জন\n\n` +
      `মেসেজ:\n${message}\n\n` +
      `প্যার্স ভ্যারিয়েবল:\n` +
      `• {user_name} → ইউজারের নাম\n` +
      `• {user_id} → ইউজারের আইডি\n` +
      `• {date} → বর্তমান তারিখ\n\n` +
      `✅ পাঠাতে: /broadcast_confirm\n` +
      `❌ বাতিল করতে: /broadcast_cancel`;
    
    await bot.sendMessage(chatId, preview);
  }
  
  async confirm(bot, msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
      // সেশন চেক
      const session = global.broadcastSessions?.[chatId];
      if (!session) {
        return bot.sendMessage(chatId, '❌ কোনো সক্রিয় ব্রডকাস্ট সেশন নেই।');
      }
      
      // ৫ মিনিটের বেশি পুরনো হলে এক্সপায়ার
      if (Date.now() - session.timestamp > 5 * 60 * 1000) {
        delete global.broadcastSessions[chatId];
        return bot.sendMessage(chatId, '⏰ সেশন এক্সপায়ার হয়েছে। আবার /broadcast দিন।');
      }
      
      const { type, message, users } = session;
      
      // প্রসেসিং মেসেজ
      await bot.sendMessage(chatId, `⏳ ব্রডকাস্ট শুরু হচ্ছে... ${users.length} জন ইউজারে পাঠানো হবে।`);
      
      let success = 0;
      let failed = 0;
      const failedIds = [];
      
      for (const user of users) {
        try {
          // পার্সোনালাইজড মেসেজ
          let personalizedMessage = message
            .replace(/{user_name}/g, user.firstName || 'ইউজার')
            .replace(/{user_id}/g, user.userId)
            .replace(/{date}/g, new Date().toLocaleDateString('bn-BD', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            }));
          
          await bot.sendMessage(user.userId, personalizedMessage);
          success++;
          
          // রেট লিমিট এড়াতে সামান্য দেরি
          await new Promise(resolve => setTimeout(resolve, 50));
          
        } catch (err) {
          failed++;
          failedIds.push(user.userId);
          console.error(`Failed to send to ${user.userId}:`, err.message);
        }
      }
      
      // রিপোর্ট
      const report = `📊 𝐁𝐑𝐎𝐀𝐃𝐂𝐀𝐒𝐓 𝐑𝐄𝐏𝐎𝐑𝐓\n\n` +
        `📋 টার্গেট: ${this.types[type]}\n` +
        `✅ সফল: ${success}\n` +
        `❌ ব্যর্থ: ${failed}\n` +
        `⏳ সময়: ${(users.length * 0.05).toFixed(1)} সেকেন্ড\n\n` +
        (failed > 0 ? `📋 ব্যর্থ আইডি:\n${failedIds.join(', ')}` : '');
      
      await bot.sendMessage(chatId, report);
      
      // লগ
      await logger.logSystem('broadcast_completed', {
        type,
        total: users.length,
        success,
        failed
      });
      
      // সেশন ক্লিয়ার
      delete global.broadcastSessions[chatId];
      
    } catch (error) {
      console.error('Broadcast Confirm Error:', error);
      await bot.sendMessage(chatId, '❌ ব্রডকাস্ট কনফার্ম করতে সমস্যা হয়েছে।');
    }
  }
  
  async cancel(bot, msg) {
    const chatId = msg.chat.id;
    
    if (global.broadcastSessions?.[chatId]) {
      delete global.broadcastSessions[chatId];
      await bot.sendMessage(chatId, '❌ ব্রডকাস্ট বাতিল করা হয়েছে।');
    } else {
      await bot.sendMessage(chatId, '❌ কোনো সক্রিয় ব্রডকাস্ট সেশন নেই।');
    }
  }
  
  showHelp(bot, chatId) {
    const help = `📢 𝐁𝐑𝐎𝐀𝐃𝐂𝐀𝐒𝐓 𝐂𝐎𝐌𝐌𝐀𝐍𝐃\n\n` +
      `ফরম্যাট: /broadcast [টাইপ] [মেসেজ]\n\n` +
      `**টাইপ সমূহ:**\n` +
      `• all - সব ইউজার\n` +
      `• approved - শুধু অ্যাপ্রুভড\n` +
      `• pending - শুধু পেন্ডিং\n` +
      `• banned - শুধু ব্যানড\n` +
      `• test - শুধু অ্যাডমিন (টেস্ট)\n\n` +
      `**ভ্যারিয়েবল:**\n` +
      `• {user_name} - ইউজারের নাম\n` +
      `• {user_id} - ইউজারের আইডি\n` +
      `• {date} - আজকের তারিখ\n\n` +
      `**উদাহরণ:**\n` +
      `/broadcast all গুরুত্বপূর্ণ আপডেট!\n` +
      `/broadcast approved নতুন টুল অ্যাড হয়েছে {user_name}`;
    
    bot.sendMessage(chatId, help);
  }
}

module.exports = new BroadcastCommand();
