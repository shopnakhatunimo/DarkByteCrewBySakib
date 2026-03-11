const database = require('../utils/database');

class LogModel {
    
    async create(logData) {
        const { userId, action, details, ipAddress } = logData;
        
        const result = await database.query(
            `INSERT INTO activity_logs (user_id, action, details, ip_address, created_at) 
             VALUES (?, ?, ?, ?, NOW())`,
            [userId || 0, action, JSON.stringify(details || {}), ipAddress || null]
        );
        
        return result.insertId;
    }

    async getByUser(userId, options = {}) {
        const { limit = 50, offset = 0, from = null, to = null } = options;
        
        let query = 'SELECT * FROM activity_logs WHERE user_id = ?';
        const params = [userId];
        
        if (from) {
            query += ' AND created_at >= ?';
            params.push(from);
        }
        
        if (to) {
            query += ' AND created_at <= ?';
            params.push(to);
        }
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        return await database.query(query, params);
    }

    async getByAction(action, options = {}) {
        const { limit = 50, offset = 0, days = 7 } = options;
        
        return await database.query(
            `SELECT * FROM activity_logs 
             WHERE action LIKE ? 
             AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
            [`%${action}%`, days, limit, offset]
        );
    }

    async getErrors(options = {}) {
        const { limit = 50, offset = 0, days = 7 } = options;
        
        return await database.query(
            `SELECT * FROM activity_logs 
             WHERE action LIKE '%error%' 
             AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
            [days, limit, offset]
        );
    }

    async getStats(days = 30) {
        const stats = await database.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as total_actions,
                COUNT(DISTINCT user_id) as unique_users,
                SUM(CASE WHEN action LIKE '%error%' THEN 1 ELSE 0 END) as errors,
                SUM(CASE WHEN action LIKE 'create_%' THEN 1 ELSE 0 END) as creations,
                SUM(CASE WHEN action LIKE 'visit_%' THEN 1 ELSE 0 END) as visits
            FROM activity_logs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `, [days]);
        
        return stats;
    }

    async getRecentActivity(limit = 20) {
        return await database.query(
            `SELECT al.*, u.username, u.first_name 
             FROM activity_logs al
             LEFT JOIN users u ON al.user_id = u.user_id
             ORDER BY al.created_at DESC 
             LIMIT ?`,
            [limit]
        );
    }

    async deleteOldLogs(days = 90) {
        const result = await database.query(
            'DELETE FROM activity_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
            [days]
        );
        
        return result.affectedRows;
    }

    async getUserStats(userId) {
        const stats = await database.query(`
            SELECT 
                COUNT(*) as total_actions,
                COUNT(DISTINCT DATE(created_at)) as active_days,
                MIN(created_at) as first_action,
                MAX(created_at) as last_action,
                COUNT(CASE WHEN action LIKE 'create_%' THEN 1 END) as creations,
                COUNT(CASE WHEN action LIKE 'visit_%' THEN 1 END) as visits
            FROM activity_logs
            WHERE user_id = ?
        `, [userId]);
        
        return stats[0];
    }

    async search(query, options = {}) {
        const { limit = 50, offset = 0 } = options;
        
        return await database.query(
            `SELECT al.*, u.username, u.first_name 
             FROM activity_logs al
             LEFT JOIN users u ON al.user_id = u.user_id
             WHERE al.action LIKE ? 
                OR al.details LIKE ?
                OR u.username LIKE ?
                OR u.first_name LIKE ?
             ORDER BY al.created_at DESC
             LIMIT ? OFFSET ?`,
            [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, limit, offset]
        );
    }
}

module.exports = new LogModel();