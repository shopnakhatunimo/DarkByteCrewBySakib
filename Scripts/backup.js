const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
require('dotenv').config();

async function backup() {
    console.log('💾 Starting database backup...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '../backups');
    
    // Create backup directory if not exists
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        // Get all tables
        const [tables] = await connection.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);

        const backupData = {
            timestamp: new Date().toISOString(),
            database: process.env.DB_NAME,
            tables: {}
        };

        // Backup each table
        for (const tableName of tableNames) {
            console.log(`   📥 Backing up ${tableName}...`);
            const [rows] = await connection.query(`SELECT * FROM ${tableName}`);
            backupData.tables[tableName] = rows;
        }

        // Save as JSON
        const jsonFile = path.join(backupDir, `backup_${timestamp}.json`);
        fs.writeFileSync(jsonFile, JSON.stringify(backupData, null, 2));
        
        // Create zip archive
        const zipFile = path.join(backupDir, `backup_${timestamp}.zip`);
        const output = fs.createWriteStream(zipFile);
        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.pipe(output);
        archive.file(jsonFile, { name: 'database.json' });
        
        // Add .env file (without sensitive data)
        const envSample = `# Backup created at ${new Date().toISOString()}
DB_HOST=${process.env.DB_HOST}
DB_NAME=${process.env.DB_NAME}
# Note: Passwords and tokens are excluded for security`;
        
        archive.append(envSample, { name: 'README.txt' });
        
        await archive.finalize();

        // Cleanup JSON file
        fs.unlinkSync(jsonFile);

        console.log(`\n✅ Backup created successfully!`);
        console.log(`   📁 Location: ${zipFile}`);
        console.log(`   📊 Tables: ${tableNames.length}`);
        console.log(`   💿 Size: ${(fs.statSync(zipFile).size / 1024 / 1024).toFixed(2)} MB`);

        // Keep only last 5 backups
        const files = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('backup_') && f.endsWith('.zip'))
            .sort()
            .reverse();

        if (files.length > 5) {
            console.log(`\n🧹 Cleaning old backups...`);
            for (let i = 5; i < files.length; i++) {
                fs.unlinkSync(path.join(backupDir, files[i]));
                console.log(`   🗑️ Deleted: ${files[i]}`);
            }
        }

    } catch (error) {
        console.error('❌ Backup failed:', error.message);
    } finally {
        await connection.end();
    }
}

backup();