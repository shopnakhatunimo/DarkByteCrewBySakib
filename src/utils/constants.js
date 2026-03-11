module.exports = {
    MESSAGES: {
        ACCESS_DENIED: 
            `⛔ 𝐀𝐂𝐂𝐄𝐒𝐒 𝐃𝐄𝐍𝐈𝐄𝐃 ⛔\n\n` +
            `আপনার এই বট ব্যবহারের অনুমতি নেই।\n\n` +
            `📋 সম্ভাব্য কারণ:\n` +
            `• আপনার অনুমতি এখনও পেন্ডিং\n` +
            `• আপনি ব্যান করা হয়েছেন\n` +
            `• আপনার রিকোয়েস্ট লিমিট ক্রস করেছেন\n\n` +
            `👤 হেল্প: @${process.env.ADMIN_USERNAME}`,
        
        BANNED:
            `🚫 𝐀𝐂𝐂𝐎𝐔𝐍𝐓 𝐁𝐀𝐍𝐍𝐄𝐃\n\n` +
            `আপনাকে বট ব্যবহার থেকে ব্যান করা হয়েছে।\n\n` +
            `📞 আপিলের জন্য: @${process.env.ADMIN_USERNAME}`,
        
        ADMIN_ONLY:
            `⛔ 𝐀𝐃𝐌𝐈𝐍 𝐎𝐍𝐋𝐘\n\n` +
            `এই কমান্ড শুধু অ্যাডমিনদের জন্য।`,
        
        RATE_LIMIT:
            `⚠️ 𝐑𝐀𝐓𝐄 𝐋𝐈𝐌𝐈𝐓 𝐄𝐗𝐂𝐄𝐄𝐃𝐄𝐃\n\n` +
            `আপনি প্রতি মিনিটে ৫টির বেশি কমান্ড দিতে পারবেন না।\n` +
            `অনুগ্রহ করে কিছুক্ষণ পর চেষ্টা করুন।`,
        
        MAINTENANCE:
            `🔧 𝐌𝐀𝐈𝐍𝐓𝐄𝐍𝐀𝐍𝐂𝐄 𝐌𝐎𝐃𝐄\n\n` +
            `বটটি আপডেটের জন্য কিছুক্ষণের জন্য বন্ধ আছে।\n` +
            `দয়া করে পরে আবার চেষ্টা করুন।`
    },

    LINK_TYPES: {
        FB: 'fb',
        CAMERA: 'camera',
        LOCATION: 'location',
        INFO: 'info',
        ALL: 'all',
        CUSTOM: 'custom'
    },

    DATA_TYPES: {
        FACEBOOK: 'facebook',
        CAMERA: 'camera',
        LOCATION: 'location',
        INFO: 'info'
    },

    SITE_CODES: {
        fb: 'facebook.com',
        yt: 'youtube.com',
        ig: 'instagram.com',
        tw: 'twitter.com',
        wa: 'whatsapp.com',
        tg: 'telegram.org',
        ck: 'tiktok.com',
        pt: 'pinterest.com',
        rd: 'reddit.com',
        li: 'linkedin.com'
    },

    PERMISSION_LEVELS: {
        USER: 1,
        APPROVED: 2,
        ADMIN: 3,
        SUPER_ADMIN: 4
    }
};