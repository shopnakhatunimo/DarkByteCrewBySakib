const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

module.exports = {
    pool,
    
    async query(sql, params) {
        try {
            const [results] = await pool.execute(sql, params);
            return results;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    },
    
    async getConnection() {
        try {
            const connection = await pool.getConnection();
            console.log('Database connection established');
            return connection;
        } catch (error) {
            console.error('Error getting connection:', error);
            throw error;
        }
    },
    
    async end() {
        await pool.end();
        console.log('Database pool closed');
    },
    
    async transaction(callback) {
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            const result = await callback(connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
};