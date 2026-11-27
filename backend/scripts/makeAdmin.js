// Gives an existing account the admin role: npm run make-admin -- someone@example.com
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const User = require('../models/user');

const run = async () => {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npm run make-admin -- someone@example.com');
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOneAndUpdate({ email }, { role: 'admin' }, { new: true, runValidators: true });

  if (user) {
    console.log(`${user.name} (${user.email}) is now an admin`);
  } else {
    console.error(`No account found for ${email}`);
    process.exitCode = 1;
  }

  await mongoose.disconnect();
};

run();
