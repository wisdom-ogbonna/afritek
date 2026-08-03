# Firebase Authentication & Authorization REST API

Production-ready Authentication & Authorization REST API built with **Node.js**, **Express.js**, **Firebase Authentication**, **Firebase Admin SDK**, and **Cloud Firestore**.

Implements complete user lifecycle management, Role-Based Access Control (RBAC), secure token handling, input validation, rate limiting, and standardized API responses.

---

## Features

- **Authentication**
  - Signup / Login / Logout
  - Refresh token
  - Forgot / Reset password
  - Email verification
  - Change password
  - Get current user (`/me`)
  - Update profile
  - Delete account

- **Authorization (RBAC)**
  - Roles: `admin`, `moderator`, `user`
  - `authenticate` middleware (Firebase ID Token verification + revocation check)
  - `authorize(...roles)` middleware
  - Admins have full access
  - Users can only modify their own profile / account

- **Security**
  - Helmet (secure headers)
  - CORS
  - Rate limiting (global + stricter on auth routes)
  - Input validation & sanitization (express-validator)
  - Firebase ID Token verification with revocation check
  - Refresh token revocation on logout / password change
  - Request body size limits

- **Infrastructure**
  - Cloud Firestore `users` collection
  - Structured logging
  - Global error handler
  - 404 handler
  - Graceful shutdown
  - Health check endpoint

---

## Project Structure

```text
src/
├── config/
│   └── firebase.js
├── controllers/
│   └── auth.controller.js
├── services/
│   └── auth.service.js
├── routes/
│   └── auth.routes.js
├── middlewares/
│   ├── authenticate.js
│   ├── authorize.js
│   ├── validate.js
│   ├── errorHandler.js
│   └── notFound.js
├── validators/
│   └── auth.validator.js
├── utils/
│   ├── ApiResponse.js
│   ├── ApiError.js
│   ├── asyncHandler.js
│   ├── logger.js
│   └── constants.js
├── app.js
└── server.js

.env.example
package.json
README.md
```

---

## Prerequisites

- Node.js >= 18
- A Firebase project with:
  - Authentication enabled (Email/Password provider)
  - Cloud Firestore enabled
  - A service account key (Admin SDK)

---

## Installation

1. **Clone / copy the project**

```bash
cd firebase-auth-api
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment**

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
NODE_ENV=development
PORT=3000
API_PREFIX=/api/v1

CORS_ORIGIN=http://localhost:3000,http://localhost:5173

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"

FIREBASE_API_KEY=your-firebase-web-api-key
```

### How to get Firebase credentials

1. Go to [Firebase Console](https://console.firebase.google.com/) → your project.
2. **Project Settings** → **Service accounts** → **Generate new private key**.
   - Use `project_id`, `client_email`, and `private_key` in `.env`.
3. **Project Settings** → **General** → copy the **Web API Key** (`apiKey`) into `FIREBASE_API_KEY`.

> Tip: You can also place the downloaded JSON as `serviceAccountKey.json` and set  
> `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json` instead of the three individual variables.

4. **Enable Email/Password** in Firebase Authentication → Sign-in method.

5. **Create Firestore** database (Native mode) if not already created.

---

## Running the Server

**Development** (with auto-reload):

```bash
npm run dev
```

**Production**:

```bash
npm start
```

Server will start on `http://localhost:3000` (or the port you set).

- Health check: `GET http://localhost:3000/health`
- API base: `http://localhost:3000/api/v1`

---

## API Endpoints

All routes are prefixed with `/api/v1/auth`.

| Method | Endpoint                     | Access     | Description                          |
|--------|------------------------------|------------|--------------------------------------|
| POST   | `/signup`                    | Public     | Register new user                    |
| POST   | `/login`                     | Public     | Login (returns idToken + refreshToken) |
| POST   | `/logout`                    | Private    | Revoke refresh tokens                |
| POST   | `/refresh-token`             | Public     | Exchange refreshToken for new idToken |
| POST   | `/forgot-password`           | Public     | Generate password reset link         |
| POST   | `/reset-password`            | Public     | Reset password with oobCode          |
| POST   | `/send-email-verification`   | Private    | Generate email verification link     |
| POST   | `/verify-email`              | Public     | Verify email with oobCode            |
| PATCH  | `/change-password`           | Private    | Change password                      |
| GET    | `/me`                        | Private    | Get current user profile             |
| PATCH  | `/profile`                   | Private    | Update profile (self or admin)       |
| DELETE | `/account`                   | Private    | Delete account (self or admin)       |

---

## Response Format

**Success**

```json
{
  "success": true,
  "message": "Login successful.",
  "data": { ... }
}
```

**Error**

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address",
      "value": "invalid"
    }
  ]
}
```

---

## Firestore `users` Collection – Sample Document

```json
{
  "uid": "xYzAbC1234567890",
  "fullName": "Jane Doe",
  "email": "jane.doe@example.com",
  "phone": "+12345678901",
  "role": "user",
  "profileImage": "https://example.com/avatar.jpg",
  "isVerified": false,
  "isActive": true,
  "createdAt": { "_seconds": 1712345678, "_nanoseconds": 0 },
  "updatedAt": { "_seconds": 1712345678, "_nanoseconds": 0 },
  "lastLogin": { "_seconds": 1712349999, "_nanoseconds": 0 }
}
```

### Recommended Indexes / Security Rules (example)

```javascript
// Firestore Security Rules (adjust as needed)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null && (request.auth.uid == userId || request.auth.token.role == 'admin');
      allow write: if false; // All writes go through Admin SDK via this API
    }
  }
}
```

---

## Postman / cURL Examples

### 1. Signup

```http
POST {{baseUrl}}/api/v1/auth/signup
Content-Type: application/json

{
  "email": "jane.doe@example.com",
  "password": "SecurePass1!",
  "fullName": "Jane Doe",
  "phone": "+12345678901"
}
```

### 2. Login

```http
POST {{baseUrl}}/api/v1/auth/login
Content-Type: application/json

{
  "email": "jane.doe@example.com",
  "password": "SecurePass1!"
}
```

**Response (excerpt):**

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": { "uid": "...", "email": "...", "role": "user", ... },
    "tokens": {
      "idToken": "eyJhbGciOiJSUzI1NiIs...",
      "refreshToken": "AMf-vBx...",
      "expiresIn": "3600"
    }
  }
}
```

### 3. Get current user

```http
GET {{baseUrl}}/api/v1/auth/me
Authorization: Bearer {{idToken}}
```

### 4. Update profile

```http
PATCH {{baseUrl}}/api/v1/auth/profile
Authorization: Bearer {{idToken}}
Content-Type: application/json

{
  "fullName": "Jane A. Doe",
  "phone": "+12345678999",
  "profileImage": "https://cdn.example.com/avatars/jane.jpg"
}
```

### 5. Change password

```http
PATCH {{baseUrl}}/api/v1/auth/change-password
Authorization: Bearer {{idToken}}
Content-Type: application/json

{
  "currentPassword": "SecurePass1!",
  "newPassword": "NewSecurePass2@"
}
```

### 6. Refresh token

```http
POST {{baseUrl}}/api/v1/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "{{refreshToken}}"
}
```

### 7. Forgot password

```http
POST {{baseUrl}}/api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "jane.doe@example.com"
}
```

### 8. Reset password

```http
POST {{baseUrl}}/api/v1/auth/reset-password
Content-Type: application/json

{
  "oobCode": "THE_OOB_CODE_FROM_EMAIL_OR_LINK",
  "newPassword": "BrandNewPass3#"
}
```

### 9. Send email verification

```http
POST {{baseUrl}}/api/v1/auth/send-email-verification
Authorization: Bearer {{idToken}}
```

### 10. Verify email

```http
POST {{baseUrl}}/api/v1/auth/verify-email
Content-Type: application/json

{
  "oobCode": "THE_OOB_CODE_FROM_VERIFICATION_LINK"
}
```

### 11. Logout

```http
POST {{baseUrl}}/api/v1/auth/logout
Authorization: Bearer {{idToken}}
```

### 12. Delete own account

```http
DELETE {{baseUrl}}/api/v1/auth/account
Authorization: Bearer {{idToken}}
```

### 13. Admin – Delete another user

```http
DELETE {{baseUrl}}/api/v1/auth/account?uid=TARGET_USER_UID
Authorization: Bearer {{adminIdToken}}
```

---

## Roles & Authorization

| Role        | Description                                      |
|-------------|--------------------------------------------------|
| `user`      | Default role. Can manage own profile & account.  |
| `moderator` | Intermediate privileges (extend as needed).      |
| `admin`     | Full access. Can assign roles, delete any user.  |

**Usage in code:**

```js
const { authenticate } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');

router.get('/admin-only', authenticate, authorize('admin'), handler);
router.get('/staff', authenticate, authorize('admin', 'moderator'), handler);
```

Custom claims (`role`) are set on the Firebase user at signup / role change so they are available inside the ID token.

---

## Environment Variables Reference

| Variable                    | Required | Description                                      |
|-----------------------------|----------|--------------------------------------------------|
| `NODE_ENV`                  | No       | `development` / `production`                     |
| `PORT`                      | No       | Server port (default `3000`)                     |
| `API_PREFIX`                | No       | API prefix (default `/api/v1`)                   |
| `CORS_ORIGIN`               | No       | Comma-separated allowed origins                  |
| `RATE_LIMIT_WINDOW_MS`      | No       | Rate limit window in ms (default 15 min)         |
| `RATE_LIMIT_MAX`            | No       | Max requests per window (default 100)            |
| `FIREBASE_PROJECT_ID`       | Yes*     | Firebase project ID                              |
| `FIREBASE_CLIENT_EMAIL`     | Yes*     | Service account email                            |
| `FIREBASE_PRIVATE_KEY`      | Yes*     | Service account private key                      |
| `GOOGLE_APPLICATION_CREDENTIALS` | Alt  | Path to service account JSON                     |
| `FIREBASE_API_KEY`          | Yes      | Web API key (for Identity Toolkit REST calls)    |

\* Either the three individual Firebase vars **or** `GOOGLE_APPLICATION_CREDENTIALS`.

---

## Notes & Production Recommendations

1. **Email delivery**  
   The service currently returns `verificationLink` / `resetLink` in the response for development convenience. In production, integrate an email provider (SendGrid, Amazon SES, Firebase Extensions, etc.) and **do not** expose the links in the API response.

2. **Password policy**  
   Enforced both by validators (8+ chars, upper, lower, number, special) and Firebase’s own rules.

3. **Token revocation**  
   Logout and password change revoke all refresh tokens for the user. Subsequent use of old ID tokens will fail once they expire or when `checkRevoked: true` is used (already enabled).

4. **Rate limiting**  
   Auth routes have a stricter limit (20 req / 15 min). Adjust according to your traffic profile.

5. **Logging**  
   Replace the simple console logger with Winston or Pino for production observability.

6. **HTTPS**  
   Always run behind HTTPS in production (load balancer / reverse proxy).

---

## License

MIT
```
