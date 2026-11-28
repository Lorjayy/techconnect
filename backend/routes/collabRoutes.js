const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const CollabRequest = require('../models/collabRequest');
const Project = require('../models/project');
const User = require('../models/user');
const authenticate = require('../middleware/auth');
const validateId = require('../middleware/validateId');
const { emitToUser } = require('../utils/notify');

router.param('id', validateId);

const populateRequest = (query) => query
  .populate('from', 'name headline')
  .populate('to', 'name headline')
  .populate('project', 'title');

// Send a collaboration request, optionally inviting them into one of my projects (protected)
router.post('/', authenticate, async (req, res) => {
  try {
    const { to, projectId, message } = req.body || {};

    if (!mongoose.isValidObjectId(to) || !(await User.exists({ _id: to, isVerified: true }))) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (to === req.userId) {
      return res.status(400).json({ error: 'You cannot send a request to yourself' });
    }

    let project = null;
    if (projectId) {
      if (!mongoose.isValidObjectId(projectId)) {
        return res.status(400).json({ error: 'Invalid project' });
      }
      project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      if (!project.isTeamMember(req.userId)) {
        return res.status(403).json({ error: 'You can only invite people to projects you are part of' });
      }
      if (project.isTeamMember(to)) {
        return res.status(400).json({ error: 'They are already on this project' });
      }
    }

    const duplicate = await CollabRequest.exists({
      from: req.userId,
      to,
      project: project?._id || null,
      status: 'pending',
    });
    if (duplicate) {
      return res.status(400).json({ error: 'You already have a pending request with them for this' });
    }

    const request = await CollabRequest.create({
      from: req.userId,
      to,
      project: project?._id || null,
      message: typeof message === 'string' ? message.trim() : '',
    });

    const populated = await populateRequest(CollabRequest.findById(request._id));
    emitToUser(req, to, 'collab:new', populated.toJSON());
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// My requests: pending ones sent to me, and everything I've sent recently (protected)
router.get('/', authenticate, async (req, res) => {
  try {
    const [incoming, outgoing] = await Promise.all([
      populateRequest(CollabRequest.find({ to: req.userId, status: 'pending' }).sort({ createdAt: -1 })),
      populateRequest(CollabRequest.find({ from: req.userId }).sort({ createdAt: -1 }).limit(50)),
    ]);
    res.json({ incoming, outgoing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Answer a request sent to me. Accepting a project invite adds me to that team.
const respond = (status) => async (req, res) => {
  try {
    const request = await CollabRequest.findById(req.params.id);
    if (!request || request.to.toString() !== req.userId) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: `This request was already ${request.status}` });
    }

    if (status === 'accepted' && request.project) {
      const project = await Project.findById(request.project);
      if (!project) {
        return res.status(400).json({ error: 'That project no longer exists' });
      }
      if (!project.isTeamMember(req.userId)) {
        project.members.push(req.userId);
        await project.save();
      }
    }

    request.status = status;
    await request.save();

    const populated = await populateRequest(CollabRequest.findById(request._id));
    emitToUser(req, request.from, 'collab:update', populated.toJSON());
    res.json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

router.post('/:id/accept', authenticate, respond('accepted'));
router.post('/:id/decline', authenticate, respond('declined'));

// Cancel a pending request I sent (protected)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const request = await CollabRequest.findById(req.params.id);
    if (!request || request.from.toString() !== req.userId) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending requests can be cancelled' });
    }

    await request.deleteOne();
    emitToUser(req, request.to, 'collab:update', { _id: request._id, status: 'cancelled' });
    res.json({ message: 'Request cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
