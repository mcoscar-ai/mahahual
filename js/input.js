// ═══════════════════════════════════════════════════════════════
// INPUT.JS — Guardiões de Mahahual
// Mesma arquitetura de controles do Gabriel: teclado (PC) + botões
// digitais estilo SNES (mobile), com elementFromPoint para deslize
// suave entre botões e layoutBtns() reposicionando em resize/rotação.
// ═══════════════════════════════════════════════════════════════

var KEYS = { left: false, right: false, jump: false, throw: false };

var IS_MOBILE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
                ('ontouchstart' in window && window.innerWidth < 1024);

// ── TECLADO (PC) ──────────────────────────────────────────────
window.addEventListener('keydown', function (e) {
  switch (e.code) {
    case 'ArrowLeft': case 'KeyA': KEYS.left = true; break;
    case 'ArrowRight': case 'KeyD': KEYS.right = true; break;
    case 'ArrowUp': case 'KeyW': case 'Space': KEYS.jump = true; e.preventDefault(); break;
    case 'KeyX': case 'KeyZ': KEYS.throw = true; break;
  }
});

window.addEventListener('keyup', function (e) {
  switch (e.code) {
    case 'ArrowLeft': case 'KeyA': KEYS.left = false; break;
    case 'ArrowRight': case 'KeyD': KEYS.right = false; break;
    case 'ArrowUp': case 'KeyW': case 'Space': KEYS.jump = false; break;
    case 'KeyX': case 'KeyZ': KEYS.throw = false; break;
  }
});

// ── BOTÕES MOBILE (estilo SNES) ──────────────────────────────
var mobileControls = document.createElement('div');
mobileControls.id = 'mobile-controls';
mobileControls.style.cssText = 'position:fixed; inset:0; pointer-events:none; z-index:1000; display:' + (IS_MOBILE ? 'block' : 'none') + ';';
document.body.appendChild(mobileControls);

function makeBtn(id, label) {
  var b = document.createElement('div');
  b.id = id;
  b.textContent = label;
  b.style.cssText =
    'position:absolute; pointer-events:auto; display:flex; align-items:center; justify-content:center;' +
    'border-radius:50%; font-family:sans-serif; font-weight:bold; color:#fff; user-select:none;' +
    'touch-action:none; -webkit-tap-highlight-color:transparent;';
  mobileControls.appendChild(b);
  return b;
}

var btnLeft  = makeBtn('btn-left',  '◄');
var btnRight = makeBtn('btn-right', '►');
var btnJump  = makeBtn('btn-jump',  '▲');
var btnThrow = makeBtn('btn-throw', '🍈');

btnLeft.style.background  = 'rgba(60,60,60,0.55)';
btnRight.style.background = 'rgba(60,60,60,0.55)';
btnJump.style.background  = 'rgba(40,110,220,0.75)';   // azul, igual ao Gabriel
btnThrow.style.background = 'rgba(220,60,50,0.75)';    // vermelho, igual ao Gabriel

// ── layoutBtns(): reposiciona tudo baseado no tamanho ATUAL da tela ──
function layoutBtns() {
  var W = window.innerWidth;
  var H = window.innerHeight;

  // Tamanho dos controles: 24% da menor dimensão da tela.
  // Referência: Apple HIG pede no mínimo 44pt e o Material Design 48dp,
  // mas isso vale pra interface comum. Controle de jogo de ação, apertado
  // repetidamente e sem olhar, precisa de bem mais — e criança pequena,
  // com coordenação fina em formação, precisa de mais ainda.
  // Antes estava em 0.14 (~50px num celular), quase no mínimo absoluto.
  // Agora dá ~86px no mesmo aparelho, com limites pra não ficar minúsculo
  // em telas pequenas nem exagerado em tablet.
  var base = Math.min(W, H);
  var size = Math.min(Math.max(base * 0.24, 64), 120);
  var gap  = Math.max(base * 0.045, 14);   // espaço entre botões evita toque errado
  var margin = size * 0.30;

  [btnLeft, btnRight, btnJump, btnThrow].forEach(function (b) {
    b.style.width = size + 'px';
    b.style.height = size + 'px';
    b.style.fontSize = (size * 0.45) + 'px';
  });

  // D-pad esquerda/direita — lado esquerdo da tela
  btnLeft.style.left   = margin + 'px';
  btnLeft.style.bottom = margin + 'px';
  btnRight.style.left  = (margin + size + gap) + 'px';
  btnRight.style.bottom = margin + 'px';

  // Pulo + arremesso — lado direito da tela, JUNTOS (igual ao Gabriel)
  btnThrow.style.right  = margin + 'px';
  btnThrow.style.bottom = margin + 'px';
  btnJump.style.right   = (margin + size + gap) + 'px';
  btnJump.style.bottom  = margin + 'px';
}

layoutBtns();
window.addEventListener('resize', layoutBtns);
window.addEventListener('orientationchange', function () {
  setTimeout(layoutBtns, 200); // espera o browser terminar a rotação
});

// ── elementFromPoint: permite deslizar o dedo entre botões ──────
// sem precisar soltar e tocar de novo, como um controle físico.
var activeTouches = {}; // pointerId -> nome do botão que está pressionando

function btnNameFromElement(el) {
  if (!el) return null;
  if (el.id === 'btn-left') return 'left';
  if (el.id === 'btn-right') return 'right';
  if (el.id === 'btn-jump') return 'jump';
  if (el.id === 'btn-throw') return 'throw';
  return null;
}

function setKey(name, val) {
  if (name) KEYS[name] = val;
}

// ── Pointer Events direto em cada botão ──────────────────────────
// Mais confiável que touchstart+elementFromPoint sozinho: o navegador
// já resolve o hit-test correto no pointerdown, mesmo quando a barra
// de endereço do celular expande/recolhe e desalinha coordenadas.
var ALL_BTNS = [btnLeft, btnRight, btnJump, btnThrow];

ALL_BTNS.forEach(function (b) {
  var name = btnNameFromElement(b);
  b.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    if (b.setPointerCapture) {
      try { b.setPointerCapture(e.pointerId); } catch (err) {}
    }
    activeTouches[e.pointerId] = name;
    setKey(name, true);
  }, { passive: false });
});

function releasePointer(e) {
  var name = activeTouches[e.pointerId];
  if (name) setKey(name, false);
  delete activeTouches[e.pointerId];
}

mobileControls.addEventListener('pointerup', releasePointer);
mobileControls.addEventListener('pointercancel', releasePointer);
window.addEventListener('pointerup', releasePointer);
window.addEventListener('pointercancel', releasePointer);

// Deslize suave entre botões (ex: solta esquerda e desliza pra direita
// sem tirar o dedo da tela) — só reavalia enquanto o ponteiro já está
// pressionado em algum botão rastreado.
mobileControls.addEventListener('pointermove', function (e) {
  if (!(e.pointerId in activeTouches)) return;
  var el = document.elementFromPoint(e.clientX, e.clientY);
  var newName = btnNameFromElement(el);
  var oldName = activeTouches[e.pointerId];
  if (newName !== oldName) {
    setKey(oldName, false);
    setKey(newName, true);
    activeTouches[e.pointerId] = newName;
  }
});

// ── Fallback touch (navegadores antigos sem Pointer Events) ─────
mobileControls.addEventListener('touchstart', function (e) {
  if (window.PointerEvent) return; // Pointer Events já cuidam disso
  e.preventDefault();
  for (var i = 0; i < e.changedTouches.length; i++) {
    var t = e.changedTouches[i];
    var el = document.elementFromPoint(t.clientX, t.clientY);
    var name = btnNameFromElement(el);
    activeTouches[t.identifier] = name;
    setKey(name, true);
  }
}, { passive: false });

mobileControls.addEventListener('touchmove', function (e) {
  if (window.PointerEvent) return;
  e.preventDefault();
  for (var i = 0; i < e.changedTouches.length; i++) {
    var t = e.changedTouches[i];
    var el = document.elementFromPoint(t.clientX, t.clientY);
    var newName = btnNameFromElement(el);
    var oldName = activeTouches[t.identifier];
    if (newName !== oldName) {
      setKey(oldName, false);   // solta o botão antigo
      setKey(newName, true);    // pressiona o novo (deslize suave)
      activeTouches[t.identifier] = newName;
    }
  }
}, { passive: false });

function handleTouchEnd(e) {
  if (window.PointerEvent) return;
  e.preventDefault();
  for (var i = 0; i < e.changedTouches.length; i++) {
    var t = e.changedTouches[i];
    var name = activeTouches[t.identifier];
    setKey(name, false);
    delete activeTouches[t.identifier];
  }
}
mobileControls.addEventListener('touchend', handleTouchEnd, { passive: false });
mobileControls.addEventListener('touchcancel', handleTouchEnd, { passive: false });

// ── Evita que o navegador arraste/dê zoom na tela durante o jogo ──
document.addEventListener('touchmove', function (e) {
  if (IS_MOBILE) e.preventDefault();
}, { passive: false });
