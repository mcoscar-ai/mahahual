// ═══════════════════════════════════════════════════════════════
// RELAMPAGO.JS — Guardiões de Mahahual
// Fase avulsa "Relámpago": 90 segundos pra recolher o máximo de
// lixo possível, num mundo pequeno e fechado (não muda as 3 zonas
// da história). Sem inimigos, sem boss — só corrida contra o tempo.
//
// Carregado DEPOIS de items.js: reaproveita ITENS/ITEM_TIPOS/
// ITEM_FRAMES/ITEM_VALOR/updateItems/drawItems, só a densidade e a
// distribuição do lixo mudam (spawnRelampagoItems, abaixo). Isso
// significa que a coleta, a pontuação e o desenho do lixo já saem
// prontos e idênticos ao resto do jogo, sem nenhum asset novo.
//
// Carregado ANTES de screens.js: a tela de resultado usa addButton/
// screenButtons/hudRoundRect (definidos lá), mas só dentro de
// funções chamadas em tempo de execução — a ordem dos <script> não
// afeta isso, todos os módulos já estarão carregados quando o jogo
// começar a rodar.
// ═══════════════════════════════════════════════════════════════

var RELAMPAGO_DURACAO = 90 * 60;   // 90s a 60fps
var RELAMPAGO_WORLD_SCREENS = 12;  // mundo fechado — criança vai e volta
var RELAMPAGO_ALVO_ITENS = 80;     // lixos simultâneos no mapa (nunca esgota)

var RELAMPAGO = { timer: 0, score: 0 };

// Pra onde vai o botão de confirmar na tela de seleção de personagem:
// 'zone' (padrão, começa a Zona 1) ou 'relampago' (escolhido pelo
// botão RELÁMPAGO no título). Lido/ajustado em screens.js.
var SELECT_DESTINO = 'zone';

// ── Helper: cria UM lixo na posição X dada ──────────────────────
// Reutilizado pelo spawn inicial e pelo respawn contínuo.
// Proporção aérea mais alta que nas zonas normais: 65% flutua, 25%
// na faixa alta (pulo duplo obrigatório) — é isso que dá desafio.
function criarLixoRelampago(posX) {
  var tipo = ITEM_TIPOS[Math.floor(Math.random() * ITEM_TIPOS.length)];
  var sorteio = Math.random();
  var flutua = (sorteio >= 0.35);        // 65% flutuam (era 55%)
  var alto = (sorteio >= 0.75);          // 25% são altos (era 20%)
  var alturaVoo = 0;
  if (flutua && typeof JUMP_FORCE_1 !== 'undefined' && typeof GRAVITY !== 'undefined') {
    var apice = (JUMP_FORCE_1 * JUMP_FORCE_1) / (2 * GRAVITY);
    alturaVoo = apice * (alto ? (1.05 + Math.random() * 0.35)
                              : (0.45 + Math.random() * 0.35));
  }
  ITENS.push({
    x: Math.round(posX),
    y: Math.round(GROUND_Y - alturaVoo),
    tipo: tipo,
    frame: Math.floor(Math.random() * ITEM_FRAMES),
    frameTimer: Math.floor(Math.random() * 10),
    bobPhase: Math.random() * Math.PI * 2,
    flutua: flutua,
    alto: alto,
    coletado: false
  });
}

// ── Distribuição inicial de lixo ────────────────────────────────
function spawnRelampagoItems(worldWidth) {
  ITENS.length = 0;
  ITEM_POPUPS.length = 0;

  if (typeof updatePhysicsScale === 'function') updatePhysicsScale();

  var larguraTela = CANVAS.width;
  var pos = larguraTela * 0.5;
  var limite = worldWidth - larguraTela * 0.5;

  while (pos < limite) {
    criarLixoRelampago(pos);
    // Espaçamento denso: ~80 itens no mapa de 12 telas
    pos += larguraTela * (0.12 + Math.random() * 0.08);
  }
}

// ── Respawn contínuo: garante que nunca falta lixo ──────────────
// Chamado por updateRelampago() a cada frame. Se ITENS.length caiu
// abaixo do alvo, nasce lixo novo em posições fora da tela atual,
// pra não aparecer "do nada" na cara da criança.
function respawnRelampagoItem() {
  var larguraTela = CANVAS.width;
  var margem = larguraTela * 1.5;  // distância mínima do jogador
  var tentativas = 0;
  var posX;

  // Tenta até 20x achar uma posição longe do jogador e dentro do mapa
  do {
    posX = larguraTela * 0.5 + Math.random() * (WORLD_WIDTH - larguraTela);
    tentativas++;
  } while (Math.abs(posX - P.x) < margem && tentativas < 20);

  criarLixoRelampago(posX);
}

// ── Início da fase ────────────────────────────────────────────
function startRelampago() {
  // Tamanhos e física com a escala correta ANTES de posicionar
  // qualquer coisa (mesma ordem de startZone em game.js).
  if (typeof updateSpriteTargetHeights === 'function') updateSpriteTargetHeights();
  if (typeof updatePhysicsScale === 'function') updatePhysicsScale();

  WORLD_WIDTH = Math.round(RELAMPAGO_WORLD_SCREENS * CANVAS.width);

  ENEMIES.length = 0;
  FRUITS.length = 0;
  if (typeof BARRIS !== 'undefined') BARRIS.length = 0;
  if (typeof PLACAS !== 'undefined') PLACAS.length = 0;
  if (typeof BOSS !== 'undefined') BOSS = null;
  if (typeof NUVENS !== 'undefined') NUVENS.length = 0;
  if (typeof ESTRELAS !== 'undefined') ESTRELAS.length = 0; // sem estrelinha aqui — isso é a Fase 2

  spawnRelampagoItems(WORLD_WIDTH);

  GAME.score = 0;
  RELAMPAGO.timer = RELAMPAGO_DURACAO;
  RELAMPAGO.score = 0;

  // Kiara começa no meio do mundo — pode explorar pros dois lados.
  P.x = Math.round(WORLD_WIDTH / 2);
  P.y = GROUND_Y;
  P.vx = 0;
  P.vy = 0;
  P.dir = 1;
  P.onGround = true;
  P.jumpCount = 0;
  P.dizzyTimer = 0;
  P.invulnerable = false;
  P.throwTimer = 0;
  P.starTimer = 0;
  P.state = 'idle';

  CAM.x = Math.max(0, Math.min(WORLD_WIDTH - CANVAS.width,
    P.x - CANVAS.width * CAM_PLAYER_SCREEN_POS));
  CAM.dx = 0;

  GAME.state = 'relampago';
}

// ── Atualização por frame (chamada pelo gameLoop em game.js) ─────
function updateRelampago() {
  // Mundo fechado nas duas pontas — não há "fim de fase" a atravessar,
  // só os limites do mapa.
  if (P.x < 0) P.x = 0;
  if (P.x > WORLD_WIDTH) P.x = WORLD_WIDTH;

  // Respawn contínuo: até 3 por frame pra repor rápido sem pico de CPU.
  // Assim a criança nunca fica andando num mundo vazio.
  var faltam = RELAMPAGO_ALVO_ITENS - ITENS.length;
  for (var r = 0; r < Math.min(faltam, 3); r++) {
    respawnRelampagoItem();
  }

  RELAMPAGO.timer--;
  if (RELAMPAGO.timer <= 0) {
    RELAMPAGO.timer = 0;
    RELAMPAGO.score = GAME.score;
    GAME.state = 'relampago_result';
  }
}

// ── HUD própria (cronômetro no lugar da barra de progresso) ──────
var RELAMPAGO_EXIT_RECT = { x: 0, y: 0, w: 0, h: 0 };
var RELAMPAGO_SOM_RECT  = { x: 0, y: 0, w: 0, h: 0 };

function drawRelampagoHUD(ctx) {
  if (typeof GAME === 'undefined' || GAME.state !== 'relampago') return;

  var W = CANVAS.width, H = CANVAS.height;
  var pad = Math.round(H * 0.025);
  var painelH = Math.round(H * 0.075);

  // Botão de sair — mesmo desenho de "casinha" do hud.js, pra manter
  // a linguagem visual do resto do jogo.
  var btnS = painelH;
  RELAMPAGO_EXIT_RECT = { x: pad, y: pad, w: btnS, h: btnS };
  ctx.fillStyle = 'rgba(12, 45, 22, 0.62)';
  hudRoundRect(ctx, pad, pad, btnS, btnS, btnS / 2);
  ctx.fill();
  var hcx = pad + btnS / 2, hcy = pad + btnS / 2, r = btnS * 0.26;
  ctx.fillStyle = '#ffd75e';
  ctx.beginPath();
  ctx.moveTo(hcx, hcy - r * 1.1);
  ctx.lineTo(hcx + r * 1.15, hcy);
  ctx.lineTo(hcx - r * 1.15, hcy);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(hcx - r * 0.72, hcy, r * 1.44, r * 1.0);
  ctx.fillStyle = 'rgba(12, 45, 22, 0.85)';
  ctx.fillRect(hcx - r * 0.24, hcy + r * 0.28, r * 0.48, r * 0.72);

  // Botão de som (ao lado da casinha — idêntico ao hud.js)
  var somX = pad * 2 + btnS;
  RELAMPAGO_SOM_RECT = { x: somX, y: pad, w: btnS, h: btnS };
  ctx.fillStyle = 'rgba(12, 45, 22, 0.62)';
  hudRoundRect(ctx, somX, pad, btnS, btnS, btnS / 2);
  ctx.fill();
  var scx = somX + btnS / 2, scy = pad + btnS / 2, sr = btnS * 0.24;
  var ligado = (typeof AUDIO_LIGADO === 'undefined') ? true : AUDIO_LIGADO;
  ctx.fillStyle = ligado ? '#ffd75e' : '#8d9b8f';
  ctx.beginPath();
  ctx.moveTo(scx - sr * 0.9, scy - sr * 0.32);
  ctx.lineTo(scx - sr * 0.35, scy - sr * 0.32);
  ctx.lineTo(scx + sr * 0.25, scy - sr * 0.95);
  ctx.lineTo(scx + sr * 0.25, scy + sr * 0.95);
  ctx.lineTo(scx - sr * 0.35, scy + sr * 0.32);
  ctx.lineTo(scx - sr * 0.9, scy + sr * 0.32);
  ctx.closePath();
  ctx.fill();
  if (ligado) {
    ctx.strokeStyle = '#ffd75e';
    ctx.lineWidth = Math.max(2, btnS * 0.06);
    for (var w = 1; w <= 2; w++) {
      ctx.beginPath();
      ctx.arc(scx + sr * 0.35, scy, sr * (0.35 + w * 0.32), -Math.PI / 3, Math.PI / 3);
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = '#e8622b';
    ctx.lineWidth = Math.max(2, btnS * 0.08);
    ctx.beginPath();
    ctx.moveTo(scx + sr * 0.5, scy - sr * 0.5);
    ctx.lineTo(scx + sr * 1.15, scy + sr * 0.5);
    ctx.moveTo(scx + sr * 1.15, scy - sr * 0.5);
    ctx.lineTo(scx + sr * 0.5, scy + sr * 0.5);
    ctx.stroke();
  }

  // Rótulo do modo, ao lado dos botões
  var rotX = pad * 3 + btnS * 2;
  var rotuloTxt = '¡Relámpago!';
  ctx.font = 'bold ' + Math.round(H * 0.038) + 'px sans-serif';
  var rotW = ctx.measureText(rotuloTxt).width + pad * 2;
  ctx.fillStyle = 'rgba(12, 45, 22, 0.62)';
  hudRoundRect(ctx, rotX, pad, rotW, painelH, painelH / 2);
  ctx.fill();
  ctx.fillStyle = '#ffd75e';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(rotuloTxt, rotX + pad, pad + painelH / 2);

  // Cronômetro (centro superior) — pisca em vermelho nos últimos 10s
  var segundos = Math.max(0, Math.ceil(RELAMPAGO.timer / 60));
  var urgente = segundos <= 10;
  var pisca = urgente ? (0.55 + Math.sin(Date.now() / 140) * 0.35) : 1;

  var relW = W * 0.14;
  var relX = (W - relW) / 2;

  ctx.save();
  ctx.globalAlpha = pisca;
  ctx.fillStyle = urgente ? 'rgba(168, 40, 24, 0.88)' : 'rgba(12, 45, 22, 0.62)';
  hudRoundRect(ctx, relX, pad, relW, painelH, painelH / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(H * 0.05) + 'px sans-serif';
  ctx.fillText(segundos + 's', relX + relW / 2, pad + painelH / 2);
  ctx.restore();

  // Pontuação (canto superior direito) — mesmo estilo do hud.js
  var pontos = String(GAME.score);
  var fontePontos = Math.round(H * 0.055);
  ctx.font = 'bold ' + fontePontos + 'px sans-serif';
  ctx.textBaseline = 'alphabetic';
  var larguraPontos = ctx.measureText(pontos).width;
  var painelPontosW = larguraPontos + pad * 3.4;
  ctx.fillStyle = 'rgba(12, 45, 22, 0.62)';
  hudRoundRect(ctx, W - pad - painelPontosW, pad, painelPontosW, painelH, painelH / 2);
  ctx.fill();
  var cx = W - pad - painelPontosW + pad * 1.1, cy = pad + painelH / 2, rf = painelH * 0.20;
  ctx.fillStyle = '#7fd36b';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rf, rf * 0.62, -Math.PI / 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'right';
  ctx.fillText(pontos, W - pad * 1.7, cy);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// Toque no botão de sair ou som — só ativo durante a fase Relámpago
CANVAS.addEventListener('pointerdown', function (e) {
  if (typeof GAME === 'undefined' || GAME.state !== 'relampago') return;
  var rect = CANVAS.getBoundingClientRect();
  var sx = (e.clientX - rect.left) * (CANVAS.width / rect.width);
  var sy = (e.clientY - rect.top) * (CANVAS.height / rect.height);
  var b = RELAMPAGO_EXIT_RECT;
  if (sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h) {
    GAME.state = 'title';
    GAME.score = 0;
    return;
  }
  var m = RELAMPAGO_SOM_RECT;
  if (sx >= m.x && sx <= m.x + m.w && sy >= m.y && sy <= m.y + m.h) {
    if (typeof alternarAudio === 'function') alternarAudio();
  }
});

// ── Tela de resultado ────────────────────────────────────────────
// Chamada pelo roteador drawScreen() em screens.js.
function drawRelampagoResultScreen() {
  screenButtons = [];

  var bg = IMAGES['screen_zone_complete'];
  if (bg && bg.complete) {
    CTX.drawImage(bg, 0, 0, CANVAS.width, CANVAS.height);
  } else {
    CTX.fillStyle = 'rgba(8, 40, 18, 0.9)';
    CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
  }

  CTX.fillStyle = 'rgba(0,0,0,0.45)';
  CTX.fillRect(0, CANVAS.height * 0.30, CANVAS.width, CANVAS.height * 0.40);

  CTX.textAlign = 'center';
  CTX.textBaseline = 'alphabetic';
  CTX.fillStyle = '#fff';
  CTX.font = 'bold ' + Math.round(CANVAS.height * 0.075) + 'px sans-serif';
  CTX.fillText('¡Tiempo terminado!', CANVAS.width / 2, CANVAS.height * 0.40);

  CTX.font = 'bold ' + Math.round(CANVAS.height * 0.05) + 'px sans-serif';
  CTX.fillText('Puntos: ' + RELAMPAGO.score, CANVAS.width / 2, CANVAS.height * 0.49);

  var itensRecogidos = Math.round(RELAMPAGO.score / ITEM_VALOR);
  CTX.font = Math.round(CANVAS.height * 0.036) + 'px sans-serif';
  CTX.fillText('Basura recogida: ' + itensRecogidos, CANVAS.width / 2, CANVAS.height * 0.565);

  // Dois botões: jugar de nuevo / volver al menú
  var bw = CANVAS.width * 0.22;
  var bh = CANVAS.height * 0.09;
  var gap = CANVAS.width * 0.03;
  var totW = bw * 2 + gap;
  var bx0 = (CANVAS.width - totW) / 2;
  var by = CANVAS.height * 0.63;

  CTX.textBaseline = 'middle';

  CTX.fillStyle = 'rgba(232, 98, 43, 0.95)';
  hudRoundRect(CTX, bx0, by, bw, bh, bh / 2);
  CTX.fill();
  CTX.strokeStyle = '#fff';
  CTX.lineWidth = Math.max(2, CANVAS.height * 0.005);
  hudRoundRect(CTX, bx0, by, bw, bh, bh / 2);
  CTX.stroke();
  CTX.fillStyle = '#fff';
  CTX.font = 'bold ' + Math.round(CANVAS.height * 0.036) + 'px sans-serif';
  CTX.fillText('Jugar de nuevo', bx0 + bw / 2, by + bh / 2);
  addButton(bx0, by, bw, bh, function () { startRelampago(); });

  var bx1 = bx0 + bw + gap;
  CTX.fillStyle = 'rgba(46, 116, 168, 0.95)';
  hudRoundRect(CTX, bx1, by, bw, bh, bh / 2);
  CTX.fill();
  CTX.strokeStyle = '#fff';
  hudRoundRect(CTX, bx1, by, bw, bh, bh / 2);
  CTX.stroke();
  CTX.fillStyle = '#fff';
  CTX.fillText('Menú', bx1 + bw / 2, by + bh / 2);
  addButton(bx1, by, bw, bh, function () { GAME.state = 'title'; });

  CTX.textAlign = 'left';
  CTX.textBaseline = 'alphabetic';
}
