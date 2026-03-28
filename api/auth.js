/**
 * POST /api/auth
 * Validate the admin password and return a session token.
 *
 * Body (JSON): { password: string }
 *
 * Set the ADMIN_PASSWORD environment variable to your desired password.
 * The server returns 503 if ADMIN_PASSWORD is not configured.
 */

const { createHash } = require('crypto');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
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

  // Create a deterministic token from the password so it can be validated
  // later without storing server-side session state.
  const token = createHash('sha256')
    .update(adminPassword + (process.env.TOKEN_SALT || 'allan-resume-salt'))
    .digest('hex');

  return res.status(200).json({ ok: true, token });
};
