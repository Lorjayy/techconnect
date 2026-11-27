const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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

module.exports = mongoose.model('Message', messageSchema);
