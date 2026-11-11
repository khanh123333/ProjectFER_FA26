const Joi = require('joi');

const registerSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Họ và tên không được để trống',
    'string.min': 'Họ và tên tối thiểu 2 ký tự'
  }),
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.empty': 'Email không được để trống',
    'string.email': 'Email không hợp lệ'
  }),
  phone: Joi.string().pattern(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/).optional().messages({
    'string.pattern.base': 'Số điện thoại không đúng định dạng Việt Nam'
  }),
  password: Joi.string().min(6).max(50).required().messages({
    'string.empty': 'Mật khẩu không được để trống',
    'string.min': 'Mật khẩu phải có ít nhất 6 ký tự'
  })
});

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.empty': 'Email không được để trống',
    'string.email': 'Email không hợp lệ'
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Mật khẩu không được để trống'
  })
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'string.empty': 'Mật khẩu hiện tại không được để trống'
  }),
  newPassword: Joi.string().min(6).max(50).required().messages({
    'string.empty': 'Mật khẩu mới không được để trống',
    'string.min': 'Mật khẩu mới phải có ít nhất 6 ký tự'
  })
});

module.exports = {
  registerSchema,
  loginSchema,
  changePasswordSchema
};
