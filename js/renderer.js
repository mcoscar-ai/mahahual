// ═══════════════════════════════════════════════════════════════
// RENDERER.JS — Guardiões de Mahahual
// Câmera que segue o personagem (igual ao Gabriel: só começa a mover
// depois que passa do centro da tela) + parallax de background infinito.
// ═══════════════════════════════════════════════════════════════

var WORLD_WIDTH = 96000; // 3 zonas × 32000px cada (igual ao Gabriel)
var GROUND_Y = 600;     // valor inicial seguro — atualizado pelo resizeCanvas()

// ── Canvas principal ─────────────────────────────────────────
var CANVAS = document.getElementById('gameCanvas');
var CTX = CANVAS.getContext('2d');

// ── Câmera ───────────────────────────────────────────────────
var CAM = { x: 0 }; // posição horizontal da câmera no mundo

function updateCamera() {
  var screenW = CANVAS.width;
  var centerThreshold = screenW / 2; // começa a seguir só depois do centro

  // câmera segue o personagem quando ele passa do centro da tela
  var targetX = P.x - centerThreshold;
  targetX = Math.max(0, targetX);                    // não passa do início
  targetX = Math.min(WORLD_WIDTH - screenW, targetX); // não passa do fim do mundo

  // movimento suave (lerp) — mesma sensação do Gabriel
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

var PARALLAX_FACTOR = 0.3; // o fundo se move a 30% da velocidade da câmera

function drawBackground(zone) {
  var imgKey = ZONE_BACKGROUNDS[zone] || 'bg_zona1';
  var img = IMAGES[imgKey];
  if (!img || !img.complete) {
    // fallback: fundo verde sólido enquanto imagem não carregou
    CTX.fillStyle = '#5a9e4a';
    CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
    return;
  }

  var bgX = -(CAM.x * PARALLAX_FACTOR) % img.width;
  if (bgX > 0) bgX -= img.width; // garante que começa à esquerda da tela

  // while loop: desenha cópias até cobrir toda a largura da tela
  var x = bgX;
  while (x < CANVAS.width) {
    CTX.drawImage(img, x, 0, img.width, CANVAS.height);
    x += img.width;
  }
}

// ── Linha do chão relativa ao canvas ─────────────────────────
// GROUND_Y fica definido aqui e sincronizado com o resize do canvas.
// O player.js usa essa variável pra ancoragem dos pés.
function updateGroundY() {
  GROUND_Y = CANVAS.height - Math.round(CANVAS.height * 0.18);
  P.y = Math.min(P.y, GROUND_Y);
}

// ── Resize responsivo (PC e mobile) ──────────────────────────
function resizeCanvas() {
  var scaleX = window.innerWidth  / 1376;
  var scaleY = window.innerHeight / 768;
  var scale  = Math.min(scaleX, scaleY);

  CANVAS.width  = Math.round(1376 * scale);
  CANVAS.height = Math.round(768  * scale);
  CANVAS.style.position = 'fixed';
  CANVAS.style.left   = Math.round((window.innerWidth  - CANVAS.width)  / 2) + 'px';
  CANVAS.style.top    = Math.round((window.innerHeight - CANVAS.height) / 2) + 'px';
  CANVAS.style.width  = CANVAS.width  + 'px';
  CANVAS.style.height = CANVAS.height + 'px';

  updateGroundY();
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
