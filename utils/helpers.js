const crypto = require('crypto');
const geoip = require('geoip-lite');
const useragent = require('useragent');
const moment = require('moment');

const helpers = {
  // র‍্যান্ডম স্ট্রিং জেনারেটর
  generateRandomString: (length = 8) => {
    return crypto.randomBytes(length).toString('hex').slice(0, length);
  },
  
  // ইউনিক আইডি জেনারেটর
  generateUniqueId: (prefix) => {
    return `${prefix}_${Date.now()}_${helpers.generateRandomString(4)}`;
  },
  
  // আইপি থেকে লোকেশন বের করা
  getLocationFromIP: (ip) => {
    const geo = geoip.lookup(ip);
    return geo || { country: 'Unknown', region: 'Unknown', city: 'Unknown' };
  },
  
  // ইউজার এজেন্ট থেকে ডিভাইস ইনফো
  parseUserAgent: (ua) => {
    const agent = useragent.parse(ua);
    return {
      browser: `${agent.family} ${agent.major}`,
      os: agent.os.toString(),
      device: agent.device.toString() || 'Desktop',
      isMobile: agent.device.toString() !== 'Other'
    };
  },
  
  // টাইম ফরম্যাট
  formatTime: (date, format = 'YYYY-MM-DD HH:mm:ss') => {
    return moment(date).format(format);
  },
  
  // সাইজ ফরম্যাট (বাইট থেকে কেবি/এমবি)
  formatSize: (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  },
  
  // নম্বর ফরম্যাট (কমা সহ)
  formatNumber: (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  },
  
  // URL এনকোড
  encodeUrl: (url) => {
    return encodeURIComponent(url);
  },
  
  // URL ডিকোড
  decodeUrl: (encoded) => {
    return decodeURIComponent(encoded);
  },
  
  // HTML এস্কেপ
  escapeHtml: (text) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
};

module.exports = helpers;