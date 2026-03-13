const TelegramBot = require('node-telegram-bot-api');

const setupBot = () => {
  const bot = new TelegramBot(process.env.BOT_TOKEN);
  
  // ওয়েবহুক সেটআপ
  bot.setWebHook(`${process.env.DOMAIN}/webhook`);
  
  return bot;
};

module.exports = setupBot;