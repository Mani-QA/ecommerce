import * as Sentry from '@sentry/cloudflare';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import {
  loginSchema,
  signupSchema,
  googleAuthSchema,
  generateId,
  getAdminPassword,
} from '@qademo/shared';
import type { Env, Variables, UserRow } from '../types/bindings';
import { userRowToUser } from '../types/bindings';
import { errors } from '../middleware/error-handler';
import {
  authMiddleware,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
} from '../middleware/auth';
import { verifyPassword, hashPassword, isNewHashFormat } from '../services/password';
import { noCacheMiddleware } from '../middleware/cache';

const authRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// All auth routes should not be cached
authRoutes.use('*', noCacheMiddleware());

/**
 * Helper to generate session tokens, store session in DB, set refresh cookie, and return AuthResponse data
 */
async function createSessionAndTokens(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  userRow: UserRow
) {
  const user = {
    id: userRow.id,
    username: userRow.username,
    userType: userRow.user_type as 'standard' | 'locked' | 'admin',
  };

  const jwtSecret = c.env.JWT_SECRET || 'dev-secret-key-min-32-chars-qademo';
  const accessToken = await generateAccessToken(user, jwtSecret);
  const refreshToken = await generateRefreshToken(user.id, jwtSecret);

  // Store refresh token hash in database
  const sessionId = generateId(32);
  const refreshTokenHash = await hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await c.env.DB
    .prepare(
      'INSERT INTO sessions (id, user_id, refresh_token_hash, expires_at) VALUES (?, ?, ?, ?)'
    )
    .bind(sessionId, user.id, refreshTokenHash, expiresAt)
    .run()
    .catch((err) => {
      console.warn('Could not store session in DB:', err);
    });

  // Set refresh token as HTTP-only cookie
  setCookie(c, 'refresh_token', refreshToken, {
    httpOnly: true,
    secure: c.env.ENVIRONMENT === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return {
    accessToken,
    user: {
      id: userRow.id,
      username: userRow.username,
      userType: userRow.user_type as 'standard' | 'locked' | 'admin',
      email: userRow.email ?? undefined,
      phone: userRow.phone ?? undefined,
      avatarUrl: userRow.avatar_url ?? undefined,
    },
  };
}

/**
 * POST /api/auth/signup
 * Register a new user using email, phone, password, and optional username
 */
authRoutes.post('/signup', zValidator('json', signupSchema), async (c) => {
  const { email, phone, password, username: requestedUsername } = c.req.valid('json');
  const db = c.env.DB;
  const normalizedEmail = email.toLowerCase().trim();

  Sentry.addBreadcrumb({
    category: 'auth',
    message: 'Signup attempt',
    level: 'info',
    data: { email: normalizedEmail },
  });

  // Check if an account with this email already exists
  const existingUserByEmail = await db
    .prepare('SELECT id FROM users WHERE email = ?')
    .bind(normalizedEmail)
    .first<{ id: number }>()
    .catch(() => null);

  if (existingUserByEmail) {
    throw errors.badRequest('An account with this email address already exists. Please sign in instead.');
  }

  // Determine username
  let finalUsername = requestedUsername?.trim();

  if (finalUsername) {
    // Check if requested username is taken
    const existingUserByUsername = await db
      .prepare('SELECT id FROM users WHERE username = ?')
      .bind(finalUsername)
      .first<{ id: number }>()
      .catch(() => null);

    if (existingUserByUsername) {
      throw errors.badRequest('This username is already taken. Please choose another username.');
    }
  } else {
    // Derive unique username from email prefix
    const base = normalizedEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15) || 'user';
    finalUsername = base;
    let counter = 1;

    while (counter <= 5) {
      const existing = await db
        .prepare('SELECT id FROM users WHERE username = ?')
        .bind(finalUsername)
        .first<{ id: number }>()
        .catch(() => null);

      if (!existing) break;
      finalUsername = `${base}_${Math.floor(1000 + Math.random() * 9000)}`;
      counter++;
    }
  }

  // Hash password securely with Web Crypto PBKDF2
  const passwordHash = await hashPassword(password);

  // Insert user into D1
  const insertResult = await db
    .prepare(
      'INSERT INTO users (username, password_hash, user_type, email, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime("now"), datetime("now"))'
    )
    .bind(finalUsername, passwordHash, 'standard', normalizedEmail, phone.trim())
    .run();

  const newUserId = insertResult.meta.last_row_id;

  const newUserRow: UserRow = {
    id: newUserId,
    username: finalUsername,
    password_hash: passwordHash,
    user_type: 'standard',
    email: normalizedEmail,
    phone: phone.trim(),
    google_id: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const authData = await createSessionAndTokens(c, newUserRow);

  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
  const country = c.req.header('CF-IPCountry') || 'unknown';
  console.log(`[AUTH] Successful signup for user: ${finalUsername} (ID: ${newUserId}, Email: ${normalizedEmail}) - IP: ${ip}, Country: ${country}`);

  Sentry.metrics.count('signup.success', 1);

  return c.json(
    {
      success: true,
      data: authData,
    },
    201
  );
});

/**
 * GET /api/auth/google/config
 * Public endpoint to fetch Google OAuth client ID
 */
authRoutes.get('/google/config', (c) => {
  return c.json({
    success: true,
    data: {
      clientId: c.env.GOOGLE_CLIENT_ID || '',
    },
  });
});

/**
 * POST /api/auth/google
 * Authenticate or register using Google Identity Services credential token
 */
authRoutes.post('/google', zValidator('json', googleAuthSchema), async (c) => {
  const { credential } = c.req.valid('json');
  const db = c.env.DB;

  Sentry.addBreadcrumb({
    category: 'auth',
    message: 'Google auth attempt',
    level: 'info',
  });

  // Verify Google ID token via Google's tokeninfo API
  let payload: {
    sub?: string;
    email?: string;
    email_verified?: string | boolean;
    name?: string;
    picture?: string;
    aud?: string;
  };

  try {
    const googleRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );

    if (!googleRes.ok) {
      const errText = await googleRes.text().catch(() => '');
      console.warn('Google tokeninfo verification failed:', errText);
      throw errors.unauthorized('Invalid Google credential token');
    }

    payload = (await googleRes.json()) as typeof payload;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      throw error;
    }
    throw errors.unauthorized('Failed to verify Google token with authentication provider');
  }

  if (!payload.sub || !payload.email) {
    throw errors.unauthorized('Google token missing required profile information');
  }

  // Validate Google Client ID if configured
  if (c.env.GOOGLE_CLIENT_ID && payload.aud && payload.aud !== c.env.GOOGLE_CLIENT_ID) {
    console.warn(`[AUTH] Google Client ID mismatch: received ${payload.aud}, expected ${c.env.GOOGLE_CLIENT_ID}`);
    throw errors.unauthorized('Google token client ID mismatch');
  }

  const normalizedEmail = payload.email.toLowerCase().trim();

  // 1. Check if user exists by google_id
  let userResult = await db
    .prepare('SELECT * FROM users WHERE google_id = ?')
    .bind(payload.sub)
    .first<UserRow>()
    .catch(() => null);

  // 2. If not found by google_id, check by email
  if (!userResult) {
    userResult = await db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(normalizedEmail)
      .first<UserRow>()
      .catch(() => null);

    if (userResult) {
      // User exists with matching email - link their Google ID and avatar
      await db
        .prepare(
          'UPDATE users SET google_id = ?, avatar_url = COALESCE(avatar_url, ?), updated_at = datetime("now") WHERE id = ?'
        )
        .bind(payload.sub, payload.picture || null, userResult.id)
        .run()
        .catch((err) => console.warn('Could not link Google ID to existing user:', err));

      userResult.google_id = payload.sub;
      userResult.avatar_url = userResult.avatar_url || payload.picture || null;
    }
  }

  // 3. If still not found, create a new user with Google profile
  if (!userResult) {
    const baseUsername = (payload.name || normalizedEmail.split('@')[0])
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 15) || 'user';

    let finalUsername = baseUsername;
    let attempts = 0;

    while (attempts < 5) {
      const existing = await db
        .prepare('SELECT id FROM users WHERE username = ?')
        .bind(finalUsername)
        .first<{ id: number }>()
        .catch(() => null);

      if (!existing) break;
      finalUsername = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
      attempts++;
    }

    const dummyPasswordHash = `oauth:google:${generateId(24)}`;

    const insertResult = await db
      .prepare(
        'INSERT INTO users (username, password_hash, user_type, email, google_id, avatar_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))'
      )
      .bind(
        finalUsername,
        dummyPasswordHash,
        'standard',
        normalizedEmail,
        payload.sub,
        payload.picture || null
      )
      .run();

    const newUserId = insertResult.meta.last_row_id;

    userResult = {
      id: newUserId,
      username: finalUsername,
      password_hash: dummyPasswordHash,
      user_type: 'standard',
      email: normalizedEmail,
      phone: null,
      google_id: payload.sub,
      avatar_url: payload.picture || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // Check if account is locked
  if (userResult.user_type === 'locked') {
    throw errors.accountLocked();
  }

  const authData = await createSessionAndTokens(c, userResult);

  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
  const country = c.req.header('CF-IPCountry') || 'unknown';
  console.log(`[AUTH] Google signin successful for user: ${userResult.username} (ID: ${userResult.id}, Email: ${normalizedEmail}) - IP: ${ip}, Country: ${country}`);

  Sentry.metrics.count('login.google.success', 1);

  return c.json({
    success: true,
    data: authData,
  });
});

/**
 * POST /api/auth/login
 * Authenticate user by username OR email and return tokens
 */
authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { username, password } = c.req.valid('json');
  const db = c.env.DB;
  const loginIdentifier = username.trim();

  Sentry.addBreadcrumb({
    category: 'auth',
    message: 'Login attempt',
    level: 'info',
    data: { username: loginIdentifier },
  });

  // Find user by username OR email
  let userResult = await db
    .prepare('SELECT * FROM users WHERE username = ? OR email = ?')
    .bind(loginIdentifier, loginIdentifier.toLowerCase())
    .first<UserRow>()
    .catch(() => null);

  if (!userResult) {
    const defaultUsers: Record<string, UserRow> = {
      standard_user: {
        id: 1,
        username: 'standard_user',
        password_hash: 'legacy',
        user_type: 'standard',
        email: null,
        phone: null,
        google_id: null,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      locked_user: {
        id: 2,
        username: 'locked_user',
        password_hash: 'legacy',
        user_type: 'locked',
        email: null,
        phone: null,
        google_id: null,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      admin_user: {
        id: 3,
        username: 'admin_user',
        password_hash: 'legacy',
        user_type: 'admin',
        email: null,
        phone: null,
        google_id: null,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
    userResult = defaultUsers[loginIdentifier] || null;
  }

  if (!userResult) {
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const country = c.req.header('CF-IPCountry') || 'unknown';

    Sentry.addBreadcrumb({
      category: 'auth',
      message: 'Login failed - user not found',
      level: 'warning',
      data: { username: loginIdentifier },
    });

    console.log(`[AUTH_FAILED] Login attempt for non-existent user: ${loginIdentifier} - IP: ${ip}, Country: ${country}`);
    throw errors.invalidCredentials();
  }

  // Check if account is locked (user_type = 'locked')
  if (userResult.user_type === 'locked') {
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const country = c.req.header('CF-IPCountry') || 'unknown';
    console.log(`[AUTH_LOCKED] Login attempt for locked account: ${loginIdentifier} - IP: ${ip}, Country: ${country}`);
    throw errors.accountLocked();
  }

  // Verify password
  let isValidPassword = false;

  if (userResult.username === 'admin_user') {
    isValidPassword = password === getAdminPassword();
  } else if (isNewHashFormat(userResult.password_hash)) {
    // Use PBKDF2 verification for new format
    isValidPassword = await verifyPassword(password, userResult.password_hash);
  } else {
    // Legacy bcrypt format - check against known test passwords
    const testPasswords: Record<string, string> = {
      standard_user: 'standard123',
      locked_user: 'locked123',
      admin_user: getAdminPassword(),
    };
    isValidPassword = testPasswords[userResult.username] === password;

    // If valid, migrate to new hash format in database
    if (isValidPassword && userResult.username !== 'admin_user') {
      const newHash = await hashPassword(password);
      await db
        .prepare('UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?')
        .bind(newHash, userResult.id)
        .run()
        .catch((err) => console.warn('Could not migrate password hash:', err));
    }
  }

  if (!isValidPassword) {
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const country = c.req.header('CF-IPCountry') || 'unknown';

    Sentry.addBreadcrumb({
      category: 'auth',
      message: 'Login failed - invalid password',
      level: 'warning',
      data: { username: loginIdentifier },
    });

    if (userResult.user_type === 'admin') {
      console.log(`[ADMIN_LOGIN_FAILED] ⚠️ FAILED ADMIN LOGIN ATTEMPT - User: ${loginIdentifier} - IP: ${ip}, Country: ${country}`);
      Sentry.metrics.count('login.admin.failed', 1);
    } else {
      console.log(`[AUTH_FAILED] Failed login attempt for user: ${loginIdentifier} - IP: ${ip}, Country: ${country}`);
      Sentry.metrics.count('login.failed', 1);
    }

    throw errors.invalidCredentials();
  }

  Sentry.addBreadcrumb({
    category: 'auth',
    message: 'Login successful',
    level: 'info',
    data: { username: userResult.username, userId: userResult.id },
  });

  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
  const country = c.req.header('CF-IPCountry') || 'unknown';
  const city = c.req.header('CF-IPCity') || 'unknown';
  const userAgent = c.req.header('User-Agent') || 'unknown';

  console.log(`[AUTH] Successful login for user: ${userResult.username} (ID: ${userResult.id}) - IP: ${ip}, Country: ${country}, City: ${city}`);
  Sentry.metrics.count('login.success', 1);

  if (userResult.user_type === 'admin') {
    console.log(`[ADMIN_LOGIN] ⚠️ ADMIN ACCESS - User: ${userResult.username} (ID: ${userResult.id}) - IP: ${ip}, Country: ${country}, City: ${city}, User-Agent: ${userAgent.substring(0, 100)}`);
    Sentry.metrics.count('login.admin', 1);
  }

  const authData = await createSessionAndTokens(c, userResult);

  return c.json({
    success: true,
    data: authData,
  });
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token from cookie
 */
authRoutes.post('/refresh', async (c) => {
  const refreshToken = getCookie(c, 'refresh_token');

  if (!refreshToken) {
    throw errors.unauthorized('No refresh token provided');
  }

  try {
    const jwtSecret = c.env.JWT_SECRET || 'dev-secret-key-min-32-chars-qademo';
    // Verify refresh token
    const userId = await verifyRefreshToken(refreshToken, jwtSecret);

    // Verify token is in database and not expired
    const refreshTokenHash = await hashToken(refreshToken);
    const db = c.env.DB;

    const session = await db
      .prepare(
        'SELECT s.*, u.username, u.user_type, u.email, u.phone, u.avatar_url FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.refresh_token_hash = ? AND s.expires_at > datetime("now")'
      )
      .bind(refreshTokenHash)
      .first<{
        id: string;
        user_id: number;
        username: string;
        user_type: string;
        email: string | null;
        phone: string | null;
        avatar_url: string | null;
      }>();

    if (!session || session.user_id !== userId) {
      throw errors.unauthorized('Invalid refresh token');
    }

    // Generate new access token
    const user = {
      id: session.user_id,
      username: session.username,
      userType: session.user_type as 'standard' | 'locked' | 'admin',
    };

    const accessToken = await generateAccessToken(user, jwtSecret);

    return c.json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user.id,
          username: user.username,
          userType: user.userType,
          email: session.email ?? undefined,
          phone: session.phone ?? undefined,
          avatarUrl: session.avatar_url ?? undefined,
        },
      },
    });
  } catch {
    // Clear invalid refresh token
    deleteCookie(c, 'refresh_token', { path: '/' });
    throw errors.unauthorized('Invalid or expired refresh token');
  }
});

/**
 * POST /api/auth/logout
 * Invalidate refresh token and clear cookie
 */
authRoutes.post('/logout', async (c) => {
  const refreshToken = getCookie(c, 'refresh_token');

  if (refreshToken) {
    // Remove session from database
    const refreshTokenHash = await hashToken(refreshToken);
    await c.env.DB
      .prepare('DELETE FROM sessions WHERE refresh_token_hash = ?')
      .bind(refreshTokenHash)
      .run();
  }

  // Clear cookie
  deleteCookie(c, 'refresh_token', { path: '/' });

  return c.json({
    success: true,
    data: { message: 'Logged out successfully' },
  });
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
authRoutes.get('/me', authMiddleware(), async (c) => {
  const user = c.get('user')!;
  const db = c.env.DB;

  let userResult = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(user.id)
    .first<UserRow>()
    .catch(() => null);

  if (!userResult) {
    const defaultUsersById: Record<number, UserRow> = {
      1: {
        id: 1,
        username: 'standard_user',
        password_hash: 'legacy',
        user_type: 'standard',
        email: null,
        phone: null,
        google_id: null,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      2: {
        id: 2,
        username: 'locked_user',
        password_hash: 'legacy',
        user_type: 'locked',
        email: null,
        phone: null,
        google_id: null,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      3: {
        id: 3,
        username: 'admin_user',
        password_hash: 'legacy',
        user_type: 'admin',
        email: null,
        phone: null,
        google_id: null,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
    userResult = defaultUsersById[user.id] || null;
  }

  if (!userResult) {
    throw errors.notFound('User');
  }

  return c.json({
    success: true,
    data: userRowToUser(userResult),
  });
});

export { authRoutes };
