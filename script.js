/* ==========================================================================
   GAMIFIED PORTFOLIO - MAIN SCRIPT (ES MODULE)
   ========================================================================== */

import { initPong } from './games/pong.js';
import { initRpg } from './games/rpg.js';

document.addEventListener('DOMContentLoaded', async () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ------------------------------------------------------------------------
  // PRESS START BOOT SEQUENCE (SESSION-GATED, SKIPPABLE)
  //    Runs first and fully synchronously (no await above it) so the
  //    dismiss listeners and hard timeout are live before any network work
  //    (the Three.js CDN import below) can stall the page.
  // ------------------------------------------------------------------------
  const bootOverlay = document.getElementById('boot-overlay');
  if (bootOverlay) {
    const bootSeen = sessionStorage.getItem('bootSeen');
    if (bootSeen || prefersReducedMotion) {
      bootOverlay.remove();
    } else {
      sessionStorage.setItem('bootSeen', 'true');
      let dismissed = false;
      const dismissBoot = () => {
        if (dismissed) return;
        dismissed = true;

        window.removeEventListener('keydown', dismissBoot);
        window.removeEventListener('click', dismissBoot);
        window.removeEventListener('touchstart', dismissBoot);

        bootOverlay.classList.add('fading');
        setTimeout(() => {
          if (bootOverlay.parentNode) {
            bootOverlay.remove();
          }
        }, 250);
      };

      window.addEventListener('keydown', dismissBoot, { once: true });
      window.addEventListener('click', dismissBoot, { once: true });
      window.addEventListener('touchstart', dismissBoot, { once: true });

      setTimeout(dismissBoot, 1400);
    }
  }

  // ------------------------------------------------------------------------
  // 1. THREE.JS HERO BACKGROUND INITIALIZATION
  //    Dynamic import so a CDN/offline failure can't take down the rest of
  //    the module (a static top-level import would fail before this file's
  //    body ever runs, killing every other feature below).
  // ------------------------------------------------------------------------
  try {
    const heroCanvas = document.getElementById('hero-canvas');
    if (heroCanvas) {
      const { initHero } = await import('./three-hero.js');
      initHero(heroCanvas);
    }
  } catch (err) {
    console.warn('Three.js hero background failed to load:', err);
  }

  // ------------------------------------------------------------------------
  // 2. HUD & SCROLL PROGRESS (XP BAR & LEVEL COUNTER)
  // ------------------------------------------------------------------------
  const xpBar = document.getElementById('hud-xp-bar');
  const xpText = document.getElementById('hud-xp-text');
  const levelBadge = document.getElementById('hud-level');
  const navLinks = document.querySelectorAll('#hud-nav a, .mobile-menu-overlay a');

  let isTickingScroll = false;

  // Quest Map DOM references
  const questTrack = document.querySelector('.quest-track');
  const questFill = document.getElementById('quest-fill');
  const questNodes = document.querySelectorAll('.quest-node');

  const cardElements = document.querySelectorAll('.project-card, .arcade-cabinet');
  const intersectingCards = new Set();

  if (!prefersReducedMotion && cardElements.length > 0) {
    const cardObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          intersectingCards.add(entry.target);
        } else {
          intersectingCards.delete(entry.target);
        }
      });
    }, { rootMargin: '15% 0px 15% 0px' });

    cardElements.forEach((card) => cardObserver.observe(card));
  }

  const updateScrollEffects = () => {
    // 1. HUD XP Bar
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrollPercent = docHeight > 0 ? Math.min(100, Math.max(0, Math.round((scrollTop / docHeight) * 100))) : 0;

    if (xpBar) xpBar.style.width = `${scrollPercent}%`;
    if (xpText) xpText.textContent = `${scrollPercent}% XP`;

    // 2. Quest Map Progress & Node Lighting
    if (questTrack) {
      const rect = questTrack.getBoundingClientRect();
      const rawProgress = 1 - (rect.top + rect.height / 2) / window.innerHeight;
      const progress = Math.min(1, Math.max(0, rawProgress));

      if (questFill) {
        questFill.style.setProperty('--quest-progress', progress);
      }

      questNodes.forEach((node) => {
        const nodeProgress = parseFloat(node.getAttribute('data-progress') || '0');
        if (progress >= nodeProgress) {
          node.classList.add('lit');
        } else {
          node.classList.remove('lit');
        }
      });
    }

    // 3. Continuous 3D Card Tilt
    if (!prefersReducedMotion && intersectingCards.size > 0) {
      const viewportHeight = window.innerHeight;
      const halfViewport = viewportHeight / 2;
      intersectingCards.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const elCenter = rect.top + rect.height / 2;
        const distFromCenter = Math.abs(elCenter - halfViewport);
        const rawTilt = 1 - (distFromCenter / halfViewport);
        const tilt = Math.min(1, Math.max(0, rawTilt));
        el.style.setProperty('--tilt', tilt.toFixed(3));
      });
    }

    isTickingScroll = false;
  };

  window.addEventListener('scroll', () => {
    if (!isTickingScroll) {
      requestAnimationFrame(updateScrollEffects);
      isTickingScroll = true;
    }
  }, { passive: true });

  // Quest Node click navigation & spotlight pulse
  const spotlightTimers = new WeakMap();
  questNodes.forEach((node) => {
    node.addEventListener('click', () => {
      const targetId = node.getAttribute('data-target');
      if (!targetId) return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        clearTimeout(spotlightTimers.get(targetEl));
        targetEl.classList.add('spotlight');
        spotlightTimers.set(targetEl, setTimeout(() => {
          targetEl.classList.remove('spotlight');
          spotlightTimers.delete(targetEl);
        }, 1800));
      }
    });
  });

  // Initial call on load
  updateScrollEffects();

  // Level & Achievements Observer
  const visitedSections = new Set();
  const sectionAchievements = {
    'home': 'Reached the Title Screen',
    'stats': 'Character Sheet Unlocked',
    'levels': 'Level Select Discovered',
    'arcade': 'Entered the Arcade',
    'contact': 'Reached the Quest Board'
  };

  const sections = document.querySelectorAll('section[id]');
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.id;

        // Active nav highlighting
        navLinks.forEach((link) => {
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });

        // Level update & Achievement trigger
        if (!visitedSections.has(id)) {
          visitedSections.add(id);

          const newLevel = Math.max(1, visitedSections.size);
          if (levelBadge) {
            levelBadge.textContent = `LV. ${newLevel}`;
            levelBadge.classList.remove('pulse');
            // Trigger reflow for animation restart
            void levelBadge.offsetWidth;
            levelBadge.classList.add('pulse');
          }

          if (sectionAchievements[id]) {
            showToast('ACHIEVEMENT UNLOCKED', sectionAchievements[id]);
          }
        }
      }
    });
  }, { threshold: 0.35 });

  sections.forEach((sec) => sectionObserver.observe(sec));

  // ------------------------------------------------------------------------
  // 3. ACHIEVEMENT TOAST NOTIFICATION SYSTEM
  // ------------------------------------------------------------------------
  const toastContainer = document.getElementById('toast-container');

  function showToast(title, body) {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <div class="toast-title">🏆 ${title}</div>
      <div class="toast-body">${body}</div>
    `;

    toastContainer.appendChild(toast);

    // Slide in
    setTimeout(() => toast.classList.add('show'), 50);

    // Auto dismiss after 3.5s
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  // ------------------------------------------------------------------------
  // 4. REVEAL-ON-SCROLL & SKILL BAR ANIMATION
  // ------------------------------------------------------------------------
  const revealElements = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');

        // Animate skill bars inside section if present
        const skillFills = entry.target.querySelectorAll('.skill-bar-fill');
        skillFills.forEach((fill) => {
          const targetWidth = fill.getAttribute('data-fill');
          if (targetWidth) fill.style.width = targetWidth;
        });
      }
    });
  }, { threshold: 0.15 });
  revealElements.forEach((el) => revealObserver.observe(el));

  // Staggered grid entrance index delays
  const gridContainers = document.querySelectorAll('.skills-list, .projects-grid, .arcade-grid');
  gridContainers.forEach((container) => {
    Array.from(container.children).forEach((child, index) => {
      const delay = Math.min(index * 70, 400);
      child.style.setProperty('--stagger-delay', `${delay}ms`);
    });
  });
  // ------------------------------------------------------------------------
  // 5. CUSTOM RETICLE CURSOR
  // ------------------------------------------------------------------------
  const cursor = document.getElementById('custom-cursor');
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

  if (cursor && !isTouchDevice) {
    window.addEventListener('mousemove', (e) => {
      cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
    }, { passive: true });

    const hoverables = document.querySelectorAll('a, button, input, textarea, .project-card, .arcade-cabinet, .save-card, .quest-node');
    hoverables.forEach((el) => {
      el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
  }

  // Cursor-Reactive Spotlight & Magnetic Hover (desktop / non-touch)
  if (!isTouchDevice) {
    const spotlightCards = document.querySelectorAll('.project-card, .arcade-cabinet, .save-card');
    spotlightCards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mx', `${x}px`);
        card.style.setProperty('--my', `${y}px`);
      }, { passive: true });
    });

    const magneticEls = document.querySelectorAll('.btn-primary, .btn-secondary, .quest-node');
    magneticEls.forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        if (prefersReducedMotion) return;
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distX = (e.clientX - centerX) * 0.25;
        const distY = (e.clientY - centerY) * 0.25;
        const clampedX = Math.max(-6, Math.min(6, distX));
        const clampedY = Math.max(-6, Math.min(6, distY));
        el.style.setProperty('--magnet-x', `${clampedX}px`);
        el.style.setProperty('--magnet-y', `${clampedY}px`);
      }, { passive: true });

      el.addEventListener('mouseleave', () => {
        el.style.setProperty('--magnet-x', '0px');
        el.style.setProperty('--magnet-y', '0px');
      });
    });
  }

  // Click Spark Burst on Interactive Primary Elements
  const sparkTargets = document.querySelectorAll('.btn-primary, .btn-secondary, .quest-node');
  const sparkColors = ['#5ef5ff', '#b46bff', '#ffb454', '#4ee6a4'];
  sparkTargets.forEach((el) => {
    el.addEventListener('click', (e) => {
      if (prefersReducedMotion) return;
      const x = e.clientX;
      const y = e.clientY;
      if (!x && !y) return;
      for (let i = 0; i < 6; i++) {
        const particle = document.createElement('div');
        particle.className = 'click-spark-particle';
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        particle.style.backgroundColor = sparkColors[i % sparkColors.length];

        const angle = (i / 6) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
        const dist = 18 + Math.random() * 22;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;

        particle.style.setProperty('--dx', `${dx}px`);
        particle.style.setProperty('--dy', `${dy}px`);

        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 500);
      }
    });
  });
  // ------------------------------------------------------------------------
  // 6. KONAMI CODE EASTER EGG
  // ------------------------------------------------------------------------
  const konamiSequence = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'b', 'a'
  ];
  let konamiIndex = 0;

  window.addEventListener('keydown', (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const expectedKey = konamiSequence[konamiIndex].length === 1 ? konamiSequence[konamiIndex].toLowerCase() : konamiSequence[konamiIndex];

    if (key === expectedKey) {
      konamiIndex++;
      if (konamiIndex === konamiSequence.length) {
        triggerCheatCode();
        konamiIndex = 0;
      }
    } else {
      konamiIndex = 0;
    }
  });

  function triggerCheatCode() {
    const cheatOverlay = document.getElementById('cheat-overlay');
    if (!cheatOverlay) return;

    cheatOverlay.classList.add('active');
    showToast('SECRET UNLOCKED', 'Konami Cheat Code Activated!');

    // Spawn 30 confetti pieces
    const colors = ['#5ef5ff', '#b46bff', '#4ee6a4', '#ffb454'];
    for (let i = 0; i < 30; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-piece';
      confetti.style.left = `${Math.random() * 100}vw`;
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = `${Math.random() * 0.8}s`;
      cheatOverlay.appendChild(confetti);
    }

    setTimeout(() => {
      cheatOverlay.classList.remove('active');
      const pieces = cheatOverlay.querySelectorAll('.confetti-piece');
      pieces.forEach((p) => p.remove());
    }, 2500);
  }

  // ------------------------------------------------------------------------
  // 7. ACCORDION TOGGLES (PROJECT CARDS)
  // ------------------------------------------------------------------------
  const accordionBtns = document.querySelectorAll('.accordion-btn');

  accordionBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('aria-controls');
      const content = document.getElementById(targetId);
      const icon = btn.querySelector('.acc-icon');

      if (content) {
        const isOpen = content.classList.contains('open');
        content.classList.toggle('open', !isOpen);
        btn.setAttribute('aria-expanded', !isOpen);
        if (icon) icon.textContent = isOpen ? '▼' : '▲';
      }
    });
  });

  // ------------------------------------------------------------------------
  // 8. ARCADE GAME MODALS & GAME LOOPS
  // ------------------------------------------------------------------------
  const pongModal = document.getElementById('pong-modal');
  const rpgModal = document.getElementById('rpg-modal');
  const openPongBtn = document.getElementById('open-pong-btn');
  const openRpgBtn = document.getElementById('open-rpg-btn');
  const closePongBtn = document.getElementById('pong-close');
  const closeRpgBtn = document.getElementById('rpg-close');

  let pongCleanup = null;
  let rpgCleanup = null;

  let lastFocusedEl = null;

  function getFocusable(modal) {
    return Array.from(
      modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter((el) => !el.disabled && el.offsetParent !== null);
  }

  function trapTabKey(modal, e) {
    if (e.key !== 'Tab') return;
    const focusable = getFocusable(modal);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function updateModalBlur() {
    const pongModalEl = document.getElementById('pong-modal');
    const rpgModalEl = document.getElementById('rpg-modal');
    const mobileMenuEl = document.getElementById('mobile-menu');
    const isAnyOpen = (pongModalEl && pongModalEl.classList.contains('open')) ||
                      (rpgModalEl && rpgModalEl.classList.contains('open')) ||
                      (mobileMenuEl && mobileMenuEl.classList.contains('open'));
    document.body.classList.toggle('modal-open', isAnyOpen);
  }

  function openModal(modal, opener) {
    lastFocusedEl = opener || document.activeElement;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    updateModalBlur();
    const focusable = getFocusable(modal);
    (focusable[0] || modal).focus();
    modal._tabHandler = (e) => trapTabKey(modal, e);
    modal.addEventListener('keydown', modal._tabHandler);
  }

  function closeModal(modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    updateModalBlur();
    if (modal._tabHandler) {
      modal.removeEventListener('keydown', modal._tabHandler);
      modal._tabHandler = null;
    }
    if (lastFocusedEl) {
      lastFocusedEl.focus();
      lastFocusedEl = null;
    }
  }

  // Open Pong
  if (openPongBtn && pongModal) {
    openPongBtn.addEventListener('click', () => {
      openModal(pongModal, openPongBtn);
      const canvas = document.getElementById('pong-canvas');
      if (canvas) {
        pongCleanup = initPong(canvas);
      }
    });
  }

  // Close Pong
  if (closePongBtn && pongModal) {
    closePongBtn.addEventListener('click', () => {
      closeModal(pongModal);
      if (pongCleanup) {
        pongCleanup();
        pongCleanup = null;
      }
    });
  }

  // Open RPG
  if (openRpgBtn && rpgModal) {
    openRpgBtn.addEventListener('click', () => {
      openModal(rpgModal, openRpgBtn);
      const canvas = document.getElementById('rpg-canvas');
      if (canvas) {
        rpgCleanup = initRpg(canvas, (skillText) => {
          showToast('SKILL UNLOCKED', skillText);
        });
      }
    });
  }

  // Close RPG
  if (closeRpgBtn && rpgModal) {
    closeRpgBtn.addEventListener('click', () => {
      closeModal(rpgModal);
      if (rpgCleanup) {
        rpgCleanup();
        rpgCleanup = null;
      }
    });
  }

  // Escape key & Backdrop click for modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (pongModal && pongModal.classList.contains('open')) {
        closeModal(pongModal);
        if (pongCleanup) { pongCleanup(); pongCleanup = null; }
      }
      if (rpgModal && rpgModal.classList.contains('open')) {
        closeModal(rpgModal);
        if (rpgCleanup) { rpgCleanup(); rpgCleanup = null; }
      }
    }
  });

  [pongModal, rpgModal].forEach((modal) => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal(modal);
          if (modal === pongModal && pongCleanup) { pongCleanup(); pongCleanup = null; }
          if (modal === rpgModal && rpgCleanup) { rpgCleanup(); rpgCleanup = null; }
        }
      });
    }
  });

  // ------------------------------------------------------------------------
  // 9. MOBILE HAMBURGER MENU
  // ------------------------------------------------------------------------
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileLinks = document.querySelectorAll('.mobile-link');

  if (hamburgerBtn && mobileMenu) {
    hamburgerBtn.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.contains('open');
      mobileMenu.classList.toggle('open', !isOpen);
      mobileMenu.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
      hamburgerBtn.setAttribute('aria-expanded', !isOpen);
      updateModalBlur();
    });

    mobileLinks.forEach((link) => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        mobileMenu.setAttribute('aria-hidden', 'true');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        updateModalBlur();
      });
    });
  }

  // Force-close the mobile menu (and clear its blur) if the viewport widens
  // past the desktop breakpoint while it's open (rotation/resize/devtools) —
  // the hamburger button that would otherwise close it is hidden there.
  window.addEventListener('resize', () => {
    if (mobileMenu && mobileMenu.classList.contains('open') && window.innerWidth > 900) {
      mobileMenu.classList.remove('open');
      mobileMenu.setAttribute('aria-hidden', 'true');
      if (hamburgerBtn) hamburgerBtn.setAttribute('aria-expanded', 'false');
      updateModalBlur();
    }
  });

  // ------------------------------------------------------------------------
  // 10. CONTACT FORM MAILTO HANDLING
  // ------------------------------------------------------------------------
  const questForm = document.getElementById('quest-form');
  if (questForm) {
    questForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('form-name').value;
      const email = document.getElementById('form-email').value;
      const message = document.getElementById('form-message').value;

      const subject = encodeURIComponent(`Portfolio Quest Message from ${name}`);
      const body = encodeURIComponent(`Player Name: ${name}\nPlayer Email: ${email}\n\nMessage:\n${message}`);

      window.location.href = `mailto:malayrc276@gmail.com?subject=${subject}&body=${body}`;
      showToast('QUEST SENT', 'Email client opened with your message!');
      questForm.reset();
    });
  }
});
