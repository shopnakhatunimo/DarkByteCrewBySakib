const mongoose = require('mongoose');

const LinkSchema = new mongoose.Schema({
  linkId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['fb', 'camera', 'location', 'info', 'all', 'custom'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  targetUrl: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7*24*60*60*1000) // 7 days
  },
  visits: {
    type: Number,
    default: 0
  },
  uniqueVisits: {
    type: Number,
    default: 0
  },
  data: {
    type: Number,
    default: 0
  },
  visitors: [{
    ip: String,
    timestamp: Date,
    userAgent: String
  }],
  active: {
    type: Boolean,
    default: true
  }
});

// ভিজিট বাড়ানোর মেথড
LinkSchema.methods.addVisit = async function(ip, userAgent) {
  this.visits += 1;
  
  // ইউনিক ভিজিট চেক
  const existing = this.visitors.find(v => v.ip === ip);
  if (!existing) {
    this.uniqueVisits += 1;
    this.visitors.push({ ip, userAgent, timestamp: new Date() });
  }
  
  await this.save();
  return this;
};

module.exports = mongoose.model('Link', LinkSchema);