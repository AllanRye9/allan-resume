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

// ===== Apply content overrides from admin panel =====
(function applyContentOverrides() {
  const raw = localStorage.getItem('cv_content_override');
  if (!raw) return;
  let c;
  try { c = JSON.parse(raw); } catch { return; }

  // Profile picture
  if (c.profilePic) {
    const safePic = safeUrl(c.profilePic);
    if (safePic) {
      const avatar = document.querySelector('.hero-avatar');
      if (avatar) {
        const img = document.createElement('img');
        img.src   = safePic;
        img.alt   = `${c.name || 'Profile'} photo`;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:inherit;';
        img.onerror = () => img.remove(); // fall back to initials on error
        avatar.insertBefore(img, avatar.firstChild);
      }
    }
  }

  // Name
  if (c.name) {
    const h1 = document.querySelector('.hero-text h1');
    if (h1) h1.textContent = c.name;
  }

  // Title
  if (c.title) {
    const titleEl = document.querySelector('.hero-text .title');
    if (titleEl) titleEl.textContent = c.title;
  }

  // Tagline
  if (c.tagline) {
    const taglineEl = document.querySelector('.hero-text .tagline');
    if (taglineEl) taglineEl.textContent = c.tagline;
  }

  // Email
  if (c.email) {
    document.querySelectorAll('a[href^="mailto:"]').forEach(el => {
      el.href        = 'mailto:' + c.email;
      el.textContent = c.email;
    });
  }

  // Matches international phone numbers (digits, spaces, dashes, parentheses, +)
  const PHONE_NUMBER_PATTERN = /^\+?[\d\s\-().]+$/;

  // Phone
  if (c.phone) {
    document.querySelectorAll('.contact-item').forEach(el => {
      if (el.querySelector('a[href^="mailto:"]')) return; // skip email items
      if (!el.querySelector('a')) {
        // plain text phone item
        const text = el.textContent.trim();
        if (PHONE_NUMBER_PATTERN.test(text)) {
          // replace text node only
          el.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
              node.textContent = ' ' + c.phone;
            }
          });
        }
      }
    });
  }

  /**
   * Safely resolve a URL from stored content. Returns the URL string only if
   * it has an http/https scheme, preventing javascript: or data: injection.
   */
  function safeUrl(raw) {
    try {
      const p = new URL(raw);
      return (p.protocol === 'https:' || p.protocol === 'http:') ? p.href : null;
    } catch { return null; }
  }

  // GitHub URL
  if (c.githubUrl) {
    const safe = safeUrl(c.githubUrl);
    if (safe) {
      document.querySelectorAll('a[href*="github.com"]').forEach(el => {
        el.href = safe;
        // Only update display text when it already shows a github.com address
        try {
          const existing = new URL(el.textContent.trim());
          if (existing.hostname === 'github.com' || existing.hostname.endsWith('.github.com')) {
            el.textContent = safe.replace(/^https?:\/\//, '');
          }
        } catch { /* text isn't a URL — leave it unchanged */ }
      });
    }
  }

  // LinkedIn URL
  if (c.linkedinUrl) {
    const safe = safeUrl(c.linkedinUrl);
    if (safe) {
      document.querySelectorAll('a[href*="linkedin.com"]').forEach(el => {
        el.href = safe;
        try {
          const existing = new URL(el.textContent.trim());
          if (existing.hostname === 'linkedin.com' || existing.hostname.endsWith('.linkedin.com')) {
            el.textContent = safe.replace(/^https?:\/\//, '');
          }
        } catch { /* text isn't a URL — leave it unchanged */ }
      });
    }
  }

  // Location
  if (c.location) {
    const locEl = document.getElementById('contact-location-text');
    if (locEl) locEl.textContent = c.location;
  }

  // Featured video — inject after the hero section
  if (c.featuredVideo) {
    // Only allow http/https URLs to prevent javascript: XSS
    let videoUrl;
    try {
      const parsed = new URL(c.featuredVideo);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        videoUrl = parsed.href;
      }
    } catch { /* invalid URL — skip */ }

    if (videoUrl) {
      const heroSection = document.querySelector('#hero');
      if (heroSection) {
        const wrapper = document.createElement('section');
        wrapper.id    = 'featured-video';
        wrapper.style.cssText = 'background:var(--bg-secondary);padding:2rem 1.5rem;text-align:center;';

        const heading = document.createElement('h2');
        heading.textContent = 'Featured Video';
        heading.style.cssText = 'font-size:1.2rem;margin-bottom:1rem;color:var(--text-secondary);';

        const container = document.createElement('div');
        container.style.cssText = 'max-width:720px;margin:0 auto;aspect-ratio:16/9;border-radius:12px;overflow:hidden;box-shadow:var(--shadow-lg);';

        const iframe = document.createElement('iframe');
        iframe.src           = videoUrl;
        iframe.style.cssText = 'width:100%;height:100%;border:none;';
        iframe.allowFullscreen = true;
        iframe.loading       = 'lazy';
        iframe.title         = 'Featured video';

        container.appendChild(iframe);
        wrapper.appendChild(heading);
        wrapper.appendChild(container);
        heroSection.insertAdjacentElement('afterend', wrapper);
      }
    }
  }

  // Hero image gallery
  if (Array.isArray(c.heroImages) && c.heroImages.length) {
    const heroSection = document.querySelector('#hero');
    if (heroSection) {
      const gallery = document.createElement('div');
      gallery.style.cssText = 'display:flex;flex-wrap:wrap;gap:.75rem;justify-content:center;padding:1.5rem;background:var(--bg-secondary);';
      c.heroImages.forEach(url => {
        const safeImgUrl = safeUrl(url);
        if (!safeImgUrl) return;
        const img = document.createElement('img');
        img.src   = safeImgUrl;
        img.alt   = 'Gallery image';
        img.style.cssText = 'height:120px;width:auto;object-fit:cover;border-radius:8px;box-shadow:var(--shadow-sm);';
        img.onerror = () => img.remove();
        gallery.appendChild(img);
      });
      const insertTarget = document.querySelector('#featured-video') || heroSection;
      insertTarget.insertAdjacentElement('afterend', gallery);
    }
  }
}());
