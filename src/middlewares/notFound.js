/**
 * 404 Not Found middleware
 */
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');

const notFound = (req, res, next) => {
  next(
    new ApiError(
      HTTP_STATUS.NOT_FOUND,
      `Route ${req.method} ${req.originalUrl} not found.`
    )
  );
};

module.exports = notFound;
