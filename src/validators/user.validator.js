const Joi = require('joi');
const ROLES = require('../constants/roles');

const createStaffSchema = Joi.object({
  fullName: Joi.string().trim().required().messages({
    'string.empty': 'Họ và tên không được để trống'
  }),
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.empty': 'Email không được để trống',
    'string.email': 'Email không hợp lệ'
  }),
  phone: Joi.string().pattern(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/).optional(),
  password: Joi.string().min(6).required().messages({
    'string.empty': 'Mật khẩu không được để trống',
    'string.min': 'Mật khẩu tối thiểu 6 ký tự'
  }),
  role: Joi.string().valid(ROLES.STAFF, ROLES.ADMIN).default(ROLES.STAFF),
  isActive: Joi.boolean().default(true)
});

const updateUserSchema = Joi.object({
  fullName: Joi.string().trim().optional(),
  phone: Joi.string().pattern(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/).allow('', null).optional(),
  role: Joi.string().valid(ROLES.CUSTOMER, ROLES.STAFF, ROLES.ADMIN).optional(),
  isActive: Joi.boolean().optional(),
  password: Joi.string().min(6).allow('', null).optional()
});

module.exports = {
  createStaffSchema,
  updateUserSchema
};
