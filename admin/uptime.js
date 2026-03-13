const adminCheck = require('../middlewares/adminCheck');

function formatUptime(totalSeconds) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days} দিন`);
  if (hours > 0 || days > 0) parts.push(`${hours} ঘন্টা`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes} মিনিট`);
  parts.push(`${seconds} সেকেন্ড`);

  return parts.join(' ');
}

module.exports = async (bot, msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    const isAdmin = await adminCheck(userId);
    if (!isAdmin) {
      return bot.sendMessage(chatId, '⛔ আপনি অ্যাডমিন নন।');
    }

    const uptime = formatUptime(process.uptime());
    const startedAt = new Date(Date.now() - process.uptime() * 1000);
    const serverTime = new Date();

    const message =
      `⏱️ বট আপটাইম রিপোর্ট\n\n` +
      `চালু আছে: ${uptime}\n` +
      `শুরু হয়েছে: ${startedAt.toLocaleString('bn-BD')}\n` +
      `বর্তমান সময়: ${serverTime.toLocaleString('bn-BD')}`;

    await bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Uptime Command Error:', error);
    await bot.sendMessage(chatId, '❌ আপটাইম তথ্য আনতে সমস্যা হয়েছে।');
  }
};
