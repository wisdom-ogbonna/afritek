/**
 * Wraps async route handlers to automatically catch errors
 * and forward them to the global error handler.
 *
 * @param {Function} fn - Async Express route handler
 * @returns {Function} Express middleware
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;
