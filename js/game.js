// ═══════════════════════════════════════════════════════════════
// GAME.JS — Guardiões de Mahahual
// Loop principal, máquina de estados, zonas e progressão.
//
// Carregado DEPOIS de enemies.js. Substitui o loop que antes vivia
// solto dentro do index.html.
//
// DECISÃO IMPORTANTE — zonas medidas em LARGURAS DE TELA:
// antes o mundo tinha 96.000px fixos. Como as velocidades escalam
// com o canvas, isso fazia uma zona valer ~17 telas no PC e ~50 no
// celular — a mesma zona ficava 3x mais longa no aparelho menor.
// Agora o comprimento é declarado em telas, então a travessia dura
// o mesmo tempo em qualquer aparelho.
// ═══════════════════════════════════════════════════════════════

var GAME = {
  state: 'loading',  // loading | playing | zone_complete | win
  zone: 1,
  score: 0,
  maxZone: 3
};

// ── Configuração das zonas ───────────────────────────────────
// "at" é a posição em LARGURAS DE TELA a partir do início da zona.
var ZONES = {
  1: {
    name: 'A Praia Esquecida',
    lengthScreens: 55,
    boss: 'boss_bulldozer',
    enemies: [
      { type: 'bulldozer', at: 1.6 },
      { type: 'caminhao', at: 3.2 },
      { type: 'drone', at: 5.0 },
      { type: 'robot', at: 6.8 },
      { type: 'bulldozer', at: 8.8 },
      { type: 'drone', at: 10.7 },
      { type: 'bulldozer', at: 12.7 },
      { type: 'robot', at: 14.4 },
      { type: 'caminhao', at: 16.2 },
      { type: 'drone', at: 17.9 },
      { type: 'bulldozer', at: 19.9 },
      { type: 'caminhao', at: 21.9 },
      { type: 'drone', at: 23.5 },
      { type: 'robot', at: 25.2 },
      { type: 'bulldozer', at: 26.8 },
      { type: 'drone', at: 28.5 },
      { type: 'bulldozer', at: 30.3 },
      { type: 'robot', at: 32.2 },
      { type: 'caminhao', at: 33.8 },
      { type: 'drone', at: 35.4 },
      { type: 'bulldozer', at: 37.1 },
      { type: 'caminhao', at: 38.9 },
      { type: 'drone', at: 40.7 },
      { type: 'robot', at: 42.7 },
      { type: 'bulldozer', at: 44.6 },
      { type: 'drone', at: 46.4 },
      { type: 'bulldozer', at: 48.3 },
      { type: 'robot', at: 50.2 },
      { type: 'caminhao', at: 51.8 }
    ]
  },
  2: {
    name: 'A Selva Ferida',
    lengthScreens: 55,
    boss: 'bossdrone',
    enemies: [
      { type: 'drone', at: 1.6 },
      { type: 'robot', at: 3.5 },
      { type: 'drone', at: 5.5 },
      { type: 'caminhao', at: 7.5 },
      { type: 'drone', at: 9.2 },
      { type: 'bulldozer', at: 11.0 },
      { type: 'drone', at: 12.6 },
      { type: 'robot', at: 14.4 },
      { type: 'drone', at: 16.0 },
      { type: 'bulldozer', at: 17.6 },
      { type: 'drone', at: 19.3 },
      { type: 'robot', at: 20.9 },
      { type: 'drone', at: 22.6 },
      { type: 'caminhao', at: 24.2 },
      { type: 'drone', at: 25.7 },
      { type: 'bulldozer', at: 27.4 },
      { type: 'drone', at: 29.0 },
      { type: 'robot', at: 30.7 },
      { type: 'drone', at: 32.3 },
      { type: 'bulldozer', at: 34.2 },
      { type: 'drone', at: 36.1 },
      { type: 'robot', at: 37.7 },
      { type: 'drone', at: 39.4 },
      { type: 'caminhao', at: 41.1 },
      { type: 'drone', at: 42.9 },
      { type: 'bulldozer', at: 44.5 },
      { type: 'drone', at: 46.4 },
      { type: 'robot', at: 48.5 },
      { type: 'drone', at: 50.3 },
      { type: 'bulldozer', at: 52.1 }
    ]
  },
  3: {
    name: 'O Coração de Mahahual',
    lengthScreens: 55,
    boss: 'bossrobot',
    enemies: [
      { type: 'robot', at: 1.6 },
      { type: 'drone', at: 3.2 },
      { type: 'bulldozer', at: 4.9 },
      { type: 'robot', at: 6.6 },
      { type: 'caminhao', at: 8.6 },
      { type: 'robot', at: 10.2 },
      { type: 'drone', at: 11.8 },
      { type: 'robot', at: 13.8 },
      { type: 'bulldozer', at: 15.6 },
      { type: 'drone', at: 17.2 },
      { type: 'robot', at: 19.0 },
      { type: 'drone', at: 20.6 },
      { type: 'bulldozer', at: 22.4 },
      { type: 'robot', at: 24.5 },
      { type: 'caminhao', at: 26.4 },
      { type: 'robot', at: 28.3 },
      { type: 'drone', at: 30.0 },
      { type: 'robot', at: 31.8 },
      { type: 'bulldozer', at: 33.4 },
      { type: 'drone', at: 35.3 },
      { type: 'robot', at: 37.1 },
      { type: 'drone', at: 39.1 },
      { type: 'bulldozer', at: 40.8 },
      { type: 'robot', at: 42.5 },
      { type: 'caminhao', at: 44.4 },
      { type: 'robot', at: 46.5 },
      { type: 'drone', at: 48.4 },
      { type: 'robot', at: 50.4 },
      { type: 'bulldozer', at: 52.3 }
    ]
  }
};

// ── Pontuação ────────────────────────────────────────────────
// Chamada por enemies.js (acerto/derrota) e futuramente por items.js
// e puzzle.js. Valores combinados: lixo=50, inimigo=20, boss=300, puzzle=1000.
function addScore(pts) {
  GAME.score += pts;
  if (GAME.score < 0) GAME.score = 0;
}

// ── Início de zona ───────────────────────────────────────────
function startZone(n) {
  GAME.zone = n;
  var cfg = ZONES[n];
  if (!cfg) return;

  WORLD_WIDTH = Math.round(cfg.lengthScreens * CANVAS.width);

  ENEMIES.length = 0;
  FRUITS.length = 0;
  if (typeof BARRIS !== 'undefined') BARRIS.length = 0;

  for (var i = 0; i < cfg.enemies.length; i++) {
    var spec = cfg.enemies[i];
    var x = Math.round(spec.at * CANVAS.width);
    spawnEnemy(spec.type, x, GROUND_Y);
  }

  // Boss no fim da zona — só quando o módulo de boss existir.
  if (typeof spawnBoss === 'function' && cfg.boss) {
    spawnBoss(cfg.boss, Math.round((cfg.lengthScreens - 1.2) * CANVAS.width));
  }

  // Itens coletáveis (lixo) — quando items.js existir.
  if (typeof spawnZoneItems === 'function') {
    spawnZoneItems(n, WORLD_WIDTH);
  }

  // Reposiciona a Kiara no começo
  P.x = Math.round(CANVAS.width * 0.15);
  P.y = GROUND_Y;
  P.vx = 0;
  P.vy = 0;
  P.dir = 1;
  P.onGround = true;
  P.jumpCount = 0;
  P.dizzyTimer = 0;
  P.invulnerable = false;
  P.throwTimer = 0;
  P.state = 'idle';
  CAM.x = 0;
  CAM.dx = 0;

  GAME.state = 'playing';
}

// ── Fim de zona ──────────────────────────────────────────────
function zoneProgress() {
  if (!WORLD_WIDTH) return 0;
  var p = P.x / (WORLD_WIDTH - CANVAS.width * 0.15);
  return Math.max(0, Math.min(1, p));
}

function checkZoneEnd() {
  var finishLine = WORLD_WIDTH - CANVAS.width * 0.15;
  if (P.x >= finishLine) {
    GAME.state = (GAME.zone >= GAME.maxZone) ? 'win' : 'zone_complete';
  }
}

function advanceFromScreen() {
  if (GAME.state === 'zone_complete') {
    startZone(GAME.zone + 1);
  } else if (GAME.state === 'win') {
    GAME.score = 0;
    startZone(1);
  }
}

// ── Ajuste ao redimensionar ──────────────────────────────────
// O mundo é medido em larguras de tela, então ao mudar o tamanho do
// canvas tudo precisa ser reescalado junto — senão a Kiara e os
// inimigos ficariam em posições incoerentes com o novo mundo.
var LAST_WORLD_CANVAS_W = 0;

function syncWorldToCanvas() {
  if (GAME.state === 'loading') return;
  var w = CANVAS.width;
  if (!LAST_WORLD_CANVAS_W || LAST_WORLD_CANVAS_W === w) {
    LAST_WORLD_CANVAS_W = w;
    return;
  }
  var ratio = w / LAST_WORLD_CANVAS_W;
  WORLD_WIDTH = Math.round(WORLD_WIDTH * ratio);
  P.x = Math.round(P.x * ratio);
  for (var i = 0; i < ENEMIES.length; i++) {
    ENEMIES[i].x = Math.round(ENEMIES[i].x * ratio);
  }
  for (var j = 0; j < FRUITS.length; j++) {
    FRUITS[j].x = Math.round(FRUITS[j].x * ratio);
  }
  CAM.x = Math.round(CAM.x * ratio);
  LAST_WORLD_CANVAS_W = w;
}

window.addEventListener('resize', syncWorldToCanvas);
window.addEventListener('orientationchange', function () {
  setTimeout(syncWorldToCanvas, 250);
});

// ── Avanço de tela por toque/tecla (borda de subida) ─────────
var PREV_ADVANCE_KEY = false;

function pollAdvanceInput() {
  var pressed = !!(KEYS.jump || KEYS.throw);
  if (pressed && !PREV_ADVANCE_KEY) advanceFromScreen();
  PREV_ADVANCE_KEY = pressed;
}

CANVAS.addEventListener('pointerdown', function () {
  if (GAME.state === 'zone_complete' || GAME.state === 'win') advanceFromScreen();
});

// ── Telas de transição ───────────────────────────────────────
// Desenho provisório: quando screens.js existir, ele assume e estas
// funções deixam de ser usadas.
function drawTransitionScreen() {
  var img = null;
  var titulo = '';
  if (GAME.state === 'zone_complete') {
    img = IMAGES['screen_zone_complete'];
    titulo = 'Zona ' + GAME.zone + ' completa!';
  } else if (GAME.state === 'win') {
    img = IMAGES['screen_win'];
    titulo = 'Mahahual está salva!';
  } else {
    return;
  }

  if (img && img.complete) {
    CTX.drawImage(img, 0, 0, CANVAS.width, CANVAS.height);
  } else {
    CTX.fillStyle = 'rgba(8, 40, 18, 0.88)';
    CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
  }

  CTX.fillStyle = 'rgba(0,0,0,0.45)';
  CTX.fillRect(0, CANVAS.height * 0.34, CANVAS.width, CANVAS.height * 0.32);

  CTX.textAlign = 'center';
  CTX.fillStyle = '#fff';
  CTX.font = 'bold ' + Math.round(CANVAS.height * 0.09) + 'px sans-serif';
  CTX.fillText(titulo, CANVAS.width / 2, CANVAS.height * 0.46);

  CTX.font = 'bold ' + Math.round(CANVAS.height * 0.05) + 'px sans-serif';
  CTX.fillText('Pontos: ' + GAME.score, CANVAS.width / 2, CANVAS.height * 0.55);

  CTX.font = Math.round(CANVAS.height * 0.038) + 'px sans-serif';
  CTX.fillText('Toque na tela para continuar', CANVAS.width / 2, CANVAS.height * 0.62);
  CTX.textAlign = 'left';
}

// ── Loop principal ───────────────────────────────────────────
function gameLoop() {
  if (GAME.state === 'playing') {
    updatePlayer();   // 1º: move a Kiara
    updateCamera();   // 2º: câmera acompanha
    updateEnemies();  // 3º: inimigos (espaço de mundo, como todo platformer)
    if (typeof updateBarris === 'function') updateBarris();
    if (typeof updateItems === 'function') updateItems();
    checkZoneEnd();
  } else {
    pollAdvanceInput();
  }

  render(GAME.zone);

  if (GAME.state !== 'playing') drawTransitionScreen();

  requestAnimationFrame(gameLoop);
}

// ── Boot ─────────────────────────────────────────────────────
function startGame() {
  P.y = GROUND_Y;
  LAST_WORLD_CANVAS_W = CANVAS.width;
  startZone(1);
  requestAnimationFrame(gameLoop);
}
