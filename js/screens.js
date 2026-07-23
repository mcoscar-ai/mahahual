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
  kiara:  { speed: 1.00, jump: 1.00, label: 'Kiara',  fruta: 'Papaya', traco: 'Equilibrada' },
  ainhoa: { speed: 0.90, jump: 1.15, label: 'Ainhoa', fruta: 'Pitaya', traco: 'Saltadora'  },
  thiago: { speed: 1.18, jump: 0.92, label: 'Thiago', fruta: 'Coco',   traco: 'Veloz'      }
};

// ═══════════════════════════════════════════════════════════════
// MODO DE TESTE — botões pra pular direto pra qualquer zona.
// Pra tirar quando o jogo estiver pronto: basta trocar para false
// (ou apagar os blocos marcados com "MODO_TESTE" neste arquivo).
// ═══════════════════════════════════════════════════════════════
var MODO_TESTE = true;

var CHAR_ORDER = ['kiara', 'ainhoa', 'thiago'];
var selectHover = 0; // índice destacado na seleção

// Aplica o perfil do personagem escolhido aos multiplicadores da física.
// player.js multiplica os valores base por estes ao recalcular a escala.
var CHAR_SPEED_MULT = 1;
var CHAR_JUMP_MULT = 1;

function applyCharacterProfile(nome) {
  SELECTED_CHAR = nome;
  var pf = CHARACTER_PROFILES[nome] || CHARACTER_PROFILES.kiara;
  CHAR_SPEED_MULT = pf.speed;
  CHAR_JUMP_MULT = pf.jump;
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
  if (img && img.complete) {
    CTX.drawImage(img, 0, 0, CANVAS.width, CANVAS.height);
  } else {
    CTX.fillStyle = '#2a7d3a';
    CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
  }

  // botão JUGAR — na faixa central, não em cima das três crianças
  // (elas ocupam a parte de baixo da arte, a partir de ~58% da altura)
  var bw = CANVAS.width * 0.28;
  var bh = CANVAS.height * 0.12;
  var bx = (CANVAS.width - bw) / 2;
  var by = CANVAS.height * 0.42;

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
  CTX.font = 'bold ' + Math.round(CANVAS.height * 0.07) + 'px sans-serif';
  CTX.fillText('JUGAR', CANVAS.width / 2, py + ph / 2);
  CTX.textAlign = 'left';
  CTX.textBaseline = 'alphabetic';

  addButton(bx, by, bw, bh, function () { GAME.state = 'select'; });

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
  if (bg && bg.complete) {
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
    if (sprite && sprite.complete) {
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

  // ── MODO_TESTE: atalho pra qualquer zona ────────────────────
  if (MODO_TESTE) {
    var tbW = CANVAS.width * 0.15;
    var tbH = CANVAS.height * 0.078;
    var tbGap = CANVAS.width * 0.02;
    var tbTotal = 3 * tbW + 2 * tbGap;
    var tbX0 = (CANVAS.width - tbTotal) / 2;
    var tbY = CANVAS.height * 0.845;

    for (var z = 1; z <= 3; z++) {
      var tbX = tbX0 + (z - 1) * (tbW + tbGap);
      CTX.fillStyle = 'rgba(60, 60, 60, 0.85)';
      hudRoundRect(CTX, tbX, tbY, tbW, tbH, tbH / 2);
      CTX.fill();
      CTX.strokeStyle = '#9ad1ff';
      CTX.lineWidth = Math.max(2, CANVAS.height * 0.004);
      hudRoundRect(CTX, tbX, tbY, tbW, tbH, tbH / 2);
      CTX.stroke();

      CTX.fillStyle = '#9ad1ff';
      CTX.font = 'bold ' + Math.round(CANVAS.height * 0.040) + 'px sans-serif';
      CTX.fillText('Zona ' + z, tbX + tbW / 2, tbY + tbH * 0.62);

      (function (zona) {
        addButton(tbX, tbY, tbW, tbH, function () {
          applyCharacterProfile(CHAR_ORDER[selectHover]);
          startZone(zona);
        });
      })(z);
    }
  }

  CTX.textAlign = 'left';
}

// ── Telas de transição (assumem as do game.js) ───────────────
function drawZoneCompleteScreen() {
  screenButtons = [];
  var img = IMAGES['screen_zone_complete'];
  if (img && img.complete) {
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
  if (img && img.complete) {
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

// ── Roteador de telas (chamado pelo game.js) ─────────────────
function drawScreen() {
  switch (GAME.state) {
    case 'title':         drawTitleScreen();        return true;
    case 'select':        drawSelectScreen();       return true;
    case 'zone_complete': drawZoneCompleteScreen(); return true;
    case 'win':           drawWinScreen();          return true;
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
