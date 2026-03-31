/**
 * POST /api/auth
 * Validate the admin password and return a session token.
 *
 * Body (JSON): { password: string }
 *
 * Set the ADMIN_PASSWORD environment variable to your desired password.
 * The server returns 503 if ADMIN_PASSWORD is not configured.
 */

const { createHmac } = require('crypto');

module.exports = function handler(req, res) {
  const origin = process.env.FRONTEND_URL || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password } = req.body || {};
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return res.status(503).json({ ok: false, error: 'ADMIN_PASSWORD environment variable is not set.' });
  }

  if (!password || password !== adminPassword) {
    return res.status(401).json({ ok: false, error: 'Invalid password' });
  }

  // Create a deterministic session token using the TOKEN_SALT secret.
  // The password itself is never used in any hash — it is only compared directly above.
  const token = createHmac('sha256', process.env.TOKEN_SALT || 'allan-resume-salt')
    .update('admin-session-v1')
    .digest('hex');

  return res.status(200).json({ ok: true, token });
};
