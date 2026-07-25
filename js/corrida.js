// ═══════════════════════════════════════════════════════════════
// CORRIDA.JS — Guardiões de Mahahual
// Fase avulsa "Corrida": corre o máximo que puder em 90 segundos,
// desviando de barris e placas. Sem inimigos que atiram, sem lixo,
// sem frutas — só corrida, salto e reflexo.
//
// O mundo é INFINITO: sem limite à direita. Barris e placas nascem
// à frente da Kiara conforme ela avança. A criança só pode ir pra
// direita (e pular). Resultado: distância em "km" (fantasia).
//
// Carregado DEPOIS de relampago.js e ANTES de screens.js.
// Reutiliza de enemies.js: spawnBarril(), spawnPlaca(), updateBarris(),
// updatePlacas(), drawBarris(), drawPlacas() — já existem e funcionam.
// ═══════════════════════════════════════════════════════════════

var CORRIDA_DURACAO = 90 * 60;         // 90s a 60fps

// Quantos pixels de mundo = 1 "km" na tela de resultado.
// Com MOVE_SPEED_BASE=14 e canvas ~1440px, a Kiara anda ~10px/frame
// ≈ 600px/s. Em 90s percorre ~54.000px. Com divisor 5400, dá ~10 km.
// Parece um número bonito pra criança.
var CORRIDA_PX_POR_KM = 5400;

var CORRIDA = { timer: 0, distancia: 0, proximoObstaculo: 0, obstaculosCriados: 0 };

// ── Início da fase ────────────────────────────────────────────
function startCorrida() {
  if (typeof updateSpriteTargetHeights === 'function') updateSpriteTargetHeights();
  if (typeof updatePhysicsScale === 'function') updatePhysicsScale();

  // Mundo "infinito" — na prática, um número grande que a Kiara nunca
  // alcança em 90 segundos. 500 telas de largura é ~720.000px, e ela
  // percorre ~54.000px a velocidade normal.
  WORLD_WIDTH = Math.round(500 * CANVAS.width);

  ENEMIES.length = 0;
  FRUITS.length = 0;
  if (typeof BARRIS !== 'undefined') BARRIS.length = 0;
  if (typeof PLACAS !== 'undefined') PLACAS.length = 0;
  if (typeof BOSS !== 'undefined') BOSS = null;
  if (typeof NUVENS !== 'undefined') NUVENS.length = 0;
  if (typeof ESTRELAS !== 'undefined') ESTRELAS.length = 0;
  if (typeof ITENS !== 'undefined') ITENS.length = 0;

  GAME.score = 0;
  CORRIDA.timer = CORRIDA_DURACAO;
  CORRIDA.distancia = 0;
  CORRIDA.proximoObstaculo = CANVAS.width * 1.5;  // primeiro obstáculo aparece logo
  CORRIDA.obstaculosCriados = 0;

  // Kiara começa à esquerda e só pode ir pra direita
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
  P.starTimer = 0;
  P.state = 'idle';

  CAM.x = 0;
  CAM.dx = 0;

  GAME.state = 'corrida';
}

// ── Atualização por frame ────────────────────────────────────────
function updateCorrida() {
  // Impede voltar (é uma corrida, não exploração)
  if (P.x < CORRIDA.distancia) P.x = CORRIDA.distancia;

  // Atualiza distância máxima
  if (P.x > CORRIDA.distancia) CORRIDA.distancia = P.x;

  // Gera obstáculos à frente da Kiara quando ela se aproxima
  // da próxima marca. Alterna entre barris (rolando) e placas
  // (paradas pra pular), com espaçamento aleatório.
  while (P.x + CANVAS.width * 1.5 > CORRIDA.proximoObstaculo) {
    var tipo = CORRIDA.obstaculosCriados % 3; // 0=placa, 1=barril, 2=placa

    if (tipo === 1) {
      // Barril: nasce no chão já rolando na direção da Kiara
      if (typeof spawnBarril === 'function') {
        spawnBarril(CORRIDA.proximoObstaculo, GROUND_Y);
      }
    } else {
      // Placa: obstáculo parado pra pular
      if (typeof spawnPlaca === 'function') {
        spawnPlaca(CORRIDA.proximoObstaculo);
      }
    }

    CORRIDA.obstaculosCriados++;

    // Espaçamento: fica mais apertado com o tempo (aceleração de
    // dificuldade natural). Começa com 2.0-3.0 telas, depois de 30s
    // vai fechando até 0.8-1.5 telas.
    var tempoDecorrido = (CORRIDA_DURACAO - CORRIDA.timer) / 60; // em segundos
    var fatorTempo = Math.max(0.4, 1 - tempoDecorrido / 120);    // 1.0 → 0.4
    var espacamento = CANVAS.width * (0.8 + Math.random() * 1.2) * fatorTempo;
    CORRIDA.proximoObstaculo += Math.max(CANVAS.width * 0.6, espacamento);
  }

  // Limpeza: remove obstáculos que ficaram muito atrás
  if (typeof BARRIS !== 'undefined') {
    for (var b = BARRIS.length - 1; b >= 0; b--) {
      if (BARRIS[b].x < P.x - CANVAS.width * 2) BARRIS[b].removed = true;
    }
  }
  if (typeof PLACAS !== 'undefined') {
    for (var p = PLACAS.length - 1; p >= 0; p--) {
      if (PLACAS[p].x < P.x - CANVAS.width * 2) PLACAS[p].removed = true;
    }
  }

  CORRIDA.timer--;
  if (CORRIDA.timer <= 0) {
    CORRIDA.timer = 0;
    GAME.state = 'corrida_result';
  }
}

// ── HUD da corrida (cronômetro + distância) ─────────────────────
var CORRIDA_EXIT_RECT = { x: 0, y: 0, w: 0, h: 0 };
var CORRIDA_SOM_RECT  = { x: 0, y: 0, w: 0, h: 0 };

function drawCorridaHUD(ctx) {
  if (typeof GAME === 'undefined' || GAME.state !== 'corrida') return;

  var W = CANVAS.width, H = CANVAS.height;
  var pad = Math.round(H * 0.025);
  var painelH = Math.round(H * 0.075);
  var btnS = painelH;

  // ── Botão de sair (casinha) ─────────────────────────────────
  CORRIDA_EXIT_RECT = { x: pad, y: pad, w: btnS, h: btnS };
  ctx.fillStyle = 'rgba(12, 20, 45, 0.62)';
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
  ctx.fillStyle = 'rgba(12, 20, 45, 0.85)';
  ctx.fillRect(hcx - r * 0.24, hcy + r * 0.28, r * 0.48, r * 0.72);

  // ── Botão de som ────────────────────────────────────────────
  var somX = pad * 2 + btnS;
  CORRIDA_SOM_RECT = { x: somX, y: pad, w: btnS, h: btnS };
  ctx.fillStyle = 'rgba(12, 20, 45, 0.62)';
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

  // ── Rótulo "¡Corrida!" ──────────────────────────────────────
  var rotX = pad * 3 + btnS * 2;
  var rotuloTxt = '¡Corrida!';
  ctx.font = 'bold ' + Math.round(H * 0.038) + 'px sans-serif';
  var rotW = ctx.measureText(rotuloTxt).width + pad * 2;
  ctx.fillStyle = 'rgba(12, 20, 45, 0.62)';
  hudRoundRect(ctx, rotX, pad, rotW, painelH, painelH / 2);
  ctx.fill();
  ctx.fillStyle = '#ffd75e';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(rotuloTxt, rotX + pad, pad + painelH / 2);

  // ── Cronômetro (centro) ─────────────────────────────────────
  var segundos = Math.max(0, Math.ceil(CORRIDA.timer / 60));
  var urgente = segundos <= 10;
  var pisca = urgente ? (0.55 + Math.sin(Date.now() / 140) * 0.35) : 1;
  var relW = W * 0.14;
  var relX = (W - relW) / 2;
  ctx.save();
  ctx.globalAlpha = pisca;
  ctx.fillStyle = urgente ? 'rgba(168, 40, 24, 0.88)' : 'rgba(12, 20, 45, 0.62)';
  hudRoundRect(ctx, relX, pad, relW, painelH, painelH / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(H * 0.05) + 'px sans-serif';
  ctx.fillText(segundos + 's', relX + relW / 2, pad + painelH / 2);
  ctx.restore();

  // ── Distância em km (direita) ───────────────────────────────
  var km = (CORRIDA.distancia / CORRIDA_PX_POR_KM).toFixed(1);
  ctx.font = 'bold ' + Math.round(H * 0.05) + 'px sans-serif';
  var kmTxt = km + ' km';
  var kmW = ctx.measureText(kmTxt).width + pad * 3;
  ctx.fillStyle = 'rgba(12, 20, 45, 0.62)';
  hudRoundRect(ctx, W - pad - kmW, pad, kmW, painelH, painelH / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(kmTxt, W - pad * 1.7, pad + painelH / 2);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// ── Toque nos botões da HUD ─────────────────────────────────────
CANVAS.addEventListener('pointerdown', function (e) {
  if (typeof GAME === 'undefined' || GAME.state !== 'corrida') return;
  var rect = CANVAS.getBoundingClientRect();
  var sx = (e.clientX - rect.left) * (CANVAS.width / rect.width);
  var sy = (e.clientY - rect.top) * (CANVAS.height / rect.height);
  var b = CORRIDA_EXIT_RECT;
  if (sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h) {
    GAME.state = 'title';
    GAME.score = 0;
    return;
  }
  var m = CORRIDA_SOM_RECT;
  if (sx >= m.x && sx <= m.x + m.w && sy >= m.y && sy <= m.y + m.h) {
    if (typeof alternarAudio === 'function') alternarAudio();
  }
});

// ── Tela de resultado ────────────────────────────────────────────
function drawCorridaResultScreen() {
  screenButtons = [];

  var bg = IMAGES['screen_zone_complete'];
  if (bg && bg.complete) {
    CTX.drawImage(bg, 0, 0, CANVAS.width, CANVAS.height);
  } else {
    CTX.fillStyle = 'rgba(8, 14, 40, 0.9)';
    CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
  }

  CTX.fillStyle = 'rgba(0,0,0,0.45)';
  CTX.fillRect(0, CANVAS.height * 0.30, CANVAS.width, CANVAS.height * 0.40);

  var km = (CORRIDA.distancia / CORRIDA_PX_POR_KM).toFixed(1);

  CTX.textAlign = 'center';
  CTX.textBaseline = 'alphabetic';
  CTX.fillStyle = '#fff';
  CTX.font = 'bold ' + Math.round(CANVAS.height * 0.075) + 'px sans-serif';
  CTX.fillText('¡Tiempo terminado!', CANVAS.width / 2, CANVAS.height * 0.40);

  CTX.font = 'bold ' + Math.round(CANVAS.height * 0.058) + 'px sans-serif';
  CTX.fillStyle = '#ffd75e';
  CTX.fillText(km + ' km recorridos', CANVAS.width / 2, CANVAS.height * 0.50);

  CTX.font = Math.round(CANVAS.height * 0.036) + 'px sans-serif';
  CTX.fillStyle = '#cfe8c0';
  var obstaculos = CORRIDA.obstaculosCriados;
  CTX.fillText(obstaculos + ' obstáculo' + (obstaculos !== 1 ? 's' : '') + ' en el camino', CANVAS.width / 2, CANVAS.height * 0.565);

  // Dois botões
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
  CTX.fillText('Correr de nuevo', bx0 + bw / 2, by + bh / 2);
  addButton(bx0, by, bw, bh, function () { startCorrida(); });

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
