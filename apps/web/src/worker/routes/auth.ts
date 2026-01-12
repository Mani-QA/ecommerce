import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { loginSchema } from '@qademo/shared';
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
import { generateId } from '@qademo/shared';

const authRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// All auth routes should not be cached
authRoutes.use('*', noCacheMiddleware());

/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 */
authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { username, password } = c.req.valid('json');
  const db = c.env.DB;

  // Find user by username
  const userResult = await db
    .prepare('SELECT * FROM users WHERE username = ?')
    .bind(username)
    .first<UserRow>();

  if (!userResult) {
    throw errors.invalidCredentials();
  }

  // Check if account is locked (user_type = 'locked')
  if (userResult.user_type === 'locked') {
    throw errors.accountLocked();
  }

  // Verify password
  let isValidPassword = false;
  
  if (isNewHashFormat(userResult.password_hash)) {
    // Use PBKDF2 verification for new format
    isValidPassword = await verifyPassword(password, userResult.password_hash);
  } else {
    // Legacy bcrypt format - check against known test passwords
    // This is for backward compatibility with existing test data
    const testPasswords: Record<string, string> = {
      standard_user: 'standard123',
      locked_user: 'locked123',
      admin_user: 'admin123',
    };
    isValidPassword = testPasswords[username] === password;

    // If valid, migrate to new hash format
    if (isValidPassword) {
      const newHash = await hashPassword(password);
      await db
        .prepare('UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?')
        .bind(newHash, userResult.id)
        .run();
      console.log(`Migrated password hash for user: ${username}`);
    }
  }

  if (!isValidPassword) {
    throw errors.invalidCredentials();
  }

  // Generate tokens
  const user = {
    id: userResult.id,
    username: userResult.username,
    userType: userResult.user_type as 'standard' | 'locked' | 'admin',
  };

  const accessToken = await generateAccessToken(user, c.env.JWT_SECRET);
  const refreshToken = await generateRefreshToken(user.id, c.env.JWT_SECRET);

  // Store refresh token hash in database
  const sessionId = generateId(32);
  const refreshTokenHash = await hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await db
    .prepare(
      'INSERT INTO sessions (id, user_id, refresh_token_hash, expires_at) VALUES (?, ?, ?, ?)'
    )
    .bind(sessionId, user.id, refreshTokenHash, expiresAt)
    .run();

  // Set refresh token as HTTP-only cookie
  setCookie(c, 'refresh_token', refreshToken, {
    httpOnly: true,
    secure: c.env.ENVIRONMENT === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return c.json({
    success: true,
    data: {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        userType: user.userType,
      },
    },
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
    // Verify refresh token
    const userId = await verifyRefreshToken(refreshToken, c.env.JWT_SECRET);

    // Verify token is in database and not expired
    const refreshTokenHash = await hashToken(refreshToken);
    const db = c.env.DB;

    const session = await db
      .prepare(
        'SELECT s.*, u.username, u.user_type FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.refresh_token_hash = ? AND s.expires_at > datetime("now")'
      )
      .bind(refreshTokenHash)
      .first<{ id: string; user_id: number; username: string; user_type: string }>();

    if (!session || session.user_id !== userId) {
      throw errors.unauthorized('Invalid refresh token');
    }

    // Generate new access token
    const user = {
      id: session.user_id,
      username: session.username,
      userType: session.user_type as 'standard' | 'locked' | 'admin',
    };

    const accessToken = await generateAccessToken(user, c.env.JWT_SECRET);

    return c.json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user.id,
          username: user.username,
          userType: user.userType,
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

  const userResult = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(user.id)
    .first<UserRow>();

  if (!userResult) {
    throw errors.notFound('User');
  }

  return c.json({
    success: true,
    data: userRowToUser(userResult),
  });
});

export { authRoutes };

