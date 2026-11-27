const express = require('express');
const router = express.Router();
const Task = require('../models/task');
const Project = require('../models/project');
const authenticate = require('../middleware/auth');
const validateId = require('../middleware/validateId');
const { isAdmin } = require('../middleware/admin');

router.param('id', validateId);
router.param('projectId', validateId);

// Project members, the owner and admins can change a project's tasks
const canManageTask = async (task, userId) => {
  const project = await Project.findById(task.project);
  if (project && project.isTeamMember(userId)) return true;
  return isAdmin(userId);
};

// Create a task for a project (protected - must be a project member or owner)
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, projectId, assignedTo } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.isTeamMember(req.userId)) {
      return res.status(403).json({ error: 'Only project members can add tasks' });
    }

    const task = new Task({
      title,
      project: projectId,
      assignedTo: assignedTo || null,
      createdBy: req.userId,
    });

    await task.save();
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all tasks for a specific project
router.get('/project/:projectId', async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.projectId })
      .populate('assignedTo', 'name')
      .populate('createdBy', 'name');
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a task's title or status (protected - project team or admin)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (!(await canManageTask(task, req.userId))) {
      return res.status(403).json({ error: 'Only project members can change tasks' });
    }

    const { title, status } = req.body;
    if (title !== undefined) task.title = title;
    if (status !== undefined) task.status = status;

    await task.save();
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a task (protected - project team or admin)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (!(await canManageTask(task, req.userId))) {
      return res.status(403).json({ error: 'Only project members can delete tasks' });
    }

    await task.deleteOne();
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
