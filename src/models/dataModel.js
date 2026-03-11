const database = require('../utils/database');

class DataModel {
    
    async create(data) {
        const { linkId, dataType, content, ipAddress } = data;
        
        const result = await database.query(
            `INSERT INTO collected_data (link_id, data_type, data_content, ip_address, collected_at) 
             VALUES (?, ?, ?, ?, NOW())`,
            [linkId, dataType, JSON.stringify(content), ipAddress]
        );
        
        return result.insertId;
    }

    async getByLinkId(linkId, options = {}) {
        const { type = null, limit = 100, offset = 0 } = options;
        
        let query = 'SELECT * FROM collected_data WHERE link_id = ?';
        const params = [linkId];
        
        if (type) {
            query += ' AND data_type = ?';
            params.push(type);
        }
        
        query += ' ORDER BY collected_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        return await database.query(query, params);
    }

    async getByUserId(userId, options = {}) {
        const { type = null, limit = 100, offset = 0 } = options;
        
        let query = `
            SELECT cd.* FROM collected_data cd
            JOIN links l ON cd.link_id = l.link_id
            WHERE l.user_id = ?
        `;
        const params = [userId];
        
        if (type) {
            query += ' AND cd.data_type = ?';
            params.push(type);
        }
        
        query += ' ORDER BY cd.collected_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        return await database.query(query, params);
    }

    async getStatsByUser(userId) {
        const stats = await database.query(`
            SELECT 
                cd.data_type,
                COUNT(*) as total,
                COUNT(DISTINCT cd.ip_address) as unique_visitors,
                DATE(MIN(cd.collected_at)) as first_data,
                DATE(MAX(cd.collected_at)) as last_data
            FROM collected_data cd
            JOIN links l ON cd.link_id = l.link_id
            WHERE l.user_id = ?
            GROUP BY cd.data_type
        `, [userId]);
        
        return stats;
    }

    async getStatsByLink(linkId) {
        const stats = await database.query(`
            SELECT 
                data_type,
                COUNT(*) as total,
                COUNT(DISTINCT ip_address) as unique_visitors,
                MIN(collected_at) as first,
                MAX(collected_at) as last
            FROM collected_data
            WHERE link_id = ?
            GROUP BY data_type
        `, [linkId]);
        
        return stats;
    }

    async deleteOldData(days = 30) {
        const result = await database.query(
            'DELETE FROM collected_data WHERE collected_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
            [days]
        );
        
        return result.affectedRows;
    }

    async deleteByLinkId(linkId) {
        const result = await database.query(
            'DELETE FROM collected_data WHERE link_id = ?',
            [linkId]
        );
        
        return result.affectedRows;
    }

    async exportData(userId, format = 'json') {
        const data = await database.query(`
            SELECT 
                cd.*,
                l.link_type,
                l.created_at as link_created
            FROM collected_data cd
            JOIN links l ON cd.link_id = l.link_id
            WHERE l.user_id = ?
            ORDER BY cd.collected_at DESC
        `, [userId]);
        
        if (format === 'json') {
            return JSON.stringify(data, null, 2);
        } else if (format === 'csv') {
            // Convert to CSV
            const headers = ['ID', 'Link ID', 'Type', 'Content', 'IP', 'Collected At'];
            const rows = data.map(d => [
                d.id,
                d.link_id,
                d.data_type,
                JSON.stringify(d.data_content).substring(0, 100),
                d.ip_address,
                d.collected_at
            ]);
            
            return [headers, ...rows]
                .map(row => row.join(','))
                .join('\n');
        }
        
        return data;
    }
}

module.exports = new DataModel();