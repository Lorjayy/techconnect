const mongoose = require('mongoose');

// A request from one user to another to work together,
// optionally inviting them into one of the sender's projects
const collabRequestSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null,
  },
  message: {
    type: String,
    default: '',
    maxlength: 500,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending',
  },
}, { timestamps: true });

module.exports = mongoose.model('CollabRequest', collabRequestSchema);
