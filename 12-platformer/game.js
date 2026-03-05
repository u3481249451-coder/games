// ─────────────────────────────────────────────
//  PLATFORMER  –  game.js
// ─────────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

// ── Resize ────────────────────────────────────
function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', () => { resize(); if (running) buildCamera(); });
resize();

// ── Screens ───────────────────────────────────
const startScreen        = document.getElementById('startScreen');
const levelCompleteScreen= document.getElementById('levelCompleteScreen');
const gameOverScreen     = document.getElementById('gameOverScreen');
const hud                = document.getElementById('hud');

function showScreen(name) {
  [startScreen, levelCompleteScreen, gameOverScreen, hud, canvas].forEach(el =>
    el.classList.add('hidden'));
  if (name === 'start')    startScreen        .classList.remove('hidden');
  if (name === 'complete') levelCompleteScreen.classList.remove('hidden');
  if (name === 'gameover') gameOverScreen     .classList.remove('hidden');
  if (name === 'game')   { hud.classList.remove('hidden'); canvas.classList.remove('hidden'); }
}

// ── Input ─────────────────────────────────────
const keys = {};
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (!keys[k]) {
    keys[k] = true;
    handleKeyPress(k);
  }
  if ([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase()))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

function handleKeyPress(k) {
  if (!running) return;
  if (k === ' ' || k === 'arrowup' || k === 'w') tryJump();
  if (k === 'r') restartLevel();
}

// ── Constants ─────────────────────────────────
const GRAVITY   = 1800;   // px/s²
const JUMP_VEL  = -560;   // px/s  (first jump)
const JUMP2_VEL = -480;   // px/s  (double jump)
const MOVE_SPD  = 240;    // px/s
const TILE      = 40;     // world tile size
const MAX_LIVES = 5;

// ── Particle helper ───────────────────────────
let particles = [];
function spawnParticles(x, y, count, color, speed = 3, life = 35) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = (0.4 + Math.random() * 0.6) * speed;
    particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s - speed*0.4,
                     life, maxLife: life, color, size: 2 + Math.random()*3 });
  }
}

// ── Floating text ─────────────────────────────
let floatTexts = [];
function addFloat(x, y, text, color = '#fff') {
  floatTexts.push({ x, y, text, color, life: 55, vy: -1.2 });
}

// ── Level Definitions ─────────────────────────
// Each level: { platforms, stars, goal, spikes, movingPlatforms, bg }
// Coordinates in TILE units for easy editing; converted at load time.
// Platform: { x, y, w, h, type }  — type: 'solid' | 'oneway'
// Star:     { x, y }
// Goal:     { x, y }
// Spike:    { x, y, w }            — kills player
// Moving platform: { x, y, w, x1, x2, speed }  (horizontal patrol)

const T = TILE; // shorthand

const LEVELS = [
  // ── Level 1 ───────────────────────────────
  {
    bg: ['#1a1a2e','#16213e'],
    playerStart: { x: 2*T, y: 10*T },
    platforms: [
      // ground
      { x:0,    y:12*T, w:30*T, h:T,   type:'solid' },
      // platforms
      { x:5*T,  y:9*T,  w:4*T,  h:T/2, type:'oneway' },
      { x:11*T, y:7*T,  w:4*T,  h:T/2, type:'oneway' },
      { x:17*T, y:5*T,  w:5*T,  h:T/2, type:'oneway' },
      { x:23*T, y:8*T,  w:4*T,  h:T/2, type:'oneway' },
      { x:27*T, y:10*T, w:3*T,  h:T,   type:'solid'  },
    ],
    stars: [
      { x:6*T,  y:8*T  },
      { x:13*T, y:6*T  },
      { x:19*T, y:4*T  },
      { x:24*T, y:7*T  },
    ],
    spikes: [],
    movingPlatforms: [],
    goal: { x:28*T, y:9*T },
    width: 31*T,
  },

  // ── Level 2 ───────────────────────────────
  {
    bg: ['#0d1b2a','#1b263b'],
    playerStart: { x: 2*T, y: 10*T },
    platforms: [
      { x:0,    y:12*T, w:8*T,  h:T,   type:'solid'  },
      { x:10*T, y:12*T, w:5*T,  h:T,   type:'solid'  },
      { x:17*T, y:12*T, w:5*T,  h:T,   type:'solid'  },
      { x:24*T, y:12*T, w:8*T,  h:T,   type:'solid'  },
      { x:4*T,  y:9*T,  w:4*T,  h:T/2, type:'oneway' },
      { x:10*T, y:7*T,  w:5*T,  h:T/2, type:'oneway' },
      { x:18*T, y:6*T,  w:4*T,  h:T/2, type:'oneway' },
      { x:26*T, y:9*T,  w:5*T,  h:T/2, type:'oneway' },
    ],
    stars: [
      { x:5*T,  y:8*T  },
      { x:12*T, y:6*T  },
      { x:20*T, y:5*T  },
      { x:27*T, y:8*T  },
      { x:14*T, y:11*T },
    ],
    spikes: [
      { x:8*T,  y:12*T, w:2*T },
      { x:15*T, y:12*T, w:2*T },
    ],
    movingPlatforms: [],
    goal: { x:29*T, y:11*T },
    width: 32*T,
  },

  // ── Level 3 ───────────────────────────────
  {
    bg: ['#12001f','#1a003b'],
    playerStart: { x: 2*T, y: 10*T },
    platforms: [
      { x:0,    y:12*T, w:6*T,  h:T,   type:'solid'  },
      { x:8*T,  y:10*T, w:4*T,  h:T/2, type:'oneway' },
      { x:14*T, y:8*T,  w:4*T,  h:T/2, type:'oneway' },
      { x:20*T, y:6*T,  w:4*T,  h:T/2, type:'oneway' },
      { x:26*T, y:4*T,  w:4*T,  h:T/2, type:'oneway' },
      { x:30*T, y:6*T,  w:4*T,  h:T,   type:'solid'  },
      { x:30*T, y:12*T, w:6*T,  h:T,   type:'solid'  },
    ],
    stars: [
      { x:9*T,  y:9*T  },
      { x:15*T, y:7*T  },
      { x:21*T, y:5*T  },
      { x:27*T, y:3*T  },
      { x:31*T, y:5*T  },
    ],
    spikes: [
      { x:6*T,  y:12*T, w:2*T },
      { x:12*T, y:12*T, w:2*T },
      { x:18*T, y:12*T, w:4*T },
      { x:24*T, y:12*T, w:2*T },
    ],
    movingPlatforms: [
      { x:6*T, y:11*T, w:3*T, x1:6*T, x2:10*T, speed:80 },
    ],
    goal: { x:32*T, y:11*T },
    width: 37*T,
  },

  // ── Level 4 ───────────────────────────────
  {
    bg: ['#001f12','#003b1a'],
    playerStart: { x: 2*T, y: 11*T },
    platforms: [
      { x:0,    y:12*T, w:5*T,  h:T,   type:'solid'  },
      { x:6*T,  y:10*T, w:3*T,  h:T/2, type:'oneway' },
      { x:11*T, y:8*T,  w:3*T,  h:T/2, type:'oneway' },
      { x:16*T, y:6*T,  w:3*T,  h:T/2, type:'oneway' },
      { x:21*T, y:4*T,  w:3*T,  h:T/2, type:'oneway' },
      { x:26*T, y:6*T,  w:3*T,  h:T/2, type:'oneway' },
      { x:31*T, y:8*T,  w:3*T,  h:T/2, type:'oneway' },
      { x:35*T, y:10*T, w:5*T,  h:T,   type:'solid'  },
    ],
    stars: [
      { x:7*T,  y:9*T  },
      { x:12*T, y:7*T  },
      { x:17*T, y:5*T  },
      { x:22*T, y:3*T  },
      { x:27*T, y:5*T  },
      { x:32*T, y:7*T  },
    ],
    spikes: [
      { x:5*T,  y:12*T, w:T   },
      { x:9*T,  y:12*T, w:2*T },
      { x:14*T, y:12*T, w:2*T },
      { x:19*T, y:12*T, w:2*T },
      { x:24*T, y:12*T, w:2*T },
      { x:29*T, y:12*T, w:2*T },
    ],
    movingPlatforms: [
      { x:4*T,  y:11*T, w:3*T, x1:3*T,  x2:7*T,  speed:90 },
      { x:19*T, y:9*T,  w:3*T, x1:18*T, x2:23*T, speed:110 },
    ],
    goal: { x:37*T, y:9*T },
    width: 42*T,
  },

  // ── Level 5 ───────────────────────────────
  {
    bg: ['#1f1200','#3b2200'],
    playerStart: { x: 2*T, y: 10*T },
    platforms: [
      { x:0,    y:12*T, w:4*T,  h:T,   type:'solid'  },
      { x:5*T,  y:9*T,  w:2*T,  h:T/2, type:'oneway' },
      { x:9*T,  y:7*T,  w:2*T,  h:T/2, type:'oneway' },
      { x:13*T, y:5*T,  w:2*T,  h:T/2, type:'oneway' },
      { x:17*T, y:3*T,  w:3*T,  h:T/2, type:'oneway' },
      { x:21*T, y:5*T,  w:2*T,  h:T/2, type:'oneway' },
      { x:25*T, y:7*T,  w:2*T,  h:T/2, type:'oneway' },
      { x:29*T, y:9*T,  w:2*T,  h:T/2, type:'oneway' },
      { x:33*T, y:11*T, w:5*T,  h:T,   type:'solid'  },
    ],
    stars: [
      { x:5.5*T,y:8*T  },
      { x:9.5*T,y:6*T  },
      { x:13.5*T,y:4*T },
      { x:18*T,  y:2*T },
      { x:21.5*T,y:4*T },
      { x:25.5*T,y:6*T },
      { x:29.5*T,y:8*T },
    ],
    spikes: [
      { x:4*T,  y:12*T, w:T   },
      { x:7*T,  y:12*T, w:2*T },
      { x:11*T, y:12*T, w:2*T },
      { x:15*T, y:12*T, w:2*T },
      { x:19*T, y:12*T, w:2*T },
      { x:23*T, y:12*T, w:2*T },
      { x:27*T, y:12*T, w:2*T },
      { x:31*T, y:12*T, w:2*T },
    ],
    movingPlatforms: [
      { x:3*T,  y:11*T, w:3*T, x1:2*T,  x2:6*T,  speed:100 },
      { x:7*T,  y:9*T,  w:3*T, x1:6*T,  x2:10*T, speed:120 },
      { x:11*T, y:7*T,  w:3*T, x1:10*T, x2:14*T, speed:130 },
      { x:23*T, y:9*T,  w:3*T, x1:22*T, x2:27*T, speed:140 },
    ],
    goal: { x:35*T, y:10*T },
    width: 40*T,
  },
];

// ── Game State ────────────────────────────────
let running      = false;
let currentLevel = 0;
let totalDeaths  = 0;
let totalStars   = 0;

let levelDef;
let movingPlats  = [];   // live copies
let stars        = [];
let goal         = null;

// Player
let player;
function createPlayer(sx, sy) {
  return {
    x: sx, y: sy,
    vx: 0, vy: 0,
    w: 28, h: 36,
    onGround: false,
    onPlatform: null,   // ref to moving platform
    jumps: 0,           // 0=none used, 1=first used, 2=double used
    coyoteTimer: 0,     // ms – grace period after walking off edge
    jumpBuffer: 0,      // ms – buffered jump press
    facingRight: true,
    // animation
    animFrame: 0,
    animTimer: 0,
    // state
    dead: false,
    deadTimer: 0,
    lives: MAX_LIVES,
    starsCollected: 0,
    levelTime: 0,
    levelDeaths: 0,
    // drop through
    dropTimer: 0,
  };
}

// Camera
let cam = { x: 0, y: 0 };
function buildCamera() {
  cam.x = player.x - canvas.width  / 2 + player.w / 2;
  cam.y = player.y - canvas.height / 2 + player.h / 2;
  clampCamera();
}
function clampCamera() {
  cam.x = Math.max(0, Math.min(levelDef.width - canvas.width,  cam.x));
  cam.y = Math.max(0, Math.min(13*T - canvas.height, cam.y));  // world height = 13*T
}

// ── Load level ────────────────────────────────
function loadLevel(idx) {
  if (idx >= LEVELS.length) { showWin(); return; }
  levelDef = LEVELS[idx];
  movingPlats = levelDef.movingPlatforms.map(mp => ({ ...mp }));
  stars = levelDef.stars.map(s => ({ ...s, collected: false }));
  goal  = { ...levelDef.goal, w: T, h: T*1.5, reached: false };

  player = createPlayer(levelDef.playerStart.x, levelDef.playerStart.y);
  if (currentLevel > 0) player.lives  = player.lives; // keep lives across levels (already handled below)
  particles  = [];
  floatTexts = [];
  buildCamera();
  updateHUD();
}

function restartLevel() {
  player.levelDeaths++;
  totalDeaths++;
  player.lives--;
  if (player.lives <= 0) { gameOver(); return; }
  const saved = { lives: player.lives, starsCollected: player.starsCollected };
  loadLevel(currentLevel);
  player.lives          = saved.lives;
  player.starsCollected = saved.starsCollected;
  updateHUD();
}

// ── HUD ───────────────────────────────────────
function updateHUD() {
  document.getElementById('levelNum').textContent = currentLevel + 1;
  const totalS = stars.length;
  document.getElementById('starsTotal')    .textContent = totalS;
  document.getElementById('starsCollected').textContent = player.starsCollected;
  document.getElementById('timerNum')      .textContent = Math.floor(player.levelTime / 1000);
  // lives icons
  const iconsEl = document.getElementById('livesIcons');
  iconsEl.textContent = '';
  for (let i = 0; i < MAX_LIVES; i++) {
    const span = document.createElement('span');
    span.textContent = '♥';
    span.className   = i < player.lives ? 'life-icon alive' : 'life-icon dead';
    iconsEl.appendChild(span);
  }
}

// ── Jump ──────────────────────────────────────
function tryJump() {
  if (!player || player.dead) return;
  player.jumpBuffer = 120; // ms buffer
}

function processJump() {
  const canFirstJump = player.onGround || player.coyoteTimer > 0;
  if (player.jumpBuffer > 0) {
    if (canFirstJump && player.jumps < 1) {
      player.vy      = JUMP_VEL;
      player.jumps   = 1;
      player.jumpBuffer   = 0;
      player.coyoteTimer  = 0;
      player.onGround     = false;
      spawnParticles(player.x + player.w/2, player.y + player.h, 8, '#4ecdc4', 3, 20);
    } else if (!canFirstJump && player.jumps === 1) {
      player.vy    = JUMP2_VEL;
      player.jumps = 2;
      player.jumpBuffer = 0;
      spawnParticles(player.x + player.w/2, player.y + player.h/2, 12, '#f1c40f', 4, 25);
    }
  }
}

// ── Physics ───────────────────────────────────
function updatePlayer(dt) {
  if (player.dead) {
    player.deadTimer -= dt;
    if (player.deadTimer <= 0) restartLevel();
    return;
  }

  player.levelTime += dt;

  // horizontal
  let moveX = 0;
  if (keys['arrowleft']  || keys['a']) { moveX = -1; player.facingRight = false; }
  if (keys['arrowright'] || keys['d']) { moveX = +1; player.facingRight = true;  }

  player.vx = moveX * MOVE_SPD;

  // drop through one-way
  if ((keys['arrowdown'] || keys['s']) && player.onGround) {
    player.dropTimer = 150;
  }
  if (player.dropTimer > 0) player.dropTimer -= dt;

  // gravity
  player.vy += GRAVITY * (dt / 1000);
  player.vy  = Math.min(player.vy, 900);  // terminal velocity

  // moving platform carry
  if (player.onPlatform) {
    const mp = player.onPlatform;
    player.x += mp._vx * (dt / 1000);
  }

  // timers
  if (player.coyoteTimer > 0) player.coyoteTimer -= dt;
  if (player.jumpBuffer  > 0) player.jumpBuffer  -= dt;

  processJump();

  // move X
  player.x += player.vx * (dt / 1000);

  // world bounds X
  player.x = Math.max(0, Math.min(levelDef.width - player.w, player.x));

  const wasOnGround = player.onGround;
  player.onGround   = false;
  player.onPlatform = null;

  // ── Collide with static platforms ──────────
  const allPlats = [...levelDef.platforms, ...movingPlats.map(mp => ({
    x: mp.x, y: mp.y, w: mp.w, h: T/2, type: 'solid', _mp: mp
  }))];

  // vertical move + collision
  player.y += player.vy * (dt / 1000);

  for (const plat of allPlats) {
    if (!rectsOverlap(player, plat)) continue;

    const isOneway = plat.type === 'oneway';

    if (isOneway) {
      // only collide from above, and only if not dropping
      const prevBottom = player.y + player.h - player.vy * (dt / 1000);
      if (player.dropTimer > 0) continue;
      if (prevBottom > plat.y + 2) continue;  // was already below top
      if (player.vy < 0) continue;             // moving up
    }

    // resolve vertical
    if (player.vy >= 0) {
      // landing
      player.y  = plat.y - player.h;
      player.vy = 0;
      if (!wasOnGround) spawnParticles(player.x + player.w/2, player.y + player.h, 5, '#aaa', 2, 15);
      player.onGround   = true;
      player.jumps      = 0;
      player.coyoteTimer= 0;
      if (plat._mp) player.onPlatform = plat._mp;
    } else if (!isOneway) {
      // hitting ceiling
      player.y  = plat.y + plat.h;
      player.vy = 0;
    }
  }

  if (wasOnGround && !player.onGround && player.jumps === 0) {
    player.coyoteTimer = 120; // ms coyote time
  }

  // world bottom = death
  if (player.y > 14 * T) { killPlayer(); return; }

  // ── Spikes ───────────────────────────────
  for (const spike of levelDef.spikes) {
    const sr = { x: spike.x + 2, y: spike.y - T*0.6, w: spike.w - 4, h: T*0.6 };
    if (rectsOverlap(player, sr)) { killPlayer(); return; }
  }

  // ── Stars ────────────────────────────────
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    if (s.collected) continue;
    const sr = { x: s.x - 12, y: s.y - 12, w: 24, h: 24 };
    if (rectsOverlap(player, sr)) {
      s.collected = true;
      player.starsCollected++;
      totalStars++;
      spawnParticles(s.x, s.y, 15, '#f1c40f', 4, 40);
      addFloat(s.x, s.y - 20, '+★', '#f1c40f');
      updateHUD();
    }
  }

  // ── Goal ─────────────────────────────────
  if (!goal.reached && rectsOverlap(player, goal)) {
    goal.reached = true;
    spawnParticles(goal.x + goal.w/2, goal.y + goal.h/2, 30, '#2ecc71', 5, 50);
    setTimeout(showLevelComplete, 400);
  }

  // ── Animation ────────────────────────────
  if (player.vx !== 0 && player.onGround) {
    player.animTimer += dt;
    if (player.animTimer > 120) { player.animFrame = (player.animFrame + 1) % 4; player.animTimer = 0; }
  } else {
    player.animFrame = 0;
  }

  // ── Camera follow ─────────────────────────
  const targetX = player.x - canvas.width  / 2 + player.w / 2;
  const targetY = player.y - canvas.height / 2 + player.h / 2;
  cam.x += (targetX - cam.x) * 0.12;
  cam.y += (targetY - cam.y) * 0.12;
  clampCamera();

  updateHUD();
}

function killPlayer() {
  if (player.dead) return;
  player.dead      = true;
  player.deadTimer = 800;
  spawnParticles(player.x + player.w/2, player.y + player.h/2, 25, '#e94560', 5, 45);
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

// ── Moving platforms ──────────────────────────
function updateMovingPlatforms(dt) {
  for (const mp of movingPlats) {
    if (!mp._dir) mp._dir = 1;
    const speed = (mp.speed || 80) * mp._dir;
    mp._vx  = speed;
    mp.x   += speed * (dt / 1000);
    if (mp.x >= mp.x2) { mp.x = mp.x2; mp._dir = -1; }
    if (mp.x <= mp.x1) { mp.x = mp.x1; mp._dir =  1; }
  }
}

// ── DRAW ──────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, levelDef.bg[0]);
  grad.addColorStop(1, levelDef.bg[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-cam.x, -cam.y);

  // parallax bg dots
  drawBgStars();

  // moving platforms
  for (const mp of movingPlats) {
    drawMovingPlatform(mp);
  }

  // static platforms
  for (const plat of levelDef.platforms) {
    drawPlatform(plat);
  }

  // spikes
  for (const spike of levelDef.spikes) {
    drawSpikes(spike);
  }

  // stars
  for (const s of stars) {
    if (!s.collected) drawStar(s);
  }

  // goal
  if (goal && !goal.reached) drawGoal(goal);

  // particles
  for (const p of particles) {
    const a = p.life / p.maxLife;
    ctx.globalAlpha = a;
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // player
  if (!player.dead) drawPlayer();

  // float texts
  ctx.textAlign = 'center';
  for (const t of floatTexts) {
    ctx.globalAlpha = t.life / 55;
    ctx.fillStyle   = t.color;
    ctx.font        = 'bold 16px monospace';
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;

  ctx.restore();
}

function drawBgStars() {
  // subtle parallax layer
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  // deterministic dots based on level index
  const seed = currentLevel * 37 + 13;
  for (let i = 0; i < 60; i++) {
    const bx = ((seed * (i+1) * 1637) % levelDef.width);
    const by = ((seed * (i+1) * 997)  % (13*T));
    ctx.beginPath();
    ctx.arc(bx, by, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlatform(plat) {
  if (plat.type === 'oneway') {
    ctx.fillStyle = '#4ecdc4';
    ctx.shadowColor = '#4ecdc4';
    ctx.shadowBlur  = 8;
    ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
    ctx.shadowBlur = 0;
    // top line
    ctx.fillStyle = '#fff';
    ctx.fillRect(plat.x, plat.y, plat.w, 3);
  } else {
    // solid: brick style
    ctx.fillStyle = '#2d3561';
    ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
    ctx.fillStyle = '#3d4a7a';
    // brick lines
    const bs = T;
    for (let bx = plat.x; bx < plat.x + plat.w; bx += bs) {
      for (let by = plat.y; by < plat.y + plat.h; by += T/2) {
        ctx.strokeStyle = '#1a2040';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, bs, T/2);
      }
    }
    // top edge highlight
    ctx.fillStyle = '#5a6fa0';
    ctx.fillRect(plat.x, plat.y, plat.w, 3);
  }
}

function drawMovingPlatform(mp) {
  ctx.fillStyle   = '#e94560';
  ctx.shadowColor = '#e94560';
  ctx.shadowBlur  = 10;
  ctx.fillRect(mp.x, mp.y, mp.w, T/2);
  ctx.shadowBlur  = 0;
  ctx.fillStyle   = '#ff8fa3';
  ctx.fillRect(mp.x, mp.y, mp.w, 3);
}

function drawSpikes(spike) {
  const count = Math.round(spike.w / (T/2));
  const sw    = spike.w / count;
  const sh    = T * 0.65;
  ctx.fillStyle   = '#ff3366';
  ctx.shadowColor = '#ff3366';
  ctx.shadowBlur  = 6;
  for (let i = 0; i < count; i++) {
    const sx = spike.x + i * sw;
    ctx.beginPath();
    ctx.moveTo(sx,       spike.y);
    ctx.lineTo(sx + sw/2, spike.y - sh);
    ctx.lineTo(sx + sw,  spike.y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function drawStar(s) {
  const t   = Date.now() / 600;
  const bob = Math.sin(t + s.x * 0.01) * 4;
  ctx.save();
  ctx.translate(s.x, s.y + bob);
  ctx.fillStyle   = '#f1c40f';
  ctx.shadowColor = '#f1c40f';
  ctx.shadowBlur  = 15;
  drawStarShape(ctx, 0, 0, 5, 12, 5);
  ctx.shadowBlur  = 0;
  ctx.restore();
}

function drawStarShape(ctx, cx, cy, spikes, outer, inner) {
  let rot  = -Math.PI / 2;
  const step = Math.PI / spikes;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    ctx.lineTo(cx + Math.cos(rot) * r, cy + Math.sin(rot) * r);
    rot += step;
  }
  ctx.closePath();
  ctx.fill();
}

function drawGoal(g) {
  const t = Date.now() / 400;
  ctx.save();
  ctx.translate(g.x + g.w/2, g.y + g.h/2);
  // flag pole
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth   = 3;
  ctx.beginPath();
  ctx.moveTo(0,  g.h/2);
  ctx.lineTo(0, -g.h/2);
  ctx.stroke();
  // waving flag
  ctx.fillStyle   = '#2ecc71';
  ctx.shadowColor = '#2ecc71';
  ctx.shadowBlur  = 12;
  ctx.beginPath();
  const flagW = T * 1.2, flagH = T * 0.7;
  ctx.moveTo(0, -g.h/2);
  for (let i = 0; i <= 10; i++) {
    const px = (i / 10) * flagW;
    const py = Math.sin(t + i * 0.5) * 5 - g.h/2 + flagH/2;
    ctx.lineTo(px, py);
  }
  for (let i = 10; i >= 0; i--) {
    const px = (i / 10) * flagW;
    const py = Math.sin(t + i * 0.5) * 5 - g.h/2 + flagH;
    ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawPlayer() {
  if (player.dead) return;
  ctx.save();
  ctx.translate(player.x + player.w/2, player.y + player.h/2);
  if (!player.facingRight) ctx.scale(-1, 1);

  // body
  ctx.fillStyle   = '#4ecdc4';
  ctx.shadowColor = '#4ecdc4';
  ctx.shadowBlur  = 14;

  // leg bob
  const legBob = player.onGround && player.vx !== 0
    ? Math.sin(player.animFrame * Math.PI / 2) * 4 : 0;

  // body rect with rounded look
  const hw = player.w/2, hh = player.h/2;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh + legBob, player.w, player.h, 6);
  ctx.fill();

  // face
  ctx.fillStyle = '#0d1b2a';
  // eye
  ctx.beginPath();
  ctx.arc(hw * 0.35, -hh * 0.25 + legBob, 4, 0, Math.PI * 2);
  ctx.fill();
  // eye shine
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(hw * 0.35 + 1.5, -hh * 0.25 + legBob - 1, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // double-jump sparkle
  if (player.jumps === 2) {
    ctx.fillStyle = 'rgba(241,196,15,0.6)';
    for (let i = 0; i < 4; i++) {
      const a = (Date.now() / 150 + i * Math.PI/2);
      ctx.beginPath();
      ctx.arc(Math.cos(a)*14, Math.sin(a)*14 + legBob, 3, 0, Math.PI*2);
      ctx.fill();
    }
  }

  ctx.shadowBlur = 0;
  ctx.restore();
}

// ── GAME LOOP ─────────────────────────────────
let lastTime = 0;

function update(dt) {
  updateMovingPlatforms(dt);
  updatePlayer(dt);

  // particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vy += 0.12;
    p.vx *= 0.94; p.vy *= 0.94;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = floatTexts.length - 1; i >= 0; i--) {
    const t = floatTexts[i];
    t.y += t.vy; t.life--;
    if (t.life <= 0) floatTexts.splice(i, 1);
  }
}

function loop(ts) {
  if (!running) return;
  const dt = Math.min(ts - lastTime, 50);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

// ── Level complete / Game over / Win ──────────
function showLevelComplete() {
  running = false;
  const starsTotal = stars.length;
  document.getElementById('lcTime')  .textContent = Math.floor(player.levelTime / 1000) + 's';
  document.getElementById('lcStars') .textContent = player.starsCollected + '/' + starsTotal;
  document.getElementById('lcDeaths').textContent = player.levelDeaths;
  const isLast = currentLevel >= LEVELS.length - 1;
  document.getElementById('levelCompleteTitle').textContent =
    isLast ? 'GEWONNEN! 🎉' : 'LEVEL GESCHAFFT!';
  document.getElementById('nextLevelBtn').textContent = isLast ? 'NEU STARTEN' : 'WEITER';
  showScreen('complete');
}

function gameOver() {
  running = false;
  document.getElementById('goLevel') .textContent = currentLevel + 1;
  document.getElementById('goStars') .textContent = totalStars;
  document.getElementById('goDeaths').textContent = totalDeaths;
  showScreen('gameover');
}

function showWin() {
  showLevelComplete();
}

// ── Buttons ───────────────────────────────────
document.getElementById('startBtn').addEventListener('click', () => {
  currentLevel = 0;
  totalDeaths  = 0;
  totalStars   = 0;
  loadLevel(0);
  showScreen('game');
  running  = true;
  lastTime = performance.now();
  requestAnimationFrame(loop);
});

document.getElementById('nextLevelBtn').addEventListener('click', () => {
  const isLast = currentLevel >= LEVELS.length - 1;
  if (isLast) {
    currentLevel = 0;
    totalDeaths  = 0;
    totalStars   = 0;
  } else {
    currentLevel++;
  }
  const prevLives = player ? player.lives : MAX_LIVES;
  loadLevel(currentLevel);
  player.lives = prevLives;
  updateHUD();
  showScreen('game');
  running  = true;
  lastTime = performance.now();
  requestAnimationFrame(loop);
});

document.getElementById('restartBtn').addEventListener('click', () => {
  currentLevel = 0;
  totalDeaths  = 0;
  totalStars   = 0;
  loadLevel(0);
  showScreen('game');
  running  = true;
  lastTime = performance.now();
  requestAnimationFrame(loop);
});

// ── Start ─────────────────────────────────────
showScreen('start');
