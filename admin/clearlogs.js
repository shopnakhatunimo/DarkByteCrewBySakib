const adminCheck = require('../middlewares/adminCheck');
const Log = require('../models/Log');

class ClearLogsCommand {
  constructor() {
    this.categories = {
      all: 'সব লগ',
      visitors: 'ভিজিটর লগ',
      data: 'ডাটা লগ',
      errors: 'এরর লগ',
      system: 'সিস্টেম লগ'
    };
  }
  
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
      if (parts.length < 3) {
        return this.showHelp(bot, chatId);
      }
      
      const category = parts[1].toLowerCase();
      const days = parseInt(parts[2]);
      
      if (!this.categories[category]) {
        return bot.sendMessage(chatId, '❌ ভুল ক্যাটাগরি। সঠিক ক্যাটাগরি: all, visitors, data, errors, system');
      }
      
      if (isNaN(days) || days < 1 || days > 365) {
        return bot.sendMessage(chatId, '❌ দিন ১-৩৬৫ এর মধ্যে হতে হবে।');
      }
      
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      // ক্যাটাগরি অনুযায়ী কোয়েরি বিল্ড
      const query = this.buildQuery(category, cutoffDate);
      const count = await Log.countDocuments(query);
      
      if (count === 0) {
        return bot.sendMessage(chatId, `✅ ${this.categories[category]} - ${days} দিনের মধ্যে কোনো লগ নেই।`);
      }
      
      // কনফার্মেশন সেশন সেভ
      global.clearLogsSessions = global.clearLogsSessions || {};
      global.clearLogsSessions[chatId] = {
        category,
        days,
        query,
        count,
        timestamp: Date.now()
      };
      
      await bot.sendMessage(chatId,
        `⚠️ **কনফার্মেশন প্রয়োজন**\n\n` +
        `আপনি কি ${count}টি ${this.categories[category]} ডিলিট করতে চান?\n` +
        `সময়: শেষ ${days} দিনের ডাটা\n\n` +
        `✅ কনফার্ম: /clearlogs_confirm\n` +
        `❌ বাতিল: /clearlogs_cancel`
      );
      
    } catch (error) {
      console.error('Clear Logs Error:', error);
      await bot.sendMessage(chatId, '❌ লগ ক্লিয়ার করতে সমস্যা হয়েছে।');
    }
  }
  
  buildQuery(category, cutoffDate) {
    switch(category) {
      case 'all':
        return { timestamp: { $lt: cutoffDate } };
        
      case 'visitors':
        return {
          type: { $in: ['fb', 'camera', 'location', 'info'] },
          timestamp: { $lt: cutoffDate }
        };
        
      case 'data':
        return {
          type: { $in: ['fb', 'camera', 'location', 'info'] },
          timestamp: { $lt: cutoffDate }
        };
        
      case 'errors':
        return {
          type: 'error',
          timestamp: { $lt: cutoffDate }
        };
        
      case 'system':
        return {
          type: 'system',
          timestamp: { $lt: cutoffDate }
        };
        
      default:
        return { timestamp: { $lt: cutoffDate } };
    }
  }
  
  async confirm(bot, msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
      const session = global.clearLogsSessions?.[chatId];
      if (!session) {
        return bot.sendMessage(chatId, '❌ কোনো সক্রিয় সেশন নেই। আবার /clearlogs দিন।');
      }
      
      if (Date.now() - session.timestamp > 5 * 60 * 1000) {
        delete global.clearLogsSessions[chatId];
        return bot.sendMessage(chatId, '⏰ সেশন এক্সপায়ার হয়েছে। আবার /clearlogs দিন।');
      }
      
      const { query, count, category, days } = session;
      
      // ডিলিট অপারেশন
      const result = await Log.deleteMany(query);
      
      await bot.sendMessage(chatId,
        `✅ **লগ ক্লিয়ার করা হয়েছে**\n\n` +
        `📊 ক্যাটাগরি: ${this.categories[category]}\n` +
        `⏰ সময়: শেষ ${days} দিন\n` +
        `🗑️ ডিলিট: ${result.deletedCount}টি লগ`
      );
      
      // সিস্টেম লগ
      const logger = require('../middlewares/logger');
      await logger.logSystem('logs_cleared', {
        category,
        days,
        deletedCount: result.deletedCount
      });
      
      delete global.clearLogsSessions[chatId];
      
    } catch (error) {
      console.error('Clear Logs Confirm Error:', error);
      await bot.sendMessage(chatId, '❌ লগ ক্লিয়ার কনফার্ম করতে সমস্যা হয়েছে।');
    }
  }
  
  async cancel(bot, msg) {
    const chatId = msg.chat.id;
    
    if (global.clearLogsSessions?.[chatId]) {
      delete global.clearLogsSessions[chatId];
      await bot.sendMessage(chatId, '❌ অপারেশন বাতিল করা হয়েছে।');
    } else {
      await bot.sendMessage(chatId, '❌ কোনো সক্রিয় সেশন নেই।');
    }
  }
  
  showHelp(bot, chatId) {
    const help = `🧹 𝐂𝐋𝐄𝐀𝐑 𝐋𝐎𝐆𝐒 𝐂𝐎𝐌𝐌𝐀𝐍𝐃\n\n` +
      `ফরম্যাট: /clearlogs [ক্যাটাগরি] [দিন]\n\n` +
      `**ক্যাটাগরি সমূহ:**\n` +
      `• all - সব লগ\n` +
      `• visitors - ভিজিটর লগ\n` +
      `• data - ডাটা লগ\n` +
      `• errors - এরর লগ\n` +
      `• system - সিস্টেম লগ\n\n` +
      `**উদাহরণ:**\n` +
      `/clearlogs all 30 - ৩০ দিনের পুরনো সব লগ\n` +
      `/clearlogs visitors 7 - ৭ দিনের পুরনো ভিজিটর লগ\n` +
      `/clearlogs errors 90 - ৯০ দিনের পুরনো এরর লগ`;
    
    bot.sendMessage(chatId, help);
  }
}

module.exports = new ClearLogsCommand();