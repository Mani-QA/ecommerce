import type { MiddlewareHandler } from 'hono';
import * as jose from 'jose';
import type { UserType } from '@qademo/shared';
import type { Env, Variables } from '../types/bindings';
import { errors } from './error-handler';

interface TokenPayload {
  sub: number;
  username: string;
  userType: UserType;
}

/**
 * Authentication middleware - validates JWT access token
 */
export function authMiddleware(): MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      throw errors.unauthorized('Missing access token');
    }

    const token = authHeader.slice(7);

    try {
      const secret = new TextEncoder().encode(c.env.JWT_SECRET);
      const { payload } = await jose.jwtVerify(token, secret);

      const tokenPayload = payload as unknown as TokenPayload;

      c.set('user', {
        id: tokenPayload.sub,
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
          id: tokenPayload.sub,
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
 */
export function adminMiddleware(): MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> {
  return async (c, next) => {
    // First, ensure user is authenticated
    const authHeader = c.req.header('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      throw errors.unauthorized('Missing access token');
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
        id: tokenPayload.sub,
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
    sub: user.id,
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
    sub: userId,
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

  return payload.sub as number;
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

