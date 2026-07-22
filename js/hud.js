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

function drawHUD(ctx) {
  // Só aparece durante o jogo — nas telas de transição atrapalharia
  if (typeof GAME === 'undefined' || GAME.state !== 'playing') return;

  var W = CANVAS.width;
  var H = CANVAS.height;
  var pad = Math.round(H * 0.025);
  var barH = Math.round(H * 0.030);

  // ── Nome da zona (canto superior esquerdo) ─────────────────
  var zonaCfg = (typeof ZONES !== 'undefined') ? ZONES[GAME.zone] : null;
  var nomeZona = zonaCfg ? zonaCfg.name : '';
  var fonteZona = Math.round(H * 0.042);

  ctx.font = 'bold ' + fonteZona + 'px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  var rotulo = 'Zona ' + GAME.zone;
  var larguraRotulo = ctx.measureText(rotulo).width;
  var larguraNome = ctx.measureText(nomeZona).width;
  var painelW = larguraRotulo + larguraNome + pad * 2.6;
  var painelH = Math.round(H * 0.075);

  ctx.fillStyle = 'rgba(12, 45, 22, 0.62)';
  hudRoundRect(ctx, pad, pad, painelW, painelH, painelH / 2);
  ctx.fill();

  ctx.fillStyle = '#ffd75e';
  ctx.fillText(rotulo, pad * 1.7, pad + painelH / 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(nomeZona, pad * 1.7 + larguraRotulo + pad * 0.7, pad + painelH / 2);

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
}
