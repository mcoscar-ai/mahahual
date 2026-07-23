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
  // 'cantos': peças com aba macho/fêmea, de tamanhos diferentes, cada
  // uma encostada no seu canto do quadro montado (capivara).
  // 'grade': peças iguais em grade reta (tucano, jaguar).
  1: { tipo: 'encaixe', forma: 'cantos', animal: 'capivara',
       pecas: ['TL', 'TR', 'BL', 'BR'],
       titulo: '¡Arma el capibara!' },
  2: { tipo: 'memorama', pares: 6,
       titulo: '¡Encuentra las parejas!' },
  3: { tipo: 'encaixe', forma: 'grade', animal: 'tucano',
       pecas: ['01','02','03','04','05','06','07','08'], cols: 4, linhas: 2,
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

// Monta o layout em coordenadas do quadro ORIGINAL (pixels da arte).
// Lê o tamanho real de cada PNG, então continua certo se a arte mudar.
function layoutNatural(cfg) {
  var itens = [], i;

  if (cfg.forma === 'cantos') {
    // Peças com aba: cada uma tem tamanho próprio e fica encostada no
    // seu canto. A célula "limpa" é a menor dimensão entre as peças —
    // o que passa disso é a aba invadindo a vizinha.
    var menor = Infinity;
    for (i = 0; i < cfg.pecas.length; i++) {
      var im0 = IMAGES[chavePeca(cfg, cfg.pecas[i])];
      if (!im0 || !im0.width) continue;
      menor = Math.min(menor, im0.width, im0.height);
    }
    if (!isFinite(menor)) menor = 512;
    var total = menor * 2;

    for (i = 0; i < cfg.pecas.length; i++) {
      var id = cfg.pecas[i];
      var im = IMAGES[chavePeca(cfg, id)];
      var w = (im && im.width) ? im.width : menor;
      var h = (im && im.height) ? im.height : menor;
      var direita = (id.charAt(1) === 'R');
      var embaixo = (id.charAt(0) === 'B');
      itens.push({
        id: id,
        nx: direita ? (total - w) : 0,
        ny: embaixo ? (total - h) : 0,
        nw: w, nh: h,
        // célula limpa, usada pra encaixe e pra ordenar a bandeja
        cx: direita ? menor : 0,
        cy: embaixo ? menor : 0,
        cw: menor, ch: menor
      });
    }
    return { itens: itens, totalW: total, totalH: total };
  }

  // Grade reta: todas as peças do mesmo tamanho
  var pw = 256, ph = 512;
  var im1 = IMAGES[chavePeca(cfg, cfg.pecas[0])];
  if (im1 && im1.width) { pw = im1.width; ph = im1.height; }

  for (i = 0; i < cfg.pecas.length; i++) {
    var col = i % cfg.cols;
    var lin = Math.floor(i / cfg.cols);
    itens.push({
      id: cfg.pecas[i],
      nx: col * pw, ny: lin * ph, nw: pw, nh: ph,
      cx: col * pw, cy: lin * ph, cw: pw, ch: ph
    });
  }
  return { itens: itens, totalW: cfg.cols * pw, totalH: cfg.linhas * ph };
}

function iniciarEncaixe(cfg) {
  var W = CANVAS.width, H = CANVAS.height;
  var nat = layoutNatural(cfg);

  // Tabuleiro: cabe na altura disponível e sobra espaço pro modelo
  var boardH = H * 0.44;
  var boardW = boardH * (nat.totalW / nat.totalH);
  var maxW = W * 0.42;
  if (boardW > maxW) { boardW = maxW; boardH = boardW * (nat.totalH / nat.totalW); }

  var boardX = (W - boardW) / 2 - W * 0.14;
  var boardY = H * 0.23;
  var escala = boardW / nat.totalW;   // arte original -> tela

  var pecas = [];
  for (var i = 0; i < nat.itens.length; i++) {
    var it = nat.itens[i];
    pecas.push({
      id: it.id,
      // posição/tamanho de DESENHO quando encaixada
      alvoX: boardX + it.nx * escala,
      alvoY: boardY + it.ny * escala,
      w: it.nw * escala,
      h: it.nh * escala,
      // célula limpa (sem aba), usada pra medir o encaixe
      celX: boardX + it.cx * escala,
      celY: boardY + it.cy * escala,
      celW: it.cw * escala,
      celH: it.ch * escala,
      x: 0, y: 0,
      colocada: false,
      naBandeja: true
    });
  }

  // Bandeja embaixo: peças reduzidas pra caber lado a lado
  var ordem = pecas.slice();
  for (var k = ordem.length - 1; k > 0; k--) {
    var j = Math.floor(Math.random() * (k + 1));
    var t = ordem[k]; ordem[k] = ordem[j]; ordem[j] = t;
  }

  var gap = W * 0.012;
  var somaL = 0;
  for (var a = 0; a < ordem.length; a++) somaL += ordem[a].w;
  var dispon = W * 0.88 - gap * (ordem.length - 1);
  var escBandeja = Math.min(0.62, dispon / somaL);

  var larguraTotal = somaL * escBandeja + gap * (ordem.length - 1);
  var bx = (W - larguraTotal) / 2;
  var baseY = H * 0.80;
  for (var m = 0; m < ordem.length; m++) {
    ordem[m].escBandeja = escBandeja;
    ordem[m].origemX = bx;
    ordem[m].origemY = baseY - (ordem[m].h * escBandeja) / 2;
    ordem[m].x = ordem[m].origemX;
    ordem[m].y = ordem[m].origemY;
    bx += ordem[m].w * escBandeja + gap;
  }

  PUZZLE = {
    tipo: 'encaixe',
    pecas: pecas,
    boardX: boardX, boardY: boardY, boardW: boardW, boardH: boardH,
    escala: escala,
    arrastando: null,
    offX: 0, offY: 0
  };
}

// Tamanho atual de desenho da peça (menor na bandeja)
function pecaW(p) { return p.naBandeja ? p.w * p.escBandeja : p.w; }
function pecaH(p) { return p.naBandeja ? p.h * p.escBandeja : p.h; }

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
      if (px >= p.x && px <= p.x + pecaW(p) && py >= p.y && py <= p.y + pecaH(p)) {
        PUZZLE.arrastando = p;
        // ao pegar, a peça volta ao tamanho do tabuleiro e centraliza
        // no dedo — assim a criança vê o tamanho real que vai encaixar
        p.naBandeja = false;
        PUZZLE.offX = p.w / 2;
        PUZZLE.offY = p.h / 2;
        p.x = px - PUZZLE.offX;
        p.y = py - PUZZLE.offY;
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

  // Encaixe medido pela CÉLULA LIMPA (sem a aba), senão peças com aba
  // grande precisariam ser soltas fora do lugar pra encaixar.
  var offCel = { x: p.celX - p.alvoX, y: p.celY - p.alvoY };
  var celAtualX = p.x + offCel.x;
  var celAtualY = p.y + offCel.y;
  var tol = Math.min(p.celW, p.celH) * 0.62;   // generoso: mão de criança

  if (Math.abs(celAtualX - p.celX) < tol && Math.abs(celAtualY - p.celY) < tol) {
    p.x = p.alvoX;
    p.y = p.alvoY;
    p.colocada = true;
    p.naBandeja = false;
    if (typeof addScore === 'function') addScore(50);
  } else {
    p.naBandeja = true;
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

  // Quadro do tabuleiro + divisórias das células limpas
  ctx.strokeStyle = 'rgba(255,255,255,0.30)';
  ctx.lineWidth = Math.max(2, H * 0.004);
  for (var i = 0; i < PUZZLE.pecas.length; i++) {
    var p = PUZZLE.pecas[i];
    if (!p.colocada) ctx.strokeRect(p.celX, p.celY, p.celW, p.celH);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = Math.max(3, H * 0.006);
  ctx.strokeRect(PUZZLE.boardX, PUZZLE.boardY, PUZZLE.boardW, PUZZLE.boardH);

  // Peças: primeiro as encaixadas, depois as soltas (por cima)
  for (var passo = 0; passo < 2; passo++) {
    for (var k = 0; k < PUZZLE.pecas.length; k++) {
      var pc = PUZZLE.pecas[k];
      if ((passo === 0) !== !!pc.colocada) continue;
      var dw = pecaW(pc), dh = pecaH(pc);
      var im = IMAGES[chavePeca(cfg, pc.id)];
      if (im && im.complete) {
        ctx.drawImage(im, pc.x, pc.y, dw, dh);
      } else {
        ctx.fillStyle = 'rgba(200,180,120,0.85)';
        ctx.fillRect(pc.x, pc.y, dw, dh);
      }
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
