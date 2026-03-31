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
 *   location?: string,
 *   featuredVideo?: string,
 *   heroImages?: string[],
 *   aboutText?: string,
 *   skills?: object[],
 *   experience?: object[],
 *   projects?: object[],
 *   education?: object[]
 * }
 */

const { createHmac } = require('crypto');
const store = require('./_store');

function validToken(token) {
  if (!token) return false;
  if (!process.env.ADMIN_PASSWORD) return false;
  // Token is derived from TOKEN_SALT only — the password is never hashed.
  const expected = createHmac('sha256', process.env.TOKEN_SALT || 'allan-resume-salt')
    .update('admin-session-v1')
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
  'location',
  'featuredVideo',
  'heroImages',
  'aboutText',
  'skills',
  'experience',
  'projects',
  'education',
];

const ARRAY_KEYS = new Set(['heroImages', 'skills', 'experience', 'projects', 'education']);

module.exports = function handler(req, res) {
  const origin = process.env.FRONTEND_URL || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
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
        if (ARRAY_KEYS.has(key)) {
          if (Array.isArray(body[key])) {
            if (key === 'heroImages') {
              store.content[key] = body[key].map((u) => String(u).slice(0, 500));
            } else {
              // skills, experience, projects, education — store as-is (already validated JSON arrays)
              store.content[key] = body[key];
            }
          }
        } else {
          store.content[key] = String(body[key] || '').slice(0, 5000);
        }
      }
    });

    return res.status(200).json({ ok: true, content: store.content });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
