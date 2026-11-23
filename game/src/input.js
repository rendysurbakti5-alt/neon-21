// input.js — mouse and keyboard for the table. Buttons are the rectangles
// render.js filled on the last draw; a click hit-tests them, and the keys
// H / S / D / Enter / M mirror the on-screen actions for keyboard play.

export function attachInput(canvas, { onAction, getButtons }) {
  canvas.addEventListener('click', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (ev.clientX - rect.left) * scaleX;
    const y = (ev.clientY - rect.top) * scaleY;
    const hit = getButtons().find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    if (hit) onAction(hit.id);
  });

  window.addEventListener('keydown', (ev) => {
    const key = ev.key.toLowerCase();
    if (key === 'h') onAction('hit');
    else if (key === 's') onAction('stand');
    else if (key === 'd') onAction('double');
    else if (key === 'm') onAction('mute');
    else if (key === 'enter' || key === ' ') {
      const buttons = getButtons();
      const primary = buttons.find((b) => ['deal', 'next-hand', 'accept-event', 'start-run'].includes(b.id));
      if (primary) onAction(primary.id);
    }
  });
}
