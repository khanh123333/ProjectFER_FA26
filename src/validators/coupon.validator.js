const Joi = require('joi');

const couponSchema = Joi.object({
  code: Joi.string().trim().uppercase().required().messages({
    'string.empty': 'Mã giảm giá không được để trống'
  }),
  type: Joi.string().valid('percent', 'fixed').default('percent'),
  value: Joi.number().min(0).required().messages({
    'number.base': 'Giá trị giảm phải là số',
    'number.min': 'Giá trị giảm không âm'
  }),
  minOrder: Joi.number().min(0).default(0),
  maxDiscount: Joi.number().min(0).default(0),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  usageLimit: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true)
});

module.exports = {
  couponSchema
};
