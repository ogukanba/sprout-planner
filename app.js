import { ls, idb, downscale, blobToDataURL, dataURLToBlob } from './store.js';
import { t, setLang, getLang, locale, detectLang, applyStatic, LANGS } from './i18n.js';
import { BUILTIN_STICKERS } from './stickers.js';
import * as decor from './decor.js';

// ---------- constants ----------
const KEY = 'dusk-planner-v1';
const VIEW_KEY = 'dusk-planner-view';
const SETTINGS_KEY = 'dusk-planner-settings';

const COLORS = {
  pink: '#ff5c8a', orange: '#ff9147', yellow: '#ffc94d', green: '#5fd37a',
  teal: '#45d8c8', blue: '#4fa3ff', purple: '#b48cff',
};
const INKS = ['#ffffff', '#1d1a1a', '#ff5c8a', '#ffc94d', '#5fd37a', '#4fa3ff', '#b48cff'];
const THEMES = {
  dusk: 'linear-gradient(135deg,#7a4b68,#96582f)',
  midnight: 'linear-gradient(135deg,#2a2d6e,#12132a)',
  aurora: 'linear-gradient(135deg,#3c5aff,#8c32e6 55%,#ff4678)',
  rose: 'linear-gradient(135deg,#d26e8c,#5a2a3a)',
  forest: 'linear-gradient(135deg,#3c7864,#1a2a24)',
};
const STATUSES = ['ongoing', 'planned', 'completed', 'dropped'];
const VIEW_NAMES = ['todo', 'day', 'week', 'month', 'habits', 'lists'];
const CHECK = '<svg viewBox="0 0 24 24"><path d="M5.5 12.5l4 4L18.5 7.5"/></svg>';
const HOUR_PX = { day: 84, week: 60 };

// ---------- helpers ----------
const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = (d) => addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -((d.getDay() + 6) % 7));
const todayStr = () => ymd(new Date());
const nowMin = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const fromMin = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const fmt = (d, o) => d.toLocaleDateString(locale(), o);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const weekDates = (d) => { const ws = startOfWeek(d); return Array.from({ length: 7 }, (_, i) => addDays(ws, i)); };

// ---------- images (IndexedDB blobs, served as object URLs) ----------
const urls = new Map();

async function loadBlobs() {
  try {
    const all = await idb.all('blobs');
    for (const [k, b] of Object.entries(all)) urls.set(k, URL.createObjectURL(b));
  } catch { /* no IndexedDB: images just won't persist */ }
}
async function putBlob(blob) {
  const id = 'img_' + uid();
  await idb.put('blobs', id, blob);
  urls.set(id, URL.createObjectURL(blob));
  return id;
}
function dropBlob(id) {
  if (!id) return;
  const u = urls.get(id);
  if (u) URL.revokeObjectURL(u);
  urls.delete(id);
  idb.del('blobs', id).catch(() => {});
}
const stickerSrc = (src) => BUILTIN_STICKERS[src] || urls.get(src) || '';

// ---------- settings ----------
const settings = { theme: ls.get('dusk-planner-theme') || 'dusk', photo: '', blur: 14, dim: 30, lang: detectLang(), finger: false, lock: true, ...ls.json(SETTINGS_KEY, {}) };
const saveSettings = () => ls.set(SETTINGS_KEY, JSON.stringify(settings));
setLang(settings.lang);
decor.opts.finger = settings.finger;

// ---------- data ----------
function newItem(o) {
  return {
    id: uid(), title: '', notes: '', date: todayStr(), start: '', end: '',
    repeat: 'none', color: 'blue', list: '', tags: [], done: false, doneDates: [],
    created: Date.now(), ...o,
  };
}
const newHabit = (o) => ({ id: uid(), name: '', emoji: '', color: 'green', days: [0, 1, 2, 3, 4, 5, 6], log: {}, created: Date.now(), ...o });
const newEntry = (o) => ({ id: uid(), col: '', title: '', status: 'planned', cover: '', rating: 0, note: '', finished: '', created: Date.now(), ...o });

const defaultCollections = () => [
  { id: 'books', key: 'books', name: '', emoji: '📚' },
  { id: 'games', key: 'games', name: '', emoji: '🎮' },
  { id: 'movies', key: 'movies', name: '', emoji: '🎬' },
  { id: 'series', key: 'series', name: '', emoji: '📺' },
];
const defaultHabits = () => [
  newHabit({ name: t('seed.water'), emoji: '💧', color: 'blue' }),
  newHabit({ name: t('seed.read'), emoji: '📖', color: 'purple' }),
];

function seedItems() {
  let n = 0;
  const mk = (o) => newItem({ created: Date.now() + n++, ...o });
  return [
    mk({ title: 'Morning cardio 🏃', start: '07:00', end: '08:00', color: 'pink', list: 'Sport', tags: ['Cardio'] }),
    mk({ title: 'Favourite bakery 🥐', start: '07:30', end: '08:20', color: 'orange', list: 'Breakfast' }),
    mk({ title: 'Tackle top priorities', start: '10:00', end: '11:00', color: 'pink', list: 'Work', tags: ['Focus'] }),
    mk({ title: 'Drink a green smoothie', color: 'green' }),
    mk({ title: 'Read 20 pages', color: 'blue', tags: ['Reading'] }),
  ];
}

function normalize(d, fresh) {
  const arr = (x) => (Array.isArray(x) ? x : null);
  return {
    version: 2,
    items: (arr(d.items) || (fresh ? seedItems() : [])).filter((i) => i && i.id && i.title)
      .map((i) => newItem({ ...i, tags: arr(i.tags) || [], doneDates: arr(i.doneDates) || [] })),
    habits: (arr(d.habits) || defaultHabits()).map((h) => newHabit({ ...h, log: h.log || {}, days: arr(h.days) || [0, 1, 2, 3, 4, 5, 6] })),
    collections: arr(d.collections) || defaultCollections(),
    entries: (arr(d.entries) || []).map((e) => newEntry(e)),
    stickers: arr(d.stickers) || [],
  };
}

function load() {
  const raw = ls.get(KEY);
  if (raw) { try { return normalize(JSON.parse(raw)); } catch { /* fall through */ } }
  return normalize({}, true);
}

let data = load();
function save() { if (!ls.set(KEY, JSON.stringify(data))) toast(t('toast.saveFail')); }

const find = (id) => data.items.find((i) => i.id === id);
const isRecurring = (it) => it.repeat && it.repeat !== 'none';
const isDone = (it, ds) => (isRecurring(it) ? it.doneDates.includes(ds) : it.done);

function occurs(it, ds) {
  if (!it.date || ds < it.date) return false;
  const dow = parse(ds).getDay();
  switch (it.repeat) {
    case 'daily': return true;
    case 'weekdays': return dow > 0 && dow < 6;
    case 'weekly': return dow === parse(it.date).getDay();
    default: return ds === it.date;
  }
}
const byTime = (a, b) => (a.start || '99').localeCompare(b.start || '99') || a.created - b.created;
const itemsOn = (ds) => data.items.filter((it) => occurs(it, ds)).sort(byTime);

function toggle(id, ds) {
  const it = find(id);
  if (!it) return;
  if (isRecurring(it)) {
    const s = new Set(it.doneDates);
    s.has(ds) ? s.delete(ds) : s.add(ds);
    it.doneDates = [...s];
  } else {
    it.done = !it.done;
  }
  save();
  render();
}

// habits
const habitOn = (h, d) => h.days.includes(d.getDay()) && ymd(d) >= ymd(new Date(h.created));
function streak(h) {
  let d = new Date();
  if (!h.log[ymd(d)]) d = addDays(d, -1);
  const born = ymd(new Date(h.created));
  let n = 0;
  for (let i = 0; i < 1000 && ymd(d) >= born; i++, d = addDays(d, -1)) {
    if (!h.days.includes(d.getDay())) continue;
    if (h.log[ymd(d)]) n++; else break;
  }
  return n;
}
function monthPct(h) {
  const now = new Date();
  let due = 0, done = 0;
  for (let d = new Date(now.getFullYear(), now.getMonth(), 1); d <= now; d = addDays(d, 1)) {
    if (!habitOn(h, d)) continue;
    due++;
    if (h.log[ymd(d)]) done++;
  }
  return due ? Math.round((done / due) * 100) : 0;
}
function toggleHabit(id, ds) {
  const h = data.habits.find((x) => x.id === id);
  if (!h || ds > todayStr()) return;
  if (h.log[ds]) delete h.log[ds]; else h.log[ds] = true;
  save();
  render();
}

// lists
const colName = (c) => c.name || (c.key ? t('col.' + c.key) : '');

// ---------- ui state ----------
const ui = {
  view: VIEW_NAMES.includes(ls.get(VIEW_KEY)) ? ls.get(VIEW_KEY) : 'day',
  cursor: todayStr(),
  resetScroll: true,
  decorating: false,
  col: data.collections[0]?.id || '',
  status: 'all',
};
const main = $('#main');

function setView(v) {
  if (ui.decorating) stopDecorating();
  ui.view = v;
  ui.resetScroll = true;
  ls.set(VIEW_KEY, v);
  render();
}

function step(n) {
  const d = parse(ui.cursor);
  if (ui.view === 'day') ui.cursor = ymd(addDays(d, n));
  else if (ui.view === 'week' || ui.view === 'habits') ui.cursor = ymd(addDays(d, 7 * n));
  else if (ui.view === 'month') ui.cursor = ymd(new Date(d.getFullYear(), d.getMonth() + n, 1));
  else return;
  render();
}

function decorKey() {
  const d = parse(ui.cursor);
  if (ui.view === 'day') return 'day:' + ui.cursor;
  if (ui.view === 'week') return 'week:' + ymd(startOfWeek(d));
  if (ui.view === 'month') return 'month:' + ui.cursor.slice(0, 7);
  return '';
}

// ---------- pieces ----------
const colorOf = (it) => COLORS[it.color] || COLORS.blue;

function labels(it) {
  const parts = [];
  if (it.list) parts.push(`<span class="lab"><span class="at">@</span>${esc(it.list)}</span>`);
  for (const tag of it.tags) parts.push(`<span class="lab"><span class="hash">#</span>${esc(tag)}</span>`);
  return parts.join('');
}

function metaHtml(it, withTime) {
  const lab = labels(it);
  const extra = [];
  if (withTime && it.start) extra.push(`${it.start}${it.end ? '–' + it.end : ''}`);
  if (isRecurring(it)) extra.push(`↻ ${t('repeat.' + it.repeat)}`);
  return (lab ? `<div class="meta">${lab}</div>` : '') + (extra.length ? `<div class="meta">${extra.map((e) => `<span>${e}</span>`).join('')}</div>` : '');
}

const checkBtn = (it, ds, done) =>
  `<button class="check ${done ? 'on' : ''}" data-action="toggle" data-id="${it.id}" data-date="${ds}" aria-label="✓">${CHECK}</button>`;

function taskCard(it, ds) {
  const done = isDone(it, ds);
  return `<div class="task ${done ? 'done' : ''}" style="--c:${colorOf(it)}" data-action="edit" data-id="${it.id}">
    ${checkBtn(it, ds, done)}
    <div class="tx"><div class="title">${esc(it.title)}</div>${metaHtml(it, true)}</div>
  </div>`;
}

const mpill = (it, ds) =>
  `<div class="mpill ${isDone(it, ds) ? 'done' : ''}" style="--c:${colorOf(it)}"><i></i><span>${esc(it.title)}</span></div>`;

function dayChip(d, action) {
  const ds = ymd(d);
  const cls = [ds === ui.cursor ? 'sel' : '', ds === todayStr() ? 'today' : ''].join(' ');
  return `<button class="chip ${cls}" data-action="${action}" data-date="${ds}">
    <span class="n">${pad(d.getDate())}</span><span class="w">${fmt(d, { weekday: 'short' })}</span>
  </button>`;
}

// Overlapping events: cluster them, then give each a lane within its cluster.
function layout(evs) {
  evs.sort((a, b) => a.s - b.s || b.e - a.e);
  const groups = [];
  let cur = [], curEnd = -1;
  for (const ev of evs) {
    if (cur.length && ev.s >= curEnd) { groups.push(cur); cur = []; curEnd = -1; }
    cur.push(ev);
    curEnd = Math.max(curEnd, ev.e);
  }
  if (cur.length) groups.push(cur);
  for (const g of groups) {
    const lanes = [];
    for (const ev of g) {
      let i = lanes.findIndex((end) => end <= ev.s);
      if (i < 0) { i = lanes.length; lanes.push(0); }
      lanes[i] = ev.e;
      ev.lane = i;
    }
    for (const ev of g) ev.lanes = lanes.length;
  }
  return evs;
}

function evBlock(ev, ds, mode, hh, base) {
  const { it, s, e, lane, lanes } = ev;
  const done = isDone(it, ds);
  const top = ((s - base) / 60) * hh + 1;
  const height = Math.max(((e - s) / 60) * hh, mode === 'week' ? 26 : 46) - 3;
  let left, width;
  if (mode === 'day' && lanes > 1) {
    // Cascade: each overlapping card steps right and sits on top of the previous one.
    const stepPct = Math.min(22, 44 / (lanes - 1));
    left = `calc(${lane * stepPct}% + 4px)`;
    width = `calc(${100 - (lanes - 1) * stepPct}% - 8px)`;
  } else {
    const w = 100 / lanes;
    left = `calc(${lane * w}% + 3px)`;
    width = `calc(${w}% - 6px)`;
  }
  const style = `--c:${colorOf(it)};top:${top}px;height:${height}px;left:${left};width:${width};z-index:${Math.min(lane + 1, 5)}`;
  if (mode === 'week') {
    return `<div class="ev ${done ? 'done' : ''}" style="${style}" data-action="edit" data-id="${it.id}"><div class="title">${esc(it.title)}</div><span class="ev-resize"></span></div>`;
  }
  const density = height < 56 ? 'short' : height < 76 ? 'compact' : '';
  return `<div class="ev ${done ? 'done' : ''} ${density}" style="${style}" data-action="edit" data-id="${it.id}">
    ${checkBtn(it, ds, done)}<span class="bar"></span>
    <div class="tx"><div class="title">${esc(it.title)}</div>${metaHtml(it, true)}</div>
    <span class="ev-resize"></span>
  </div>`;
}

function timeline(dates, mode) {
  const hh = HOUR_PX[mode];
  const tday = todayStr();
  const nm = nowMin();
  const perDay = dates.map((ds) => itemsOn(ds).filter((i) => i.start).map((it) => {
    const s = toMin(it.start);
    let e = it.end ? toMin(it.end) : s + 60;
    if (e <= s) e = s + 60;
    return { it, s, e: Math.min(e, 1440) };
  }));
  // Start the grid at 6:00 unless something is scheduled earlier.
  const startH = Math.min(6, ...perDay.flat().map((ev) => Math.floor(ev.s / 60)));
  const base = startH * 60;
  const nowShown = dates.includes(tday) && nm >= base;

  let hours = '';
  for (let h = startH + 1; h < 24; h++) {
    if (nowShown && Math.abs(nm - h * 60) < 14) continue;
    hours += `<div style="top:${(h - startH) * hh}px">${pad(h)}:00</div>`;
  }
  if (nowShown) hours += `<div class="now-label" style="top:${((nm - base) / 60) * hh}px">${fromMin(nm)}</div>`;

  const cols = dates.map((ds, i) => {
    const blocks = layout(perDay[i]).map((ev) => evBlock(ev, ds, mode, hh, base)).join('');
    const now = ds === tday && nowShown ? `<div class="now" style="top:${((nm - base) / 60) * hh}px"></div>` : '';
    return `<div class="col" data-col="${ds}">${blocks}${now}</div>`;
  }).join('');

  return `<div class="timeline ${mode}" data-start="${base}" style="--hh:${hh}px;--span:${24 - startH}">
    <div class="hours">${hours}</div>
    <div class="cols" style="grid-template-columns:repeat(${dates.length},minmax(0,1fr))">${cols}</div>
  </div>`;
}

// ---------- views ----------
function renderTodo() {
  const td = todayStr();
  const overdue = data.items.filter((it) => !isRecurring(it) && it.date && it.date < td && !it.done).sort((a, b) => a.date.localeCompare(b.date) || byTime(a, b));
  const today = itemsOn(td);
  const upcoming = data.items.filter((it) => !isRecurring(it) && it.date > td).sort((a, b) => a.date.localeCompare(b.date) || byTime(a, b));
  const someday = data.items.filter((it) => !it.date).sort(byTime);
  const left = overdue.length + today.filter((i) => !isDone(i, td)).length + upcoming.filter((i) => !i.done).length + someday.filter((i) => !i.done).length;

  const section = (title, items, dsOf) => `<h3 class="sec">${title}</h3>` +
    (items.length ? items.map((it) => taskCard(it, dsOf(it))).join('') : `<div class="empty">${t('todo.empty')}</div>`);

  let upcomingHtml = '';
  let lastDate = '';
  for (const it of upcoming) {
    if (it.date !== lastDate) {
      lastDate = it.date;
      upcomingHtml += `<h3 class="sec">${fmt(parse(it.date), { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</h3>`;
    }
    upcomingHtml += taskCard(it, it.date);
  }
  if (!upcoming.length) upcomingHtml = `<h3 class="sec">${t('todo.upcoming')}</h3><div class="empty">${t('todo.emptyUpcoming')}</div>`;

  return `<div class="head"><h1>${t('todo.title')}</h1><p>${t('todo.left', { n: left })}</p></div>
    <form class="quick"><input class="field" name="q" placeholder="${esc(t('todo.quick'))}" enterkeyhint="done" autocomplete="off"><button class="pill">${t('todo.add')}</button></form>
    <div class="todo-grid">
      <div>
        ${overdue.length ? section(t('todo.overdue'), overdue, (it) => it.date) : ''}
        ${section(t('todo.today', { date: fmt(new Date(), { day: '2-digit', month: 'short', year: 'numeric' }) }), today, () => td)}
      </div>
      <div>
        ${upcomingHtml}
        ${section(t('todo.someday'), someday, () => '')}
      </div>
    </div>`;
}

function habitChips(ds) {
  const d = parse(ds);
  const hs = data.habits.filter((h) => habitOn(h, d));
  if (!hs.length) return '';
  const future = ds > todayStr();
  return `<h3 class="sec">${t('day.habits')}</h3><div class="hchips">${hs.map((h) => `
    <button class="hchip ${h.log[ds] ? 'on' : ''}" style="--c:${COLORS[h.color] || COLORS.green}" data-action="habit-toggle" data-id="${h.id}" data-date="${ds}" ${future ? 'disabled' : ''}>
      <span class="he">${esc(h.emoji || '•')}</span><span class="hn">${esc(h.name)}</span><span class="check ${h.log[ds] ? 'on' : ''}">${CHECK}</span>
    </button>`).join('')}</div>`;
}

function renderDay() {
  const d = parse(ui.cursor);
  const items = itemsOn(ui.cursor);
  const untimed = items.filter((i) => !i.start);
  const strip = weekDates(d).map((x) => dayChip(x, 'pick')).join('');
  return `<div class="head"><h1>${fmt(d, { weekday: 'long' })}</h1><p>${fmt(d, { day: 'numeric', month: 'long', year: 'numeric' })}${items.length ? '' : ' · ' + t('day.tapHint')}</p></div>
    <div class="sticky"><div class="strip">${strip}</div></div>
    <div class="dayview">
      ${timeline([ui.cursor], 'day')}
      <aside class="side">
        ${habitChips(ui.cursor)}
        <h3 class="sec">${t('day.tasks')}</h3>
        ${untimed.length ? untimed.map((it) => taskCard(it, ui.cursor)).join('') : `<div class="empty">${t('day.noTasks')}</div>`}
      </aside>
    </div>`;
}

function renderWeek() {
  const days = weekDates(parse(ui.cursor));
  const dates = days.map(ymd);
  const untimed = dates.map((ds) => itemsOn(ds).filter((i) => !i.start));
  const hasUntimed = untimed.some((u) => u.length);
  return `<div class="head"><h1>${t('week.title')}</h1><p>${fmt(days[0], { day: 'numeric', month: 'short' })} – ${fmt(days[6], { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
    <div class="sticky weekhead"><div></div>${days.map((d) => dayChip(d, 'open-day')).join('')}</div>
    ${hasUntimed ? `<div class="wk-untimed"><div></div>${untimed.map((u, i) => `<div class="cell" data-action="open-day" data-date="${dates[i]}">${u.map((it) => mpill(it, dates[i])).join('')}</div>`).join('')}</div>` : ''}
    ${timeline(dates, 'week')}`;
}

function renderMonth() {
  const d = parse(ui.cursor);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const start = startOfWeek(first);
  const td = todayStr();
  const dow = Array.from({ length: 7 }, (_, i) => `<div class="dow">${fmt(addDays(start, i), { weekday: 'short' }).toUpperCase()}</div>`).join('');
  let cells = '';
  for (let day = start; day <= last || (day.getDay() + 6) % 7 !== 0; day = addDays(day, 1)) {
    const ds = ymd(day);
    const items = itemsOn(ds);
    const shown = items.slice(0, 4).map((it) => mpill(it, ds)).join('');
    const more = items.length > 4 ? `<div class="more">${t('month.more', { n: items.length - 4 })}</div>` : '';
    const cls = [day.getMonth() !== d.getMonth() ? 'other' : '', ds === td ? 'today' : ''].join(' ');
    cells += `<div class="cell-m ${cls}" data-action="open-day" data-date="${ds}"><div class="d">${day.getDate()}</div>${shown}${more}</div>`;
  }
  return `<div class="head"><h1>${fmt(first, { month: 'long', year: 'numeric' })}</h1><p>${t('month.hint')}</p></div>
    <div class="month">${dow}${cells}</div>`;
}

function renderHabits() {
  const days = weekDates(parse(ui.cursor));
  const td = todayStr();
  const head = `<div class="head"><h1>${t('habits.title')}</h1><p>${fmt(days[0], { day: 'numeric', month: 'short' })} – ${fmt(days[6], { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>`;
  if (!data.habits.length) {
    return head + `<div class="empty-card"><p>${t('habits.empty')}</p><button class="pill strong" data-action="new">${t('habits.add')}</button></div>`;
  }
  const headRow = `<div class="hgrid hhead"><div></div>${days.map((d) => `<div class="hday ${ymd(d) === td ? 'today' : ''}"><span>${fmt(d, { weekday: 'short' })}</span><b>${d.getDate()}</b></div>`).join('')}</div>`;
  const rows = data.habits.map((h) => {
    const cells = days.map((d) => {
      const ds = ymd(d);
      if (!habitOn(h, d)) return '<div class="hcell off"></div>';
      return `<div class="hcell"><button class="hcheck ${h.log[ds] ? 'on' : ''}" data-action="habit-toggle" data-id="${h.id}" data-date="${ds}" ${ds > td ? 'disabled' : ''}>${CHECK}</button></div>`;
    }).join('');
    const s = streak(h);
    return `<div class="hgrid hrow" style="--c:${COLORS[h.color] || COLORS.green}">
      <button class="hname" data-action="habit-edit" data-id="${h.id}">
        <span class="hemoji">${esc(h.emoji || '•')}</span>
        <span class="tx"><span class="title">${esc(h.name)}</span>
          <span class="meta">${s ? `<span>🔥 ${t('habits.streak', { n: s })}</span>` : ''}<span>${t('habits.month', { n: monthPct(h) })}</span></span>
        </span>
      </button>${cells}
    </div>`;
  }).join('');
  return head + headRow + rows;
}

function stars(n) {
  return n ? `<span class="rating">${'★'.repeat(n)}<span class="off">${'★'.repeat(5 - n)}</span></span>` : '';
}

function renderLists() {
  if (!data.collections.some((c) => c.id === ui.col)) ui.col = data.collections[0]?.id || '';
  const col = data.collections.find((c) => c.id === ui.col);
  const inCol = data.entries.filter((e) => e.col === ui.col);
  const chips = data.collections.map((c) => {
    const n = data.entries.filter((e) => e.col === c.id).length;
    return `<button class="cchip ${c.id === ui.col ? 'sel' : ''}" data-action="col-pick" data-id="${c.id}"><span>${esc(c.emoji || '•')}</span>${esc(colName(c))}<small>${n}</small></button>`;
  }).join('') + '<button class="cchip add" data-action="col-new" aria-label="+">+</button>';

  const seg = ['all', ...STATUSES].map((s) => {
    const n = s === 'all' ? inCol.length : inCol.filter((e) => e.status === s).length;
    return `<button class="${ui.status === s ? 'active' : ''}" data-action="status-pick" data-status="${s}">${s === 'all' ? t('lists.all') : t('status.' + s)} <small>${n}</small></button>`;
  }).join('');

  const shown = inCol
    .filter((e) => ui.status === 'all' || e.status === ui.status)
    .sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || (b.finished || '').localeCompare(a.finished || '') || b.created - a.created);

  const cards = shown.map((e) => {
    const src = urls.get(e.cover);
    return `<button class="entry" data-action="entry-edit" data-id="${e.id}">
      <div class="cover">${src ? `<img src="${src}" alt="">` : `<span class="ph">${esc(col?.emoji || '•')}</span><span class="ph-title">${esc(e.title)}</span>`}
        <span class="badge s-${e.status}">${t('status.' + e.status)}</span></div>
      <div class="ename">${esc(e.title)}</div>
      ${stars(e.rating)}
    </button>`;
  }).join('');

  return `<div class="head row-head"><div><h1>${col ? esc(col.emoji) + ' ' + esc(colName(col)) : ''}</h1></div>
      ${col ? `<button class="icon-btn" data-action="col-edit" aria-label="${esc(t('colsheet.edit'))}"><svg viewBox="0 0 24 24"><path d="M4 20l1.2-4.4L15.8 5a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.4 18.8z"/></svg></button>` : ''}
    </div>
    <div class="cchips">${chips}</div>
    <div class="seg status-filter">${seg}</div>
    ${cards ? `<div class="entries">${cards}</div>` : `<div class="empty-card"><p>${t('lists.empty')}</p></div>`}`;
}

const VIEWS = { todo: renderTodo, day: renderDay, week: renderWeek, month: renderMonth, habits: renderHabits, lists: renderLists };

function render() {
  document.querySelectorAll('#tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.view === ui.view));
  const navOn = ['day', 'week', 'month', 'habits'].includes(ui.view);
  $('.nav-date').classList.toggle('hidden', !navOn);
  $('#decorBtn').hidden = !decorKey();
  $('#lockBtn').hidden = !['day', 'week'].includes(ui.view) || ui.decorating;
  $('#lockBtn').classList.toggle('unlocked', !settings.lock);
  document.body.classList.toggle('tl-locked', settings.lock);
  document.body.classList.toggle('decorating', ui.decorating);

  const keep = main.scrollTop;
  main.innerHTML = VIEWS[ui.view]();
  const key = decorKey();
  if (key) decor.mountDecor(main, key);

  if (ui.resetScroll) {
    ui.resetScroll = false;
    const tl = main.querySelector('.timeline');
    main.scrollTop = 0;
    if (tl) {
      // Land near "now" during waking hours, otherwise at the first event (or 7am).
      const firstStart = itemsOn(ui.cursor).find((i) => i.start);
      const n = nowMin();
      const target = ui.cursor === todayStr() && n > 360 && n < 1320 ? n - 60 : firstStart ? toMin(firstStart.start) - 30 : 420;
      const sticky = main.querySelector('.sticky');
      const side = main.querySelector('.side');
      const stacked = side && getComputedStyle(side).position === 'static';
      const y = tl.offsetTop + ((target - +tl.dataset.start) / 60) * HOUR_PX[ui.view] - (sticky ? sticky.offsetHeight : 0) - 6;
      // When tasks sit above the timeline (narrow screens), don't scroll them out of sight.
      if (!stacked) main.scrollTop = Math.max(0, y);
    }
  } else {
    main.scrollTop = keep;
  }
}

// ---------- background ----------
function applyBackground() {
  const photoUrl = settings.theme === 'photo' && urls.get(settings.photo);
  const theme = photoUrl ? 'photo' : (THEMES[settings.theme] ? settings.theme : 'dusk');
  document.documentElement.dataset.theme = theme;
  const ph = $('#bgPhoto');
  if (photoUrl) {
    ph.style.backgroundImage = `url("${photoUrl}")`;
    ph.style.filter = settings.blur ? `blur(${settings.blur}px)` : '';
    // Scale up slightly so blurred edges don't show the page behind.
    ph.style.transform = `scale(${1 + settings.blur / 120})`;
    $('#bgDim').style.opacity = settings.dim / 100;
  } else {
    ph.style.backgroundImage = '';
  }
  renderThemes();
}

function renderThemes() {
  const photoUrl = urls.get(settings.photo);
  $('#themes').innerHTML = Object.entries(THEMES)
    .map(([k, v]) => `<button data-action="theme" data-theme="${k}" style="--t:${v}" class="${settings.theme === k ? 'sel' : ''}" aria-label="${k}"></button>`).join('') +
    (photoUrl ? `<button data-action="theme" data-theme="photo" style="--t:url('${photoUrl}') center/cover" class="${settings.theme === 'photo' ? 'sel' : ''}" aria-label="photo"></button>` : '');
  $('#photoControls').hidden = settings.theme !== 'photo' || !photoUrl;
  $('#blurRange').value = settings.blur;
  $('#dimRange').value = settings.dim;
}

$('#blurRange').addEventListener('input', (e) => { settings.blur = +e.target.value; applyBackground(); });
$('#dimRange').addEventListener('input', (e) => { settings.dim = +e.target.value; applyBackground(); });
$('#blurRange').addEventListener('change', saveSettings);
$('#dimRange').addEventListener('change', saveSettings);

$('#photoFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const id = await putBlob(await downscale(file, 2400, 'image/jpeg', 0.88));
    const old = settings.photo;
    settings.photo = id;
    settings.theme = 'photo';
    saveSettings();
    if (old && old !== id) dropBlob(old);
    applyBackground();
  } catch {
    toast(t('toast.imageFail'));
  }
});

// ---------- language ----------
function applyLanguage() {
  applyStatic();
  $('#langSeg').innerHTML = Object.entries(LANGS)
    .map(([k, v]) => `<button data-action="lang" data-lang="${k}" class="${getLang() === k ? 'active' : ''}">${v.name}</button>`).join('');
  $('#dayPick').innerHTML = weekDates(new Date()).map((d) => `<button type="button" data-day="${d.getDay()}">${fmt(d, { weekday: 'short' })}</button>`).join('');
  $('#statusSeg').innerHTML = STATUSES.map((s) => `<button type="button" data-status="${s}">${t('status.' + s)}</button>`).join('');
}

// ---------- overlays ----------
function openOverlay(id) { $(id).hidden = false; }
function closeOverlay(node) {
  const o = node.closest('.overlay');
  if (!o) return;
  if (o.id === 'entrySheet') discardEntryDraft();
  o.hidden = true;
}

// ---------- item sheet ----------
const form = $('#sheetForm');
const f = form.elements;
let editingId = null;
let selColor = 'blue';

const swatchHtml = (action) => Object.entries(COLORS)
  .map(([k, v]) => `<button type="button" data-action="${action}" data-color="${k}" style="--c:${v}" aria-label="${k}"></button>`).join('');
$('#swatches').innerHTML = swatchHtml('color');
$('#habitSwatches').innerHTML = swatchHtml('habit-color');

function pickColor(c) {
  selColor = COLORS[c] ? c : 'blue';
  document.querySelectorAll('#swatches button').forEach((b) => b.classList.toggle('sel', b.dataset.color === selColor));
}

function syncSheet() {
  const someday = f.someday.checked;
  $('#dateRow').hidden = someday;
  $('#timedRow').hidden = someday;
  $('#repeatRow').hidden = someday;
  $('#timeRow').hidden = someday || !f.timed.checked;
}

function openSheet(it, defaults = {}) {
  editingId = it ? it.id : null;
  const v = it || newItem({ date: defaults.date ?? todayStr(), start: defaults.start || '', end: defaults.end || '' });
  f.ttl.value = v.title;
  f.notes.value = v.notes;
  f.someday.checked = !v.date;
  f.date.value = v.date || todayStr();
  f.timed.checked = !!v.start;
  f.start.value = v.start || '09:00';
  f.end.value = v.end || '10:00';
  f.repeat.value = v.repeat || 'none';
  f.list.value = v.list ? '@' + v.list : '';
  f.tags.value = v.tags.map((x) => '#' + x).join(', ');
  pickColor(v.color);
  $('#listOptions').innerHTML = [...new Set(data.items.map((i) => i.list).filter(Boolean))].map((l) => `<option value="@${esc(l)}">`).join('');
  $('#sheetTitle').textContent = it ? t('item.edit') : t('item.new');
  $('#deleteBtn').hidden = !it;
  syncSheet();
  openOverlay('#sheet');
  if (!it) f.ttl.focus();
}

function saveSheet() {
  const title = f.ttl.value.trim();
  if (!title) { f.ttl.focus(); toast(t('item.nameFirst')); return; }
  const someday = f.someday.checked;
  let start = '', end = '';
  if (!someday && f.timed.checked && f.start.value) {
    start = f.start.value;
    end = f.end.value;
    if (!end || toMin(end) <= toMin(start)) end = fromMin(Math.min(toMin(start) + 60, 1439));
  }
  const clean = (s) => s.trim().replace(/^[@#]+/, '').trim();
  const patch = {
    title,
    notes: f.notes.value.trim(),
    date: someday ? '' : (f.date.value || todayStr()),
    start, end,
    repeat: someday ? 'none' : f.repeat.value,
    color: selColor,
    list: clean(f.list.value),
    tags: f.tags.value.split(/[,\s]+/).map(clean).filter(Boolean),
  };
  if (editingId) Object.assign(find(editingId), patch);
  else data.items.push(newItem(patch));
  save();
  $('#sheet').hidden = true;
  render();
}

function deleteItem() {
  const it = find(editingId);
  if (!it) return;
  if (!confirm(t(isRecurring(it) ? 'item.confirmDeleteRepeat' : 'item.confirmDelete', { title: it.title }))) return;
  data.items = data.items.filter((i) => i.id !== editingId);
  save();
  $('#sheet').hidden = true;
  render();
}

form.addEventListener('change', syncSheet);
form.addEventListener('submit', (e) => { e.preventDefault(); saveSheet(); });

function newAt(col, e) {
  const y = e.clientY - col.getBoundingClientRect().top;
  const base = +col.closest('.timeline').dataset.start;
  const m = Math.max(0, Math.min(1410, base + Math.floor((y / HOUR_PX[ui.view]) * 2) * 30));
  openSheet(null, { date: col.dataset.col, start: fromMin(m), end: fromMin(Math.min(m + 60, 1439)) });
  f.timed.checked = true;
  syncSheet();
}

// ---------- emoji palette (habit + list sheets) ----------
// Tappable emoji, so picking one doesn't depend on finding the emoji keyboard on iPad.
const EMOJI = {
  habitForm: ['💧', '📖', '🏃‍♀️', '🧘‍♀️', '💪', '🚶‍♀️', '🥗', '🍎', '😴', '🛏️', '🦷', '💊', '🧴', '🪥', '📝', '✍️', '📚', '🎧', '🎹', '🎨', '🌱', '🪴', '🧹', '🧺', '☀️', '🌙', '📵', '💰', '🗣️', '❤️', '⭐', '✨'],
  colForm: ['📚', '🎮', '🎬', '📺', '🎧', '🎵', '🍿', '🌸', '🦊', '🍜', '☕', '🍰', '✈️', '🗺️', '🎁', '🛍️', '👗', '💄', '🧶', '🎨', '📷', '🎲', '🧩', '⭐', '✨', '❤️', '🌱', '📝'],
};
const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter() : null;
// Keep just the first symbol, so a stray extra character can't break the icon.
function firstEmoji(s) {
  s = s.trim();
  if (!s) return '';
  return segmenter ? segmenter.segment(s)[Symbol.iterator]().next().value.segment : [...s].slice(0, 2).join('');
}
for (const [formId, list] of Object.entries(EMOJI)) {
  const form = $('#' + formId);
  form.querySelector('.emoji-pick').innerHTML = list.map((em) => `<button type="button" data-action="emoji-pick" data-emoji="${em}">${em}</button>`).join('');
  form.elements.emoji.addEventListener('input', () => syncEmojiPick(form));
}
function syncEmojiPick(form) {
  const cur = firstEmoji(form.elements.emoji.value);
  form.querySelectorAll('.emoji-pick button').forEach((b) => b.classList.toggle('sel', b.dataset.emoji === cur));
}

// ---------- habit sheet ----------
const hForm = $('#habitForm');
let habitDraft = null;

function openHabit(h) {
  habitDraft = h ? { ...h, days: [...h.days] } : newHabit({});
  hForm.elements.name.value = habitDraft.name;
  hForm.elements.emoji.value = habitDraft.emoji;
  $('#habitTitle').textContent = t(h ? 'habit.edit' : 'habit.new');
  $('#habitDelete').hidden = !h;
  syncHabitSheet();
  syncEmojiPick(hForm);
  openOverlay('#habitSheet');
  if (!h) hForm.elements.name.focus();
}
function syncHabitSheet() {
  document.querySelectorAll('#habitSwatches button').forEach((b) => b.classList.toggle('sel', b.dataset.color === habitDraft.color));
  document.querySelectorAll('#dayPick button').forEach((b) => b.classList.toggle('on', habitDraft.days.includes(+b.dataset.day)));
}
$('#dayPick').addEventListener('click', (e) => {
  const b = e.target.closest('[data-day]');
  if (!b) return;
  const d = +b.dataset.day;
  const s = new Set(habitDraft.days);
  if (s.has(d)) { if (s.size > 1) s.delete(d); } else s.add(d);
  habitDraft.days = [...s].sort();
  syncHabitSheet();
});
hForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = hForm.elements.name.value.trim();
  if (!name) { hForm.elements.name.focus(); toast(t('item.nameFirst')); return; }
  habitDraft.name = name;
  habitDraft.emoji = firstEmoji(hForm.elements.emoji.value);
  const i = data.habits.findIndex((x) => x.id === habitDraft.id);
  if (i >= 0) data.habits[i] = habitDraft; else data.habits.push(habitDraft);
  save();
  $('#habitSheet').hidden = true;
  render();
});
function deleteHabit() {
  if (!confirm(t('habit.confirmDelete', { name: habitDraft.name }))) return;
  data.habits = data.habits.filter((x) => x.id !== habitDraft.id);
  save();
  $('#habitSheet').hidden = true;
  render();
}

// ---------- entry sheet ----------
const eForm = $('#entryForm');
let entryDraft = null;

function openEntry(en) {
  entryDraft = en ? { ...en, origCover: en.cover } : { ...newEntry({ col: ui.col, status: ui.status !== 'all' ? ui.status : 'planned' }), origCover: '' };
  eForm.elements.title.value = entryDraft.title;
  eForm.elements.note.value = entryDraft.note;
  $('#entryCol').innerHTML = data.collections.map((c) => `<option value="${c.id}">${esc(c.emoji)} ${esc(colName(c))}</option>`).join('');
  $('#entryCol').value = entryDraft.col;
  $('#entryTitle').textContent = t(en ? 'entry.edit' : 'entry.new');
  $('#entryDelete').hidden = !en;
  syncEntrySheet();
  openOverlay('#entrySheet');
}
function syncEntrySheet() {
  const src = urls.get(entryDraft.cover);
  $('#coverPick').innerHTML = src ? `<img src="${src}" alt="">` : `<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="14" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4.5 3.5 3 3-2.5 4.5 4"/></svg><span>${t('entry.cover')}</span>`;
  $('#coverRemove').hidden = !src;
  $('#stars').innerHTML = [1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" class="${n <= entryDraft.rating ? 'on' : ''}">★</button>`).join('');
  document.querySelectorAll('#statusSeg button').forEach((b) => b.classList.toggle('active', b.dataset.status === entryDraft.status));
}
// A cover picked but never saved shouldn't linger in storage.
function discardEntryDraft() {
  if (entryDraft && entryDraft.cover && entryDraft.cover !== entryDraft.origCover) dropBlob(entryDraft.cover);
  entryDraft = null;
}
$('#stars').addEventListener('click', (e) => {
  const b = e.target.closest('[data-star]');
  if (!b) return;
  const n = +b.dataset.star;
  entryDraft.rating = entryDraft.rating === n ? 0 : n;
  syncEntrySheet();
});
$('#statusSeg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-status]');
  if (!b) return;
  entryDraft.status = b.dataset.status;
  syncEntrySheet();
});
$('#coverFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file || !entryDraft) return;
  try {
    const id = await putBlob(await downscale(file, 700, 'image/jpeg', 0.85));
    if (entryDraft.cover && entryDraft.cover !== entryDraft.origCover) dropBlob(entryDraft.cover);
    entryDraft.cover = id;
    syncEntrySheet();
  } catch {
    toast(t('toast.imageFail'));
  }
});
eForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = eForm.elements.title.value.trim();
  if (!title) { eForm.elements.title.focus(); toast(t('item.nameFirst')); return; }
  const { origCover, ...entry } = entryDraft;
  entry.title = title;
  entry.note = eForm.elements.note.value.trim();
  entry.col = $('#entryCol').value;
  if (entry.status === 'completed' && !entry.finished) entry.finished = todayStr();
  if (entry.status !== 'completed') entry.finished = '';
  if (origCover && origCover !== entry.cover) dropBlob(origCover);
  const i = data.entries.findIndex((x) => x.id === entry.id);
  if (i >= 0) data.entries[i] = entry; else data.entries.push(entry);
  ui.col = entry.col;
  save();
  entryDraft = null;
  $('#entrySheet').hidden = true;
  render();
});
function deleteEntry() {
  if (!confirm(t('entry.confirmDelete', { title: entryDraft.title || eForm.elements.title.value }))) return;
  dropBlob(entryDraft.cover);
  if (entryDraft.origCover !== entryDraft.cover) dropBlob(entryDraft.origCover);
  data.entries = data.entries.filter((x) => x.id !== entryDraft.id);
  save();
  entryDraft = null;
  $('#entrySheet').hidden = true;
  render();
}

// ---------- collection sheet ----------
const cForm = $('#colForm');
let colDraftId = null;

function openCol(c) {
  colDraftId = c ? c.id : null;
  cForm.elements.name.value = c ? colName(c) : '';
  cForm.elements.emoji.value = c ? c.emoji : '';
  $('#colTitle').textContent = t(c ? 'colsheet.edit' : 'colsheet.new');
  $('#colDelete').hidden = !c;
  syncEmojiPick(cForm);
  openOverlay('#colSheet');
  if (!c) cForm.elements.name.focus();
}
cForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = cForm.elements.name.value.trim();
  if (!name) { cForm.elements.name.focus(); toast(t('item.nameFirst')); return; }
  const emoji = firstEmoji(cForm.elements.emoji.value) || '✨';
  const c = data.collections.find((x) => x.id === colDraftId);
  if (c) {
    // Keep built-in lists translatable until they're actually renamed.
    c.name = c.key && name === t('col.' + c.key) ? '' : name;
    c.emoji = emoji;
  } else {
    const id = uid();
    data.collections.push({ id, key: '', name, emoji });
    ui.col = id;
    ui.status = 'all';
  }
  save();
  $('#colSheet').hidden = true;
  render();
});
function deleteCol() {
  const c = data.collections.find((x) => x.id === colDraftId);
  if (!c || !confirm(t('colsheet.confirmDelete', { name: colName(c) }))) return;
  for (const en of data.entries.filter((x) => x.col === c.id)) dropBlob(en.cover);
  data.entries = data.entries.filter((x) => x.col !== c.id);
  data.collections = data.collections.filter((x) => x.id !== c.id);
  save();
  $('#colSheet').hidden = true;
  render();
}

// ---------- decorate ----------
function startDecorating() {
  ui.decorating = true;
  decor.setEditing(true);
  syncDecorBar();
  render();
}
function stopDecorating() {
  ui.decorating = false;
  decor.setEditing(false);
  render();
}
function syncDecorBar() {
  document.querySelectorAll('#decorTools [data-tool]').forEach((b) => b.classList.toggle('active', b.dataset.tool === decor.opts.tool));
  document.querySelectorAll('#inks button').forEach((b) => b.classList.toggle('sel', b.dataset.ink === decor.opts.color));
  document.querySelectorAll('#sizes button').forEach((b) => b.classList.toggle('active', +b.dataset.size === decor.opts.size));
  $('#fingerBtn').classList.toggle('active', decor.opts.finger);
  const drawing = ['pen', 'hl'].includes(decor.opts.tool);
  $('#inks').classList.toggle('dim', !drawing);
  $('#sizes').classList.toggle('dim', !drawing);
}
$('#inks').innerHTML = INKS.map((c) => `<button data-ink="${c}" style="--c:${c}" aria-label="${c}"></button>`).join('');
$('#decorBar').addEventListener('click', (e) => {
  const tool = e.target.closest('[data-tool]');
  const ink = e.target.closest('[data-ink]');
  const size = e.target.closest('[data-size]');
  if (tool) decor.setTool(tool.dataset.tool);
  if (ink) { decor.opts.color = ink.dataset.ink; if (!['pen', 'hl'].includes(decor.opts.tool)) decor.setTool('pen'); }
  if (size) { decor.opts.size = +size.dataset.size; if (!['pen', 'hl'].includes(decor.opts.tool)) decor.setTool('pen'); }
  syncDecorBar();
});

function renderStickerGrid() {
  const cell = (src, mine) => `<button class="stk-pick" data-action="place-sticker" data-src="${src}"><img src="${stickerSrc(src)}" alt="">${mine ? `<span class="x" data-action="sticker-remove" data-src="${src}">×</span>` : ''}</button>`;
  const mine = data.stickers.map((s) => cell(s.id, true)).join('');
  $('#stickerGrid').innerHTML =
    (mine ? `<h3 class="sec">${t('stickers.mine')}</h3><div class="sticker-grid">${mine}</div>` : '') +
    `<h3 class="sec">${t('stickers.pack')}</h3><div class="sticker-grid">${Object.keys(BUILTIN_STICKERS).map((k) => cell(k, false)).join('')}</div>`;
}
$('#stickerFile').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  e.target.value = '';
  for (const file of files) {
    try {
      const id = await putBlob(await downscale(file, 600, 'image/png'));
      data.stickers.unshift({ id });
    } catch {
      toast(t('toast.imageFail'));
    }
  }
  save();
  renderStickerGrid();
});
function removeSticker(src) {
  data.stickers = data.stickers.filter((s) => s.id !== src);
  // Keep the image if it's already stuck on a page somewhere.
  if (!decor.decorUses(src)) dropBlob(src);
  save();
  renderStickerGrid();
}

// ---------- settings / backup ----------
$('#installHint').hidden = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;

async function exportData() {
  const blobs = {};
  try {
    for (const [k, b] of Object.entries(await idb.all('blobs'))) blobs[k] = await blobToDataURL(b);
  } catch { /* export without images */ }
  const payload = { app: 'dusk-planner', version: 2, data, settings, decor: decor.decorDump(), blobs };
  const name = `sprout-backup-${todayStr()}.json`;
  const file = new File([JSON.stringify(payload)], name, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Sprout planner backup' });
      return;
    }
  } catch (err) {
    if (err.name === 'AbortError') return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

$('#importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const d = JSON.parse(await file.text());
    const incoming = d.data || d; // v1 backups were the data object itself
    if (!Array.isArray(incoming.items)) throw new Error('bad file');
    if (!confirm(t('import.confirm', { n: incoming.items.length }))) return;
    if (d.blobs) {
      await idb.clear('blobs');
      for (const u of urls.values()) URL.revokeObjectURL(u);
      urls.clear();
      for (const [k, v] of Object.entries(d.blobs)) {
        const b = await dataURLToBlob(v);
        await idb.put('blobs', k, b);
        urls.set(k, URL.createObjectURL(b));
      }
    }
    if (d.decor) await decor.decorRestore(d.decor);
    if (d.settings) {
      const { lang, ...rest } = d.settings;
      Object.assign(settings, rest);
      saveSettings();
    }
    data = normalize(incoming);
    save();
    applyBackground();
    render();
    toast(t('toast.restored'));
  } catch {
    toast(t('toast.badFile'));
  }
});

function clearDone() {
  const before = data.items.length;
  data.items = data.items.filter((i) => isRecurring(i) || !i.done);
  const n = before - data.items.length;
  save();
  render();
  toast(n ? t('toast.cleared', { n }) : t('toast.nothingClear'));
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ---------- events ----------
function onNew() {
  if (ui.view === 'habits') openHabit(null);
  else if (ui.view === 'lists') { if (data.collections.length) openEntry(null); else openCol(null); }
  else openSheet(null, { date: ui.view === 'todo' ? todayStr() : ui.cursor });
}

document.addEventListener('click', (e) => {
  const tg = e.target;
  if (tg.classList.contains('overlay')) { closeOverlay(tg); return; }

  const v = tg.closest('[data-view]');
  if (v) { setView(v.dataset.view); return; }

  const a = tg.closest('[data-action]');
  if (!a) {
    const col = tg.closest('.col');
    if (col && !ui.decorating) newAt(col, e);
    return;
  }
  if (ui.decorating && a.closest('#main')) return; // the page is locked while decorating
  const { id, date } = a.dataset;
  switch (a.dataset.action) {
    case 'toggle': toggle(id, date); break;
    case 'edit': openSheet(find(id)); break;
    case 'new': onNew(); break;
    case 'lock':
      settings.lock = !settings.lock;
      saveSettings();
      toast(t(settings.lock ? 'lock.on' : 'lock.off'));
      render();
      break;
    case 'emoji-pick': {
      const input = a.closest('form').elements.emoji;
      input.value = a.dataset.emoji;
      syncEmojiPick(a.closest('form'));
      break;
    }
    case 'prev': step(-1); break;
    case 'next': step(1); break;
    case 'today': ui.cursor = todayStr(); ui.resetScroll = true; render(); break;
    case 'pick': ui.cursor = date; render(); break;
    case 'open-day': ui.cursor = date; setView('day'); break;
    case 'close': closeOverlay(a); break;
    case 'color': pickColor(a.dataset.color); break;
    case 'delete-item': deleteItem(); break;

    case 'habit-toggle': toggleHabit(id, date); break;
    case 'habit-edit': openHabit(data.habits.find((h) => h.id === id)); break;
    case 'habit-color': habitDraft.color = a.dataset.color; syncHabitSheet(); break;
    case 'delete-habit': deleteHabit(); break;

    case 'col-pick': ui.col = id; ui.status = 'all'; render(); break;
    case 'col-new': openCol(null); break;
    case 'col-edit': openCol(data.collections.find((c) => c.id === ui.col)); break;
    case 'delete-col': deleteCol(); break;
    case 'status-pick': ui.status = a.dataset.status; render(); break;
    case 'entry-edit': openEntry(data.entries.find((x) => x.id === id)); break;
    case 'cover-pick': $('#coverFile').click(); break;
    case 'cover-remove':
      if (entryDraft.cover !== entryDraft.origCover) dropBlob(entryDraft.cover);
      entryDraft.cover = '';
      syncEntrySheet();
      break;
    case 'delete-entry': deleteEntry(); break;

    case 'decorate': startDecorating(); break;
    case 'decor-done': stopDecorating(); break;
    case 'undo': if (!decor.undo()) toast(t('decor.nothingUndo')); break;
    case 'finger':
      settings.finger = !decor.opts.finger;
      decor.setFinger(settings.finger);
      saveSettings();
      syncDecorBar();
      break;
    case 'sticker-picker': renderStickerGrid(); openOverlay('#stickerSheet'); break;
    case 'place-sticker': $('#stickerSheet').hidden = true; decor.addSticker(a.dataset.src); break;
    case 'sticker-remove': removeSticker(a.dataset.src); break;
    case 'sticker-import': $('#stickerFile').click(); break;

    case 'settings': renderThemes(); openOverlay('#settingsSheet'); break;
    case 'theme': settings.theme = a.dataset.theme; saveSettings(); applyBackground(); break;
    case 'photo-pick': $('#photoFile').click(); break;
    case 'lang':
      settings.lang = a.dataset.lang;
      saveSettings();
      setLang(settings.lang);
      applyLanguage();
      render();
      break;
    case 'export': exportData(); break;
    case 'import': $('#importFile').click(); break;
    case 'clear-done': clearDone(); break;
  }
});

main.addEventListener('submit', (e) => {
  if (!e.target.matches('.quick')) return;
  e.preventDefault();
  const title = e.target.elements.q.value.trim();
  if (!title) return;
  data.items.push(newItem({ title, date: todayStr() }));
  save();
  render();
  main.querySelector('.quick input').focus();
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  document.querySelectorAll('.overlay:not([hidden])').forEach((o) => closeOverlay(o));
});

// Horizontal swipe moves back and forward (not while decorating: that's drawing).
let touch = null;
main.addEventListener('touchstart', (e) => {
  touch = e.touches.length === 1 && !ui.decorating ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
}, { passive: true });
main.addEventListener('touchend', (e) => {
  if (!touch) return;
  const dx = e.changedTouches[0].clientX - touch.x;
  const dy = e.changedTouches[0].clientY - touch.y;
  touch = null;
  if (Math.abs(dx) > 80 && Math.abs(dy) < 50) step(dx < 0 ? 1 : -1);
}, { passive: true });

// ---------- drag to move / resize on the timeline ----------
// Events: drag to move (snaps to 15 min), drag the bottom grip to resize.
// Day view: drag a loose task from the side panel onto the timeline to schedule it.
// Week view: drag sideways to move a one-off event to another day.
const SNAP = 15;
const snap = (m) => Math.round(m / SNAP) * SNAP;
let drag = null;
let suppressClick = false;

const timelineCols = () => [...main.querySelectorAll('.timeline .col')];
function colAt(x, y, ignoreY) {
  return timelineCols().find((c) => {
    const r = c.getBoundingClientRect();
    return x >= r.left && x < r.right && (ignoreY || (y >= r.top && y < r.bottom));
  });
}
function minuteAt(col, y) {
  const base = +col.closest('.timeline').dataset.start;
  return base + ((y - col.getBoundingClientRect().top) / HOUR_PX[ui.view]) * 60;
}

main.addEventListener('pointerdown', (e) => {
  if (ui.decorating || drag || !['day', 'week'].includes(ui.view) || e.button > 0) return;
  if (e.target.closest('.check')) return;
  const evEl = e.target.closest('.ev');
  if (evEl && settings.lock) return; // locked: events stay put, a tap still opens them
  const taskEl = !evEl && ui.view === 'day' ? e.target.closest('.side .task') : null;
  const it = (evEl || taskEl) && find((evEl || taskEl).dataset.id);
  if (!it) return;
  drag = {
    it, el: evEl || taskEl, fromSide: !!taskEl,
    mode: e.target.closest('.ev-resize') ? 'resize' : 'move',
    id: e.pointerId, type: e.pointerType,
    x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY,
    scroll0: main.scrollTop, active: false,
  };
  if (evEl) {
    drag.s0 = toMin(it.start);
    drag.e0 = it.end ? toMin(it.end) : drag.s0 + 60;
    if (drag.e0 <= drag.s0) drag.e0 = drag.s0 + 60;
    drag.base = +evEl.closest('.timeline').dataset.start;
  }
  // A finger needs a short press first so ordinary scrolling still works; Pencil and mouse drag right away.
  if (e.pointerType === 'touch' && drag.mode === 'move') drag.timer = setTimeout(startDrag, 260);
});

function startDrag() {
  if (!drag || drag.active) return;
  drag.active = true;
  touch = null; // not a swipe between days
  drag.el.classList.add('dragging');
  if (drag.fromSide) {
    const r = drag.el.getBoundingClientRect();
    const g = drag.el.cloneNode(true);
    g.classList.add('drag-ghost');
    g.classList.remove('dragging');
    Object.assign(g.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px' });
    document.body.appendChild(g);
    drag.ghost = g;
  }
  requestAnimationFrame(autoScroll);
}

function updateDrag() {
  const d = drag;
  const hh = HOUR_PX[ui.view];
  if (d.fromSide) {
    d.ghost.style.transform = `translate(${d.x - d.x0}px, ${d.y - d.y0}px) scale(1.03)`;
    const col = colAt(d.x, d.y);
    if (col) {
      const base = +col.closest('.timeline').dataset.start;
      d.target = { col, m: Math.max(base, Math.min(1380, snap(minuteAt(col, d.y) - 20))) };
      d.ghost.dataset.time = fromMin(d.target.m);
    } else {
      d.target = null;
      d.ghost.dataset.time = '';
    }
    return;
  }
  const delta = ((d.y - d.y0 + main.scrollTop - d.scroll0) / hh) * 60;
  let s = d.s0, en = d.e0;
  if (d.mode === 'resize') {
    en = Math.max(s + SNAP, Math.min(1440, snap(d.e0 + delta)));
  } else {
    const dur = d.e0 - d.s0;
    s = Math.max(d.base, Math.min(1440 - dur, snap(d.s0 + delta)));
    en = s + dur;
  }
  if (ui.view === 'week') {
    if (d.mode === 'move' && !isRecurring(d.it)) {
      const col = colAt(d.x, d.y, true);
      if (col && col !== d.el.parentElement) col.appendChild(d.el);
    }
    Object.assign(d.el.style, { left: '3px', width: 'calc(100% - 6px)' });
  }
  d.s = s;
  d.e = en;
  d.el.style.top = (((s - d.base) / 60) * hh + 1) + 'px';
  d.el.style.height = (Math.max(((en - s) / 60) * hh, ui.view === 'week' ? 26 : 46) - 3) + 'px';
  d.el.dataset.time = `${fromMin(s)}–${fromMin(Math.min(en, 1439))}`;
}

// Scroll the page while the dragged item is held near the top or bottom edge.
function autoScroll() {
  if (!drag || !drag.active) return;
  const r = main.getBoundingClientRect();
  const sticky = main.querySelector('.sticky');
  const top = r.top + (sticky ? sticky.offsetHeight : 0) + 50;
  const bottom = r.bottom - 110;
  const v = drag.y < top ? -Math.min(14, (top - drag.y) / 4 + 2) : drag.y > bottom ? Math.min(14, (drag.y - bottom) / 4 + 2) : 0;
  if (v) {
    main.scrollTop += v;
    updateDrag();
  }
  requestAnimationFrame(autoScroll);
}

window.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  drag.x = e.clientX;
  drag.y = e.clientY;
  if (!drag.active) {
    const moved = Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0);
    if (drag.type === 'touch' && drag.mode === 'move') {
      if (moved > 10) cancelDrag(); // moved before the press registered: it's a scroll
      return;
    }
    if (moved < 4) return;
    startDrag();
  }
  updateDrag();
});

window.addEventListener('pointerup', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  clearTimeout(drag.timer);
  const d = drag;
  drag = null;
  if (!d.active) return; // a plain tap: let the click open the editor
  suppressClick = true;
  setTimeout(() => { suppressClick = false; }, 400);
  if (d.ghost) d.ghost.remove();
  const it = d.it;
  if (d.fromSide) {
    if (d.target) {
      it.start = fromMin(d.target.m);
      it.end = fromMin(Math.min(d.target.m + 60, 1439));
      if (!isRecurring(it)) it.date = d.target.col.dataset.col;
    }
  } else if (d.s != null) {
    it.start = fromMin(d.s);
    it.end = fromMin(Math.min(d.e, 1439));
    const day = d.el.closest('.col')?.dataset.col;
    if (day && !isRecurring(it)) it.date = day;
  }
  save();
  render();
});

function cancelDrag() {
  if (!drag) return;
  clearTimeout(drag.timer);
  if (drag.ghost) drag.ghost.remove();
  const wasActive = drag.active;
  drag = null;
  if (wasActive) render();
}
window.addEventListener('pointercancel', (e) => { if (drag && e.pointerId === drag.id) cancelDrag(); });

// While dragging with a finger, stop iOS from scrolling the page underneath.
main.addEventListener('touchmove', (e) => { if (drag && drag.active) e.preventDefault(); }, { passive: false });
// The click that follows a drag shouldn't open the editor.
document.addEventListener('click', (e) => {
  if (!suppressClick) return;
  suppressClick = false;
  e.stopPropagation();
  e.preventDefault();
}, true);

// Re-layout on rotation (decor scales with width).
let lastWidth = main.clientWidth;
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (main.clientWidth !== lastWidth) { lastWidth = main.clientWidth; render(); }
  }, 150);
});

// Keep the "now" line moving and roll over at midnight or when the app is reopened.
let lastDay = todayStr();
function tick() {
  if (ui.decorating || drag) return;
  if (todayStr() !== lastDay) {
    if (ui.cursor === lastDay) ui.cursor = todayStr();
    lastDay = todayStr();
    render();
    return;
  }
  if (document.querySelector('.now')) render();
}
setInterval(tick, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });

// ---------- go ----------
(async function boot() {
  await Promise.all([loadBlobs(), decor.loadDecor(stickerSrc, () => syncDecorBar())]);
  // Optional deep link, e.g. index.html#week or index.html#month,aurora
  const [hashView, hashTheme] = location.hash.slice(1).split(',');
  if (VIEWS[hashView]) ui.view = hashView;
  if (THEMES[hashTheme]) settings.theme = hashTheme;
  applyLanguage();
  applyBackground();
  syncDecorBar();
  render();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
