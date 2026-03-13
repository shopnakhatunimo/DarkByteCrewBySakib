const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true
  },
  userId: {
    type: Number,
    default: null
  },
  username: {
    type: String,
    default: ''
  },
  action: {
    type: String,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

LogSchema.index({ type: 1, timestamp: -1 });
LogSchema.index({ userId: 1, timestamp: -1 });
LogSchema.index({ timestamp: 1 });

module.exports = mongoose.model('Log', LogSchema);
