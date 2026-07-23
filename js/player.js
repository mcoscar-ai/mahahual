// ═══════════════════════════════════════════════════════════════
// PLAYER.JS — Guardiões de Mahahual
// Valores calibrados pra público infantil:
// caminhada moderada, pulo médio, gravidade equilibrada.
// ═══════════════════════════════════════════════════════════════

// SPRITE_TARGET_HEIGHT declarado no renderer.js (carrega antes)

// ── Helper: desenha sprite ancorado pelos pés, escalado ────────
function drawSprite(ctx, img, worldX, worldY, targetHeight, dir, cameraX) {
  if (!img || !img.complete) return null;
  var scale   = targetHeight / img.height;
  var drawW   = img.width * scale;
  var drawH   = targetHeight;
  var screenX = worldX - cameraX - drawW / 2;
  var screenY = worldY - drawH;
  ctx.save();
  if (dir === -1) {
    ctx.translate(screenX + drawW, screenY);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, drawW, drawH);
  } else {
    ctx.drawImage(img, screenX, screenY, drawW, drawH);
  }
  ctx.restore();
  return { width: drawW, height: drawH };
}

// ── Personagem selecionado ────────────────────────────────────
var SELECTED_CHAR = 'kiara';

// ── Física calibrada (valores BASE, para canvas 1920x1080) ────
// Os valores efetivos são recalculados a cada frame proporcionalmente
// ao tamanho atual do canvas — mesmo motivo das velocidades dos
// inimigos: sem isso o pulo fica curto no PC e gigante no celular.
var MOVE_SPEED_BASE   = 14;   // base p/ 1920 de largura (~10px num canvas típico de 75%)
var GRAVITY_BASE      = 0.6;  // pulo médio
var JUMP_FORCE_1_BASE = -19;  // 1º pulo — ~28% da altura da tela
var JUMP_FORCE_2_BASE = -14;  // 2º pulo (70% do primeiro)
var FRUIT_SPEED_BASE  = 22;   // fruta precisa ser bem mais rápida que a Kiara

// Valores efetivos (atualizados por updatePhysicsScale())
var MOVE_SPEED   = MOVE_SPEED_BASE;
var GRAVITY      = GRAVITY_BASE;
var JUMP_FORCE_1 = JUMP_FORCE_1_BASE;
var JUMP_FORCE_2 = JUMP_FORCE_2_BASE;
var FRUIT_SPEED  = FRUIT_SPEED_BASE;

var MAX_JUMPS    = 2;
var DIZZY_DURATION  = 60;  // 1s a 60fps
// Cadência do arremesso. Com 20 frames eram 3 frutas por segundo —
// segurando o botão o jogo virava metralhadora e derrubava bulldozer
// em 1,7s, tornando tudo trivial. Com 38 fica em ~1,6 por segundo:
// ainda contínuo (como você preferiu), mas cada fruta conta.
var THROW_COOLDOWN  = 38;
var FRAME_DELAY     = 6;

function updatePhysicsScale() {
  var sx = CANVAS.width  / 1920;  // horizontal escala pela largura
  var sy = CANVAS.height / 1080;  // vertical escala pela altura
  // Multiplicadores do personagem escolhido (screens.js). 1 por padrão.
  var cs = (typeof CHAR_SPEED_MULT !== 'undefined') ? CHAR_SPEED_MULT : 1;
  var cj = (typeof CHAR_JUMP_MULT !== 'undefined') ? CHAR_JUMP_MULT : 1;
  MOVE_SPEED   = MOVE_SPEED_BASE   * sx * cs;
  FRUIT_SPEED  = FRUIT_SPEED_BASE  * sx;
  GRAVITY      = GRAVITY_BASE      * sy;
  JUMP_FORCE_1 = JUMP_FORCE_1_BASE * sy * cj;
  JUMP_FORCE_2 = JUMP_FORCE_2_BASE * sy * cj;
}

// GROUND_Y definido pelo renderer.js

// ── Estado do jogador ─────────────────────────────────────────
var P = {
  x: 200, y: 600,
  vx: 0, vy: 0,
  dir: 1,
  onGround: true,
  jumpCount: 0,
  jumpKeyLatched: false,
  state: 'idle',
  frame: 0, frameTimer: 0,
  dizzyTimer: 0,
  invulnerable: false,
  throwTimer: 0,
  throwHoldFrames: 0,
  starTimer: 0,      // invencibilidade da estrelinha (frames)
  spin: 0,
  spinAngle: 0
};

var FRUITS = [];

function frameCount(state) {
  return CHAR_FRAME_COUNTS[SELECTED_CHAR][state];
}

// ── Update principal ──────────────────────────────────────────
function updatePlayer() {
  updatePhysicsScale(); // mantém pulo/velocidade proporcionais ao canvas atual

  if (P.starTimer > 0) P.starTimer--;

  // Tonto: sem controle, gravidade continua aplicada
  if (P.dizzyTimer > 0) {
    P.dizzyTimer--;
    P.state = 'dizzy';
    P.vy += GRAVITY;
    P.y  += P.vy;
    if (P.y >= GROUND_Y) { P.y = GROUND_Y; P.vy = 0; P.onGround = true; }
    if (P.dizzyTimer === 0) { P.invulnerable = false; P.state = 'idle'; }
    updateAnimation();
    return;
  }

  // Horizontal
  P.vx = 0;
  if (KEYS.left)  { P.vx = -MOVE_SPEED; P.dir = -1; }
  if (KEYS.right) { P.vx =  MOVE_SPEED; P.dir =  1; }
  P.x += P.vx;
  if (P.x < 0) P.x = 0;

  // Pulo duplo
  if (KEYS.jump && !P.jumpKeyLatched) {
    if (P.jumpCount === 0) {
      P.vy = JUMP_FORCE_1;
      P.jumpCount = 1;
      P.onGround = false;
      if (typeof playSFX === 'function') playSFX('sfx_jump');
    } else if (P.jumpCount === 1) {
      P.vy = JUMP_FORCE_2;
      P.jumpCount = 2;
      P.spin = (SELECTED_CHAR === 'thiago') ? 1 : 0; // Thiago gira no pulo duplo
      if (typeof playSFX === 'function') playSFX('sfx_jump');
    }
    P.jumpKeyLatched = true;
  }
  if (!KEYS.jump) P.jumpKeyLatched = false;

  // Gravidade
  P.vy += GRAVITY;
  P.y  += P.vy;

  // Giro do Thiago no pulo duplo: uma volta completa durante o voo.
  // Só afeta o DESENHO (drawPlayer) — a colisão continua reta.
  if (P.spin) {
    P.spinAngle = (P.spinAngle || 0) + 0.32; // ~1 volta em ~20 frames
    if (P.spinAngle >= Math.PI * 2) { P.spinAngle = 0; P.spin = 0; }
  }

  if (P.y >= GROUND_Y) {
    P.y = GROUND_Y;
    P.vy = 0;
    P.onGround = true;
    P.jumpCount = 0;
    P.spin = 0;
    P.spinAngle = 0;
  }

  // Arremesso
  if (P.throwTimer > 0) P.throwTimer--;
  if (KEYS.throw && P.throwTimer === 0) {
    throwFruit();
    P.throwTimer = THROW_COOLDOWN;
    P.throwHoldFrames = 8;
  }
  if (P.throwHoldFrames > 0) P.throwHoldFrames--;

  // Estado visual
  if (P.throwHoldFrames > 0) P.state = 'throw';
  else if (!P.onGround)       P.state = 'jump';
  else if (P.vx !== 0)        P.state = 'run';
  else                         P.state = 'idle';

  updateAnimation();
  updateFruits();
}

function updateAnimation() {
  P.frameTimer++;
  if (P.frameTimer >= FRAME_DELAY) {
    P.frameTimer = 0;
    P.frame = (P.frame + 1) % frameCount(P.state);
  }
}

function throwFruit() {
  var fruitType = CHARACTER_FRUIT[SELECTED_CHAR];
  var charH = SPRITE_TARGET_HEIGHT.character;
  FRUITS.push({
    x: P.x + (P.dir * charH * 0.3),
    y: P.y - charH * 0.55,
    dir: P.dir,
    type: fruitType,
    frame: 0, frameTimer: 0
  });
  if (typeof playSFX === 'function') playSFX('sfx_throw');
}

function updateFruits() {
  for (var i = FRUITS.length - 1; i >= 0; i--) {
    var f = FRUITS[i];
    f.x += FRUIT_SPEED * f.dir;
    f.frameTimer++;
    if (f.frameTimer >= FRAME_DELAY) {
      f.frameTimer = 0;
      f.frame = (f.frame + 1) % 4;
    }
    if (Math.abs(f.x - P.x) > 1920) FRUITS.splice(i, 1);
  }
}

function playerGetHit() {
  if (P.starTimer > 0) return; // estrelinha: imune a tudo
  if (P.invulnerable || P.dizzyTimer > 0) return;
  var multTontura = (typeof dificuldadeAtual === 'function')
    ? dificuldadeAtual().tontura : 1;
  P.dizzyTimer = Math.round(DIZZY_DURATION * multTontura);
  P.invulnerable = true;
  P.frame = 0;
  if (typeof playSFX === 'function') playSFX('sfx_dizzy');
}

// Aura da estrelinha: halo pulsante em arco-íris + faíscas ao redor.
// Desenhado por código (não há sprite de estrela no projeto).
function drawStarAura(ctx, cameraX) {
  if (P.starTimer <= 0) return;
  var h = SPRITE_TARGET_HEIGHT.character;
  var cx = P.x - cameraX;
  var cy = P.y - h / 2;
  var t = Date.now() / 90;

  // pisca mais rápido nos últimos 2 segundos, avisando que vai acabar
  if (P.starTimer < 120 && Math.floor(P.starTimer / 6) % 2 === 0) return;

  var matiz = (t * 8) % 360;
  ctx.save();
  ctx.globalAlpha = 0.42 + Math.sin(t) * 0.12;
  ctx.fillStyle = 'hsl(' + matiz + ', 95%, 62%)';
  ctx.beginPath();
  ctx.arc(cx, cy, h * (0.62 + Math.sin(t * 1.3) * 0.05), 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.9;
  for (var i = 0; i < 6; i++) {
    var a = t * 0.9 + i * (Math.PI / 3);
    var r = h * 0.55;
    ctx.fillStyle = 'hsl(' + ((matiz + i * 55) % 360) + ', 100%, 72%)';
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, h * 0.055, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlayer(ctx, cameraX) {
  drawStarAura(ctx, cameraX);
  var n = P.frame + 1;
  var nStr = n < 10 ? '0' + n : '' + n;
  var img = IMAGES[SELECTED_CHAR + '_' + P.state + '_' + nStr];

  // Giro do Thiago: rotaciona o desenho em torno do próprio centro,
  // sem mexer na colisão. Se não estiver girando, desenho normal.
  if (P.spin && P.spinAngle && img && img.complete) {
    var h = SPRITE_TARGET_HEIGHT.character;
    var scale = h / img.height;
    var w = img.width * scale;
    var cx = P.x - cameraX;
    var cy = P.y - h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(P.dir * P.spinAngle); // gira no sentido da corrida
    if (P.dir === -1) ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
    return;
  }

  drawSprite(ctx, img, P.x, P.y, SPRITE_TARGET_HEIGHT.character, P.dir, cameraX);
}

function drawFruits(ctx, cameraX) {
  FRUITS.forEach(function(f) {
    var n = f.frame + 1;
    var nStr = n < 10 ? '0' + n : '' + n;
    var img = IMAGES[f.type + '_' + nStr];
    drawSprite(ctx, img, f.x, f.y, SPRITE_TARGET_HEIGHT.fruit, f.dir, cameraX);
  });
}

function updatePhysics() {} // stub — não usado mais
