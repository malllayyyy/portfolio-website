/* ==========================================================================
   COMMAND CONSOLE MODULE (W2)
   ========================================================================== */

export function initConsole(deps = {}) {
  const {
    onOpen,
    updateModalBlur = () => {},
    showToast = () => {},
    getFx = () => 'full',
    cycleFx = () => 'full',
    getTheme = () => 'green',
    toggleTheme = () => 'green',
    openPong = () => {},
    openRpg = () => {},
    triggerReboot = () => {},
    scrollSection = () => {},
    copyText = () => {}
  } = deps;

  const consoleEl = document.getElementById('command-console');
  const inputEl = document.getElementById('console-input');
  const resultsEl = document.getElementById('console-results');
  const kbdBadge = document.getElementById('console-kbd-shortcut');

  if (!consoleEl || !inputEl || !resultsEl) return;

  // Platform-aware shortcut badge hint
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  if (kbdBadge) {
    kbdBadge.textContent = isMac ? '⌘K' : 'Ctrl K';
  }

  let isOpen = false;
  let lastFocusedEl = null;
  let selectedIndex = 0;
  let filteredCommands = [];

  const commands = [
    {
      id: 'home',
      label: 'Title Screen',
      desc: 'Jump to home / title section',
      cat: 'NAVIGATE',
      action: () => scrollSection('#home')
    },
    {
      id: 'levels',
      label: 'Level Select',
      desc: 'View experience & projects levels',
      cat: 'NAVIGATE',
      action: () => scrollSection('#levels')
    },
    {
      id: 'stats',
      label: 'Character Sheet',
      desc: 'View stats, skills & attributes',
      cat: 'NAVIGATE',
      action: () => scrollSection('#stats')
    },
    {
      id: 'arcade',
      label: 'Arcade Cabinet',
      desc: 'Enter mini-game arcade area',
      cat: 'NAVIGATE',
      action: () => scrollSection('#arcade')
    },
    {
      id: 'contact',
      label: 'Quest Board',
      desc: 'Reach contact & quest board',
      cat: 'NAVIGATE',
      action: () => scrollSection('#contact')
    },
    {
      id: 'play-pong',
      label: 'Launch Pong',
      desc: 'Play classic arcade Pong',
      cat: 'PLAY',
      action: () => openPong()
    },
    {
      id: 'play-rpg',
      label: 'Launch RPG Quest',
      desc: 'Start top-down RPG mini-game',
      cat: 'PLAY',
      action: () => openRpg()
    },
    {
      id: 'copy-email',
      label: 'Copy Email',
      desc: 'Copy email address to clipboard',
      cat: 'COPY',
      action: () => copyText('malayrc276@gmail.com')
    },
    {
      id: 'copy-github',
      label: 'Copy GitHub',
      desc: 'Copy GitHub URL to clipboard',
      cat: 'COPY',
      action: () => copyText('https://github.com/malllayyyy')
    },
    {
      id: 'toggle-amber',
      getLabel: () => `Toggle Amber Theme — now ${getTheme().toUpperCase()}`,
      desc: 'Switch color palette between Green & Amber',
      cat: 'THEME',
      action: () => toggleTheme()
    },
    {
      id: 'cycle-fx',
      getLabel: () => `Cycle FX Level — now ${getFx().toUpperCase()}`,
      desc: 'Toggle visual FX between FULL, LITE, OFF',
      cat: 'DISPLAY',
      action: () => cycleFx()
    },
    {
      id: 'reboot',
      label: 'Reboot System',
      desc: 'Replay system boot sequence',
      cat: 'SYSTEM',
      action: () => triggerReboot()
    },
    {
      id: 'matrix',
      label: 'Matrix Mode',
      desc: 'Enter the matrix stream',
      cat: 'SECRET',
      action: () => showToast('SYSTEM HACK', 'Wake up, Neo... The Matrix has you.')
    }
  ];

  function getCommandLabel(cmd) {
    return typeof cmd.getLabel === 'function' ? cmd.getLabel() : cmd.label;
  }


  function openConsole() {
    if (isOpen) return;
    lastFocusedEl = document.activeElement;
    isOpen = true;
    consoleEl.classList.add('open');
    consoleEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    updateModalBlur();

    inputEl.value = '';
    selectedIndex = 0;
    renderResults('');
    inputEl.focus();

    if (typeof onOpen === 'function') {
      try {
        onOpen();
      } catch (e) {
        console.warn('onOpen callback error:', e);
      }
    }
  }

  function closeConsole() {
    if (!isOpen) return;
    isOpen = false;
    consoleEl.classList.remove('open');
    consoleEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    updateModalBlur();

    if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') {
      lastFocusedEl.focus();
      lastFocusedEl = null;
    }
  }

  function updateSelection() {
    const items = resultsEl.querySelectorAll('.console-item');
    items.forEach((item, idx) => {
      const isSelected = idx === selectedIndex;
      item.classList.toggle('selected', isSelected);
      item.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      if (isSelected) {
        inputEl.setAttribute('aria-activedescendant', `console-opt-${idx}`);
        item.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function renderResults(query) {
    const q = query.trim().toLowerCase();
    filteredCommands = commands.filter((cmd) => {
      const label = getCommandLabel(cmd).toLowerCase();
      return (
        cmd.id.toLowerCase().includes(q) ||
        label.includes(q) ||
        cmd.desc.toLowerCase().includes(q) ||
        cmd.cat.toLowerCase().includes(q)
      );
    });

    if (selectedIndex >= filteredCommands.length) {
      selectedIndex = 0;
    }

    resultsEl.innerHTML = '';

    if (filteredCommands.length === 0) {
      inputEl.setAttribute('aria-expanded', 'false');
      inputEl.removeAttribute('aria-activedescendant');
      const emptyLi = document.createElement('li');
      emptyLi.className = 'console-empty';
      emptyLi.textContent = 'No matching commands found';
      resultsEl.appendChild(emptyLi);
      return;
    }

    inputEl.setAttribute('aria-expanded', 'true');

    filteredCommands.forEach((cmd, idx) => {
      const isSelected = idx === selectedIndex;
      const li = document.createElement('li');
      li.id = `console-opt-${idx}`;
      li.className = `console-item${isSelected ? ' selected' : ''}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      li.setAttribute('data-index', String(idx));

      li.innerHTML = `
        <span class="console-item-text">
          <span class="console-item-label">${getCommandLabel(cmd)}</span>
          <span class="console-item-desc">${cmd.desc}</span>
        </span>
        <span class="console-item-cat">${cmd.cat}</span>
      `;

      resultsEl.appendChild(li);
    });

    inputEl.setAttribute('aria-activedescendant', `console-opt-${selectedIndex}`);
  }

  // Input event
  inputEl.addEventListener('input', (e) => {
    selectedIndex = 0;
    renderResults(e.target.value);
  });

  // Keydown handling inside console palette
  consoleEl.addEventListener('keydown', (e) => {
    // stopPropagation prevents typing inside console from advancing Konami code
    e.stopPropagation();

    if (e.key === 'Escape') {
      e.preventDefault();
      closeConsole();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredCommands.length > 0) {
        selectedIndex = (selectedIndex + 1) % filteredCommands.length;
        updateSelection();
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredCommands.length > 0) {
        selectedIndex = (selectedIndex - 1 + filteredCommands.length) % filteredCommands.length;
        updateSelection();
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands.length > 0 && filteredCommands[selectedIndex]) {
        const cmd = filteredCommands[selectedIndex];
        closeConsole();
        cmd.action();
      }
    }
  });

  // Mouse selection in results
  resultsEl.addEventListener('click', (e) => {
    const item = e.target.closest('.console-item');
    if (!item) return;
    const idx = parseInt(item.getAttribute('data-index') || '0', 10);
    if (filteredCommands[idx]) {
      closeConsole();
      filteredCommands[idx].action();
    }
  });

  resultsEl.addEventListener('mousemove', (e) => {
    const item = e.target.closest('.console-item');
    if (!item) return;
    const idx = parseInt(item.getAttribute('data-index') || '0', 10);
    if (idx !== selectedIndex && filteredCommands[idx]) {
      selectedIndex = idx;
      updateSelection();
    }
  });

  // Backdrop click to close
  consoleEl.addEventListener('click', (e) => {
    if (e.target === consoleEl) {
      closeConsole();
    }
  });

  // Global triggers
  window.addEventListener('keydown', (e) => {
    // '/' opens console
    if (e.key === '/') {
      const active = document.activeElement;
      const isInput = active && (
        active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.isContentEditable ||
        active.getAttribute('role') === 'textbox'
      );
      const pongOpen = document.getElementById('pong-modal')?.classList.contains('open');
      const rpgOpen = document.getElementById('rpg-modal')?.classList.contains('open');
      const achOpen = document.getElementById('achievements-modal')?.classList.contains('open');
      const consoleOpen = consoleEl.classList.contains('open');

      if (!isInput && !pongOpen && !rpgOpen && !achOpen && !consoleOpen) {
        e.preventDefault();
        openConsole();
      }
    }

    // Ctrl+K / Cmd+K toggles console
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      const pongOpen = document.getElementById('pong-modal')?.classList.contains('open');
      const rpgOpen = document.getElementById('rpg-modal')?.classList.contains('open');
      const achOpen = document.getElementById('achievements-modal')?.classList.contains('open');
      // If game or achievements modal is open, ignore shortcut
      if (pongOpen || rpgOpen || achOpen) return;

      e.preventDefault();
      if (consoleEl.classList.contains('open')) {
        closeConsole();
      } else {
        openConsole();
      }
    }
  });
}
