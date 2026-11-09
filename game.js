(() => {
  'use strict';

  // ---------- Config ----------
  const W = 400;
  const H = 600;
  const GROUND_H = 80;
  const PLAY_H = H - GROUND_H;

  const BIRD = { x: 100, radius: 14 };
  const PHYSICS = { gravity: 1500, flapVelocity: -430, maxFall: 650 }; // px/s, px/s^2
  const PIPE = {
    width: 60,
    gap: 150,
    speed: 140, // px/s
    spacing: 220, // horizontal distance between pipe pairs
    minTop: 60, // min height of top pipe
    capH: 22,
  };
  const STORAGE_KEY = 'flappy-best-score';
  const RESTART_DELAY_MS = 400; // stops a frantic flap-tap from skipping the game-over screen

  // ---------- Sample design system ----------
  // These tokens formalize the palette and styles used by the canvas and welcome screen.
  const DESIGN_SYSTEM = {
    color: {
      sky: { start: '#4ec0ca', end: '#c9ecf0', canvas: '#70c5ce' },
      pipe: { fill: '#5cb85c', outline: '#2d6a2d' },
      ground: { soil: '#ded895', grass: '#73bf2e', grassStripe: '#5aa023', soilLine: '#c9b95f' },
      bird: { body: '#f7d046', outline: '#a77d00', wing: '#f0a500', beak: '#ef6c1a' },
      text: { primary: '#ffffff', ink: '#000000', display: '#facc15', muted: '#543847', danger: '#ff6b4a' },
      panel: { fill: '#ded895', outline: '#543847', overlay: 'rgba(0, 0, 0, 0.45)' },
    },
    typography: {
      family: 'system-ui, sans-serif',
      weight: 700,
      size: { score: 52, title: 44, modalTitle: 42, value: 38, label: 20, prompt: 20, restart: 18, brand: 18.5 },
    },
    spacing: { unit: 4, xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
    radius: { panel: 12 },
    border: { bird: 2, pipe: 3, panel: 4 },
    shadow: { panel: 'rgba(0, 0, 0, 0.22)', blur: 12, offsetY: 5 },
  };

  // ---------- Setup ----------
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // Crisp rendering on HiDPI screens; all drawing stays in logical 400x600 units
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  const State = { READY: 'ready', PLAYING: 'playing', GAME_OVER: 'gameover' };

  let state;
  let bird;
  let pipes;
  let score;
  let best = loadBest();
  let groundOffset = 0;
  let lastTime = 0;
  let gameOverAt = 0; // timestamp of death, used to delay restart

  // ---------- Persistence (safe if storage is blocked) ----------
  function loadBest() {
    try {
      return Number(localStorage.getItem(STORAGE_KEY)) || 0;
    } catch {
      return 0;
    }
  }

  function saveBest(value) {
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      /* ignore: storage unavailable */
    }
  }

  // ---------- Game lifecycle ----------
  function reset() {
    state = State.READY;
    bird = { y: PLAY_H / 2, vy: 0, rotation: 0 };
    pipes = [];
    score = 0;
  }

  function flap() {
    switch (state) {
      case State.READY:
        state = State.PLAYING;
        bird.vy = PHYSICS.flapVelocity;
        spawnPipe(W + 40);
        break;
      case State.PLAYING:
        bird.vy = PHYSICS.flapVelocity;
        break;
      case State.GAME_OVER:
        // Restart handled separately to avoid accidental instant restarts
        break;
    }
  }

  function restart() {
    if (state === State.GAME_OVER) reset();
  }

  function gameOver() {
    state = State.GAME_OVER;
    gameOverAt = performance.now();
    if (score > best) {
      best = score;
      saveBest(best);
    }
  }

  // ---------- Pipes ----------
  function spawnPipe(x) {
    const maxTop = PLAY_H - PIPE.gap - PIPE.minTop;
    const topHeight = PIPE.minTop + Math.random() * (maxTop - PIPE.minTop);
    pipes.push({ x, topHeight, scored: false });
  }

  function updatePipes(dt) {
    for (const p of pipes) p.x -= PIPE.speed * dt;

    // Remove off-screen pipes
    while (pipes.length && pipes[0].x + PIPE.width < 0) pipes.shift();

    // Spawn a new pair when the last one has travelled far enough
    const last = pipes[pipes.length - 1];
    if (!last || last.x <= W + 40 - PIPE.spacing) spawnPipe(W + 40);

    // Score when the bird fully passes a pipe pair
    for (const p of pipes) {
      if (!p.scored && p.x + PIPE.width < BIRD.x - BIRD.radius) {
        p.scored = true;
        score += 1;
      }
    }
  }

  // ---------- Collision ----------
  // Circle vs axis-aligned rectangle
  function circleHitsRect(cx, cy, r, rx, ry, rw, rh) {
    const nearestX = Math.max(rx, Math.min(cx, rx + rw));
    const nearestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    return dx * dx + dy * dy < r * r;
  }

  function checkCollisions() {
    // Ground and ceiling
    if (bird.y + BIRD.radius >= PLAY_H) {
      bird.y = PLAY_H - BIRD.radius;
      return true;
    }
    if (bird.y - BIRD.radius <= 0) {
      bird.y = BIRD.radius;
      bird.vy = 0; // bump the ceiling, don't die (classic behaviour)
    }

    for (const p of pipes) {
      const bottomY = p.topHeight + PIPE.gap;
      if (
        circleHitsRect(BIRD.x, bird.y, BIRD.radius, p.x, 0, PIPE.width, p.topHeight) ||
        circleHitsRect(BIRD.x, bird.y, BIRD.radius, p.x, bottomY, PIPE.width, PLAY_H - bottomY)
      ) {
        return true;
      }
    }
    return false;
  }

  // ---------- Update ----------
  function update(dt) {
    if (state === State.READY) {
      // Idle bobbing
      bird.y = PLAY_H / 2 + Math.sin(performance.now() / 250) * 6;
      groundOffset = (groundOffset + PIPE.speed * dt) % 24;
      return;
    }

    if (state === State.PLAYING) {
      bird.vy = Math.min(bird.vy + PHYSICS.gravity * dt, PHYSICS.maxFall);
      bird.y += bird.vy * dt;
      bird.rotation = Math.max(-0.45, Math.min(1.2, bird.vy / 500));
      groundOffset = (groundOffset + PIPE.speed * dt) % 24;

      updatePipes(dt);
      if (checkCollisions()) gameOver();
      return;
    }

    // GAME_OVER: let the bird fall to the ground
    if (bird.y + BIRD.radius < PLAY_H) {
      bird.vy = Math.min(bird.vy + PHYSICS.gravity * dt, PHYSICS.maxFall);
      bird.y = Math.min(bird.y + bird.vy * dt, PLAY_H - BIRD.radius);
      bird.rotation = 1.4;
    }
  }

  // ---------- Rendering ----------
  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, PLAY_H);
    sky.addColorStop(0, DESIGN_SYSTEM.color.sky.start);
    sky.addColorStop(1, DESIGN_SYSTEM.color.sky.end);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
  }

  function drawPipes() {
    for (const p of pipes) {
      const bottomY = p.topHeight + PIPE.gap;
      ctx.fillStyle = DESIGN_SYSTEM.color.pipe.fill;
      ctx.strokeStyle = DESIGN_SYSTEM.color.pipe.outline;
      ctx.lineWidth = DESIGN_SYSTEM.border.pipe;

      // Bodies
      ctx.fillRect(p.x, 0, PIPE.width, p.topHeight);
      ctx.strokeRect(p.x, 0, PIPE.width, p.topHeight);
      ctx.fillRect(p.x, bottomY, PIPE.width, PLAY_H - bottomY);
      ctx.strokeRect(p.x, bottomY, PIPE.width, PLAY_H - bottomY);

      // Caps
      const capX = p.x - 4;
      const capW = PIPE.width + 8;
      ctx.fillRect(capX, p.topHeight - PIPE.capH, capW, PIPE.capH);
      ctx.strokeRect(capX, p.topHeight - PIPE.capH, capW, PIPE.capH);
      ctx.fillRect(capX, bottomY, capW, PIPE.capH);
      ctx.strokeRect(capX, bottomY, capW, PIPE.capH);
    }
  }

  function drawGround() {
    ctx.fillStyle = DESIGN_SYSTEM.color.ground.soil;
    ctx.fillRect(0, PLAY_H, W, GROUND_H);
    ctx.fillStyle = DESIGN_SYSTEM.color.ground.grass;
    ctx.fillRect(0, PLAY_H, W, 14);

    // Moving stripes
    ctx.fillStyle = DESIGN_SYSTEM.color.ground.grassStripe;
    for (let x = -groundOffset; x < W; x += 24) {
      ctx.fillRect(x, PLAY_H, 12, 14);
    }
    ctx.fillStyle = DESIGN_SYSTEM.color.ground.soilLine;
    ctx.fillRect(0, PLAY_H + 14, W, 3);
  }

  function drawBird() {
    ctx.save();
    ctx.translate(BIRD.x, bird.y);
    ctx.rotate(bird.rotation);

    // Body
    ctx.fillStyle = DESIGN_SYSTEM.color.bird.body;
    ctx.strokeStyle = DESIGN_SYSTEM.color.bird.outline;
    ctx.lineWidth = DESIGN_SYSTEM.border.bird;
    ctx.beginPath();
    ctx.arc(0, 0, BIRD.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Wing
    ctx.fillStyle = DESIGN_SYSTEM.color.bird.wing;
    ctx.beginPath();
    ctx.ellipse(-4, 3, 7, 4.5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = DESIGN_SYSTEM.color.text.primary;
    ctx.beginPath();
    ctx.arc(6, -4, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = DESIGN_SYSTEM.color.text.ink;
    ctx.beginPath();
    ctx.arc(7.5, -4, 2, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = DESIGN_SYSTEM.color.bird.beak;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(20, 3);
    ctx.lineTo(10, 7);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawText(text, x, y, size, color = DESIGN_SYSTEM.color.text.primary, outlined = true) {
    ctx.font = `${DESIGN_SYSTEM.typography.weight} ${size}px ${DESIGN_SYSTEM.typography.family}`;
    ctx.textAlign = 'center';
    if (outlined) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(3, size / 7);
      ctx.strokeStyle = DESIGN_SYSTEM.color.text.ink;
      ctx.strokeText(text, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function drawHUD() {
    if (state === State.PLAYING) {
      drawText(String(score), W / 2, 80, DESIGN_SYSTEM.typography.size.score);
    }

    if (state === State.READY) {
      drawText('PaoPao Gaming Inc.', W / 2, 102, DESIGN_SYSTEM.typography.size.brand, DESIGN_SYSTEM.color.text.primary, false);
      drawText('Flappy Bird', W / 2, 150, DESIGN_SYSTEM.typography.size.title, DESIGN_SYSTEM.color.text.display);
      drawText('Press Space or tap to start', W / 2, 400, DESIGN_SYSTEM.typography.size.prompt);
    }

    if (state === State.GAME_OVER) {
      ctx.fillStyle = DESIGN_SYSTEM.color.panel.overlay;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = DESIGN_SYSTEM.color.panel.fill;
      ctx.strokeStyle = DESIGN_SYSTEM.color.panel.outline;
      ctx.lineWidth = DESIGN_SYSTEM.border.panel;
      ctx.shadowColor = DESIGN_SYSTEM.shadow.panel;
      ctx.shadowBlur = DESIGN_SYSTEM.shadow.blur;
      ctx.shadowOffsetY = DESIGN_SYSTEM.shadow.offsetY;
      ctx.beginPath();
      ctx.roundRect(70, 190, 260, 190, DESIGN_SYSTEM.radius.panel);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.stroke();

      drawText('Game Over', W / 2, 160, DESIGN_SYSTEM.typography.size.modalTitle, DESIGN_SYSTEM.color.text.danger);
      ctx.fillStyle = DESIGN_SYSTEM.color.text.muted;
      ctx.font = `${DESIGN_SYSTEM.typography.weight} ${DESIGN_SYSTEM.typography.size.label}px ${DESIGN_SYSTEM.typography.family}`;
      ctx.textAlign = 'center';
      ctx.fillText('SCORE', W / 2, 230);
      ctx.fillText('BEST', W / 2, 305);
      drawText(String(score), W / 2, 270, DESIGN_SYSTEM.typography.size.value);
      drawText(String(best), W / 2, 345, DESIGN_SYSTEM.typography.size.value, DESIGN_SYSTEM.color.text.display);
      drawText('Press Enter or tap to restart', W / 2, 430, DESIGN_SYSTEM.typography.size.restart);
    }
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    drawPipes();
    drawGround();
    drawBird();
    drawHUD();
  }

  // ---------- Loop ----------
  function frame(timestamp) {
    // Clamp dt so tab-switching doesn't cause a physics jump
    const dt = Math.min((timestamp - lastTime) / 1000 || 0, 1 / 30);
    lastTime = timestamp;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  // ---------- Input ----------
  function handleAction() {
    if (state === State.GAME_OVER) {
      if (performance.now() - gameOverAt >= RESTART_DELAY_MS) restart();
    } else {
      flap();
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      handleAction();
    } else if (e.code === 'Enter') {
      e.preventDefault();
      if (state === State.GAME_OVER) handleAction();
    }
  });

  // Pointer events cover mouse, touch, and pen in one handler
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    handleAction();
  });

  // ---------- Start ----------
  reset();
  requestAnimationFrame(frame);
})();
