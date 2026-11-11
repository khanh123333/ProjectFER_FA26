const multer = require('multer');
const path = require('path');
const fs = require('fs');
const env = require('../config/env');
const AppError = require('../utils/appError');

// Đảm bảo thư mục lưu trữ tồn tại
const uploadDir = path.resolve(env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình lưu trữ cục bộ
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// Bộ lọc file ảnh
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Chỉ hỗ trợ tải lên file định dạng hình ảnh (JPEG, PNG, WEBP, GIF, AVIF)', 400), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE
  },
  fileFilter
});

module.exports = upload;
