export function initRpg(canvas, onUnlockSkill) {
  if (!canvas) return () => {};

  const ctx = canvas.getContext('2d');
  let animationFrameId = null;

  const WIDTH = 640;
  const HEIGHT = 400;

  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  // Player state
  const player = {
    x: 309,
    y: 320,
    width: 22,
    height: 22,
    speed: 3.2,
    dir: 'UP'
  };

  // Keyboard input state
  const keys = {
    up: false,
    down: false,
    left: false,
    right: false
  };

  // Walls (AABB obstacles)
  const walls = [
    { x: 120, y: 160, width: 140, height: 20 },
    { x: 380, y: 160, width: 140, height: 20 },
    { x: 280, y: 230, width: 80, height: 20 }
  ];

  // NPCs
  const npcs = [
    {
      id: 1,
      name: 'Deployment Platform',
      x: 140,
      y: 90,
      width: 24,
      height: 24,
      color: '#00f5a0',
      text: "I built my own Vercel. 6/6 phases shipped, 13/13 tests passing, zero auth libraries used. Push a repo — I'll handle the rest."
    },
    {
      id: 2,
      name: 'ProAcademys',
      x: 480,
      y: 90,
      width: 24,
      height: 24,
      color: '#00f5a0',
      text: 'Migrated 37 legacy MySQL tables to MongoDB while students were taking live courses — zero downtime, zero dropped data.'
    },
    {
      id: 3,
      name: 'GameZone',
      x: 309,
      y: 128,
      width: 24,
      height: 24,
      color: '#ff9e00',
      text: 'Halt, traveler! My Android artifact tracks every gaming station and calculates session gold down to the minute. No free playtime!'
    }
  ];

  // Skill Orbs
  const skillOrbs = [
    { id: 'docker', name: 'Docker', x: 70, y: 290, radius: 10, collected: false },
    { id: 'react', name: 'React', x: 570, y: 290, radius: 10, collected: false },
    { id: 'payments', name: 'Payments', x: 320, y: 80, radius: 10, collected: false },
    { id: 'gamedev', name: 'Game Dev', x: 550, y: 80, radius: 10, collected: false }
  ];

  // Active dialogue box state
  let currentDialogue = null;
  let activeNearNpcId = null; // id of the NPC currently in proximity, or null

  // Keyboard Handlers
  const handleKeyDown = (e) => {
    if (['ArrowUp', 'w', 'W'].includes(e.key)) keys.up = true;
    if (['ArrowDown', 's', 'S'].includes(e.key)) keys.down = true;
    if (['ArrowLeft', 'a', 'A'].includes(e.key)) keys.left = true;
    if (['ArrowRight', 'd', 'D'].includes(e.key)) keys.right = true;
    if (['e', 'E', ' '].includes(e.key)) {
      checkNPCInteraction();
    }
  };

  const handleKeyUp = (e) => {
    if (['ArrowUp', 'w', 'W'].includes(e.key)) keys.up = false;
    if (['ArrowDown', 's', 'S'].includes(e.key)) keys.down = false;
    if (['ArrowLeft', 'a', 'A'].includes(e.key)) keys.left = false;
    if (['ArrowRight', 'd', 'D'].includes(e.key)) keys.right = false;
  };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  // Touch Control Wiring
  const touchButtons = [
    { id: 'rpg-btn-up', key: 'up' },
    { id: 'rpg-btn-down', key: 'down' },
    { id: 'rpg-btn-left', key: 'left' },
    { id: 'rpg-btn-right', key: 'right' }
  ];

  const touchListeners = [];

  touchButtons.forEach(({ id, key }) => {
    const btn = document.getElementById(id);
    if (btn) {
      const start = () => { keys[key] = true; };
      const stop = () => { keys[key] = false; };

      btn.addEventListener('touchstart', start, { passive: true });
      btn.addEventListener('touchend', stop);
      btn.addEventListener('mousedown', start);
      btn.addEventListener('mouseup', stop);

      touchListeners.push({ btn, start, stop });
    }
  });

  const btnAction = document.getElementById('rpg-btn-action');
  let actionHandler = null;
  if (btnAction) {
    actionHandler = () => { checkNPCInteraction(); };
    btnAction.addEventListener('click', actionHandler);
  }

  // AABB Collision Helper
  function checkCollision(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }
  function wrapText(text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? currentLine + ' ' + word : word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  }


  function checkNPCInteraction() {
    if (activeNearNpcId === null) return;
    const npc = npcs.find((n) => n.id === activeNearNpcId);
    if (!npc) return;
    if (currentDialogue && currentDialogue.name === npc.name) {
      currentDialogue = null;
    } else {
      currentDialogue = { name: npc.name, text: npc.text };
    }
  }

  let orbAnimTime = 0;

  function update() {
    let dx = 0;
    let dy = 0;

    if (keys.up) { dy -= player.speed; player.dir = 'UP'; }
    if (keys.down) { dy += player.speed; player.dir = 'DOWN'; }
    if (keys.left) { dx -= player.speed; player.dir = 'LEFT'; }
    if (keys.right) { dx += player.speed; player.dir = 'RIGHT'; }

    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071;
      dy *= 0.7071;
    }

    // Move along X
    const nextX = player.x + dx;
    const playerRectX = { x: nextX, y: player.y, width: player.width, height: player.height };

    let collideX = false;
    if (nextX < 15 || nextX + player.width > WIDTH - 15) collideX = true;
    walls.forEach((w) => { if (checkCollision(playerRectX, w)) collideX = true; });
    npcs.forEach((n) => { if (checkCollision(playerRectX, n)) collideX = true; });

    if (!collideX) player.x = nextX;

    // Move along Y
    const nextY = player.y + dy;
    const playerRectY = { x: player.x, y: nextY, width: player.width, height: player.height };

    let collideY = false;
    if (nextY < 15 || nextY + player.height > HEIGHT - 15) collideY = true;
    walls.forEach((w) => { if (checkCollision(playerRectY, w)) collideY = true; });
    npcs.forEach((n) => { if (checkCollision(playerRectY, n)) collideY = true; });

    if (!collideY) player.y = nextY;

    // Auto-dialogue on stepping into NPC proximity (only on the frame
    // proximity is newly entered, so pressing E to dismiss it isn't
    // immediately re-opened by this same check on the next frame).
    // Walking away from every NPC closes it and clears the tracked NPC.
    let nearNpc = null;
    npcs.forEach((npc) => {
      const nearRect = { x: npc.x - 10, y: npc.y - 10, width: npc.width + 20, height: npc.height + 20 };
      if (checkCollision(player, nearRect)) {
        nearNpc = npc;
      }
    });

    if (nearNpc) {
      if (activeNearNpcId !== nearNpc.id) {
        activeNearNpcId = nearNpc.id;
        currentDialogue = { name: nearNpc.name, text: nearNpc.text };
      }
    } else if (activeNearNpcId !== null) {
      activeNearNpcId = null;
      currentDialogue = null;
    }

    // Check Skill Orb pickups
    orbAnimTime += 0.05;
    skillOrbs.forEach((orb) => {
      if (!orb.collected) {
        const orbRect = { x: orb.x - orb.radius, y: orb.y - orb.radius, width: orb.radius * 2, height: orb.radius * 2 };
        if (checkCollision(player, orbRect)) {
          orb.collected = true;
          if (typeof onUnlockSkill === 'function') {
            onUnlockSkill(`+ Skill: ${orb.name}`);
          }
        }
      }
    });
  }

  function draw() {
    // Floor
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Floor Grid lines
    ctx.strokeStyle = '#121926';
    ctx.lineWidth = 1;
    for (let x = 0; x < WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < HEIGHT; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }

    // Outer Room Wall Border
    ctx.strokeStyle = '#00f5a0';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, WIDTH - 20, HEIGHT - 20);

    // Inner Obstacle Walls
    walls.forEach((w) => {
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(w.x, w.y, w.width, w.height);
      ctx.strokeStyle = '#ff9e00';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(w.x, w.y, w.width, w.height);
    });

    // Skill Orbs
    skillOrbs.forEach((orb) => {
      if (!orb.collected) {
        const floatY = orb.y + Math.sin(orbAnimTime + orb.x) * 4;

        ctx.fillStyle = '#00f5a0';
        ctx.shadowColor = '#00f5a0';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(orb.x, floatY, orb.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(orb.name, orb.x, floatY - 14);
      }
    });

    // NPCs
    npcs.forEach((npc) => {
      ctx.fillStyle = npc.color;
      ctx.shadowColor = npc.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(npc.x, npc.y, npc.width, npc.height);

      // NPC Eyes
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#05070d';
      ctx.fillRect(npc.x + 4, npc.y + 6, 4, 4);
      ctx.fillRect(npc.x + 16, npc.y + 6, 4, 4);

      // Label
      ctx.fillStyle = '#e7eaf0';
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(npc.name, npc.x + npc.width / 2, npc.y - 8);

      // Interaction prompt
      const nearRect = { x: npc.x - 20, y: npc.y - 20, width: npc.width + 40, height: npc.height + 40 };
      if (checkCollision(player, nearRect)) {
        ctx.fillStyle = '#ff9e00';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillText('[E] TALK', npc.x + npc.width / 2, npc.y + npc.height + 14);
      }
    });

    // Player Hero Square
    ctx.fillStyle = '#00f5a0';
    ctx.shadowColor = '#00f5a0';
    ctx.shadowBlur = 10;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Player Eyes / Direction
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#05070d';
    if (player.dir === 'UP') {
      ctx.fillRect(player.x + 4, player.y + 4, 4, 4);
      ctx.fillRect(player.x + 14, player.y + 4, 4, 4);
    } else if (player.dir === 'DOWN') {
      ctx.fillRect(player.x + 4, player.y + 14, 4, 4);
      ctx.fillRect(player.x + 14, player.y + 14, 4, 4);
    } else if (player.dir === 'LEFT') {
      ctx.fillRect(player.x + 4, player.y + 4, 4, 4);
      ctx.fillRect(player.x + 4, player.y + 14, 4, 4);
    } else if (player.dir === 'RIGHT') {
      ctx.fillRect(player.x + 14, player.y + 4, 4, 4);
      ctx.fillRect(player.x + 14, player.y + 14, 4, 4);
    }

    // Dialogue Box Overlay
    if (currentDialogue) {
      ctx.font = '12px "Space Grotesk", sans-serif';
      const paddingX = 15;
      const boxX = 30;
      const boxWidth = WIDTH - 60;
      const maxTextWidth = boxWidth - (paddingX * 2);
      const lines = wrapText(currentDialogue.text, maxTextWidth);

      const titleHeight = 16;
      const lineHeight = 18;
      const footerHeight = 16;
      const verticalPadding = 12;

      const boxHeight = Math.max(75, verticalPadding + titleHeight + (lines.length * lineHeight) + footerHeight + verticalPadding);
      const boxY = HEIGHT - boxHeight - 15;

      ctx.fillStyle = 'rgba(13, 17, 23, 0.95)';
      ctx.strokeStyle = '#00f5a0';
      ctx.lineWidth = 2;
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
      ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

      ctx.fillStyle = '#ff9e00';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`💬 ${currentDialogue.name}:`, boxX + paddingX, boxY + verticalPadding + 10);

      ctx.fillStyle = '#e7eaf0';
      ctx.font = '12px "Space Grotesk", sans-serif';
      let lineY = boxY + verticalPadding + titleHeight + 12;
      lines.forEach((line) => {
        ctx.fillText(line, boxX + paddingX, lineY);
        lineY += lineHeight;
      });

      ctx.fillStyle = '#8a93a6';
      ctx.font = '10px "Space Grotesk", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('[Press E or Walk Away]', boxX + boxWidth - paddingX, boxY + boxHeight - 10);
    }
  }

  function loop() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(loop);
  }

  loop();

  return function cleanup() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);

    touchListeners.forEach((l) => {
      l.btn.removeEventListener('touchstart', l.start);
      l.btn.removeEventListener('touchend', l.stop);
      l.btn.removeEventListener('mousedown', l.start);
      l.btn.removeEventListener('mouseup', l.stop);
    });

    if (btnAction && actionHandler) {
      btnAction.removeEventListener('click', actionHandler);
    }
  };
}
