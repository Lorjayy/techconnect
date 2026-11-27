const mongoose = require('mongoose');

// Use with router.param so a malformed ID gets a 400 instead of a database error
function validateId(req, res, next, value) {
  if (!mongoose.isValidObjectId(value)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }
  next();
}

module.exports = validateId;
