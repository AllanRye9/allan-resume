/**
 * POST /api/track
 * Record a page visit.
 *
 * Body (JSON):
 *   { page?: string, referrer?: string, userAgent?: string, duration?: number }
 *
 * The visitor IP is read from the request headers so the client never has
 * to send it.  Country / city lookup is done via the free ipapi.co service.
 */

const store = require('./_store');
const { randomUUID } = require('crypto');

/** Very small in-process cache so we don't hammer ipapi.co for the same IP. */
const geoCache = new Map();

/** Strict allow-list for IP characters (IPv4 digits/dots, IPv6 hex/colons). */
const SAFE_IP_RE = /^[0-9a-fA-F.:]+$/;

async function getGeo(ip) {
  if (!ip || ip === '::1' || ip === '127.0.0.1') {
    return { country: 'Local', city: 'Local' };
  }
  // Reject anything that isn't a valid IP character set to prevent URL injection.
  if (!SAFE_IP_RE.test(ip)) {
    return { country: 'Unknown', city: 'Unknown' };
  }
  if (geoCache.has(ip)) return geoCache.get(ip);
  try {
    const url = new URL(`https://ipapi.co/${ip}/json/`);
    const res = await fetch(url.href);
    if (!res.ok) throw new Error('geo lookup failed');
    const data = await res.json();
    const geo = {
      country: data.country_name || 'Unknown',
      city: data.city || 'Unknown',
    };
    geoCache.set(ip, geo);
    return geo;
  } catch {
    return { country: 'Unknown', city: 'Unknown' };
  }
}

module.exports = async function handler(req, res) {
  // Allow the browser to fire a fire-and-forget beacon
  const origin = process.env.FRONTEND_URL || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawIp =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    '';

  const body = req.body || {};
  const geo = await getGeo(rawIp);

  const visit = {
    id: randomUUID(),
    ip: rawIp || 'unknown',
    country: geo.country,
    city: geo.city,
    timestamp: Date.now(),
    page: String(body.page || '/').slice(0, 200),
    referrer: String(body.referrer || '').slice(0, 500),
    userAgent: String(body.userAgent || req.headers['user-agent'] || '').slice(0, 300),
    duration: typeof body.duration === 'number' ? body.duration : null,
  };

  store.visits.push(visit);

  // Keep only the last 10 000 visits in memory to avoid unbounded growth
  if (store.visits.length > 10000) {
    store.visits = store.visits.slice(-10000);
  }

  return res.status(200).json({ ok: true });
};
