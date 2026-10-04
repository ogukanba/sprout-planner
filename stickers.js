// Built-in sticker pack: small flat SVGs with a white "die-cut" outline.
// The outline is the same shapes drawn first, fattened with a thick white stroke.

const OUTLINE = '<style>.o *{stroke:#fff;stroke-width:12px;stroke-linecap:round;stroke-linejoin:round}.o [fill]:not([fill="none"]){fill:#fff}</style>';

const svg = (body) =>
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-8 -8 116 116">${OUTLINE}<g class="o">${body}</g>${body}</svg>`);

const petals = (cx, cy, n, dist, r, fill) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return `<circle cx="${(cx + Math.cos(a) * dist).toFixed(1)}" cy="${(cy + Math.sin(a) * dist).toFixed(1)}" r="${r}" fill="${fill}"/>`;
  }).join('');

const rays = (cx, cy, n, r1, r2, color) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const x = (r) => (cx + Math.cos(a) * r).toFixed(1);
    const y = (r) => (cy + Math.sin(a) * r).toFixed(1);
    return `<line x1="${x(r1)}" y1="${y(r1)}" x2="${x(r2)}" y2="${y(r2)}" stroke="${color}" stroke-width="7" stroke-linecap="round"/>`;
  }).join('');

export const BUILTIN_STICKERS = {
  'b:heart': svg(`<path d="M50 88C20 67 6 49 6 32 6 17 18 7 31 7c9 0 15 5 19 12 4-7 10-12 19-12 13 0 25 10 25 25 0 17-14 35-44 56z" fill="#ff6b9a"/><ellipse cx="28" cy="27" rx="8" ry="5" fill="#ffc2d6" transform="rotate(-30 28 27)"/>`),
  'b:star': svg(`<path d="M50 5l13 28 31 3-23 21 7 31-28-16-28 16 7-31L6 36l31-3z" fill="#ffd25e"/><circle cx="40" cy="40" r="5" fill="#fff3c4"/>`),
  'b:sparkle': svg(`<path d="M44 6c4 30 14 40 44 44-30 4-40 14-44 44-4-30-14-40-44-44 30-4 40-14 44-44z" fill="#ffe27a"/><path d="M84 66c2 11 5 14 16 16-11 2-14 5-16 16-2-11-5-14-16-16 11-2 14-5 16-16z" fill="#b48cff"/>`),
  'b:flower': svg(`${petals(50, 50, 5, 25, 21, '#ffb3c7')}<circle cx="50" cy="50" r="15" fill="#ffd25e"/><circle cx="45" cy="45" r="4" fill="#fff3c4"/>`),
  'b:moon': svg(`<path d="M64 6A44 44 0 1 0 94 70 34 34 0 1 1 64 6z" fill="#ffe08a"/><circle cx="36" cy="58" r="5" fill="#f5c95c"/><circle cx="48" cy="76" r="3.5" fill="#f5c95c"/>`),
  'b:sun': svg(`${rays(50, 50, 8, 32, 44, '#ffb347')}<circle cx="50" cy="50" r="24" fill="#ffcf4a"/><circle cx="42" cy="47" r="3" fill="#7a4b2a"/><circle cx="58" cy="47" r="3" fill="#7a4b2a"/><path d="M42 57q8 7 16 0" fill="none" stroke="#7a4b2a" stroke-width="3" stroke-linecap="round"/>`),
  'b:cloud': svg(`<path d="M24 78c-11 0-19-8-19-18s8-18 18-18c2-14 14-24 28-24 13 0 24 9 27 21 10 1 18 9 18 19 0 11-9 20-20 20z" fill="#e6f0ff"/><circle cx="38" cy="58" r="3" fill="#5b6b8c"/><circle cx="60" cy="58" r="3" fill="#5b6b8c"/><ellipse cx="31" cy="64" rx="4" ry="2.5" fill="#ffb3c7"/><ellipse cx="67" cy="64" rx="4" ry="2.5" fill="#ffb3c7"/>`),
  'b:coffee': svg(`<path d="M18 40h56l-6 44c-1 6-6 10-12 10H36c-6 0-11-4-12-10z" fill="#f4e4d4"/><path d="M74 48h6c7 0 12 5 12 12s-5 12-12 12h-8" fill="none" stroke="#f4e4d4" stroke-width="8"/><path d="M21 52h50l-2 14H23z" fill="#c58b5e"/><path d="M36 10q-6 8 0 16t0 16M52 8q-6 8 0 16t0 16" fill="none" stroke="#d9b8a0" stroke-width="5" stroke-linecap="round"/>`),
  'b:cherry': svg(`<path d="M30 66Q40 30 62 10M70 70Q66 36 62 10" fill="none" stroke="#5a9e4b" stroke-width="5" stroke-linecap="round"/><path d="M62 10q22-6 30 10-20 6-30-10z" fill="#7fd38a"/><circle cx="28" cy="74" r="18" fill="#ff4f6d"/><circle cx="70" cy="76" r="18" fill="#ff4f6d"/><circle cx="22" cy="68" r="5" fill="#ffb3c0"/><circle cx="64" cy="70" r="5" fill="#ffb3c0"/>`),
  'b:bow': svg(`<path d="M50 50L10 24c-6-3-10 1-10 7v38c0 6 4 10 10 7z" fill="#ff8fb1"/><path d="M50 50l40-26c6-3 10 1 10 7v38c0 6-4 10-10 7z" fill="#ff8fb1"/><path d="M44 54l-12 36 12-4 6 10 4-40zM56 54l12 36-12-4-6 10-4-40z" fill="#ff6b9a"/><rect x="40" y="38" width="20" height="24" rx="8" fill="#ff6b9a"/>`),
  'b:leaf': svg(`<path d="M14 88C10 46 40 12 90 10c2 48-30 80-76 78z" fill="#7fd38a"/><path d="M14 88Q46 54 76 26" fill="none" stroke="#4fae63" stroke-width="5" stroke-linecap="round"/>`),
  'b:rainbow': svg(`<path d="M8 80a42 42 0 0 1 84 0" fill="none" stroke="#ff6b8a" stroke-width="11"/><path d="M20 80a30 30 0 0 1 60 0" fill="none" stroke="#ffd25e" stroke-width="11"/><path d="M32 80a18 18 0 0 1 36 0" fill="none" stroke="#6fb6ff" stroke-width="11"/><circle cx="14" cy="84" r="12" fill="#ffffff"/><circle cx="86" cy="84" r="12" fill="#ffffff"/>`),
};
