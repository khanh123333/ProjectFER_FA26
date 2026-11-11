const Joi = require('joi');
const { TABLE_LOCATION } = require('../constants/reservationStatus');

const createReservationSchema = Joi.object({
  customerName: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Họ tên khách hàng không được để trống',
    'string.min': 'Họ tên phải có ít nhất 2 ký tự'
  }),
  phone: Joi.string().trim().pattern(/^(0|\+84)[0-9]{9,10}$/).required().messages({
    'string.empty': 'Số điện thoại không được để trống',
    'string.pattern.base': 'Số điện thoại không hợp lệ (Ví dụ: 0901234567)'
  }),
  email: Joi.string().trim().email().allow('').optional().messages({
    'string.email': 'Email không đúng định dạng'
  }),
  adultCount: Joi.number().integer().min(1).max(100).required().messages({
    'number.base': 'Số người lớn phải là một số',
    'number.min': 'Số lượng người lớn tối thiểu là 1'
  }),
  childrenCount: Joi.number().integer().min(0).max(50).default(0).messages({
    'number.min': 'Số lượng trẻ em không thể âm'
  }),
  reservationDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
    'string.empty': 'Ngày đặt bàn là bắt buộc',
    'string.pattern.base': 'Ngày đặt bàn không đúng định dạng (YYYY-MM-DD)'
  }),
  reservationTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required().messages({
    'string.empty': 'Giờ đến là bắt buộc',
    'string.pattern.base': 'Giờ đến không đúng định dạng (HH:mm)'
  }),
  locationPreference: Joi.string().valid(...Object.values(TABLE_LOCATION)).default(TABLE_LOCATION.ANY),
  notes: Joi.string().trim().max(500).allow('').optional()
});

const cancelReservationSchema = Joi.object({
  reason: Joi.string().trim().min(2).max(300).required().messages({
    'string.empty': 'Vui lòng cung cấp lý do hủy đặt bàn'
  })
});

const assignTableSchema = Joi.object({
  tableId: Joi.string().hex().length(24).required().messages({
    'string.empty': 'Vui lòng chọn bàn muốn gán'
  })
});

const depositPaidSchema = Joi.object({
  transactionRef: Joi.string().trim().allow('').optional()
});

module.exports = {
  createReservationSchema,
  cancelReservationSchema,
  assignTableSchema,
  depositPaidSchema
};

