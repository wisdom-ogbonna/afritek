/**
 * Authentication Controller
 */
const authService = require('../services/auth.service');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const {
  HTTP_STATUS,
  SUCCESS_MESSAGES,
  ROLES,
} = require('../utils/constants');

/**
 * POST /api/v1/auth/signup
 */
const signup = asyncHandler(async (req, res) => {
  const { email, password, fullName, phone, role } = req.body;

  // Only admins can create accounts with elevated roles
  let assignedRole = ROLES.USER;
  if (role && role !== ROLES.USER) {
    if (!req.user || req.user.role !== ROLES.ADMIN) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        'Only administrators can assign elevated roles'
      );
    }
    assignedRole = role;
  }

  const result = await authService.signup({
    email,
    password,
    fullName,
    phone,
    role: assignedRole,
  });

  new ApiResponse(HTTP_STATUS.CREATED, SUCCESS_MESSAGES.SIGNUP, result).send(res);
});

/**
 * POST /api/v1/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login({ email, password });

  new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.LOGIN, result).send(res);
});

/**
 * POST /api/v1/auth/logout
 * Requires authentication
 */
const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.uid);

  new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.LOGOUT, null).send(res);
});

/**
 * POST /api/v1/auth/refresh-token
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const tokens = await authService.refreshToken(refreshToken);

  new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.TOKEN_REFRESHED, { tokens }).send(res);
});

/**
 * POST /api/v1/auth/forgot-password
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.forgotPassword(email);

  new ApiResponse(HTTP_STATUS.OK, result.message, {
    resetLink: result.resetLink,
  }).send(res);
});

/**
 * POST /api/v1/auth/reset-password
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { oobCode, newPassword } = req.body;
  const result = await authService.resetPassword({ oobCode, newPassword });

  new ApiResponse(HTTP_STATUS.OK, result.message, null).send(res);
});

/**
 * POST /api/v1/auth/send-email-verification
 * Requires authentication
 */
const sendEmailVerification = asyncHandler(async (req, res) => {
  const result = await authService.sendEmailVerification(
    req.user.uid,
    req.user.email
  );

  new ApiResponse(HTTP_STATUS.OK, result.message, {
    verificationLink: result.verificationLink,
  }).send(res);
});

/**
 * POST /api/v1/auth/verify-email
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { oobCode } = req.body;
  const result = await authService.verifyEmail(oobCode);

  new ApiResponse(HTTP_STATUS.OK, result.message, null).send(res);
});

/**
 * PATCH /api/v1/auth/change-password
 * Requires authentication
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const result = await authService.changePassword(
    req.user.uid,
    req.user.email,
    currentPassword,
    newPassword
  );

  new ApiResponse(HTTP_STATUS.OK, result.message, null).send(res);
});

/**
 * GET /api/v1/auth/me
 * Requires authentication
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.uid);

  new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.USER_FETCHED, { user }).send(res);
});

/**
 * PATCH /api/v1/auth/profile
 * Requires authentication
 * Users can update their own profile; admins can update anyone (via optional uid in body)
 */
const updateProfile = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === ROLES.ADMIN;
  let targetUid = req.user.uid;

  // Admin may specify another user's uid
  if (isAdmin && req.body.uid) {
    targetUid = req.body.uid;
  }

  // Non-admins cannot change role
  if (!isAdmin && req.body.role) {
    delete req.body.role;
  }

  const updated = await authService.updateProfile(targetUid, req.body, isAdmin);

  new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.PROFILE_UPDATED, {
    user: updated,
  }).send(res);
});

/**
 * DELETE /api/v1/auth/account
 * Requires authentication
 * Users can delete only their own account; admins can delete any (via query/body uid)
 */
const deleteAccount = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === ROLES.ADMIN;
  let targetUid = req.user.uid;

  if (isAdmin && (req.query.uid || req.body.uid)) {
    targetUid = req.query.uid || req.body.uid;
  }

  // Non-admin trying to delete someone else
  if (!isAdmin && targetUid !== req.user.uid) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'You can only delete your own account');
  }

  await authService.deleteAccount(targetUid);

  new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.ACCOUNT_DELETED, null).send(res);
});

module.exports = {
  signup,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  sendEmailVerification,
  verifyEmail,
  changePassword,
  getMe,
  updateProfile,
  deleteAccount,
};
