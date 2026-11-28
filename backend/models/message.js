const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Set for direct messages
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    required: function () {
      return !this.project;
    },
  },
  // Set for messages in a project's group chat
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null,
  },
  // Text is optional only when a file is attached
  content: {
    type: String,
    required: function () {
      return !this.attachment;
    },
  },
  attachment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    default: null,
  },
}, { timestamps: true });

messageSchema.index({ project: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
