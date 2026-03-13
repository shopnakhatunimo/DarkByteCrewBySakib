const User = require('../models/User');

const adminCheck = async (userId) => {
  try {
    // এনভায়রনমেন্ট থেকে অ্যাডমিন আইডি চেক
    const adminIds = (process.env.ADMIN_IDS || '')
      .split(',')
      .map(id => parseInt(id.trim(), 10))
      .filter(Number.isInteger);
    
    if (adminIds.includes(userId)) {
      return true;
    }
    
    // ডাটাবেস থেকে অ্যাডমিন চেক
    const user = await User.findOne({ userId });
    return user?.isAdmin || false;
    
  } catch (error) {
    console.error('Admin Check Error:', error);
    return false;
  }
};

module.exports = adminCheck;
