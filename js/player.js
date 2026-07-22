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
var MOVE_SPEED_BASE   = 9;    // base p/ 1920 de largura (~6px num canvas típico de 75%)
var GRAVITY_BASE      = 0.6;  // pulo médio
var JUMP_FORCE_1_BASE = -19;  // 1º pulo — ~28% da altura da tela
var JUMP_FORCE_2_BASE = -14;  // 2º pulo (70% do primeiro)
var FRUIT_SPEED_BASE  = 15;

// Valores efetivos (atualizados por updatePhysicsScale())
var MOVE_SPEED   = MOVE_SPEED_BASE;
var GRAVITY      = GRAVITY_BASE;
var JUMP_FORCE_1 = JUMP_FORCE_1_BASE;
var JUMP_FORCE_2 = JUMP_FORCE_2_BASE;
var FRUIT_SPEED  = FRUIT_SPEED_BASE;

var MAX_JUMPS    = 2;
var DIZZY_DURATION  = 120; // 2s a 60fps
var THROW_COOLDOWN  = 20;
var FRAME_DELAY     = 6;

function updatePhysicsScale() {
  var sx = CANVAS.width  / 1920;  // horizontal escala pela largura
  var sy = CANVAS.height / 1080;  // vertical escala pela altura
  MOVE_SPEED   = MOVE_SPEED_BASE   * sx;
  FRUIT_SPEED  = FRUIT_SPEED_BASE  * sx;
  GRAVITY      = GRAVITY_BASE      * sy;
  JUMP_FORCE_1 = JUMP_FORCE_1_BASE * sy;
  JUMP_FORCE_2 = JUMP_FORCE_2_BASE * sy;
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
  throwHoldFrames: 0
};

var FRUITS = [];

function frameCount(state) {
  return CHAR_FRAME_COUNTS[SELECTED_CHAR][state];
}

// ── Update principal ──────────────────────────────────────────
function updatePlayer() {
  updatePhysicsScale(); // mantém pulo/velocidade proporcionais ao canvas atual

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
      if (typeof playSFX === 'function') playSFX('sfx_jump');
    }
    P.jumpKeyLatched = true;
  }
  if (!KEYS.jump) P.jumpKeyLatched = false;

  // Gravidade
  P.vy += GRAVITY;
  P.y  += P.vy;
  if (P.y >= GROUND_Y) {
    P.y = GROUND_Y;
    P.vy = 0;
    P.onGround = true;
    P.jumpCount = 0;
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
  if (P.invulnerable || P.dizzyTimer > 0) return;
  P.dizzyTimer = DIZZY_DURATION;
  P.invulnerable = true;
  P.frame = 0;
  if (typeof playSFX === 'function') playSFX('sfx_dizzy');
}

function drawPlayer(ctx, cameraX) {
  var n = P.frame + 1;
  var nStr = n < 10 ? '0' + n : '' + n;
  var img = IMAGES[SELECTED_CHAR + '_' + P.state + '_' + nStr];
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
