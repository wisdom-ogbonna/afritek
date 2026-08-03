/**
 * Authentication Service
 * Handles all Firebase Auth + Firestore user operations
 */
const axios = require('axios');
const { getAuth, getFirestore, admin } = require('../config/firebase');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROLES,
} = require('../utils/constants');

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const IDENTITY_TOOLKIT_BASE =
  'https://identitytoolkit.googleapis.com/v1/accounts';
const SECURE_TOKEN_BASE = 'https://securetoken.googleapis.com/v1';

/**
 * Helper – call Firebase Identity Toolkit REST API
 */
const callFirebaseAuth = async (endpoint, data) => {
  if (!FIREBASE_API_KEY) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'FIREBASE_API_KEY is not configured'
    );
  }

  try {
    const url = `${IDENTITY_TOOLKIT_BASE}:${endpoint}?key=${FIREBASE_API_KEY}`;
    const response = await axios.post(url, data, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });
    return response.data;
  } catch (error) {
    const fbError = error.response?.data?.error;
    const message = fbError?.message || error.message;
    const code = fbError?.message; // Firebase returns message as code-like string

    logger.debug('Firebase Auth REST error', { message, code, status: error.response?.status });

    // Map common REST errors
    if (message === 'EMAIL_EXISTS') {
      throw new ApiError(HTTP_STATUS.CONFLICT, ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
    }
    if (message === 'EMAIL_NOT_FOUND' || message === 'INVALID_PASSWORD' || message === 'INVALID_LOGIN_CREDENTIALS') {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.INVALID_CREDENTIALS);
    }
    if (message === 'USER_DISABLED') {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_MESSAGES.ACCOUNT_DISABLED);
    }
    if (message === 'TOO_MANY_ATTEMPTS_TRY_LATER') {
      throw new ApiError(HTTP_STATUS.TOO_MANY_REQUESTS, ERROR_MESSAGES.RATE_LIMIT_EXCEEDED);
    }
    if (message === 'INVALID_OOB_CODE' || message === 'EXPIRED_OOB_CODE') {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid or expired code.');
    }
    if (message === 'WEAK_PASSWORD : Password should be at least 6 characters') {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES.WEAK_PASSWORD);
    }

    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      message || 'Authentication request failed'
    );
  }
};

/**
 * Create user document in Firestore
 */
const createUserDocument = async (uid, data) => {
  const db = getFirestore();
  const now = admin.firestore.FieldValue.serverTimestamp();

  const userData = {
    uid,
    fullName: data.fullName,
    email: data.email.toLowerCase(),
    phone: data.phone || null,
    role: data.role || ROLES.USER,
    profileImage: data.profileImage || null,
    isVerified: false,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    lastLogin: null,
  };

  await db.collection('users').doc(uid).set(userData);
  return userData;
};

/**
 * Get user document by UID
 */
const getUserByUid = async (uid) => {
  const db = getFirestore();
  const doc = await db.collection('users').doc(uid).get();

  if (!doc.exists) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND);
  }

  return doc.data();
};

/**
 * Update user document
 */
const updateUserDocument = async (uid, updates) => {
  const db = getFirestore();
  const payload = {
    ...updates,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('users').doc(uid).update(payload);
  return getUserByUid(uid);
};

/**
 * Sign up a new user
 */
const signup = async ({ email, password, fullName, phone, role }) => {
  const auth = getAuth();

  // Only allow elevating role if the caller is already admin (handled in controller)
  // Default to user
  const assignedRole = role && Object.values(ROLES).includes(role) ? role : ROLES.USER;

  // Create user in Firebase Auth
  const userRecord = await auth.createUser({
    email: email.toLowerCase(),
    password,
    displayName: fullName,
    emailVerified: false,
    disabled: false,
  });

  // Set custom claims for role
  await auth.setCustomUserClaims(userRecord.uid, { role: assignedRole });

  // Create Firestore document
  const userDoc = await createUserDocument(userRecord.uid, {
    fullName,
    email: email.toLowerCase(),
    phone,
    role: assignedRole,
  });

  // Generate email verification link (optional – can also be sent via client)
  let verificationLink = null;
  try {
    verificationLink = await auth.generateEmailVerificationLink(email);
  } catch (err) {
    logger.warn('Could not generate email verification link', { error: err.message });
  }

  return {
    user: {
      uid: userRecord.uid,
      fullName: userDoc.fullName,
      email: userDoc.email,
      phone: userDoc.phone,
      role: userDoc.role,
      profileImage: userDoc.profileImage,
      isVerified: userDoc.isVerified,
      isActive: userDoc.isActive,
    },
    verificationLink, // useful in development; in production prefer sending via email service
  };
};

/**
 * Login with email & password
 * Returns ID token + refresh token via Identity Toolkit
 */
const login = async ({ email, password }) => {
  const result = await callFirebaseAuth('signInWithPassword', {
    email: email.toLowerCase(),
    password,
    returnSecureToken: true,
  });

  const auth = getAuth();
  const db = getFirestore();

  // Update lastLogin and ensure user document exists
  const userRef = db.collection('users').doc(result.localId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    // Edge case: Auth user exists but Firestore doc missing – recreate minimal
    await createUserDocument(result.localId, {
      fullName: result.displayName || email.split('@')[0],
      email: result.email,
      role: ROLES.USER,
    });
  } else {
    const userData = userSnap.data();
    if (userData.isActive === false) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_MESSAGES.ACCOUNT_DISABLED);
    }
    await userRef.update({
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  const user = await getUserByUid(result.localId);

  return {
    user: {
      uid: user.uid,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profileImage: user.profileImage,
      isVerified: user.isVerified,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
    },
    tokens: {
      idToken: result.idToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    },
  };
};

/**
 * Refresh ID token using refresh token
 */
const refreshToken = async (refreshToken) => {
  if (!FIREBASE_API_KEY) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'FIREBASE_API_KEY is not configured'
    );
  }

  try {
    const url = `${SECURE_TOKEN_BASE}/token?key=${FIREBASE_API_KEY}`;
    const response = await axios.post(
      url,
      {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      },
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000,
      }
    );

    const data = response.data;

    return {
      idToken: data.id_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      userId: data.user_id,
    };
  } catch (error) {
    const fbError = error.response?.data?.error;
    logger.debug('Refresh token error', { error: fbError || error.message });
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.TOKEN_INVALID
    );
  }
};

/**
 * Logout – revoke refresh tokens for the user
 */
const logout = async (uid) => {
  const auth = getAuth();
  await auth.revokeRefreshTokens(uid);
  logger.info('Refresh tokens revoked', { uid });
  return true;
};

/**
 * Send password reset email
 */
const forgotPassword = async (email) => {
  const auth = getAuth();

  // Verify user exists
  try {
    await auth.getUserByEmail(email.toLowerCase());
  } catch (err) {
    // Do not reveal whether email exists (security)
    logger.debug('Password reset requested for non-existent or invalid email', {
      email,
    });
    return { message: SUCCESS_MESSAGES.PASSWORD_RESET_SENT };
  }

  // Generate reset link
  const resetLink = await auth.generatePasswordResetLink(email.toLowerCase());

  // In production you would send this via your email service (SendGrid, SES, etc.)
  // For this API we return the link so the client / admin can use it in development
  logger.info('Password reset link generated', { email });

  return {
    message: SUCCESS_MESSAGES.PASSWORD_RESET_SENT,
    resetLink, // remove in production or protect behind admin role
  };
};

/**
 * Confirm password reset with oobCode
 */
const resetPassword = async ({ oobCode, newPassword }) => {
  await callFirebaseAuth('resetPassword', {
    oobCode,
    newPassword,
  });

  return { message: SUCCESS_MESSAGES.PASSWORD_RESET };
};

/**
 * Send email verification link
 */
const sendEmailVerification = async (uid, email) => {
  const auth = getAuth();
  const link = await auth.generateEmailVerificationLink(email);

  logger.info('Email verification link generated', { uid, email });

  return {
    message: SUCCESS_MESSAGES.EMAIL_VERIFICATION_SENT,
    verificationLink: link, // in production send via email service
  };
};

/**
 * Verify email with oobCode
 */
const verifyEmail = async (oobCode) => {
  const result = await callFirebaseAuth('update', {
    oobCode,
  });

  // Update Firestore isVerified flag
  if (result.localId) {
    await updateUserDocument(result.localId, { isVerified: true });
  }

  return { message: SUCCESS_MESSAGES.EMAIL_VERIFIED };
};

/**
 * Change password (requires current password verification)
 */
const changePassword = async (uid, email, currentPassword, newPassword) => {
  // First verify current password by attempting sign-in
  await callFirebaseAuth('signInWithPassword', {
    email: email.toLowerCase(),
    password: currentPassword,
    returnSecureToken: false,
  });

  // Update password via Admin SDK
  const auth = getAuth();
  await auth.updateUser(uid, { password: newPassword });

  // Optionally revoke existing tokens so user must re-login
  await auth.revokeRefreshTokens(uid);

  logger.info('Password changed and tokens revoked', { uid });

  return { message: SUCCESS_MESSAGES.PASSWORD_CHANGED };
};

/**
 * Get current user profile
 */
const getMe = async (uid) => {
  const user = await getUserByUid(uid);
  return {
    uid: user.uid,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    profileImage: user.profileImage,
    isVerified: user.isVerified,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLogin: user.lastLogin,
  };
};

/**
 * Update profile
 * Role changes restricted to admin (enforced in controller)
 */
const updateProfile = async (uid, updates, isAdmin = false) => {
  const allowedFields = ['fullName', 'phone', 'profileImage'];
  if (isAdmin) {
    allowedFields.push('role', 'isActive', 'isVerified');
  }

  const sanitized = {};
  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      sanitized[key] = updates[key];
    }
  }

  if (Object.keys(sanitized).length === 0) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'No valid fields to update');
  }

  // If role is being updated, also update custom claims
  if (sanitized.role) {
    const auth = getAuth();
    await auth.setCustomUserClaims(uid, { role: sanitized.role });
  }

  // Sync displayName if fullName changes
  if (sanitized.fullName) {
    const auth = getAuth();
    await auth.updateUser(uid, { displayName: sanitized.fullName });
  }

  const updated = await updateUserDocument(uid, sanitized);

  return {
    uid: updated.uid,
    fullName: updated.fullName,
    email: updated.email,
    phone: updated.phone,
    role: updated.role,
    profileImage: updated.profileImage,
    isVerified: updated.isVerified,
    isActive: updated.isActive,
    updatedAt: updated.updatedAt,
  };
};

/**
 * Delete account (self or admin)
 */
const deleteAccount = async (uid) => {
  const auth = getAuth();
  const db = getFirestore();

  // Delete Firestore document first
  await db.collection('users').doc(uid).delete();

  // Delete Firebase Auth user
  await auth.deleteUser(uid);

  logger.info('User account deleted', { uid });
  return true;
};

module.exports = {
  signup,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  sendEmailVerification,
  verifyEmail,
  changePassword,
  getMe,
  updateProfile,
  deleteAccount,
  getUserByUid,
};
