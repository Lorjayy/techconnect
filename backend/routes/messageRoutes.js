const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Message = require('../models/message');
const User = require('../models/user');
const Project = require('../models/project');
const authenticate = require('../middleware/auth');
const validateId = require('../middleware/validateId');
const { isAdmin } = require('../middleware/admin');
const { emitMessage, emitGroupMessage } = require('../utils/notify');

router.param('userId', validateId);
router.param('projectId', validateId);

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
      project: null,
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

// Group chats: one per project, for the owner and members.
// List the group chats I'm in, most recently active first (protected)
router.get('/groups', authenticate, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ createdBy: req.userId }, { members: req.userId }],
    }).select('title createdBy members');

    const groups = await Promise.all(projects.map(async (project) => {
      const last = await Message.findOne({ project: project._id })
        .sort({ createdAt: -1 })
        .populate('sender', 'name');
      return {
        _id: project._id,
        title: project.title,
        memberCount: project.members.length + 1,
        lastMessage: last ? `${last.sender?.name || 'Someone'}: ${last.content || 'Sent a file'}` : '',
        lastMessageAt: last?.createdAt || null,
      };
    }));

    groups.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// A project's group chat history (protected - team or admin)
router.get('/project/:projectId', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.isTeamMember(req.userId) && !(await isAdmin(req.userId))) {
      return res.status(403).json({ error: 'Only project members can read the group chat' });
    }

    const messages = await Message.find({ project: project._id })
      .sort({ createdAt: 1 })
      .populate('sender', 'name')
      .populate('attachment', 'filename contentType size');

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Post to a project's group chat (protected - team only)
router.post('/project/:projectId', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.isTeamMember(req.userId)) {
      return res.status(403).json({ error: 'Only project members can post in the group chat' });
    }

    const message = new Message({
      sender: req.userId,
      project: project._id,
      content: req.body?.content,
    });

    await message.save();
    await message.populate('sender', 'name');
    emitGroupMessage(req, project, message);
    res.status(201).json(message);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
