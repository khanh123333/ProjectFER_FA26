const AppError = require('../utils/appError');

/**
 * Middleware phân quyền theo vai trò
 * @param  {...string} roles - Các vai trò được phép truy cập
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Chưa xác thực người dùng', 401));
    }

    if (!roles.includes(req.user.role)) {
      if (req.accepts('html') && !req.path.startsWith('/api/')) {
        return res.status(403).render('error', {
          title: 'Không có quyền truy cập',
          message: 'Bạn không có quyền thực hiện thao tác hoặc truy cập trang này.'
        });
      }
      return next(new AppError('Bạn không có quyền truy cập chức năng này', 403));
    }

    next();
  };
};

module.exports = authorize;
