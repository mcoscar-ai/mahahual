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

function drawHUD(ctx) {
  // Só aparece durante o jogo — nas telas de transição atrapalharia
  if (typeof GAME === 'undefined' || GAME.state !== 'playing') return;

  var W = CANVAS.width;
  var H = CANVAS.height;
  var pad = Math.round(H * 0.025);
  var barH = Math.round(H * 0.030);
  var painelH = Math.round(H * 0.075);

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

  // ── Nome da zona (à direita do botão) ──────────────────────
  var zonaCfg = (typeof ZONES !== 'undefined') ? ZONES[GAME.zone] : null;
  var nomeZona = zonaCfg ? zonaCfg.name : '';
  var fonteZona = Math.round(H * 0.042);

  ctx.font = 'bold ' + fonteZona + 'px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  var painelX = pad * 2 + btnS;
  var rotulo = 'Zona ' + GAME.zone;
  var larguraRotulo = ctx.measureText(rotulo).width;

  // A barra de progresso é centralizada; o painel não pode alcançá-la.
  // Sem este limite, nomes longos (ex: "O Coração de Mahahual") passavam
  // por baixo da barra.
  var barWprev = Math.round(W * 0.34);
  var limiteDireito = (W - barWprev) / 2 - pad;
  var larguraMax = limiteDireito - painelX;

  // encurta o nome com reticências se não couber
  var nomeVis = nomeZona;
  var espacoNome = larguraMax - larguraRotulo - pad * 2.4;
  if (ctx.measureText(nomeVis).width > espacoNome) {
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
  var barW = Math.round(W * 0.34);
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
  }
});
