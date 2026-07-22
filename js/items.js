// ═══════════════════════════════════════════════════════════════
// ITEMS.JS — Guardiões de Mahahual
// Lixo espalhado pelo cenário. Encostar recolhe e vale +50 pontos.
//
// Carregado DEPOIS de game.js (usa addScore, GROUND_Y, P).
// game.js já chama spawnZoneItems() ao abrir a zona e updateItems()
// a cada frame; renderer.js chama drawItems().
//
// É a mecânica que dá propósito a andar pelo cenário e amarra o tema
// do jogo: limpar Mahahual. Parte do lixo fica no chão e parte flutua
// na altura do pulo, pra criança variar entre andar e pular.
// ═══════════════════════════════════════════════════════════════

var ITENS = [];
var ITEM_POPUPS = [];   // textos "+50" que sobem ao recolher

var ITEM_TIPOS = ['botella', 'lata', 'bolsa'];
var ITEM_FRAMES = 4;             // cada tipo tem 4 quadros
var ITEM_HEIGHT_PCT = 0.080;     // % da altura da tela
var ITEM_VALOR = 50;

function itemAltura() {
  return Math.round(CANVAS.height * ITEM_HEIGHT_PCT);
}

// ── Distribuição pela zona ───────────────────────────────────
// Espaçamento em larguras de tela, igual aos inimigos, pra manter
// a mesma densidade em qualquer aparelho.
function spawnZoneItems(zone, worldWidth) {
  ITENS.length = 0;
  ITEM_POPUPS.length = 0;

  // Mesma armadilha do drone: a física só ganha escala dentro do
  // updatePlayer(). Sem isto, o lixo aéreo nasce em altura absoluta e
  // fica inalcançável no celular.
  if (typeof updatePhysicsScale === 'function') updatePhysicsScale();

  var larguraTela = CANVAS.width;
  var pos = larguraTela * 0.8;
  var limite = worldWidth - larguraTela * 1.2;
  var i = 0;

  while (pos < limite) {
    var tipo = ITEM_TIPOS[Math.floor(Math.random() * ITEM_TIPOS.length)];

    // ~50% do lixo flutua na altura do pulo simples
    var flutua = (Math.random() < 0.5);
    var alturaVoo = 0;
    if (flutua && typeof JUMP_FORCE_1 !== 'undefined' && typeof GRAVITY !== 'undefined') {
      var apice = (JUMP_FORCE_1 * JUMP_FORCE_1) / (2 * GRAVITY);
      alturaVoo = apice * (0.45 + Math.random() * 0.35);
    }

    ITENS.push({
      x: Math.round(pos),
      y: Math.round(GROUND_Y - alturaVoo),
      tipo: tipo,
      frame: Math.floor(Math.random() * ITEM_FRAMES),
      frameTimer: Math.floor(Math.random() * 10),
      bobPhase: Math.random() * Math.PI * 2,
      flutua: flutua,
      coletado: false
    });

    pos += larguraTela * (0.34 + Math.random() * 0.28);
    i++;
  }
  return i;
}

// ── Atualização ──────────────────────────────────────────────
function updateItems() {
  var alt = itemAltura();
  var meia = alt * 0.5;

  var pLeft = P.x - SPRITE_TARGET_HEIGHT.character * 0.28;
  var pRight = P.x + SPRITE_TARGET_HEIGHT.character * 0.28;
  var pTop = P.y - SPRITE_TARGET_HEIGHT.character;
  var pBottom = P.y;

  for (var i = ITENS.length - 1; i >= 0; i--) {
    var it = ITENS[i];

    // só processa o que está por perto (zona tem dezenas de itens)
    if (Math.abs(P.x - it.x) > CANVAS.width) continue;

    // animação do sprite
    it.frameTimer++;
    if (it.frameTimer >= 8) {
      it.frameTimer = 0;
      it.frame = (it.frame + 1) % ITEM_FRAMES;
    }
    if (it.flutua) it.bobPhase += 0.06;

    var iy = it.y + (it.flutua ? Math.sin(it.bobPhase) * alt * 0.15 : 0);
    var iLeft = it.x - meia, iRight = it.x + meia;
    var iTop = iy - alt, iBottom = iy;

    if (pRight > iLeft && pLeft < iRight && pBottom > iTop && pTop < iBottom) {
      ITENS.splice(i, 1);
      if (typeof addScore === 'function') addScore(ITEM_VALOR);
      ITEM_POPUPS.push({ x: it.x, y: iy - alt * 0.6, t: 0 });
      if (typeof playSFX === 'function') playSFX('sfx_coleta');
    }
  }

  for (var j = ITEM_POPUPS.length - 1; j >= 0; j--) {
    ITEM_POPUPS[j].t++;
    if (ITEM_POPUPS[j].t > 45) ITEM_POPUPS.splice(j, 1);
  }
}

// ── Desenho ──────────────────────────────────────────────────
function drawItems(ctx, cameraX) {
  var alt = itemAltura();

  for (var i = 0; i < ITENS.length; i++) {
    var it = ITENS[i];
    var sx = it.x - cameraX;
    if (sx < -alt * 2 || sx > CANVAS.width + alt * 2) continue;

    var n = it.frame + 1;
    var img = IMAGES[it.tipo + '_0' + n];
    if (!img || !img.complete) continue;

    var iy = it.y + (it.flutua ? Math.sin(it.bobPhase) * alt * 0.15 : 0);

    // brilho suave em todo lixo, pra chamar atenção da criança
    // (um pouco mais forte no que flutua, que é o alvo do pulo)
    ctx.save();
    ctx.globalAlpha = it.flutua ? 0.34 : 0.24;
    ctx.fillStyle = '#fff3a8';
    ctx.beginPath();
    ctx.arc(sx, iy - alt * 0.5, alt * 0.60, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    drawSprite(ctx, img, it.x, iy, alt, 1, cameraX);
  }

  // "+50" subindo ao recolher
  for (var j = 0; j < ITEM_POPUPS.length; j++) {
    var pu = ITEM_POPUPS[j];
    var px = pu.x - cameraX;
    if (px < -100 || px > CANVAS.width + 100) continue;
    var prog = pu.t / 45;

    ctx.save();
    ctx.globalAlpha = 1 - prog;
    ctx.textAlign = 'center';
    ctx.font = 'bold ' + Math.round(CANVAS.height * 0.042) + 'px sans-serif';
    ctx.lineWidth = Math.max(2, CANVAS.height * 0.006);
    ctx.strokeStyle = 'rgba(12, 45, 22, 0.85)';
    ctx.strokeText('+' + ITEM_VALOR, px, pu.y - prog * CANVAS.height * 0.09);
    ctx.fillStyle = '#ffd75e';
    ctx.fillText('+' + ITEM_VALOR, px, pu.y - prog * CANVAS.height * 0.09);
    ctx.restore();
  }
  ctx.textAlign = 'left';
}
