/**
 * GET /api/config
 * Serves the backend API base URL as a JavaScript snippet.
 *
 * This is the only Vercel serverless function kept on the frontend deployment.
 * It exposes the RENDER backend URL so that frontend scripts can reach the API
 * without hardcoding a URL.
 *
 * Set the API_ENDPOINT environment variable in your Vercel project settings
 * to point to your Render backend URL.
 * Example: https://allan-resume-backend.onrender.com
 */

module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  const endpoint = process.env.API_ENDPOINT || '';
  res.status(200).send('window.__API_BASE__=' + JSON.stringify(endpoint) + ';');
};
