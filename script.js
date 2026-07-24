// ===== Navbar scroll effect =====
const navbar = document.querySelector('.navbar');
const backToTop = document.querySelector('.back-to-top');

// ===== Theme toggle =====
(function () {
  var THEME_KEY = 'ar_theme';
  var root = document.documentElement;
  var toggleBtn = document.getElementById('theme-toggle');
  var iconSun  = toggleBtn && toggleBtn.querySelector('.icon-sun');
  var iconMoon = toggleBtn && toggleBtn.querySelector('.icon-moon');

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (iconSun && iconMoon) {
      iconSun.hidden  = theme === 'dark';
      iconMoon.hidden = theme !== 'dark';
    }
  }

  var saved = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(saved);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem(THEME_KEY, next);
    });
  }
}());

if (navbar && backToTop) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    if (window.scrollY > 400) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }

    updateActiveNavLink();
  });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ===== Mobile hamburger =====
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    const expanded = navLinks.classList.contains('open');
    hamburger.setAttribute('aria-expanded', expanded);
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => navLinks.classList.remove('open'));
  });
}

// ===== Active nav link on scroll =====
const sections = document.querySelectorAll('.section[id], .hero[id]');
const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

function updateActiveNavLink() {
  let current = '';
  sections.forEach(section => {
    const top = section.offsetTop - 80;
    if (window.scrollY >= top) {
      current = '#' + section.id;
    }
  });

  navAnchors.forEach(anchor => {
    anchor.classList.remove('active');
    if (anchor.getAttribute('href') === current) {
      anchor.classList.add('active');
    }
  });
}

// ===== Animate elements on scroll (Intersection Observer) =====
const animateOnScroll = document.querySelectorAll(
  '.stat-card, .skill-category, .timeline-card, .project-card, .edu-card'
);

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

animateOnScroll.forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});

// ===== Update year in footer =====
const yearEl = document.getElementById('current-year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ===== PROFILE PICTURE (added) =====
document.addEventListener('DOMContentLoaded', function() {
  const avatar = document.querySelector('.hero-avatar');
  if (avatar) {
    // Create image element
    const img = document.createElement('img');
    img.src = 'https://avatars.githubusercontent.com/u/34004636?v=4'; 
    img.alt = 'Profile picture of Oryema Allan';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '50%';
    img.style.display = 'block';

    // Fallback: if image fails, show initials again
    img.onerror = function() {
      avatar.innerHTML = 'AR';   // revert to original initials
      avatar.style.display = 'flex';
      avatar.style.alignItems = 'center';
      avatar.style.justifyContent = 'center';
      avatar.style.fontSize = '2.4rem';
      avatar.style.fontWeight = '700';
      avatar.style.color = '#fff';
      avatar.style.background = '#1a73e8'; // keep background
    };

    // Clear avatar and append image
    avatar.innerHTML = '';
    avatar.style.padding = '0';   // remove any padding that might break layout
    avatar.appendChild(img);
  }
});

// ===== Analytics tracking =====
(function trackVisit() {
  const startTime = Date.now();

  function sendTrack(duration) {
    const payload = {
      page:      window.location.pathname,
      referrer:  document.referrer || '',
      userAgent: navigator.userAgent,
    };
    if (typeof duration === 'number') payload.duration = duration;

    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  }

  sendTrack();

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      const duration = Math.round((Date.now() - startTime) / 1000);
      sendTrack(duration);
    }
  });
}());
