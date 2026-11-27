const mongoose = require('mongoose');
const File = require('../models/file');

const getBucket = () => {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'sharedFiles' });
};

// Store an uploaded file from multer, plus the details of who it is shared with
const saveFile = async (upload, details) => {
  const file = new File({
    filename: upload.originalname,
    contentType: upload.mimetype,
    size: upload.size,
    ...details,
  });

  await new Promise((resolve, reject) => {
    getBucket()
      .openUploadStreamWithId(file._id, file.filename)
      .on('finish', resolve)
      .on('error', reject)
      .end(upload.buffer);
  });

  await file.save();
  return file;
};

const openDownload = (fileId) => getBucket().openDownloadStream(fileId);

const removeFiles = async (files) => {
  for (const file of files) {
    try {
      await getBucket().delete(file._id);
    } catch (err) {
      // Contents already gone: still remove the record below
      if (!err.message.includes('File not found')) throw err;
    }
  }
  await File.deleteMany({ _id: { $in: files.map((file) => file._id) } });
};

module.exports = { saveFile, openDownload, removeFiles };
