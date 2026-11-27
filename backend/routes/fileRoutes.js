const express = require('express');
const router = express.Router();
const File = require('../models/file');
const Message = require('../models/message');
const Project = require('../models/project');
const User = require('../models/user');
const authenticate = require('../middleware/auth');
const validateId = require('../middleware/validateId');
const upload = require('../middleware/upload');
const { isAdmin } = require('../middleware/admin');
const { saveFile, removeFiles, openDownload } = require('../utils/fileStore');
const { emitMessage } = require('../utils/notify');

router.param('id', validateId);
router.param('projectId', validateId);
router.param('userId', validateId);

// Project files are for the team, chat files for the two people in the chat
const canAccessFile = async (file, userId) => {
  if (file.project) {
    const project = await Project.findById(file.project);
    if (project && project.isTeamMember(userId)) return true;
  } else if (file.uploadedBy?.toString() === userId || file.sharedWith?.toString() === userId) {
    return true;
  }
  return isAdmin(userId);
};

// Share a file with a project team (protected - project team only)
router.post('/project/:projectId', authenticate, upload, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.isTeamMember(req.userId)) {
      return res.status(403).json({ error: 'Only project members can share files' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const file = await saveFile(req.file, { uploadedBy: req.userId, project: project._id });
    await file.populate('uploadedBy', 'name');
    res.status(201).json(file);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List a project's files (protected - project team or admin)
router.get('/project/:projectId', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.isTeamMember(req.userId) && !(await isAdmin(req.userId))) {
      return res.status(403).json({ error: 'Only project members can view files' });
    }

    const files = await File.find({ project: project._id })
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'name');
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send a file in a chat, with an optional caption (protected)
router.post('/message/:userId', authenticate, upload, async (req, res) => {
  try {
    if (!(await User.exists({ _id: req.params.userId }))) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const file = await saveFile(req.file, { uploadedBy: req.userId, sharedWith: req.params.userId });

    const message = new Message({
      sender: req.userId,
      receiver: req.params.userId,
      content: req.body.content,
      attachment: file._id,
    });

    await message.save();
    await message.populate('attachment', 'filename contentType size');
    emitMessage(req, message);
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download a file (protected - see canAccessFile)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (!(await canAccessFile(file, req.userId))) {
      return res.status(403).json({ error: 'You do not have access to this file' });
    }

    // Always download, never render, so an uploaded page cannot run in the browser
    res.attachment(file.filename);
    res.set('Content-Type', 'application/octet-stream');
    res.set('X-Content-Type-Options', 'nosniff');

    openDownload(file._id)
      .on('error', () => res.destroy())
      .pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a project file (protected - uploader, project owner or admin)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (!file.project) {
      return res.status(400).json({ error: 'Files sent in a chat cannot be deleted' });
    }

    const project = await Project.findById(file.project);
    const allowed = file.uploadedBy?.toString() === req.userId
      || project?.createdBy.toString() === req.userId
      || (await isAdmin(req.userId));

    if (!allowed) {
      return res.status(403).json({ error: 'Only the uploader or project owner can delete this file' });
    }

    await removeFiles([file]);
    res.json({ message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
