const database = require('../utils/database');
const logger = require('../utils/logger');
const userModel = require('../models/userModel');

class AuthController {
    
    async checkUser(userId) {
        try {
            const user = await userModel.findById(userId);
            return {
                exists: !!user,
                user: user
            };
        } catch (error) {
            await logger.logError(error, { userId, action: 'checkUser' });
            return { exists: false, user: null };
        }
    }

    async registerUser(userData) {
        try {
            const user = await userModel.create(userData);
            await logger.logActivity(userData.user_id, 'user_registered', {
                username: userData.username
            });
            return user;
        } catch (error) {
            await logger.logError(error, { userData, action: 'registerUser' });
            throw error;
        }
    }

    async approveUser(userId, adminId) {
        try {
            const user = await userModel.update(userId, { is_approved: true });
            await logger.logActivity(adminId, 'user_approved', { targetUserId: userId });
            return user;
        } catch (error) {
            await logger.logError(error, { userId, adminId, action: 'approveUser' });
            throw error;
        }
    }

    async rejectUser(userId, adminId) {
        try {
            await userModel.delete(userId);
            await logger.logActivity(adminId, 'user_rejected', { targetUserId: userId });
            return true;
        } catch (error) {
            await logger.logError(error, { userId, adminId, action: 'rejectUser' });
            throw error;
        }
    }

    async banUser(userId, adminId, reason) {
        try {
            const user = await userModel.update(userId, { 
                is_banned: true, 
                is_approved: false 
            });
            await logger.logActivity(adminId, 'user_banned', { 
                targetUserId: userId, 
                reason 
            });
            return user;
        } catch (error) {
            await logger.logError(error, { userId, adminId, action: 'banUser' });
            throw error;
        }
    }

    async unbanUser(userId, adminId) {
        try {
            const user = await userModel.update(userId, { is_banned: false });
            await logger.logActivity(adminId, 'user_unbanned', { targetUserId: userId });
            return user;
        } catch (error) {
            await logger.logError(error, { userId, adminId, action: 'unbanUser' });
            throw error;
        }
    }

    async updateLastActive(userId) {
        try {
            await database.query(
                'UPDATE users SET last_active = NOW() WHERE user_id = ?',
                [userId]
            );
        } catch (error) {
            console.error('Update last active error:', error);
        }
    }

    async isAdmin(userId) {
        try {
            const user = await userModel.findById(userId);
            return user && (user.is_admin || process.env.ADMIN_IDS.split(',').includes(userId.toString()));
        } catch (error) {
            return false;
        }
    }

    async getPendingUsers() {
        return await database.query(
            'SELECT * FROM users WHERE is_approved = FALSE AND is_banned = FALSE ORDER BY joined_at ASC'
        );
    }

    async getBannedUsers() {
        return await database.query(
            'SELECT * FROM users WHERE is_banned = TRUE ORDER BY joined_at DESC'
        );
    }
}

module.exports = new AuthController();