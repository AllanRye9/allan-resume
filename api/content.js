/**
 * GET  /api/content          – Return current content (public, no auth needed).
 * POST /api/content?token=…  – Update content (admin only).
 *
 * Body for POST (JSON) – all fields optional:
 * {
 *   profilePic?: string,
 *   name?: string,
 *   title?: string,
 *   tagline?: string,
 *   email?: string,
 *   phone?: string,
 *   githubUrl?: string,
 *   linkedinUrl?: string,
 *   featuredVideo?: string,
 *   heroImages?: string[]
 * }
 */

const { createHash } = require('crypto');
const store = require('./_store');

function validToken(token) {
  if (!token) return false;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const expected = createHash('sha256')
    .update(adminPassword + (process.env.TOKEN_SALT || 'allan-resume-salt'))
    .digest('hex');
  return token === expected;
}

const ALLOWED_KEYS = [
  'profilePic',
  'name',
  'title',
  'tagline',
  'email',
  'phone',
  'githubUrl',
  'linkedinUrl',
  'featuredVideo',
  'heroImages',
];

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    return res.status(200).json(store.content);
  }

  if (req.method === 'POST') {
    const token =
      req.query?.token ||
      (req.headers.authorization || '').replace('Bearer ', '');

    if (!validToken(token)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = req.body || {};
    ALLOWED_KEYS.forEach((key) => {
      if (key in body) {
        if (key === 'heroImages') {
          if (Array.isArray(body[key])) {
            store.content[key] = body[key].map((u) => String(u).slice(0, 500));
          }
        } else {
          store.content[key] = String(body[key] || '').slice(0, 1000);
        }
      }
    });

    return res.status(200).json({ ok: true, content: store.content });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
