// render.js — everything the table shows, drawn on one canvas: the neon
// felt, the HUD (chips, bet, shoe, goal progress), the event banner, both
// hands with their totals, the betting chips and the action buttons, and
// the title / event / run-end overlays. Drawing fills a `buttons` array
// with the clickable rectangles of the current screen; input.js hit-tests
// against it, so what is drawn is exactly what can be clicked.

import { SUIT_GLYPH, RANK_LABEL, handTotal } from './shoe.js';
import { isMuted } from './audio.js';

export const WIDTH = 1280;
export const HEIGHT = 800;
const CARD_W = 96;
const CARD_H = 134;

const INK = '#f4f1ff';
const DIM = '#9d94c7';
const CYAN = '#22d3ee';
const MAGENTA = '#f471b5';
const GOLD = '#fbbf24';
const RED_SUIT = '#ef4456';
const BLACK_SUIT = '#232338';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, value, x, y, size, color, align = 'center', weight = 700) {
  ctx.font = `${weight} ${size}px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function drawCard(ctx, card, x, y, faceUp) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, x, y, CARD_W, CARD_H, 10);
  if (faceUp) {
    ctx.fillStyle = '#fdfdff';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    const color = (card.suit === 'hearts' || card.suit === 'diamonds') ? RED_SUIT : BLACK_SUIT;
    const label = RANK_LABEL[card.rank - 1];
    const glyph = SUIT_GLYPH[card.suit];
    text(ctx, label, x + 16, y + 22, 26, color, 'center', 800);
    text(ctx, glyph, x + 16, y + 48, 22, color);
    text(ctx, glyph, x + CARD_W / 2, y + CARD_H / 2 + 16, 56, color);
    text(ctx, label, x + CARD_W - 16, y + CARD_H - 22, 26, color, 'center', 800);
  } else {
    const grad = ctx.createLinearGradient(x, y, x + CARD_W, y + CARD_H);
    grad.addColorStop(0, '#312e81');
    grad.addColorStop(1, '#7c3aed');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 2;
    roundRect(ctx, x + 8, y + 8, CARD_W - 16, CARD_H - 16, 7);
    ctx.stroke();
    text(ctx, 'N21', x + CARD_W / 2, y + CARD_H / 2, 24, CYAN, 'center', 800);
  }
  ctx.restore();
}

function drawHand(ctx, cards, centerX, y, hideHole) {
  const totalW = cards.length * (CARD_W + 14) - 14;
  let x = centerX - totalW / 2;
  cards.forEach((card, i) => {
    drawCard(ctx, card, x, y, !(hideHole && i === 1));
    x += CARD_W + 14;
  });
}

function drawChipStack(ctx, x, y, amount) {
  const colors = ['#ef4456', '#22d3ee', '#fbbf24'];
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(x, y - i * 7, 30, 11, 0, 0, Math.PI * 2);
    ctx.fillStyle = colors[i];
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  text(ctx, `${amount}`, x, y + 26, 20, GOLD, 'center', 800);
}

function drawButton(ctx, buttons, id, x, y, w, h, label, accent, enabled = true) {
  ctx.save();
  roundRect(ctx, x, y, w, h, 12);
  ctx.fillStyle = enabled ? 'rgba(20,16,44,0.92)' : 'rgba(20,16,44,0.45)';
  ctx.fill();
  ctx.strokeStyle = enabled ? accent : '#4b4570';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  text(ctx, label, x + w / 2, y + h / 2 + 1, 22, enabled ? INK : DIM, 'center', 800);
  ctx.restore();
  if (enabled) buttons.push({ id, x, y, w, h });
}

function drawChipButton(ctx, buttons, value, x, y, color) {
  ctx.beginPath();
  ctx.arc(x, y, 30, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#fdfdff';
  ctx.setLineDash([8, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
  text(ctx, `${value}`, x, y + 1, 21, '#14102a', 'center', 900);
  buttons.push({ id: `chip-${value}`, x: x - 32, y: y - 32, w: 64, h: 64 });
}

function drawHud(ctx, s) {
  ctx.fillStyle = 'rgba(8,5,20,0.85)';
  ctx.fillRect(0, 0, WIDTH, 62);
  ctx.fillStyle = CYAN;
  ctx.fillRect(0, 62, WIDTH, 2);
  text(ctx, `CHIPS ${s.chips}`, 90, 32, 24, GOLD, 'left', 800);
  text(ctx, `BET ${s.bet}`, 330, 32, 24, MAGENTA, 'left', 800);
  text(ctx, `SHOE ${s.shoe.length}`, 520, 32, 24, INK, 'left', 800);
  text(ctx, `HAND ${s.handsPlayed + 1}`, 700, 32, 24, INK, 'left', 800);
  // Goal progress: a bar from the 100-chip start to the 500-chip goal.
  const gx = 900, gy = 20, gw = 260, gh = 22;
  roundRect(ctx, gx, gy, gw, gh, 11);
  ctx.fillStyle = '#241d4d';
  ctx.fill();
  const frac = Math.max(0, Math.min(1, (s.chips + s.bet) / s.goal));
  roundRect(ctx, gx, gy, Math.max(gh, gw * frac), gh, 11);
  ctx.fillStyle = CYAN;
  ctx.fill();
  text(ctx, `GOAL ${s.goal}`, gx + gw + 14, 32, 22, CYAN, 'left', 800);
  // The sound state lives in the bottom-right corner: in the HUD bar it
  // collided with the goal label.
  text(ctx, isMuted() ? 'SOUND OFF (M)' : 'SOUND ON (M)', WIDTH - 16, 778, 15, DIM, 'right', 600);
}

function drawEventBanner(ctx, s) {
  if (!s.event) return;
  const label = `EVENT · ${s.event.name} — ${s.event.text} (${s.event.handsLeft} left)`;
  ctx.save();
  roundRect(ctx, 240, 76, 800, 40, 10);
  ctx.fillStyle = 'rgba(124,58,237,0.35)';
  ctx.fill();
  ctx.strokeStyle = MAGENTA;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(ctx, label, WIDTH / 2, 97, 18, '#ffd7ef', 'center', 700);
  ctx.restore();
}

function drawTotals(ctx, s) {
  const player = handTotal(s.player);
  text(ctx, `YOU · ${player.total}${player.soft && player.total !== 21 ? ' soft' : ''}`, WIDTH / 2, 478, 26, CYAN, 'center', 800);
  if (s.holeHidden && s.dealer.length) {
    const up = handTotal([s.dealer[0]]);
    text(ctx, `DEALER · shows ${up.total}`, WIDTH / 2, 148, 26, MAGENTA, 'center', 800);
  } else if (s.dealer.length) {
    const dealer = handTotal(s.dealer);
    text(ctx, `DEALER · ${dealer.total}`, WIDTH / 2, 148, 26, MAGENTA, 'center', 800);
  }
}

function drawBetting(ctx, s, buttons) {
  text(ctx, s.bet > 0 ? 'Place your bet, then deal' : 'Place your bet to start the hand', WIDTH / 2, 640, 24, INK);
  const chips = [5, 10, 25, 100];
  const colors = ['#fbbf24', '#22d3ee', '#ef4456', '#a78bfa'];
  chips.forEach((v, i) => {
    if (s.chips >= v) drawChipButton(ctx, buttons, v, 430 + i * 105, 706, colors[i]);
  });
  drawButton(ctx, buttons, 'clear-bet', 880, 678, 130, 56, 'CLEAR', DIM, s.bet > 0);
  drawButton(ctx, buttons, 'deal', 1030, 678, 150, 56, 'DEAL', CYAN, s.bet > 0);
}

function drawActions(ctx, s, buttons) {
  drawButton(ctx, buttons, 'hit', 380, 686, 150, 58, 'HIT (H)', CYAN);
  drawButton(ctx, buttons, 'stand', 565, 686, 150, 58, 'STAND (S)', MAGENTA);
  const canDouble = s.player.length === 2 && s.chips >= s.bet;
  drawButton(ctx, buttons, 'double', 750, 686, 190, 58, 'DOUBLE (D)', GOLD, canDouble);
}

function drawTitle(ctx, s, buttons) {
  ctx.fillStyle = 'rgba(5,3,14,0.88)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  text(ctx, 'NEON 21', WIDTH / 2, 250, 110, CYAN, 'center', 900);
  text(ctx, 'a roguelite blackjack run', WIDTH / 2, 330, 30, MAGENTA, 'center', 700);
  text(ctx, 'Start with 100 chips. Reach 500 to win the run — hit 0, or run the shoe dry, and it ends.', WIDTH / 2, 410, 22, INK);
  text(ctx, 'Blackjack pays 3:2 · dealer stands on 17 · every 3 hands an EVENT card bends the rules', WIDTH / 2, 448, 22, DIM);
  drawButton(ctx, buttons, 'start-run', 515, 520, 250, 64, 'START RUN', CYAN);
}

function drawEventCard(ctx, s, buttons) {
  ctx.fillStyle = 'rgba(5,3,14,0.78)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  roundRect(ctx, 390, 190, 500, 380, 18);
  ctx.fillStyle = '#1b1440';
  ctx.fill();
  ctx.strokeStyle = MAGENTA;
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, 'EVENT CARD', WIDTH / 2, 245, 24, DIM, 'center', 800);
  text(ctx, s.pendingEvent.name, WIDTH / 2, 320, 46, GOLD, 'center', 900);
  // wrap the event text to two lines
  const words = s.pendingEvent.text.split(' ');
  const lines = [''];
  for (const w of words) {
    if ((lines[lines.length - 1] + ' ' + w).trim().length > 34) lines.push(w);
    else lines[lines.length - 1] = (lines[lines.length - 1] + ' ' + w).trim();
  }
  lines.forEach((line, i) => text(ctx, line, WIDTH / 2, 385 + i * 32, 22, INK));
  drawButton(ctx, buttons, 'accept-event', 540, 480, 200, 56, 'ONWARD', CYAN);
}

function drawRunEnd(ctx, s, buttons) {
  ctx.fillStyle = 'rgba(5,3,14,0.88)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  if (s.mode === 'won') {
    text(ctx, 'RUN WON!', WIDTH / 2, 260, 84, GOLD, 'center', 900);
    text(ctx, `You turned 100 chips into ${s.chips} and beat the Neon 21 run.`, WIDTH / 2, 340, 26, INK);
  } else {
    text(ctx, 'RUN BUSTED', WIDTH / 2, 260, 84, RED_SUIT, 'center', 900);
    text(ctx, s.loseReason, WIDTH / 2, 340, 26, INK);
  }
  text(ctx, `Hands played ${s.handsPlayed} · Biggest win ${s.biggestWin} chips`, WIDTH / 2, 410, 24, DIM);
  drawButton(ctx, buttons, 'start-run', 515, 500, 250, 64, 'NEW RUN', CYAN);
}

// The one entry point: draw the whole scene for state `s` and return the
// clickable buttons of the screen that was drawn.
export function renderScene(ctx, s) {
  const buttons = [];
  const felt = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 120, WIDTH / 2, HEIGHT / 2, 760);
  felt.addColorStop(0, '#251a52');
  felt.addColorStop(1, '#0a0618');
  ctx.fillStyle = felt;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = 'rgba(34,211,238,0.5)';
  ctx.lineWidth = 3;
  roundRect(ctx, 60, 130, WIDTH - 120, 560, 40);
  ctx.stroke();

  drawHud(ctx, s);
  drawEventBanner(ctx, s);

  if (s.dealer.length) drawHand(ctx, s.dealer, WIDTH / 2, 168, s.holeHidden);
  if (s.player.length) drawHand(ctx, s.player, WIDTH / 2, 512, false);
  if (s.player.length || s.dealer.length) drawTotals(ctx, s);
  if (s.bet > 0 && s.mode !== 'betting') drawChipStack(ctx, 1050, 560, s.bet);

  if (s.message) text(ctx, s.message, WIDTH / 2, 428, 30, GOLD, 'center', 800);

  if (s.mode === 'betting') drawBetting(ctx, s, buttons);
  if (s.mode === 'player') drawActions(ctx, s, buttons);
  if (s.mode === 'settle') drawButton(ctx, buttons, 'next-hand', 540, 686, 200, 58, 'NEXT (⏎)', CYAN);
  if (s.mode === 'title') drawTitle(ctx, s, buttons);
  if (s.mode === 'event') drawEventCard(ctx, s, buttons);
  if (s.mode === 'won' || s.mode === 'lost') drawRunEnd(ctx, s, buttons);
  return buttons;
}
