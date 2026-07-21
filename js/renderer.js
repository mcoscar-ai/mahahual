// ═══════════════════════════════════════════════════════════════
// ENEMIES.JS — Guardiões de Mahahual
// Bulldozer, Caminhão, Drone e Robô plaqueiro: movimento, animação,
// colisão com frutas (FRUITS, vindo do player.js) e com a Kiara.
// ═══════════════════════════════════════════════════════════════

// ── Configuração por tipo (fácil de recalibrar depois) ──────────
var ENEMY_TYPES = {
  bulldozer: {
    targetHeight: 130,
    speed: 1.5,
    fruitHits: 5,
    states: { move: 4, hit: 2, transform: 5 },
    flies: false,
    drawDirFlip: -1
  },
  caminhao: {
    targetHeight: 100,
    speed: 5,
    fruitHits: null,
    states: { move: 3 },
    flies: false,
    drawDirFlip: -1
  },
  drone: {
    targetHeight: 75,
    speed: 2,
    fruitHits: 3,
    states: { hover: 4, drop_barrel: 4, swarm_attack: 4 },
    flies: true,
    drawDirFlip: -1
  },
  robot: {
    targetHeight: 120,
    speed: 1,
    fruitHits: 2,
    states: { walk: 6, sign_plant: 5, idle_hit: 5 },
    flies: false,
    drawDirFlip: -1
  }
};

// Adiciona as alturas ao SPRITE_TARGET_HEIGHT compartilhado (definido no player.js)
Object.keys(ENEMY_TYPES).forEach(function (type) {
  SPRITE_TARGET_HEIGHT[type] = ENEMY_TYPES[type].targetHeight;
});

var ENEMIES = []; // todos os inimigos ativos no mundo

// ── Cria um inimigo numa posição fixa do mundo ──────────────────
function spawnEnemy(type, x, groundY) {
  var cfg = ENEMY_TYPES[type];
  var firstState = Object.keys(cfg.states)[0];
  ENEMIES.push({
    type: type,
    x: x,
    spawnX: x,               // centro da patrulha
    patrolRange: 90,         // anda até 90px pra cada lado e volta
    y: cfg.flies ? groundY - 150 : groundY, // drone voa mais alto
    baseY: cfg.flies ? groundY - 150 : groundY,
    dir: 1, // olhando pra direita por padrão (ajustável por inimigo quando o game.js existir)
    state: firstState,
    frame: 0,
    frameTimer: 0,
    hitsTaken: 0,
    defeated: false,
    removed: false,
    actionTimer: Math.floor(Math.random() * 120), // ação periódica (soltar barril / plantar placa)
    hoverPhase: Math.random() * Math.PI * 2         // pro movimento senoidal do drone
  });
}

// ── Atualiza todos os inimigos ───────────────────────────────────
function updateEnemies() {
  for (var i = ENEMIES.length - 1; i >= 0; i--) {
    var e = ENEMIES[i];
    if (e.removed) { ENEMIES.splice(i, 1); continue; }

    var cfg = ENEMY_TYPES[e.type];

    if (e.defeated) {
      updateDefeatedEnemy(e, cfg);
      continue;
    }

    // ── Movimento: avança em direção à Kiara ──
    if (e.type === 'drone') {
      e.hoverPhase += 0.03;
      e.y = e.baseY + Math.sin(e.hoverPhase) * 15; // flutua suave no ar
    }

    if (e.type === 'caminhao') {
      // segue sempre reto na mesma direção (definida uma vez) — obstáculo que atravessa.
      if (e.truckDirSet !== true) {
        e.dir = (P.x - e.x) >= 0 ? 1 : -1;
        e.truckDirSet = true;
      }
      e.x += cfg.speed * e.dir;
    } else if (e.leaving) {
      // JÁ TOCOU a Kiara: segue o caminho reto pra sempre, nunca mais volta.
      e.x += cfg.speed * e.dir;
      if (Math.abs(P.x - e.x) > 2500) e.removed = true; // some de vez quando longe
    } else {
      // Ainda não tocou: persegue. Re-mira só quando longe; perto, trava e atravessa.
      var RETARGET_DISTANCE = 160;
      var distToPlayer = P.x - e.x;
      if (Math.abs(distToPlayer) > RETARGET_DISTANCE) {
        e.dir = distToPlayer >= 0 ? 1 : -1;
      }
      e.x += cfg.speed * e.dir;
    }

    // ── Ação periódica (drone solta barril / robô planta placa) ──
    e.actionTimer--;
    if (e.actionTimer <= 0) {
      if (e.type === 'drone') {
        e.state = 'drop_barrel';
        if (typeof spawnBarril === 'function') spawnBarril(e.x, e.y);
      } else if (e.type === 'robot') {
        e.state = 'sign_plant';
      }
      e.actionTimer = 240 + Math.floor(Math.random() * 180); // próxima ação em 4-7s
      e.frame = 0;
    } else if (e.state !== (e.type === 'bulldozer' || e.type === 'caminhao' ? 'move' : e.state)) {
      // depois de terminar a ação periódica, volta pro estado padrão de movimento
    }

    // volta ao estado padrão quando a animação de ação termina
    var defaultState = e.type === 'bulldozer' ? 'move' :
                        e.type === 'caminhao'  ? 'move' :
                        e.type === 'drone'     ? 'hover' : 'walk';
    if (e.state !== defaultState && e.frame >= cfg.states[e.state] - 1 && e.frameTimer >= FRAME_DELAY - 1) {
      e.state = defaultState;
      e.frame = 0;
    }

    updateEnemyAnimation(e, cfg);
    checkFruitCollision(e, cfg);
    checkPlayerCollision(e, cfg);
  }
}

function updateEnemyAnimation(e, cfg) {
  e.frameTimer++;
  if (e.frameTimer >= FRAME_DELAY) {
    e.frameTimer = 0;
    e.frame = (e.frame + 1) % cfg.states[e.state];
  }
}

// ── Depois de derrotado: toca animação de queda/transformação uma vez ──
function updateDefeatedEnemy(e, cfg) {
  var finalState = e.type === 'bulldozer' ? 'transform' :
                    e.type === 'drone'     ? 'swarm_attack' :
                    e.type === 'robot'     ? 'idle_hit' : null;
  if (!finalState) { e.removed = true; return; }

  e.frameTimer++;
  if (e.frameTimer >= FRAME_DELAY) {
    e.frameTimer = 0;
    e.frame++;
    if (e.frame >= cfg.states[finalState]) {
      // animação terminou: some e larga um item de lixo (items.js cuida disso)
      if (typeof spawnTrashDrop === 'function') spawnTrashDrop(e.x, e.y);
      e.removed = true;
    }
  }
}

// ── Colisão fruta → inimigo ───────────────────────────────────
function checkFruitCollision(e, cfg) {
  if (cfg.fruitHits === null) return; // caminhão é invencível a fruta

  var dims = getSpriteDims(e.type, e.state, cfg.targetHeight);
  if (!dims) return;
  var eLeft = e.x - dims.width / 2, eRight = e.x + dims.width / 2;
  var eTop = e.y - dims.height, eBottom = e.y;

  for (var i = FRUITS.length - 1; i >= 0; i--) {
    var f = FRUITS[i];
    var fSize = SPRITE_TARGET_HEIGHT.fruit;
    if (f.x + fSize / 2 > eLeft && f.x - fSize / 2 < eRight &&
        f.y + fSize / 2 > eTop && f.y - fSize / 2 < eBottom) {
      FRUITS.splice(i, 1); // fruta consumida
      e.hitsTaken++;
      if (typeof addScore === 'function') addScore(10); // acerto vale pontinho, ajustável
      if (e.hitsTaken >= cfg.fruitHits) {
        e.defeated = true;
        e.frame = 0;
        e.frameTimer = 0;
      }
      break;
    }
  }
}

// ── Colisão inimigo → Kiara (deixa ela tonta, via player.js) ─────
function checkPlayerCollision(e, cfg) {
  if (e.defeated) return;
  var dims = getSpriteDims(e.type, e.state, cfg.targetHeight);
  if (!dims) return;
  var eLeft = e.x - dims.width / 2, eRight = e.x + dims.width / 2;
  var eTop = e.y - dims.height, eBottom = e.y;

  var pLeft = P.x - SPRITE_TARGET_HEIGHT.character * 0.25;
  var pRight = P.x + SPRITE_TARGET_HEIGHT.character * 0.25;
  var pTop = P.y - SPRITE_TARGET_HEIGHT.character;
  var pBottom = P.y;

  if (pRight > eLeft && pLeft < eRight && pBottom > eTop && pTop < eBottom) {
    playerGetHit();
    e.leaving = true; // tocou → segue o caminho reto pra sempre, nunca mais volta
  }
}

// ── Calcula as dimensões reais na tela (sem desenhar) ────────────
// pra usar em colisão mesmo antes/sem chamar drawSprite.
function getSpriteDims(type, state, targetHeight) {
  var n = 1; // usa sempre o frame 1 como referência de tamanho (é bem próximo entre frames)
  var img = IMAGES[type + '_' + state + '_0' + n] || IMAGES[type + '_' + state + '_' + n];
  if (!img || !img.complete) return null;
  var scale = targetHeight / img.height;
  return { width: img.width * scale, height: targetHeight };
}

// ── Desenha todos os inimigos ativos ──────────────────────────
function drawEnemies(ctx, cameraX) {
  ENEMIES.forEach(function (e) {
    var cfg = ENEMY_TYPES[e.type];
    var n = e.frame + 1;
    var nStr = n < 10 ? '0' + n : '' + n;
    var img = IMAGES[e.type + '_' + e.state + '_' + nStr];
    var visualDir = e.dir * cfg.drawDirFlip; // corrige orientação da arte sem mexer no movimento
    drawSprite(ctx, img, e.x, e.y, cfg.targetHeight, visualDir, cameraX);
  });
}
