const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/order_management',
  JWT_SECRET: process.env.JWT_SECRET || 'default_jwt_secret_change_me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
  REFRESH_SECRET: process.env.REFRESH_SECRET || 'default_refresh_secret_change_me',
  REFRESH_EXPIRES_IN: process.env.REFRESH_EXPIRES_IN || '7d',
  UPLOAD_DRIVER: process.env.UPLOAD_DRIVER || 'local',
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'public/uploads',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || ''
};
