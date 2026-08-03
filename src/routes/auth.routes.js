/**
 * Authentication routes
 */
const express = require('express');
const authController = require('../controllers/auth.controller');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const {
  signupValidator,
  loginValidator,
  refreshTokenValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
  verifyEmailValidator,
  updateProfileValidator,
} = require('../validators/auth.validator');
const { ROLES } = require('../utils/constants');

const router = express.Router();

/**
 * @route   POST /api/v1/auth/signup
 * @desc    Register a new user
 * @access  Public (elevated roles require admin token)
 */
router.post('/signup', validate(signupValidator), authController.signup);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login with email & password
 * @access  Public
 */
router.post('/login', validate(loginValidator), authController.login);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout (revoke refresh tokens)
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh ID token
 * @access  Public
 */
router.post(
  '/refresh-token',
  validate(refreshTokenValidator),
  authController.refreshToken
);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset email / link
 * @access  Public
 */
router.post(
  '/forgot-password',
  validate(forgotPasswordValidator),
  authController.forgotPassword
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password using oobCode
 * @access  Public
 */
router.post(
  '/reset-password',
  validate(resetPasswordValidator),
  authController.resetPassword
);

/**
 * @route   POST /api/v1/auth/send-email-verification
 * @desc    Send email verification link
 * @access  Private
 */
router.post(
  '/send-email-verification',
  authenticate,
  authController.sendEmailVerification
);

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify email using oobCode
 * @access  Public
 */
router.post(
  '/verify-email',
  validate(verifyEmailValidator),
  authController.verifyEmail
);

/**
 * @route   PATCH /api/v1/auth/change-password
 * @desc    Change password (authenticated)
 * @access  Private
 */
router.patch(
  '/change-password',
  authenticate,
  validate(changePasswordValidator),
  authController.changePassword
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, authController.getMe);

/**
 * @route   PATCH /api/v1/auth/profile
 * @desc    Update profile (self or admin)
 * @access  Private
 */
router.patch(
  '/profile',
  authenticate,
  validate(updateProfileValidator),
  authController.updateProfile
);

/**
 * @route   DELETE /api/v1/auth/account
 * @desc    Delete account (self or admin)
 * @access  Private (admin can delete any user)
 */
router.delete(
  '/account',
  authenticate,
  // Non-admins can only delete themselves (enforced in controller)
  // Admins can delete anyone
  authController.deleteAccount
);

module.exports = router;
