// ===== Navbar scroll effect =====
const navbar = document.querySelector('.navbar');
const backToTop = document.querySelector('.back-to-top');

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

  // ===== Back to top =====
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

  // Close nav on link click (mobile)
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

// ===== Download PDF =====
function downloadPDF() {
  const element = document.getElementById('cv-content');

  // Use html2pdf.js if available, otherwise fall back to print dialog
  if (typeof html2pdf !== 'undefined' && element) {
    const opt = {
      margin:       [0, 0, 0, 0],
      filename:     'Allan_Rye_CV.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };
    html2pdf().set(opt).from(element).save();
  } else {
    // Graceful fallback — open print dialog (save as PDF)
    window.print();
  }
}

// Attach to all download buttons
document.querySelectorAll('[data-action="download-pdf"]').forEach(btn => {
  btn.addEventListener('click', downloadPDF);
});

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

    // Use sendBeacon when available (non-blocking, survives page unload)
    const apiBase = (typeof window.__API_BASE__ === 'string' ? window.__API_BASE__ : '');
    const trackUrl = apiBase + '/api/track';
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(trackUrl, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(trackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  }

  // Send initial visit
  sendTrack();

  // On page unload, include time-on-page in seconds
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      const duration = Math.round((Date.now() - startTime) / 1000);
      sendTrack(duration);
    }
  });
}());

