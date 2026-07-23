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
    name: 'La Playa Olvidada',
    lengthScreens: 55,
    boss: 'boss_bulldozer',
    enemies: [
      { type: 'bulldozer', at: 1.8 },
      { type: 'drone', at: 2.4 },
      { type: 'bulldozer', at: 4.0 },
      { type: 'bulldozer', at: 6.0 },
      { type: 'bulldozer', at: 7.9 },
      { type: 'bulldozer', at: 9.6 },
      { type: 'bulldozer', at: 11.2 },
      { type: 'bulldozer', at: 12.9 },
      { type: 'drone', at: 14.6 },
      { type: 'drone', at: 16.3 },
      { type: 'drone', at: 18.4 },
      { type: 'drone', at: 20.0 },
      { type: 'drone', at: 21.5 },
      { type: 'bulldozer', at: 23.4 },
      { type: 'bulldozer', at: 25.3 },
      { type: 'bulldozer', at: 27.0 },
      { type: 'bulldozer', at: 28.7 },
      { type: 'drone', at: 30.7 },
      { type: 'drone', at: 32.8 },
      { type: 'drone', at: 34.4 },
      { type: 'bulldozer', at: 36.3 },
      { type: 'drone', at: 37.0 },
      { type: 'bulldozer', at: 38.9 },
      { type: 'drone', at: 41.0 },
      { type: 'bulldozer', at: 42.6 },
      { type: 'drone', at: 44.3 },
      { type: 'bulldozer', at: 45.9 },
      { type: 'bulldozer', at: 47.5 },
      { type: 'drone', at: 49.4 },
      { type: 'drone', at: 51.2 }
    ]
  },
  2: {
    name: 'La Selva Herida',
    lengthScreens: 55,
    boss: 'bossdrone',
    enemies: [
      { type: 'drone', at: 1.8 },
      { type: 'drone', at: 3.3 },
      { type: 'drone', at: 4.0 },
      { type: 'caminhao', at: 7.2 },
      { type: 'drone', at: 9.6 },
      { type: 'drone', at: 11.7 },
      { type: 'drone', at: 12.3 },
      { type: 'drone', at: 13.9 },
      { type: 'drone', at: 14.6 },
      { type: 'drone', at: 16.5 },
      { type: 'drone', at: 17.2 },
      { type: 'drone', at: 18.8 },
      { type: 'caminhao', at: 21.8 },
      { type: 'drone', at: 24.2 },
      { type: 'drone', at: 26.1 },
      { type: 'drone', at: 27.9 },
      { type: 'drone', at: 30.6 },
      { type: 'caminhao', at: 33.3 },
      { type: 'drone', at: 35.7 },
      { type: 'drone', at: 37.3 },
      { type: 'drone', at: 39.1 },
      { type: 'caminhao', at: 41.8 },
      { type: 'drone', at: 44.2 },
      { type: 'drone', at: 45.7 },
      { type: 'drone', at: 47.4 },
      { type: 'drone', at: 49.1 },
      { type: 'drone', at: 50.8 }
    ]
  },
  3: {
    name: 'El Corazón de Mahahual',
    lengthScreens: 55,
    boss: 'bossrobot',
    enemies: [
      { type: 'robot', at: 1.8 },
      { type: 'robot', at: 3.8 },
      { type: 'robot', at: 5.6 },
      { type: 'robot', at: 7.7 },
      { type: 'robot', at: 8.3 },
      { type: 'robot', at: 9.9 },
      { type: 'robot', at: 10.5 },
      { type: 'robot', at: 12.4 },
      { type: 'robot', at: 14.3 },
      { type: 'robot', at: 15.9 },
      { type: 'robot', at: 17.8 },
      { type: 'robot', at: 18.4 },
      { type: 'robot', at: 20.1 },
      { type: 'robot', at: 22.0 },
      { type: 'robot', at: 23.7 },
      { type: 'robot', at: 25.6 },
      { type: 'robot', at: 27.6 },
      { type: 'drone', at: 29.1 },
      { type: 'drone', at: 30.8 },
      { type: 'robot', at: 32.3 },
      { type: 'robot', at: 34.4 },
      { type: 'robot', at: 35.0 },
      { type: 'robot', at: 36.8 },
      { type: 'robot', at: 38.4 },
      { type: 'robot', at: 40.1 },
      { type: 'drone', at: 42.0 },
      { type: 'robot', at: 44.0 },
      { type: 'drone', at: 44.5 },
      { type: 'robot', at: 46.1 },
      { type: 'robot', at: 47.8 },
      { type: 'robot', at: 49.8 },
      { type: 'drone', at: 51.4 }
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

  // Tamanhos e física com a escala correta ANTES de posicionar qualquer coisa
  if (typeof updateSpriteTargetHeights === 'function') updateSpriteTargetHeights();
  if (typeof updatePhysicsScale === 'function') updatePhysicsScale();

  WORLD_WIDTH = Math.round(cfg.lengthScreens * CANVAS.width);

  ENEMIES.length = 0;
  FRUITS.length = 0;
  if (typeof BARRIS !== 'undefined') BARRIS.length = 0;
  if (typeof PLACAS !== 'undefined') PLACAS.length = 0;
  P.starTimer = 0;

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
    titulo = '¡Zona ' + GAME.zone + ' completa!';
  } else if (GAME.state === 'win') {
    img = IMAGES['screen_win'];
    titulo = '¡Mahahual está a salvo!';
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
  CTX.fillText('Puntos: ' + GAME.score, CANVAS.width / 2, CANVAS.height * 0.55);

  CTX.font = Math.round(CANVAS.height * 0.038) + 'px sans-serif';
  CTX.fillText('Toca la pantalla para continuar', CANVAS.width / 2, CANVAS.height * 0.62);
  CTX.textAlign = 'left';
}

// ── Loop principal ───────────────────────────────────────────
function gameLoop() {
  if (GAME.state === 'playing') {
    updatePlayer();   // 1º: move a Kiara
    updateCamera();   // 2º: câmera acompanha
    updateEnemies();  // 3º: inimigos (espaço de mundo, como todo platformer)
    if (typeof updateBarris === 'function') updateBarris();
    if (typeof updatePlacas === 'function') updatePlacas();
    if (typeof updateItems === 'function') updateItems();
    if (typeof updateStars === 'function') updateStars();
    checkZoneEnd();
  } else {
    pollAdvanceInput();
  }

  if (GAME.state === 'playing') {
    render(GAME.zone);
  } else if (typeof drawScreen === 'function' && drawScreen()) {
    // screens.js desenhou a tela atual (title/select/zone_complete/win)
  } else {
    render(GAME.zone);
    drawTransitionScreen(); // fallback provisório
  }

  requestAnimationFrame(gameLoop);
}

// ── Boot ─────────────────────────────────────────────────────
function startGame() {
  GAME.state = 'title';
  // O renderer.js roda resizeCanvas() ao carregar, mas nessa hora o
  // enemies.js ainda não existe — então o bloco que recalcula os
  // tamanhos dos inimigos é pulado e eles ficam com os valores
  // literais do ENEMY_TYPES até o primeiro resize. Rodando de novo
  // aqui, com todos os módulos já carregados, tudo fica proporcional
  // à tela desde o primeiro frame.
  if (typeof resizeCanvas === 'function') resizeCanvas();

  P.y = GROUND_Y;
  LAST_WORLD_CANVAS_W = CANVAS.width;
  // NÃO inicia a zona aqui — o jogo abre na tela de título. A zona só
  // começa quando o jogador escolhe o personagem (screens.js chama
  // startZone a partir da tela de seleção).
  requestAnimationFrame(gameLoop);
}
