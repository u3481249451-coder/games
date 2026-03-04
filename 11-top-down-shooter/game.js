// ─────────────────────────────────────────────
//  TOP-DOWN SHOOTER  –  game.js
// ─────────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

// ── Resize ────────────────────────────────────
function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ── Screens / HUD ─────────────────────────────
const startScreen    = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const hud            = document.getElementById('hud');

function showScreen(name) {
  startScreen   .classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  hud           .classList.add('hidden');
  canvas        .classList.add('hidden');
  if (name === 'start')    { startScreen   .classList.remove('hidden'); }
  if (name === 'gameover') { gameOverScreen.classList.remove('hidden'); }
  if (name === 'game')     { hud.classList.remove('hidden'); canvas.classList.remove('hidden'); }
}

// ── Input ─────────────────────────────────────
const keys  = {};
const mouse = { x: 0, y: 0, down: false };

window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true;  });
window.addEventListener('keyup',   e => { keys[e.key.toLowerCase()] = false; });
canvas.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
canvas.addEventListener('mousedown', e => { if (e.button === 0) mouse.down = true;  });
canvas.addEventListener('mouseup',   e => { if (e.button === 0) mouse.down = false; });

// ── Weapon Definitions ────────────────────────
const WEAPONS = [
  { name: 'Pistole',     damage: 25, fireRate: 400,  speed: 14, spread: 0.05, ammo: 12,  maxAmmo: 12,  reloadTime: 1200, bulletSize: 4,  auto: false, color: '#FFD700' },
  { name: 'Sturmgewehr', damage: 15, fireRate: 120,  speed: 16, spread: 0.12, ammo: 30,  maxAmmo: 30,  reloadTime: 2000, bulletSize: 3,  auto: true,  color: '#FF8C00' },
  { name: 'Schrotflinte',damage: 20, fireRate: 800,  speed: 12, spread: 0.35, ammo: 8,   maxAmmo: 8,   reloadTime: 2500, bulletSize: 5,  auto: false, color: '#FF4500', pellets: 6 },
];

// ── Particle / Object Pools ────────────────────
let particles = [];
let pickups   = [];
let bullets   = [];
let enemies   = [];
let floatingTexts = [];

// ── Helpers ───────────────────────────────────
function rnd(min, max) { return Math.random() * (max - min) + min; }
function rndInt(min, max) { return Math.floor(rnd(min, max + 1)); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function spawnParticles(x, y, count, color, speed = 3, life = 30) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const s     = rnd(0.5, 1) * speed;
    particles.push({ x, y, vx: Math.cos(angle) * s, vy: Math.sin(angle) * s,
                     life, maxLife: life, color, size: rnd(2, 5) });
  }
}

function addFloatingText(x, y, text, color = '#fff') {
  floatingTexts.push({ x, y, text, color, life: 60, vy: -1.5 });
}

// ── Camera ────────────────────────────────────
const cam = { x: 0, y: 0 };

// ── Map / World ───────────────────────────────
const WORLD_W = 2400;
const WORLD_H = 1800;
const TILE    = 64;

// simple tiled floor
function drawFloor() {
  const sx = Math.floor((cam.x - canvas.width)  / TILE) * TILE;
  const sy = Math.floor((cam.y - canvas.height) / TILE) * TILE;
  const ex = cam.x + canvas.width  + TILE;
  const ey = cam.y + canvas.height + TILE;

  for (let wx = sx; wx < ex; wx += TILE) {
    for (let wy = sy; wy < ey; wy += TILE) {
      const tx = wx - cam.x;
      const ty = wy - cam.y;
      const dark = ((Math.floor(wx / TILE) + Math.floor(wy / TILE)) % 2 === 0);
      ctx.fillStyle = dark ? '#1a1a2e' : '#16213e';
      ctx.fillRect(tx, ty, TILE, TILE);
    }
  }
  // world border
  ctx.strokeStyle = '#e94560';
  ctx.lineWidth   = 4;
  ctx.strokeRect(-cam.x, -cam.y, WORLD_W, WORLD_H);
}

// ── Player ────────────────────────────────────
function createPlayer() {
  return {
    x: WORLD_W / 2, y: WORLD_H / 2,
    vx: 0, vy: 0,
    speed: 220,           // px/s
    radius: 18,
    hp: 100, maxHp: 100,
    iframes: 0,           // invincibility frames after hit
    weaponIndex: 0,
    weapons: WEAPONS.map(w => ({ ...w })),  // personal copies
    lastShot: 0,
    reloading: false,
    reloadTimer: 0,
    angle: 0,
    kills: 0,
    score: 0,
    // dash
    dashCd: 0,
    dashing: false,
    dashTimer: 0,
    dashVx: 0, dashVy: 0,
  };
}

let player;

function currentWeapon() { return player.weapons[player.weaponIndex]; }

// ── Bullets ───────────────────────────────────
function fireBullet(fromEnemy = false, ex = 0, ey = 0, eAngle = 0, eDamage = 10) {
  if (fromEnemy) {
    bullets.push({ x: ex, y: ey, vx: Math.cos(eAngle) * 10, vy: Math.sin(eAngle) * 10,
                   damage: eDamage, fromEnemy: true, radius: 5, life: 120,
                   color: '#ff3366' });
    return;
  }
  const w = currentWeapon();
  if (w.reloading || w.ammo <= 0) { startReload(); return; }
  const now = performance.now();
  if (now - player.lastShot < w.fireRate) return;
  player.lastShot = now;

  const baseAngle = Math.atan2(mouse.y - canvas.height / 2, mouse.x - canvas.width / 2);
  const count = w.pellets || 1;
  for (let i = 0; i < count; i++) {
    const angle = baseAngle + rnd(-w.spread, w.spread);
    bullets.push({
      x: player.x, y: player.y,
      vx: Math.cos(angle) * w.speed,
      vy: Math.sin(angle) * w.speed,
      damage: w.damage,
      fromEnemy: false,
      radius: w.bulletSize,
      life: 90,
      color: w.color,
    });
  }
  w.ammo--;
  if (w.ammo <= 0) startReload();
  updateAmmoHUD();
}

function startReload() {
  const w = currentWeapon();
  if (w.reloading || w.ammo === w.maxAmmo) return;
  w.reloading  = true;
  w.reloadTimer = w.reloadTime;
  document.getElementById('reloadText').classList.remove('hidden');
  document.getElementById('ammoCount').style.opacity = '0.4';
}

// ── Enemies ───────────────────────────────────
const ENEMY_TYPES = {
  grunt: {
    color: '#e94560', radius: 16, hp: 60,  speed: 80,  score: 10,
    shootCd: 0, shootInterval: 0,   damage: 10, contactDmg: 15,
  },
  fast: {
    color: '#f5a623', radius: 12, hp: 30,  speed: 160, score: 15,
    shootCd: 0, shootInterval: 0,   damage: 0,  contactDmg: 20,
  },
  tank: {
    color: '#8b0000', radius: 28, hp: 200, speed: 50,  score: 40,
    shootCd: 0, shootInterval: 0,   damage: 0,  contactDmg: 30,
  },
  shooter: {
    color: '#9b59b6', radius: 16, hp: 50,  speed: 60,  score: 25,
    shootCd: 0, shootInterval: 2200, damage: 12, contactDmg: 10,
  },
  bomber: {
    color: '#e67e22', radius: 20, hp: 80,  speed: 100, score: 30,
    shootCd: 0, shootInterval: 0,   damage: 0,  contactDmg: 0, // explodes on death
    explodeRadius: 120, explodeDamage: 40,
  },
};

function spawnEnemy(wave) {
  const types = Object.keys(ENEMY_TYPES);
  let pool;
  if      (wave <= 2)  pool = ['grunt'];
  else if (wave <= 4)  pool = ['grunt', 'fast'];
  else if (wave <= 6)  pool = ['grunt', 'fast', 'tank'];
  else if (wave <= 9)  pool = ['grunt', 'fast', 'tank', 'shooter'];
  else                 pool = types;

  const type = pool[rndInt(0, pool.length - 1)];
  const def  = ENEMY_TYPES[type];

  // spawn on world edges
  let x, y;
  if (Math.random() < 0.5) {
    x = Math.random() < 0.5 ? -30 : WORLD_W + 30;
    y = rnd(0, WORLD_H);
  } else {
    x = rnd(0, WORLD_W);
    y = Math.random() < 0.5 ? -30 : WORLD_H + 30;
  }

  const hpScale = 1 + (wave - 1) * 0.12;
  return {
    ...JSON.parse(JSON.stringify(def)),
    type,
    x, y,
    vx: 0, vy: 0,
    hp: Math.round(def.hp * hpScale),
    maxHp: Math.round(def.hp * hpScale),
    id: Math.random(),
  };
}

// ── Pickups ───────────────────────────────────
function spawnPickup(x, y) {
  if (Math.random() > 0.35) return;
  const roll = Math.random();
  let kind, color;
  if      (roll < 0.5)  { kind = 'health'; color = '#2ecc71'; }
  else if (roll < 0.8)  { kind = 'ammo';   color = '#3498db'; }
  else                  { kind = 'speed';   color = '#f1c40f'; }
  pickups.push({ x, y, kind, color, radius: 10, life: 600 });
}

// ── Wave System ───────────────────────────────
let wave          = 1;
let waveEnemies   = 0;   // total to spawn this wave
let waveSpawned   = 0;
let waveKilled    = 0;
let spawnTimer    = 0;
let betweenWaves  = false;
let betweenTimer  = 0;
const BETWEEN_DURATION = 5000; // ms

function startWave(n) {
  wave         = n;
  waveEnemies  = 5 + n * 3 + Math.floor(n / 3) * 2;
  waveSpawned  = 0;
  waveKilled   = 0;
  betweenWaves = false;
  spawnTimer   = 0;
  updateWaveHUD();
  document.getElementById('waveStatus').textContent = '';
  addFloatingText(player.x, player.y - 40, `Welle ${n}!`, '#f1c40f');
}

function updateWaveHUD() {
  document.getElementById('waveNum').textContent = wave;
}

// ── HUD Updates ───────────────────────────────
function updateAmmoHUD() {
  const w = currentWeapon();
  document.getElementById('ammoCount').textContent = w.ammo;
  document.getElementById('ammoMax') .textContent  = w.maxAmmo;
  document.getElementById('weaponName').textContent = w.name;
}

function updateHealthHUD() {
  const pct = (player.hp / player.maxHp) * 100;
  document.getElementById('healthFill').style.width = pct + '%';
  document.getElementById('healthFill').style.background =
    pct > 50 ? '#2ecc71' : pct > 25 ? '#f39c12' : '#e74c3c';
  document.getElementById('healthText').textContent = Math.ceil(player.hp) + ' HP';
}

function updateScoreHUD() {
  document.getElementById('scoreNum').textContent = player.score;
  document.getElementById('killNum') .textContent = player.kills;
}

// ── Damage Flash ──────────────────────────────
let damageFlash = 0;

// ── Main Game State ───────────────────────────
let running   = false;
let lastTime  = 0;
let highScore = parseInt(localStorage.getItem('tds_highscore') || '0');

function initGame() {
  player        = createPlayer();
  particles     = [];
  pickups       = [];
  bullets       = [];
  enemies       = [];
  floatingTexts = [];
  wave          = 1;
  waveEnemies   = 0;
  waveSpawned   = 0;
  waveKilled    = 0;
  betweenWaves  = false;
  betweenTimer  = 0;
  spawnTimer    = 0;
  damageFlash   = 0;
  cam.x = player.x - canvas.width  / 2;
  cam.y = player.y - canvas.height / 2;
  startWave(1);
  updateAmmoHUD();
  updateHealthHUD();
  updateScoreHUD();
}

// ── UPDATE ────────────────────────────────────
function update(dt) {
  const dtS = dt / 1000;

  // ── Between-wave countdown ─────────────────
  if (betweenWaves) {
    betweenTimer -= dt;
    const secs = Math.ceil(betweenTimer / 1000);
    document.getElementById('waveStatus').textContent =
      `Nächste Welle in ${secs}…`;
    if (betweenTimer <= 0) startWave(wave + 1);
    // still update remaining enemies / particles
  }

  // ── Wave spawning ──────────────────────────
  if (!betweenWaves) {
    const interval = Math.max(400, 1200 - wave * 60);
    spawnTimer -= dt;
    if (spawnTimer <= 0 && waveSpawned < waveEnemies) {
      enemies.push(spawnEnemy(wave));
      waveSpawned++;
      spawnTimer = interval;
    }
  }

  // ── Player movement ────────────────────────
  let moveX = 0, moveY = 0;
  if (keys['w'] || keys['arrowup'])    moveY -= 1;
  if (keys['s'] || keys['arrowdown'])  moveY += 1;
  if (keys['a'] || keys['arrowleft'])  moveX -= 1;
  if (keys['d'] || keys['arrowright']) moveX += 1;

  const len = Math.hypot(moveX, moveY);
  if (len > 0) { moveX /= len; moveY /= len; }

  // Dash (Space)
  if (keys[' '] && player.dashCd <= 0 && !player.dashing && len > 0) {
    player.dashing  = true;
    player.dashTimer = 180;   // ms
    player.dashVx   = moveX * 550;
    player.dashVy   = moveY * 550;
    player.dashCd   = 1200;
    player.iframes  = 300;
    spawnParticles(player.x, player.y, 10, '#4ecdc4', 4, 20);
  }
  if (player.dashCd   > 0) player.dashCd   -= dt;
  if (player.iframes  > 0) player.iframes  -= dt;

  if (player.dashing) {
    player.dashTimer -= dt;
    player.x += player.dashVx * dtS;
    player.y += player.dashVy * dtS;
    if (player.dashTimer <= 0) player.dashing = false;
  } else {
    player.x += moveX * player.speed * dtS;
    player.y += moveY * player.speed * dtS;
  }

  // clamp to world
  player.x = clamp(player.x, player.radius, WORLD_W - player.radius);
  player.y = clamp(player.y, player.radius, WORLD_H - player.radius);

  // aim angle
  player.angle = Math.atan2(mouse.y - canvas.height / 2, mouse.x - canvas.width / 2);

  // ── Shooting ───────────────────────────────
  const w = currentWeapon();
  if (w.reloading) {
    w.reloadTimer -= dt;
    if (w.reloadTimer <= 0) {
      w.ammo      = w.maxAmmo;
      w.reloading = false;
      document.getElementById('reloadText').classList.add('hidden');
      document.getElementById('ammoCount').style.opacity = '1';
      updateAmmoHUD();
    }
  }

  if (keys['r']) startReload();

  // weapon switch
  if (keys['1']) switchWeapon(0);
  if (keys['2']) switchWeapon(1);
  if (keys['3']) switchWeapon(2);

  if ((mouse.down && w.auto) || (!w.auto && mouse.down)) {
    if (!w.auto) {
      // semi-auto: only fire once per press
      if (!player._fired) { fireBullet(); player._fired = true; }
    } else {
      fireBullet();
    }
  }
  if (!mouse.down) player._fired = false;

  // ── Update bullets ─────────────────────────
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx;
    b.y += b.vy;
    b.life--;
    // world bounds
    if (b.x < 0 || b.x > WORLD_W || b.y < 0 || b.y > WORLD_H || b.life <= 0) {
      bullets.splice(i, 1); continue;
    }
    // hit player
    if (b.fromEnemy && player.iframes <= 0 && dist(b, player) < player.radius + b.radius) {
      playerTakeDamage(b.damage);
      spawnParticles(b.x, b.y, 6, '#ff3366', 3, 20);
      bullets.splice(i, 1); continue;
    }
    // hit enemies
    if (!b.fromEnemy) {
      let hit = false;
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (dist(b, e) < e.radius + b.radius) {
          damageEnemy(j, b.damage, b.x, b.y);
          spawnParticles(b.x, b.y, 5, e.color, 2.5, 18);
          hit = true;
          break;
        }
      }
      if (hit) { bullets.splice(i, 1); }
    }
  }

  // ── Update enemies ─────────────────────────
  const now = performance.now();
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const angle = Math.atan2(player.y - e.y, player.x - e.x);
    e.vx = Math.cos(angle) * e.speed;
    e.vy = Math.sin(angle) * e.speed;
    e.x += e.vx * dtS;
    e.y += e.vy * dtS;

    // enemy shooting
    if (e.shootInterval > 0) {
      e.shootCd -= dt;
      if (e.shootCd <= 0) {
        fireBullet(true, e.x, e.y, angle, e.damage);
        e.shootCd = e.shootInterval;
      }
    }

    // contact damage with player
    if (player.iframes <= 0 && dist(e, player) < e.radius + player.radius) {
      if (e.type === 'bomber') {
        // explode
        explodeEnemy(i);
        continue;
      }
      playerTakeDamage(e.contactDmg);
      player.iframes = 500;
    }
  }

  // ── Pickups ───────────────────────────────
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.life--;
    if (p.life <= 0) { pickups.splice(i, 1); continue; }
    if (dist(p, player) < p.radius + player.radius + 10) {
      applyPickup(p);
      spawnParticles(p.x, p.y, 12, p.color, 3, 25);
      pickups.splice(i, 1);
    }
  }

  // ── Particles ────────────────────────────
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.9; p.vy *= 0.9;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // ── Floating texts ───────────────────────
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const t = floatingTexts[i];
    t.y  += t.vy;
    t.life--;
    if (t.life <= 0) floatingTexts.splice(i, 1);
  }

  // ── Camera ───────────────────────────────
  const targetCX = player.x - canvas.width  / 2;
  const targetCY = player.y - canvas.height / 2;
  cam.x += (targetCX - cam.x) * 0.1;
  cam.y += (targetCY - cam.y) * 0.1;

  // ── Check wave complete ───────────────────
  if (!betweenWaves && waveKilled >= waveEnemies && enemies.length === 0) {
    betweenWaves = true;
    betweenTimer = BETWEEN_DURATION;
    // heal a bit between waves
    player.hp = Math.min(player.maxHp, player.hp + 20);
    updateHealthHUD();
  }

  // ── Damage flash ─────────────────────────
  if (damageFlash > 0) damageFlash -= dt;
}

function switchWeapon(idx) {
  if (idx < 0 || idx >= WEAPONS.length) return;
  player.weaponIndex = idx;
  updateAmmoHUD();
}

function playerTakeDamage(dmg) {
  player.hp = Math.max(0, player.hp - dmg);
  damageFlash = 300;
  updateHealthHUD();
  if (player.hp <= 0) gameOver();
}

function damageEnemy(idx, dmg, bx, by) {
  const e = enemies[idx];
  e.hp -= dmg;
  addFloatingText(e.x, e.y - e.radius, `-${dmg}`, '#fff');
  if (e.hp <= 0) {
    if (e.type === 'bomber') { explodeEnemy(idx); return; }
    killEnemy(idx);
  }
}

function explodeEnemy(idx) {
  const e = enemies[idx];
  spawnParticles(e.x, e.y, 30, '#ff6600', 6, 45);
  addFloatingText(e.x, e.y - 30, 'BOOM!', '#ff6600');
  if (dist(e, player) < (e.explodeRadius || 120)) {
    playerTakeDamage(e.explodeDamage || 40);
  }
  killEnemy(idx);
}

function killEnemy(idx) {
  const e = enemies[idx];
  spawnParticles(e.x, e.y, 20, e.color, 4, 35);
  spawnPickup(e.x, e.y);
  player.kills++;
  const scoreGain = e.score * wave;
  player.score += scoreGain;
  addFloatingText(e.x, e.y - e.radius - 10, `+${scoreGain}`, '#f1c40f');
  waveKilled++;
  enemies.splice(idx, 1);
  updateScoreHUD();
}

function applyPickup(p) {
  if      (p.kind === 'health') { player.hp = Math.min(player.maxHp, player.hp + 30); updateHealthHUD(); addFloatingText(p.x, p.y, '+30 HP', '#2ecc71'); }
  else if (p.kind === 'ammo')   { const w = currentWeapon(); w.ammo = w.maxAmmo; updateAmmoHUD(); addFloatingText(p.x, p.y, 'Munition!', '#3498db'); }
  else if (p.kind === 'speed')  { player.speed = Math.min(350, player.speed + 20); addFloatingText(p.x, p.y, 'Speed+', '#f1c40f'); }
}

// ── DRAW ──────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-cam.x, -cam.y);

  drawFloor();

  // pickups
  for (const p of pickups) {
    const alpha = p.life < 120 ? p.life / 120 : 1;
    ctx.globalAlpha = alpha;
    // pulsing glow
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 200);
    ctx.shadowColor = p.color;
    ctx.shadowBlur  = 12 * pulse;
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur  = 0;
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    const label = p.kind === 'health' ? '♥' : p.kind === 'ammo' ? '⬟' : '★';
    ctx.fillText(label, p.x, p.y + 4);
  }

  // particles
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // enemies
  for (const e of enemies) {
    drawEnemy(e);
  }

  // bullets
  for (const b of bullets) {
    ctx.shadowColor = b.color;
    ctx.shadowBlur  = 8;
    ctx.fillStyle   = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur  = 0;
  }

  // player
  drawPlayer();

  // floating texts
  ctx.textAlign = 'center';
  for (const t of floatingTexts) {
    const alpha = t.life / 60;
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = t.color;
    ctx.font        = 'bold 14px monospace';
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  // damage vignette
  if (damageFlash > 0) {
    const alpha = (damageFlash / 300) * 0.45;
    ctx.fillStyle = `rgba(220,30,30,${alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // crosshair
  drawCrosshair();
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);

  // iframes flicker
  if (player.iframes > 0 && Math.floor(player.iframes / 60) % 2 === 0) {
    ctx.restore(); return;
  }

  // shadow
  ctx.shadowColor = '#4ecdc4';
  ctx.shadowBlur  = player.dashing ? 30 : 15;

  // body
  ctx.fillStyle = '#4ecdc4';
  ctx.beginPath();
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
  ctx.fill();

  // gun barrel
  ctx.strokeStyle = '#ffffffcc';
  ctx.lineWidth   = 5;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(player.angle) * 28, Math.sin(player.angle) * 28);
  ctx.stroke();

  // direction dot
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(Math.cos(player.angle) * 20, Math.sin(player.angle) * 20, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawEnemy(e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.shadowColor = e.color;
  ctx.shadowBlur  = 10;

  if (e.type === 'tank') {
    // square
    ctx.fillStyle = e.color;
    ctx.fillRect(-e.radius, -e.radius, e.radius * 2, e.radius * 2);
  } else if (e.type === 'fast') {
    // triangle
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.moveTo(0, -e.radius);
    ctx.lineTo(e.radius * 0.9, e.radius * 0.8);
    ctx.lineTo(-e.radius * 0.9, e.radius * 0.8);
    ctx.closePath();
    ctx.fill();
  } else if (e.type === 'bomber') {
    // star
    drawStar(ctx, 0, 0, 5, e.radius, e.radius * 0.5, e.color);
  } else {
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowBlur = 0;

  // HP bar
  const barW = e.radius * 2;
  const barH = 4;
  const barY = -e.radius - 8;
  ctx.fillStyle = '#333';
  ctx.fillRect(-barW / 2, barY, barW, barH);
  const pct = e.hp / e.maxHp;
  ctx.fillStyle = pct > 0.5 ? '#2ecc71' : pct > 0.25 ? '#f39c12' : '#e74c3c';
  ctx.fillRect(-barW / 2, barY, barW * pct, barH);

  ctx.restore();
}

function drawStar(ctx, cx, cy, spikes, outerR, innerR, color) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerR);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawCrosshair() {
  const x = mouse.x, y = mouse.y;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth   = 1.5;
  const s = 10, g = 5;
  ctx.beginPath();
  ctx.moveTo(x - s - g, y); ctx.lineTo(x - g, y);
  ctx.moveTo(x + g, y);     ctx.lineTo(x + s + g, y);
  ctx.moveTo(x, y - s - g); ctx.lineTo(x, y - g);
  ctx.moveTo(x, y + g);     ctx.lineTo(x, y + s + g);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ── LOOP ──────────────────────────────────────
function loop(ts) {
  if (!running) return;
  const dt = Math.min(ts - lastTime, 50);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

// ── GAME OVER ─────────────────────────────────
function gameOver() {
  running = false;
  if (player.score > highScore) {
    highScore = player.score;
    localStorage.setItem('tds_highscore', highScore);
  }
  document.getElementById('finalWave') .textContent = wave;
  document.getElementById('finalScore').textContent = player.score;
  document.getElementById('finalKills').textContent = player.kills;
  document.getElementById('highScore') .textContent = highScore;
  showScreen('gameover');
}

// ── BUTTONS ───────────────────────────────────
document.getElementById('startBtn').addEventListener('click', () => {
  initGame();
  showScreen('game');
  running  = true;
  lastTime = performance.now();
  requestAnimationFrame(loop);
});

document.getElementById('restartBtn').addEventListener('click', () => {
  initGame();
  showScreen('game');
  running  = true;
  lastTime = performance.now();
  requestAnimationFrame(loop);
});

// ── Init ──────────────────────────────────────
showScreen('start');
document.getElementById('highScore').textContent = highScore;
