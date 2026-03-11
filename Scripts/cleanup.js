const mysql = require('mysql2/promise');
require('dotenv').config();

async function cleanup() {
    console.log('🧹 Starting database cleanup...');
    
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        // Delete expired links
        const [expiredLinks] = await connection.query(
            'UPDATE links SET is_active = FALSE WHERE expires_at < NOW() AND is_active = TRUE'
        );
        console.log(`   ✅ Deactivated ${expiredLinks.affectedRows} expired links`);

        // Delete old visitors (older than 30 days)
        const [oldVisitors] = await connection.query(
            'DELETE FROM visitors WHERE visited_at < DATE_SUB(NOW(), INTERVAL 30 DAY)'
        );
        console.log(`   ✅ Deleted ${oldVisitors.affectedRows} old visitor records`);

        // Delete old collected data (older than 90 days)
        const [oldData] = await connection.query(
            'DELETE FROM collected_data WHERE collected_at < DATE_SUB(NOW(), INTERVAL 90 DAY)'
        );
        console.log(`   ✅ Deleted ${oldData.affectedRows} old data records`);

        // Delete old logs (older than 60 days)
        const [oldLogs] = await connection.query(
            'DELETE FROM activity_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 60 DAY)'
        );
        console.log(`   ✅ Deleted ${oldLogs.affectedRows} old log entries`);

        // Reset warning counts for users with no recent activity
        const [resetWarnings] = await connection.query(
            `UPDATE users SET warning_count = 0 
             WHERE warning_count > 0 
             AND last_active < DATE_SUB(NOW(), INTERVAL 7 DAY)`
        );
        console.log(`   ✅ Reset warnings for ${resetWarnings.affectedRows} inactive users`);

        // Get database size
        const [dbSize] = await connection.query(`
            SELECT 
                SUM(data_length + index_length) as size_bytes
            FROM information_schema.tables 
            WHERE table_schema = ?
        `, [process.env.DB_NAME]);

        const sizeMB = (dbSize[0].size_bytes / 1024 / 1024).toFixed(2);
        console.log(`\n📊 Database size: ${sizeMB} MB`);

        // Get table stats
        const [stats] = await connection.query(`
            SELECT 
                table_name,
                table_rows,
                ROUND((data_length + index_length) / 1024 / 1024, 2) as size_mb
            FROM information_schema.tables 
            WHERE table_schema = ?
            ORDER BY size_mb DESC
        `, [process.env.DB_NAME]);

        console.log('\n📋 Table statistics:');
        stats.forEach(table => {
            console.log(`   ${table.table_name}: ${table.table_rows} rows, ${table.size_mb} MB`);
        });

        console.log('\n✅ Cleanup completed successfully!');

    } catch (error) {
        console.error('❌ Cleanup failed:', error.message);
    } finally {
        await connection.end();
    }
}

cleanup();