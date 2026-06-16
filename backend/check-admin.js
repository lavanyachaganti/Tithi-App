require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const uri = process.env.MONGODB_URI;

(async () => {
  try {
    if (!uri) throw new Error('Missing MONGODB_URI');
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const adminUsers = await User.find({ role: 'admin' }).select('name email role createdAt').lean();
    console.log('adminUsersCount=', adminUsers.length);
    console.log(JSON.stringify(adminUsers, null, 2));
    await mongoose.disconnect();
  } catch (err) {
    console.error('ERROR', err.message);
    process.exit(1);
  }
})();
