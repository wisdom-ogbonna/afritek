/**
 * Authentication & profile validation rules using express-validator
 */
const { body, param } = require('express-validator');
const { ALLOWED_ROLES, ROLES } = require('../utils/constants');

const passwordRules = body('password')
  .isString()
  .withMessage('Password must be a string')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters long')
  .matches(/[a-z]/)
  .withMessage('Password must contain at least one lowercase letter')
  .matches(/[A-Z]/)
  .withMessage('Password must contain at least one uppercase letter')
  .matches(/[0-9]/)
  .withMessage('Password must contain at least one number')
  .matches(/[!@#$%^&*(),.?":{}|<>]/)
  .withMessage('Password must contain at least one special character');

const signupValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s.'-]+$/)
    .withMessage('Full name contains invalid characters'),
  passwordRules,
  body('phone')
    .optional({ nullable: true })
    .trim()
    .matches(/^\+?[1-9]\d{7,14}$/)
    .withMessage('Please provide a valid phone number in E.164 format'),
  body('role')
    .optional()
    .isIn(ALLOWED_ROLES)
    .withMessage(`Role must be one of: ${ALLOWED_ROLES.join(', ')}`),
];

const loginValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isString()
    .withMessage('Password must be a string'),
];

const refreshTokenValidator = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
    .isString()
    .withMessage('Refresh token must be a string'),
];

const forgotPasswordValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
];

const resetPasswordValidator = [
  body('oobCode')
    .notEmpty()
    .withMessage('Reset code (oobCode) is required')
    .isString()
    .withMessage('Reset code must be a string'),
  body('newPassword')
    .isString()
    .withMessage('New password must be a string')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/[a-z]/)
    .withMessage('New password must contain at least one lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('New password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('New password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('New password must contain at least one special character'),
];

const changePasswordValidator = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required')
    .isString()
    .withMessage('Current password must be a string'),
  body('newPassword')
    .isString()
    .withMessage('New password must be a string')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/[a-z]/)
    .withMessage('New password must contain at least one lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('New password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('New password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('New password must contain at least one special character')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),
];

const verifyEmailValidator = [
  body('oobCode')
    .notEmpty()
    .withMessage('Verification code (oobCode) is required')
    .isString()
    .withMessage('Verification code must be a string'),
];

const updateProfileValidator = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s.'-]+$/)
    .withMessage('Full name contains invalid characters'),
  body('phone')
    .optional({ nullable: true })
    .trim()
    .matches(/^\+?[1-9]\d{7,14}$/)
    .withMessage('Please provide a valid phone number in E.164 format'),
  body('profileImage')
    .optional({ nullable: true })
    .isURL()
    .withMessage('Profile image must be a valid URL'),
  body('role')
    .optional()
    .isIn(ALLOWED_ROLES)
    .withMessage(`Role must be one of: ${ALLOWED_ROLES.join(', ')}`),
];

const sendEmailVerificationValidator = [
  // No body required – uses authenticated user
];

module.exports = {
  signupValidator,
  loginValidator,
  refreshTokenValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
  verifyEmailValidator,
  updateProfileValidator,
  sendEmailVerificationValidator,
};
