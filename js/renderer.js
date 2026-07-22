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
// CAM.dx = quanto a câmera andou NESTE frame. Os inimigos somam esse
// valor ao próprio movimento (enemies.js), o que os faz andar em
// "espaço de tela": a velocidade que aparece pro jogador é sempre
// cfg.speed, independente da Kiara estar parada, andando ou voltando.
// Técnica emprestada dos shoot-'em-ups (inimigos em screen space).
//
// SEM LERP de propósito: com lerp a Kiara "escapa" pra frente na tela
// enquanto a câmera corre atrás, e a taxa de aproximação dela com o
// inimigo volta a variar. Travando a câmera nela, a posição dela na
// tela fica fixa e a aproximação fica sempre igual.
//
// IMPORTANTE: updateCamera() precisa rodar DEPOIS de updatePlayer()
// no loop principal, senão CAM.dx fica defasado 1 frame.
var CAM = { x: 0, dx: 0 };

var CAM_PLAYER_SCREEN_POS = 0.28; // Kiara a 28% da tela — bastante espaço à frente pra ver o que vem

function updateCamera() {
  var screenW = CANVAS.width;
  var prevX = CAM.x;
  var targetX = P.x - screenW * CAM_PLAYER_SCREEN_POS;
  targetX = Math.max(0, targetX);
  targetX = Math.min(WORLD_WIDTH - screenW, targetX);
  CAM.x = targetX;           // trava exata, sem lerp
  CAM.dx = CAM.x - prevX;
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

// O FUNDO é a camada distante (montanhas/selva ao longe): rola devagar,
// só pra dar profundidade. Quem transmite velocidade e serve de
// referência pro olho é a camada de CHÃO, que rola a 1.0 (ver drawGround).
var PARALLAX_FACTOR = 0.4;

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


// ── Camada de CHÃO (parallax 1.0) ────────────────────────────
// Esta é a peça que faltava. No Mario, o chão/canos/blocos rolam a
// exatamente a velocidade da câmera, e é contra ESSE chão que o olho
// mede a velocidade dos inimigos. Sem essa camada, os inimigos parecem
// acelerar e desacelerar conforme a Kiara corre, porque a única
// referência era o fundo distante (que rola mais devagar).
// Desenhado por código: não existe asset de solo no projeto.

var GROUND_PALETTE = {
  1: { top: '#efdcae', bottom: '#c9a76a', edge: '#8a6b3a', grass: '#7fa650', stone: '#b9b2a4' },
  2: { top: '#d8c79a', bottom: '#a68a58', edge: '#6f5a33', grass: '#5f8a3c', stone: '#a9a294' },
  3: { top: '#c4b18c', bottom: '#8e7852', edge: '#5c4a2c', grass: '#4f7a34', stone: '#9a9386' }
};

function drawGroundProp(sx, y, kind, pal, unit) {
  if (kind === 0) {
    // tufo de grama
    CTX.fillStyle = pal.grass;
    for (var i = -1; i <= 1; i++) {
      CTX.beginPath();
      CTX.moveTo(sx + i * unit * 0.5, y);
      CTX.lineTo(sx + i * unit * 0.5 + unit * 0.22, y - unit * (1.1 - Math.abs(i) * 0.35));
      CTX.lineTo(sx + i * unit * 0.5 + unit * 0.42, y);
      CTX.closePath();
      CTX.fill();
    }
  } else if (kind === 1) {
    // pedrinha
    CTX.fillStyle = pal.stone;
    CTX.beginPath();
    CTX.ellipse(sx, y - unit * 0.18, unit * 0.55, unit * 0.32, 0, 0, Math.PI * 2);
    CTX.fill();
  } else {
    // marca no solo (sulco), reforça a sensação de rolagem
    CTX.fillStyle = pal.edge;
    CTX.globalAlpha = 0.25;
    CTX.fillRect(sx, y + unit * 0.55, unit * 1.6, Math.max(2, unit * 0.14));
    CTX.globalAlpha = 1;
  }
}

function drawGround(zone) {
  var pal = GROUND_PALETTE[zone] || GROUND_PALETTE[1];
  var y = GROUND_Y;
  var h = CANVAS.height - y;
  if (h <= 0) return;

  var grad = CTX.createLinearGradient(0, y, 0, CANVAS.height);
  grad.addColorStop(0, pal.top);
  grad.addColorStop(1, pal.bottom);
  CTX.fillStyle = grad;
  CTX.fillRect(0, y, CANVAS.width, h);

  CTX.fillStyle = pal.edge;
  CTX.fillRect(0, y, CANVAS.width, Math.max(2, Math.round(CANVAS.height * 0.007)));

  // Elementos repetidos em posições FIXAS do mundo, desenhados sem
  // nenhum fator de redução => rolam 1:1 com a câmera.
  var unit    = Math.round(CANVAS.height * 0.035);
  var spacing = Math.round(CANVAS.width * 0.11);
  if (spacing < 1) return;
  var firstIdx = Math.floor(CAM.x / spacing) - 1;
  var lastIdx  = firstIdx + Math.ceil(CANVAS.width / spacing) + 2;

  for (var i = firstIdx; i <= lastIdx; i++) {
    var noise = (i * 7919) % 97;              // pseudo-aleatório determinístico
    var worldX = i * spacing + (noise - 48);  // varia a posição sem "piscar"
    var screenX = worldX - CAM.x;             // <<< parallax 1.0, sem multiplicador
    drawGroundProp(screenX, y, noise % 3, pal, unit);
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
  // 15% da altura do canvas = tamanho Mario Bros proporcional
  // No celular os personagens ficam 15% maiores (mais fáceis de ver/tocar)
  var charMultiplier = (typeof IS_MOBILE !== 'undefined' && IS_MOBILE) ? 1.15 : 1;
  SPRITE_TARGET_HEIGHT.character = Math.round(h * 0.17 * charMultiplier);
  SPRITE_TARGET_HEIGHT.fruit     = Math.round(h * 0.04);
  SPRITE_TARGET_HEIGHT.truck     = Math.round(h * 0.14);
  if (typeof ENEMY_TYPES !== 'undefined') {
    ENEMY_TYPES.bulldozer.targetHeight = Math.round(h * 0.15);
    ENEMY_TYPES.caminhao.targetHeight  = Math.round(h * 0.14);
    ENEMY_TYPES.drone.targetHeight     = Math.round(h * 0.055); // bem menor: fica leve no ar
    ENEMY_TYPES.robot.targetHeight     = Math.round(h * 0.15);

    // Velocidade recalculada em % da LARGURA do canvas — mantém o movimento
    // proporcional em qualquer tela (celular sem fullscreen, tablet, etc.)
    Object.keys(ENEMY_TYPES).forEach(function (type) {
      var cfg = ENEMY_TYPES[type];
      if (typeof cfg.speedPct === 'number') {
        cfg.speed = cfg.speedPct * CANVAS.width;
      }
    });
  }
  // Reposiciona inimigos existentes no novo GROUND_Y
  if (typeof ENEMIES !== 'undefined') {
    ENEMIES.forEach(function(e) {
      var cfg = ENEMY_TYPES[e.type];
      if (!cfg) return;
      e.baseY = cfg.flies && typeof droneHoverOffset === 'function' ? GROUND_Y - droneHoverOffset() : GROUND_Y;
      if (!cfg.flies) e.y = GROUND_Y;
    });
  }
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
  drawGround(zone || 1);
  if (typeof drawEnemies  === 'function') drawEnemies(CTX, CAM.x);
  if (typeof drawBarris   === 'function') drawBarris(CTX, CAM.x);
  if (typeof drawFruits   === 'function') drawFruits(CTX, CAM.x);
  if (typeof drawPlayer   === 'function') drawPlayer(CTX, CAM.x);
  if (typeof drawHUD      === 'function') drawHUD(CTX);
  if (typeof drawItems    === 'function') drawItems(CTX, CAM.x);
}
