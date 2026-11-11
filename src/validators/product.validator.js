const Joi = require('joi');

const optionChoiceSchema = Joi.object({
  label: Joi.string().trim().required(),
  extraPrice: Joi.number().min(0).default(0)
});

const productOptionSchema = Joi.object({
  name: Joi.string().trim().required(),
  isRequired: Joi.boolean().default(false),
  isMultiple: Joi.boolean().default(false),
  choices: Joi.array().items(optionChoiceSchema).default([])
});

const productSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'string.empty': 'Tên món không được để trống'
  }),
  category: Joi.string().hex().length(24).required().messages({
    'string.empty': 'Danh mục là bắt buộc'
  }),
  description: Joi.string().allow('', null).optional(),
  price: Joi.number().min(0).required().messages({
    'number.base': 'Giá món phải là số',
    'number.min': 'Giá món không thể nhỏ hơn 0'
  }),
  images: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string().allow('', null)).optional(),
  options: Joi.alternatives().try(Joi.array().items(productOptionSchema), Joi.string().allow('', null)).optional(),
  isAvailable: Joi.boolean().default(true),
  isActive: Joi.boolean().default(true),
  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string().allow('', null)
  ).optional()
});

module.exports = {
  productSchema
};
