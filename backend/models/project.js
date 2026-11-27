const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  skillsNeeded: {
    type: [String],
    default: [],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'completed'],
    default: 'open',
  },
  members: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: [],
  },
}, { timestamps: true });

// True for the project owner and its members
projectSchema.methods.isTeamMember = function (userId) {
  return this.createdBy.toString() === userId
    || this.members.some((m) => m.toString() === userId);
};

module.exports = mongoose.model('Project', projectSchema);