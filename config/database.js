const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // ইনডেক্স তৈরি
    await createIndexes();
    
    return conn;
  } catch (error) {
    console.error(`❌ Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

const createIndexes = async () => {
  const User = require('../models/User');
  const Link = require('../models/Link');
  const Data = require('../models/Data');
  
  await User.collection.createIndex({ userId: 1 }, { unique: true });
  await Link.collection.createIndex({ linkId: 1 }, { unique: true });
  await Link.collection.createIndex({ userId: 1 });
  await Data.collection.createIndex({ linkId: 1 });
  await Data.collection.createIndex({ timestamp: 1 }, { expireAfterSeconds: 604800 }); // 7 days
};

module.exports = connectDB;