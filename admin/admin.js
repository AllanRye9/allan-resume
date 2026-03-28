/* ===================================================================
   Admin Dashboard — JavaScript
   Handles: auth, tab navigation, analytics display, content mgmt
   =================================================================== */
'use strict';

// ── Storage Keys ─────────────────────────────────────────────────
var KEYS = {
  VISITS:  'ar_visits',
  PROFILE: 'ar_profile',
  CONTACT: 'ar_contact',
  MEDIA:   'ar_media',
  PWD:     'ar_admin_hash',
  SESSION: 'ar_admin_session'
};

// SHA-256 hash of the default password "admin123"
var DEFAULT_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';

var PAGE_SIZE = 20;
var currentPage = 1;
var filteredVisits = [];

// ── Utility: SHA-256 via Web Crypto API ──────────────────────────
async function sha256(msg) {
  var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(buf)).map(function (b) {
    return b.toString(16).padStart(2, '0');
  }).join('');
}

// ── Utility: safe JSON parse ─────────────────────────────────────
function getJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') || fallback;
  } catch (_) {
    return fallback;
  }
}

// ── Utility: stored password hash ───────────────────────────────
function getStoredHash() {
  return localStorage.getItem(KEYS.PWD) || DEFAULT_HASH;
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

// ── Auth ─────────────────────────────────────────────────────────
function isAuthenticated() {
  return sessionStorage.getItem(KEYS.SESSION) === '1';
}

function setAuthenticated(val) {
  if (val) {
    sessionStorage.setItem(KEYS.SESSION, '1');
  } else {
    sessionStorage.removeItem(KEYS.SESSION);
  }
}

// ── DOM references ───────────────────────────────────────────────
var loginScreen = document.getElementById('login-screen');
var dashboard   = document.getElementById('dashboard');
var sidebar     = document.getElementById('sidebar');

function showDashboard() {
  loginScreen.hidden = true;
  dashboard.hidden = false;
  document.body.classList.remove('login-page');
  switchTab('overview');
}

function showLogin() {
  loginScreen.hidden = false;
  dashboard.hidden = true;
  document.body.classList.add('login-page');
}

// ── Login form ───────────────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', function (e) {
  e.preventDefault();
  var pwd = document.getElementById('password').value;
  var errEl = document.getElementById('login-error');

  sha256(pwd).then(function (hash) {
    if (hash === getStoredHash()) {
      setAuthenticated(true);
      showDashboard();
    } else {
      errEl.hidden = false;
      setTimeout(function () { errEl.hidden = true; }, 4000);
    }
  });
});

// ── Logout ───────────────────────────────────────────────────────
document.getElementById('logout-btn').addEventListener('click', function () {
  setAuthenticated(false);
  showLogin();
});

// ── Sidebar toggle (mobile) ──────────────────────────────────────
document.getElementById('sidebar-toggle').addEventListener('click', function () {
  sidebar.classList.toggle('open');
});

// Close sidebar when clicking a nav link on mobile
sidebar.querySelectorAll('.nav-item').forEach(function (item) {
  item.addEventListener('click', function () {
    if (window.innerWidth <= 768) sidebar.classList.remove('open');
  });
});

// ── Tab navigation ───────────────────────────────────────────────
document.querySelectorAll('.nav-item[data-tab]').forEach(function (item) {
  item.addEventListener('click', function (e) {
    e.preventDefault();
    switchTab(this.dataset.tab);
  });
});

var TAB_META = {
  overview: ['Overview',           'Welcome to your admin dashboard'],
  visitors: ['Visitor Log',        'Detailed visitor tracking data'],
  content:  ['Content Management', 'Update your portfolio content'],
  settings: ['Settings',           'Configure your admin panel']
};

function switchTab(tabName) {
  // Highlight active nav item
  document.querySelectorAll('.nav-item[data-tab]').forEach(function (item) {
    item.classList.toggle('active', item.dataset.tab === tabName);
  });

  // Show/hide sections
  document.querySelectorAll('.tab-content').forEach(function (section) {
    section.hidden = section.dataset.tabSection !== tabName;
  });

  // Update header
  var meta = TAB_META[tabName] || [tabName, ''];
  document.getElementById('page-title').textContent    = meta[0];
  document.getElementById('page-subtitle').textContent = meta[1];

  // Load data for each tab
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

// ── Overview: stats + charts ─────────────────────────────────────
function renderOverview() {
  var visits = getVisits();

  document.getElementById('total-visits').textContent =
    visits.length.toLocaleString();

  var countries = new Set(visits.map(function (v) { return v.country; }).filter(Boolean));
  document.getElementById('unique-countries').textContent = countries.size;

  var ips = new Set(visits.map(function (v) { return v.ip; }).filter(Boolean));
  document.getElementById('unique-ips').textContent = ips.size;

  var today = new Date().toDateString();
  var todayCount = visits.filter(function (v) {
    return new Date(v.timestamp).toDateString() === today;
  }).length;
  document.getElementById('today-visits').textContent = todayCount;

  drawVisitsChart(visits);
  renderCountriesChart(visits);
}

// ── Visits bar chart (Canvas) ─────────────────────────────────────
function drawVisitsChart(visits) {
  var canvas = document.getElementById('visits-chart');
  var emptyMsg = document.getElementById('visits-chart-empty');
  if (!canvas) return;

  // Build last-14-days bucket
  var days = {};
  var labels = [];
  for (var i = 13; i >= 0; i--) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    var key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    days[key] = 0;
    labels.push(key);
  }

  visits.forEach(function (v) {
    var key = new Date(v.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (Object.prototype.hasOwnProperty.call(days, key)) {
      days[key]++;
    }
  });

  var values = labels.map(function (l) { return days[l]; });
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

  // Subtle grid lines
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
    var val       = values[i];
    var barH      = (val / maxVal) * ch;
    var x         = pad.left + i * bw + bw * 0.15;
    var y         = pad.top + ch - barH;
    var w         = bw * 0.7;

    if (val > 0) {
      var grad = ctx.createLinearGradient(x, y, x, y + barH);
      grad.addColorStop(0, '#6366f1');
      grad.addColorStop(1, '#4f46e5');
      ctx.fillStyle = grad;
      ctx.roundRect(x, y, w, barH, 3);
      ctx.fill();

      // Value label
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(val, x + w / 2, y - 5);
    }

    // X-axis label (every other for readability)
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

// ── Countries horizontal bar chart ───────────────────────────────
function renderCountriesChart(visits) {
  var container = document.getElementById('countries-chart');
  if (!container) return;

  var countMap = {};
  visits.forEach(function (v) {
    if (v.country) {
      countMap[v.country] = (countMap[v.country] || 0) + 1;
    }
  });

  var sorted = Object.entries(countMap).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8);

  if (sorted.length === 0) {
    container.innerHTML = '<p class="chart-empty">No country data yet.</p>';
    return;
  }

  var maxCount = sorted[0][1];
  container.innerHTML = sorted.map(function (entry) {
    var country = entry[0];
    var count   = entry[1];
    var pct     = ((count / maxCount) * 100).toFixed(1);
    return [
      '<div class="country-bar-row">',
      '  <span class="country-name" title="' + country + '">' + country + '</span>',
      '  <div class="country-bar-track">',
      '    <div class="country-bar-fill" style="width:' + pct + '%"></div>',
      '  </div>',
      '  <span class="country-count">' + count + '</span>',
      '</div>'
    ].join('');
  }).join('');
}

// ── Visitors table ────────────────────────────────────────────────
function renderVisitorsTable(search) {
  search = (search || '').toLowerCase();
  var visits = getVisits().slice().reverse(); // newest first

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
  var profile = getJSON(KEYS.PROFILE, {});
  var contact = getJSON(KEYS.CONTACT, {});
  var media   = getJSON(KEYS.MEDIA,   {});

  document.getElementById('photo-url').value      = profile.photoUrl || '';
  document.getElementById('profile-name').value   = profile.name    || '';
  document.getElementById('profile-title').value  = profile.title   || '';

  document.getElementById('contact-email').value    = contact.email    || '';
  document.getElementById('contact-phone').value    = contact.phone    || '';
  document.getElementById('contact-github').value   = contact.github   || '';
  document.getElementById('contact-linkedin').value = contact.linkedin || '';
  document.getElementById('contact-location').value = contact.location || '';

  document.getElementById('intro-video').value    = media.videoUrl      || '';
  document.getElementById('showcase-image').value = media.showcaseImage || '';

  updateAvatarPreview(profile.photoUrl);
}

document.getElementById('photo-url').addEventListener('input', function () {
  updateAvatarPreview(this.value.trim());
});

function updateAvatarPreview(url) {
  var el = document.getElementById('avatar-preview');
  if (url) {
    el.innerHTML = '<img src="' + escHtml(url) + '" alt="Profile photo" ' +
      'style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
  } else {
    el.textContent = 'AR';
  }
}

function showSaveMsg() {
  var msg = document.getElementById('content-save-msg');
  msg.hidden = false;
  setTimeout(function () { msg.hidden = true; }, 5000);
}

document.getElementById('save-profile').addEventListener('click', function () {
  localStorage.setItem(KEYS.PROFILE, JSON.stringify({
    photoUrl: document.getElementById('photo-url').value.trim(),
    name:     document.getElementById('profile-name').value.trim(),
    title:    document.getElementById('profile-title').value.trim()
  }));
  showSaveMsg();
});

document.getElementById('save-contact').addEventListener('click', function () {
  localStorage.setItem(KEYS.CONTACT, JSON.stringify({
    email:    document.getElementById('contact-email').value.trim(),
    phone:    document.getElementById('contact-phone').value.trim(),
    github:   document.getElementById('contact-github').value.trim(),
    linkedin: document.getElementById('contact-linkedin').value.trim(),
    location: document.getElementById('contact-location').value.trim()
  }));
  showSaveMsg();
});

document.getElementById('save-media').addEventListener('click', function () {
  localStorage.setItem(KEYS.MEDIA, JSON.stringify({
    videoUrl:      document.getElementById('intro-video').value.trim(),
    showcaseImage: document.getElementById('showcase-image').value.trim()
  }));
  showSaveMsg();
});

// ── Settings ──────────────────────────────────────────────────────
function loadSettings() {
  var visits = getVisits();
  var info = document.getElementById('data-info');
  try {
    var bytes = new TextEncoder().encode(JSON.stringify(visits)).length;
    info.textContent = 'Stored visits: ' + visits.length + ' / 500 · ' +
      'Data: ~' + Math.round(bytes / 1024) + ' KB';
  } catch (_) {
    info.textContent = 'Stored visits: ' + visits.length + ' / 500';
  }
}

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
if (isAuthenticated()) {
  showDashboard();
} else {
  showLogin();
}
