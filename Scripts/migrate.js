const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function migrate() {
    console.log('🚀 Starting database migration...');
    
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    try {
        // Read SQL file
        const sqlFile = path.join(__dirname, '../database.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        // Execute SQL
        console.log('📦 Creating tables...');
        await connection.query(sql);
        
        console.log('✅ Migration completed successfully!');
        
        // Verify tables
        const [tables] = await connection.query('SHOW TABLES');
        console.log('\n📋 Created tables:');
        tables.forEach(table => {
            console.log(`   - ${Object.values(table)[0]}`);
        });

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        await connection.end();
    }
}

migrate();