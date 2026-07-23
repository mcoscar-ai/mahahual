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

    // Três alturas, pra variar o que a criança precisa fazer:
    //   chão (~50%)      — só andar
    //   médio (~35%)     — pulo simples
    //   alto (~15%)      — só com pulo duplo
    // O alto fica entre 1,05x e 1,40x o ápice do pulo simples; o pulo
    // duplo alcança ~1,55x, então sobra folga e nada fica impossível.
    // Faixas do sorteio: <0.50 chão | 0.50-0.85 médio | >=0.85 alto
    var sorteio = Math.random();
    var flutua = (sorteio >= 0.5);
    var alto = (sorteio >= 0.85);
    var alturaVoo = 0;
    if (flutua && typeof JUMP_FORCE_1 !== 'undefined' && typeof GRAVITY !== 'undefined') {
      var apice = (JUMP_FORCE_1 * JUMP_FORCE_1) / (2 * GRAVITY);
      alturaVoo = apice * (alto ? (1.05 + Math.random() * 0.35)
                                : (0.45 + Math.random() * 0.35));
    }

    ITENS.push({
      x: Math.round(pos),
      y: Math.round(GROUND_Y - alturaVoo),
      tipo: tipo,
      frame: Math.floor(Math.random() * ITEM_FRAMES),
      frameTimer: Math.floor(Math.random() * 10),
      bobPhase: Math.random() * Math.PI * 2,
      flutua: flutua,
      alto: alto,
      coletado: false
    });

    pos += larguraTela * (0.34 + Math.random() * 0.28);
    i++;
  }

  if (typeof spawnZoneStars === 'function') spawnZoneStars(worldWidth);

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
    ctx.globalAlpha = it.alto ? 0.44 : (it.flutua ? 0.34 : 0.24);
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

// ═══════════════════════════════════════════════════════════════
// ESTRELINHA — power-up de invencibilidade (estilo Mario)
// Rara, flutua brilhando. Ao pegar, a Kiara fica imune por 15s e
// derrota inimigos ao encostar. Desenhada por código (não há sprite
// de estrela no projeto).
// ═══════════════════════════════════════════════════════════════

var ESTRELAS = [];
var ESTRELA_DURACAO = 600;        // 10s a 60fps
var ESTRELA_HEIGHT_PCT = 0.095;   // um pouco maior que o lixo, pra destacar

function estrelaAltura() {
  return Math.round(CANVAS.height * ESTRELA_HEIGHT_PCT);
}

function spawnZoneStars(worldWidth) {
  ESTRELAS.length = 0;
  var larguraTela = CANVAS.width;
  // ~3 por zona (55 telas): rara o bastante pra ser um momento especial
  var pos = larguraTela * (7 + Math.random() * 2);

  while (pos < worldWidth - larguraTela * 1.5) {
    var apice = 0;
    if (typeof JUMP_FORCE_1 !== 'undefined' && typeof GRAVITY !== 'undefined') {
      apice = (JUMP_FORCE_1 * JUMP_FORCE_1) / (2 * GRAVITY);
    }
    ESTRELAS.push({
      x: Math.round(pos),
      y: Math.round(GROUND_Y - apice * 0.55),
      bobPhase: Math.random() * Math.PI * 2,
      giro: 0
    });
    pos += larguraTela * (16 + Math.random() * 2);
  }
  return ESTRELAS.length;
}

function updateStars() {
  var alt = estrelaAltura();
  var pLeft = P.x - SPRITE_TARGET_HEIGHT.character * 0.28;
  var pRight = P.x + SPRITE_TARGET_HEIGHT.character * 0.28;
  var pTop = P.y - SPRITE_TARGET_HEIGHT.character;
  var pBottom = P.y;

  for (var i = ESTRELAS.length - 1; i >= 0; i--) {
    var st = ESTRELAS[i];
    if (Math.abs(P.x - st.x) > CANVAS.width) continue;

    st.bobPhase += 0.05;
    st.giro += 0.045;

    var sy = st.y + Math.sin(st.bobPhase) * alt * 0.22;
    var meia = alt * 0.5;

    if (pRight > st.x - meia && pLeft < st.x + meia &&
        pBottom > sy - meia && pTop < sy + meia) {
      ESTRELAS.splice(i, 1);
      P.starTimer = ESTRELA_DURACAO;
      if (typeof addScore === 'function') addScore(100);
      ITEM_POPUPS.push({ x: st.x, y: sy - alt * 0.5, t: 0 });
      if (typeof playSFX === 'function') playSFX('sfx_star');
    }
  }
}

function desenhaEstrela(ctx, cx, cy, raio, giro) {
  ctx.beginPath();
  for (var i = 0; i < 10; i++) {
    var r = (i % 2 === 0) ? raio : raio * 0.46;
    var a = giro + i * Math.PI / 5 - Math.PI / 2;
    var x = cx + Math.cos(a) * r;
    var y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawStars(ctx, cameraX) {
  var alt = estrelaAltura();

  for (var i = 0; i < ESTRELAS.length; i++) {
    var st = ESTRELAS[i];
    var sx = st.x - cameraX;
    if (sx < -alt * 2 || sx > CANVAS.width + alt * 2) continue;

    var sy = st.y + Math.sin(st.bobPhase) * alt * 0.22;
    var t = Date.now() / 120;

    // halo pulsante
    ctx.save();
    ctx.globalAlpha = 0.30 + Math.sin(t * 2) * 0.10;
    ctx.fillStyle = '#fff3a8';
    ctx.beginPath();
    ctx.arc(sx, sy, alt * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // estrela dourada girando
    ctx.save();
    desenhaEstrela(ctx, sx, sy, alt * 0.5, st.giro);
    var g = ctx.createLinearGradient(sx - alt / 2, sy - alt / 2, sx + alt / 2, sy + alt / 2);
    g.addColorStop(0, '#fff8c9');
    g.addColorStop(0.5, '#ffd75e');
    g.addColorStop(1, '#f5a623');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#c97f12';
    ctx.lineWidth = Math.max(2, alt * 0.045);
    ctx.stroke();
    ctx.restore();
  }
}
