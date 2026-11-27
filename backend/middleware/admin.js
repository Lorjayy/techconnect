const User = require('../models/user');

const isAdmin = async (userId) => {
  const user = await User.findById(userId).select('role');
  return user?.role === 'admin';
};

// Use after authenticate. The role is read from the database, not the token,
// so removing someone's admin role takes effect immediately.
async function requireAdmin(req, res, next) {
  try {
    if (!(await isAdmin(req.userId))) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { isAdmin, requireAdmin };
