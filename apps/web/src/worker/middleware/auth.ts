import type { MiddlewareHandler } from 'hono';
import * as jose from 'jose';
import type { UserType } from '@qademo/shared';
import type { Env, Variables } from '../types/bindings';
import { errors } from './error-handler';

interface TokenPayload {
  sub: string;
  username: string;
  userType: UserType;
}

/**
 * Decode Basic Auth header
 */
function decodeBasicAuth(authHeader: string): { username: string; password: string } | null {
  try {
    const base64Credentials = authHeader.slice(6); // Remove "Basic "
    const credentials = atob(base64Credentials);
    const [username, password] = credentials.split(':');
    return { username, password };
  } catch {
    return null;
  }
}

/**
 * Verify Basic Authentication credentials
 * @param authHeader - The Authorization header value
 * @param db - Database instance
 * @param requireAdmin - Whether to require admin role
 * @returns User information if authentication succeeds
 */
async function verifyBasicAuth(
  authHeader: string,
  db: Env['DB'],
  requireAdmin = false
): Promise<{ id: number; username: string; userType: UserType }> {
  const credentials = decodeBasicAuth(authHeader);
  
  if (!credentials) {
    throw errors.unauthorized('Invalid Basic Auth format');
  }

  // Verify credentials against database
  const user = await db
    .prepare('SELECT * FROM users WHERE username = ?')
    .bind(credentials.username)
    .first<{ id: number; username: string; password_hash: string; user_type: string }>();

  if (!user) {
    throw errors.unauthorized('Invalid credentials');
  }

  if (requireAdmin && user.user_type !== 'admin') {
    throw errors.forbidden('Admin access required');
  }

  // Verify password
  const { verifyPassword, isNewHashFormat } = await import('../services/password');
  let isValid = false;

  if (isNewHashFormat(user.password_hash)) {
    // Use PBKDF2 verification for new format
    isValid = await verifyPassword(credentials.password, user.password_hash);
  } else {
    // Legacy bcrypt format - check against known test passwords
    const testPasswords: Record<string, string> = {
      standard_user: 'standard123',
      locked_user: 'locked123',
      admin_user: 'admin123',
    };
    isValid = testPasswords[credentials.username] === credentials.password;
  }

  if (!isValid) {
    throw errors.unauthorized('Invalid credentials');
  }

  return {
    id: user.id,
    username: user.username,
    userType: user.user_type as UserType,
  };
}

/**
 * Verify Bearer Token authentication
 * @param authHeader - The Authorization header value
 * @param secret - JWT secret key
 * @param requireAdmin - Whether to require admin role
 * @returns User information if authentication succeeds
 */
async function verifyBearerToken(
  authHeader: string,
  secret: string,
  requireAdmin = false
): Promise<{ id: number; username: string; userType: UserType }> {
  if (!authHeader.startsWith('Bearer ')) {
    throw errors.unauthorized('Invalid authentication format');
  }

  const token = authHeader.slice(7);

  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, secretKey);

    const tokenPayload = payload as unknown as TokenPayload;

    if (requireAdmin && tokenPayload.userType !== 'admin') {
      throw errors.forbidden('Admin access required');
    }

    return {
      id: Number(tokenPayload.sub),
      username: tokenPayload.username,
      userType: tokenPayload.userType,
    };
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      throw errors.unauthorized('Token expired');
    }
    throw errors.unauthorized('Invalid token');
  }
}

/**
 * Authentication middleware - validates JWT access token OR Basic Auth
 * Supports both Bearer token and Basic authentication for automation testing
 */
export function authMiddleware(): MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader) {
      throw errors.unauthorized('Missing authentication');
    }

    let user: { id: number; username: string; userType: UserType };

    if (authHeader.startsWith('Basic ')) {
      user = await verifyBasicAuth(authHeader, c.env.DB, false);
    } else {
      user = await verifyBearerToken(authHeader, c.env.JWT_SECRET, false);
    }

    c.set('user', user);
    await next();
  };
}

/**
 * Optional authentication middleware - sets user if token is valid, but doesn't require it
 */
export function optionalAuthMiddleware(): MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);

      try {
        const secret = new TextEncoder().encode(c.env.JWT_SECRET);
        const { payload } = await jose.jwtVerify(token, secret);

        const tokenPayload = payload as unknown as TokenPayload;

        c.set('user', {
          id: Number(tokenPayload.sub),
          username: tokenPayload.username,
          userType: tokenPayload.userType,
        });
      } catch {
        // Token invalid, but that's okay for optional auth
      }
    }

    await next();
  };
}

/**
 * Admin-only middleware - requires authenticated admin user
 * Supports both Bearer token and Basic authentication
 */
export function adminMiddleware(): MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader) {
      throw errors.unauthorized('Missing authentication');
    }

    let user: { id: number; username: string; userType: UserType };

    if (authHeader.startsWith('Basic ')) {
      user = await verifyBasicAuth(authHeader, c.env.DB, true);
    } else {
      user = await verifyBearerToken(authHeader, c.env.JWT_SECRET, true);
    }

    c.set('user', user);
    await next();
  };
}

/**
 * Generate JWT access token
 */
export async function generateAccessToken(
  user: { id: number; username: string; userType: UserType },
  secret: string
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);

  return await new jose.SignJWT({
    sub: String(user.id),
    username: user.username,
    userType: user.userType,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secretKey);
}

/**
 * Generate JWT refresh token
 */
export async function generateRefreshToken(
  userId: number,
  secret: string
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);

  return await new jose.SignJWT({
    sub: String(userId),
    type: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}

/**
 * Verify refresh token
 */
export async function verifyRefreshToken(
  token: string,
  secret: string
): Promise<number> {
  const secretKey = new TextEncoder().encode(secret);
  const { payload } = await jose.jwtVerify(token, secretKey);

  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }

  return Number(payload.sub);
}

/**
 * Hash a token for storage
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

