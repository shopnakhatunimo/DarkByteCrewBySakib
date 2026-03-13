const TelegramBot = require('node-telegram-bot-api');

const setupBot = () => {
  if (!process.env.BOT_TOKEN) {
    throw new Error('BOT_TOKEN is not configured');
  }

  if (!process.env.DOMAIN) {
    throw new Error('DOMAIN is not configured');
  }

  const bot = new TelegramBot(process.env.BOT_TOKEN);
  bot.setWebHook(`${process.env.DOMAIN}/webhook`);

  return bot;
};

module.exports = setupBot;
