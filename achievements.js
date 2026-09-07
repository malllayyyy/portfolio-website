/* ==========================================================================
   ACHIEVEMENTS SYSTEM MODULE (W4)
   ========================================================================== */

export const ACHIEVEMENTS = [
  { id: 'sect-home', title: 'Title Screen', hint: 'Load the page.', desc: 'Reached the title screen.' },
  { id: 'sect-levels', title: 'Level Select', hint: 'Go see the projects.', desc: 'Viewed the project levels.' },
  { id: 'sect-stats', title: 'Character Sheet', hint: 'Check the stats.', desc: 'Inspected character stats and skills.' },
  { id: 'sect-arcade', title: 'Entered the Arcade', hint: 'Find the games.', desc: 'Discovered the arcade game zone.' },
  { id: 'sect-contact', title: 'Found the Quest Board', hint: 'Reach the save point.', desc: 'Located the contact quest board.' },
  { id: 'cheat-konami', title: 'Contra Player', hint: 'Up, up, down, down…', desc: 'Entered the legendary Konami cheat code.' },
  { id: 'orb-skill', title: 'Skill Acquired', hint: 'Collect an orb in the 2D room.', desc: 'Collected a skill orb in Pixel Quest.' },
  { id: 'pong-win', title: 'Undefeated', hint: 'Beat the Pong AI.', desc: 'Defeated the AI in a match of Pong.' },
  { id: 'copy-contact', title: 'Networker', hint: 'Copy a contact detail.', desc: 'Copied email or link to clipboard.' },
  { id: 'use-console', title: 'Power User', hint: 'There is a keyboard shortcut.', desc: 'Opened the command palette.' },
  { id: 'send-quest', title: 'Quest Accepted', hint: 'Send a message.', desc: 'Sent a message via the quest board.' }
];

const STORAGE_KEY = 'malay-achievements';
const STORAGE_VERSION = 1;

let unlockedSet = new Set();
let depsRef = {
  showToast: () => {},
  openModal: () => {},
  closeModal: () => {},
  triggerConfetti: () => {},
  onReset: null
};

function loadStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || data.v !== STORAGE_VERSION || !Array.isArray(data.unlocked)) {
      return new Set();
    }
    const knownSet = new Set(ACHIEVEMENTS.map(a => a.id));
    const valid = data.unlocked.filter(id => typeof id === 'string' && knownSet.has(id));
    return new Set(valid);
  } catch (e) {
    return new Set();
  }
}

function saveStorage() {
  try {
    const payload = {
      v: STORAGE_VERSION,
      unlocked: Array.from(unlockedSet)
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    // In-memory fallback if localStorage is unavailable
  }
}

export function getUnlockedCount() {
  return unlockedSet.size;
}

export function isUnlocked(id) {
  return unlockedSet.has(id);
}

function updateHud() {
  const count = unlockedSet.size;
  const total = ACHIEVEMENTS.length;
  const isComplete = count === total;

  const countEl = document.getElementById('ach-hud-count');
  if (countEl) {
    countEl.textContent = `${count}/${total}`;
  }

  const mobileLabelEl = document.getElementById('mobile-ach-hud-label');
  if (mobileLabelEl) {
    mobileLabelEl.textContent = `ACHIEVEMENTS — ${count}/${total}`;
  }

  const ariaText = `Achievements: ${count} of ${total} unlocked. Activate to view.`;
  const mainBtn = document.getElementById('achievements-btn');
  const mobileBtn = document.getElementById('mobile-achievements-btn');

  [mainBtn, mobileBtn].forEach((btn) => {
    if (!btn) return;
    btn.setAttribute('aria-label', ariaText);
    btn.classList.toggle('all-unlocked', isComplete);
  });

  const summaryEl = document.getElementById('ach-summary');
  if (summaryEl) {
    summaryEl.textContent = `${count} of ${total} UNLOCKED`;
  }
}

export function renderModalList() {
  const listEl = document.getElementById('ach-list');
  if (!listEl) return;

  listEl.innerHTML = '';

  ACHIEVEMENTS.forEach((ach) => {
    const unlocked = unlockedSet.has(ach.id);
    const li = document.createElement('li');
    li.className = `ach-item ${unlocked ? 'ach-unlocked' : 'ach-locked'}`;

    const statusText = unlocked ? 'Unlocked' : 'Locked';
    const detailText = unlocked ? ach.desc : `Hint: ${ach.hint}`;
    li.setAttribute('aria-label', `${ach.title}: ${statusText}. ${detailText}`);

    li.innerHTML = `
      <div class="ach-icon" aria-hidden="true">${unlocked ? '🏆' : '🔒'}</div>
      <div class="ach-details">
        <div class="ach-title">${ach.title}</div>
        <div class="ach-desc">${unlocked ? ach.desc : `<span style="opacity: 0.75;">Hint:</span> ${ach.hint}`}</div>
      </div>
    `;

    listEl.appendChild(li);
  });
}

export function unlockAchievement(id) {
  const ach = ACHIEVEMENTS.find(a => a.id === id);
  if (!ach || unlockedSet.has(id)) {
    return false;
  }

  unlockedSet.add(id);
  saveStorage();
  updateHud();
  renderModalList();

  depsRef.showToast('🏆 ACHIEVEMENT UNLOCKED', ach.title);

  if (unlockedSet.size === ACHIEVEMENTS.length) {
    setTimeout(() => {
      depsRef.showToast('🎖️ 100% COMPLETION', 'All achievements unlocked! Master Arcade Status!');
      if (typeof depsRef.triggerConfetti === 'function') {
        depsRef.triggerConfetti();
      }
    }, 400);
  }

  return true;
}

export function initAchievements(deps = {}) {
  depsRef = {
    showToast: deps.showToast || (() => {}),
    openModal: deps.openModal || (() => {}),
    closeModal: deps.closeModal || (() => {}),
    triggerConfetti: deps.triggerConfetti || (() => {}),
    onReset: deps.onReset || null
  };

  unlockedSet = loadStorage();
  updateHud();

  const mainBtn = document.getElementById('achievements-btn');
  const mobileBtn = document.getElementById('mobile-achievements-btn');
  const modalEl = document.getElementById('achievements-modal');
  const closeBtn = document.getElementById('ach-close');
  const resetBtn = document.getElementById('ach-reset-btn');

  const openAchievementsModal = (opener) => {
    // If command console is open, close it
    const consoleEl = document.getElementById('command-console');
    if (consoleEl && consoleEl.classList.contains('open')) {
      consoleEl.classList.remove('open');
      consoleEl.setAttribute('aria-hidden', 'true');
    }

    // If mobile menu is open, close it
    const mobileMenuEl = document.getElementById('mobile-menu');
    const hamburgerBtn = document.getElementById('hamburger-btn');
    if (mobileMenuEl && mobileMenuEl.classList.contains('open')) {
      mobileMenuEl.classList.remove('open');
      mobileMenuEl.setAttribute('aria-hidden', 'true');
      if (hamburgerBtn) hamburgerBtn.setAttribute('aria-expanded', 'false');
    }

    renderModalList();
    depsRef.openModal(modalEl, opener);
  };

  if (mainBtn && modalEl) {
    mainBtn.addEventListener('click', () => openAchievementsModal(mainBtn));
  }
  if (mobileBtn && modalEl) {
    mobileBtn.addEventListener('click', () => openAchievementsModal(mobileBtn));
  }

  if (closeBtn && modalEl) {
    closeBtn.addEventListener('click', () => {
      depsRef.closeModal(modalEl);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const confirmed = window.confirm('Are you sure you want to reset all achievement progress?');
      if (confirmed) {
        unlockedSet.clear();
        saveStorage();
        updateHud();
        renderModalList();
        if (typeof depsRef.onReset === 'function') {
          depsRef.onReset();
        }
        depsRef.showToast('ACHIEVEMENTS RESET', 'All achievement progress has been reset.');
      }
    });
  }
}
