const Joi = require('joi');
const { TABLE_STATUS } = require('../constants/orderStatus');

const tableSchema = Joi.object({
  tableNumber: Joi.string().trim().required().messages({
    'string.empty': 'Số bàn không được để trống'
  }),
  capacity: Joi.number().integer().min(1).default(4),
  location: Joi.string().valid('window', 'outdoor', 'indoor').default('indoor'),
  status: Joi.string().valid(...Object.values(TABLE_STATUS)).default(TABLE_STATUS.EMPTY),
  isActive: Joi.boolean().default(true)
});

module.exports = {
  tableSchema
};
