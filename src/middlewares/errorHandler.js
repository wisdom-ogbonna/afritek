/**
 * Global error handling middleware
 */
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');

/**
 * Convert known Firebase / common errors into ApiError instances
 */
const normalizeError = (err) => {
  // Already an ApiError
  if (err instanceof ApiError) {
    return err;
  }

  // Firebase Auth errors
  if (err.code && typeof err.code === 'string') {
    switch (err.code) {
      case 'auth/email-already-exists':
      case 'auth/email-already-in-use':
        return new ApiError(HTTP_STATUS.CONFLICT, ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
      case 'auth/user-not-found':
        return new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND);
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
      case 'auth/invalid-login-credentials':
        return new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.INVALID_CREDENTIALS);
      case 'auth/user-disabled':
        return new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_MESSAGES.ACCOUNT_DISABLED);
      case 'auth/id-token-expired':
        return new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.TOKEN_EXPIRED);
      case 'auth/id-token-revoked':
        return new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.TOKEN_REVOKED);
      case 'auth/argument-error':
      case 'auth/invalid-id-token':
        return new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.TOKEN_INVALID);
      case 'auth/weak-password':
        return new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES.WEAK_PASSWORD);
      case 'auth/invalid-email':
        return new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid email address.');
      case 'auth/too-many-requests':
        return new ApiError(HTTP_STATUS.TOO_MANY_REQUESTS, ERROR_MESSAGES.RATE_LIMIT_EXCEEDED);
      default:
        if (err.code.startsWith('auth/')) {
          return new ApiError(HTTP_STATUS.BAD_REQUEST, err.message || ERROR_MESSAGES.INTERNAL_ERROR);
        }
    }
  }

  // express-validator style (should be caught earlier, but just in case)
  if (err.array && typeof err.array === 'function') {
    const errors = err.array().map((e) => ({
      field: e.path || e.param,
      message: e.msg,
    }));
    return new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, ERROR_MESSAGES.VALIDATION_FAILED, errors);
  }

  // Generic / unexpected
  return new ApiError(
    err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
    err.message || ERROR_MESSAGES.INTERNAL_ERROR,
    [],
    false
  );
};

/**
 * Global error handler middleware
 * Must be registered last.
 */
const errorHandler = (err, req, res, next) => {
  const error = normalizeError(err);

  // Log non-operational (unexpected) errors fully
  if (!error.isOperational) {
    logger.error('Unexpected error', {
      message: error.message,
      stack: err.stack,
      path: req.originalUrl,
      method: req.method,
    });
  } else {
    logger.warn('Operational error', {
      statusCode: error.statusCode,
      message: error.message,
      path: req.originalUrl,
      method: req.method,
    });
  }

  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const response = {
    success: false,
    message: error.message || ERROR_MESSAGES.INTERNAL_ERROR,
    errors: error.errors && error.errors.length > 0 ? error.errors : undefined,
  };

  // Include stack only in non-production
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    response.stack = err.stack;
  }

  // Remove undefined keys
  if (!response.errors) {
    delete response.errors;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
