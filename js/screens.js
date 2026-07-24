// ═══════════════════════════════════════════════════════════════
// SCREENS.JS — Guardiões de Mahahual
// Tela de título, seleção de personagem e telas de transição.
//
// Carregado DEPOIS de game.js. Assume os estados 'title' e 'select'
// (novos) e reaproveita 'zone_complete' e 'win' (antes desenhados
// provisoriamente pelo game.js).
//
// Cada personagem tem uma fruta (já em CHARACTER_FRUIT) e um perfil
// de física próprio, aplicado ao escolher. O Thiago gira no pulo duplo
// (tratado no player.js).
// ═══════════════════════════════════════════════════════════════

// Perfis: multiplicadores sobre os valores base da física.
// Diferenças pequenas, pra não confundir criança de 5-9 anos.
var CHARACTER_PROFILES = {
  kiara:  { speed: 1.00, jump: 1.00, recarga: 1.50, label: 'Kiara',  fruta: 'Papaya', traco: 'Tiro doble' },
  ainhoa: { speed: 0.90, jump: 1.15, recarga: 1.00, label: 'Ainhoa', fruta: 'Pitaya', traco: 'Saltadora'  },
  thiago: { speed: 1.18, jump: 0.92, recarga: 1.00, label: 'Thiago', fruta: 'Coco',   traco: 'Veloz'      }
};

// ═══════════════════════════════════════════════════════════════
// MODO DE TESTE — botões pra pular direto pra qualquer zona.
// Pra tirar quando o jogo estiver pronto: basta trocar para false
// (ou apagar os blocos marcados com "MODO_TESTE" neste arquivo).
// ═══════════════════════════════════════════════════════════════
var MODO_TESTE = false;

// ── Progresso dos modos avulsos ──────────────────────────────
// Guarda quais níveis já foram concluídos, pra criança ver o que
// já fez. Em try/catch: se o navegador bloquear, o jogo segue igual.
var CONCLUIDOS = { menu_memoria: {}, menu_puzzle: {} };

function carregarProgresso() {
  try {
    var bruto = window.localStorage.getItem('mahahual_progresso');
    if (bruto) CONCLUIDOS = JSON.parse(bruto);
    if (!CONCLUIDOS.menu_memoria) CONCLUIDOS.menu_memoria = {};
    if (!CONCLUIDOS.menu_puzzle) CONCLUIDOS.menu_puzzle = {};
  } catch (e) {}
}

function marcarConcluido(modo, indice) {
  if (indice === undefined || !CONCLUIDOS[modo]) return;
  CONCLUIDOS[modo][indice] = true;
  try {
    window.localStorage.setItem('mahahual_progresso', JSON.stringify(CONCLUIDOS));
  } catch (e) {}
}

carregarProgresso();

var CHAR_ORDER = ['kiara', 'ainhoa', 'thiago'];
var selectHover = 0; // índice destacado na seleção

// Aplica o perfil do personagem escolhido aos multiplicadores da física.
// player.js multiplica os valores base por estes ao recalcular a escala.
var CHAR_SPEED_MULT = 1;
var CHAR_JUMP_MULT = 1;
var CHAR_THROW_MULT = 1;   // recarga do arremesso

function applyCharacterProfile(nome) {
  SELECTED_CHAR = nome;
  var pf = CHARACTER_PROFILES[nome] || CHARACTER_PROFILES.kiara;
  CHAR_SPEED_MULT = pf.speed;
  CHAR_JUMP_MULT = pf.jump;
  CHAR_THROW_MULT = pf.recarga || 1;
}

// ── Botões invisíveis clicáveis (title/select) ───────────────
// Guardamos as áreas desenhadas a cada frame pra testar o toque.
var screenButtons = [];

function addButton(x, y, w, h, action) {
  screenButtons.push({ x: x, y: y, w: w, h: h, action: action });
}

function handleScreenTap(clientX, clientY) {
  var rect = CANVAS.getBoundingClientRect();
  var sx = (clientX - rect.left) * (CANVAS.width / rect.width);
  var sy = (clientY - rect.top) * (CANVAS.height / rect.height);
  for (var i = 0; i < screenButtons.length; i++) {
    var b = screenButtons[i];
    if (sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h) {
      b.action();
      return true;
    }
  }
  return false;
}

// ── Tela de título ───────────────────────────────────────────
function drawTitleScreen() {
  screenButtons = [];
  var img = IMAGES['screen_title'];
  if (imgPronta(img)) {
    CTX.drawImage(img, 0, 0, CANVAS.width, CANVAS.height);
  } else {
    CTX.fillStyle = '#2a7d3a';
    CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
  }

  // Três modos. Tudo acima de 55% da altura, pra não tapar as crianças.
  var bw = CANVAS.width * 0.26;
  var bh = CANVAS.height * 0.115;
  var bx = (CANVAS.width - bw) / 2;
  var by = CANVAS.height * 0.30;

  var pulse = 1 + Math.sin(Date.now() / 380) * 0.04;
  var pw = bw * pulse, ph = bh * pulse;
  var px = (CANVAS.width - pw) / 2, py = by - (ph - bh) / 2;

  CTX.fillStyle = 'rgba(232, 98, 43, 0.95)';
  hudRoundRect(CTX, px, py, pw, ph, ph / 2);
  CTX.fill();
  CTX.strokeStyle = '#fff';
  CTX.lineWidth = Math.max(2, CANVAS.height * 0.006);
  hudRoundRect(CTX, px, py, pw, ph, ph / 2);
  CTX.stroke();

  CTX.fillStyle = '#fff';
  CTX.textAlign = 'center';
  CTX.textBaseline = 'middle';
  CTX.font = 'bold ' + Math.round(CANVAS.height * 0.065) + 'px sans-serif';
  CTX.fillText('JUGAR', CANVAS.width / 2, py + ph / 2);

  addButton(bx, by, bw, bh, function () { GAME.state = 'select'; });

  // Modos avulsos, lado a lado
  var mw = CANVAS.width * 0.185;
  var mh = CANVAS.height * 0.095;
  var mgap = CANVAS.width * 0.022;
  var mtot = mw * 2 + mgap;
  var mx0 = (CANVAS.width - mtot) / 2;
  var my = CANVAS.height * 0.445;

  var modos = [
    { rot: 'MEMORIA', cor: 'rgba(63, 143, 58, 0.95)', destino: 'menu_memoria' },
    { rot: 'PUZZLES', cor: 'rgba(46, 116, 168, 0.95)', destino: 'menu_puzzle' }
  ];

  for (var i = 0; i < modos.length; i++) {
    var m = modos[i];
    var mx = mx0 + i * (mw + mgap);
    CTX.fillStyle = m.cor;
    hudRoundRect(CTX, mx, my, mw, mh, mh / 2);
    CTX.fill();
    CTX.strokeStyle = '#fff';
    CTX.lineWidth = Math.max(2, CANVAS.height * 0.005);
    hudRoundRect(CTX, mx, my, mw, mh, mh / 2);
    CTX.stroke();
    CTX.fillStyle = '#fff';
    CTX.font = 'bold ' + Math.round(CANVAS.height * 0.042) + 'px sans-serif';
    CTX.fillText(m.rot, mx + mw / 2, my + mh / 2);

    (function (dest) {
      addButton(mx, my, mw, mh, function () { GAME.state = dest; });
    })(m.destino);
  }

  CTX.textAlign = 'left';
  CTX.textBaseline = 'alphabetic';

  // Dica de som: navegadores só liberam áudio depois do primeiro toque,
  // então na primeira vez o título abre em silêncio. Este aviso convida
  // o toque que destrava a música, e some assim que ela começa.
  if (typeof AUDIO_DESTRAVADO !== 'undefined' && !AUDIO_DESTRAVADO) {
    var pisca = 0.55 + Math.sin(Date.now() / 500) * 0.35;
    CTX.save();
    CTX.globalAlpha = pisca;
    CTX.textAlign = 'center';
    CTX.font = Math.round(CANVAS.height * 0.036) + 'px sans-serif';
    CTX.lineWidth = Math.max(2, CANVAS.height * 0.006);
    CTX.strokeStyle = 'rgba(12, 45, 22, 0.85)';
    CTX.strokeText('♪ Toca la pantalla para activar el sonido',
      CANVAS.width / 2, CANVAS.height * 0.955);
    CTX.fillStyle = '#ffffff';
    CTX.fillText('♪ Toca la pantalla para activar el sonido',
      CANVAS.width / 2, CANVAS.height * 0.955);
    CTX.restore();
    CTX.textAlign = 'left';
  }
}

// ── Tela de seleção de personagem ────────────────────────────
function drawSelectScreen() {
  screenButtons = [];

  var bg = IMAGES['screen_character_select'];
  if (imgPronta(bg)) {
    CTX.drawImage(bg, 0, 0, CANVAS.width, CANVAS.height);
    CTX.fillStyle = 'rgba(0,0,0,0.28)';
    CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
  } else {
    CTX.fillStyle = '#1f5e2c';
    CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
  }

  CTX.textAlign = 'center';
  CTX.fillStyle = '#fff';
  CTX.font = 'bold ' + Math.round(CANVAS.height * 0.062) + 'px sans-serif';
  CTX.fillText('Elige tu guardián', CANVAS.width / 2, CANVAS.height * 0.085);

  // ── Linha de dificuldade ────────────────────────────────────
  var difOrder = ['facil', 'medio', 'dificil'];
  var dW = CANVAS.width * 0.15;
  var dH = CANVAS.height * 0.078;
  var dGap = CANVAS.width * 0.018;
  var dTotal = difOrder.length * dW + (difOrder.length - 1) * dGap;
  var dX0 = (CANVAS.width - dTotal) / 2;
  var dY = CANVAS.height * 0.145;

  for (var d = 0; d < difOrder.length; d++) {
    var chave = difOrder[d];
    var dX = dX0 + d * (dW + dGap);
    var ativo = (DIFICULDADE === chave);

    CTX.fillStyle = ativo ? 'rgba(255, 215, 94, 0.95)' : 'rgba(12, 45, 22, 0.72)';
    hudRoundRect(CTX, dX, dY, dW, dH, dH / 2);
    CTX.fill();
    if (ativo) {
      CTX.strokeStyle = '#fff';
      CTX.lineWidth = Math.max(2, CANVAS.height * 0.005);
      hudRoundRect(CTX, dX, dY, dW, dH, dH / 2);
      CTX.stroke();
    }

    CTX.fillStyle = ativo ? '#2a1a08' : '#ffffff';
    CTX.font = 'bold ' + Math.round(CANVAS.height * 0.038) + 'px sans-serif';
    CTX.textBaseline = 'middle';
    CTX.fillText(DIFICULDADES[chave].rotulo, dX + dW / 2, dY + dH / 2);
    CTX.textBaseline = 'alphabetic';

    (function (k) {
      addButton(dX, dY, dW, dH, function () { DIFICULDADE = k; });
    })(chave);
  }

  var n = CHAR_ORDER.length;
  var cardW = CANVAS.width * 0.24;
  var cardH = CANVAS.height * 0.49;
  var gap = CANVAS.width * 0.04;
  var totalW = n * cardW + (n - 1) * gap;
  var startX = (CANVAS.width - totalW) / 2;
  var cardY = CANVAS.height * 0.255;

  for (var i = 0; i < n; i++) {
    var nome = CHAR_ORDER[i];
    var pf = CHARACTER_PROFILES[nome];
    var cx = startX + i * (cardW + gap);
    var destaque = (i === selectHover);

    // cartão
    CTX.fillStyle = destaque ? 'rgba(255, 236, 179, 0.96)' : 'rgba(12, 45, 22, 0.72)';
    hudRoundRect(CTX, cx, cardY, cardW, cardH, CANVAS.height * 0.03);
    CTX.fill();
    if (destaque) {
      CTX.strokeStyle = '#ffd75e';
      CTX.lineWidth = Math.max(3, CANVAS.height * 0.008);
      hudRoundRect(CTX, cx, cardY, cardW, cardH, CANVAS.height * 0.03);
      CTX.stroke();
    }

    // sprite idle do personagem
    var sprite = IMAGES[nome + '_idle_01'];
    if (imgPronta(sprite)) {
      var sh = cardH * 0.52;
      var sscale = sh / sprite.height;
      var sw = sprite.width * sscale;
      CTX.drawImage(sprite, cx + (cardW - sw) / 2, cardY + cardH * 0.08, sw, sh);
    }

    // nome + traço + fruta
    CTX.fillStyle = destaque ? '#2a1a08' : '#fff';
    CTX.font = 'bold ' + Math.round(CANVAS.height * 0.045) + 'px sans-serif';
    CTX.fillText(pf.label, cx + cardW / 2, cardY + cardH * 0.70);

    CTX.font = Math.round(CANVAS.height * 0.032) + 'px sans-serif';
    CTX.fillStyle = destaque ? '#5c3b1a' : '#ffd75e';
    CTX.fillText(pf.traco, cx + cardW / 2, cardY + cardH * 0.80);
    CTX.fillStyle = destaque ? '#2a1a08' : '#cfe8c0';
    CTX.fillText('Fruta: ' + pf.fruta, cx + cardW / 2, cardY + cardH * 0.90);

    (function (idx, nomeSel) {
      addButton(cx, cardY, cardW, cardH, function () {
        if (selectHover === idx) {
          applyCharacterProfile(nomeSel);
          startZone(1); // começa o jogo com o personagem escolhido
        } else {
          selectHover = idx; // primeiro toque destaca, segundo confirma
        }
      });
    })(i, nome);
  }

  CTX.font = Math.round(CANVAS.height * 0.030) + 'px sans-serif';
  CTX.fillStyle = '#fff';
  CTX.fillText('Toca una vez para ver, otra para empezar',
    CANVAS.width / 2, CANVAS.height * (MODO_TESTE ? 0.80 : 0.85));

  // ── MODO_TESTE: atalhos ─────────────────────────────────────
  // Linha com 6 botões: Z1-Z3 vão pro começo da zona; P1-P3 vão
  // direto pro minijogo daquela zona (senão só dá pra ver o puzzle
  // completando a zona inteira, boss incluído).
  if (MODO_TESTE) {
    var atalhos = [
      { rot: 'Z1', cor: '#9ad1ff', acao: function () { startZone(1); } },
      { rot: 'Z2', cor: '#9ad1ff', acao: function () { startZone(2); } },
      { rot: 'Z3', cor: '#9ad1ff', acao: function () { startZone(3); } },
      { rot: 'P1', cor: '#ffc7f0', acao: function () { abrirPuzzleTeste(1); } },
      { rot: 'P2', cor: '#ffc7f0', acao: function () { abrirPuzzleTeste(2); } },
      { rot: 'P3', cor: '#ffc7f0', acao: function () { abrirPuzzleTeste(3); } }
    ];

    var tbW = CANVAS.width * 0.115;
    var tbH = CANVAS.height * 0.078;
    var tbGap = CANVAS.width * 0.014;
    var tbTotal = atalhos.length * tbW + (atalhos.length - 1) * tbGap;
    var tbX0 = (CANVAS.width - tbTotal) / 2;
    var tbY = CANVAS.height * 0.845;

    for (var z = 0; z < atalhos.length; z++) {
      var at = atalhos[z];
      var tbX = tbX0 + z * (tbW + tbGap);

      CTX.fillStyle = 'rgba(60, 60, 60, 0.85)';
      hudRoundRect(CTX, tbX, tbY, tbW, tbH, tbH / 2);
      CTX.fill();
      CTX.strokeStyle = at.cor;
      CTX.lineWidth = Math.max(2, CANVAS.height * 0.004);
      hudRoundRect(CTX, tbX, tbY, tbW, tbH, tbH / 2);
      CTX.stroke();

      CTX.fillStyle = at.cor;
      CTX.font = 'bold ' + Math.round(CANVAS.height * 0.038) + 'px sans-serif';
      CTX.fillText(at.rot, tbX + tbW / 2, tbY + tbH * 0.62);

      (function (acao) {
        addButton(tbX, tbY, tbW, tbH, function () {
          applyCharacterProfile(CHAR_ORDER[selectHover]);
          acao();
        });
      })(at.acao);
    }
  }

  CTX.textAlign = 'left';
}

// ── Telas de transição (assumem as do game.js) ───────────────
function drawZoneCompleteScreen() {
  screenButtons = [];
  var img = IMAGES['screen_zone_complete'];
  if (imgPronta(img)) {
    CTX.drawImage(img, 0, 0, CANVAS.width, CANVAS.height);
  } else {
    CTX.fillStyle = 'rgba(8, 40, 18, 0.9)';
    CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
  }
  drawTransitionText('¡Zona ' + GAME.zone + ' completa!', 'Toca para continuar');
  addButton(0, 0, CANVAS.width, CANVAS.height, function () { advanceFromScreen(); });
}

function drawWinScreen() {
  screenButtons = [];
  var img = IMAGES['screen_win'];
  if (imgPronta(img)) {
    CTX.drawImage(img, 0, 0, CANVAS.width, CANVAS.height);
  } else {
    CTX.fillStyle = 'rgba(8, 40, 18, 0.9)';
    CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
  }
  drawTransitionText('¡Mahahual está a salvo!', 'Toca para jugar de nuevo');
  addButton(0, 0, CANVAS.width, CANVAS.height, function () { GAME.state = 'title'; });
}

function drawTransitionText(titulo, rodape) {
  CTX.fillStyle = 'rgba(0,0,0,0.45)';
  CTX.fillRect(0, CANVAS.height * 0.36, CANVAS.width, CANVAS.height * 0.30);
  CTX.textAlign = 'center';
  CTX.fillStyle = '#fff';
  CTX.font = 'bold ' + Math.round(CANVAS.height * 0.085) + 'px sans-serif';
  CTX.fillText(titulo, CANVAS.width / 2, CANVAS.height * 0.47);
  CTX.font = 'bold ' + Math.round(CANVAS.height * 0.05) + 'px sans-serif';
  CTX.fillText('Puntos: ' + GAME.score, CANVAS.width / 2, CANVAS.height * 0.55);
  CTX.font = Math.round(CANVAS.height * 0.038) + 'px sans-serif';
  CTX.fillText(rodape, CANVAS.width / 2, CANVAS.height * 0.61);
  CTX.textAlign = 'left';
}

// ── Telas de nível dos modos avulsos ────────────────────────
// Grade de botões; os já concluídos ganham um visto.
function drawMenuNiveis(modo) {
  screenButtons = [];

  var bg = IMAGES['screen_character_select'];
  if (imgPronta(bg)) {
    CTX.drawImage(bg, 0, 0, CANVAS.width, CANVAS.height);
    CTX.fillStyle = 'rgba(6, 30, 14, 0.68)';
    CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
  } else {
    CTX.fillStyle = '#123a1d';
    CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
  }

  var memoria = (modo === 'menu_memoria');
  var niveis = memoria ? NIVEIS_MEMORIA : NIVEIS_PUZZLE;
  var titulo = memoria ? 'Juego de Memoria' : 'Rompecabezas';
  var cor = memoria ? 'rgba(63, 143, 58, 0.95)' : 'rgba(46, 116, 168, 0.95)';

  CTX.textAlign = 'center';
  CTX.textBaseline = 'middle';
  CTX.fillStyle = '#ffffff';
  CTX.font = 'bold ' + Math.round(CANVAS.height * 0.075) + 'px sans-serif';
  CTX.fillText(titulo, CANVAS.width / 2, CANVAS.height * 0.14);

  var n = niveis.length;
  var cols = Math.min(n, 5);
  var linhas = Math.ceil(n / cols);
  var cw = CANVAS.width * 0.155;
  var chh = CANVAS.height * 0.22;
  var gapX = CANVAS.width * 0.022;
  var gapY = CANVAS.height * 0.05;
  var totW = cols * cw + (cols - 1) * gapX;
  var x0 = (CANVAS.width - totW) / 2;
  var y0 = CANVAS.height * 0.30;

  for (var i = 0; i < n; i++) {
    var col = i % cols, lin = Math.floor(i / cols);
    var cx = x0 + col * (cw + gapX);
    var cy = y0 + lin * (chh + gapY);
    var feito = !!(CONCLUIDOS[modo] && CONCLUIDOS[modo][i]);

    CTX.fillStyle = cor;
    hudRoundRect(CTX, cx, cy, cw, chh, CANVAS.height * 0.028);
    CTX.fill();
    CTX.strokeStyle = feito ? '#ffd75e' : 'rgba(255,255,255,0.75)';
    CTX.lineWidth = Math.max(2, CANVAS.height * (feito ? 0.008 : 0.005));
    hudRoundRect(CTX, cx, cy, cw, chh, CANVAS.height * 0.028);
    CTX.stroke();

    CTX.fillStyle = '#ffffff';
    CTX.font = 'bold ' + Math.round(CANVAS.height * 0.075) + 'px sans-serif';
    CTX.fillText(String(i + 1), cx + cw / 2, cy + chh * 0.36);

    CTX.font = 'bold ' + Math.round(CANVAS.height * 0.032) + 'px sans-serif';
    CTX.fillText(niveis[i].rotulo, cx + cw / 2, cy + chh * 0.64);

    if (!memoria) {
      CTX.font = Math.round(CANVAS.height * 0.026) + 'px sans-serif';
      CTX.fillStyle = '#cfe8c0';
      CTX.fillText(niveis[i].dificuldade, cx + cw / 2, cy + chh * 0.80);
    }

    if (feito) {
      CTX.strokeStyle = '#ffd75e';
      CTX.lineWidth = Math.max(3, CANVAS.height * 0.008);
      var vx = cx + cw * 0.5, vy = cy + chh * 0.90;
      CTX.beginPath();
      CTX.moveTo(vx - cw * 0.10, vy);
      CTX.lineTo(vx - cw * 0.02, vy + chh * 0.05);
      CTX.lineTo(vx + cw * 0.11, vy - chh * 0.06);
      CTX.stroke();
    }

    (function (idx) {
      addButton(cx, cy, cw, chh, function () {
        abrirMinijogoAvulso(niveis[idx], modo, idx);
      });
    })(i);
  }

  // voltar
  var pad = CANVAS.height * 0.025;
  var bs = CANVAS.height * 0.075;
  CTX.fillStyle = 'rgba(12, 45, 22, 0.72)';
  hudRoundRect(CTX, pad, pad, bs, bs, bs / 2);
  CTX.fill();
  CTX.strokeStyle = '#ffd75e';
  CTX.lineWidth = Math.max(3, CANVAS.height * 0.007);
  CTX.beginPath();
  CTX.moveTo(pad + bs * 0.62, pad + bs * 0.28);
  CTX.lineTo(pad + bs * 0.36, pad + bs * 0.5);
  CTX.lineTo(pad + bs * 0.62, pad + bs * 0.72);
  CTX.stroke();
  addButton(pad, pad, bs, bs, function () { GAME.state = 'title'; });

  CTX.textAlign = 'left';
  CTX.textBaseline = 'alphabetic';
}

// ── Roteador de telas (chamado pelo game.js) ─────────────────
function drawScreen() {
  switch (GAME.state) {
    case 'title':         drawTitleScreen();        return true;
    case 'select':        drawSelectScreen();       return true;
    case 'zone_complete': drawZoneCompleteScreen(); return true;
    case 'win':           drawWinScreen();          return true;
    case 'menu_memoria':  drawMenuNiveis('menu_memoria'); return true;
    case 'menu_puzzle':   drawMenuNiveis('menu_puzzle');  return true;
  }
  return false;
}

// ── Toque nas telas ──────────────────────────────────────────
CANVAS.addEventListener('pointerdown', function (e) {
  if (GAME.state === 'playing' || GAME.state === 'puzzle') return;
  handleScreenTap(e.clientX, e.clientY);
});


// ── MODO_TESTE: teclas 1, 2 e 3 pulam de zona a qualquer momento ──
// Apagar junto com o resto do modo de teste.
if (MODO_TESTE) {
  window.addEventListener('keydown', function (e) {
    if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') {
      var z = parseInt(e.code.replace('Digit', ''), 10);
      if (typeof startZone === 'function') startZone(z);
    }
  });
}


// ── MODO_TESTE: abre um minijogo direto, sem jogar a zona ────
// Apagar junto com o resto do modo de teste.
function abrirPuzzleTeste(zona) {
  if (typeof iniciarPuzzle !== 'function') return;
  GAME.zone = zona;
  if (iniciarPuzzle(zona)) GAME.state = 'puzzle';
}

if (MODO_TESTE) {
  window.addEventListener('keydown', function (e) {
    // teclas 7, 8 e 9 abrem os minijogos das zonas 1, 2 e 3
    if (e.code === 'Digit7') abrirPuzzleTeste(1);
    if (e.code === 'Digit8') abrirPuzzleTeste(2);
    if (e.code === 'Digit9') abrirPuzzleTeste(3);
  });
}
