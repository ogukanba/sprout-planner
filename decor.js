// Decor: free-form ink and stickers layered over a page (one day, one week or one month).
// Coordinates are stored in "reference units" (CSS px at the width the page was first decorated),
// then scaled uniformly to the current width so handwriting keeps its shape after rotating the iPad.
import { idb } from './store.js';

export const PEN_SIZES = [2, 3.5, 7];
export const HL_SIZES = [14, 22, 34];
const ERASER_R = 12;

export const opts = { tool: 'pen', color: '#ffffff', size: 1, finger: false };

const pages = new Map();
const saveTimers = new Map();
let srcOf = () => '';
let onSelectTool = () => {};

let mainEl = null;
let el = null;
let canvas, ctx, live, lctx, stickersEl;
let key = '';
let page = null;
let scale = 1;
let editing = false;
let selected = null;
let history = [];
let cur = null;       // stroke being drawn
let erasing = null;   // eraser drag
let gesture = null;   // sticker move / pinch / rotate

// ---------- persistence ----------
export async function loadDecor(resolver, selectToolCb) {
  srcOf = resolver;
  onSelectTool = selectToolCb;
  try {
    const all = await idb.all('decor');
    for (const [k, v] of Object.entries(all)) pages.set(k, v);
  } catch { /* IndexedDB unavailable: decor just won't persist */ }
}

export const decorDump = () => Object.fromEntries(pages);

export async function decorRestore(obj) {
  pages.clear();
  await idb.clear('decor');
  for (const [k, v] of Object.entries(obj || {})) {
    pages.set(k, v);
    await idb.put('decor', k, v);
  }
}

export const decorUses = (src) => [...pages.values()].some((p) => p.stickers.some((s) => s.src === src));

function persist() {
  if (!key || !page) return;
  const k = key;
  const p = page;
  const empty = !p.strokes.length && !p.stickers.length;
  if (empty) pages.delete(k); else pages.set(k, p);
  clearTimeout(saveTimers.get(k));
  saveTimers.set(k, setTimeout(() => {
    (empty ? idb.del('decor', k) : idb.put('decor', k, p)).catch(() => {});
  }, 250));
}

function pushHistory() {
  history.push(JSON.stringify({ strokes: page.strokes, stickers: page.stickers }));
  if (history.length > 60) history.shift();
}

export function undo() {
  const h = history.pop();
  if (!h || !page) return false;
  const o = JSON.parse(h);
  page.strokes = o.strokes;
  page.stickers = o.stickers;
  selected = null;
  drawAll();
  renderStickers();
  persist();
  return true;
}

// ---------- mounting ----------
export function mountDecor(main, k) {
  mainEl = main;
  el = null;
  if (k !== key) { history = []; selected = null; }
  key = k;
  page = pages.get(k) || { w: 0, strokes: [], stickers: [] };
  if (!editing && !page.strokes.length && !page.stickers.length) return;

  const W = main.clientWidth;
  if (!page.w) page.w = W;
  scale = W / page.w;

  let maxY = 0;
  for (const s of page.strokes) for (let i = 1; i < s.pts.length; i += 3) maxY = Math.max(maxY, s.pts[i]);
  for (const s of page.stickers) maxY = Math.max(maxY, s.y + s.w);
  const H = Math.ceil(Math.max(main.scrollHeight, maxY * scale + 80));

  el = document.createElement('div');
  el.className = 'decor' + (editing ? ' editing' : '');
  el.dataset.tool = opts.tool;
  el.style.height = H + 'px';
  el.style.touchAction = opts.finger ? 'none' : 'pan-y';
  el.innerHTML = '<div class="stickers"></div><canvas></canvas><canvas class="live"></canvas>';
  main.appendChild(el);
  stickersEl = el.querySelector('.stickers');
  [canvas, live] = el.querySelectorAll('canvas');

  // iOS Safari caps canvas area (~16.7M px), so lower the pixel ratio on very tall pages.
  const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(15e6 / (W * H)));
  for (const c of [canvas, live]) {
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
    c.style.width = W + 'px';
    c.style.height = H + 'px';
  }
  ctx = canvas.getContext('2d');
  lctx = live.getContext('2d');
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
  lctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
  lctx.dpr = dpr;

  drawAll();
  renderStickers();
  bind();
}

export function setEditing(on) {
  editing = on;
  if (!on) { selected = null; gesture = null; cur = null; }
}
export const isEditing = () => editing;

export function setTool(tool) {
  opts.tool = tool;
  if (tool !== 'select') selected = null;
  if (el) { el.dataset.tool = tool; renderStickers(); }
}

export function setFinger(on) {
  opts.finger = on;
  if (el) el.style.touchAction = on ? 'none' : 'pan-y';
}

// ---------- drawing ----------
function drawStroke(c, s) {
  const p = s.pts;
  const n = p.length / 3;
  if (!n) return;
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = s.color;
  c.fillStyle = s.color;
  if (s.tool === 'hl') {
    // One path, one alpha: overlapping segments don't darken.
    c.globalAlpha = 0.35;
    c.lineWidth = s.size;
    c.beginPath();
    c.moveTo(p[0], p[1]);
    for (let i = 1; i < n; i++) {
      const px = p[i * 3 - 3], py = p[i * 3 - 2], x = p[i * 3], y = p[i * 3 + 1];
      c.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
    }
    c.lineTo(p[(n - 1) * 3], p[(n - 1) * 3 + 1]);
    c.stroke();
  } else {
    const width = (pr) => s.size * (0.35 + 0.9 * pr);
    if (n === 1) {
      c.beginPath();
      c.arc(p[0], p[1], width(p[2]) / 2, 0, Math.PI * 2);
      c.fill();
    }
    // Pressure-sensitive pen: each smoothed segment gets its own width.
    for (let i = 1; i < n; i++) {
      const ax = p[i * 3 - 3], ay = p[i * 3 - 2], ap = p[i * 3 - 1];
      const bx = p[i * 3], by = p[i * 3 + 1], bp = p[i * 3 + 2];
      const sx = i > 1 ? (p[i * 3 - 6] + ax) / 2 : ax;
      const sy = i > 1 ? (p[i * 3 - 5] + ay) / 2 : ay;
      const ex = i === n - 1 ? bx : (ax + bx) / 2;
      const ey = i === n - 1 ? by : (ay + by) / 2;
      c.beginPath();
      c.moveTo(sx, sy);
      c.quadraticCurveTo(ax, ay, ex, ey);
      c.lineWidth = width((ap + bp) / 2);
      c.stroke();
    }
  }
  c.restore();
}

function clear(c) {
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, c.canvas.width, c.canvas.height);
  c.restore();
}

function drawAll() {
  if (!el) return;
  clear(ctx);
  for (const s of page.strokes) drawStroke(ctx, s);
}

function renderStickers() {
  if (!el) return;
  stickersEl.innerHTML = page.stickers.map((s) => `
    <div class="stk ${s.id === selected ? 'sel' : ''}" data-sid="${s.id}" style="${stickerStyle(s)}">
      <img src="${srcOf(s.src)}" alt="" draggable="false">
      <button class="stk-del" data-stk="del" aria-label="Remove">×</button>
      <span class="stk-rot" data-stk="rot"></span>
    </div>`).join('');
}

const stickerStyle = (s) =>
  `left:${s.x * scale}px;top:${s.y * scale}px;width:${s.w * scale}px;transform:translate(-50%,-50%) rotate(${s.r}deg)`;

function positionSticker(s) {
  const node = stickersEl.querySelector(`[data-sid="${s.id}"]`);
  if (node) node.setAttribute('style', stickerStyle(s));
}

export function addSticker(src) {
  if (!el || !page) return;
  pushHistory();
  const s = {
    id: Math.random().toString(36).slice(2, 10),
    src,
    x: (mainEl.clientWidth / 2 + (Math.random() - 0.5) * 160) / scale,
    y: (mainEl.scrollTop + mainEl.clientHeight / 2 + (Math.random() - 0.5) * 120) / scale,
    w: 130 / scale,
    r: Math.round(Math.random() * 16 - 8),
  };
  page.stickers.push(s);
  setTool('select');
  onSelectTool('select');
  selected = s.id;
  renderStickers();
  persist();
}

// ---------- input ----------
function toRef(e) {
  const r = el.getBoundingClientRect();
  return {
    x: Math.round(((e.clientX - r.left) / scale) * 10) / 10,
    y: Math.round(((e.clientY - r.top) / scale) * 10) / 10,
    p: e.pointerType === 'pen' ? Math.round((e.pressure || 0.5) * 100) / 100 : 0.5,
  };
}

function bind() {
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  // Stop Apple Pencil (and fingers, if finger drawing is on) from scrolling the page while drawing.
  const block = (e) => {
    if (!editing || opts.tool === 'select') return;
    if (opts.finger || [...e.touches].some((t) => t.touchType === 'stylus')) e.preventDefault();
  };
  el.addEventListener('touchstart', block, { passive: false });
  el.addEventListener('touchmove', block, { passive: false });
}

// Capture can fail (e.g. the pointer already lifted); drawing still works without it.
function capture(e) {
  try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
}

function rebase() {
  const s = gesture.s;
  gesture.base = { x: s.x, y: s.y, w: s.w, r: s.r, pts: new Map([...gesture.pointers].map(([k, v]) => [k, { ...v }])) };
}

function onDown(e) {
  if (!editing) return;

  if (opts.tool === 'select') {
    const node = e.target.closest('.stk');
    if (!node) {
      // A second finger landing next to the sticker joins the pinch.
      if (gesture) { gesture.pointers.set(e.pointerId, toRef(e)); capture(e); rebase(); return; }
      selected = null;
      renderStickers();
      return;
    }
    const s = page.stickers.find((x) => x.id === node.dataset.sid);
    if (!s) return;
    e.preventDefault();
    if (e.target.dataset.stk === 'del') {
      pushHistory();
      page.stickers = page.stickers.filter((x) => x !== s);
      selected = null;
      gesture = null;
      renderStickers();
      persist();
      return;
    }
    if (selected !== s.id) {
      // Bring to front.
      page.stickers = page.stickers.filter((x) => x !== s).concat(s);
      selected = s.id;
      renderStickers();
    }
    if (!gesture || gesture.s !== s) {
      pushHistory();
      gesture = { s, pointers: new Map(), mode: e.target.dataset.stk === 'rot' ? 'rot' : 'move' };
    }
    gesture.pointers.set(e.pointerId, toRef(e));
    capture(e);
    rebase();
    return;
  }

  if (e.pointerType === 'touch' && !opts.finger) return;
  e.preventDefault();
  capture(e);
  const pt = toRef(e);
  pushHistory();
  if (opts.tool === 'eraser') {
    erasing = { id: e.pointerId, changed: false };
    eraseAt(pt);
    return;
  }
  const hl = opts.tool === 'hl';
  cur = {
    id: e.pointerId,
    s: { tool: hl ? 'hl' : 'pen', color: opts.color, size: (hl ? HL_SIZES : PEN_SIZES)[opts.size], pts: [pt.x, pt.y, pt.p] },
  };
  drawLive();
}

function onMove(e) {
  if (cur && e.pointerId === cur.id) {
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    const pts = cur.s.pts;
    for (const ev of events.length ? events : [e]) {
      const pt = toRef(ev);
      const lx = pts[pts.length - 3], ly = pts[pts.length - 2];
      if (Math.hypot(pt.x - lx, pt.y - ly) < 0.8) continue;
      pts.push(pt.x, pt.y, pt.p);
    }
    drawLive();
    return;
  }
  if (erasing && e.pointerId === erasing.id) { eraseAt(toRef(e)); return; }
  if (gesture && gesture.pointers.has(e.pointerId)) {
    gesture.pointers.set(e.pointerId, toRef(e));
    moveSticker();
  }
}

function onUp(e) {
  if (cur && e.pointerId === cur.id) {
    page.strokes.push(cur.s);
    drawStroke(ctx, cur.s);
    clear(lctx);
    cur = null;
    persist();
    return;
  }
  if (erasing && e.pointerId === erasing.id) {
    if (!erasing.changed) history.pop();
    erasing = null;
    return;
  }
  if (gesture && gesture.pointers.has(e.pointerId)) {
    gesture.pointers.delete(e.pointerId);
    if (gesture.pointers.size) rebase();
    else { gesture = null; persist(); }
  }
}

function drawLive() {
  clear(lctx);
  drawStroke(lctx, cur.s);
}

function eraseAt(pt) {
  const before = page.strokes.length;
  page.strokes = page.strokes.filter((s) => {
    const r = ERASER_R + s.size / 2;
    for (let i = 0; i < s.pts.length; i += 3) {
      if (Math.abs(s.pts[i] - pt.x) < r && Math.abs(s.pts[i + 1] - pt.y) < r) return false;
    }
    return true;
  });
  if (page.strokes.length !== before) {
    erasing.changed = true;
    drawAll();
    persist();
  }
}

const angle = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const clampW = (w) => Math.max(36 / scale, Math.min(900 / scale, w));
const deg = (rad) => (rad * 180) / Math.PI;

function moveSticker() {
  const { s, base: b, pointers, mode } = gesture;
  const ids = [...pointers.keys()];
  if (ids.length === 1) {
    const p = pointers.get(ids[0]);
    const p0 = b.pts.get(ids[0]);
    if (mode === 'rot') {
      // Corner handle: distance from centre scales, angle around centre rotates.
      const c = { x: b.x, y: b.y };
      s.w = clampW((b.w * dist(c, p)) / Math.max(1, dist(c, p0)));
      s.r = b.r + deg(angle(c, p) - angle(c, p0));
    } else {
      s.x = b.x + p.x - p0.x;
      s.y = b.y + p.y - p0.y;
    }
  } else {
    const [i, j] = ids;
    const a = pointers.get(i), c = pointers.get(j);
    const a0 = b.pts.get(i), c0 = b.pts.get(j);
    s.w = clampW((b.w * dist(a, c)) / Math.max(1, dist(a0, c0)));
    s.r = b.r + deg(angle(a, c) - angle(a0, c0));
    s.x = b.x + (a.x + c.x) / 2 - (a0.x + c0.x) / 2;
    s.y = b.y + (a.y + c.y) / 2 - (a0.y + c0.y) / 2;
  }
  positionSticker(s);
}
