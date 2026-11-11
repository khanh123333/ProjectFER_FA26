const rateLimit = require('express-rate-limit');

// Rate limit chung cho API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 300, // tối đa 300 request / 15 phút
  message: {
    success: false,
    message: 'Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau ít phút.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limit nghiêm ngặt hơn cho Auth (chống brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // tối đa 20 lượt thử đăng nhập / 15 phút
  message: {
    success: false,
    message: 'Quá nhiều lần thử đăng nhập thất bại. Vui lòng thử lại sau 15 phút.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  apiLimiter,
  authLimiter
};
