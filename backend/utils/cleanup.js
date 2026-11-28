const File = require('../models/file');
const Message = require('../models/message');
const Project = require('../models/project');
const Task = require('../models/task');
const CollabRequest = require('../models/collabRequest');
const { removeFiles } = require('./fileStore');

// Remove what belongs to a project. The caller deletes the project itself.
const deleteProjectData = async (projectId) => {
  await Task.deleteMany({ project: projectId });
  await Message.deleteMany({ project: projectId });
  await CollabRequest.deleteMany({ project: projectId });
  await removeFiles(await File.find({ project: projectId }));
};

// Remove what belongs to a user. The caller deletes the user itself.
// Files and tasks they added to other people's projects stay with those teams.
const deleteUserData = async (userId) => {
  const ownedProjects = await Project.find({ createdBy: userId });
  for (const project of ownedProjects) {
    await deleteProjectData(project._id);
    await project.deleteOne();
  }

  await Project.updateMany({ members: userId }, { $pull: { members: userId } });
  await Task.updateMany({ assignedTo: userId }, { assignedTo: null });

  await Message.deleteMany({ $or: [{ sender: userId }, { receiver: userId }] });
  await CollabRequest.deleteMany({ $or: [{ from: userId }, { to: userId }] });
  await removeFiles(await File.find({
    project: null,
    $or: [{ uploadedBy: userId }, { sharedWith: userId }],
  }));
};

module.exports = { deleteProjectData, deleteUserData };
