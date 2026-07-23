// ═══════════════════════════════════════════════════════════════
// HUD.JS — Guardiões de Mahahual
// Pontuação, nome da zona e barra de progresso.
//
// Carregado DEPOIS de game.js (usa GAME, ZONES e zoneProgress).
// renderer.js já chama drawHUD(CTX) a cada frame se ela existir.
//
// Público-alvo de 5 a 9 anos: tudo grande, alto contraste e com
// pouca informação. A barra de progresso é o elemento mais
// importante — é ela que mostra à criança que está avançando.
// ═══════════════════════════════════════════════════════════════

// Desenha retângulo de cantos arredondados (sem depender de
// CTX.roundRect, que não existe em navegadores mais antigos).
function hudRoundRect(ctx, x, y, w, h, r) {
  if (r > w / 2) r = w / 2;
  if (r > h / 2) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Área do botão de sair, preenchida a cada frame (usada pelo toque)
var HUD_EXIT_RECT = { x: 0, y: 0, w: 0, h: 0 };
var HUD_SOM_RECT  = { x: 0, y: 0, w: 0, h: 0 };

function drawHUD(ctx) {
  // Só aparece durante o jogo — nas telas de transição atrapalharia
  if (typeof GAME === 'undefined' || GAME.state !== 'playing') return;

  var W = CANVAS.width;
  var H = CANVAS.height;
  var pad = Math.round(H * 0.025);
  var barH = Math.round(H * 0.030);
  var painelH = Math.round(H * 0.075);
  // Barra um pouco mais estreita que antes (0.34) pra sobrar espaço ao nome
  var BAR_PROGRESSO_W = Math.round(W * 0.28);

  // ── Botão de sair (casinha, canto superior esquerdo) ───────
  var btnS = painelH;
  HUD_EXIT_RECT = { x: pad, y: pad, w: btnS, h: btnS };

  ctx.fillStyle = 'rgba(12, 45, 22, 0.62)';
  hudRoundRect(ctx, pad, pad, btnS, btnS, btnS / 2);
  ctx.fill();

  // casinha desenhada
  var hcx = pad + btnS / 2;
  var hcy = pad + btnS / 2;
  var r = btnS * 0.26;
  ctx.fillStyle = '#ffd75e';
  ctx.beginPath();
  ctx.moveTo(hcx, hcy - r * 1.1);
  ctx.lineTo(hcx + r * 1.15, hcy);
  ctx.lineTo(hcx - r * 1.15, hcy);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(hcx - r * 0.72, hcy, r * 1.44, r * 1.0);
  ctx.fillStyle = 'rgba(12, 45, 22, 0.85)';
  ctx.fillRect(hcx - r * 0.24, hcy + r * 0.28, r * 0.48, r * 0.72);

  // ── Botão de som (ao lado da casinha) ──────────────────────
  var somX = pad * 2 + btnS;
  HUD_SOM_RECT = { x: somX, y: pad, w: btnS, h: btnS };

  ctx.fillStyle = 'rgba(12, 45, 22, 0.62)';
  hudRoundRect(ctx, somX, pad, btnS, btnS, btnS / 2);
  ctx.fill();

  var scx = somX + btnS / 2;
  var scy = pad + btnS / 2;
  var sr = btnS * 0.24;
  var ligado = (typeof AUDIO_LIGADO === 'undefined') ? true : AUDIO_LIGADO;

  // alto-falante
  ctx.fillStyle = ligado ? '#ffd75e' : '#8d9b8f';
  ctx.beginPath();
  ctx.moveTo(scx - sr * 0.9, scy - sr * 0.32);
  ctx.lineTo(scx - sr * 0.35, scy - sr * 0.32);
  ctx.lineTo(scx + sr * 0.25, scy - sr * 0.95);
  ctx.lineTo(scx + sr * 0.25, scy + sr * 0.95);
  ctx.lineTo(scx - sr * 0.35, scy + sr * 0.32);
  ctx.lineTo(scx - sr * 0.9, scy + sr * 0.32);
  ctx.closePath();
  ctx.fill();

  if (ligado) {
    // ondas de som
    ctx.strokeStyle = '#ffd75e';
    ctx.lineWidth = Math.max(2, btnS * 0.06);
    for (var w = 1; w <= 2; w++) {
      ctx.beginPath();
      ctx.arc(scx + sr * 0.35, scy, sr * (0.35 + w * 0.32), -Math.PI / 3, Math.PI / 3);
      ctx.stroke();
    }
  } else {
    // X de mudo
    ctx.strokeStyle = '#e8622b';
    ctx.lineWidth = Math.max(2, btnS * 0.08);
    ctx.beginPath();
    ctx.moveTo(scx + sr * 0.5, scy - sr * 0.5);
    ctx.lineTo(scx + sr * 1.15, scy + sr * 0.5);
    ctx.moveTo(scx + sr * 1.15, scy - sr * 0.5);
    ctx.lineTo(scx + sr * 0.5, scy + sr * 0.5);
    ctx.stroke();
  }

  // ── Nome da zona (à direita dos botões) ────────────────────
  var zonaCfg = (typeof ZONES !== 'undefined') ? ZONES[GAME.zone] : null;
  var nomeZona = zonaCfg ? zonaCfg.name : '';

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  var painelX = pad * 3 + btnS * 2;
  var rotulo = 'Zona ' + GAME.zone;

  // A barra de progresso é centralizada; o painel não pode alcançá-la.
  var limiteDireito = (W - BAR_PROGRESSO_W) / 2 - pad;
  var larguraMax = limiteDireito - painelX;

  // Em vez de cortar o nome com reticências, DIMINUI a fonte até caber.
  // Nomes como "El Corazón de Mahahual" ficavam como "El Corazón ...".
  var fonteZona = Math.round(H * 0.042);
  var fonteMin = Math.round(H * 0.026);
  var larguraRotulo, larguraNome;

  while (true) {
    ctx.font = 'bold ' + fonteZona + 'px sans-serif';
    larguraRotulo = ctx.measureText(rotulo).width;
    larguraNome = ctx.measureText(nomeZona).width;
    if (larguraRotulo + larguraNome + pad * 2.4 <= larguraMax) break;
    if (fonteZona <= fonteMin) break;
    fonteZona -= 1;
  }

  // Só corta se nem na menor fonte couber (nome muito longo)
  var nomeVis = nomeZona;
  var espacoNome = larguraMax - larguraRotulo - pad * 2.4;
  if (larguraNome > espacoNome) {
    while (nomeVis.length > 1 && ctx.measureText(nomeVis + '…').width > espacoNome) {
      nomeVis = nomeVis.slice(0, -1);
    }
    if (nomeVis.length < nomeZona.length) nomeVis += '…';
  }

  var painelW = larguraRotulo + ctx.measureText(nomeVis).width + pad * 2.4;
  if (painelW > larguraMax) painelW = larguraMax;

  ctx.fillStyle = 'rgba(12, 45, 22, 0.62)';
  hudRoundRect(ctx, painelX, pad, painelW, painelH, painelH / 2);
  ctx.fill();

  ctx.fillStyle = '#ffd75e';
  ctx.fillText(rotulo, painelX + pad * 0.8, pad + painelH / 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(nomeVis, painelX + pad * 0.8 + larguraRotulo + pad * 0.6, pad + painelH / 2);

  // ── Pontuação (canto superior direito) ─────────────────────
  var pontos = String(GAME.score);
  var fontePontos = Math.round(H * 0.055);
  ctx.font = 'bold ' + fontePontos + 'px sans-serif';
  var larguraPontos = ctx.measureText(pontos).width;
  var painelPontosW = larguraPontos + pad * 3.4;

  ctx.fillStyle = 'rgba(12, 45, 22, 0.62)';
  hudRoundRect(ctx, W - pad - painelPontosW, pad, painelPontosW, painelH, painelH / 2);
  ctx.fill();

  // folha decorativa antes do número
  var cx = W - pad - painelPontosW + pad * 1.1;
  var cy = pad + painelH / 2;
  var rf = painelH * 0.20;
  ctx.fillStyle = '#7fd36b';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rf, rf * 0.62, -Math.PI / 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'right';
  ctx.fillText(pontos, W - pad * 1.7, cy);

  // ── Barra de progresso (centro superior) ───────────────────
  var progresso = (typeof zoneProgress === 'function') ? zoneProgress() : 0;
  var barW = BAR_PROGRESSO_W;
  var barX = Math.round((W - barW) / 2);
  var barY = pad + Math.round(painelH * 0.28);

  // trilho
  ctx.fillStyle = 'rgba(12, 45, 22, 0.62)';
  hudRoundRect(ctx, barX, barY, barW, barH, barH / 2);
  ctx.fill();

  // preenchimento
  var fillW = Math.max(barH, Math.round(barW * progresso));
  var grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  grad.addColorStop(0, '#7fd36b');
  grad.addColorStop(1, '#ffd75e');
  ctx.fillStyle = grad;
  hudRoundRect(ctx, barX, barY, fillW, barH, barH / 2);
  ctx.fill();

  // marcador da Kiara na posição atual
  var mx = barX + fillW;
  var my = barY + barH / 2;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(mx, my, barH * 0.78, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8622b';
  ctx.beginPath();
  ctx.arc(mx, my, barH * 0.48, 0, Math.PI * 2);
  ctx.fill();

  // bandeirinha de chegada no fim da trilha
  var fx = barX + barW + barH * 0.55;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(fx, barY - barH * 0.35, Math.max(2, barH * 0.14), barH * 1.7);
  ctx.fillStyle = '#e8622b';
  ctx.beginPath();
  ctx.moveTo(fx + barH * 0.14, barY - barH * 0.35);
  ctx.lineTo(fx + barH * 0.95, barY);
  ctx.lineTo(fx + barH * 0.14, barY + barH * 0.35);
  ctx.closePath();
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  if (typeof drawBossHealth === 'function') drawBossHealth(ctx);
}


// ── Toque no botão de sair ───────────────────────────────────
// Volta ao título (que leva de novo à seleção de personagem).
CANVAS.addEventListener('pointerdown', function (e) {
  if (typeof GAME === 'undefined' || GAME.state !== 'playing') return;
  var rect = CANVAS.getBoundingClientRect();
  var sx = (e.clientX - rect.left) * (CANVAS.width / rect.width);
  var sy = (e.clientY - rect.top) * (CANVAS.height / rect.height);
  var b = HUD_EXIT_RECT;
  if (sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h) {
    GAME.state = 'title';
    GAME.score = 0;
    return;
  }

  var m = HUD_SOM_RECT;
  if (sx >= m.x && sx <= m.x + m.w && sy >= m.y && sy <= m.y + m.h) {
    if (typeof alternarAudio === 'function') alternarAudio();
  }
});
