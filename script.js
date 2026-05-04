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

  // Load saved preference or default to light
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
  const template = document.getElementById('cv-pdf-template');

  if (typeof html2pdf !== 'undefined' && template) {
    template.innerHTML = buildPDFHTML();

    // Temporarily bring the template into the visible document flow so that
    // html2canvas can render it (off-screen positioning causes blank pages).
    const prevStyle = template.getAttribute('style') || '';
    template.style.cssText = 'position:fixed;top:0;left:0;width:794px;z-index:-9999;opacity:0;pointer-events:none;';

    const nameRaw  = document.getElementById('hero-name')?.textContent?.trim() || 'Oryema_Allan';
    const filename = nameRaw.replace(/\s+/g, '_') + '_CV.pdf';

    const opt = {
      margin:      0,
      filename,
      image:       { type: 'png' },
      html2canvas: { scale: 2, useCORS: true, logging: false, letterRendering: true, scrollX: 0, scrollY: 0 },
      jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:   { mode: ['css', 'legacy'] }
    };
    html2pdf().set(opt).from(template).save().then(function () {
      template.setAttribute('style', prevStyle);
    });
  } else {
    window.print();
  }
}

function buildPDFHTML() {
  const esc = s => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // ── Contact info ─────────────────────────────────────────────────────────
  const name     = document.getElementById('hero-name')?.textContent?.trim() || 'Oryema Allan';
  const titleEl  = document.getElementById('hero-title');
  const subtitle = titleEl?.textContent?.trim() || 'AI & Software Engineer · Senior Software Engineer';
  const email    = document.getElementById('contact-email-link')?.textContent?.trim() || '';
  const phone    = document.getElementById('contact-phone-text')?.textContent?.trim() || '';
  const github   = document.getElementById('contact-github-link')?.textContent?.trim() || '';
  const linkedin = document.getElementById('contact-linkedin-link')?.textContent?.trim() || '';
  const location = document.getElementById('contact-location-text')?.textContent?.trim() || '';
  const contact  = [email, phone, github, linkedin, location].filter(Boolean).join('  |  ');

  // ── About / summary ───────────────────────────────────────────────────────
  const aboutParas = Array.from(document.querySelectorAll('.about-text p'))
    .map(p => p.textContent.trim()).filter(Boolean);
  const summary = aboutParas.join(' ');

  // ── Work experience ───────────────────────────────────────────────────────
  const jobs = Array.from(document.querySelectorAll('.timeline-item')).map(item => {
    const tags = Array.from(item.querySelectorAll('.timeline-tag')).map(t => t.textContent.trim());
    return {
      role:    item.querySelector('.timeline-role')?.textContent?.trim() || '',
      date:    item.querySelector('.timeline-date')?.textContent?.trim() || '',
      company: item.querySelector('.timeline-company')?.textContent?.trim() || '',
      desc:    item.querySelector('.timeline-desc')?.textContent?.trim() || '',
      tags:    tags.join(' · ')
    };
  });

  // ── Skills ────────────────────────────────────────────────────────────────
  const skills = Array.from(document.querySelectorAll('.skill-category')).map(cat => {
    const titleNode  = cat.querySelector('.skill-category-title');
    const iconEl     = titleNode?.querySelector('.skill-category-icon');
    let catName      = titleNode?.textContent?.trim() || '';
    if (iconEl) catName = catName.replace(iconEl.textContent, '').trim();
    const tags = Array.from(cat.querySelectorAll('.skill-tag')).map(t => t.textContent.trim());
    return { category: catName, items: tags.join(', ') };
  });

  // ── Projects (only real article cards, not ai-transform banners) ──────────
  const projects = Array.from(document.querySelectorAll('article.project-card')).map(card => {
    const githubLink = card.querySelector('a.project-link:not(.project-link-live)');
    const liveLink   = card.querySelector('a.project-link-live');
    const techTags   = Array.from(card.querySelectorAll('.tech-tag')).map(t => t.textContent.trim());
    const link       = liveLink?.href || githubLink?.href || '';
    const linkText   = liveLink?.textContent?.trim() || githubLink?.textContent?.trim() || '';
    return {
      title: card.querySelector('.project-title')?.textContent?.trim() || '',
      type:  card.querySelector('.project-type')?.textContent?.trim()  || '',
      desc:  card.querySelector('.project-desc')?.textContent?.trim()  || '',
      tech:  techTags.join(', '),
      link,
      linkText
    };
  });

  // ── Education ─────────────────────────────────────────────────────────────
  const education = Array.from(document.querySelectorAll('.edu-card')).map(card => ({
    degree: card.querySelector('.edu-degree')?.textContent?.trim() || '',
    school: card.querySelector('.edu-school')?.textContent?.trim() || '',
    date:   card.querySelector('.edu-date')?.textContent?.trim()   || '',
    note:   card.querySelector('.edu-note')?.textContent?.trim()   || ''
  }));

  // ── Build HTML ────────────────────────────────────────────────────────────

  const expHTML = jobs.map(j => `
    <div class="cv-pdf-job">
      <div class="cv-pdf-job-header">
        <span class="cv-pdf-job-company">${esc(j.company)}</span>
        <span class="cv-pdf-job-date">${esc(j.date)}</span>
      </div>
      <div class="cv-pdf-job-role">${esc(j.role)}</div>
      <p class="cv-pdf-text">${esc(j.desc)}</p>
      ${j.tags ? `<div class="cv-pdf-tags">${esc(j.tags)}</div>` : ''}
    </div>`).join('');

  const skillsHTML = skills.map(s => `
    <tr>
      <td class="cv-pdf-skill-cat">${esc(s.category)}</td>
      <td class="cv-pdf-skill-list">${esc(s.items)}</td>
    </tr>`).join('');

  const projHTML = projects.map(p => `
    <tr>
      <td class="cv-pdf-proj-name">${esc(p.title)}</td>
      <td class="cv-pdf-proj-desc">${esc(p.desc)}</td>
      <td class="cv-pdf-proj-stack">${esc(p.tech)}</td>
      <td class="cv-pdf-proj-link">${p.link ? `<a href="${esc(p.link)}">${esc(p.linkText || p.link.replace(/^https?:\/\//, ''))}</a>` : ''}</td>
    </tr>`).join('');

  const eduHTML = education.map(e => `
    <div class="cv-pdf-edu">
      <div class="cv-pdf-edu-header">
        <span class="cv-pdf-edu-degree">${esc(e.degree)}</span>
        <span class="cv-pdf-edu-date">${esc(e.date)}</span>
      </div>
      <div class="cv-pdf-edu-detail">${esc(e.school)}${e.note ? ' · ' + esc(e.note) : ''}</div>
    </div>`).join('');

  return `
    <div class="cv-pdf-page">

      <div class="cv-pdf-header">
        <div class="cv-pdf-name">${esc(name)}</div>
        <div class="cv-pdf-subtitle">${esc(subtitle)}</div>
        <div class="cv-pdf-contact">${esc(contact)}</div>
      </div>

      ${summary ? `
      <div class="cv-pdf-section">
        <div class="cv-pdf-section-heading">Professional Summary</div>
        <p class="cv-pdf-text">${esc(summary)}</p>
      </div>` : ''}

      <div class="cv-pdf-section">
        <div class="cv-pdf-section-heading">Work Experience</div>
        ${expHTML}
      </div>

      <div class="cv-pdf-section">
        <div class="cv-pdf-section-heading">Technical Skills</div>
        <table class="cv-pdf-skills-table"><tbody>${skillsHTML}</tbody></table>
      </div>

      <div class="cv-pdf-page-break"></div>

      <div class="cv-pdf-section">
        <div class="cv-pdf-section-heading">Selected Projects</div>
        <table class="cv-pdf-projects-table"><tbody>${projHTML}</tbody></table>
      </div>

      <div class="cv-pdf-section">
        <div class="cv-pdf-section-heading">Education &amp; Certifications</div>
        ${eduHTML}
      </div>

    </div>`;
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

