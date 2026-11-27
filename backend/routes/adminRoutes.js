const express = require('express');
const router = express.Router();
const User = require('../models/user');
const authenticate = require('../middleware/auth');
const validateId = require('../middleware/validateId');
const { requireAdmin } = require('../middleware/admin');
const { deleteUserData } = require('../utils/cleanup');

router.param('id', validateId);

// Every route here needs a logged-in admin.
// Projects are managed through /api/projects, which also allows admins.
router.use(authenticate, requireAdmin);

// Get all users, including emails
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password -otp -otpExpires').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Make a user an admin, or remove their admin role
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;

    if (req.params.id === req.userId) {
      return res.status(400).json({ error: 'You cannot change your own role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.role = role;
    await user.save();

    res.json({ _id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a user and everything that belongs only to them
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.userId) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await deleteUserData(user._id);
    await user.deleteOne();

    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
