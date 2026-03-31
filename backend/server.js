/**
 * Backend Express server — deployed on Render.
 *
 * All /api/* routes are handled here.
 * Set FRONTEND_URL to your Vercel frontend URL for strict CORS in production.
 * Set PORT if needed (Render injects it automatically).
 */

'use strict';

const express = require('express');

const app = express();

// ── Body parsing ──────────────────────────────────────────────────
// Limit payload size to guard against memory exhaustion attacks.
app.use(express.json({ limit: '100kb' }));

// ── API routes ────────────────────────────────────────────────────
// app.all() is used intentionally: each handler validates its own method
// internally and returns 405 for unsupported methods, keeping the logic
// self-contained and consistent with the original Vercel serverless style.
app.all('/api/auth',      require('./api/auth'));
app.all('/api/analytics', require('./api/analytics'));
app.all('/api/content',   require('./api/content'));

// track.js is async — wrap to forward unhandled rejections to Express
const trackHandler = require('./api/track');
app.all('/api/track', (req, res, next) => {
  Promise.resolve(trackHandler(req, res)).catch(next);
});

// ── Health check ──────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }));

// ── Start ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
