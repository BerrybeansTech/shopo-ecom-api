const multer = require('multer');
const path = require('path');

const uploadFolder = path.resolve(__dirname, '../../rabbit-and-finch-uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolder ); 
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); 
  }
});

const upload = multer({
  storage,
  limits: { files: 10 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']; 
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('File type is not supported'));
    }
    cb(null, true);
  }
});

module.exports = upload 