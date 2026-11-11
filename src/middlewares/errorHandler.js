const ApiResponse = require('../utils/apiResponse');

/**
 * Middleware xử lý lỗi tập trung
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Lỗi máy chủ nội bộ';
  let errors = err.errors || null;

  // Xử lý lỗi Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `Giá trị của trường '${field}' đã tồn tại trong hệ thống.`;
  }

  // Xử lý lỗi Mongoose Validation
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Dữ liệu không hợp lệ';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message
    }));
  }

  // Xử lý lỗi CastError (sai định dạng ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Định dạng ID '${err.value}' không hợp lệ`;
  }

  // Lỗi JsonWebToken
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token xác thực không hợp lệ';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token xác thực đã hết hạn';
  }

  // Nếu là API request hoặc client gửi header json
  if (req.originalUrl.startsWith('/api/') || req.xhr || !req.accepts('html')) {
    return ApiResponse.error(res, message, statusCode, errors);
  }

  // Nếu là browser page request
  res.status(statusCode).render('error', {
    title: `Lỗi ${statusCode}`,
    message,
    statusCode,
    currentUser: req.user || null
  });
};

module.exports = errorHandler;
