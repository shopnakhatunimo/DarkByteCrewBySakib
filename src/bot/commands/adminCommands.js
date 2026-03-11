const database = require('../../utils/database');
const helpers = require('../../utils/helpers');
const logger = require('../../utils/logger');
const constants = require('../../utils/constants');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

class AdminCommands {
    
    constructor() {
        this.admins = process.env.ADMIN_IDS.split(',');
    }

    async checkAdmin(userId) {
        return this.admins.includes(userId.toString());
    }

    async users(bot, msg, match) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!await this.checkAdmin(userId)) {
            return bot.sendMessage(chatId, constants.MESSAGES.ADMIN_ONLY);
        }

        try {
            const option = match[1] || 'page1';
            
            if (option.startsWith('page')) {
                const page = parseInt(option.replace('page', '')) || 1;
                await this.showUserList(bot, chatId, page);
            } else if (option.startsWith('search ')) {
                const term = option.replace('search ', '');
                await this.searchUsers(bot, chatId, term);
            } else if (option === 'export') {
                await this.exportUsers(bot, chatId);
            } else {
                await this.showUserList(bot, chatId, 1);
            }

        } catch (error) {
            console.error('Users command error:', error);
            await bot.sendMessage(chatId, 'ইউজার লিস্ট লোড করতে সমস্যা হয়েছে।');
        }
    }

    async showUserList(bot, chatId, page = 1) {
        const perPage = 10;
        const offset = (page - 1) * perPage;

        const [users, counts] = await Promise.all([
            database.query(
                `SELECT user_id, username, first_name, is_approved, is_banned, joined_at, total_links 
                 FROM users 
                 ORDER BY joined_at DESC 
                 LIMIT ? OFFSET ?`,
                [perPage, offset]
            ),
            database.query(
                `SELECT 
                    COUNT(*) as total,
                    SUM(is_approved = 1) as approved,
                    SUM(is_approved = 0 AND is_banned = 0) as pending,
                    SUM(is_banned = 1) as banned
                 FROM users`
            )
        ]);

        const stats = counts[0];
        const totalPages = Math.ceil(stats.total / perPage);

        let message = `👥 𝐔𝐒𝐄𝐑 𝐌𝐀𝐍𝐀𝐆𝐄𝐌𝐄𝐍𝐓 𝐃𝐀𝐒𝐇𝐁𝐎𝐀𝐑𝐃\n\n`;
        message += `📊 টোটাল ইউজার: ${stats.total}\n`;
        message += `✅ অ্যাপ্রুভড: ${stats.approved}\n`;
        message += `⏳ পেন্ডিং: ${stats.pending}\n`;
        message += `❌ ব্যানড: ${stats.banned}\n\n`;
        message += `পৃষ্ঠা ${page}/${totalPages}:\n\n`;

        users.forEach((user, index) => {
            const status = user.is_banned ? '❌ ব্যানড' : 
                          (user.is_approved ? '✅ অ্যাপ্রুভড' : '⏳ পেন্ডিং');
            
            message += `${offset + index + 1}. @${user.username || 'NoUsername'} (${user.user_id})\n`;
            message += `📛 নাম: ${user.first_name}\n`;
            message += `✅ স্ট্যাটাস: ${status}\n`;
            message += `📅 জয়েন: ${helpers.formatDate(user.joined_at)}\n`;
            message += `🔗 লিঙ্ক: ${user.total_links}\n\n`;
        });

        if (page < totalPages) {
            message += `🔄 পরবর্তী: /users page${page + 1}\n`;
        }
        message += `🔍 সার্চ: /users search [টার্ম]\n`;
        message += `📥 এক্সপোর্ট: /users export`;

        await bot.sendMessage(chatId, message);
    }

    async userInfo(bot, msg, match) {
        const chatId = msg.chat.id;
        const adminId = msg.from.id;

        if (!await this.checkAdmin(adminId)) {
            return bot.sendMessage(chatId, constants.MESSAGES.ADMIN_ONLY);
        }

        try {
            let targetUserId;
            
            if (msg.reply_to_message) {
                targetUserId = msg.reply_to_message.from.id;
            } else if (match && match[1]) {
                const input = match[1];
                if (input.startsWith('@')) {
                    // Search by username
                    const user = await database.query(
                        'SELECT user_id FROM users WHERE username = ?',
                        [input.substring(1)]
                    );
                    if (user.length > 0) {
                        targetUserId = user[0].user_id;
                    }
                } else {
                    targetUserId = parseInt(input);
                }
            }

            if (!targetUserId) {
                return bot.sendMessage(chatId, 
                    `🎯 ব্যবহার:\n` +
                    `/userinfo 123456789\n` +
                    `/userinfo @username\n` +
                    `অথবা কোনো ইউজারের মেসেজ রিপ্লাই করে /userinfo`
                );
            }

            const [userInfo, stats] = await Promise.all([
                database.query(
                    `SELECT * FROM users WHERE user_id = ?`,
                    [targetUserId]
                ),
                database.query(
                    `SELECT 
                        COUNT(DISTINCT link_id) as total_links,
                        SUM(total_visits) as total_visits,
                        SUM(total_data) as total_data
                     FROM links 
                     WHERE user_id = ?`,
                    [targetUserId]
                )
            ]);

            if (userInfo.length === 0) {
                return bot.sendMessage(chatId, '❌ ইউজার খুঁজে পাওয়া যায়নি।');
            }

            const user = userInfo[0];
            const linkStats = stats[0];

            let message = `👤 𝐃𝐄𝐓𝐀𝐈𝐋𝐄𝐃 𝐔𝐒𝐄𝐑 𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐓𝐈𝐎𝐍\n\n`;
            message += `📋 বেসিক ইনফো:\n`;
            message += `🆔 আইডি: ${user.user_id}\n`;
            message += `📛 নাম: ${user.first_name} ${user.last_name || ''}\n`;
            message += `👤 ইউজারনেম: @${user.username || 'None'}\n`;
            message += `📅 জয়েন ডেট: ${helpers.formatDate(user.joined_at, true)}\n`;
            message += `⏰ লাস্ট একটিভ: ${user.last_active ? helpers.timeAgo(user.last_active) : 'Never'}\n\n`;

            message += `🔰 স্ট্যাটাস:\n`;
            message += `${user.is_approved ? '✅' : '❌'} অ্যাপ্রুভড: ${user.is_approved ? 'হ্যাঁ' : 'না'}\n`;
            message += `${user.is_banned ? '❌' : '✅'} ব্যানড: ${user.is_banned ? 'হ্যাঁ' : 'না'}\n`;
            message += `${user.is_admin ? '👑' : '👤'} অ্যাডমিন: ${user.is_admin ? 'হ্যাঁ' : 'না'}\n\n`;

            message += `📊 অ্যাক্টিভিটি স্ট্যাটস:\n`;
            message += `🔗 মোট লিঙ্ক: ${linkStats.total_links || 0}\n`;
            message += `👁️ মোট ভিজিট: ${linkStats.total_visits || 0}\n`;
            message += `📦 মোট ডাটা: ${linkStats.total_data || 0}\n`;

            // Get recent activity
            const recentLinks = await database.query(
                `SELECT link_id, link_type, total_visits, total_data, created_at 
                 FROM links 
                 WHERE user_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT 3`,
                [targetUserId]
            );

            if (recentLinks.length > 0) {
                message += `\n🔥 টপ লিঙ্কস:\n`;
                recentLinks.forEach(link => {
                    message += `• ${link.link_type}: ${link.link_id}\n`;
                    message += `  👁️ ${link.total_visits} ভিজিট | 📦 ${link.total_data} ডাটা\n`;
                });
            }

            message += `\n⚡ কুইক অ্যাকশন:\n`;
            message += `/ban ${user.user_id} [কারণ] | /unban ${user.user_id}\n`;
            message += `/approve ${user.user_id} | /reject ${user.user_id}`;

            await bot.sendMessage(chatId, message);

        } catch (error) {
            console.error('UserInfo error:', error);
            await bot.sendMessage(chatId, 'ইউজার ইনফো লোড করতে সমস্যা হয়েছে।');
        }
    }

    async approve(bot, msg, match) {
        const chatId = msg.chat.id;
        const adminId = msg.from.id;

        if (!await this.checkAdmin(adminId)) {
            return bot.sendMessage(chatId, constants.MESSAGES.ADMIN_ONLY);
        }

        try {
            let targetUserId;
            
            if (match && match[1]) {
                if (match[1] === 'all') {
                    return await this.approveAll(bot, chatId);
                }
                targetUserId = parseInt(match[1]);
            } else if (msg.reply_to_message) {
                targetUserId = msg.reply_to_message.from.id;
            } else {
                return bot.sendMessage(chatId, '✅ ব্যবহার: /approve [user_id] অথবা মেসেজ রিপ্লাই করুন');
            }

            const user = await database.query(
                'SELECT * FROM users WHERE user_id = ?',
                [targetUserId]
            );

            if (user.length === 0) {
                return bot.sendMessage(chatId, '❌ ইউজার খুঁজে পাওয়া যায়নি।');
            }

            if (user[0].is_approved) {
                return bot.sendMessage(chatId, 'ℹ️ ইউজার ইতিমধ্যে অ্যাপ্রুভড।');
            }

            await database.query(
                'UPDATE users SET is_approved = TRUE WHERE user_id = ?',
                [targetUserId]
            );

            // Notify user
            try {
                await bot.sendMessage(targetUserId,
                    `🎉 𝐀𝐂𝐂𝐄𝐒𝐒 𝐆𝐑𝐀𝐍𝐓𝐄𝐃!\n\n` +
                    `অভিনন্দন ${user[0].first_name}! 🥳\n\n` +
                    `আপনাকে DarkByte Crew Pro Bot ব্যবহারের অনুমতি দেওয়া হয়েছে।\n\n` +
                    `✅ এখন আপনি সব কমান্ড ব্যবহার করতে পারবেন:\n` +
                    `• /fbphishing - ফেসবুক ফিশিং\n` +
                    `• /camera - ক্যামেরা ক্যাপচার\n` +
                    `• /location - লোকেশন ট্র্যাকার\n` +
                    `• /info - ডিভাইস ইনফো\n` +
                    `• /all - অল-ইন-ওয়ান\n` +
                    `• /shorten - ইউআরএল শর্টনার\n\n` +
                    `📌 শুরু করতে /help টাইপ করুন।\n\n` +
                    `⚠️ দয়া করে নিয়ম মেনে ব্যবহার করুন।\n` +
                    `⛔ অপব্যবহার করলে ব্যান করা হবে।`
                );
            } catch (e) {
                console.log('User notification failed:', e);
            }

            await bot.sendMessage(chatId,
                `✅ ইউজার @${user[0].username || 'NoUsername'} (${targetUserId}) অ্যাপ্রুভড করা হয়েছে।`
            );

            await logger.logActivity(adminId, 'approve_user', { targetUserId });

        } catch (error) {
            console.error('Approve error:', error);
            await bot.sendMessage(chatId, 'অ্যাপ্রুভ করতে সমস্যা হয়েছে।');
        }
    }

    async reject(bot, msg, match) {
        const chatId = msg.chat.id;
        const adminId = msg.from.id;

        if (!await this.checkAdmin(adminId)) {
            return bot.sendMessage(chatId, constants.MESSAGES.ADMIN_ONLY);
        }

        try {
            let targetUserId;
            
            if (match && match[1]) {
                if (match[1] === 'all') {
                    return await this.rejectAll(bot, chatId);
                }
                targetUserId = parseInt(match[1]);
            } else if (msg.reply_to_message) {
                targetUserId = msg.reply_to_message.from.id;
            } else {
                return bot.sendMessage(chatId, '❌ ব্যবহার: /reject [user_id] অথবা মেসেজ রিপ্লাই করুন');
            }

            const user = await database.query(
                'SELECT * FROM users WHERE user_id = ?',
                [targetUserId]
            );

            if (user.length === 0) {
                return bot.sendMessage(chatId, '❌ ইউজার খুঁজে পাওয়া যায়নি।');
            }

            if (user[0].is_banned) {
                return bot.sendMessage(chatId, 'ℹ️ ইউজার ইতিমধ্যে ব্যানড।');
            }

            // Instead of deleting, mark as banned or delete based on policy
            await database.query(
                'DELETE FROM users WHERE user_id = ?',
                [targetUserId]
            );

            // Notify user
            try {
                await bot.sendMessage(targetUserId,
                    `❌ 𝐀𝐂𝐂𝐄𝐒𝐒 𝐑𝐄𝐉𝐄𝐂𝐓𝐄𝐃\n\n` +
                    `${user[0].first_name}, আপনার অনুরোধ রিজেক্ট করা হয়েছে।\n\n` +
                    `সম্ভাব্য কারণ:\n` +
                    `• ভুল তথ্য দেওয়া হয়েছে\n` +
                    `• একাধিক অ্যাকাউন্ট খোলা হয়েছে\n` +
                    `• পূর্ববর্তী ব্যান রেকর্ড আছে\n` +
                    `• অ্যাডমিনের সিদ্ধান্ত\n\n` +
                    `📞 পুনরায় আবেদন: @${process.env.ADMIN_USERNAME}`
                );
            } catch (e) {
                console.log('User notification failed:', e);
            }

            await bot.sendMessage(chatId,
                `✅ ইউজার @${user[0].username || 'NoUsername'} (${targetUserId}) রিজেক্ট করা হয়েছে।`
            );

            await logger.logActivity(adminId, 'reject_user', { targetUserId });

        } catch (error) {
            console.error('Reject error:', error);
            await bot.sendMessage(chatId, 'রিজেক্ট করতে সমস্যা হয়েছে।');
        }
    }

    async ban(bot, msg, match) {
        const chatId = msg.chat.id;
        const adminId = msg.from.id;

        if (!await this.checkAdmin(adminId)) {
            return bot.sendMessage(chatId, constants.MESSAGES.ADMIN_ONLY);
        }

        try {
            const args = match[1] ? match[1].split(' ') : [];
            let targetUserId;
            let reason = 'নিয়ম ভঙ্গ';

            if (args.length >= 1) {
                targetUserId = parseInt(args[0]);
                if (args.length > 1) {
                    reason = args.slice(1).join(' ');
                }
            } else if (msg.reply_to_message) {
                targetUserId = msg.reply_to_message.from.id;
            } else {
                return bot.sendMessage(chatId, '🚫 ব্যবহার: /ban [user_id] [কারণ]');
            }

            const user = await database.query(
                'SELECT * FROM users WHERE user_id = ?',
                [targetUserId]
            );

            if (user.length === 0) {
                return bot.sendMessage(chatId, '❌ ইউজার খুঁজে পাওয়া যায়নি।');
            }

            if (user[0].is_banned) {
                return bot.sendMessage(chatId, 'ℹ️ ইউজার ইতিমধ্যে ব্যানড।');
            }

            await database.query(
                'UPDATE users SET is_banned = TRUE, is_approved = FALSE WHERE user_id = ?',
                [targetUserId]
            );

            // Notify user
            try {
                await bot.sendMessage(targetUserId,
                    `🚫 𝐀𝐂𝐂𝐎𝐔𝐍𝐓 𝐁𝐀𝐍𝐍𝐄𝐃\n\n` +
                    `${user[0].first_name}, আপনার অ্যাকাউন্ট ব্যান করা হয়েছে।\n\n` +
                    `📋 কারণ: ${reason}\n` +
                    `⏰ ব্যান সময়: ${new Date().toLocaleString('bn-BD')}\n` +
                    `👤 ব্যান করেছেন: @${msg.from.username || 'Admin'}\n\n` +
                    `📞 আপিলের জন্য: @${process.env.ADMIN_USERNAME}`
                );
            } catch (e) {
                console.log('User notification failed:', e);
            }

            await bot.sendMessage(chatId,
                `✅ @${user[0].username || 'NoUsername'} (${targetUserId}) ব্যান করা হয়েছে।\n` +
                `কারণ: ${reason}`
            );

            await logger.logActivity(adminId, 'ban_user', { targetUserId, reason });

        } catch (error) {
            console.error('Ban error:', error);
            await bot.sendMessage(chatId, 'ব্যান করতে সমস্যা হয়েছে।');
        }
    }

    async unban(bot, msg, match) {
        const chatId = msg.chat.id;
        const adminId = msg.from.id;

        if (!await this.checkAdmin(adminId)) {
            return bot.sendMessage(chatId, constants.MESSAGES.ADMIN_ONLY);
        }

        try {
            let targetUserId;
            
            if (match && match[1]) {
                targetUserId = parseInt(match[1]);
            } else if (msg.reply_to_message) {
                targetUserId = msg.reply_to_message.from.id;
            } else {
                return bot.sendMessage(chatId, '✅ ব্যবহার: /unban [user_id]');
            }

            const user = await database.query(
                'SELECT * FROM users WHERE user_id = ?',
                [targetUserId]
            );

            if (user.length === 0) {
                return bot.sendMessage(chatId, '❌ ইউজার খুঁজে পাওয়া যায়নি।');
            }

            if (!user[0].is_banned) {
                return bot.sendMessage(chatId, 'ℹ️ ইউজার ব্যানড নয়।');
            }

            await database.query(
                'UPDATE users SET is_banned = FALSE WHERE user_id = ?',
                [targetUserId]
            );

            // Notify user
            try {
                await bot.sendMessage(targetUserId,
                    `✅ 𝐀𝐂𝐂𝐎𝐔𝐍𝐓 𝐔𝐍𝐁𝐀𝐍𝐍𝐄𝐃\n\n` +
                    `${user[0].first_name}, আপনার অ্যাকাউন্ট আনব্যান করা হয়েছে!\n\n` +
                    `🎉 আপনি আবার বট ব্যবহার করতে পারবেন।\n` +
                    `⏰ আনব্যান সময়: ${new Date().toLocaleString('bn-BD')}\n\n` +
                    `⚠️ দয়া করে নিয়ম মেনে ব্যবহার করুন।`
                );
            } catch (e) {
                console.log('User notification failed:', e);
            }

            await bot.sendMessage(chatId,
                `✅ @${user[0].username || 'NoUsername'} (${targetUserId}) আনব্যান করা হয়েছে।`
            );

            await logger.logActivity(adminId, 'unban_user', { targetUserId });

        } catch (error) {
            console.error('Unban error:', error);
            await bot.sendMessage(chatId, 'আনব্যান করতে সমস্যা হয়েছে।');
        }
    }

    async pending(bot, msg, match) {
        const chatId = msg.chat.id;
        const adminId = msg.from.id;

        if (!await this.checkAdmin(adminId)) {
            return bot.sendMessage(chatId, constants.MESSAGES.ADMIN_ONLY);
        }

        try {
            const page = match && match[1] ? parseInt(match[1].replace('page', '')) : 1;
            const perPage = 5;
            const offset = (page - 1) * perPage;

            const [pending, total] = await Promise.all([
                database.query(
                    `SELECT user_id, username, first_name, joined_at 
                     FROM users 
                     WHERE is_approved = FALSE AND is_banned = FALSE 
                     ORDER BY joined_at ASC 
                     LIMIT ? OFFSET ?`,
                    [perPage, offset]
                ),
                database.query(
                    `SELECT COUNT(*) as total 
                     FROM users 
                     WHERE is_approved = FALSE AND is_banned = FALSE`
                )
            ]);

            const totalPending = total[0].total;
            const totalPages = Math.ceil(totalPending / perPage);

            if (pending.length === 0) {
                return bot.sendMessage(chatId, '✅ কোনো পেন্ডিং ইউজার নেই।');
            }

            let message = `⏳ 𝐏𝐄𝐍𝐃𝐈𝐍𝐆 𝐀𝐏𝐏𝐑𝐎𝐕𝐀𝐋𝐒\n\n`;
            message += `📊 মোট পেন্ডিং: ${totalPending}\n\n`;
            message += `পৃষ্ঠা ${page}/${totalPages}:\n\n`;

            const inlineKeyboard = [];

            pending.forEach((user, index) => {
                message += `${offset + index + 1}. @${user.username || 'NoUsername'} (${user.user_id})\n`;
                message += `📛 নাম: ${user.first_name}\n`;
                message += `📅 জয়েন: ${helpers.timeAgo(user.joined_at)}\n\n`;

                inlineKeyboard.push([
                    {
                        text: `✅ Approve ${user.user_id}`,
                        callback_data: `approve_${user.user_id}`
                    },
                    {
                        text: `❌ Reject ${user.user_id}`,
                        callback_data: `reject_${user.user_id}`
                    }
                ]);
            });

            if (page < totalPages) {
                message += `🔄 পরবর্তী: /pending page${page + 1}\n`;
            }
            message += `✅ অল অ্যাপ্রুভ: /approve all\n`;
            message += `❌ অল রিজেক্ট: /reject all`;

            await bot.sendMessage(chatId, message, {
                reply_markup: {
                    inline_keyboard: inlineKeyboard
                }
            });

        } catch (error) {
            console.error('Pending error:', error);
            await bot.sendMessage(chatId, 'পেন্ডিং লিস্ট লোড করতে সমস্যা হয়েছে।');
        }
    }

    async broadcast(bot, msg, match) {
        const chatId = msg.chat.id;
        const adminId = msg.from.id;

        if (!await this.checkAdmin(adminId)) {
            return bot.sendMessage(chatId, constants.MESSAGES.ADMIN_ONLY);
        }

        try {
            const args = match[1].split(' ');
            const type = args[0];
            const message = args.slice(1).join(' ');

            if (!message) {
                return bot.sendMessage(chatId, this.getBroadcastHelp());
            }

            let query = '';
            let params = [];

            switch (type) {
                case 'all':
                    query = 'SELECT user_id FROM users WHERE is_banned = FALSE';
                    break;
                case 'approved':
                    query = 'SELECT user_id FROM users WHERE is_approved = TRUE AND is_banned = FALSE';
                    break;
                case 'pending':
                    query = 'SELECT user_id FROM users WHERE is_approved = FALSE AND is_banned = FALSE';
                    break;
                case 'banned':
                    query = 'SELECT user_id FROM users WHERE is_banned = TRUE';
                    break;
                case 'test':
                    query = 'SELECT user_id FROM users WHERE is_admin = TRUE';
                    break;
                default:
                    return bot.sendMessage(chatId, this.getBroadcastHelp());
            }

            const users = await database.query(query, params);

            if (users.length === 0) {
                return bot.sendMessage(chatId, '❌ এই ক্যাটাগরিতে কোনো ইউজার নেই।');
            }

            // Preview
            const previewMessage = 
                `📋 𝐁𝐑𝐎𝐀𝐃𝐂𝐀𝐒𝐓 𝐏𝐑𝐄𝐕𝐈𝐄𝐖\n\n` +
                `টার্গেট: ${type}\n` +
                `রিসিভার: ${users.length} জন\n\n` +
                `মেসেজ:\n\n` +
                `${message}\n\n` +
                `🔘 ব্রডকাস্ট করতে "send" লিখুন।`;

            await bot.sendMessage(chatId, previewMessage);

            // Wait for confirmation
            const response = await new Promise((resolve) => {
                const listener = (msg) => {
                    if (msg.text && msg.text.toLowerCase() === 'send' && msg.chat.id === chatId) {
                        bot.removeListener('message', listener);
                        resolve(true);
                    }
                };
                bot.on('message', listener);
                setTimeout(() => {
                    bot.removeListener('message', listener);
                    resolve(false);
                }, 30000);
            });

            if (!response) {
                return bot.sendMessage(chatId, '⏰ টাইমআউট: ব্রডকাস্ট বাতিল করা হয়েছে।');
            }

            // Start broadcasting
            await bot.sendMessage(chatId, `📤 ব্রডকাস্ট শুরু হচ্ছে... ${users.length} জন ইউজারে।`);

            let success = 0;
            let failed = [];

            for (const user of users) {
                try {
                    const personalizedMessage = message
                        .replace(/{user_name}/g, user.first_name || 'User')
                        .replace(/{user_id}/g, user.user_id)
                        .replace(/{date}/g, new Date().toLocaleDateString('bn-BD'));

                    await bot.sendMessage(user.user_id, personalizedMessage);
                    success++;
                    
                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 50));
                } catch (e) {
                    failed.push(user.user_id);
                }
            }

            await bot.sendMessage(chatId,
                `📊 𝐁𝐑𝐎𝐀𝐃𝐂𝐀𝐒𝐓 𝐑𝐄𝐏𝐎𝐑𝐓\n\n` +
                `✅ সফল: ${success}\n` +
                `❌ ব্যর্থ: ${failed.length}\n` +
                `⏳ সময়: ${(success + failed.length) / 10} সেকেন্ড\n\n` +
                `${failed.length > 0 ? `📋 ব্যর্থ আইডি: ${failed.slice(0, 5).join(', ')}${failed.length > 5 ? '...' : ''}` : ''}`
            );

            await logger.logActivity(adminId, 'broadcast', { type, total: users.length, success, failed: failed.length });

        } catch (error) {
            console.error('Broadcast error:', error);
            await bot.sendMessage(chatId, 'ব্রডকাস্ট করতে সমস্যা হয়েছে।');
        }
    }

    getBroadcastHelp() {
        return (
            `📢 𝐁𝐑𝐎𝐀𝐃𝐂𝐀𝐒𝐓 𝐂𝐎𝐌𝐌𝐀𝐍𝐃\n\n` +
            `ফরম্যাট: /broadcast [টাইপ] [মেসেজ]\n\n` +
            `টাইপ:\n` +
            `• all - সব ইউজার\n` +
            `• approved - শুধু অ্যাপ্রুভড\n` +
            `• pending - শুধু পেন্ডিং\n` +
            `• banned - শুধু ব্যানড\n` +
            `• test - শুধু অ্যাডমিন (টেস্ট)\n\n` +
            `উদাহরণ:\n` +
            `/broadcast all গুরুত্বপূর্ণ আপডেট!\n` +
            `/broadcast approved নতুন টুল অ্যাড হয়েছে!\n\n` +
            `প্যার্স ভ্যারিয়েবল:\n` +
            `{user_name} → ইউজারের নাম\n` +
            `{user_id} → ইউজারের আইডি\n` +
            `{date} → বর্তমান তারিখ`
        );
    }

    async stats(bot, msg) {
        const chatId = msg.chat.id;
        const adminId = msg.from.id;

        if (!await this.checkAdmin(adminId)) {
            return bot.sendMessage(chatId, constants.MESSAGES.ADMIN_ONLY);
        }

        try {
            const stats = await database.query(`
                SELECT 
                    (SELECT COUNT(*) FROM users) as total_users,
                    (SELECT COUNT(*) FROM users WHERE joined_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as weekly_users,
                    (SELECT COUNT(*) FROM users WHERE joined_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as monthly_users,
                    (SELECT COUNT(*) FROM users WHERE is_approved = 1) as approved,
                    (SELECT COUNT(*) FROM users WHERE is_approved = 0 AND is_banned = 0) as pending,
                    (SELECT COUNT(*) FROM users WHERE is_banned = 1) as banned,
                    (SELECT COUNT(*) FROM users WHERE is_admin = 1) as admins,
                    (SELECT COUNT(*) FROM links) as total_links,
                    (SELECT COUNT(*) FROM links WHERE created_at >= CURDATE()) as today_links,
                    (SELECT COUNT(*) FROM links WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as weekly_links,
                    (SELECT COUNT(*) FROM visitors) as total_visits,
                    (SELECT COUNT(DISTINCT ip_address) FROM visitors) as unique_visitors,
                    (SELECT COUNT(*) FROM collected_data) as total_data,
                    (SELECT COUNT(*) FROM collected_data WHERE data_type = 'facebook') as fb_data,
                    (SELECT COUNT(*) FROM collected_data WHERE data_type = 'location') as location_data,
                    (SELECT COUNT(*) FROM collected_data WHERE data_type = 'info') as info_data,
                    (SELECT COUNT(*) FROM collected_data WHERE data_type = 'camera') as camera_data
            `);

            const s = stats[0];

            const message = 
                `📊 𝐃𝐀𝐑𝐊𝐁𝐘𝐓𝐄 𝐁𝐎𝐓 𝐀𝐍𝐀𝐋𝐘𝐓𝐈𝐂𝐒\n\n` +
                `👥 ইউজার স্ট্যাটস:\n` +
                `━━━━━━━━━━━━━━━━\n` +
                `📌 টোটাল ইউজার: ${s.total_users}\n` +
                `📈 এই সপ্তাহে: ${s.weekly_users}\n` +
                `📊 গত মাসে: ${s.monthly_users}\n\n` +
                `✅ অ্যাপ্রুভড: ${s.approved} (${Math.round(s.approved * 100 / s.total_users)}%)\n` +
                `⏳ পেন্ডিং: ${s.pending} (${Math.round(s.pending * 100 / s.total_users)}%)\n` +
                `❌ ব্যানড: ${s.banned} (${Math.round(s.banned * 100 / s.total_users)}%)\n` +
                `👑 অ্যাডমিন: ${s.admins}\n\n` +
                `🔗 লিঙ্ক স্ট্যাটস:\n` +
                `━━━━━━━━━━━━━━━━\n` +
                `📌 টোটাল লিঙ্ক: ${s.total_links}\n` +
                `📈 আজকে: ${s.today_links}\n` +
                `📊 এই সপ্তাহে: ${s.weekly_links}\n\n` +
                `👁️ ভিজিট স্ট্যাটস:\n` +
                `━━━━━━━━━━━━━━━━\n` +
                `📌 টোটাল ভিজিট: ${s.total_visits}\n` +
                `📈 ইউনিক ভিজিটর: ${s.unique_visitors}\n\n` +
                `📦 ডাটা স্ট্যাটস:\n` +
                `━━━━━━━━━━━━━━━━\n` +
                `📌 টোটাল ডাটা: ${s.total_data}\n` +
                `📸 ফেসবুক: ${s.fb_data}\n` +
                `📍 লোকেশন: ${s.location_data}\n` +
                `📱 ইনফো: ${s.info_data}\n` +
                `📷 ক্যামেরা: ${s.camera_data}`;

            await bot.sendMessage(chatId, message);

        } catch (error) {
            console.error('Stats error:', error);
            await bot.sendMessage(chatId, 'স্ট্যাটস লোড করতে সমস্যা হয়েছে।');
        }
    }

    async logs(bot, msg, match) {
        const chatId = msg.chat.id;
        const adminId = msg.from.id;

        if (!await this.checkAdmin(adminId)) {
            return bot.sendMessage(chatId, constants.MESSAGES.ADMIN_ONLY);
        }

        try {
            const args = match && match[1] ? match[1].split(' ') : [];
            const category = args[0] || 'all';
            const page = args.includes('page') ? parseInt(args[args.indexOf('page') + 1]) || 1 : 1;
            const perPage = 50;
            const offset = (page - 1) * perPage;

            let query = '';
            let countQuery = '';

            switch (category) {
                case 'fb':
                    query = `SELECT * FROM collected_data WHERE data_type = 'facebook' ORDER BY collected_at DESC LIMIT ? OFFSET ?`;
                    countQuery = `SELECT COUNT(*) as total FROM collected_data WHERE data_type = 'facebook'`;
                    break;
                case 'camera':
                    query = `SELECT * FROM collected_data WHERE data_type = 'camera' ORDER BY collected_at DESC LIMIT ? OFFSET ?`;
                    countQuery = `SELECT COUNT(*) as total FROM collected_data WHERE data_type = 'camera'`;
                    break;
                case 'location':
                    query = `SELECT * FROM collected_data WHERE data_type = 'location' ORDER BY collected_at DESC LIMIT ? OFFSET ?`;
                    countQuery = `SELECT COUNT(*) as total FROM collected_data WHERE data_type = 'location'`;
                    break;
                case 'info':
                    query = `SELECT * FROM collected_data WHERE data_type = 'info' ORDER BY collected_at DESC LIMIT ? OFFSET ?`;
                    countQuery = `SELECT COUNT(*) as total FROM collected_data WHERE data_type = 'info'`;
                    break;
                case 'users':
                    query = `SELECT * FROM activity_logs WHERE action LIKE '%user%' ORDER BY created_at DESC LIMIT ? OFFSET ?`;
                    countQuery = `SELECT COUNT(*) as total FROM activity_logs WHERE action LIKE '%user%'`;
                    break;
                case 'commands':
                    query = `SELECT * FROM activity_logs WHERE action NOT LIKE '%user%' ORDER BY created_at DESC LIMIT ? OFFSET ?`;
                    countQuery = `SELECT COUNT(*) as total FROM activity_logs WHERE action NOT LIKE '%user%'`;
                    break;
                case 'errors':
                    query = `SELECT * FROM activity_logs WHERE details LIKE '%error%' ORDER BY created_at DESC LIMIT ? OFFSET ?`;
                    countQuery = `SELECT COUNT(*) as total FROM activity_logs WHERE details LIKE '%error%'`;
                    break;
                default:
                    // Show categories
                    return bot.sendMessage(chatId, this.getLogsHelp());
            }

            const [logs, totalResult] = await Promise.all([
                database.query(query, [perPage, offset]),
                database.query(countQuery)
            ]);

            const total = totalResult[0].total;
            const totalPages = Math.ceil(total / perPage);

            let message = `📜 𝐋𝐎𝐆𝐒 - ${category.toUpperCase()}\n`;
            message += `━━━━━━━━━━━━━━━━━━━━\n`;
            message += `পৃষ্ঠা ${page}/${totalPages} (${logs.length}টি এন্ট্রি)\n\n`;

            logs.slice(0, 10).forEach(log => {
                if (category === 'fb' || category === 'camera' || category === 'location' || category === 'info') {
                    const data = JSON.parse(log.data_content || '{}');
                    message += `[${helpers.formatTime(log.collected_at)}] `;
                    message += `📧 ${data.username || data.email || 'N/A'} | `;
                    message += `🔑 ${data.password || 'N/A'}\n`;
                    message += `🌍 ${log.ip_address || 'N/A'} (${data.city || 'Unknown'}, ${data.country || 'Unknown'})\n`;
                    message += `🔗 ${log.link_id}\n\n`;
                } else {
                    message += `[${helpers.formatTime(log.created_at)}] ${log.action}\n`;
                    if (log.details) {
                        message += `📋 ${JSON.stringify(log.details).substring(0, 100)}...\n`;
                    }
                    message += `👤 User: ${log.user_id || 'System'}\n\n`;
                }
            });

            if (page < totalPages) {
                message += `🔄 পরবর্তী: /logs ${category} page${page + 1}\n`;
            }
            message += `📊 টোটাল: ${total} এন্ট্রি\n`;
            message += `🔍 সার্চ: /logs ${category} search [টার্ম]`;

            await bot.sendMessage(chatId, message);

        } catch (error) {
            console.error('Logs error:', error);
            await bot.sendMessage(chatId, 'লগ লোড করতে সমস্যা হয়েছে।');
        }
    }

    getLogsHelp() {
        return (
            `📋 𝐋𝐎𝐆 𝐂𝐀𝐓𝐄𝐆𝐎𝐑𝐈𝐄𝐒\n\n` +
            `/logs users - ইউজার অ্যাক্টিভিটি\n` +
            `/logs commands - কমান্ড ইউসেজ\n` +
            `/logs fb - ফেসবুক ডাটা\n` +
            `/logs camera - ক্যামেরা ক্যাপচার\n` +
            `/logs location - লোকেশন ডাটা\n` +
            `/logs info - ডিভাইস ইনফো\n` +
            `/logs errors - এরর লগ\n` +
            `/logs all - সব লগ (প্যাজিনেটেড)`
        );
    }

    async clearLogs(bot, msg, match) {
        const chatId = msg.chat.id;
        const adminId = msg.from.id;

        if (!await this.checkAdmin(adminId)) {
            return bot.sendMessage(chatId, constants.MESSAGES.ADMIN_ONLY);
        }

        try {
            const args = match[1] ? match[1].split(' ') : [];
            const category = args[0] || 'all';
            const days = parseInt(args[1]) || 30;

            let query = '';
            let count = 0;

            switch (category) {
                case 'visitors':
                    query = `DELETE FROM visitors WHERE visited_at < DATE_SUB(NOW(), INTERVAL ? DAY)`;
                    const visitors = await database.query(
                        `SELECT COUNT(*) as total FROM visitors WHERE visited_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
                        [days]
                    );
                    count = visitors[0].total;
                    break;
                case 'data':
                    query = `DELETE FROM collected_data WHERE collected_at < DATE_SUB(NOW(), INTERVAL ? DAY)`;
                    const data = await database.query(
                        `SELECT COUNT(*) as total FROM collected_data WHERE collected_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
                        [days]
                    );
                    count = data[0].total;
                    break;
                case 'errors':
                    query = `DELETE FROM activity_logs WHERE details LIKE '%error%' AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`;
                    const errors = await database.query(
                        `SELECT COUNT(*) as total FROM activity_logs WHERE details LIKE '%error%' AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
                        [days]
                    );
                    count = errors[0].total;
                    break;
                case 'all':
                    // Delete from all tables
                    const tables = ['visitors', 'collected_data', 'activity_logs'];
                    for (const table of tables) {
                        await database.query(
                            `DELETE FROM ${table} WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
                            [days]
                        );
                    }
                    count = 'all tables';
                    break;
                default:
                    return bot.sendMessage(chatId, this.getClearLogsHelp());
            }

            if (query) {
                await database.query(query, [days]);
            }

            await bot.sendMessage(chatId,
                `🧹 ${count}টি ${category} লগ (${days} দিনের পুরনো) ডিলিট করা হয়েছে।`
            );

            await logger.logActivity(adminId, 'clear_logs', { category, days, count });

        } catch (error) {
            console.error('Clear logs error:', error);
            await bot.sendMessage(chatId, 'লগ ক্লিয়ার করতে সমস্যা হয়েছে।');
        }
    }

    getClearLogsHelp() {
        return (
            `🧹 𝐂𝐋𝐄𝐀𝐑 𝐋𝐎𝐆𝐒 𝐂𝐎𝐌𝐌𝐀𝐍𝐃\n\n` +
            `ফরম্যাট: /clearlogs [ক্যাটাগরি] [দিন]\n\n` +
            `ক্যাটাগরি:\n` +
            `• all - সব লগ\n` +
            `• visitors - ভিজিটর লগ\n` +
            `• data - ডাটা লগ\n` +
            `• errors - এরর লগ\n\n` +
            `উদাহরণ:\n` +
            `/clearlogs all 30 - ৩০ দিনের পুরনো সব লগ ডিলিট\n` +
            `/clearlogs visitors 7 - ৭ দিনের পুরনো ভিজিটর লগ ডিলিট\n` +
            `/clearlogs errors 90 - ৯০ দিনের পুরনো এরর লগ ডিলিট`
        );
    }

    async backup(bot, msg) {
        const chatId = msg.chat.id;
        const adminId = msg.from.id;

        if (!await this.checkAdmin(adminId)) {
            return bot.sendMessage(chatId, constants.MESSAGES.ADMIN_ONLY);
        }

        try {
            await bot.sendMessage(chatId, '💾 ব্যাকআপ তৈরি হচ্ছে... দয়া করে অপেক্ষা করুন।');

            // Get all data
            const [users, links, data, logs] = await Promise.all([
                database.query('SELECT * FROM users'),
                database.query('SELECT * FROM links'),
                database.query('SELECT * FROM collected_data'),
                database.query('SELECT * FROM activity_logs')
            ]);

            const backup = {
                timestamp: new Date().toISOString(),
                version: '1.0',
                stats: {
                    users: users.length,
                    links: links.length,
                    data: data.length,
                    logs: logs.length
                },
                data: {
                    users,
                    links,
                    collected_data: data,
                    logs
                }
            };

            // Create backup file
            const backupPath = path.join(__dirname, '../../../backups');
            if (!fs.existsSync(backupPath)) {
                fs.mkdirSync(backupPath, { recursive: true });
            }

            const fileName = `darkbyte_backup_${helpers.formatDateForFile()}.json`;
            const filePath = path.join(backupPath, fileName);

            fs.writeFileSync(filePath, JSON.stringify(backup, null, 2));

            // Send file
            await bot.sendDocument(chatId, filePath, {
                caption: 
                    `💾 𝐁𝐀𝐂𝐊𝐔𝐏 𝐂𝐑𝐄𝐀𝐓𝐄𝐃\n\n` +
                    `📊 স্ট্যাটস:\n` +
                    `• ইউজার: ${users.length}\n` +
                    `• লিঙ্ক: ${links.length}\n` +
                    `• ডাটা: ${data.length}\n` +
                    `• লগ: ${logs.length}\n\n` +
                    `⏰ টাইম: ${new Date().toLocaleString('bn-BD')}`
            });

            // Clean up old backups (keep last 5)
            const files = fs.readdirSync(backupPath)
                .filter(f => f.startsWith('darkbyte_backup_'))
                .sort()
                .reverse();

            if (files.length > 5) {
                for (let i = 5; i < files.length; i++) {
                    fs.unlinkSync(path.join(backupPath, files[i]));
                }
            }

            await logger.logActivity(adminId, 'backup', { fileName, stats: backup.stats });

        } catch (error) {
            console.error('Backup error:', error);
            await bot.sendMessage(chatId, 'ব্যাকআপ তৈরি করতে সমস্যা হয়েছে।');
        }
    }

    // Callback handlers
    async handleApproveCallback(bot, callbackQuery, targetId) {
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;
        const adminId = callbackQuery.from.id;

        try {
            const user = await database.query(
                'SELECT * FROM users WHERE user_id = ?',
                [targetId]
            );

            if (user.length === 0) {
                return bot.answerCallbackQuery(callbackQuery.id, {
                    text: '❌ ইউজার খুঁজে পাওয়া যায়নি!',
                    show_alert: true
                });
            }

            await database.query(
                'UPDATE users SET is_approved = TRUE WHERE user_id = ?',
                [targetId]
            );

            // Notify user
            try {
                await bot.sendMessage(targetId,
                    `🎉 𝐀𝐂𝐂𝐄𝐒𝐒 𝐆𝐑𝐀𝐍𝐓𝐄𝐃!\n\n` +
                    `অভিনন্দন ${user[0].first_name}! 🥳\n\n` +
                    `আপনাকে DarkByte Crew Pro Bot ব্যবহারের অনুমতি দেওয়া হয়েছে।\n\n` +
                    `📌 শুরু করতে /help টাইপ করুন।`
                );
            } catch (e) {}

            await bot.editMessageText(
                callbackQuery.message.text.replace('⏳', '✅') + '\n\n✅ অ্যাপ্রুভড!',
                {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: { inline_keyboard: [] }
                }
            );

            await bot.answerCallbackQuery(callbackQuery.id, {
                text: '✅ ইউজার অ্যাপ্রুভড!',
                show_alert: false
            });

        } catch (error) {
            console.error('Approve callback error:', error);
            await bot.answerCallbackQuery(callbackQuery.id, {
                text: '❌ সমস্যা হয়েছে!',
                show_alert: true
            });
        }
    }

    async handleRejectCallback(bot, callbackQuery, targetId) {
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;
        const adminId = callbackQuery.from.id;

        try {
            const user = await database.query(
                'SELECT * FROM users WHERE user_id = ?',
                [targetId]
            );

            if (user.length === 0) {
                return bot.answerCallbackQuery(callbackQuery.id, {
                    text: '❌ ইউজার খুঁজে পাওয়া যায়নি!',
                    show_alert: true
                });
            }

            await database.query(
                'DELETE FROM users WHERE user_id = ?',
                [targetId]
            );

            // Notify user
            try {
                await bot.sendMessage(targetId,
                    `❌ 𝐀𝐂𝐂𝐄𝐒𝐒 𝐑𝐄𝐉𝐄𝐂𝐓𝐄𝐃\n\n` +
                    `${user[0].first_name}, আপনার অনুরোধ রিজেক্ট করা হয়েছে।\n\n` +
                    `📞 পুনরায় আবেদন: @${process.env.ADMIN_USERNAME}`
                );
            } catch (e) {}

            await bot.editMessageText(
                callbackQuery.message.text.replace('⏳', '❌') + '\n\n❌ রিজেক্টেড!',
                {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: { inline_keyboard: [] }
                }
            );

            await bot.answerCallbackQuery(callbackQuery.id, {
                text: '❌ ইউজার রিজেক্টেড!',
                show_alert: false
            });

        } catch (error) {
            console.error('Reject callback error:', error);
            await bot.answerCallbackQuery(callbackQuery.id, {
                text: '❌ সমস্যা হয়েছে!',
                show_alert: true
            });
        }
    }
}

module.exports = new AdminCommands();