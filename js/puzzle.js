// ═══════════════════════════════════════════════════════════════
// PUZZLE.JS — Guardiões de Mahahual
// Minijogos entre as zonas. Obrigatórios: só avança completando.
//
// Carregado DEPOIS de game.js. O estado 'puzzle' entra entre a tela
// de zona completa e o início da próxima zona.
//
//   Depois da Zona 1 → encaixe da CAPIVARA (4 peças, fácil)
//   Depois da Zona 2 → MEMORAMA de animais (6 pares)
//   Depois da Zona 3 → encaixe do TUCANO (8 peças)
//
// (O jaguar tem 8 peças prontas também e serve de troca direta pelo
//  tucano — é só mudar 'animal' na tabela abaixo.)
//
// No encaixe a criança ARRASTA a peça até o lugar; o encaixe é
// generoso de propósito, pra não exigir precisão de adulto.
// ═══════════════════════════════════════════════════════════════

var PUZZLE = null;
var PUZZLE_PONTOS = 1000;

var PUZZLES_POR_ZONA = {
  1: { tipo: 'encaixe',  animal: 'capivara', pecas: ['TL', 'TR', 'BL', 'BR'], cols: 2, linhas: 2,
       titulo: '¡Arma el capibara!' },
  2: { tipo: 'memorama', pares: 6,
       titulo: '¡Encuentra las parejas!' },
  3: { tipo: 'encaixe',  animal: 'tucano', pecas: ['01','02','03','04','05','06','07','08'], cols: 4, linhas: 2,
       titulo: '¡Arma el tucán!' }
};

var MEMORAMA_POOL = [
  'capivara', 'jaguar', 'tucano', 'perezoso', 'tatu', 'titi',
  'caiman', 'guacamayo_azul', 'mono_capuchino', 'oso_hormiguero',
  'rana_arborea', 'serpiente_verde'
];

// ── Início ───────────────────────────────────────────────────
function iniciarPuzzle(zona) {
  var cfg = PUZZLES_POR_ZONA[zona];
  if (!cfg) { PUZZLE = null; return false; }

  if (cfg.tipo === 'encaixe') iniciarEncaixe(cfg);
  else                        iniciarMemorama(cfg);

  PUZZLE.zona = cfg;
  PUZZLE.completo = false;
  PUZZLE.fimTimer = 0;
  return true;
}

function chavePeca(cfg, id) {
  return (cfg.animal === 'capivara')
    ? 'puzzle_capivara_' + id
    : 'puzzle_' + cfg.animal + '_piece_' + id;
}

function iniciarEncaixe(cfg) {
  var W = CANVAS.width, H = CANVAS.height;

  // Tabuleiro central onde as peças se encaixam
  var boardH = H * 0.46;
  var boardW = boardH * (cfg.cols / cfg.linhas);
  if (boardW > W * 0.46) { boardW = W * 0.46; boardH = boardW * (cfg.linhas / cfg.cols); }
  var boardX = (W - boardW) / 2 - W * 0.13;   // deslocado, referência fica à direita
  var boardY = H * 0.24;

  var pw = boardW / cfg.cols;
  var ph = boardH / cfg.linhas;

  var pecas = [];
  for (var i = 0; i < cfg.pecas.length; i++) {
    var col = i % cfg.cols;
    var lin = Math.floor(i / cfg.cols);
    pecas.push({
      id: cfg.pecas[i],
      alvoX: boardX + col * pw,
      alvoY: boardY + lin * ph,
      x: 0, y: 0,
      w: pw, h: ph,
      colocada: false
    });
  }

  // Embaralha as posições iniciais na bandeja de baixo
  var ordem = pecas.slice();
  for (var k = ordem.length - 1; k > 0; k--) {
    var j = Math.floor(Math.random() * (k + 1));
    var t = ordem[k]; ordem[k] = ordem[j]; ordem[j] = t;
  }
  var bandejaY = H * 0.76;
  var vaoTotal = ordem.length * pw + (ordem.length - 1) * (W * 0.012);
  var bx = (W - vaoTotal) / 2;
  for (var m = 0; m < ordem.length; m++) {
    ordem[m].x = bx + m * (pw + W * 0.012);
    ordem[m].y = bandejaY;
    ordem[m].origemX = ordem[m].x;
    ordem[m].origemY = ordem[m].y;
  }

  PUZZLE = {
    tipo: 'encaixe',
    pecas: pecas,
    boardX: boardX, boardY: boardY, boardW: boardW, boardH: boardH,
    arrastando: null,
    offX: 0, offY: 0
  };
}

function iniciarMemorama(cfg) {
  var W = CANVAS.width, H = CANVAS.height;

  // sorteia os animais do baralho
  var pool = MEMORAMA_POOL.slice();
  for (var i = pool.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
  }
  var escolhidos = pool.slice(0, cfg.pares);

  var cartas = [];
  for (var a = 0; a < escolhidos.length; a++) {
    cartas.push({ animal: escolhidos[a] });
    cartas.push({ animal: escolhidos[a] });
  }
  for (var k = cartas.length - 1; k > 0; k--) {
    var j2 = Math.floor(Math.random() * (k + 1));
    var t2 = cartas[k]; cartas[k] = cartas[j2]; cartas[j2] = t2;
  }

  var cols = 4;
  var linhas = Math.ceil(cartas.length / cols);
  var gridH = H * 0.56;
  var ch = gridH / linhas;
  var cw = ch * 0.82;
  var gapX = W * 0.014, gapY = H * 0.022;
  var totalW = cols * cw + (cols - 1) * gapX;
  var startX = (W - totalW) / 2;
  var startY = H * 0.26;

  for (var c = 0; c < cartas.length; c++) {
    var col = c % cols, lin = Math.floor(c / cols);
    cartas[c].x = startX + col * (cw + gapX);
    cartas[c].y = startY + lin * (ch * 0.86 + gapY);
    cartas[c].w = cw;
    cartas[c].h = ch * 0.86;
    cartas[c].virada = false;
    cartas[c].achada = false;
  }

  PUZZLE = {
    tipo: 'memorama',
    cartas: cartas,
    primeira: null,
    segunda: null,
    esperaTimer: 0
  };
}

// ── Atualização ──────────────────────────────────────────────
function updatePuzzle() {
  if (!PUZZLE) return;

  if (PUZZLE.tipo === 'memorama' && PUZZLE.esperaTimer > 0) {
    PUZZLE.esperaTimer--;
    if (PUZZLE.esperaTimer === 0) {
      // par errado: desvira as duas
      if (PUZZLE.primeira && PUZZLE.segunda &&
          PUZZLE.primeira.animal !== PUZZLE.segunda.animal) {
        PUZZLE.primeira.virada = false;
        PUZZLE.segunda.virada = false;
      }
      PUZZLE.primeira = null;
      PUZZLE.segunda = null;
    }
  }

  if (PUZZLE.completo) {
    PUZZLE.fimTimer++;
    if (PUZZLE.fimTimer > 110) {
      var proxima = GAME.zone + 1;
      PUZZLE = null;
      if (proxima > GAME.maxZone) {
        GAME.state = 'win';
      } else {
        startZone(proxima);
      }
    }
    return;
  }

  verificarConclusao();
}

function verificarConclusao() {
  if (!PUZZLE || PUZZLE.completo) return;
  var pronto = false;

  if (PUZZLE.tipo === 'encaixe') {
    pronto = true;
    for (var i = 0; i < PUZZLE.pecas.length; i++) {
      if (!PUZZLE.pecas[i].colocada) { pronto = false; break; }
    }
  } else {
    pronto = true;
    for (var c = 0; c < PUZZLE.cartas.length; c++) {
      if (!PUZZLE.cartas[c].achada) { pronto = false; break; }
    }
  }

  if (pronto) {
    PUZZLE.completo = true;
    PUZZLE.fimTimer = 0;
    if (typeof addScore === 'function') addScore(PUZZLE_PONTOS);
  }
}

// ── Toque / arrasto ──────────────────────────────────────────
function puzzleCoord(e) {
  var r = CANVAS.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (CANVAS.width / r.width),
    y: (e.clientY - r.top) * (CANVAS.height / r.height)
  };
}

function puzzlePointerDown(px, py) {
  if (!PUZZLE || PUZZLE.completo) return;

  if (PUZZLE.tipo === 'encaixe') {
    // de trás pra frente: pega a peça desenhada por cima
    for (var i = PUZZLE.pecas.length - 1; i >= 0; i--) {
      var p = PUZZLE.pecas[i];
      if (p.colocada) continue;
      if (px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h) {
        PUZZLE.arrastando = p;
        PUZZLE.offX = px - p.x;
        PUZZLE.offY = py - p.y;
        // move pro fim da lista pra desenhar por cima
        PUZZLE.pecas.splice(i, 1);
        PUZZLE.pecas.push(p);
        return;
      }
    }
  } else {
    if (PUZZLE.esperaTimer > 0) return;   // esperando o par errado desvirar
    for (var c = 0; c < PUZZLE.cartas.length; c++) {
      var ct = PUZZLE.cartas[c];
      if (ct.achada || ct.virada) continue;
      if (px >= ct.x && px <= ct.x + ct.w && py >= ct.y && py <= ct.y + ct.h) {
        ct.virada = true;
        if (!PUZZLE.primeira) {
          PUZZLE.primeira = ct;
        } else {
          PUZZLE.segunda = ct;
          if (PUZZLE.primeira.animal === ct.animal) {
            PUZZLE.primeira.achada = true;
            ct.achada = true;
            PUZZLE.primeira = null;
            PUZZLE.segunda = null;
            if (typeof addScore === 'function') addScore(50);
          } else {
            PUZZLE.esperaTimer = 55;   // ~0,9s pra criança memorizar
          }
        }
        return;
      }
    }
  }
}

function puzzlePointerMove(px, py) {
  if (!PUZZLE || PUZZLE.tipo !== 'encaixe' || !PUZZLE.arrastando) return;
  PUZZLE.arrastando.x = px - PUZZLE.offX;
  PUZZLE.arrastando.y = py - PUZZLE.offY;
}

function puzzlePointerUp() {
  if (!PUZZLE || PUZZLE.tipo !== 'encaixe' || !PUZZLE.arrastando) return;
  var p = PUZZLE.arrastando;
  PUZZLE.arrastando = null;

  // Encaixe generoso: basta chegar perto do lugar certo.
  var tol = Math.max(p.w, p.h) * 0.55;
  if (Math.abs(p.x - p.alvoX) < tol && Math.abs(p.y - p.alvoY) < tol) {
    p.x = p.alvoX;
    p.y = p.alvoY;
    p.colocada = true;
    if (typeof addScore === 'function') addScore(50);
  } else {
    p.x = p.origemX;   // volta pra bandeja
    p.y = p.origemY;
  }
  verificarConclusao();
}

// ── Desenho ──────────────────────────────────────────────────
function drawPuzzle(ctx) {
  if (!PUZZLE) return;
  var W = CANVAS.width, H = CANVAS.height;

  // fundo
  var img = IMAGES['screen_character_select'];
  if (img && img.complete) {
    ctx.drawImage(img, 0, 0, W, H);
    ctx.fillStyle = 'rgba(6, 30, 14, 0.72)';
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = '#123a1d';
    ctx.fillRect(0, 0, W, H);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold ' + Math.round(H * 0.062) + 'px sans-serif';
  ctx.fillText(PUZZLE.zona.titulo, W / 2, H * 0.12);

  if (PUZZLE.tipo === 'encaixe') drawEncaixe(ctx);
  else                           drawMemorama(ctx);

  if (PUZZLE.completo) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, H * 0.38, W, H * 0.24);
    ctx.fillStyle = '#ffd75e';
    ctx.font = 'bold ' + Math.round(H * 0.085) + 'px sans-serif';
    ctx.fillText('¡Muy bien!', W / 2, H * 0.46);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold ' + Math.round(H * 0.05) + 'px sans-serif';
    ctx.fillText('+' + PUZZLE_PONTOS + ' puntos', W / 2, H * 0.55);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawEncaixe(ctx) {
  var W = CANVAS.width, H = CANVAS.height;
  var cfg = PUZZLE.zona;

  // imagem de referência ao lado, pra criança saber o que montar
  var ref = IMAGES['puzzle_' + cfg.animal + '_reference'];
  if (ref && ref.complete) {
    var rh = PUZZLE.boardH * 0.62;
    var rw = ref.width * (rh / ref.height);
    var rx = PUZZLE.boardX + PUZZLE.boardW + W * 0.045;
    var ry = PUZZLE.boardY;
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.drawImage(ref, rx, ry, rw, rh);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = Math.max(2, H * 0.004);
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.fillStyle = '#cfe8c0';
    ctx.font = Math.round(H * 0.030) + 'px sans-serif';
    ctx.fillText('modelo', rx + rw / 2, ry + rh + H * 0.035);
  }

  // grade alvo
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = Math.max(2, H * 0.005);
  for (var i = 0; i < PUZZLE.pecas.length; i++) {
    var p = PUZZLE.pecas[i];
    ctx.strokeRect(p.alvoX, p.alvoY, p.w, p.h);
  }

  // peças
  for (var k = 0; k < PUZZLE.pecas.length; k++) {
    var pc = PUZZLE.pecas[k];
    var im = IMAGES[chavePeca(cfg, pc.id)];
    if (im && im.complete) {
      ctx.drawImage(im, pc.x, pc.y, pc.w, pc.h);
    } else {
      ctx.fillStyle = 'rgba(200,180,120,0.85)';
      ctx.fillRect(pc.x, pc.y, pc.w, pc.h);
    }
    if (!pc.colocada) {
      ctx.strokeStyle = 'rgba(255, 215, 94, 0.9)';
      ctx.lineWidth = Math.max(2, H * 0.004);
      ctx.strokeRect(pc.x, pc.y, pc.w, pc.h);
    }
  }
}

function drawMemorama(ctx) {
  var H = CANVAS.height;

  for (var i = 0; i < PUZZLE.cartas.length; i++) {
    var c = PUZZLE.cartas[i];
    var mostra = c.virada || c.achada;

    if (mostra) {
      ctx.fillStyle = c.achada ? 'rgba(255, 236, 179, 0.96)' : '#ffffff';
      hudRoundRect(ctx, c.x, c.y, c.w, c.h, H * 0.018);
      ctx.fill();
      var im = IMAGES['memorama_' + c.animal];
      if (im && im.complete) {
        var pad = c.w * 0.08;
        ctx.drawImage(im, c.x + pad, c.y + pad, c.w - pad * 2, c.h - pad * 2);
      }
    } else {
      // verso da carta
      ctx.fillStyle = '#2f7d3e';
      hudRoundRect(ctx, c.x, c.y, c.w, c.h, H * 0.018);
      ctx.fill();
      ctx.fillStyle = '#7fd36b';
      ctx.beginPath();
      ctx.ellipse(c.x + c.w / 2, c.y + c.h / 2, c.w * 0.22, c.h * 0.14,
                  -Math.PI / 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = c.achada ? '#ffd75e' : 'rgba(255,255,255,0.55)';
    ctx.lineWidth = Math.max(2, H * 0.005);
    hudRoundRect(ctx, c.x, c.y, c.w, c.h, H * 0.018);
    ctx.stroke();
  }
}

// ── Eventos ──────────────────────────────────────────────────
CANVAS.addEventListener('pointerdown', function (e) {
  if (typeof GAME === 'undefined' || GAME.state !== 'puzzle') return;
  var c = puzzleCoord(e);
  puzzlePointerDown(c.x, c.y);
});

CANVAS.addEventListener('pointermove', function (e) {
  if (typeof GAME === 'undefined' || GAME.state !== 'puzzle') return;
  var c = puzzleCoord(e);
  puzzlePointerMove(c.x, c.y);
});

CANVAS.addEventListener('pointerup', function () {
  if (typeof GAME === 'undefined' || GAME.state !== 'puzzle') return;
  puzzlePointerUp();
});

CANVAS.addEventListener('pointercancel', function () {
  if (typeof GAME === 'undefined' || GAME.state !== 'puzzle') return;
  puzzlePointerUp();
});
