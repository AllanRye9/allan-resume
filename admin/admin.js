/* ===================================================================
   Admin Dashboard — JavaScript
   Handles: auth, tab navigation, analytics display, content mgmt
   =================================================================== */
'use strict';

// ── Storage Keys ─────────────────────────────────────────────────
var KEYS = {
  VISITS:  'ar_visits',
  PWD:     'ar_admin_hash',
  TOKEN:   'ar_admin_token',
  CONTENT: 'cv_content_override'
};

// SHA-256 hash of the default password "admin123".
// Used as a client-side fallback when the server /api/auth endpoint is
// unavailable (e.g. local development without ADMIN_PASSWORD configured).
var DEFAULT_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';

var PAGE_SIZE      = 20;
var currentPage    = 1;
var filteredVisits = [];

// Auth token from the server (stored in localStorage between sessions)
var authToken = localStorage.getItem(KEYS.TOKEN) || '';

// ── SHA-256 via Web Crypto API ──────────────────────────────────
async function sha256(msg) {
  var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(buf)).map(function (b) {
    return b.toString(16).padStart(2, '0');
  }).join('');
}

// ── Safe JSON parse ─────────────────────────────────────────────
function getJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') || fallback;
  } catch (_) {
    return fallback;
  }
}

// ── Stored local-mode password hash ─────────────────────────────
function getStoredHash() {
  return localStorage.getItem(KEYS.PWD) || DEFAULT_HASH;
}

// ── Save / clear auth token ──────────────────────────────────────
function saveToken(token) {
  authToken = token || '';
  if (authToken) {
    localStorage.setItem(KEYS.TOKEN, authToken);
  } else {
    localStorage.removeItem(KEYS.TOKEN);
  }
}

// ── Polyfill: CanvasRenderingContext2D.roundRect ─────────────────
(function () {
  if (typeof CanvasRenderingContext2D !== 'undefined' &&
      !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      this.beginPath();
      this.moveTo(x + r, y);
      this.lineTo(x + w - r, y);
      this.quadraticCurveTo(x + w, y, x + w, y + r);
      this.lineTo(x + w, y + h - r);
      this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      this.lineTo(x + r, y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - r);
      this.lineTo(x, y + r);
      this.quadraticCurveTo(x, y, x + r, y);
      this.closePath();
      return this;
    };
  }
}());

// ── DOM references ───────────────────────────────────────────────
var loginScreen     = document.getElementById('login-screen');
var dashboard       = document.getElementById('dashboard');
var sidebar         = document.getElementById('sidebar');
var sidebarOverlay  = document.getElementById('sidebar-overlay');

// ── Show / hide dashboard ────────────────────────────────────────
function showDashboard() {
  loginScreen.hidden = true;
  dashboard.hidden   = false;
  document.body.classList.remove('login-page');
  switchTab('overview');
}

function showLogin() {
  loginScreen.hidden = false;
  dashboard.hidden   = true;
  document.body.classList.add('login-page');
}

// ── Login form ───────────────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', function (e) {
  e.preventDefault();
  var pwd      = document.getElementById('password').value;
  var errEl    = document.getElementById('login-error');
  var loginBtn = document.getElementById('login-btn');

  errEl.hidden     = true;
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in…';

  // Try server-side auth first
  fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pwd })
  })
  .then(function (res) { return res.json(); })
  .then(function (data) {
    if (data.ok && data.token) {
      saveToken(data.token);
      showDashboard();
    } else {
      // Server auth failed (wrong password or not configured) – fall back to SHA-256
      clientSideAuth(pwd, errEl);
    }
  })
  .catch(function () {
    // Network error – fall back to client-side SHA-256
    clientSideAuth(pwd, errEl);
  })
  .finally(function () {
    loginBtn.disabled    = false;
    loginBtn.textContent = 'Sign In';
  });
});

function clientSideAuth(pwd, errEl) {
  // NOTE: Client-side fallback is used when the server /api/auth endpoint is
  // unavailable (e.g. local dev without ADMIN_PASSWORD configured).
  // This mode is inherently less secure — use it only for local testing.
  console.warn('[admin] Using client-side SHA-256 fallback auth. Deploy with ADMIN_PASSWORD for server-side security.');
  return sha256(pwd).then(function (hash) {
    if (hash === getStoredHash()) {
      saveToken(''); // no server token in fallback mode
      showDashboard();
    } else {
      errEl.textContent = 'Incorrect password.';
      errEl.hidden = false;
      setTimeout(function () { errEl.hidden = true; }, 4000);
    }
  });
}

// ── Logout ───────────────────────────────────────────────────────
document.getElementById('logout-btn').addEventListener('click', function () {
  saveToken('');
  showLogin();
});

// ── Sidebar toggle (mobile) ──────────────────────────────────────
function openSidebar() {
  sidebar.classList.add('open');
  if (sidebarOverlay) {
    sidebarOverlay.classList.add('show');
    sidebarOverlay.setAttribute('aria-hidden', 'false');
  }
}
function closeSidebar() {
  sidebar.classList.remove('open');
  if (sidebarOverlay) {
    sidebarOverlay.classList.remove('show');
    sidebarOverlay.setAttribute('aria-hidden', 'true');
  }
}

document.getElementById('sidebar-toggle').addEventListener('click', function () {
  if (sidebar.classList.contains('open')) {
    closeSidebar();
  } else {
    openSidebar();
  }
});

if (sidebarOverlay) {
  sidebarOverlay.addEventListener('click', closeSidebar);
}

// Close sidebar when clicking a nav item on mobile
sidebar.querySelectorAll('.nav-item').forEach(function (item) {
  item.addEventListener('click', function () {
    if (window.innerWidth <= 768) closeSidebar();
  });
});

// ── Tab navigation ───────────────────────────────────────────────
var TAB_META = {
  overview: ['Overview',            'Welcome to your admin dashboard'],
  visitors: ['Visitor Log',         'Detailed visitor tracking data'],
  content:  ['Content Management',  'Update every section of your portfolio'],
  settings: ['Settings',            'Configure your admin panel']
};

document.querySelectorAll('.nav-item[data-tab]').forEach(function (item) {
  item.addEventListener('click', function (e) {
    e.preventDefault();
    switchTab(this.dataset.tab);
  });
});

function switchTab(tabName) {
  document.querySelectorAll('.nav-item[data-tab]').forEach(function (item) {
    item.classList.toggle('active', item.dataset.tab === tabName);
  });

  document.querySelectorAll('.tab-content').forEach(function (section) {
    section.hidden = section.dataset.tabSection !== tabName;
  });

  var meta = TAB_META[tabName] || [tabName, ''];
  document.getElementById('page-title').textContent    = meta[0];
  document.getElementById('page-subtitle').textContent = meta[1];

  if (tabName === 'overview')  renderOverview();
  if (tabName === 'visitors')  renderVisitorsTable();
  if (tabName === 'content')   loadContentForms();
  if (tabName === 'settings')  loadSettings();
}

// ── Clear data (header button) ───────────────────────────────────
document.getElementById('clear-data-btn').addEventListener('click', function () {
  if (confirm('Clear all analytics data? This cannot be undone.')) {
    localStorage.removeItem(KEYS.VISITS);
    renderOverview();
  }
});

// ── Analytics helpers ────────────────────────────────────────────
function getVisits() {
  try {
    var v = JSON.parse(localStorage.getItem(KEYS.VISITS) || '[]');
    return Array.isArray(v) ? v : [];
  } catch (_) {
    return [];
  }
}

// ── Overview: try API first, fall back to localStorage ────────────
function renderOverview() {
  if (authToken) {
    fetch('/api/analytics?token=' + encodeURIComponent(authToken))
      .then(function (res) {
        if (!res.ok) throw new Error('api error');
        return res.json();
      })
      .then(function (d) {
        document.getElementById('total-visits').textContent      = d.stats.total.toLocaleString();
        document.getElementById('unique-ips').textContent        = d.stats.unique.toLocaleString();
        document.getElementById('unique-countries').textContent  = d.countries.length.toLocaleString();
        var today = new Date().toISOString().slice(0, 10);
        var todayEntry = d.dailyVisits.find(function (dv) { return dv.date === today; });
        document.getElementById('today-visits').textContent = todayEntry ? todayEntry.count : 0;
        renderCountriesChartFromData(d.countries);
        drawVisitsChartFromDailyData(d.dailyVisits);
      })
      .catch(function () {
        renderOverviewFromLocalStorage();
      });
  } else {
    renderOverviewFromLocalStorage();
  }
}

function renderOverviewFromLocalStorage() {
  var visits = getVisits();
  document.getElementById('total-visits').textContent = visits.length.toLocaleString();

  var countries = new Set(visits.map(function (v) { return v.country; }).filter(Boolean));
  document.getElementById('unique-countries').textContent = countries.size;

  var ips = new Set(visits.map(function (v) { return v.ip; }).filter(Boolean));
  document.getElementById('unique-ips').textContent = ips.size;

  var today = new Date().toDateString();
  var todayCount = visits.filter(function (v) {
    return v.timestamp && new Date(v.timestamp).toDateString() === today;
  }).length;
  document.getElementById('today-visits').textContent = todayCount;

  drawVisitsChart(visits);
  renderCountriesChart(visits);
}

// ── Visits bar chart ─────────────────────────────────────────────
function drawVisitsChart(visits) {
  var days   = {};
  var labels = [];
  for (var i = 13; i >= 0; i--) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    var key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    days[key] = 0;
    labels.push(key);
  }
  visits.forEach(function (v) {
    var key = v.timestamp
      ? new Date(v.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : null;
    if (key && Object.prototype.hasOwnProperty.call(days, key)) days[key]++;
  });
  drawBars(labels, labels.map(function (l) { return days[l]; }));
}

function drawVisitsChartFromDailyData(dailyVisits) {
  var slice = dailyVisits.slice(-14);
  var labels = [];
  var values = [];
  slice.forEach(function (dv) {
    var d = new Date(dv.date + 'T00:00:00');
    labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    values.push(dv.count);
  });
  drawBars(labels, values);
}

function drawBars(labels, values) {
  var canvas   = document.getElementById('visits-chart');
  var emptyMsg = document.getElementById('visits-chart-empty');
  if (!canvas) return;

  var maxVal  = Math.max.apply(null, values.concat([1]));
  var hasData = values.some(function (v) { return v > 0; });

  if (!hasData) {
    canvas.hidden = true;
    if (emptyMsg) emptyMsg.hidden = false;
    return;
  }
  canvas.hidden = false;
  if (emptyMsg) emptyMsg.hidden = true;

  var dpr    = window.devicePixelRatio || 1;
  var width  = canvas.parentElement.clientWidth || 400;
  var height = 170;
  canvas.width  = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width  = width + 'px';
  canvas.style.height = height + 'px';

  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  var pad = { top: 24, right: 10, bottom: 44, left: 34 };
  var cw  = width  - pad.left - pad.right;
  var ch  = height - pad.top  - pad.bottom;
  var bw  = cw / labels.length;

  // Grid lines
  ctx.strokeStyle = 'rgba(51,65,85,.5)';
  ctx.lineWidth   = 1;
  [0.25, 0.5, 0.75, 1].forEach(function (ratio) {
    var y = pad.top + ch * (1 - ratio);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + cw, y);
    ctx.stroke();
    ctx.fillStyle = '#475569';
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(maxVal * ratio), pad.left - 4, y + 3);
  });

  // Bars
  labels.forEach(function (label, i) {
    var val  = values[i];
    var barH = (val / maxVal) * ch;
    var x    = pad.left + i * bw + bw * 0.15;
    var y    = pad.top + ch - barH;
    var w    = bw * 0.7;

    if (val > 0) {
      var grad = ctx.createLinearGradient(x, y, x, y + barH);
      grad.addColorStop(0, '#6366f1');
      grad.addColorStop(1, '#4f46e5');
      ctx.fillStyle = grad;
      ctx.roundRect(x, y, w, barH, 3);
      ctx.fill();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(val, x + w / 2, y - 5);
    }

    if (i % 2 === 0 || labels.length <= 7) {
      ctx.fillStyle = '#64748b';
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + w / 2, height - pad.bottom + 14);
    }
  });

  // Y-axis line
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + ch);
  ctx.stroke();
}

// ── Countries bar chart ──────────────────────────────────────────
function renderCountriesChart(visits) {
  var countMap = {};
  visits.forEach(function (v) {
    if (v.country) countMap[v.country] = (countMap[v.country] || 0) + 1;
  });
  var sorted = Object.entries(countMap)
    .sort(function (a, b) { return b[1] - a[1]; })
    .slice(0, 8)
    .map(function (e) { return { country: e[0], count: e[1] }; });
  renderCountriesChartFromData(sorted);
}

function renderCountriesChartFromData(countries) {
  var container = document.getElementById('countries-chart');
  if (!container) return;
  if (!countries || countries.length === 0) {
    container.innerHTML = '<p class="chart-empty">No country data yet.</p>';
    return;
  }
  var maxCount = countries[0].count;
  container.innerHTML = countries.slice(0, 8).map(function (entry) {
    var pct = ((entry.count / maxCount) * 100).toFixed(1);
    return [
      '<div class="country-bar-row">',
      '  <span class="country-name" title="' + escHtml(entry.country) + '">' + escHtml(entry.country) + '</span>',
      '  <div class="country-bar-track">',
      '    <div class="country-bar-fill" style="width:' + pct + '%"></div>',
      '  </div>',
      '  <span class="country-count">' + entry.count + '</span>',
      '</div>'
    ].join('');
  }).join('');
}

// ── Visitors table ────────────────────────────────────────────────
function renderVisitorsTable(search) {
  search = (search || '').toLowerCase();
  var visits = getVisits().slice().reverse();

  filteredVisits = search
    ? visits.filter(function (v) {
        return (v.ip      || '').toLowerCase().indexOf(search) !== -1 ||
               (v.country || '').toLowerCase().indexOf(search) !== -1 ||
               (v.city    || '').toLowerCase().indexOf(search) !== -1 ||
               (v.referrer|| '').toLowerCase().indexOf(search) !== -1;
      })
    : visits;

  renderPage(1);
}

function renderPage(page) {
  var total      = filteredVisits.length;
  var totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  currentPage    = Math.max(1, Math.min(page, totalPages));

  var start = (currentPage - 1) * PAGE_SIZE;
  var slice = filteredVisits.slice(start, start + PAGE_SIZE);
  var tbody = document.getElementById('visitors-tbody');

  if (slice.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No visitor data yet. Visits to your portfolio will appear here.</td></tr>';
  } else {
    tbody.innerHTML = slice.map(function (v, i) {
      return [
        '<tr>',
        '<td class="td-num">' + (start + i + 1) + '</td>',
        '<td class="td-time">' + formatTime(v.timestamp) + '</td>',
        '<td class="td-ip"><code>' + escHtml(v.ip || '—') + '</code></td>',
        '<td class="td-country">',
        v.countryCode ? '<span class="flag-emoji">' + flagEmoji(v.countryCode) + '</span> ' : '',
        escHtml(v.country || '—'),
        '</td>',
        '<td>' + escHtml(v.city || '—') + '</td>',
        '<td class="td-ref">' + escHtml(truncate(v.referrer || 'Direct', 35)) + '</td>',
        '<td class="td-device">' + deviceIcon(v.userAgent || '') + '</td>',
        '</tr>'
      ].join('');
    }).join('');
  }

  document.getElementById('page-info').textContent =
    'Page ' + currentPage + ' of ' + totalPages + ' (' + total + ' total)';
  document.getElementById('prev-page').disabled = currentPage <= 1;
  document.getElementById('next-page').disabled = currentPage >= totalPages;
}

document.getElementById('visitor-search').addEventListener('input', function () {
  renderVisitorsTable(this.value);
});

document.getElementById('prev-page').addEventListener('click', function () {
  renderPage(currentPage - 1);
});

document.getElementById('next-page').addEventListener('click', function () {
  renderPage(currentPage + 1);
});

// ── Content management ────────────────────────────────────────────
function loadContentForms() {
  var loadingEl = document.getElementById('content-loading');
  var formEl    = document.getElementById('content-form');
  loadingEl.hidden = false;
  formEl.hidden    = true;

  fetch('/api/content')
    .then(function (res) {
      if (!res.ok) throw new Error('Server error ' + res.status);
      return res.json();
    })
    .then(function (c) {
      populateContentForms(c);
      try { localStorage.setItem(KEYS.CONTENT, JSON.stringify(c)); } catch (_) {}
      loadingEl.hidden = true;
      formEl.hidden    = false;
    })
    .catch(function () {
      var cached = getJSON(KEYS.CONTENT, null);
      if (cached) populateContentForms(cached);
      loadingEl.hidden = true;
      formEl.hidden    = false;
    });
}

function populateContentForms(c) {
  if (!c) return;

  document.getElementById('photo-url').value       = c.profilePic   || '';
  document.getElementById('profile-name').value    = c.name         || '';
  document.getElementById('profile-title').value   = c.title        || '';
  document.getElementById('profile-tagline').value = c.tagline      || '';

  document.getElementById('contact-email').value    = c.email       || '';
  document.getElementById('contact-phone').value    = c.phone       || '';
  document.getElementById('contact-github').value   = c.githubUrl   || '';
  document.getElementById('contact-linkedin').value = c.linkedinUrl || '';
  document.getElementById('contact-location').value = c.location    || '';

  document.getElementById('about-text').value = c.aboutText || '';

  document.getElementById('skills-json').value     = prettyJSON(c.skills);
  document.getElementById('experience-json').value = prettyJSON(c.experience);
  document.getElementById('projects-json').value   = prettyJSON(c.projects);
  document.getElementById('education-json').value  = prettyJSON(c.education);

  document.getElementById('intro-video').value    = c.featuredVideo || '';
  document.getElementById('showcase-image').value = Array.isArray(c.heroImages)
    ? c.heroImages.join('\n') : '';

  updateAvatarPreview(c.profilePic || '');
}

function prettyJSON(val) {
  if (Array.isArray(val) && val.length) {
    try { return JSON.stringify(val, null, 2); } catch (_) {}
  }
  return '';
}

document.getElementById('photo-url').addEventListener('input', function () {
  updateAvatarPreview(this.value.trim());
});

function updateAvatarPreview(url) {
  var el = document.getElementById('avatar-preview');
  if (url) {
    var img = document.createElement('img');
    img.src = url;
    img.alt = 'Profile photo';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%';
    img.onerror = function () { el.textContent = 'AR'; };
    el.textContent = '';
    el.appendChild(img);
  } else {
    el.textContent = 'AR';
  }
}

// ── Shared: parse a JSON array field ─────────────────────────────
function parseJSONArray(fieldId) {
  var el = document.getElementById(fieldId);
  if (!el || !el.value.trim()) return { ok: true, value: [] };
  try {
    var parsed = JSON.parse(el.value);
    if (!Array.isArray(parsed)) throw new Error('Must be a JSON array');
    return { ok: true, value: parsed };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── Shared: show save status message ─────────────────────────────
function showSaveStatus(msgId, ok, msg) {
  var el = document.getElementById(msgId);
  if (!el) return;
  el.textContent = ok ? '✓ Saved' : ('✗ ' + (msg || 'Error'));
  el.className   = ok ? 'save-status' : 'save-status err';
  el.hidden = false;
  setTimeout(function () { el.hidden = true; }, 4000);
}

// ── Shared: POST payload to /api/content ─────────────────────────
function saveToAPI(payload, msgId) {
  var url = authToken
    ? '/api/content?token=' + encodeURIComponent(authToken)
    : '/api/content';

  fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload)
  })
  .then(function (res) {
    if (res.status === 401) throw new Error('Session expired. Please sign in again.');
    if (!res.ok) throw new Error('Server error ' + res.status);
    return res.json();
  })
  .then(function (data) {
    // Update local cache so overrides.js picks up changes immediately
    try { localStorage.setItem(KEYS.CONTENT, JSON.stringify(data.content)); } catch (_) {}
    showSaveStatus(msgId, true);
  })
  .catch(function (err) {
    // In fallback mode (no server token) just write to local cache
    if (!authToken) {
      var cached = getJSON(KEYS.CONTENT, {});
      Object.assign(cached, payload);
      try { localStorage.setItem(KEYS.CONTENT, JSON.stringify(cached)); } catch (_) {}
      showSaveStatus(msgId, true);
    } else {
      showSaveStatus(msgId, false, err.message);
    }
  });
}

// ── Profile save ──────────────────────────────────────────────────
document.getElementById('save-profile').addEventListener('click', function () {
  saveToAPI({
    profilePic: document.getElementById('photo-url').value.trim(),
    name:       document.getElementById('profile-name').value.trim(),
    title:      document.getElementById('profile-title').value.trim(),
    tagline:    document.getElementById('profile-tagline').value.trim()
  }, 'profile-save-msg');
});

// ── Contact save ──────────────────────────────────────────────────
document.getElementById('save-contact').addEventListener('click', function () {
  saveToAPI({
    email:       document.getElementById('contact-email').value.trim(),
    phone:       document.getElementById('contact-phone').value.trim(),
    githubUrl:   document.getElementById('contact-github').value.trim(),
    linkedinUrl: document.getElementById('contact-linkedin').value.trim(),
    location:    document.getElementById('contact-location').value.trim()
  }, 'contact-save-msg');
});

// ── About save ────────────────────────────────────────────────────
document.getElementById('save-about').addEventListener('click', function () {
  saveToAPI(
    { aboutText: document.getElementById('about-text').value.trim() },
    'about-save-msg'
  );
});

// ── Skills save ───────────────────────────────────────────────────
document.getElementById('save-skills').addEventListener('click', function () {
  var result = parseJSONArray('skills-json');
  if (!result.ok) { showSaveStatus('skills-save-msg', false, 'Invalid JSON: ' + result.error); return; }
  saveToAPI({ skills: result.value }, 'skills-save-msg');
});

// ── Experience save ───────────────────────────────────────────────
document.getElementById('save-experience').addEventListener('click', function () {
  var result = parseJSONArray('experience-json');
  if (!result.ok) { showSaveStatus('experience-save-msg', false, 'Invalid JSON: ' + result.error); return; }
  saveToAPI({ experience: result.value }, 'experience-save-msg');
});

// ── Projects save ─────────────────────────────────────────────────
document.getElementById('save-projects').addEventListener('click', function () {
  var result = parseJSONArray('projects-json');
  if (!result.ok) { showSaveStatus('projects-save-msg', false, 'Invalid JSON: ' + result.error); return; }
  saveToAPI({ projects: result.value }, 'projects-save-msg');
});

// ── Education save ────────────────────────────────────────────────
document.getElementById('save-education').addEventListener('click', function () {
  var result = parseJSONArray('education-json');
  if (!result.ok) { showSaveStatus('education-save-msg', false, 'Invalid JSON: ' + result.error); return; }
  saveToAPI({ education: result.value }, 'education-save-msg');
});

// ── Media save ────────────────────────────────────────────────────
document.getElementById('save-media').addEventListener('click', function () {
  var rawVideo = document.getElementById('intro-video').value.trim();
  var videoUrl = '';
  if (rawVideo) {
    // Only allow embeds from YouTube and Vimeo to prevent malicious iframe injection
    var ALLOWED_VIDEO = /^https:\/\/(www\.)?(youtube\.com\/embed\/|player\.vimeo\.com\/video\/)/;
    if (ALLOWED_VIDEO.test(rawVideo)) {
      videoUrl = rawVideo;
    } else {
      showSaveStatus('media-save-msg', false, 'Use a YouTube embed (…/embed/…) or Vimeo embed URL.');
      return;
    }
  }
  var heroImages = document.getElementById('showcase-image').value
    .split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
  saveToAPI({ featuredVideo: videoUrl, heroImages: heroImages }, 'media-save-msg');
});

// ── Settings ──────────────────────────────────────────────────────
function loadSettings() {
  var visits = getVisits();
  var info   = document.getElementById('data-info');
  try {
    var bytes = new TextEncoder().encode(JSON.stringify(visits)).length;
    info.textContent = 'Stored visits: ' + visits.length + ' / 500  ·  ~' +
      Math.round(bytes / 1024) + ' KB';
  } catch (_) {
    info.textContent = 'Stored visits: ' + visits.length;
  }
}

document.getElementById('clear-analytics').addEventListener('click', function () {
  if (confirm('Clear all analytics data? This cannot be undone.')) {
    localStorage.removeItem(KEYS.VISITS);
    loadSettings();
    renderOverview();
  }
});

document.getElementById('export-data').addEventListener('click', function () {
  var visits = getVisits();
  var blob = new Blob([JSON.stringify(visits, null, 2)], { type: 'application/json' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = 'allan-portfolio-analytics.json';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('change-password-form').addEventListener('submit', function (e) {
  e.preventDefault();
  var current = document.getElementById('current-password').value;
  var newPwd  = document.getElementById('new-password').value;
  var confirm = document.getElementById('confirm-password').value;
  var errEl   = document.getElementById('pwd-error');
  var okEl    = document.getElementById('pwd-success');

  errEl.hidden = true;
  okEl.hidden  = true;

  sha256(current).then(function (currentHash) {
    if (currentHash !== getStoredHash()) {
      errEl.textContent = 'Current password is incorrect.';
      errEl.hidden = false;
      return;
    }
    if (newPwd !== confirm) {
      errEl.textContent = 'New passwords do not match.';
      errEl.hidden = false;
      return;
    }
    if (newPwd.length < 6) {
      errEl.textContent = 'New password must be at least 6 characters.';
      errEl.hidden = false;
      return;
    }
    sha256(newPwd).then(function (newHash) {
      localStorage.setItem(KEYS.PWD, newHash);
      okEl.hidden = false;
      document.getElementById('change-password-form').reset();
    });
  });
});

// ── Helpers ───────────────────────────────────────────────────────
function formatTime(ts) {
  if (!ts) return '—';
  var d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function truncate(str, len) {
  return str.length > len ? str.slice(0, len) + '…' : str;
}

function deviceIcon(ua) {
  if (!ua) return '—';
  if (/Mobile|Android|iPhone/i.test(ua)) return '📱 Mobile';
  if (/Tablet|iPad/i.test(ua))           return '📟 Tablet';
  return '🖥️ Desktop';
}

function flagEmoji(code) {
  if (!code || code.length !== 2) return '';
  var pts = code.toUpperCase().split('').map(function (c) {
    return 127397 + c.charCodeAt(0);
  });
  return String.fromCodePoint.apply(null, pts);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Bootstrap ─────────────────────────────────────────────────────
if (authToken) {
  showDashboard();
} else {
  showLogin();
}
