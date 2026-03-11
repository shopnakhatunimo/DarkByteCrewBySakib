const database = require('../utils/database');
const helpers = require('../utils/helpers');

class LinkController {
    
    async createLink(data) {
        const { linkId, userId, type, targetUrl = null, expiresIn = 7 } = data;
        
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresIn);
        
        await database.query(
            `INSERT INTO links (link_id, user_id, link_type, target_url, created_at, expires_at) 
             VALUES (?, ?, ?, ?, NOW(), ?)`,
            [linkId, userId, type, targetUrl, expiresAt]
        );
        
        // Update user's total links count
        await database.query(
            'UPDATE users SET total_links = total_links + 1 WHERE user_id = ?',
            [userId]
        );
        
        return { linkId, success: true };
    }
    
    async getLink(linkId) {
        const links = await database.query(
            'SELECT * FROM links WHERE link_id = ?',
            [linkId]
        );
        
        return links.length > 0 ? links[0] : null;
    }
    
    async getUserLinks(userId, page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        
        const [links, total] = await Promise.all([
            database.query(
                `SELECT * FROM links 
                 WHERE user_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT ? OFFSET ?`,
                [userId, limit, offset]
            ),
            database.query(
                'SELECT COUNT(*) as total FROM links WHERE user_id = ?',
                [userId]
            )
        ]);
        
        return {
            links,
            total: total[0].total,
            page,
            totalPages: Math.ceil(total[0].total / limit)
        };
    }
    
    async getLinkStats(linkId) {
        const [link, visitors, data] = await Promise.all([
            database.query('SELECT * FROM links WHERE link_id = ?', [linkId]),
            database.query('SELECT COUNT(*) as total FROM visitors WHERE link_id = ?', [linkId]),
            database.query('SELECT COUNT(*) as total FROM collected_data WHERE link_id = ?', [linkId])
        ]);
        
        if (link.length === 0) {
            return null;
        }
        
        return {
            ...link[0],
            totalVisits: visitors[0].total,
            totalData: data[0].total
        };
    }
    
    async deactivateLink(linkId) {
        await database.query(
            'UPDATE links SET is_active = FALSE WHERE link_id = ?',
            [linkId]
        );
    }
    
    async deleteLink(linkId) {
        await database.transaction(async (connection) => {
            // Delete related data first
            await connection.execute('DELETE FROM visitors WHERE link_id = ?', [linkId]);
            await connection.execute('DELETE FROM collected_data WHERE link_id = ?', [linkId]);
            await connection.execute('DELETE FROM links WHERE link_id = ?', [linkId]);
        });
    }
    
    async cleanupExpiredLinks() {
        const expired = await database.query(
            'SELECT * FROM links WHERE expires_at < NOW() AND is_active = TRUE'
        );
        
        for (const link of expired) {
            await this.deactivateLink(link.link_id);
        }
        
        return expired.length;
    }
}

module.exports = new LinkController();