// shoe.js — the shoe of cards and the arithmetic of a blackjack hand.
// A shoe is four shuffled decks. Cards are plain {rank, suit} objects;
// rank runs 1 (ace) to 13 (king), suit is one of 'spades', 'hearts',
// 'diamonds', 'clubs'. The shuffle is driven by a seeded generator so a
// staged screenshot hand is the same every time it is asked for.

export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
export const SUIT_GLYPH = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
export const RANK_LABEL = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// mulberry32: a small seeded random generator, good enough for a shuffle.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function nextRandom() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildShoe(deckCount, rng) {
  const cards = [];
  for (let d = 0; d < deckCount; d++) {
    for (const suit of SUITS) {
      for (let rank = 1; rank <= 13; rank++) cards.push({ rank, suit });
    }
  }
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const swap = cards[i];
    cards[i] = cards[j];
    cards[j] = swap;
  }
  return cards;
}

export function cardValue(rank) {
  if (rank === 1) return 11; // ace counts high until handTotal says otherwise
  return Math.min(rank, 10);
}

// The best total a hand can claim: aces drop from 11 to 1 while the hand
// would bust. `soft` is true when an ace still counts as 11.
export function handTotal(cards) {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    total += cardValue(card.rank);
    if (card.rank === 1) aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return { total, soft: aces > 0 };
}

export function isBlackjack(cards) {
  return cards.length === 2 && handTotal(cards).total === 21;
}
