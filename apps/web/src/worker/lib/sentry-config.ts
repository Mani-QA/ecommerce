import type { Env } from '../types/bindings';

/**
 * Get Sentry configuration based on environment
 */
export function getSentryConfig(env: Env) {
  const { id: versionId } = env.CF_VERSION_METADATA || { id: 'unknown' };
  const isDev = env.ENVIRONMENT === 'development';

  return {
    dsn: env.SENTRY_DSN,
    environment: env.ENVIRONMENT || 'production',
    release: versionId,
    
    // Send user IP and headers for context
    sendDefaultPii: true,
    
    // Enable logs
    enableLogs: true,
    
    // Performance tracing - 20% sample rate in production, 100% in dev
    tracesSampleRate: isDev ? 1.0 : 0.2,
    
    // Add custom tags
    initialScope: {
      tags: {
        worker: 'qademo',
        runtime: 'cloudflare-workers',
      },
    },
    
    // Filter out noise
    beforeSend(event: any) {
      // Don't send errors for invalid file extensions (404s we cache)
      if (event.request?.url?.match(/\.(php|asp|aspx|jsp|cgi|exe|dll)$/i)) {
        return null;
      }
      return event;
    },
  };
}
