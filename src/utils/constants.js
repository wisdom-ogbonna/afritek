/**
 * Application-wide constants
 */

const ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user',
};

const ALLOWED_ROLES = Object.values(ROLES);

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized access. Please authenticate.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'Resource not found.',
  VALIDATION_FAILED: 'Validation failed.',
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again later.',
  USER_NOT_FOUND: 'User not found.',
  EMAIL_ALREADY_EXISTS: 'Email is already registered.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  ACCOUNT_DISABLED: 'Your account has been disabled.',
  EMAIL_NOT_VERIFIED: 'Email address is not verified.',
  TOKEN_EXPIRED: 'Token has expired. Please login again.',
  TOKEN_INVALID: 'Invalid or malformed token.',
  TOKEN_REVOKED: 'Token has been revoked. Please login again.',
  WEAK_PASSWORD: 'Password does not meet security requirements.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',
};

const SUCCESS_MESSAGES = {
  SIGNUP: 'Account created successfully. Please verify your email.',
  LOGIN: 'Login successful.',
  LOGOUT: 'Logged out successfully.',
  TOKEN_REFRESHED: 'Token refreshed successfully.',
  PASSWORD_RESET_SENT: 'Password reset email sent successfully.',
  PASSWORD_RESET: 'Password reset successfully.',
  EMAIL_VERIFICATION_SENT: 'Verification email sent successfully.',
  EMAIL_VERIFIED: 'Email verified successfully.',
  PASSWORD_CHANGED: 'Password changed successfully.',
  PROFILE_UPDATED: 'Profile updated successfully.',
  ACCOUNT_DELETED: 'Account deleted successfully.',
  USER_FETCHED: 'User profile fetched successfully.',
};

module.exports = {
  ROLES,
  ALLOWED_ROLES,
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
};
