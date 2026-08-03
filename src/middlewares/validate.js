/**
 * Validation middleware using express-validator
 * Runs the provided validation chains and returns formatted errors.
 */
const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');

/**
 * @param {import('express-validator').ValidationChain[]} validations
 * @returns {import('express').RequestHandler[]}
 */
const validate = (validations) => {
  return [
    ...validations,
    (req, res, next) => {
      const result = validationResult(req);

      if (result.isEmpty()) {
        return next();
      }

      const errors = result.array().map((err) => ({
        field: err.path || err.param || 'unknown',
        message: err.msg,
        value: err.value,
      }));

      return next(
        new ApiError(
          HTTP_STATUS.UNPROCESSABLE_ENTITY,
          ERROR_MESSAGES.VALIDATION_FAILED,
          errors
        )
      );
    },
  ];
};

module.exports = validate;
