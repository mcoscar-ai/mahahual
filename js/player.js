// ═══════════════════════════════════════════════════════════════
// PLAYER.JS — Guardiões de Mahahual
// Movimento, pulo duplo, animação e arremesso de fruta.
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// ESCALA DE SPRITES — altura-alvo fixa (não usa o tamanho bruto do PNG)
// Compartilhado com enemies.js — cada categoria tem uma altura-padrão
// na tela, independente de quantos pixels o arquivo original tem.
// ═══════════════════════════════════════════════════════════════

var SPRITE_TARGET_HEIGHT = {
  character: 130,   // Kiara/Ainhoa/Thiago — menor, mais proporcional ao cenário
  fruit: 28,
  truck: 100
};

// Desenha um sprite ancorado pelos PÉS (base) e centralizado horizontalmente,
// escalado pra caber exatamente em targetHeight na tela — não importa o
// tamanho bruto do arquivo PNG original.
function drawSprite(ctx, img, worldX, worldY, targetHeight, dir, cameraX) {
  if (!img || !img.complete) return null;
  var scale = targetHeight / img.height;
  var drawW = img.width * scale;
  var drawH = targetHeight;
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

  return { width: drawW, height: drawH }; // útil pra hitbox de colisão depois
}

// ── Personagem selecionado ────────────────────────────────────
// TEMPORÁRIO: fixo em 'kiara' até a Tela de Seleção existir de verdade.
var SELECTED_CHAR = 'kiara';

// ── Constantes de física ──────────────────────────────────────
var MOVE_SPEED   = 5;      // px/frame — mais rápido, sensação mais dinâmica
var GRAVITY      = 0.5;
var JUMP_FORCE   = -12;    // recalibrado pro novo tamanho de sprite
var MAX_JUMPS    = 2;      // pulo duplo
var GROUND_Y     = 500;    // linha do chão (ajustável quando o renderer.js definir o canvas real)

var DIZZY_DURATION   = 120;  // 2s a 60fps
var THROW_COOLDOWN   = 24;   // 0.4s a 60fps
var FRUIT_SPEED       = 7;   // px/frame, linha reta horizontal

// ── Estado do jogador ─────────────────────────────────────────
var P = {
  x: 100,
  y: GROUND_Y,
  vx: 0,
  vy: 0,
  dir: 1,              // 1 = direita, -1 = esquerda
  onGround: true,
  jumpCount: 0,

  state: 'idle',        // idle | run | jump | throw | dizzy
  frame: 0,
  frameTimer: 0,

  dizzyTimer: 0,         // >0 enquanto tonto
  invulnerable: false,

  throwTimer: 0,         // cooldown de arremesso
  throwHoldFrames: 0      // quantos frames ainda mostrando animação de throw
};

var FRUITS = []; // frutas arremessadas, ativas na tela

// ── Contagem de frames por estado (por personagem) ────────────
// Vem de CHAR_FRAME_COUNTS, definido no assets.js
function frameCount(state) {
  return CHAR_FRAME_COUNTS[SELECTED_CHAR][state];
}

// ── Atualiza física + input a cada frame ──────────────────────
function updatePlayer() {
  // Enquanto tonto: sem controle nenhum, só espera acabar
  if (P.dizzyTimer > 0) {
    P.dizzyTimer--;
    P.state = 'dizzy';
    if (P.dizzyTimer === 0) {
      P.invulnerable = false;
      P.state = 'idle';
    }
    updateAnimation();
    return;
  }

  // ── Movimento horizontal ──
  P.vx = 0;
  if (KEYS.left)  { P.vx = -MOVE_SPEED; P.dir = -1; }
  if (KEYS.right) { P.vx = MOVE_SPEED;  P.dir = 1; }
  P.x += P.vx;

  // ── Pulo (duplo) ──
  if (KEYS.jump && !P.jumpKeyLatched) {
    if (P.jumpCount < MAX_JUMPS) {
      P.vy = JUMP_FORCE;
      P.jumpCount++;
      P.onGround = false;
      if (typeof playSFX === 'function') playSFX('sfx_jump');
    }
    P.jumpKeyLatched = true;
  }
  if (!KEYS.jump) P.jumpKeyLatched = false;

  // ── Gravidade ──
  P.vy += GRAVITY;
  P.y += P.vy;
  if (P.y >= GROUND_Y) {
    P.y = GROUND_Y;
    P.vy = 0;
    P.onGround = true;
    P.jumpCount = 0;
  }

  // ── Arremesso de fruta ──
  if (P.throwTimer > 0) P.throwTimer--;
  if (KEYS.throw && P.throwTimer === 0) {
    throwFruit();
    P.throwTimer = THROW_COOLDOWN;
    P.throwHoldFrames = 10; // mostra o frame de arremesso por um instante
  }
  if (P.throwHoldFrames > 0) P.throwHoldFrames--;

  // ── Decide o estado visual (prioridade: throw > jump > run > idle) ──
  if (P.throwHoldFrames > 0) {
    P.state = 'throw';
  } else if (!P.onGround) {
    P.state = 'jump';
  } else if (P.vx !== 0) {
    P.state = 'run';
  } else {
    P.state = 'idle';
  }

  updateAnimation();
  updateFruits();
}

// ── Avança a animação (troca de frame no tempo certo) ──────────
var FRAME_DELAY = 6; // frames de jogo por frame de sprite (quanto maior, mais devagar a animação)

function updateAnimation() {
  P.frameTimer++;
  if (P.frameTimer >= FRAME_DELAY) {
    P.frameTimer = 0;
    P.frame = (P.frame + 1) % frameCount(P.state);
  }
}

// ── Arremessa a fruta do personagem atual, em linha reta ────────
function throwFruit() {
  var fruitType = CHARACTER_FRUIT[SELECTED_CHAR]; // 'mango' | 'pitaya' | 'coco'
  FRUITS.push({
    x: P.x,
    y: P.y - 60,           // altura aproximada da mão
    dir: P.dir,
    type: fruitType,
    frame: 0,
    frameTimer: 0
  });
  if (typeof playSFX === 'function') playSFX('sfx_throw');
}

// ── Move as frutas ativas na tela (colisão com inimigos fica no enemies.js) ──
function updateFruits() {
  for (var i = FRUITS.length - 1; i >= 0; i--) {
    var f = FRUITS[i];
    f.x += FRUIT_SPEED * f.dir;
    f.frameTimer++;
    if (f.frameTimer >= FRAME_DELAY) {
      f.frameTimer = 0;
      f.frame = (f.frame + 1) % 4; // frutas têm sempre 4 frames
    }
    // remove fruta se sair muito longe da tela (ajustável quando o renderer.js
    // definir a câmera de verdade)
    if (f.x < P.x - 2000 || f.x > P.x + 2000) {
      FRUITS.splice(i, 1);
    }
  }
}

// ── Chamado pelo enemies.js quando o jogador é atingido ─────────
function playerGetHit() {
  if (P.invulnerable || P.dizzyTimer > 0) return; // já tonto, ignora novo hit
  P.dizzyTimer = DIZZY_DURATION;
  P.invulnerable = true;
  P.frame = 0;
  if (typeof playSFX === 'function') playSFX('sfx_dizzy');
}

// ── Desenha o personagem (ancorado pelos pés, centralizado, escalado) ──
function drawPlayer(ctx, cameraX) {
  var n = P.frame + 1;
  var nStr = n < 10 ? '0' + n : '' + n;
  var img = IMAGES[SELECTED_CHAR + '_' + P.state + '_' + nStr];
  drawSprite(ctx, img, P.x, P.y, SPRITE_TARGET_HEIGHT.character, P.dir, cameraX);
}

// ── Desenha as frutas ativas ──────────────────────────────────
function drawFruits(ctx, cameraX) {
  FRUITS.forEach(function (f) {
    var n = f.frame + 1;
    var nStr = n < 10 ? '0' + n : '' + n;
    var img = IMAGES[f.type + '_' + nStr];
    drawSprite(ctx, img, f.x, f.y, SPRITE_TARGET_HEIGHT.fruit, f.dir, cameraX);
  });
}
