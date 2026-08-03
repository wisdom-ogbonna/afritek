/**
 * Custom API Error class for consistent error handling
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {Array} errors - Optional array of validation or detailed errors
   * @param {boolean} isOperational - Whether the error is operational (expected)
   * @param {string} stack - Optional stack trace
   */
  constructor(
    statusCode,
    message = 'Something went wrong',
    errors = [],
    isOperational = true,
    stack = ''
  ) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors;
    this.isOperational = isOperational;
    this.success = false;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = ApiError;
