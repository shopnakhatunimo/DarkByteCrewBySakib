const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true,
    unique: true
  },
  username: {
    type: String,
    default: ''
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    default: ''
  },
  approved: {
    type: Boolean,
    default: false
  },
  banned: {
    type: Boolean,
    default: false
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  totalLinks: {
    type: Number,
    default: 0
  },
  totalVisits: {
    type: Number,
    default: 0
  },
  totalData: {
    type: Number,
    default: 0
  },
  settings: {
    notifications: {
      type: Boolean,
      default: true
    }
  }
});

// লাস্ট একটিভ আপডেট করার মেথড
UserSchema.methods.updateActivity = async function() {
  this.lastActive = new Date();
  await this.save();
};

module.exports = mongoose.model('User', UserSchema);