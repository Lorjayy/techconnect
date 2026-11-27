const express = require('express');
const router = express.Router();
const Project = require('../models/project');
const authenticate = require('../middleware/auth');
const validateId = require('../middleware/validateId');
const { isAdmin } = require('../middleware/admin');
const { deleteProjectData } = require('../utils/cleanup');

router.param('id', validateId);

// Only the project owner or an admin can edit or delete a project
const canManageProject = async (project, userId) => {
  return project.createdBy.toString() === userId || (await isAdmin(userId));
};

// Create a new project (protected - must be logged in)
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, skillsNeeded } = req.body;

    const project = new Project({
      title,
      description,
      skillsNeeded,
      createdBy: req.userId,
    });

    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
// Get a single project by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('members', 'name');

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Get all projects (public - anyone can browse)
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('createdBy', 'name')
      .populate('members', 'name');
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit a project (protected - owner or admin)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!(await canManageProject(project, req.userId))) {
      return res.status(403).json({ error: 'Only the project owner can edit this project' });
    }

    const { title, description, skillsNeeded, status } = req.body;
    if (title !== undefined) project.title = title;
    if (description !== undefined) project.description = description;
    if (skillsNeeded !== undefined) project.skillsNeeded = skillsNeeded;
    if (status !== undefined) project.status = status;

    await project.save();

    const updatedProject = await Project.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('members', 'name');

    res.json(updatedProject);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a project and its tasks and files (protected - owner or admin)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!(await canManageProject(project, req.userId))) {
      return res.status(403).json({ error: 'Only the project owner can delete this project' });
    }

    await deleteProjectData(project._id);
    await project.deleteOne();

    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Join a project (protected)
router.post('/:id/join', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.members.includes(req.userId)) {
      return res.status(400).json({ error: 'Already joined this project' });
    }

    project.members.push(req.userId);
    await project.save();

    const updatedProject = await Project.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('members', 'name');

    res.json(updatedProject);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Leave a project (protected - members only, the owner cannot leave)
router.post('/:id/leave', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.createdBy.toString() === req.userId) {
      return res.status(400).json({ error: 'The owner cannot leave their own project' });
    }

    if (!project.members.includes(req.userId)) {
      return res.status(400).json({ error: 'You are not a member of this project' });
    }

    project.members.pull(req.userId);
    await project.save();

    const updatedProject = await Project.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('members', 'name');

    res.json(updatedProject);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
