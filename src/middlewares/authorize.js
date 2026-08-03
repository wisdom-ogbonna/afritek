/**
 * Role-Based Access Control (RBAC) middleware
 * Usage: authorize('admin') or authorize('admin', 'moderator')
 */
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS, ERROR_MESSAGES, ROLES } = require('../utils/constants');

/**
 * Authorize based on user roles
 * Must be used AFTER authenticate middleware
 *
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 * @returns {import('express').RequestHandler}
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(
        new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.UNAUTHORIZED)
      );
    }

    const userRole = req.user.role.toLowerCase();

    // Admin has access to everything
    if (userRole === ROLES.ADMIN) {
      return next();
    }

    const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());

    if (!normalizedAllowed.includes(userRole)) {
      return next(
        new ApiError(
          HTTP_STATUS.FORBIDDEN,
          ERROR_MESSAGES.FORBIDDEN
        )
      );
    }

    next();
  };
};

/**
 * Ensure the authenticated user can only access/modify their own resource
 * unless they are an admin.
 * Compares req.user.uid with req.params.uid or req.params.userId
 */
const authorizeSelfOrAdmin = (req, res, next) => {
  if (!req.user) {
    return next(
      new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.UNAUTHORIZED)
    );
  }

  if (req.user.role === ROLES.ADMIN) {
    return next();
  }

  const targetUid = req.params.uid || req.params.userId || req.body.uid;

  if (targetUid && targetUid !== req.user.uid) {
    return next(
      new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN)
    );
  }

  next();
};

module.exports = {
  authorize,
  authorizeSelfOrAdmin,
};
