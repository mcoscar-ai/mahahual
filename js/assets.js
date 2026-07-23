// ═══════════════════════════════════════════════════════════════
// ASSETS.JS — Guardiões de Mahahual
// Carrega todas as imagens e áudios do repositório GitHub.
// Repositório: https://github.com/mcoscar-ai/mahahual
// ═══════════════════════════════════════════════════════════════

var BASE_URL = 'https://raw.githubusercontent.com/mcoscar-ai/mahahual/main/';

var IMAGES = {};   // todas as imagens carregadas, acessíveis por chave
var AUDIO = {};    // todos os áudios

var ASSETS_TOTAL = 0;
var ASSETS_LOADED = 0;
var ASSETS_FAILED = [];

// ── Helper: carrega uma imagem e guarda em IMAGES[key] ──────────
function loadImage(key, relativePath) {
  ASSETS_TOTAL++;
  var img = new Image();
  img.onload = function () { ASSETS_LOADED++; };
  img.onerror = function () {
    ASSETS_LOADED++;
    ASSETS_FAILED.push(relativePath);
    console.warn('❌ Falhou ao carregar imagem:', relativePath);
  };
  img.src = BASE_URL + relativePath;
  IMAGES[key] = img;
}

// ── Helper: carrega uma sequência numerada frame_01, frame_02... ─
// Ex: loadSequence('kiara_idle', 'sprites/kiara/kiara_idle_', 4)
// cria IMAGES.kiara_idle_01 ... IMAGES.kiara_idle_04
function loadSequence(prefix, relativeFolderPrefix, count) {
  for (var i = 1; i <= count; i++) {
    var n = i < 10 ? '0' + i : '' + i;
    loadImage(prefix + '_' + n, relativeFolderPrefix + n + '.png');
  }
}

// ── Helper: carrega áudio e guarda em AUDIO[key] ─────────────────
function loadAudio(key, relativePath) {
  ASSETS_TOTAL++;
  var a = new Audio();
  a.oncanplaythrough = function () { ASSETS_LOADED++; };
  a.onerror = function () {
    ASSETS_LOADED++;
    ASSETS_FAILED.push(relativePath);
    console.warn('⚠️ Áudio não encontrado (jogo continua sem ele):', relativePath);
  };
  a.src = BASE_URL + relativePath;
  a.load();
  AUDIO[key] = a;
}

// ═══════════════════════════════════════════════════════════════
// PERSONAGENS — Kiara, Ainhoa, Thiago
// Kiara/Ainhoa: 4 idle, 6 run, 4 jump, 3 throw, 3 dizzy
// Thiago:       4 idle, 6 run, 4 jump, 4 throw, 4 dizzy  (frames extras)
// ═══════════════════════════════════════════════════════════════

var CHAR_FRAME_COUNTS = {
  kiara:  { idle: 4, run: 6, jump: 4, throw: 3, dizzy: 3 },
  ainhoa: { idle: 4, run: 6, jump: 4, throw: 3, dizzy: 3 },
  thiago: { idle: 4, run: 6, jump: 4, throw: 4, dizzy: 4 }
};

function loadCharacter(name) {
  var counts = CHAR_FRAME_COUNTS[name];
  var folder = 'sprites/' + name + '/' + name + '_';
  loadSequence(name + '_idle',  folder + 'idle_',  counts.idle);
  loadSequence(name + '_run',   folder + 'run_',   counts.run);
  loadSequence(name + '_jump',  folder + 'jump_',  counts.jump);
  loadSequence(name + '_throw', folder + 'throw_', counts.throw);
  loadSequence(name + '_dizzy', folder + 'dizzy_', counts.dizzy);
}

loadCharacter('kiara');
loadCharacter('ainhoa');
loadCharacter('thiago');

// Fruta lançada por cada personagem (definida na tela de seleção)
var CHARACTER_FRUIT = {
  kiara: 'mango',    // mamey
  ainhoa: 'pitaya',
  thiago: 'coco'
};

// ═══════════════════════════════════════════════════════════════
// INIMIGOS COMUNS
// ═══════════════════════════════════════════════════════════════

// 🚜 Bulldozer — anda, leva hit, vira árvore
loadSequence('bulldozer_move',      'enemies/bulldozer_move_',      4);
loadSequence('bulldozer_hit',       'enemies/bulldozer_hit_',       2);
loadSequence('bulldozer_transform', 'enemies/bulldozer_transform_', 5);

// 🚛 Caminhão madeireiro — só desvia, sem hit/derrota
loadSequence('caminhao_move', 'enemies/caminhao_move_', 3);

// 🚁 Drone vigilante
loadSequence('drone_hover',        'enemies/drone_hover_',        4);
loadSequence('drone_drop_barrel',  'enemies/drone_drop_barrel_',  4);
loadSequence('drone_swarm_attack', 'enemies/drone_swarm_attack_', 4);

// 🤖 Robô plaqueiro
loadSequence('robot_walk',      'enemies/robot_walk_',      6);
loadSequence('robot_sign_plant','enemies/robot_sign_plant_',5);
loadSequence('robot_idle_hit',  'enemies/robot_idle_hit_',  5);

// ═══════════════════════════════════════════════════════════════
// BOSSES
// ═══════════════════════════════════════════════════════════════

// Boss Z1 — Super Bulldozer (10 frutas)
loadSequence('boss_bulldozer_move', 'enemies/boss_bulldozer_move_', 3);
loadSequence('boss_bulldozer_hit',  'enemies/boss_bulldozer_hit_',  3);
loadImage('boss_bulldozer_defeated_01', 'enemies/boss_bulldozer_defeated_01.png');

// Boss Z2 — Drone Chefão (8 frutas)
loadSequence('bossdrone_hover',     'enemies/bossdrone_hover_',     4);
loadSequence('bossdrone_drop_item', 'enemies/bossdrone_drop_item_', 4);
loadSequence('bossdrone_crash',     'enemies/bossdrone_crash_',     2);

// Boss Z3 — Robô Supervisor (12 frutas)
loadSequence('bossrobot_walk',      'enemies/bossrobot_walk_',      6);
loadSequence('bossrobot_sign_hold', 'enemies/bossrobot_sign_hold_', 6);
loadSequence('bossrobot_destroy',   'enemies/bossrobot_destroy_',   5);

// ═══════════════════════════════════════════════════════════════
// ITENS
// ═══════════════════════════════════════════════════════════════

// Barril — solto pelo Drone/Boss Drone
loadSequence('barril_vazando', 'items/barril_vazando_', 5);  // obstáculo parado
loadSequence('barril_rolando', 'items/barril_rolando_', 6);  // animação de rotação

// Frutas — projétil de arremesso (uma por personagem)
loadSequence('mango',  'items/mango_',  4);
loadSequence('pitaya', 'items/pitaya_', 4);
loadSequence('coco',   'items/coco_',   4);

// Lixo colecionável (chão +50 / drop de inimigo +20)
loadSequence('botella', 'items/botella_', 4);
loadSequence('lata',    'items/lata_',    4);
loadSequence('bolsa',   'items/bolsa_',   4);

// ═══════════════════════════════════════════════════════════════
// MEMORAMA — 12 cartas (Puzzle Z2)
// ═══════════════════════════════════════════════════════════════

var MEMORAMA_ANIMALS = [
  'caiman', 'capivara', 'guacamayo_azul', 'jaguar',
  'mono_capuchino', 'oso_hormiguero', 'perezoso', 'rana_arborea',
  'serpiente_verde', 'tatu', 'titi', 'tucano'
];
MEMORAMA_ANIMALS.forEach(function (name) {
  loadImage('memorama_' + name, 'memorama/memorama_' + name + '.png');
});

// ═══════════════════════════════════════════════════════════════
// PUZZLES DE ENCAIXE (Puzzle Z1 — dificuldade por personagem)
// ═══════════════════════════════════════════════════════════════

// Nível 1 — Capivara — 4 peças com encaixe macho/fêmea
['TL', 'TR', 'BL', 'BR'].forEach(function (p) {
  loadImage('puzzle_capivara_' + p, 'puzzle/capivara/capivara_piece_' + p + '.png');
});
loadImage('puzzle_capivara_reference', 'puzzle/capivara/capivara_reference.png');

// Nível 2 — Jaguar — 8 peças, grid reto
loadSequence('puzzle_jaguar_piece', 'puzzle/jaguar/jaguar_piece_', 8);
loadImage('puzzle_jaguar_reference', 'puzzle/jaguar/jaguar_reference.png');

// Nível 3 — Tucano — 8 peças, grid reto
loadSequence('puzzle_tucano_piece', 'puzzle/tucano/tucano_piece_', 8);
loadImage('puzzle_tucano_reference', 'puzzle/tucano/tucano_reference.png');

// Animais da selva de Tulum — peças com aba, cortadas do original
loadSequence('puzzle_coati_piece', 'puzzle/coati/coati_piece_', 4);
loadImage('puzzle_coati_reference', 'puzzle/coati/coati_reference.png');
loadSequence('puzzle_iguana_piece', 'puzzle/iguana/iguana_piece_', 6);
loadImage('puzzle_iguana_reference', 'puzzle/iguana/iguana_reference.png');
loadSequence('puzzle_flamenco_piece', 'puzzle/flamenco/flamenco_piece_', 8);
loadImage('puzzle_flamenco_reference', 'puzzle/flamenco/flamenco_reference.png');
loadSequence('puzzle_pavo_piece', 'puzzle/pavo/pavo_piece_', 9);
loadImage('puzzle_pavo_reference', 'puzzle/pavo/pavo_reference.png');
loadSequence('puzzle_cenzontle_piece', 'puzzle/cenzontle/cenzontle_piece_', 12);
loadImage('puzzle_cenzontle_reference', 'puzzle/cenzontle/cenzontle_reference.png');
loadSequence('puzzle_tortuga_piece', 'puzzle/tortuga/tortuga_piece_', 16);
loadImage('puzzle_tortuga_reference', 'puzzle/tortuga/tortuga_reference.png');


// ═══════════════════════════════════════════════════════════════
// BACKGROUNDS E TELAS
// ═══════════════════════════════════════════════════════════════

loadImage('bg_zona1', 'bg_zona1.png');
loadImage('bg_zona2', 'bg_zona2.png');
loadImage('bg_zona3', 'bg_zona3.png');

loadImage('screen_title',             'screen_title.png');
loadImage('screen_character_select',  'screen_character_select.png');
loadImage('screen_zone_complete',     'screen_zone_complete.png');
loadImage('screen_win',               'screen_win.png');

// ═══════════════════════════════════════════════════════════════
// ÁUDIO
// ═══════════════════════════════════════════════════════════════

loadAudio('music_intro',  'audio/music_intro.ogg');
loadAudio('music_zone1',  'audio/music_zone1.mp3');
loadAudio('music_zone2',  'audio/music_zone2.wav');
loadAudio('music_zone3',  'audio/music_zone3.mp3');
loadAudio('music_puzzle', 'audio/music_puzzle.mp3');
loadAudio('music_win',    'audio/music_win.ogg');

loadAudio('sfx_jump', 'audio/sfx_jump.ogg');
loadAudio('sfx_hit',  'audio/sfx_hit.wav');
// Observação: sfx_throw, sfx_collect, sfx_dizzy, sfx_puzzle, sfx_tree ainda
// não existem no repositório. O jogo funciona normalmente sem eles —
// playSFX() simplesmente não toca nada se a chave não existir em AUDIO.

// ═══════════════════════════════════════════════════════════════
// STATUS DE CARREGAMENTO (debug no console)
// ═══════════════════════════════════════════════════════════════

function checkAssetsLoaded(callback) {
  var checkInterval = setInterval(function () {
    if (ASSETS_LOADED >= ASSETS_TOTAL) {
      clearInterval(checkInterval);
      console.log('✅ Assets carregados: ' + (ASSETS_TOTAL - ASSETS_FAILED.length) + '/' + ASSETS_TOTAL);
      if (ASSETS_FAILED.length > 0) {
        console.warn('⚠️ ' + ASSETS_FAILED.length + ' arquivo(s) não encontrado(s):', ASSETS_FAILED);
      }
      if (callback) callback();
    }
  }, 100);
}
