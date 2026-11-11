const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { User } = require('../models');
const AppError = require('../utils/appError');

/**
 * Middleware xác thực Access Token (từ Header Bearer hoặc Cookie)
 */
const authenticate = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      // Nếu là request HTML browser thì chuyển hướng login nếu cần
      if (req.accepts('html') && !req.path.startsWith('/api/')) {
        return res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
      }
      return next(new AppError('Vui lòng đăng nhập để tiếp tục truy cập', 401));
    }

    // Verify token
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      if (req.accepts('html') && !req.path.startsWith('/api/')) {
        return res.redirect('/login');
      }
      return next(new AppError('Tài khoản không tồn tại hoặc đã bị vô hiệu hóa', 401));
    }

    req.user = user;
    res.locals.currentUser = user;
    next();
  } catch (error) {
    if (req.accepts('html') && !req.path.startsWith('/api/')) {
      return res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
    }
    return next(new AppError('Phiên đăng nhập không hợp lệ hoặc đã hết hạn', 401));
  }
};

/**
 * Middleware tùy chọn: nếu có token thì nạp user, không có thì bỏ qua
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user && user.isActive) {
        req.user = user;
        res.locals.currentUser = user;
      }
    }
  } catch (err) {
    // Bỏ qua lỗi token ở optionalAuth
  }
  next();
};

module.exports = {
  authenticate,
  optionalAuth
};
