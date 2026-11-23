// main.js — Neon 21: a roguelite blackjack run. Start with 100 chips and
// a four-deck shoe; bet, play the hand against the dealer, and reach the
// 500-chip goal to win the run. Hit 0 chips, or let the shoe run dry below
// the goal, and the run ends. After every three hands an event card bends
// the rules of the next few hands. This file owns the run state and every
// action; shoe.js knows cards, events.js the twists, render.js the table,
// input.js the clicks and keys, audio.js the bleeps.
//
// Staged scenes for the screenshots: ?shot=start|play|end&seed=1 builds a
// fixed, seeded table so the maker's renders are the same on every visit.

import { buildShoe, handTotal, isBlackjack, makeRng } from './shoe.js';
import { drawEvent } from './events.js';
import { renderScene } from './render.js';
import { attachInput } from './input.js';
import { sfx, toggleMuted } from './audio.js';

const START_CHIPS = 100;
const GOAL_CHIPS = 500;
const SHOE_MINIMUM = 10; // below this many cards the shoe counts as dry

const canvas = document.getElementById('table');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

let buttons = [];
let state = null;

function newRun(seed) {
  const rng = makeRng(seed);
  return {
    mode: 'betting',
    rng,
    chips: START_CHIPS,
    goal: GOAL_CHIPS,
    bet: 0,
    shoe: buildShoe(4, rng),
    player: [],
    dealer: [],
    holeHidden: false,
    handsPlayed: 0,
    handsSinceEvent: 0,
    biggestWin: 0,
    event: null,        // {id, name, text, handsLeft} while a twist is live
    pendingEvent: null, // the event card on show in 'event' mode
    doubled: false,
    bustRefunded: false,
    message: '',
    loseReason: '',
  };
}

function hasEvent(id) {
  return state.event && state.event.id === id;
}

function dealerStandTotal() {
  return hasEvent('dealer-nerves') ? 16 : 17;
}

function drawCard() {
  return state.shoe.pop();
}

function placeChip(value) {
  if (state.chips < value) return;
  state.chips -= value;
  state.bet += value;
  sfx.chip();
}

function clearBet() {
  state.chips += state.bet;
  state.bet = 0;
  sfx.click();
}

function dealHand() {
  if (state.bet <= 0) return;
  state.player = [drawCard(), drawCard()];
  state.dealer = [drawCard(), drawCard()];
  state.holeHidden = true;
  state.doubled = false;
  state.bustRefunded = false;
  state.message = '';
  sfx.deal();
  if (isBlackjack(state.player) || isBlackjack(state.dealer)) {
    revealAndSettle();
  } else {
    state.mode = 'player';
  }
}

function playerHit() {
  if (state.mode !== 'player') return;
  state.player.push(drawCard());
  sfx.deal();
  const { total } = handTotal(state.player);
  if (total > 21) settleBust();
  else if (total === 21) dealerPlay();
}

function playerStand() {
  if (state.mode !== 'player') return;
  dealerPlay();
}

function playerDouble() {
  if (state.mode !== 'player' || state.player.length !== 2 || state.chips < state.bet) return;
  state.chips -= state.bet;
  state.bet *= 2;
  state.doubled = true;
  state.player.push(drawCard());
  sfx.chip();
  const { total } = handTotal(state.player);
  if (total > 21) settleBust();
  else dealerPlay();
}

function dealerPlay() {
  state.holeHidden = false;
  const standAt = dealerStandTotal();
  while (handTotal(state.dealer).total < standAt) {
    state.dealer.push(drawCard());
  }
  revealAndSettle();
}

function settleBust() {
  state.holeHidden = false;
  if (hasEvent('insurance-fund') && !state.bustRefunded) {
    const refund = Math.floor(state.bet / 2);
    state.chips += refund;
    state.bustRefunded = true;
    finishHand(`Bust — the Insurance Fund refunds ${refund}.`, -state.bet + refund, false);
    return;
  }
  finishHand('Bust. The dealer takes your bet.', -state.bet, false);
}

// Works out who won once both hands are final and pays the table:
// a win returns the bet plus its match, blackjack pays 3:2 (2:1 under
// Hot Shoe), a push returns the bet, a loss keeps it.
function revealAndSettle() {
  state.holeHidden = false;
  const playerTotal = handTotal(state.player).total;
  const dealerTotal = handTotal(state.dealer).total;
  const playerBj = isBlackjack(state.player);
  const dealerBj = isBlackjack(state.dealer);
  const bet = state.bet;

  if (playerBj && dealerBj) return finishHand('Both blackjack — a push.', 0, false);
  if (dealerBj) return finishHand('Dealer blackjack. Your bet is gone.', -bet, false);
  if (playerBj) {
    const profit = hasEvent('hot-shoe') ? bet * 2 : Math.floor(bet * 1.5);
    state.chips += bet + profit;
    return finishHand(`BLACKJACK! You win ${profit}.`, profit, true);
  }
  if (dealerTotal > 21) {
    let profit = bet;
    if (state.doubled && hasEvent('golden-double')) profit += Math.floor(bet / 2);
    state.chips += bet + profit;
    return finishHand(`Dealer busts with ${dealerTotal}. You win ${profit}.`, profit, true);
  }
  if (playerTotal > dealerTotal) {
    let profit = bet;
    if (state.doubled && hasEvent('golden-double')) profit += Math.floor(bet / 2);
    state.chips += bet + profit;
    return finishHand(`Your ${playerTotal} beats the dealer's ${dealerTotal}. You win ${profit}.`, profit, true);
  }
  if (playerTotal < dealerTotal) {
    return finishHand(`Dealer's ${dealerTotal} beats your ${playerTotal}.`, -bet, false);
  }
  state.chips += bet;
  return finishHand(`Push at ${playerTotal} — your bet comes back.`, 0, false);
}

function finishHand(message, net, won) {
  state.message = message;
  state.bet = 0;
  state.handsPlayed++;
  state.handsSinceEvent++;
  if (net > state.biggestWin) state.biggestWin = net;
  if (state.event) {
    state.event.handsLeft--;
    if (state.event.handsLeft <= 0) state.event = null;
  }
  if (won) sfx.win(); else if (net < 0) sfx.lose();
  if (state.chips >= state.goal) {
    state.mode = 'won';
    sfx.blackjack();
    return;
  }
  if (state.chips <= 0) {
    state.loseReason = 'Out of chips — the house keeps the table.';
    state.mode = 'lost';
    return;
  }
  state.mode = 'settle';
}

function nextHand() {
  if (state.shoe.length < SHOE_MINIMUM) {
    state.loseReason = 'The shoe ran dry before you reached the goal.';
    state.mode = 'lost';
    return;
  }
  state.player = [];
  state.dealer = [];
  state.message = '';
  if (state.handsSinceEvent >= 3) {
    state.handsSinceEvent = 0;
    state.pendingEvent = drawEvent(state.rng);
    state.mode = 'event';
    sfx.event();
    return;
  }
  state.mode = 'betting';
}

function acceptEvent() {
  const def = state.pendingEvent;
  state.pendingEvent = null;
  if (def.id === 'thin-deck') {
    state.shoe = buildShoe(4, state.rng);
    state.message = 'Fresh shoe shuffled in.';
  } else {
    state.event = { id: def.id, name: def.name, text: def.text, handsLeft: def.hands };
  }
  sfx.click();
  state.mode = 'betting';
}

function onAction(id) {
  if (id === 'mute') { toggleMuted(); return; }
  if (id.startsWith('chip-')) {
    if (state.mode === 'betting') placeChip(Number(id.slice(5)));
    return;
  }
  switch (id) {
    case 'start-run': state = newRun((Math.random() * 1e9) | 0); sfx.click(); break;
    case 'clear-bet': if (state.mode === 'betting') clearBet(); break;
    case 'deal': if (state.mode === 'betting') dealHand(); break;
    case 'hit': playerHit(); break;
    case 'stand': playerStand(); break;
    case 'double': playerDouble(); break;
    case 'next-hand': if (state.mode === 'settle') nextHand(); break;
    case 'accept-event': if (state.mode === 'event') acceptEvent(); break;
  }
  status.textContent = `Neon 21 — chips ${state.chips}, bet ${state.bet}, mode ${state.mode}.`;
}

// --- staged scenes for the maker's screenshots ---------------------------

function stagedState(shot, seed) {
  const s = newRun(seed);
  if (shot === 'start') {
    s.mode = 'title';
    return s;
  }
  if (shot === 'play') {
    // A run mid-flight: six hands in, a Hot Shoe event live, 25 on the
    // table and a player 18 against the dealer's ace.
    s.chips = 150;
    s.bet = 25;
    s.handsPlayed = 6;
    s.handsSinceEvent = 1;
    s.biggestWin = 75;
    s.event = { id: 'hot-shoe', name: 'HOT SHOE', text: 'Blackjack pays 2:1 for the next 3 hands.', handsLeft: 2 };
    s.player = [{ rank: 13, suit: 'spades' }, { rank: 8, suit: 'hearts' }];
    s.dealer = [{ rank: 1, suit: 'diamonds' }, { rank: 6, suit: 'clubs' }];
    s.holeHidden = true;
    s.shoe = s.shoe.slice(0, 163);
    s.mode = 'player';
    return s;
  }
  // 'end': the run is won.
  s.chips = 540;
  s.handsPlayed = 23;
  s.biggestWin = 150;
  s.mode = 'won';
  return s;
}

// --- boot -----------------------------------------------------------------

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  state = stagedState(shot, Number(params.get('seed') ?? 1));
} else {
  state = newRun((Math.random() * 1e9) | 0);
  state.mode = 'title';
}

attachInput(canvas, { onAction, getButtons: () => buttons });

function frame() {
  buttons = renderScene(ctx, state);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__neon21 = { get state() { return state; }, onAction };
