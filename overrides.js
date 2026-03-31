// ===== Apply Admin Content Overrides =====
// Fetches the latest content from /api/content and applies it to the
// live portfolio DOM so admin changes are reflected without a redeploy.
// Falls back to the cached value in localStorage when the API is unavailable.
(function () {
  'use strict';

  var CACHE_KEY = 'cv_content_override';

  function safeUrl(raw) {
    try {
      var p = new URL(raw);
      return (p.protocol === 'https:' || p.protocol === 'http:') ? p.href : null;
    } catch (_) { return null; }
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function applyOverrides(c) {
    if (!c || typeof c !== 'object') return;

    // ── Profile ───────────────────────────────────────────────────────────────

    if (c.profilePic) {
      var safePic = safeUrl(c.profilePic);
      if (safePic) {
        var avatar = document.getElementById('hero-avatar');
        if (avatar) {
          var img = document.createElement('img');
          img.src = safePic;
          img.alt = 'Profile photo';
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%';
          img.onerror = function () { this.remove(); };
          avatar.textContent = '';
          avatar.appendChild(img);
          avatar.style.padding = '0';
          avatar.style.overflow = 'hidden';
        }
      }
    }

    if (c.name) {
      var nameEl = document.getElementById('hero-name');
      if (nameEl) nameEl.textContent = c.name;
    }

    if (c.title) {
      var titleEl = document.getElementById('hero-title');
      if (titleEl) titleEl.textContent = c.title;
    }

    if (c.tagline) {
      var taglineEl = document.querySelector('.hero-text .tagline');
      if (taglineEl) taglineEl.textContent = c.tagline;
    }

    // ── Contact ───────────────────────────────────────────────────────────────

    if (c.email) {
      var emailLink = document.getElementById('contact-email-link');
      if (emailLink) {
        emailLink.href = 'mailto:' + c.email;
        emailLink.textContent = c.email;
      }
      var footerContact = document.getElementById('footer-contact-link');
      if (footerContact) footerContact.href = 'mailto:' + c.email;
    }

    if (c.phone) {
      var phoneEl = document.getElementById('contact-phone-text');
      if (phoneEl) phoneEl.textContent = c.phone;
    }

    if (c.githubUrl) {
      var ghSafe = safeUrl(c.githubUrl);
      if (ghSafe) {
        var ghLink = document.getElementById('contact-github-link');
        if (ghLink) {
          ghLink.href = ghSafe;
          ghLink.textContent = ghSafe.replace(/^https?:\/\//, '');
        }
        var footerGh = document.getElementById('footer-github-link');
        if (footerGh) footerGh.href = ghSafe;
      }
    }

    if (c.linkedinUrl) {
      var liSafe = safeUrl(c.linkedinUrl);
      if (liSafe) {
        var liLink = document.getElementById('contact-linkedin-link');
        if (liLink) {
          liLink.href = liSafe;
          liLink.textContent = liSafe.replace(/^https?:\/\//, '');
        }
      }
    }

    if (c.location) {
      var locEl = document.getElementById('contact-location-text');
      if (locEl) locEl.textContent = c.location;
    }

    // ── About / Who I Am ─────────────────────────────────────────────────────

    if (c.aboutText && c.aboutText.trim()) {
      var aboutTextEl = document.querySelector('.about-text');
      if (aboutTextEl) {
        var paragraphs = c.aboutText.split(/\n\n+/).map(function (p) { return p.trim(); }).filter(Boolean);
        if (paragraphs.length) {
          aboutTextEl.innerHTML = paragraphs.map(function (p) {
            return '<p>' + esc(p) + '</p>';
          }).join('');
        }
      }
    }

    // ── Technical Skills ─────────────────────────────────────────────────────

    if (Array.isArray(c.skills) && c.skills.length) {
      var skillsGrid = document.querySelector('.skills-grid');
      if (skillsGrid) {
        skillsGrid.innerHTML = c.skills.map(function (cat) {
          var items = Array.isArray(cat.items) ? cat.items : [];
          return [
            '<div class="skill-category">',
            '  <div class="skill-category-title">',
            '    <div class="skill-category-icon" style="background:' + esc(cat.iconBg || 'rgba(79,142,247,.12)') + '" aria-hidden="true">' + esc(cat.icon || '⚙️') + '</div>',
            '    ' + esc(cat.category || ''),
            '  </div>',
            '  <div class="skill-tags">',
            items.map(function (item) { return '    <span class="skill-tag">' + esc(item) + '</span>'; }).join(''),
            '  </div>',
            '</div>'
          ].join('');
        }).join('');
      }
    }

    // ── Work Experience ───────────────────────────────────────────────────────

    if (Array.isArray(c.experience) && c.experience.length) {
      var timeline = document.querySelector('.timeline');
      if (timeline) {
        timeline.innerHTML = c.experience.map(function (job) {
          var tags = Array.isArray(job.tags) ? job.tags : [];
          return [
            '<div class="timeline-item" role="listitem">',
            '  <div class="timeline-dot" aria-hidden="true"></div>',
            '  <div class="timeline-card">',
            '    <div class="timeline-header">',
            '      <span class="timeline-role">' + esc(job.role || '') + '</span>',
            '      <span class="timeline-date">' + esc(job.date || '') + '</span>',
            '    </div>',
            '    <div class="timeline-company">' + esc(job.company || '') + '</div>',
            '    <p class="timeline-desc">' + esc(job.description || '') + '</p>',
            '    <div class="timeline-tags">',
            tags.map(function (t) { return '      <span class="timeline-tag">' + esc(t) + '</span>'; }).join(''),
            '    </div>',
            '  </div>',
            '</div>'
          ].join('');
        }).join('');
      }
    }

    // ── Projects ─────────────────────────────────────────────────────────────

    if (Array.isArray(c.projects) && c.projects.length) {
      var projectsGrid = document.querySelector('.projects-grid');
      if (projectsGrid) {
        projectsGrid.innerHTML = c.projects.map(function (proj) {
          var highlights = Array.isArray(proj.highlights) ? proj.highlights : [];
          var tech = Array.isArray(proj.tech) ? proj.tech : [];
          var githubSafe = proj.github ? safeUrl(proj.github) : null;
          var liveUrlSafe = proj.url ? safeUrl(proj.url) : null;
          var bannerStyle = proj.bannerStyle || 'background: linear-gradient(90deg, #4f8ef7, #6366f1)';
          var hasLinks = githubSafe || liveUrlSafe;
          return [
            '<article class="project-card">',
            '  <div class="project-banner" style="' + esc(bannerStyle) + '" aria-hidden="true"></div>',
            '  <div class="project-body">',
            '    <div class="project-type">' + esc(proj.type || '') + '</div>',
            '    <h3 class="project-title">' + esc(proj.title || '') + '</h3>',
            '    <p class="project-desc">' + esc(proj.description || '') + '</p>',
            highlights.length ? '<ul class="project-highlights">' + highlights.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ul>' : '',
            '    <div class="project-tech">',
            tech.map(function (t) { return '      <span class="tech-tag">' + esc(t) + '</span>'; }).join(''),
            '    </div>',
            hasLinks ? [
              '    <div class="project-links">',
              githubSafe ? [
                '      <a href="' + esc(githubSafe) + '" class="project-link" target="_blank" rel="noopener noreferrer">',
                '        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>',
                '        GitHub',
                '      </a>'
              ].join('') : '',
              liveUrlSafe ? [
                '      <a href="' + esc(liveUrlSafe) + '" class="project-link project-link-live" target="_blank" rel="noopener noreferrer">',
                '        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
                '        Live Demo',
                '      </a>'
              ].join('') : '',
              '    </div>'
            ].join('') : '',
            '  </div>',
            '</article>'
          ].join('');
        }).join('');
      }
    }

    // ── Education ─────────────────────────────────────────────────────────────

    if (Array.isArray(c.education) && c.education.length) {
      var eduGrid = document.querySelector('.education-grid');
      if (eduGrid) {
        eduGrid.innerHTML = c.education.map(function (edu) {
          return [
            '<div class="edu-card">',
            '  <div class="edu-icon" aria-hidden="true">' + esc(edu.icon || '🎓') + '</div>',
            '  <div class="edu-body">',
            '    <div class="edu-degree">' + esc(edu.degree || '') + '</div>',
            '    <div class="edu-school">' + esc(edu.school || '') + '</div>',
            '    <div class="edu-date">' + esc(edu.date || '') + '</div>',
            edu.note ? '    <div class="edu-note">' + esc(edu.note) + '</div>' : '',
            '  </div>',
            '</div>'
          ].join('');
        }).join('');
      }
    }

    // ── Media ─────────────────────────────────────────────────────────────────

    if (c.featuredVideo) {
      var videoSafe;
      try {
        var parsed = new URL(c.featuredVideo);
        videoSafe = (parsed.protocol === 'https:' || parsed.protocol === 'http:') ? parsed.href : null;
      } catch (_) { videoSafe = null; }

      if (videoSafe) {
        var videoContainer = document.getElementById('hero-video-container');
        if (videoContainer) {
          videoContainer.innerHTML = '';
          var iframe = document.createElement('iframe');
          iframe.src = videoSafe;
          iframe.style.cssText = 'width:100%;aspect-ratio:16/9;border:none;border-radius:12px;';
          iframe.setAttribute('allowfullscreen', '');
          iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
          iframe.setAttribute('title', 'Intro video');
          iframe.setAttribute('loading', 'lazy');
          videoContainer.appendChild(iframe);
        }
      }
    }

    if (Array.isArray(c.heroImages) && c.heroImages.length) {
      var heroSection = document.querySelector('#hero');
      if (heroSection) {
        var existing = document.getElementById('hero-image-gallery');
        if (existing) existing.remove();
        var gallery = document.createElement('div');
        gallery.id = 'hero-image-gallery';
        gallery.style.cssText = 'display:flex;flex-wrap:wrap;gap:.75rem;justify-content:center;padding:1.5rem;background:var(--bg-secondary,#f8fafc);';
        c.heroImages.forEach(function (url) {
          var safeImg = safeUrl(url);
          if (!safeImg) return;
          var imgEl = document.createElement('img');
          imgEl.src = safeImg;
          imgEl.alt = 'Gallery image';
          imgEl.style.cssText = 'height:120px;width:auto;object-fit:cover;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.15);';
          imgEl.onerror = function () { this.remove(); };
          gallery.appendChild(imgEl);
        });
        if (gallery.children.length) {
          heroSection.insertAdjacentElement('afterend', gallery);
        }
      }
    }
  }

  // ── Fetch from API, fall back to localStorage cache ───────────────────────
  function loadAndApply() {
    fetch('/api/content')
      .then(function (res) {
        if (!res.ok) throw new Error('fetch failed');
        return res.json();
      })
      .then(function (data) {
        // Check if any field has a real value before caching/applying
        var hasContent = Object.keys(data).some(function (k) {
          var v = data[k];
          return Array.isArray(v) ? v.length > 0 : (v !== '' && v != null);
        });
        if (hasContent) {
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (_) {}
          applyOverrides(data);
        } else {
          // Server has no content (e.g. cold start) — fall back to localStorage
          applyCached();
        }
      })
      .catch(function () {
        applyCached();
      });
  }

  function applyCached() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (raw) applyOverrides(JSON.parse(raw));
    } catch (_) {}
  }

  loadAndApply();
}());
