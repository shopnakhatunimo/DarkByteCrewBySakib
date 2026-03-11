require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const database = require('./src/utils/database');
const bot = require('./src/bot/bot');
const webRoutes = require('./src/web/routes/webRoutes');

const app = express();

// Session Store
const sessionStore = new MySQLStore({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Middleware
app.use(helmet({
    contentSecurityPolicy: false
}));
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'src/web/public')));

app.use(session({
    key: 'session_cookie_name',
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
}));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/web/views'));

// Routes
app.use('/', webRoutes);

// Database connection test
database.getConnection()
    .then(() => {
        console.log('✅ Database connected successfully');
        
        // Start bot after database connection
        bot.startBot();
        
        // Start server
        const PORT = process.env.WEB_PORT || 3000;
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`🤖 Bot is active and ready!`);
        });
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err);
        process.exit(1);
    });

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await database.end();
    process.exit(0);
});