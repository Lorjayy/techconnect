const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Message = require('../models/message');
const User = require('../models/user');
const authenticate = require('../middleware/auth');
const validateId = require('../middleware/validateId');
const { emitMessage } = require('../utils/notify');

router.param('userId', validateId);

// Send a message (protected)
router.post('/', authenticate, async (req, res) => {
  try {
    const { receiverId, content } = req.body;

    if (!mongoose.isValidObjectId(receiverId) || !(await User.exists({ _id: receiverId }))) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const message = new Message({
      sender: req.userId,
      receiver: receiverId,
      content,
    });

    await message.save();
    emitMessage(req, message);
    res.status(201).json(message);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get conversation between logged-in user and another user (protected)
router.get('/conversation/:userId', authenticate, async (req, res) => {
  try {
    const otherUserId = req.params.userId;

    const messages = await Message.find({
      $or: [
        { sender: req.userId, receiver: otherUserId },
        { sender: otherUserId, receiver: req.userId },
      ],
    }).sort({ createdAt: 1 }).populate('attachment', 'filename contentType size');

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get list of people the logged-in user has messaged with, latest first (protected)
router.get('/contacts', authenticate, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ sender: req.userId }, { receiver: req.userId }],
    }).sort({ createdAt: -1 }).populate('sender', 'name').populate('receiver', 'name');

    const contactsMap = new Map();
    messages.forEach((msg) => {
      const isMine = msg.sender?._id.toString() === req.userId;
      const other = isMine ? msg.receiver : msg.sender;

      // Skip messages whose other person no longer exists
      if (!other || contactsMap.has(other._id.toString())) return;

      contactsMap.set(other._id.toString(), {
        _id: other._id,
        name: other.name,
        lastMessage: msg.content || 'Sent a file',
        lastMessageAt: msg.createdAt,
      });
    });

    res.json([...contactsMap.values()]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
