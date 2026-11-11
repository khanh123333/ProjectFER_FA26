const AppError = require('../utils/appError');

/**
 * Middleware xác thực schema Joi cho body, query, params
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/['"]/g, '')
      }));

      return next(new AppError('Dữ liệu không hợp lệ', 400, errorDetails));
    }

    req[property] = value;
    next();
  };
};

module.exports = validate;
