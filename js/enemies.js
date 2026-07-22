// ═══════════════════════════════════════════════════════════════
// ENEMIES.JS — Guardiões de Mahahual
// Bulldozer, Caminhão, Drone e Robô plaqueiro: movimento, animação,
// colisão com frutas (FRUITS, vindo do player.js) e com a Kiara.
// ═══════════════════════════════════════════════════════════════

// ── Configuração por tipo (fácil de recalibrar depois) ──────────
// NOTA: "speed" é recalculado a cada resize por updateSpriteTargetHeights()
// (renderer.js) a partir de speedPct, que é a fração da LARGURA do canvas
// percorrida por frame. speedPct foi calibrado a partir dos valores originais
// em pixels (design base 1920px de largura), então o jogo se comporta
// exatamente igual a antes na resolução de design, mas escala corretamente
// em qualquer outra tela (ex: celular sem fullscreen, canvas bem menor).
var ENEMY_TYPES = {
  bulldozer: {
    targetHeight: 130,
    speedPct: 2.2 / 1920,   // velocidade no MUNDO (como todo platformer)
    speed: 2.2,             // valor inicial; recalculado no primeiro resize
    fruitHits: 5,
    states: { move: 4, hit: 2, transform: 5 },
    flies: false,
    drawDirFlip: -1
  },
  caminhao: {
    targetHeight: 100,
    speedPct: 4.0 / 1920,   // caminhão mais rápido (é obstáculo que atravessa)
    speed: 4.0,
    fruitHits: null,
    states: { move: 3 },
    flies: false,
    drawDirFlip: -1
  },
  drone: {
    targetHeight: 75,
    speedPct: 2.2 / 1920,
    speed: 2.2,
    fruitHits: 3,
    states: { hover: 4, drop_barrel: 4, swarm_attack: 4 },
    hitboxScale: 0.6,   // colisão menor que o desenho — dá espaço pra ela chegar perto e atirar
    flies: true,
    drawDirFlip: -1
  },
  robot: {
    targetHeight: 120,
    speedPct: 1.6 / 1920,   // mais lento — robô pesado
    speed: 1.6,
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

// Altura de voo do drone, calculada a partir da FÍSICA DO PULO SIMPLES.
// O objetivo: no ápice do 1º pulo, o peito da Kiara (de onde sai a fruta)
// fica exatamente na altura do meio do drone — então ela pula, atira e
// acerta. Como é calculado, continua correto se mudarmos gravidade,
// força do pulo ou tamanho dos sprites depois.
function droneHoverOffset() {
  if (typeof JUMP_FORCE_1 === 'undefined' || typeof GRAVITY === 'undefined') {
    return Math.round(CANVAS.height * 0.30); // fallback antes do player.js carregar
  }
  var jumpH  = (JUMP_FORCE_1 * JUMP_FORCE_1) / (2 * GRAVITY); // ápice do pulo simples
  var charH  = SPRITE_TARGET_HEIGHT.character;
  var droneH = ENEMY_TYPES.drone.targetHeight;
  var chestOffset = charH * 0.55;  // mesma altura usada em throwFruit()
  return Math.round(jumpH + chestOffset - droneH / 2);
}

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
    baseY: cfg.flies ? groundY - droneHoverOffset() : groundY,
    dir: 1, // olhando pra direita por padrão (ajustável por inimigo quando o game.js existir)
    state: firstState,
    frame: 0,
    frameTimer: 0,
    hitsTaken: 0,
    defeated: false,
    removed: false,
    actionTimer: Math.floor(Math.random() * 120), // ação periódica (swoop do drone / placa do robô)
    barrelTimer: 150 + Math.floor(Math.random() * 150), // timer SEPARADO: o swoop consumia o actionTimer
                                                        // antes do barril chegar a zero e ele nunca saía
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

    if (e.type === 'drone') {
      e.hoverPhase += 0.03;

      if (!e.droneMode) e.droneMode = 'patrol'; // patrol | swoop

      if (e.droneMode === 'patrol') {
        // Patrulha lateral: sobe pra uma posição fixa acessível com pulo duplo
        // e anda de lado em loop — a Kiara pode pular e acertar a fruta nele
        e.y = e.baseY + Math.sin(e.hoverPhase) * 12;
        var distToPlayer = P.x - e.x;
        e.dir = distToPlayer >= 0 ? 1 : -1;
        if (Math.abs(distToPlayer) > 260) {
          e.x += cfg.speed * e.dir;
        }
        // A cada ~5s mergulha em direção à Kiara (swoop rápido)
        if (e.actionTimer <= 0) {
          e.droneMode = 'swoop';
          e.swoopTargetX = P.x;
          e.swoopTargetY = GROUND_Y - 40; // desce até perto do chão
          e.actionTimer = 300 + Math.floor(Math.random() * 120);
        }
      } else if (e.droneMode === 'swoop') {
        // Mergulho: desce rápido até perto do chão passando pela Kiara
        var dxSwoop = e.swoopTargetX - e.x;
        var dySwoop = e.swoopTargetY - e.y;
        var dist = Math.sqrt(dxSwoop*dxSwoop + dySwoop*dySwoop);
        if (dist < 30) {
          // chegou no alvo — sobe de volta e volta a patrulhar
          e.droneMode = 'patrol';
          e.baseY = GROUND_Y - droneHoverOffset(); // exatamente na altura do pulo simples
        } else {
          e.x += (dxSwoop / dist) * cfg.speed * 3;
          e.y += (dySwoop / dist) * cfg.speed * 3;
          e.dir = dxSwoop >= 0 ? 1 : -1;
        }
      }
    } else if (e.type === 'caminhao') {
      // Caminhão: define direção uma vez (vem da direita indo pra esquerda)
      // e atravessa a tela sem parar — obstáculo pra pular por cima
      if (!e.truckDirSet) {
        e.dir = -1; // sempre vem da direita
        e.truckDirSet = true;
      }
      e.x += cfg.speed * e.dir;
      // se sair muito longe da Kiara, reseta na direita pra fazer nova passagem
      if (P.x - e.x > 2000) {
        e.x = P.x + 1200;
        e.truckDirSet = false;
      }
    } else if (e.leaving) {
      // JÁ TOCOU a Kiara: segue o caminho reto pra sempre
      e.x += cfg.speed * e.dir;
      if (Math.abs(P.x - e.x) > 2500) e.removed = true;
    } else {
      // Persegue sempre — re-mira a cada frame independente da distância
      var RETARGET_DISTANCE = 80;
      var distToPlayer = P.x - e.x;
      if (Math.abs(distToPlayer) > RETARGET_DISTANCE) {
        e.dir = distToPlayer >= 0 ? 1 : -1;
      }
      // Robô fica PARADO enquanto finca a placa — é o aviso visual
      // que dá à criança um instante pra se preparar.
      if (!(e.type === 'robot' && e.state === 'sign_plant')) {
        e.x += cfg.speed * e.dir;
      }
    }

    // ── Ação periódica ──────────────────────────────────────────
    // Drone: solta barril (timer próprio, senão o swoop o consome antes).
    // Só solta em patrulha e quando está mais ou menos sobre a Kiara,
    // pra criança ver o barril cair à frente e ter tempo de pular.
    if (e.type === 'drone') {
      e.barrelTimer--;
      if (e.barrelTimer <= 0 && e.droneMode === 'patrol' &&
          Math.abs(P.x - e.x) < CANVAS.width * 0.55) {
        e.state = 'drop_barrel';
        e.frame = 0;
        if (typeof spawnBarril === 'function') spawnBarril(e.x, e.y);
        e.barrelTimer = 300 + Math.floor(Math.random() * 240); // 5-9s
      }
    }

    // Robô: finca placa como aviso antes de continuar avançando.
    e.actionTimer--;
    if (e.actionTimer <= 0) {
      if (e.type === 'robot') {
        e.state = 'sign_plant';
        e.frame = 0;
      }
      e.actionTimer = 240 + Math.floor(Math.random() * 180); // próxima ação em 4-7s
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
        if (typeof addScore === 'function') addScore(20); // inimigo derrotado
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
  // hitboxScale encolhe a caixa de colisão sem mudar o desenho — o drone
  // usa isso pra ela poder chegar perto e atirar sem encostar nele.
  var hs = cfg.hitboxScale || 1;
  var hw = (dims.width  * hs) / 2;
  var hh =  dims.height * hs;
  var cy = e.y - dims.height / 2; // centro vertical do sprite
  var eLeft = e.x - hw, eRight = e.x + hw;
  var eTop = cy - hh / 2, eBottom = cy + hh / 2;

  var pLeft = P.x - SPRITE_TARGET_HEIGHT.character * 0.25;
  var pRight = P.x + SPRITE_TARGET_HEIGHT.character * 0.25;
  var pTop = P.y - SPRITE_TARGET_HEIGHT.character;
  var pBottom = P.y;

  if (pRight > eLeft && pLeft < eRight && pBottom > eTop && pTop < eBottom) {
    playerGetHit();
    e.leaving = true; // tocou → vai embora pra sempre

    // drone: ao invés de seguir reto (que o manteria em cima dela),
    // volta pro modo patrol numa posição longe
    if (e.type === 'drone') {
      e.droneMode = 'patrol';
      e.x = P.x + (e.dir >= 0 ? 1100 : -1100);
      e.baseY = GROUND_Y - droneHoverOffset();
      e.y = e.baseY;
      e.leaving = false; // drone pode voltar pra dar nova passagem
      e.actionTimer = 300; // espera antes do próximo swoop
    }
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


// ═══════════════════════════════════════════════════════════════
// BARRIS — projéteis soltos pelo drone
// Caem, batem no chão e saem rolando. A Kiara pula por cima ou
// destrói com a fruta. Encostar deixa ela tonta, como qualquer inimigo.
// ═══════════════════════════════════════════════════════════════

var BARRIS = [];

var BARRIL_HEIGHT_PCT = 0.075;   // % da altura da tela
var BARRIL_ROLL_PCT   = 3.2 / 1920; // % da largura por frame (igual às velocidades dos inimigos)

function barrilAltura() {
  return Math.round(CANVAS.height * BARRIL_HEIGHT_PCT);
}

function spawnBarril(x, y) {
  BARRIS.push({
    x: x,
    y: y,
    vy: 0,
    dir: (P.x >= x) ? 1 : -1,   // rola em direção à Kiara
    landed: false,
    state: 'vazando',           // vazando (caindo) -> rolando (no chão)
    frame: 0,
    frameTimer: 0,
    removed: false
  });
}

function barrilDims(b) {
  var alt = barrilAltura();
  var key = (b.state === 'rolando') ? 'barril_rolando' : 'barril_vazando';
  var n = b.frame + 1;
  var img = IMAGES[key + '_' + (n < 10 ? '0' + n : n)];
  if (!img || !img.complete) return { width: alt, height: alt, img: null };
  var scale = alt / img.height;
  return { width: img.width * scale, height: alt, img: img };
}

function updateBarris() {
  var rollSpeed = BARRIL_ROLL_PCT * CANVAS.width;
  var alt = barrilAltura();

  for (var i = BARRIS.length - 1; i >= 0; i--) {
    var b = BARRIS[i];
    if (b.removed) { BARRIS.splice(i, 1); continue; }

    if (!b.landed) {
      b.vy += GRAVITY;
      b.y += b.vy;
      if (b.y >= GROUND_Y) {
        b.y = GROUND_Y;
        b.landed = true;
        b.state = 'rolando';
        b.frame = 0;
        b.frameTimer = 0;
      }
    } else {
      b.x += rollSpeed * b.dir;
    }

    // animação
    var totalFrames = (b.state === 'rolando') ? 6 : 5;
    b.frameTimer++;
    if (b.frameTimer >= FRAME_DELAY) {
      b.frameTimer = 0;
      b.frame = (b.frame + 1) % totalFrames;
    }

    // some quando fica longe demais
    if (Math.abs(P.x - b.x) > CANVAS.width * 1.6) { b.removed = true; continue; }

    var bw = alt * 0.45;
    var bLeft = b.x - bw, bRight = b.x + bw;
    var bTop = b.y - alt, bBottom = b.y;

    // fruta destrói o barril
    var quebrou = false;
    for (var f = FRUITS.length - 1; f >= 0; f--) {
      var fr = FRUITS[f];
      var fs = SPRITE_TARGET_HEIGHT.fruit;
      if (fr.x + fs / 2 > bLeft && fr.x - fs / 2 < bRight &&
          fr.y + fs / 2 > bTop && fr.y - fs / 2 < bBottom) {
        FRUITS.splice(f, 1);
        b.removed = true;
        quebrou = true;
        if (typeof addScore === 'function') addScore(15);
        break;
      }
    }
    if (quebrou) continue;

    // encostou na Kiara
    var pLeft = P.x - SPRITE_TARGET_HEIGHT.character * 0.25;
    var pRight = P.x + SPRITE_TARGET_HEIGHT.character * 0.25;
    var pTop = P.y - SPRITE_TARGET_HEIGHT.character;
    var pBottom = P.y;
    if (pRight > bLeft && pLeft < bRight && pBottom > bTop && pTop < bBottom) {
      playerGetHit();
      b.removed = true;
    }
  }
}

function drawBarris(ctx, cameraX) {
  for (var i = 0; i < BARRIS.length; i++) {
    var b = BARRIS[i];
    var d = barrilDims(b);
    if (!d.img) continue;
    drawSprite(ctx, d.img, b.x, b.y, barrilAltura(), b.dir, cameraX);
  }
}
