const multer = require('multer');

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const singleFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
}).single('file');

// Accepts one file in the "file" field and turns upload problems into a 400
function upload(req, res, next) {
  singleFile(req, res, (err) => {
    if (err) {
      const error = err.code === 'LIMIT_FILE_SIZE' ? 'File must be 10 MB or smaller' : err.message;
      return res.status(400).json({ error });
    }

    // Multer reads filenames as latin1, so names like "résumé.pdf" need converting
    if (req.file) {
      req.file.originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    }
    next();
  });
}

module.exports = upload;
