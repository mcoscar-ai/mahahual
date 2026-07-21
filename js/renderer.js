// ═══════════════════════════════════════════════════════════════
// RENDERER.JS — Guardiões de Mahahual
// Câmera que segue o personagem (igual ao Gabriel: só começa a mover
// depois que passa do centro da tela) + parallax de background infinito.
// ═══════════════════════════════════════════════════════════════

var WORLD_WIDTH = 96000;
var GROUND_Y = 600;

// SPRITE_TARGET_HEIGHT declarado aqui (renderer carrega antes do player.js)
// player.js só usa os valores, não redeclara
var SPRITE_TARGET_HEIGHT = {
  character: 130,
  fruit: 28,
  truck: 100
};

// ── Canvas principal ─────────────────────────────────────────
var CANVAS = document.getElementById('gameCanvas');
var CTX = CANVAS.getContext('2d');

// ── Câmera ───────────────────────────────────────────────────
var CAM = { x: 0 }; // posição horizontal da câmera no mundo

function updateCamera() {
  var screenW = CANVAS.width;
  // Kiara fica a 35% da tela (não 50%) — dá mais espaço à frente pra ver inimigos chegando
  var targetX = P.x - screenW * 0.35;
  targetX = Math.max(0, targetX);
  targetX = Math.min(WORLD_WIDTH - screenW, targetX);
  CAM.x += (targetX - CAM.x) * 0.12;
}

// ── Parallax de background ────────────────────────────────────
// Cada zona tem um background. O parallax move em proporção diferente
// da câmera (fundo se move mais devagar que o personagem), criando
// profundidade. Usa o mesmo truque do Gabriel: while loop desenhando
// cópias até cobrir toda a largura da tela.

var ZONE_BACKGROUNDS = {
  1: 'bg_zona1',
  2: 'bg_zona2',
  3: 'bg_zona3'
};

var PARALLAX_FACTOR = 0.15; // mais lento = menos repetições visíveis por tela

function drawBackground(zone) {
  var imgKey = ZONE_BACKGROUNDS[zone] || 'bg_zona1';
  var img = IMAGES[imgKey];
  if (!img || !img.complete) {
    CTX.fillStyle = '#5a9e4a';
    CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
    return;
  }

  var cw = CANVAS.width;
  var ch = CANVAS.height;

  var scaleX = cw / img.width;
  var scaleY = ch / img.height;
  var scale  = Math.max(scaleX, scaleY);

  var drawW = img.width  * scale;
  var drawH = img.height * scale;

  var parallaxOffset = -(CAM.x * PARALLAX_FACTOR) % drawW;
  if (parallaxOffset > 0) parallaxOffset -= drawW;

  var offsetY = (ch - drawH) / 2;

  var x = parallaxOffset;
  while (x < cw) {
    CTX.drawImage(img, x, offsetY, drawW, drawH);
    x += drawW;
  }
}

function updateGroundY() {
  GROUND_Y = Math.round(CANVAS.height * 0.88);
  if (typeof P !== 'undefined') P.y = Math.min(P.y, GROUND_Y);
}

// Recalcula tamanhos dos sprites baseado na altura atual do canvas
// ~15% da altura = personagem (proporcional em qualquer tela)
function updateSpriteTargetHeights() {
  var h = CANVAS.height;
  var isSmall = h < 500;
  SPRITE_TARGET_HEIGHT.character = Math.round(h * (isSmall ? 0.22 : 0.15));
  SPRITE_TARGET_HEIGHT.fruit     = Math.round(h * (isSmall ? 0.05 : 0.03));
  SPRITE_TARGET_HEIGHT.truck     = Math.round(h * (isSmall ? 0.18 : 0.12));
  if (typeof ENEMY_TYPES !== 'undefined') {
    ENEMY_TYPES.bulldozer.targetHeight = Math.round(h * (isSmall ? 0.20 : 0.14));
    ENEMY_TYPES.caminhao.targetHeight  = Math.round(h * (isSmall ? 0.18 : 0.12));
    ENEMY_TYPES.drone.targetHeight     = Math.round(h * (isSmall ? 0.12 : 0.09));
    ENEMY_TYPES.robot.targetHeight     = Math.round(h * (isSmall ? 0.20 : 0.14));
  }
  if (typeof ENEMIES !== 'undefined') {
    ENEMIES.forEach(function(e) {
      var cfg = ENEMY_TYPES[e.type];
      if (!cfg) return;
      e.baseY = cfg.flies ? GROUND_Y - Math.round(CANVAS.height * 0.35) : GROUND_Y;
      if (!cfg.flies) e.y = GROUND_Y;
    });
  }
  if (typeof updatePhysics === 'function') updatePhysics();
}

// ── Resize responsivo (PC e mobile) ──────────────────────────
function resizeCanvas() {
  var scaleX = window.innerWidth  / 1920;
  var scaleY = window.innerHeight / 1080;
  var scale  = Math.min(scaleX, scaleY); // preserva proporção 16:9

  CANVAS.width  = Math.round(1920 * scale);
  CANVAS.height = Math.round(1080 * scale);
  CANVAS.style.position = 'fixed';
  CANVAS.style.left   = Math.round((window.innerWidth  - CANVAS.width)  / 2) + 'px';
  CANVAS.style.top    = Math.round((window.innerHeight - CANVAS.height) / 2) + 'px';
  CANVAS.style.width  = CANVAS.width  + 'px';
  CANVAS.style.height = CANVAS.height + 'px';

  updateGroundY();
  updateSpriteTargetHeights();
  if (typeof layoutBtns === 'function') layoutBtns();
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', function () {
  setTimeout(resizeCanvas, 200);
});
resizeCanvas(); // chama uma vez ao carregar

// ── Renderização principal (chamada a cada frame pelo game.js) ──
function render(zone) {
  CTX.clearRect(0, 0, CANVAS.width, CANVAS.height);
  drawBackground(zone || 1);
  if (typeof drawEnemies  === 'function') drawEnemies(CTX, CAM.x);
  if (typeof drawFruits   === 'function') drawFruits(CTX, CAM.x);
  if (typeof drawPlayer   === 'function') drawPlayer(CTX, CAM.x);
  if (typeof drawHUD      === 'function') drawHUD(CTX);
  if (typeof drawItems    === 'function') drawItems(CTX, CAM.x);
}
