const database = require('../utils/database');

class RateLimiter {
    constructor() {
        this.limits = new Map();
        this.maxRequests = 5; // per minute
        this.windowMs = 60 * 1000; // 1 minute
    }

    async checkLimit(userId) {
        try {
            const now = Date.now();
            const userLimits = this.limits.get(userId) || [];
            
            // Remove old requests
            const recentRequests = userLimits.filter(
                timestamp => now - timestamp < this.windowMs
            );

            if (recentRequests.length >= this.maxRequests) {
                // Increment warning count
                await database.query(
                    'UPDATE users SET warning_count = warning_count + 1 WHERE user_id = ?',
                    [userId]
                );
                return false;
            }

            // Add current request
            recentRequests.push(now);
            this.limits.set(userId, recentRequests);

            return true;

        } catch (error) {
            console.error('Rate limit error:', error);
            return true; // Allow on error
        }
    }

    // Reset limit for user
    resetLimit(userId) {
        this.limits.delete(userId);
    }

    // Get remaining requests
    getRemaining(userId) {
        const now = Date.now();
        const userLimits = this.limits.get(userId) || [];
        const recentRequests = userLimits.filter(
            timestamp => now - timestamp < this.windowMs
        );
        
        return Math.max(0, this.maxRequests - recentRequests.length);
    }

    // Get reset time
    getResetTime(userId) {
        const now = Date.now();
        const userLimits = this.limits.get(userId) || [];
        
        if (userLimits.length === 0) {
            return 0;
        }

        const oldestRequest = Math.min(...userLimits);
        return Math.max(0, this.windowMs - (now - oldestRequest));
    }
}

module.exports = new RateLimiter();