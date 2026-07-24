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
    vida: 30,
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
    vida: 28,
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
    vida: 32,
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
    fumacaTimer: 150,
    respiro: 0,
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
  // Além da investida, o Super Bulldozer solta nuvens de fumaça que
  // rolam pelo chão em direção à Kiara — mesma ideia das placas do
  // Robô Supervisor: um obstáculo que ele cria, e que só se passa
  // pulando (fumaça não se destrói com fruta).
  b.fumacaTimer--;
  if (b.fumacaTimer <= 0) {
    var sentido = (P.x >= b.x) ? 1 : -1;
    spawnNuvem(b.x + sentido * CANVAS.width * 0.13, GROUND_Y, sentido);
    b.fumacaTimer = 170 + Math.floor(Math.random() * 120);
  }

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
  // Drone Chefão: solta uma dupla de barris, depois descansa.
  // Eram três num intervalo curto e sem folga — como levar barril deixa
  // tonta, e tonta não atira, a luta esticava e gerava ainda mais barris.
  if (b.ataqueTimer <= 0) {
    b.estado = 'drop_item';
    b.frame = 0;
    if (typeof spawnBarril === 'function') {
      var alcance = CANVAS.width * 0.20;
      spawnBarril(b.x - alcance * 0.5, b.y);
      spawnBarril(b.x + alcance * 0.5, b.y);
    }
    var mult = (typeof dificuldadeAtual === 'function') ? dificuldadeAtual().barril : 1;
    b.ataqueTimer = Math.round((380 + Math.random() * 200) * mult);
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
  // Nada de atacar enquanto ela está tonta (nem logo depois): sem isso,
  // levar um golpe encadeava no próximo e a criança não conseguia sair.
  if (P.dizzyTimer > 0) {
    b.respiro = 45;                 // ~0,75s de folga ao voltar
  } else if (b.respiro > 0) {
    b.respiro--;
  }
  if (P.dizzyTimer > 0 || b.respiro > 0) {
    if (cfg.voa) { b.hoverPhase += 0.05; b.y = b.baseY + Math.sin(b.hoverPhase) * alt * 0.12; }
    return;
  }

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


// ═══════════════════════════════════════════════════════════════
// NUVENS DE FUMAÇA — soltadas pelo Super Bulldozer
// Rolam pelo chão em direção à Kiara. Não se destroem com fruta
// (é fumaça): a resposta é pular. Somem ao encostar nela, senão a
// tontura reiniciaria em loop enquanto ela estivesse dentro.
// Desenhadas por código — não existe sprite de fumaça no projeto.
// ═══════════════════════════════════════════════════════════════

var NUVENS = [];
var NUVEM_VIDA = 260;                // ~4,3s
var NUVEM_ALTURA_PCT = 0.11;         // altura total, bem abaixo do pulo
// A 2.0 a nuvem andava 0,67 px/frame e o boss 0,53 — ela parecia
// colada nele. Em 6.0 ela é quase 4x mais rápida que o boss, então
// de fato é ARREMESSADA contra a Kiara, mas ainda mais lenta que a
// corrida dela (que é ~4,7 px/frame), dando tempo de ver e pular.
var NUVEM_VEL_PCT = 6.0 / 1920;

function nuvemAltura() {
  return Math.round(CANVAS.height * NUVEM_ALTURA_PCT);
}

function spawnNuvem(x, y, dir) {
  NUVENS.push({
    x: x, y: y, dir: dir,
    t: 0,
    puffs: [
      { dx: -0.55, dy: -0.10, r: 0.42, f: 0.9 },
      { dx: -0.18, dy: -0.34, r: 0.50, f: 1.1 },
      { dx:  0.20, dy: -0.28, r: 0.46, f: 1.0 },
      { dx:  0.56, dy: -0.08, r: 0.40, f: 0.8 },
      { dx:  0.02, dy: -0.02, r: 0.52, f: 1.0 }
    ],
    removed: false
  });
}

function updateNuvens() {
  var vel = NUVEM_VEL_PCT * CANVAS.width;
  var mult = (typeof dificuldadeAtual === 'function') ? dificuldadeAtual().velocidade : 1;
  var alt = nuvemAltura();

  for (var i = NUVENS.length - 1; i >= 0; i--) {
    var nu = NUVENS[i];
    if (nu.removed) { NUVENS.splice(i, 1); continue; }

    nu.t++;
    nu.x += vel * mult * nu.dir;

    if (nu.t > NUVEM_VIDA || Math.abs(P.x - nu.x) > CANVAS.width * 1.6) {
      nu.removed = true;
      continue;
    }

    var meia = alt * 0.62;
    var nLeft = nu.x - meia, nRight = nu.x + meia;
    var nTop = nu.y - alt, nBottom = nu.y;

    var pLeft = P.x - SPRITE_TARGET_HEIGHT.character * 0.25;
    var pRight = P.x + SPRITE_TARGET_HEIGHT.character * 0.25;
    var pTop = P.y - SPRITE_TARGET_HEIGHT.character;
    var pBottom = P.y;

    if (pRight > nLeft && pLeft < nRight && pBottom > nTop && pTop < nBottom) {
      playerGetHit();
      nu.removed = true;   // dissipa, pra não prender a criança em tontura
    }
  }
}

function drawNuvens(ctx, cameraX) {
  var alt = nuvemAltura();

  for (var i = 0; i < NUVENS.length; i++) {
    var nu = NUVENS[i];
    var sx = nu.x - cameraX;
    if (sx < -alt * 3 || sx > CANVAS.width + alt * 3) continue;

    // cresce no começo e desvanece no fim
    var prog = nu.t / NUVEM_VIDA;
    var escala = 0.55 + Math.min(1, nu.t / 30) * 0.45;
    var alpha = (prog > 0.75) ? (1 - (prog - 0.75) / 0.25) : 1;

    ctx.save();
    ctx.globalAlpha = 0.72 * alpha;
    for (var j = 0; j < nu.puffs.length; j++) {
      var pf = nu.puffs[j];
      var bal = Math.sin(nu.t * 0.09 + j) * alt * 0.05;
      var cinza = 108 + j * 12;
      ctx.fillStyle = 'rgb(' + cinza + ',' + cinza + ',' + (cinza + 6) + ')';
      ctx.beginPath();
      ctx.arc(sx + pf.dx * alt * escala,
              nu.y + pf.dy * alt * escala - alt * 0.34 + bal,
              pf.r * alt * escala * pf.f, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
