const multer = require('multer');
const path = require('path');

const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.docx'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsPath = process.env.UPLOADS_PATH || 'uploads';
    cb(null, uploadsPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `${uniqueSuffix}${path.extname(file.originalname)}`;
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limit file size to 10MB
  fileFilter,
});

module.exports = upload;
