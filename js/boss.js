// ═══════════════════════════════════════════════════════════════
// BOSS.JS — Guardiões de Mahahual
// Os três chefes de fase. Carregado DEPOIS de enemies.js e game.js.
//
// Cada boss BLOQUEIA o fim da zona: a Kiara não passa dele até
// derrotá-lo. E cada um ataca do seu jeito, em vez de só andar:
//   Z1 Super Bulldozer — investidas (acelera e recua)
//   Z2 Drone Chefão    — rajadas de barris
//   Z3 Robô Supervisor — planta paredes de placas
//
// Os sprites já existem em assets.js (boss_bulldozer_*, bossdrone_*,
// bossrobot_*).
// ═══════════════════════════════════════════════════════════════

var BOSS = null;

var BOSS_TYPES = {
  boss_bulldozer: {
    nome: 'Súper Bulldozer',
    vida: 10,
    alturaPct: 0.30,
    velocidadePct: 1.6 / 1920,
    voa: false,
    estados: { move: 3, hit: 3 },
    estadoBase: 'move',
    estadoHit: 'hit',
    spriteDerrotado: 'boss_bulldozer_defeated_01',
    drawDirFlip: -1,
    ataque: 'investida'
  },
  bossdrone: {
    nome: 'Dron Jefe',
    vida: 8,
    alturaPct: 0.20,
    velocidadePct: 1.9 / 1920,
    voa: true,
    estados: { hover: 4, drop_item: 4, crash: 2 },
    estadoBase: 'hover',
    estadoHit: 'drop_item',
    spriteDerrotado: null,
    estadoDerrota: 'crash',
    drawDirFlip: -1,
    ataque: 'rajada'
  },
  bossrobot: {
    nome: 'Robot Supervisor',
    vida: 12,
    alturaPct: 0.30,
    velocidadePct: 1.3 / 1920,
    voa: false,
    estados: { walk: 6, sign_hold: 6, destroy: 5 },
    estadoBase: 'walk',
    estadoHit: 'sign_hold',
    spriteDerrotado: null,
    estadoDerrota: 'destroy',
    drawDirFlip: -1,
    ataque: 'muralha'
  }
};

function bossAltura(cfg) {
  return Math.round(CANVAS.height * cfg.alturaPct);
}

// ── Criação ──────────────────────────────────────────────────
function spawnBoss(tipo, x) {
  var cfg = BOSS_TYPES[tipo];
  if (!cfg) return;

  var multVel = (typeof dificuldadeAtual === 'function')
    ? dificuldadeAtual().velocidade : 1;

  BOSS = {
    tipo: tipo,
    x: x,
    y: cfg.voa ? GROUND_Y - droneHoverOffset() : GROUND_Y,
    baseY: cfg.voa ? GROUND_Y - droneHoverOffset() : GROUND_Y,
    dir: -1,
    vida: cfg.vida,
    vidaMax: cfg.vida,
    speed: cfg.velocidadePct * CANVAS.width * multVel,
    estado: cfg.estadoBase,
    frame: 0,
    frameTimer: 0,
    hitTimer: 0,
    ataqueTimer: 180,
    fase: 'espera',      // espera | ativo | derrotado
    investindo: 0,
    hoverPhase: 0,
    derrotaTimer: 0,
    despertou: false
  };
}

// ── Barra de vida (desenhada pelo HUD) ───────────────────────
function drawBossHealth(ctx) {
  if (!BOSS || BOSS.fase === 'espera' || BOSS.fase === 'derrotado') return;
  var cfg = BOSS_TYPES[BOSS.tipo];
  if (!cfg) return;

  var W = CANVAS.width, H = CANVAS.height;
  var barW = W * 0.46;
  var barH = H * 0.038;
  var x = (W - barW) / 2;
  var y = H * 0.135;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold ' + Math.round(H * 0.042) + 'px sans-serif';
  ctx.fillText(cfg.nome, W / 2, y - H * 0.012);

  ctx.fillStyle = 'rgba(12, 12, 12, 0.68)';
  hudRoundRect(ctx, x, y, barW, barH, barH / 2);
  ctx.fill();

  var frac = Math.max(0, BOSS.vida / BOSS.vidaMax);
  if (frac > 0) {
    var g = ctx.createLinearGradient(x, 0, x + barW, 0);
    g.addColorStop(0, '#e8622b');
    g.addColorStop(1, '#ffd75e');
    ctx.fillStyle = g;
    hudRoundRect(ctx, x, y, Math.max(barH, barW * frac), barH, barH / 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(2, H * 0.004);
  hudRoundRect(ctx, x, y, barW, barH, barH / 2);
  ctx.stroke();
  ctx.textAlign = 'left';
}

// ── Ataques ──────────────────────────────────────────────────
function bossAtaqueInvestida(b) {
  // Super Bulldozer: recua, pausa e avança rápido contra a Kiara.
  if (b.investindo > 0) {
    b.investindo--;
    b.x += b.speed * 3.2 * b.dir;
    return true;
  }
  if (b.ataqueTimer <= 0) {
    b.dir = (P.x >= b.x) ? 1 : -1;
    b.investindo = 45;
    b.ataqueTimer = 200 + Math.floor(Math.random() * 120);
    return true;
  }
  return false;
}

function bossAtaqueRajada(b) {
  // Drone Chefão: solta três barris seguidos, depois descansa.
  if (b.ataqueTimer <= 0) {
    b.estado = 'drop_item';
    b.frame = 0;
    if (typeof spawnBarril === 'function') {
      spawnBarril(b.x, b.y);
      var alcance = CANVAS.width * 0.16;
      spawnBarril(b.x - alcance, b.y);
      spawnBarril(b.x + alcance, b.y);
    }
    b.ataqueTimer = 220 + Math.floor(Math.random() * 140);
    return true;
  }
  return false;
}

function bossAtaqueMuralha(b) {
  // Robô Supervisor: finca uma sequência de placas à frente.
  if (b.ataqueTimer <= 0) {
    b.estado = 'sign_hold';
    b.frame = 0;
    if (typeof spawnPlaca === 'function') {
      var passo = CANVAS.width * 0.12;
      var sentido = (P.x >= b.x) ? 1 : -1;
      for (var i = 1; i <= 3; i++) {
        spawnPlaca(b.x + sentido * passo * i);
      }
    }
    b.ataqueTimer = 260 + Math.floor(Math.random() * 140);
    return true;
  }
  return false;
}

// ── Update ───────────────────────────────────────────────────
function updateBoss() {
  if (!BOSS) return;
  var b = BOSS;
  var cfg = BOSS_TYPES[b.tipo];
  if (!cfg) return;

  var alt = bossAltura(cfg);

  // Derrotado: toca a animação final e some
  if (b.fase === 'derrotado') {
    b.derrotaTimer++;
    var seqD = cfg.estadoDerrota;
    if (seqD) {
      b.frameTimer++;
      if (b.frameTimer >= FRAME_DELAY) {
        b.frameTimer = 0;
        if (b.frame < cfg.estados[seqD] - 1) b.frame++;
      }
    }
    return;
  }

  // Só desperta quando a Kiara chega perto
  if (b.fase === 'espera') {
    if (Math.abs(P.x - b.x) < CANVAS.width * 0.75) {
      b.fase = 'ativo';
      b.despertou = true;
    } else {
      return;
    }
  }

  // ── BARREIRA: a Kiara não passa do boss ───────────────────
  // Trava um pouco antes dele, pra não precisar encostar.
  var limite = b.x - CANVAS.width * 0.16;
  if (P.x > limite) {
    P.x = limite;
    if (P.vx > 0) P.vx = 0;
  }

  // ── Ataque próprio de cada boss ───────────────────────────
  b.ataqueTimer--;
  var atacando = false;
  if (cfg.ataque === 'investida')      atacando = bossAtaqueInvestida(b);
  else if (cfg.ataque === 'rajada')    atacando = bossAtaqueRajada(b);
  else if (cfg.ataque === 'muralha')   atacando = bossAtaqueMuralha(b);

  // ── Movimento base ────────────────────────────────────────
  if (!atacando) {
    if (b.estado === 'drop_item' || b.estado === 'sign_hold') {
      // termina a animação de ataque antes de voltar a andar
      if (b.frame >= cfg.estados[b.estado] - 1) b.estado = cfg.estadoBase;
    }
    var dist = P.x - b.x;
    if (Math.abs(dist) > CANVAS.width * 0.22) {
      b.dir = dist >= 0 ? 1 : -1;
      b.x += b.speed * b.dir;
    }
  }

  // não deixa o boss recuar demais nem sair do mundo
  if (b.x > WORLD_WIDTH - CANVAS.width * 0.1) b.x = WORLD_WIDTH - CANVAS.width * 0.1;

  if (cfg.voa) {
    b.hoverPhase += 0.05;
    b.y = b.baseY + Math.sin(b.hoverPhase) * alt * 0.12;
  } else {
    b.y = GROUND_Y;
  }

  // ── Animação ──────────────────────────────────────────────
  if (b.hitTimer > 0) {
    b.hitTimer--;
    b.estado = cfg.estadoHit;
  } else if (b.estado === cfg.estadoHit && cfg.ataque === 'investida') {
    b.estado = cfg.estadoBase;
  }

  var total = cfg.estados[b.estado] || 1;
  b.frameTimer++;
  if (b.frameTimer >= FRAME_DELAY) {
    b.frameTimer = 0;
    b.frame = (b.frame + 1) % total;
  }

  // ── Colisões ──────────────────────────────────────────────
  var meia = alt * 0.42;
  var bLeft = b.x - meia, bRight = b.x + meia;
  var bTop = b.y - alt, bBottom = b.y;

  // fruta acerta o boss
  for (var f = FRUITS.length - 1; f >= 0; f--) {
    var fr = FRUITS[f];
    var fs = SPRITE_TARGET_HEIGHT.fruit;
    if (fr.x + fs / 2 > bLeft && fr.x - fs / 2 < bRight &&
        fr.y + fs / 2 > bTop && fr.y - fs / 2 < bBottom) {
      FRUITS.splice(f, 1);
      b.vida--;
      b.hitTimer = 18;
      b.frame = 0;
      if (typeof addScore === 'function') addScore(10);
      if (typeof playSFX === 'function') playSFX('sfx_boss_hit');
      if (b.vida <= 0) {
        b.fase = 'derrotado';
        b.frame = 0;
        b.frameTimer = 0;
        b.derrotaTimer = 0;
        if (typeof addScore === 'function') addScore(300);
        if (typeof playSFX === 'function') playSFX('sfx_boss_defeat');
      }
      break;
    }
  }

  // encostou na Kiara
  var pLeft = P.x - SPRITE_TARGET_HEIGHT.character * 0.25;
  var pRight = P.x + SPRITE_TARGET_HEIGHT.character * 0.25;
  var pTop = P.y - SPRITE_TARGET_HEIGHT.character;
  var pBottom = P.y;
  if (pRight > bLeft && pLeft < bRight && pBottom > bTop && pTop < bBottom) {
    if (P.starTimer > 0) {
      // estrelinha derruba o boss mais rápido, mas não de uma vez
      if (b.hitTimer === 0) {
        b.vida--;
        b.hitTimer = 18;
        if (b.vida <= 0) {
          b.fase = 'derrotado';
          b.frame = 0;
          b.derrotaTimer = 0;
          if (typeof addScore === 'function') addScore(300);
        }
      }
    } else {
      playerGetHit();
    }
  }
}

// ── O boss ainda bloqueia a passagem? ────────────────────────
function bossBloqueando() {
  return !!(BOSS && BOSS.fase !== 'derrotado');
}

// ── Desenho ──────────────────────────────────────────────────
function drawBoss(ctx, cameraX) {
  if (!BOSS) return;
  var b = BOSS;
  var cfg = BOSS_TYPES[b.tipo];
  if (!cfg || b.fase === 'espera') return;

  var alt = bossAltura(cfg);
  var img = null;

  if (b.fase === 'derrotado') {
    if (cfg.estadoDerrota) {
      var nD = b.frame + 1;
      img = IMAGES[b.tipo + '_' + cfg.estadoDerrota + '_0' + nD];
    } else if (cfg.spriteDerrotado) {
      img = IMAGES[cfg.spriteDerrotado];
    }
    // some aos poucos depois da animação
    var alpha = Math.max(0, 1 - Math.max(0, b.derrotaTimer - 60) / 60);
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (img && img.complete) drawSprite(ctx, img, b.x, b.y, alt, b.dir * cfg.drawDirFlip, cameraX);
    ctx.restore();
    return;
  }

  var n = b.frame + 1;
  img = IMAGES[b.tipo + '_' + b.estado + '_0' + n];
  if (!img || !img.complete) {
    img = IMAGES[b.tipo + '_' + cfg.estadoBase + '_01'];
  }
  if (!img || !img.complete) return;

  // pisca ao levar fruta
  if (b.hitTimer > 0 && Math.floor(b.hitTimer / 3) % 2 === 0) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    drawSprite(ctx, img, b.x, b.y, alt, b.dir * cfg.drawDirFlip, cameraX);
    ctx.restore();
  } else {
    drawSprite(ctx, img, b.x, b.y, alt, b.dir * cfg.drawDirFlip, cameraX);
  }
}
