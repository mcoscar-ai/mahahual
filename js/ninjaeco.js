// ═══════════════════════════════════════════════════════════════
// NINJAECO.JS — Guardiões de Mahahual
// Fase avulsa "Ninja Eco": estilo Fruit Ninja. Lixo voa em arcos
// pela tela e o jogador corta arrastando o dedo/mouse (rastro
// visual). Cortar lixo recicla e soma pontos; cortar um animal da
// fauna local tira pontos — a mensagem é "limpa, mas não machuca
// quem mora aqui".
//
// Modo 100% autocontido: não usa Kiara/câmera/física de plataforma,
// só o canvas cheio. Carregado DEPOIS de items.js (reaproveita os
// sprites botella/lata/bolsa) e DEPOIS de assets.js (usa os PNGs
// memorama_* como animais). Carregado ANTES de screens.js, pelo
// mesmo motivo do relampago.js: hudRoundRect/addButton só são
// chamados em tempo de execução.
// ═══════════════════════════════════════════════════════════════

var NINJAECO_NIVEL_DURACAO = 90 * 60; // 90s por nível, a 60fps
var NINJAECO_NIVEIS = 10;             // total de níveis da fase
var NINJAECO_TRANSICAO_DURACAO = 90;  // 1,5s de tela "¡Nivel X!" entre níveis
var NINJAECO_VALOR_LIXO = 30;         // por corte de lixo
var NINJAECO_PENALIDADE_ANIMAL = 40;  // perdido ao cortar um animal
var NINJAECO_GRAVITY_BASE = 0.34;     // fração da altura do canvas/frame²

// Animais "não corte" — reaproveita os PNGs limpos do memorama
var NINJAECO_ANIMAIS = [
  'caiman', 'capivara', 'guacamayo_azul', 'jaguar',
  'mono_capuchino', 'oso_hormiguero', 'perezoso', 'rana_arborea',
  'serpiente_verde', 'tatu', 'titi', 'tucano'
];

var NINJAECO = { timer: 0, score: 0, cortesLixo: 0, nivel: 1, transicaoTimer: 0 };
var NINJA_ITENS = [];      // { x, y, vx, vy, tipo, animal, img, r, cortado, rot, vrot, popupT }
var NINJA_POPUPS = [];     // { x, y, t, txt, cor }
var NINJA_SPAWN_TIMER = 0;

// ── Rastro do corte (trilha do dedo/mouse) ───────────────────────
var NINJA_TRAIL = [];      // { x, y, t }
var NINJA_TRAIL_MS = 140;  // quanto tempo cada ponto some (esmaecendo)
var NINJA_ARRASTANDO = false;

// ── Dificuldade progressiva: nível 1 (fácil) → nível 10 (rápido) ──
// Interpolação linear simples em cima de t = (nivel-1)/9.
function ninjaDificuldade(nivel) {
  var t = Math.max(0, Math.min(1, (nivel - 1) / (NINJAECO_NIVEIS - 1)));
  var lerp = function (a, b) { return a + (b - a) * t; };
  return {
    spawnMin: Math.round(lerp(34, 16, t)),
    spawnMax: Math.round(lerp(54, 30, t)),
    levaMax: Math.round(lerp(2, 4, t)),      // leva = 1..levaMax itens por spawn
    animalProb: lerp(0.12, 0.22, t),
    velMult: lerp(1.0, 1.6, t)
  };
}

// ── Helper: cria um item novo subindo do fundo da tela ───────────
function criarNinjaItem() {
  var W = CANVAS.width, H = CANVAS.height;
  var dif = ninjaDificuldade(NINJAECO.nivel);

  var ehAnimal = Math.random() < dif.animalProb;

  var x = W * (0.12 + Math.random() * 0.76);
  var apiceAlvo = H * (0.28 + Math.random() * 0.34); // altura que o item deve alcançar
  var g = NINJAECO_GRAVITY_BASE * (H / 1080) * dif.velMult;
  var vy = -Math.sqrt(2 * g * apiceAlvo);
  var vx = (Math.random() - 0.5) * W * 0.006 * dif.velMult;

  var raio = H * (ehAnimal ? 0.055 : 0.045);

  var img;
  if (ehAnimal) {
    var nome = NINJAECO_ANIMAIS[Math.floor(Math.random() * NINJAECO_ANIMAIS.length)];
    img = IMAGES['memorama_' + nome];
  } else {
    var tipo = ITEM_TIPOS[Math.floor(Math.random() * ITEM_TIPOS.length)];
    img = IMAGES[tipo + '_01'];
  }

  NINJA_ITENS.push({
    x: x, y: H + raio, vx: vx, vy: vy,
    animal: ehAnimal, img: img, r: raio,
    rot: Math.random() * Math.PI * 2,
    vrot: (Math.random() - 0.5) * 0.10,
    cortado: false, meioA: 0, meioB: 0
  });
}

// ── Início da fase (sempre começa no nível 1) ────────────────────
function startNinjaEco() {
  NINJA_ITENS.length = 0;
  NINJA_POPUPS.length = 0;
  NINJA_TRAIL.length = 0;
  NINJA_SPAWN_TIMER = 0;

  GAME.score = 0;
  NINJAECO.nivel = 1;
  NINJAECO.timer = NINJAECO_NIVEL_DURACAO;
  NINJAECO.score = 0;
  NINJAECO.cortesLixo = 0;
  NINJAECO.transicaoTimer = NINJAECO_TRANSICAO_DURACAO; // mostra "¡Nivel 1!" antes de começar

  GAME.state = 'ninja_eco';
}

// ── Atualização por frame ────────────────────────────────────────
function updateNinjaEco() {
  // Durante a tela de transição de nível, tudo pausa — sem spawn,
  // sem física, sem contar o tempo do próximo nível.
  if (NINJAECO.transicaoTimer > 0) {
    NINJAECO.transicaoTimer--;
    return;
  }

  var H = CANVAS.height;
  var dif = ninjaDificuldade(NINJAECO.nivel);
  var g = NINJAECO_GRAVITY_BASE * (H / 1080) * dif.velMult;

  // Spawn em levas, cadência e tamanho da leva escalam com o nível
  NINJA_SPAWN_TIMER--;
  if (NINJA_SPAWN_TIMER <= 0) {
    var leva = 1 + Math.floor(Math.random() * dif.levaMax);
    for (var s = 0; s < leva; s++) criarNinjaItem();
    NINJA_SPAWN_TIMER = dif.spawnMin + Math.floor(Math.random() * (dif.spawnMax - dif.spawnMin));
  }

  for (var i = NINJA_ITENS.length - 1; i >= 0; i--) {
    var it = NINJA_ITENS[i];
    it.vy += g;
    it.x += it.vx;
    it.y += it.vy;
    it.rot += it.vrot;
    if (it.cortado) {
      it.meioA += 0.06;
      it.meioB += 0.06;
    }
    // Some quando sai da tela por baixo (sem penalidade — só o corte importa)
    if (it.y - it.r > H + H * 0.05) NINJA_ITENS.splice(i, 1);
  }

  for (var p = NINJA_POPUPS.length - 1; p >= 0; p--) {
    NINJA_POPUPS[p].t++;
    if (NINJA_POPUPS[p].t > 45) NINJA_POPUPS.splice(p, 1);
  }

  // Rastro: descarta pontos antigos
  var agora = Date.now();
  while (NINJA_TRAIL.length && agora - NINJA_TRAIL[0].t > NINJA_TRAIL_MS) {
    NINJA_TRAIL.shift();
  }

  NINJAECO.timer--;
  if (NINJAECO.timer <= 0) {
    if (NINJAECO.nivel < NINJAECO_NIVEIS) {
      NINJAECO.nivel++;
      NINJA_ITENS.length = 0;
      NINJA_POPUPS.length = 0;
      NINJA_TRAIL.length = 0;
      NINJA_SPAWN_TIMER = 0;
      NINJAECO.timer = NINJAECO_NIVEL_DURACAO;
      NINJAECO.transicaoTimer = NINJAECO_TRANSICAO_DURACAO;
    } else {
      NINJAECO.timer = 0;
      NINJAECO.score = GAME.score;
      GAME.state = 'ninja_eco_result';
    }
  }
}

// ── Corte: testa um segmento do rastro contra todos os itens ────
function ninjaTestarCorte(x0, y0, x1, y1) {
  for (var i = 0; i < NINJA_ITENS.length; i++) {
    var it = NINJA_ITENS[i];
    if (it.cortado) continue;

    // distância do centro do item até o segmento (x0,y0)-(x1,y1)
    var dx = x1 - x0, dy = y1 - y0;
    var len2 = dx * dx + dy * dy;
    var t = len2 > 0 ? ((it.x - x0) * dx + (it.y - y0) * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    var px = x0 + t * dx, py = y0 + t * dy;
    var distX = it.x - px, distY = it.y - py;
    var dist = Math.sqrt(distX * distX + distY * distY);

    if (dist <= it.r) {
      it.cortado = true;
      if (it.animal) {
        addScore(-Math.min(GAME.score, NINJAECO_PENALIDADE_ANIMAL));
        NINJA_POPUPS.push({ x: it.x, y: it.y, t: 0, txt: '-' + NINJAECO_PENALIDADE_ANIMAL, cor: '#ff5b3d' });
      } else {
        addScore(NINJAECO_VALOR_LIXO);
        NINJAECO.cortesLixo++;
        NINJA_POPUPS.push({ x: it.x, y: it.y, t: 0, txt: '+' + NINJAECO_VALOR_LIXO, cor: '#ffd75e' });
      }
    }
  }
}

// ── Ponteiro: captura a trilha e testa corte a cada movimento ───
function ninjaPointerPos(e) {
  var rect = CANVAS.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (CANVAS.width / rect.width),
    y: (e.clientY - rect.top) * (CANVAS.height / rect.height)
  };
}

CANVAS.addEventListener('pointerdown', function (e) {
  if (typeof GAME === 'undefined' || GAME.state !== 'ninja_eco') return;
  var pos = ninjaPointerPos(e);
  var b = NINJAECO_EXIT_RECT;
  if (pos.x >= b.x && pos.x <= b.x + b.w && pos.y >= b.y && pos.y <= b.y + b.h) {
    GAME.state = 'title';
    GAME.score = 0;
    return;
  }
  var m = NINJAECO_SOM_RECT;
  if (pos.x >= m.x && pos.x <= m.x + m.w && pos.y >= m.y && pos.y <= m.y + m.h) {
    if (typeof alternarAudio === 'function') alternarAudio();
    return;
  }
  NINJA_ARRASTANDO = true;
  NINJA_TRAIL.push({ x: pos.x, y: pos.y, t: Date.now() });
});

window.addEventListener('pointermove', function (e) {
  if (typeof GAME === 'undefined' || GAME.state !== 'ninja_eco' || !NINJA_ARRASTANDO) return;
  var pos = ninjaPointerPos(e);
  var ultimo = NINJA_TRAIL.length ? NINJA_TRAIL[NINJA_TRAIL.length - 1] : null;
  NINJA_TRAIL.push({ x: pos.x, y: pos.y, t: Date.now() });
  if (ultimo) ninjaTestarCorte(ultimo.x, ultimo.y, pos.x, pos.y);
});

window.addEventListener('pointerup', function () { NINJA_ARRASTANDO = false; });
window.addEventListener('pointercancel', function () { NINJA_ARRASTANDO = false; });

// ── Desenho ───────────────────────────────────────────────────
function drawNinjaEcoItem(ctx, it) {
  if (!it.img || !it.img.complete) return;
  var d = it.r * 2;

  if (!it.cortado) {
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.rotate(it.rot);
    ctx.drawImage(it.img, -d / 2, -d / 2, d, d);
    ctx.restore();
  } else {
    // Duas metades se afastando — corte simples via clip
    var offset = it.meioA * it.r * 1.4;
    for (var lado = 0; lado < 2; lado++) {
      ctx.save();
      ctx.translate(it.x + (lado === 0 ? -offset : offset), it.y + offset * 0.5);
      ctx.rotate(it.rot + (lado === 0 ? -it.meioA * 0.4 : it.meioA * 0.4));
      ctx.beginPath();
      ctx.rect(lado === 0 ? -d / 2 : 0, -d / 2, d / 2, d);
      ctx.clip();
      ctx.globalAlpha = Math.max(0, 1 - it.meioA * 0.7);
      ctx.drawImage(it.img, -d / 2, -d / 2, d, d);
      ctx.restore();
    }
  }
}

function drawNinjaEcoTrail(ctx) {
  if (NINJA_TRAIL.length < 2) return;
  var agora = Date.now();
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (var i = 1; i < NINJA_TRAIL.length; i++) {
    var a = NINJA_TRAIL[i - 1], b = NINJA_TRAIL[i];
    var idade = agora - b.t;
    var alpha = Math.max(0, 1 - idade / NINJA_TRAIL_MS);
    if (alpha <= 0) continue;
    ctx.globalAlpha = alpha * 0.9;
    ctx.strokeStyle = '#eafff2';
    ctx.lineWidth = Math.max(2, CANVAS.height * 0.014 * alpha);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawNinjaEco(ctx) {
  var W = CANVAS.width, H = CANVAS.height;

  var bg = IMAGES['bg_relampago'];
  if (bg && bg.complete) {
    ctx.drawImage(bg, 0, 0, W, H);
    ctx.fillStyle = 'rgba(6, 30, 16, 0.30)';
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = '#123a24';
    ctx.fillRect(0, 0, W, H);
  }

  for (var i = 0; i < NINJA_ITENS.length; i++) drawNinjaEcoItem(ctx, NINJA_ITENS[i]);

  drawNinjaEcoTrail(ctx);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  for (var p = 0; p < NINJA_POPUPS.length; p++) {
    var pu = NINJA_POPUPS[p];
    var suba = pu.t * 1.4;
    var alpha = 1 - pu.t / 45;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = pu.cor;
    ctx.font = 'bold ' + Math.round(H * 0.045) + 'px sans-serif';
    ctx.fillText(pu.txt, pu.x, pu.y - suba);
    ctx.restore();
  }
  ctx.textAlign = 'left';

  drawNinjaEcoHUD(ctx);

  if (NINJAECO.transicaoTimer > 0) drawNinjaEcoTransicao(ctx);
}

// ── Tela de transição entre níveis ("¡Nivel X!") ─────────────────
function drawNinjaEcoTransicao(ctx) {
  var W = CANVAS.width, H = CANVAS.height;
  var t = NINJAECO.transicaoTimer / NINJAECO_TRANSICAO_DURACAO; // 1 → 0
  var alpha = t > 0.8 ? (1 - t) / 0.2 : (t < 0.2 ? t / 0.2 : 1); // esmaece entrada/saída
  alpha = Math.max(0, Math.min(1, alpha));

  ctx.save();
  ctx.globalAlpha = alpha * 0.80;
  ctx.fillStyle = 'rgba(6, 30, 16, 0.9)';
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd75e';
  ctx.font = 'bold ' + Math.round(H * 0.09) + 'px sans-serif';
  ctx.fillText('¡Nivel ' + NINJAECO.nivel + '!', W / 2, H * 0.44);

  ctx.fillStyle = '#fff';
  ctx.font = Math.round(H * 0.04) + 'px sans-serif';
  ctx.fillText('de ' + NINJAECO_NIVEIS, W / 2, H * 0.52);
  ctx.restore();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// ── HUD própria (mesmo layout visual do Relámpago) ───────────────
var NINJAECO_EXIT_RECT = { x: 0, y: 0, w: 0, h: 0 };
var NINJAECO_SOM_RECT  = { x: 0, y: 0, w: 0, h: 0 };

function drawNinjaEcoHUD(ctx) {
  var W = CANVAS.width, H = CANVAS.height;
  var pad = Math.round(H * 0.025);
  var painelH = Math.round(H * 0.075);

  var btnS = painelH;
  NINJAECO_EXIT_RECT = { x: pad, y: pad, w: btnS, h: btnS };
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

  var somX = pad * 2 + btnS;
  NINJAECO_SOM_RECT = { x: somX, y: pad, w: btnS, h: btnS };
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

  var rotX = pad * 3 + btnS * 2;
  var rotuloTxt = 'Nivel ' + NINJAECO.nivel + '/' + NINJAECO_NIVEIS + ' · ¡Ninja Eco!';
  ctx.font = 'bold ' + Math.round(H * 0.038) + 'px sans-serif';
  var rotW = ctx.measureText(rotuloTxt).width + pad * 2;
  ctx.fillStyle = 'rgba(12, 45, 22, 0.62)';
  hudRoundRect(ctx, rotX, pad, rotW, painelH, painelH / 2);
  ctx.fill();
  ctx.fillStyle = '#ffd75e';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(rotuloTxt, rotX + pad, pad + painelH / 2);

  var segundos = Math.max(0, Math.ceil(NINJAECO.timer / 60));
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

// ── Tela de resultado ────────────────────────────────────────────
function drawNinjaEcoResultScreen() {
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
  CTX.fillText('¡Ninja Eco completo!', CANVAS.width / 2, CANVAS.height * 0.40);

  CTX.font = 'bold ' + Math.round(CANVAS.height * 0.05) + 'px sans-serif';
  CTX.fillText('Puntos: ' + NINJAECO.score, CANVAS.width / 2, CANVAS.height * 0.49);

  CTX.font = Math.round(CANVAS.height * 0.036) + 'px sans-serif';
  CTX.fillText('Basura reciclada: ' + NINJAECO.cortesLixo, CANVAS.width / 2, CANVAS.height * 0.565);

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
  addButton(bx0, by, bw, bh, function () { startNinjaEco(); });

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
