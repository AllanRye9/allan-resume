// ===== Portfolio Analytics Tracking =====
// Collects visit data (IP, country, city, referrer, device) and stores it
// in localStorage so the /admin dashboard can display it.
// IP/geo data is fetched from the ipapi.co free API. Ensure your privacy
// policy discloses this third-party data processing (GDPR / CCPA).
(function () {
  'use strict';

  var VISITS_KEY = 'ar_visits';
  var SESSION_KEY = 'ar_visit_counted';
  var MAX_VISITS = 500;

  // Only run on the main portfolio pages, not inside /admin
  if (window.location.pathname.startsWith('/admin')) return;

  // Deduplicate within a single browser session (reloads don't count twice)
  if (sessionStorage.getItem(SESSION_KEY)) return;
  sessionStorage.setItem(SESSION_KEY, '1');

  function saveVisit(data) {
    try {
      var visits = [];
      try {
        visits = JSON.parse(localStorage.getItem(VISITS_KEY) || '[]');
        if (!Array.isArray(visits)) visits = [];
      } catch (_) {
        visits = [];
      }
      visits.push(data);
      if (visits.length > MAX_VISITS) {
        visits.splice(0, visits.length - MAX_VISITS);
      }
      localStorage.setItem(VISITS_KEY, JSON.stringify(visits));
    } catch (_) {
      // localStorage may be unavailable (private browsing, quota exceeded, etc.)
    }
  }

  var baseVisit = {
    timestamp: new Date().toISOString(),
    referrer: document.referrer || 'Direct',
    userAgent: navigator.userAgent,
    ip: '',
    country: '',
    countryCode: '',
    city: ''
  };

  // Fetch geo/IP data from the free ipapi.co service
  fetch('https://ipapi.co/json/')
    .then(function (res) { return res.json(); })
    .then(function (geo) {
      saveVisit(Object.assign({}, baseVisit, {
        ip: geo.ip || '',
        country: geo.country_name || '',
        countryCode: geo.country_code || '',
        city: geo.city || ''
      }));
    })
    .catch(function () {
      // ipapi.co unavailable — still record the visit without geo data
      saveVisit(baseVisit);
    });
}());
