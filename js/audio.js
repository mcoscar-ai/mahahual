// ═══════════════════════════════════════════════════════════════
// AUDIO.JS — Guardiões de Mahahual
// Música por zona e efeitos sonoros.
//
// Carregado DEPOIS de assets.js (usa AUDIO) e antes de game.js usar
// playMusic. O resto do código já chama playSFX() em vários pontos —
// até agora essas chamadas não faziam nada porque a função não existia.
//
// Dois detalhes que este módulo resolve:
//  1) Navegadores bloqueiam áudio até o primeiro toque do usuário.
//     Destravamos no primeiro pointerdown/keydown.
//  2) Só existem sfx_jump e sfx_hit na pasta audio/. Os outros efeitos
//     usam um substituto parecido até os arquivos definitivos existirem.
// ═══════════════════════════════════════════════════════════════

var AUDIO_LIGADO = true;

// Efeitos sonoros DESLIGADOS. Hoje só existem sfx_jump e sfx_hit, e eles
// acabavam repetindo o tempo todo (o mesmo som servia pra pulo, arremesso,
// coleta e estrela), o que ficava cansativo por cima da música.
// Quando os arquivos definitivos de cada efeito existirem, é só trocar
// esta linha para true — o resto do módulo já está pronto.
var SFX_LIGADO = false;
var AUDIO_DESTRAVADO = false;
var MUSICA_ATUAL = null;      // chave da música tocando
var MUSICA_OBJ = null;        // elemento Audio em reprodução

var VOLUME_MUSICA = 0.75;     // música em primeiro plano
var VOLUME_SFX = 0.40;        // base dos efeitos, ajustada por chave abaixo

// Volume próprio de cada efeito (multiplica VOLUME_SFX).
// Os que tocam o tempo todo — pulo, arremesso, coleta — ficam bem
// baixos, senão viram um matraquear constante por cima da música.
// Os raros e importantes (estrela, boss derrotado) podem se destacar.
var VOLUME_POR_SFX = {
  sfx_jump:        0.28,
  sfx_throw:       0.34,
  sfx_coleta:      0.45,
  sfx_dizzy:       0.85,
  sfx_boss_hit:    0.75,
  sfx_boss_defeat: 1.00,
  sfx_star:        1.00,
  sfx_hit:         0.80
};

// Efeitos que ainda não têm arquivo próprio usam um parecido.
// Quando o .ogg/.wav definitivo entrar em assets.js, o mapa deixa de
// ser usado automaticamente (só vale quando a chave real não existe).
var SFX_SUBSTITUTO = {
  sfx_throw:       'sfx_jump',
  sfx_coleta:      'sfx_jump',
  sfx_star:        'sfx_jump',
  sfx_dizzy:       'sfx_hit',
  sfx_boss_hit:    'sfx_hit',
  sfx_boss_defeat: 'sfx_hit'
};

// Evita que o mesmo efeito dispare dezenas de vezes por segundo
// (ex: fruta em sequência) e vire ruído.
var SFX_INTERVALO_MS = 60;
var sfxUltimo = {};

// ── Destravar áudio no primeiro toque ────────────────────────
function destravarAudio() {
  if (AUDIO_DESTRAVADO) return;
  AUDIO_DESTRAVADO = true;
  // Se havia música pedida antes do toque, começa agora
  if (MUSICA_ATUAL) {
    var chave = MUSICA_ATUAL;
    MUSICA_ATUAL = null;
    playMusic(chave);
  }
}

window.addEventListener('pointerdown', destravarAudio, { once: false });
window.addEventListener('keydown', destravarAudio, { once: false });
window.addEventListener('touchstart', destravarAudio, { once: false });

// ── Efeitos sonoros ──────────────────────────────────────────
function playSFX(chave) {
  if (!SFX_LIGADO) return;
  if (!AUDIO_LIGADO || !AUDIO_DESTRAVADO) return;

  var real = (AUDIO[chave]) ? chave : SFX_SUBSTITUTO[chave];
  var base = real ? AUDIO[real] : null;
  if (!base) return;

  var agora = Date.now();
  if (sfxUltimo[real] && agora - sfxUltimo[real] < SFX_INTERVALO_MS) return;
  sfxUltimo[real] = agora;

  try {
    // clona pra permitir sons sobrepostos (o original cortaria o anterior)
    var som = base.cloneNode();
    // volume pela chave PEDIDA (não pelo substituto): assim sfx_throw
    // continua baixo mesmo tocando o arquivo do pulo
    var mult = VOLUME_POR_SFX[chave];
    if (mult === undefined) mult = VOLUME_POR_SFX[real];
    if (mult === undefined) mult = 1;
    som.volume = Math.max(0, Math.min(1, VOLUME_SFX * mult));
    var p = som.play();
    if (p && p.catch) p.catch(function () {});
  } catch (e) {
    // som nunca deve derrubar o jogo
  }
}

// ── Música ───────────────────────────────────────────────────
function playMusic(chave) {
  if (MUSICA_ATUAL === chave) return;   // já está tocando essa
  stopMusic();
  MUSICA_ATUAL = chave;

  if (!AUDIO_LIGADO || !AUDIO_DESTRAVADO) return; // toca quando destravar

  var faixa = AUDIO[chave];
  if (!faixa) return;

  try {
    MUSICA_OBJ = faixa;
    MUSICA_OBJ.loop = true;
    MUSICA_OBJ.volume = VOLUME_MUSICA;
    MUSICA_OBJ.currentTime = 0;
    var p = MUSICA_OBJ.play();
    if (p && p.catch) p.catch(function () {});
  } catch (e) {}
}

function stopMusic() {
  if (MUSICA_OBJ) {
    try { MUSICA_OBJ.pause(); } catch (e) {}
    MUSICA_OBJ = null;
  }
}

// ── Trilha certa para cada momento ───────────────────────────
// Chamada a cada frame pelo game.js: troca a música só quando o
// destino muda, então é barato e não precisa caçar cada transição.
function atualizarMusica() {
  if (typeof GAME === 'undefined') return;
  var desejada;

  switch (GAME.state) {
    case 'title':
    case 'select':        desejada = 'music_intro'; break;
    case 'win':           desejada = 'music_win';   break;
    case 'puzzle':        desejada = 'music_puzzle'; break;
    case 'zone_complete': desejada = 'music_intro'; break;
    case 'playing':       desejada = 'music_zone' + GAME.zone; break;
    case 'relampago':        desejada = 'music_zone1'; break;
    case 'relampago_result': desejada = 'music_intro'; break;
    case 'menu_memoria':
    case 'menu_puzzle':   desejada = 'music_intro'; break;
    default:              return;
  }

  if (desejada !== MUSICA_ATUAL) playMusic(desejada);
}

// ── Liga/desliga ─────────────────────────────────────────────
function alternarAudio() {
  AUDIO_LIGADO = !AUDIO_LIGADO;
  if (!AUDIO_LIGADO) {
    stopMusic();
  } else {
    var chave = MUSICA_ATUAL;
    MUSICA_ATUAL = null;
    if (chave) playMusic(chave);
  }
  return AUDIO_LIGADO;
}
