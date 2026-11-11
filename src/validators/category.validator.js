const Joi = require('joi');

const categorySchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'string.empty': 'Tên danh mục không được để trống'
  }),
  description: Joi.string().allow('', null).optional(),
  type: Joi.string().valid('drink', 'food', 'other').default('drink'),
  image: Joi.string().allow('', null).optional(),
  sortOrder: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true)
});

module.exports = {
  categorySchema
};
