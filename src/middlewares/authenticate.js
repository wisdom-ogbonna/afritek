/**
 * Authentication middleware
 * Verifies Firebase ID Token from Authorization: Bearer <token>
 * Attaches decoded token and user document to req.user / req.auth
 */
const { getAuth, getFirestore } = require('../config/firebase');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');

/**
 * Extract Bearer token from Authorization header
 */
const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
};

/**
 * Authenticate request using Firebase ID Token
 * Also loads the corresponding Firestore user document
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.UNAUTHORIZED);
  }

  try {
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token, true); // checkRevoked = true

    // Load user profile from Firestore
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const userData = userDoc.data();

    if (userData.isActive === false) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_MESSAGES.ACCOUNT_DISABLED);
    }

    // Attach to request
    req.auth = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      authTime: decodedToken.auth_time,
      token,
    };

    req.user = {
      uid: userData.uid,
      fullName: userData.fullName,
      email: userData.email,
      phone: userData.phone || null,
      role: userData.role,
      profileImage: userData.profileImage || null,
      isVerified: userData.isVerified,
      isActive: userData.isActive,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
      lastLogin: userData.lastLogin || null,
    };

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.debug('Token verification failed', { error: error.message, code: error.code });

    // Re-throw so global error handler can normalize Firebase errors
    throw error;
  }
});

/**
 * Optional authentication – attaches user if token is present and valid,
 * otherwise continues without throwing.
 */
const optionalAuthenticate = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return next();
  }

  try {
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token, true);

    const db = getFirestore();
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData.isActive !== false) {
        req.auth = {
          uid: decodedToken.uid,
          email: decodedToken.email,
          emailVerified: decodedToken.email_verified,
          authTime: decodedToken.auth_time,
          token,
        };
        req.user = {
          uid: userData.uid,
          fullName: userData.fullName,
          email: userData.email,
          phone: userData.phone || null,
          role: userData.role,
          profileImage: userData.profileImage || null,
          isVerified: userData.isVerified,
          isActive: userData.isActive,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
          lastLogin: userData.lastLogin || null,
        };
      }
    }
  } catch (error) {
    // Silently ignore invalid tokens for optional auth
    logger.debug('Optional auth token invalid', { error: error.message });
  }

  next();
});

module.exports = {
  authenticate,
  optionalAuthenticate,
};
