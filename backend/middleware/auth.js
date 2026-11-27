const jwt = require('jsonwebtoken');
const User = require('../models/user');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // A deleted account's token must stop working straight away
  try {
    if (!(await User.exists({ _id: req.userId }))) {
      return res.status(401).json({ error: 'Account no longer exists' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  next();
}

module.exports = authenticate;