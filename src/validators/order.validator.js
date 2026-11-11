const Joi = require('joi');
const { ORDER_STATUS, PAYMENT_METHODS } = require('../constants/orderStatus');

const selectedOptionSchema = Joi.object({
  optionName: Joi.string().required(),
  choiceLabel: Joi.string().required(),
  extraPrice: Joi.number().min(0).default(0)
});

const orderItemInputSchema = Joi.object({
  product: Joi.string().hex().length(24).required().messages({
    'string.empty': 'Mã món không được để trống'
  }),
  quantity: Joi.number().integer().min(1).default(1),
  selectedOptions: Joi.array().items(selectedOptionSchema).default([]),
  note: Joi.string().allow('', null).optional()
});

const createOrderSchema = Joi.object({
  tableNumber: Joi.string().trim().required().messages({
    'string.empty': 'Số bàn là bắt buộc'
  }),
  customerName: Joi.string().allow('', null).optional(),
  customerPhone: Joi.string().allow('', null).optional(),
  note: Joi.string().allow('', null).optional(),
  couponCode: Joi.string().allow('', null).optional(),
  items: Joi.array().items(orderItemInputSchema).min(1).required().messages({
    'array.min': 'Đơn hàng phải có ít nhất 1 món'
  })
});

const addMoreItemsSchema = Joi.object({
  items: Joi.array().items(orderItemInputSchema).min(1).required().messages({
    'array.min': 'Vui lòng chọn ít nhất 1 món để gọi thêm'
  })
});

const updateOrderStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(ORDER_STATUS)).required().messages({
    'any.only': 'Trạng thái đơn hàng không hợp lệ'
  }),
  reason: Joi.string().allow('', null).optional()
});

const updateOrderItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1).optional(),
  note: Joi.string().allow('', null).optional(),
  selectedOptions: Joi.array().items(selectedOptionSchema).optional()
});

const paymentSchema = Joi.object({
  paymentMethod: Joi.string().valid(...Object.values(PAYMENT_METHODS)).required(),
  couponCode: Joi.string().allow('', null).optional(),
  note: Joi.string().allow('', null).optional()
});

module.exports = {
  createOrderSchema,
  addMoreItemsSchema,
  updateOrderStatusSchema,
  updateOrderItemSchema,
  paymentSchema
};
