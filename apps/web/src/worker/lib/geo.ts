import type { Context } from 'hono';

export interface GeoLocationInfo {
  ip: string;
  country: string;
  city: string | null;
  location: string;
}

/**
 * Extract client IP address and location using Cloudflare headers and CF request context.
 *
 * Cloudflare provides headers on all incoming requests:
 * - CF-Connecting-IP: Client's true connecting IP address
 * - CF-IPCountry: 2-letter country code (e.g., 'US', 'IN', 'GB')
 * - CF-IPCity: City name (e.g., 'Austin', 'London')
 * - CF-Region / CF-Region-Code: Region or state (e.g., 'Texas', 'TX')
 * - Also accessible via (request as any).cf object on Cloudflare Workers
 */
export function getClientGeoInfo(c: Context): GeoLocationInfo {
  const req = c.req;
  const rawReq = c.req.raw as Request & { cf?: Record<string, any> };
  const cf = rawReq?.cf;

  // 1. IP Address
  const ip =
    req.header('cf-connecting-ip') ||
    req.header('CF-Connecting-IP') ||
    (req.header('x-forwarded-for') ? req.header('x-forwarded-for')!.split(',')[0].trim() : null) ||
    'unknown';

  // 2. Country
  const country =
    req.header('cf-ipcountry') ||
    req.header('CF-IPCountry') ||
    (cf?.country as string | undefined) ||
    'unknown';

  // 3. City
  const rawCity =
    req.header('cf-ipcity') ||
    req.header('CF-IPCity') ||
    (cf?.city as string | undefined) ||
    '';
  let city: string | null = null;
  if (rawCity && rawCity !== 'unknown') {
    try {
      city = decodeURIComponent(rawCity);
    } catch {
      city = rawCity;
    }
  }

  // 4. Region
  const rawRegion =
    req.header('cf-region') ||
    req.header('CF-Region') ||
    req.header('cf-region-code') ||
    req.header('CF-Region-Code') ||
    (cf?.region as string | undefined) ||
    (cf?.regionCode as string | undefined) ||
    '';
  let region = '';
  if (rawRegion && rawRegion !== 'unknown') {
    try {
      region = decodeURIComponent(rawRegion);
    } catch {
      region = rawRegion;
    }
  }

  // 5. Human-readable composite location (e.g. "Austin, Texas, US")
  const parts: string[] = [];
  if (city) parts.push(city);
  if (region && region !== city) parts.push(region);
  if (country && country !== 'unknown') parts.push(country);

  const location = parts.length > 0 ? parts.join(', ') : (country !== 'unknown' ? country : 'unknown');

  return {
    ip,
    country,
    city,
    location,
  };
}
