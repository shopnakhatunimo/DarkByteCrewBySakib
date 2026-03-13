const REQUIRED_CHANNEL_USERNAME = '@DarkByteCrew_Official';
const REQUIRED_CHANNEL_URL = 'https://t.me/DarkByteCrew_Official';

function isJoinedMember(member) {
  if (!member) {
    return false;
  }

  if (['creator', 'administrator', 'member'].includes(member.status)) {
    return true;
  }

  return member.status === 'restricted' && member.is_member === true;
}

async function checkChannelMembership(bot, userId) {
  try {
    const member = await bot.getChatMember(REQUIRED_CHANNEL_USERNAME, userId);
    return isJoinedMember(member);
  } catch (error) {
    console.error('Channel membership check failed:', error.message);
    return false;
  }
}

async function promptChannelJoin(bot, chatId) {
  await bot.sendMessage(
    chatId,
    'এই বট ব্যবহার করতে হলে আগে আমাদের অফিসিয়াল চ্যানেলে জয়েন করতে হবে। জয়েন করার পরে নিচের বাটনে চাপ দিয়ে আবার চেক করুন।',
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'চ্যানেলে জয়েন করুন', url: REQUIRED_CHANNEL_URL }],
          [{ text: 'জয়েন হয়ে গেছে, আবার চেক করুন', callback_data: 'check_membership' }]
        ]
      }
    }
  );
}

async function ensureChannelJoined(bot, msg) {
  const joined = await checkChannelMembership(bot, msg.from.id);
  if (joined) {
    return true;
  }

  await promptChannelJoin(bot, msg.chat.id);
  return false;
}

module.exports = {
  REQUIRED_CHANNEL_USERNAME,
  REQUIRED_CHANNEL_URL,
  checkChannelMembership,
  ensureChannelJoined,
  promptChannelJoin
};
