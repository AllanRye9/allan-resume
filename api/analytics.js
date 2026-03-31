/**
 * GET /api/analytics
 * Return visit analytics for the admin dashboard.
 *
 * Requires: Authorization: Bearer <token>
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

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();

  if (!validToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const visits = store.visits;
  const total = visits.length;

  // Unique IPs
  const uniqueIPs = new Set(visits.map((v) => v.ip));

  // Country counts
  const countryCounts = {};
  visits.forEach((v) => {
    countryCounts[v.country] = (countryCounts[v.country] || 0) + 1;
  });
  const countries = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([country, count]) => ({ country, count }));

  // Top IPs
  const ipCounts = {};
  visits.forEach((v) => {
    ipCounts[v.ip] = (ipCounts[v.ip] || 0) + 1;
  });
  const topIPs = Object.entries(ipCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([ip, count]) => ({ ip, count }));

  // Average duration (only for visits that reported one)
  const timed = visits.filter((v) => typeof v.duration === 'number' && v.duration > 0);
  const avgDuration = timed.length
    ? Math.round(timed.reduce((s, v) => s + v.duration, 0) / timed.length)
    : 0;

  const now = Date.now();

  // Active visitors in the last 5 minutes
  const fiveMinAgo = now - 5 * 60 * 1000;
  const activeNow = visits.filter((v) => v.timestamp >= fiveMinAgo).length;

  // Bounce rate: sessions (by IP) with only a single tracked visit
  const sessionPageCount = {};
  visits.forEach((v) => {
    if (v.ip) sessionPageCount[v.ip] = (sessionPageCount[v.ip] || 0) + 1;
  });
  const totalSessions = Object.keys(sessionPageCount).length;
  const bounceSessions = Object.values(sessionPageCount).filter((c) => c === 1).length;
  const bounceRate = totalSessions > 0
    ? Math.round((bounceSessions / totalSessions) * 100)
    : 0;

  // Top pages by visit count
  const pageCounts = {};
  visits.forEach((v) => {
    const page = (v.page || '/').slice(0, 200);
    pageCounts[page] = (pageCounts[page] || 0) + 1;
  });
  const topPages = Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([page, count]) => ({ page, count }));

  // Daily visit counts (last 30 days)
  const dailyCounts = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(now - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    dailyCounts[key] = 0;
  }
  visits.forEach((v) => {
    const key = new Date(v.timestamp).toISOString().slice(0, 10);
    if (key in dailyCounts) dailyCounts[key]++;
  });
  const dailyVisits = Object.entries(dailyCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));

  // Recent visits (last 100)
  const recent = visits
    .slice(-100)
    .reverse()
    .map(({ id, ip, country, city, timestamp, page, referrer, userAgent, duration }) => ({
      id,
      ip,
      country,
      city,
      timestamp,
      page,
      referrer,
      userAgent,
      duration,
    }));

  return res.status(200).json({
    stats: {
      total,
      unique: uniqueIPs.size,
      avgDuration,
      activeNow,
      bounceRate,
    },
    countries,
    topIPs,
    dailyVisits,
    topPages,
    recent,
  });
};
