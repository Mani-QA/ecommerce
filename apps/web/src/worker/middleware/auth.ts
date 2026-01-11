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

    // Handle Basic Authentication (for automation convenience)
    if (authHeader.startsWith('Basic ')) {
      const credentials = decodeBasicAuth(authHeader);
      
      if (!credentials) {
        throw errors.unauthorized('Invalid Basic Auth format');
      }

      // Verify credentials against database
      const db = c.env.DB;
      const user = await db
        .prepare('SELECT * FROM users WHERE username = ?')
        .bind(credentials.username)
        .first<{ id: number; username: string; password_hash: string; user_type: string; is_active: number }>();

      if (!user || user.is_active !== 1) {
        throw errors.unauthorized('Invalid credentials');
      }

      // Verify password (import from password service)
      const { verifyPassword } = await import('../services/password');
      const isValid = await verifyPassword(credentials.password, user.password_hash);

      if (!isValid) {
        throw errors.unauthorized('Invalid credentials');
      }

      // Set user in context
      c.set('user', {
        id: user.id,
        username: user.username,
        userType: user.user_type as UserType,
      });

      await next();
      return;
    }

    // Handle Bearer Token Authentication
    if (!authHeader.startsWith('Bearer ')) {
      throw errors.unauthorized('Invalid authentication format');
    }

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

      await next();
    } catch (error) {
      if (error instanceof jose.errors.JWTExpired) {
        throw errors.unauthorized('Token expired');
      }
      throw errors.unauthorized('Invalid token');
    }
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

    // Handle Basic Authentication
    if (authHeader.startsWith('Basic ')) {
      const credentials = decodeBasicAuth(authHeader);
      
      if (!credentials) {
        throw errors.unauthorized('Invalid Basic Auth format');
      }

      // Verify credentials against database
      const db = c.env.DB;
      const user = await db
        .prepare('SELECT * FROM users WHERE username = ?')
        .bind(credentials.username)
        .first<{ id: number; username: string; password_hash: string; user_type: string; is_active: number }>();

      if (!user || user.is_active !== 1) {
        throw errors.unauthorized('Invalid credentials');
      }

      if (user.user_type !== 'admin') {
        throw errors.forbidden('Admin access required');
      }

      // Verify password
      const { verifyPassword } = await import('../services/password');
      const isValid = await verifyPassword(credentials.password, user.password_hash);

      if (!isValid) {
        throw errors.unauthorized('Invalid credentials');
      }

      // Set user in context
      c.set('user', {
        id: user.id,
        username: user.username,
        userType: user.user_type as UserType,
      });

      await next();
      return;
    }

    // Handle Bearer Token Authentication
    if (!authHeader.startsWith('Bearer ')) {
      throw errors.unauthorized('Invalid authentication format');
    }

    const token = authHeader.slice(7);

    try {
      const secret = new TextEncoder().encode(c.env.JWT_SECRET);
      const { payload } = await jose.jwtVerify(token, secret);

      const tokenPayload = payload as unknown as TokenPayload;

      if (tokenPayload.userType !== 'admin') {
        throw errors.forbidden('Admin access required');
      }

      c.set('user', {
        id: Number(tokenPayload.sub),
        username: tokenPayload.username,
        userType: tokenPayload.userType,
      });

      await next();
    } catch (error) {
      if (error instanceof jose.errors.JWTExpired) {
        throw errors.unauthorized('Token expired');
      }
      throw error;
    }
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

