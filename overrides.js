// ===== Apply Admin Content Overrides =====
// Reads customisations saved by the /admin dashboard and applies them to
// the live portfolio DOM so changes are reflected without a redeploy.
(function () {
  'use strict';

  function getJSON(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null') || fallback;
    } catch (_) {
      return fallback;
    }
  }

  var profile = getJSON('ar_profile', {});
  var contact = getJSON('ar_contact', {});
  var media   = getJSON('ar_media',   {});

  // ── Profile ──────────────────────────────────────────────────────────────

  if (profile.photoUrl) {
    var avatar = document.getElementById('hero-avatar');
    if (avatar) {
      var img = document.createElement('img');
      img.src = profile.photoUrl;
      img.alt = 'Profile photo';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%';
      avatar.textContent = '';
      avatar.appendChild(img);
      avatar.style.padding = '0';
      avatar.style.overflow = 'hidden';
    }
  }

  if (profile.name) {
    var nameEl = document.getElementById('hero-name');
    if (nameEl) nameEl.textContent = profile.name;
  }

  if (profile.title) {
    var titleEl = document.getElementById('hero-title');
    if (titleEl) titleEl.textContent = profile.title;
  }

  // ── Contact ───────────────────────────────────────────────────────────────

  if (contact.email) {
    var emailLink = document.getElementById('contact-email-link');
    if (emailLink) {
      emailLink.href = 'mailto:' + contact.email;
      emailLink.textContent = contact.email;
    }
    var footerContact = document.getElementById('footer-contact-link');
    if (footerContact) footerContact.href = 'mailto:' + contact.email;
  }

  if (contact.phone) {
    var phoneEl = document.getElementById('contact-phone-text');
    if (phoneEl) phoneEl.textContent = contact.phone;
  }

  if (contact.github) {
    var ghLink = document.getElementById('contact-github-link');
    if (ghLink) {
      var ghUrl = contact.github.match(/^https?:\/\//) ? contact.github : 'https://' + contact.github;
      ghLink.href = ghUrl;
      ghLink.textContent = ghUrl.replace(/^https?:\/\//, '');
    }
    var footerGh = document.getElementById('footer-github-link');
    if (footerGh) footerGh.href = contact.github.match(/^https?:\/\//) ? contact.github : 'https://' + contact.github;
  }

  if (contact.linkedin) {
    var liLink = document.getElementById('contact-linkedin-link');
    if (liLink) {
      var liUrl = contact.linkedin.match(/^https?:\/\//) ? contact.linkedin : 'https://' + contact.linkedin;
      liLink.href = liUrl;
      liLink.textContent = liUrl.replace(/^https?:\/\//, '');
    }
  }

  if (contact.location) {
    var locEl = document.getElementById('contact-location-text');
    if (locEl) locEl.textContent = contact.location;
  }

  // ── Media ─────────────────────────────────────────────────────────────────

  if (media.videoUrl) {
    var videoContainer = document.getElementById('hero-video-container');
    if (videoContainer) {
      var iframe = document.createElement('iframe');
      iframe.src = media.videoUrl;
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      iframe.setAttribute('title', 'Intro video');
      var wrapper = document.createElement('div');
      wrapper.className = 'hero-video-wrapper';
      wrapper.appendChild(iframe);
      videoContainer.appendChild(wrapper);
    }
  }

  if (media.showcaseImage) {
    var showcaseContainer = document.getElementById('hero-showcase-image');
    if (showcaseContainer) {
      var showcaseImg = document.createElement('img');
      showcaseImg.src = media.showcaseImage;
      showcaseImg.alt = 'Portfolio showcase';
      showcaseImg.style.cssText = 'max-width:100%;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.3)';
      showcaseContainer.appendChild(showcaseImg);
    }
  }
}());
