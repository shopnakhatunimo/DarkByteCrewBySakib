const rateLimit = new Map();

const rateLimiter = (userId) => {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 5; // 5 requests per minute
  
  if (!rateLimit.has(userId)) {
    rateLimit.set(userId, []);
  }
  
  const timestamps = rateLimit.get(userId).filter(t => now - t < windowMs);
  
  if (timestamps.length >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: new Date(timestamps[0] + windowMs)
    };
  }
  
  timestamps.push(now);
  rateLimit.set(userId, timestamps);
  
  return {
    allowed: true,
    remaining: maxRequests - timestamps.length,
    resetTime: new Date(timestamps[0] + windowMs)
  };
};

// প্রতি মিনিটে ক্লিনআপ
setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamps] of rateLimit.entries()) {
    const filtered = timestamps.filter(t => now - t < 60000);
    if (filtered.length === 0) {
      rateLimit.delete(userId);
    } else {
      rateLimit.set(userId, filtered);
    }
  }
}, 60000);

module.exports = rateLimiter;