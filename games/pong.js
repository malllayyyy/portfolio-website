export function initPong(canvas) {
  if (!canvas) return () => {};

  const ctx = canvas.getContext('2d');
  let animationFrameId = null;

  const WIDTH = 640;
  const HEIGHT = 400;

  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const PADDLE_WIDTH = 12;
  const PADDLE_HEIGHT = 70;
  const BALL_SIZE = 10;
  const WINNING_SCORE = 7;

  let playerY = (HEIGHT - PADDLE_HEIGHT) / 2;
  let aiY = (HEIGHT - PADDLE_HEIGHT) / 2;
  let playerScore = 0;
  let aiScore = 0;
  let gameState = 'RUNNING'; // 'RUNNING', 'GAMEOVER'
  let winnerText = '';

  let ball = {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    vx: 3.5,
    vy: 2,
    speed: 4
  };

  const keys = { Up: false, Down: false };

  function resetBall(scorer) {
    ball.x = WIDTH / 2;
    ball.y = HEIGHT / 2;
    ball.speed = 4;
    const angle = (Math.random() * Math.PI / 4) - Math.PI / 8;
    const dir = scorer === 'player' ? -1 : 1;
    ball.vx = dir * ball.speed * Math.cos(angle);
    ball.vy = ball.speed * Math.sin(angle);
  }

  function restartGame() {
    playerScore = 0;
    aiScore = 0;
    playerY = (HEIGHT - PADDLE_HEIGHT) / 2;
    aiY = (HEIGHT - PADDLE_HEIGHT) / 2;
    gameState = 'RUNNING';
    winnerText = '';
    resetBall('player');
  }

  // Mouse Control
  const handleMouseMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleY = HEIGHT / rect.height;
    const mouseY = (e.clientY - rect.top) * scaleY;
    playerY = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, mouseY - PADDLE_HEIGHT / 2));
  };
  canvas.addEventListener('mousemove', handleMouseMove);

  // Keyboard Control
  const handleKeyDown = (e) => {
    if (['ArrowUp', 'w', 'W'].includes(e.key)) keys.Up = true;
    if (['ArrowDown', 's', 'S'].includes(e.key)) keys.Down = true;
    if (gameState === 'GAMEOVER' && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      restartGame();
    }
  };
  const handleKeyUp = (e) => {
    if (['ArrowUp', 'w', 'W'].includes(e.key)) keys.Up = false;
    if (['ArrowDown', 's', 'S'].includes(e.key)) keys.Down = false;
  };
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  // Restart Button Click
  const handleClick = (e) => {
    if (gameState === 'GAMEOVER') {
      const rect = canvas.getBoundingClientRect();
      const scaleX = WIDTH / rect.width;
      const scaleY = HEIGHT / rect.height;
      const clickX = (e.clientX - rect.left) * scaleX;
      const clickY = (e.clientY - rect.top) * scaleY;

      if (clickX >= WIDTH / 2 - 80 && clickX <= WIDTH / 2 + 80 && clickY >= 250 && clickY <= 290) {
        restartGame();
      }
    }
  };
  canvas.addEventListener('click', handleClick);

  // Touch Controls Support
  const btnUp = document.getElementById('pong-btn-up');
  const btnDown = document.getElementById('pong-btn-down');

  const startMoveUp = () => { keys.Up = true; };
  const stopMoveUp = () => { keys.Up = false; };
  const startMoveDown = () => { keys.Down = true; };
  const stopMoveDown = () => { keys.Down = false; };

  if (btnUp && btnDown) {
    btnUp.addEventListener('touchstart', startMoveUp, { passive: true });
    btnUp.addEventListener('touchend', stopMoveUp);
    btnUp.addEventListener('mousedown', startMoveUp);
    btnUp.addEventListener('mouseup', stopMoveUp);

    btnDown.addEventListener('touchstart', startMoveDown, { passive: true });
    btnDown.addEventListener('touchend', stopMoveDown);
    btnDown.addEventListener('mousedown', startMoveDown);
    btnDown.addEventListener('mouseup', stopMoveDown);
  }

  function update() {
    if (gameState !== 'RUNNING') return;

    // Keyboard Movement
    const paddleSpeed = 7;
    if (keys.Up) playerY = Math.max(0, playerY - paddleSpeed);
    if (keys.Down) playerY = Math.min(HEIGHT - PADDLE_HEIGHT, playerY + paddleSpeed);

    // AI Tracking
    const aiCenter = aiY + PADDLE_HEIGHT / 2;
    const aiTarget = ball.y;
    const aiSpeed = 3.6;
    if (aiCenter < aiTarget - 10) {
      aiY = Math.min(HEIGHT - PADDLE_HEIGHT, aiY + aiSpeed);
    } else if (aiCenter > aiTarget + 10) {
      aiY = Math.max(0, aiY - aiSpeed);
    }

    // Ball Movement
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Bounce Top & Bottom Walls
    if (ball.y - BALL_SIZE / 2 <= 0) {
      ball.y = BALL_SIZE / 2;
      ball.vy = -ball.vy;
    } else if (ball.y + BALL_SIZE / 2 >= HEIGHT) {
      ball.y = HEIGHT - BALL_SIZE / 2;
      ball.vy = -ball.vy;
    }

    // Player Paddle Collision
    const playerX = 20;
    if (
      ball.x - BALL_SIZE / 2 <= playerX + PADDLE_WIDTH &&
      ball.x + BALL_SIZE / 2 >= playerX &&
      ball.y >= playerY &&
      ball.y <= playerY + PADDLE_HEIGHT &&
      ball.vx < 0
    ) {
      ball.x = playerX + PADDLE_WIDTH + BALL_SIZE / 2;
      ball.speed = Math.min(9, ball.speed * 1.035);
      const hitRatio = (ball.y - (playerY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
      const angle = hitRatio * (Math.PI / 3);
      ball.vx = ball.speed * Math.cos(angle);
      ball.vy = ball.speed * Math.sin(angle);
    }

    // AI Paddle Collision
    const aiX = WIDTH - 20 - PADDLE_WIDTH;
    if (
      ball.x + BALL_SIZE / 2 >= aiX &&
      ball.x - BALL_SIZE / 2 <= aiX + PADDLE_WIDTH &&
      ball.y >= aiY &&
      ball.y <= aiY + PADDLE_HEIGHT &&
      ball.vx > 0
    ) {
      ball.x = aiX - BALL_SIZE / 2;
      ball.speed = Math.min(9, ball.speed * 1.035);
      const hitRatio = (ball.y - (aiY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
      const angle = hitRatio * (Math.PI / 3);
      ball.vx = -ball.speed * Math.cos(angle);
      ball.vy = ball.speed * Math.sin(angle);
    }

    // Scoring Check
    if (ball.x < 0) {
      aiScore++;
      if (aiScore >= WINNING_SCORE) {
        gameState = 'GAMEOVER';
        winnerText = 'GAME OVER — YOU LOSE!';
      } else {
        resetBall('ai');
      }
    } else if (ball.x > WIDTH) {
      playerScore++;
      if (playerScore >= WINNING_SCORE) {
        gameState = 'GAMEOVER';
        winnerText = 'VICTORY — YOU WIN!';
      } else {
        resetBall('player');
      }
    }
  }

  function draw() {
    // Clear Background
    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Dashed Net
    ctx.strokeStyle = '#1d2636';
    ctx.setLineDash([8, 8]);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2, 0);
    ctx.lineTo(WIDTH / 2, HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Scores
    ctx.fillStyle = '#e7eaf0';
    ctx.font = '24px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(playerScore, WIDTH / 4, 45);
    ctx.fillText(aiScore, (3 * WIDTH) / 4, 45);

    // Labels
    ctx.font = '10px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#8a93a6';
    ctx.fillText('YOU', WIDTH / 4, 65);
    ctx.fillText('AI OPPONENT', (3 * WIDTH) / 4, 65);

    // Player Paddle (Cyan Glow)
    ctx.fillStyle = '#00f5a0';
    ctx.shadowColor = '#00f5a0';
    ctx.shadowBlur = 8;
    ctx.fillRect(20, playerY, PADDLE_WIDTH, PADDLE_HEIGHT);

    // AI Paddle (Violet Glow)
    ctx.fillStyle = '#ff9e00';
    ctx.shadowColor = '#ff9e00';
    ctx.shadowBlur = 8;
    ctx.fillRect(WIDTH - 20 - PADDLE_WIDTH, aiY, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Ball (Green Glow)
    ctx.fillStyle = '#00f5a0';
    ctx.shadowColor = '#00f5a0';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Game Over Screen
    if (gameState === 'GAMEOVER') {
      ctx.fillStyle = 'rgba(5, 7, 13, 0.88)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.fillStyle = playerScore >= WINNING_SCORE ? '#00f5a0' : '#ff5e5e';
      ctx.font = '16px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(winnerText, WIDTH / 2, HEIGHT / 2 - 30);

      // Restart Button
      ctx.fillStyle = '#00f5a0';
      ctx.fillRect(WIDTH / 2 - 80, 250, 160, 40);

      ctx.fillStyle = '#05070d';
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.fillText('RESTART', WIDTH / 2, 275);
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
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('click', handleClick);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);

    if (btnUp && btnDown) {
      btnUp.removeEventListener('touchstart', startMoveUp);
      btnUp.removeEventListener('touchend', stopMoveUp);
      btnUp.removeEventListener('mousedown', startMoveUp);
      btnUp.removeEventListener('mouseup', stopMoveUp);

      btnDown.removeEventListener('touchstart', startMoveDown);
      btnDown.removeEventListener('touchend', stopMoveDown);
      btnDown.removeEventListener('mousedown', startMoveDown);
      btnDown.removeEventListener('mouseup', stopMoveDown);
    }
  };
}
