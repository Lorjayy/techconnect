const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  skills: {
    type: [String],
    default: [],
  },
  skillsOffered: {
    type: [String],
    default: [],
  },
  skillsWanted: {
    type: [String],
    default: [],
  },
  bio: {
    type: String,
    default: '',
    maxlength: 500,
  },
  // Short line under the name, e.g. "Full-stack student developer"
  headline: {
    type: String,
    default: '',
    maxlength: 80,
  },
  location: {
    type: String,
    default: '',
    maxlength: 60,
  },
  github: {
    type: String,
    default: '',
    match: [/^$|^https?:\/\//, 'GitHub link must start with http:// or https://'],
  },
  linkedin: {
    type: String,
    default: '',
    match: [/^$|^https?:\/\//, 'LinkedIn link must start with http:// or https://'],
  },
  website: {
    type: String,
    default: '',
    match: [/^$|^https?:\/\//, 'Website link must start with http:// or https://'],
  },
  // Shown on profiles and in search so people know who wants collaboration requests
  openToCollab: {
    type: Boolean,
    default: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: String,
    default: null,
  },
  otpExpires: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);