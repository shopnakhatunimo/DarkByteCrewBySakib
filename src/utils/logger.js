const database = require('./database');

class Logger {
    
    async logActivity(userId, action, details = {}) {
        try {
            await database.query(
                `INSERT INTO activity_logs (user_id, action, details, created_at) 
                 VALUES (?, ?, ?, NOW())`,
                [userId, action, JSON.stringify(details)]
            );
        } catch (error) {
            console.error('Logging error:', error);
        }
    }
    
    async logError(error, context = {}) {
        try {
            console.error('Error:', error.message, context);
            
            await database.query(
                `INSERT INTO activity_logs (user_id, action, details, created_at) 
                 VALUES (?, ?, ?, NOW())`,
                [0, 'system_error', JSON.stringify({
                    message: error.message,
                    stack: error.stack,
                    context
                })]
            );
        } catch (loggingError) {
            console.error('Error logging failed:', loggingError);
        }
    }
    
    async getUserActivity(userId, limit = 50) {
        return await database.query(
            `SELECT * FROM activity_logs 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT ?`,
            [userId, limit]
        );
    }
    
    async getSystemLogs(days = 7) {
        return await database.query(
            `SELECT * FROM activity_logs 
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
             ORDER BY created_at DESC`,
            [days]
        );
    }
    
    async getStats() {
        const stats = await database.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as total,
                SUM(CASE WHEN action LIKE '%error%' THEN 1 ELSE 0 END) as errors
            FROM activity_logs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `);
        
        return stats;
    }
}

module.exports = new Logger();