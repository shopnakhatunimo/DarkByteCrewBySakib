const User = require('../models/User');

const authMiddleware = async (msg) => {
  const userId = msg.from.id;
  
  try {
    const user = await User.findOne({ userId });
    
    if (!user) {
      return {
        allowed: false,
        reason: 'not_registered',
        user: null
      };
    }
    
    if (user.banned) {
      return {
        allowed: false,
        reason: 'banned',
        user
      };
    }
    
    if (!user.approved) {
      return {
        allowed: false,
        reason: 'pending',
        user
      };
    }
    
    // লাস্ট একটিভ আপডেট
    await user.updateActivity();
    
    return {
      allowed: true,
      reason: null,
      user
    };
    
  } catch (error) {
    console.error('Auth Error:', error);
    return {
      allowed: false,
      reason: 'error',
      user: null
    };
  }
};

module.exports = authMiddleware;