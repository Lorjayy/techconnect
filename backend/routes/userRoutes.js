const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const authenticate = require('../middleware/auth');
const sendOTPEmail = require('../utils/sendEmail');
const Project = require('../models/project');
const validateId = require('../middleware/validateId');

router.param('id', validateId);

// Fields of a user that anyone can see
const PUBLIC_FIELDS = 'name bio skills skillsOffered skillsWanted createdAt';

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const validatePassword = (password) => {
  const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
  return pattern.test(password);
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Signup - create a new user, send OTP for verification
router.post('/', async (req, res) => {
  try {
    const { name, email, password, skills, bio } = req.body;

    if (!validatePassword(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    const details = { name, password: hashedPassword, skills, bio, otp, otpExpires };

    // An unverified account can be signed up again (e.g. the first code never arrived),
    // which replaces its details. Verified accounts still get the duplicate-email error.
    let user = typeof email === 'string' ? await User.findOne({ email, isVerified: false }) : null;
    const isNew = !user;
    if (user) {
      user.set(details);
    } else {
      user = new User({ email, isVerified: false, ...details });
    }

    await user.save();

    try {
      await sendOTPEmail(email, otp);
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr.message);
      // Don't leave behind an account that can never receive its code
      if (isNew) await user.deleteOne();
      return res.status(502).json({ error: 'We could not send the verification email. Please try again in a moment.' });
    }

    res.status(201).json({
      message: 'Signup successful. Please check your email for a verification code.',
      userId: user._id,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }
    res.status(400).json({ error: err.message });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body || {};

    if (typeof email !== 'string' || typeof otp !== 'string') {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Account already verified' });
    }

    // Dev-only bypass: when DEV_MASTER_OTP is set, that code verifies any account.
    // Leave it unset in production so only the real emailed code works.
    const masterOtp = process.env.DEV_MASTER_OTP;
    const usedMaster = masterOtp && otp === masterOtp;

    if (!usedMaster) {
      if (user.otp !== otp) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }

      if (user.otpExpires < new Date()) {
        return res.status(400).json({ error: 'Verification code has expired' });
      }
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.json({ message: 'Account verified successfully. You can now log in.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body || {};

    if (typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Account already verified' });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    try {
      await sendOTPEmail(email, otp);
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr.message);
      return res.status(502).json({ error: 'We could not send the verification email. Please try again in a moment.' });
    }

    res.json({ message: 'A new verification code has been sent to your email.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login - check credentials and verification status, return a token
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: 'Please verify your email before logging in', unverified: true });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ message: 'Login successful', token, userId: user._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users (protected - requires login)
router.get('/', authenticate, async (req, res) => {
  try {
    const users = await User.find().select(PUBLIC_FIELDS);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Browse users offering a specific skill (public)
router.get('/mentors/:skill', async (req, res) => {
  try {
    const skill = req.params.skill;
    const mentors = await User.find({
      skillsOffered: { $regex: new RegExp(escapeRegex(skill), 'i') },
    }).select(PUBLIC_FIELDS);
    res.json(mentors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users who have at least one skill offered (public)
router.get('/mentors', async (req, res) => {
  try {
    const mentors = await User.find({
      skillsOffered: { $exists: true, $ne: [] },
    }).select(PUBLIC_FIELDS);
    res.json(mentors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get my own profile (protected)
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password -otp -otpExpires');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update my own profile (protected)
router.put('/me', authenticate, async (req, res) => {
  try {
    const { name, skills, skillsOffered, skillsWanted, bio } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      { name, skills, skillsOffered, skillsWanted, bio },
      { new: true, runValidators: true }
    ).select('-password -otp -otpExpires');

    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// Public portfolio for a user (no email or password exposed)
router.get('/:id/portfolio', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      'name bio skills skillsOffered createdAt'
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const projects = await Project.find({
      $or: [{ createdBy: req.params.id }, { members: req.params.id }],
    }).populate('createdBy', 'name');

    res.json({ user, projects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;