import { Hono } from 'hono';
import type { Env, Variables } from '../types/bindings';
import { errors } from '../middleware/error-handler';
import { adminMiddleware } from '../middleware/auth';

const imageRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * GET /api/images/*
 * Serve images from R2 with aggressive CDN edge caching
 * Images are cached at the edge for 1 year (immutable)
 */
imageRoutes.get('/*', async (c) => {
  const key = c.req.path.replace('/api/images/', '');
  const bucket = c.env.R2_BUCKET;

  if (!key) {
    throw errors.validation('Image key is required');
  }

  const object = await bucket.get(key);

  if (!object) {
    // Cache 404 for missing images at CDN edge for 30 days (aggressive)
    return new Response(null, {
      status: 404,
      headers: {
        'Cache-Control': 'public, s-maxage=2592000, stale-while-revalidate=2592000, immutable',
        'CDN-Cache-Control': 'public, max-age=2592000',
      },
    });
  }

  const headers = new Headers();
  
  // Set content type from R2 metadata or infer from key
  const contentType = object.httpMetadata?.contentType || inferContentType(key);
  headers.set('Content-Type', contentType);
  
  // Aggressive CDN edge caching for images - 1 year, immutable
  // s-maxage is for CDN/edge caching (Cloudflare will cache this)
  // max-age is for browser caching
  headers.set('Cache-Control', 'public, s-maxage=31536000, max-age=31536000, immutable');
  headers.set('CDN-Cache-Control', 'public, max-age=31536000, immutable');
  
  // ETag for conditional requests
  headers.set('ETag', object.httpEtag);
  
  // CORS headers for cross-origin image requests
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  
  // Vary header for proper caching
  headers.set('Vary', 'Accept-Encoding');
  
  // Check if client has cached version (304 Not Modified)
  const ifNoneMatch = c.req.header('If-None-Match');
  if (ifNoneMatch === object.httpEtag) {
    return new Response(null, { 
      status: 304, 
      headers: {
        'Cache-Control': 'public, s-maxage=31536000, max-age=31536000, immutable',
        'ETag': object.httpEtag,
      },
    });
  }

  return new Response(object.body, {
    headers,
  });
});

/**
 * POST /api/images
 * Upload an image to R2 (admin only)
 */
imageRoutes.post('/', adminMiddleware(), async (c) => {
  const bucket = c.env.R2_BUCKET;
  
  const formData = await c.req.formData();
  const fileEntry = formData.get('file');
  const folderEntry = formData.get('folder');
  const folder = typeof folderEntry === 'string' ? folderEntry : 'products';

  if (!fileEntry || typeof fileEntry === 'string') {
    throw errors.validation('No file provided');
  }

  // Cast to File type for Workers environment
  const file = fileEntry as unknown as File;

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw errors.validation('Invalid file type. Allowed: JPEG, PNG, WebP, GIF');
  }

  // Validate file size
  if (file.size > MAX_SIZE) {
    throw errors.validation('File too large. Maximum size is 5MB');
  }

  // Generate unique key
  const extension = file.name.split('.').pop() || 'jpg';
  const timestamp = Date.now();
  const randomId = crypto.randomUUID().slice(0, 8);
  const key = `${folder}/${timestamp}-${randomId}.${extension}`;

  // Upload to R2
  await bucket.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
    },
  });

  return c.json({
    success: true,
    data: {
      key,
      url: `/api/images/${key}`,
      size: file.size,
      type: file.type,
    },
  }, 201);
});

/**
 * DELETE /api/images/*
 * Delete an image from R2 (admin only)
 */
imageRoutes.delete('/*', adminMiddleware(), async (c) => {
  const key = c.req.path.replace('/api/images/', '');
  const bucket = c.env.R2_BUCKET;

  if (!key) {
    throw errors.validation('Image key is required');
  }

  // Check if image exists
  const object = await bucket.head(key);
  if (!object) {
    throw errors.notFound('Image');
  }

  await bucket.delete(key);

  return c.json({
    success: true,
    data: {
      key,
      deleted: true,
    },
  });
});

/**
 * Infer content type from file extension
 */
function inferContentType(key: string): string {
  const extension = key.split('.').pop()?.toLowerCase();
  
  const types: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
  };

  return types[extension || ''] || 'application/octet-stream';
}

export { imageRoutes };

