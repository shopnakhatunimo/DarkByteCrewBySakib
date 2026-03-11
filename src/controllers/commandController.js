const database = require('../utils/database');
const logger = require('../utils/logger');
const helpers = require('../utils/helpers');
const authMiddleware = require('../middleware/authMiddleware');

class CommandController {
    
    async executeCommand(userId, command, args = []) {
        // Log command usage
        await logger.logActivity(userId, 'command_executed', {
            command,
            args,
            timestamp: new Date().toISOString()
        });

        // Update last active
        await database.query(
            'UPDATE users SET last_active = NOW() WHERE user_id = ?',
            [userId]
        );

        return {
            success: true,
            command,
            args
        };
    }

    async getCommandStats(command = null) {
        let query = `
            SELECT 
                action as command,
                COUNT(*) as total_uses,
                COUNT(DISTINCT user_id) as unique_users,
                DATE(MIN(created_at)) as first_used,
                DATE(MAX(created_at)) as last_used
            FROM activity_logs
            WHERE action LIKE 'command_%'
        `;
        
        const params = [];
        
        if (command) {
            query += ' AND action = ?';
            params.push(`command_${command}`);
        }
        
        query += ' GROUP BY action ORDER BY total_uses DESC';
        
        return await database.query(query, params);
    }

    async getPopularCommands(limit = 10) {
        return await database.query(`
            SELECT 
                REPLACE(action, 'command_', '') as command,
                COUNT(*) as uses
            FROM activity_logs
            WHERE action LIKE 'command_%'
            AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY action
            ORDER BY uses DESC
            LIMIT ?
        `, [limit]);
    }

    async getUserCommandHistory(userId, limit = 20) {
        return await database.query(
            `SELECT * FROM activity_logs 
             WHERE user_id = ? AND action LIKE 'command_%'
             ORDER BY created_at DESC 
             LIMIT ?`,
            [userId, limit]
        );
    }

    async validateCommandAccess(userId, command) {
        // Check if user is banned
        const isBanned = await authMiddleware.checkBan(userId);
        if (isBanned) {
            return { allowed: false, reason: 'banned' };
        }

        // Check if user is approved (for non-start commands)
        if (command !== 'start') {
            const user = await database.query(
                'SELECT is_approved FROM users WHERE user_id = ?',
                [userId]
            );
            
            if (user.length === 0 || !user[0].is_approved) {
                return { allowed: false, reason: 'not_approved' };
            }
        }

        // Admin commands check
        const adminCommands = ['users', 'userinfo', 'approve', 'reject', 'ban', 'unban', 
                              'pending', 'broadcast', 'stats', 'logs', 'clearlogs', 'backup'];
        
        if (adminCommands.includes(command)) {
            const isAdmin = await authMiddleware.checkAdmin(userId);
            if (!isAdmin) {
                return { allowed: false, reason: 'admin_only' };
            }
        }

        return { allowed: true };
    }
}

module.exports = new CommandController();