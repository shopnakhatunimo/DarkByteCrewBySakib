const database = require('../utils/database');

class UserModel {
    
    async create(userData) {
        const { user_id, username, first_name, last_name } = userData;
        
        await database.query(
            `INSERT INTO users (user_id, username, first_name, last_name, joined_at) 
             VALUES (?, ?, ?, ?, NOW())`,
            [user_id, username, first_name, last_name]
        );
        
        return this.findById(user_id);
    }
    
    async findById(userId) {
        const users = await database.query(
            'SELECT * FROM users WHERE user_id = ?',
            [userId]
        );
        return users.length > 0 ? users[0] : null;
    }
    
    async findByUsername(username) {
        const users = await database.query(
            'SELECT * FROM users WHERE username = ?',
            [username.replace('@', '')]
        );
        return users.length > 0 ? users[0] : null;
    }
    
    async update(userId, updates) {
        const allowedFields = ['username', 'first_name', 'last_name', 'is_approved', 'is_banned', 'is_admin'];
        const setClause = [];
        const values = [];
        
        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                setClause.push(`${key} = ?`);
                values.push(value);
            }
        }
        
        if (setClause.length === 0) return null;
        
        values.push(userId);
        await database.query(
            `UPDATE users SET ${setClause.join(', ')} WHERE user_id = ?`,
            values
        );
        
        return this.findById(userId);
    }
    
    async delete(userId) {
        await database.query('DELETE FROM users WHERE user_id = ?', [userId]);
    }
    
    async getAll(options = {}) {
        const { page = 1, limit = 10, status = 'all' } = options;
        const offset = (page - 1) * limit;
        
        let whereClause = '';
        const params = [];
        
        if (status === 'approved') {
            whereClause = 'WHERE is_approved = TRUE AND is_banned = FALSE';
        } else if (status === 'pending') {
            whereClause = 'WHERE is_approved = FALSE AND is_banned = FALSE';
        } else if (status === 'banned') {
            whereClause = 'WHERE is_banned = TRUE';
        }
        
        const [users, total] = await Promise.all([
            database.query(
                `SELECT * FROM users ${whereClause} ORDER BY joined_at DESC LIMIT ? OFFSET ?`,
                [...params, limit, offset]
            ),
            database.query(
                `SELECT COUNT(*) as total FROM users ${whereClause}`,
                params
            )
        ]);
        
        return {
            users,
            total: total[0].total,
            page,
            totalPages: Math.ceil(total[0].total / limit)
        };
    }
    
    async getStats() {
        const stats = await database.query(`
            SELECT 
                COUNT(*) as total,
                SUM(is_approved = 1) as approved,
                SUM(is_approved = 0 AND is_banned = 0) as pending,
                SUM(is_banned = 1) as banned,
                SUM(is_admin = 1) as admins,
                SUM(joined_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as weekly,
                SUM(joined_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as monthly
            FROM users
        `);
        
        return stats[0];
    }
}

module.exports = new UserModel();