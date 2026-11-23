// events.js — the roguelite twist. After every three hands the run deals
// one event card face up on the table; most bend the rules of the next
// three hands, one (Thin Deck) fires at once. The active event is part of
// the table state and is drawn on the felt until its hands run out.

export const EVENT_DEFS = [
  {
    id: 'hot-shoe',
    name: 'HOT SHOE',
    text: 'Blackjack pays 2:1 for the next 3 hands.',
    hands: 3,
  },
  {
    id: 'dealer-nerves',
    name: 'DEALER NERVES',
    text: 'The dealer must stand on 16 for the next 3 hands.',
    hands: 3,
  },
  {
    id: 'insurance-fund',
    name: 'INSURANCE FUND',
    text: 'Your first bust in each hand refunds half the bet, for 3 hands.',
    hands: 3,
  },
  {
    id: 'golden-double',
    name: 'GOLDEN DOUBLE',
    text: 'A winning double pays an extra half bet, for 3 hands.',
    hands: 3,
  },
  {
    id: 'thin-deck',
    name: 'THIN DECK',
    text: 'The shoe is shuffled fresh, right now.',
    hands: 0, // instant: no lasting effect to count down
  },
];

export function drawEvent(rng) {
  const index = Math.floor(rng() * EVENT_DEFS.length);
  return EVENT_DEFS[index];
}

export function eventById(id) {
  return EVENT_DEFS.find((def) => def.id === id) ?? null;
}
