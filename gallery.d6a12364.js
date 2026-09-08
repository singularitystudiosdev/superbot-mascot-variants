// Bloom variant gallery — every tile is regenerated from one 26×16 glyph mask.
// Renderers: glyphs (SVG <text>, per-cell explicit x/y), pixels (<rect> grid),
// vector (potrace trace path). Lens switcher re-renders mask-driven tiles in place.
'use strict';

const { cols, rows, colors, trace, eyes } = MASCOT;
const COLS = cols, ROWS = rows;
const NS = 'http://www.w3.org/2000/svg';
let uid = 0;

function el(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.append(n);
  return n;
}

// ---- char + color maps -----------------------------------------------------
const CHARFRAC = f => f >= .58 ? '*' : f >= .44 ? '+' : f >= .30 ? '=' : f >= .17 ? '-' : f >= .09 ? ':' : '.';
const DITHER = ' .:-=+*#%@';
const lumOf = hex => {
  const n = parseInt(hex.slice(1), 16);
  return (0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255;
};
const lerpHex = (a, b, t) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = i => Math.round(((pa >> i & 255) * (1 - t)) + ((pb >> i & 255) * t));
  return '#' + [16, 8, 0].map(i => c(i).toString(16).padStart(2, '0')).join('');
};
const sampled = (x, y) => colors[y][x] || null;
const aurora = (x) => {
  const t = x / (COLS - 1) * 2;
  return t < 1 ? lerpHex('#7dd3fc', '#c084fc', t) : lerpHex('#c084fc', '#f9a8d4', t - 1);
};
const rainbowRow = (x, y) => `hsl(${(205 + y * 10) % 360} 90% 62%)`;

function charFor(v, x, y) {
  const ink = v.glyphInk;
  if (ink === 'dither') return DITHER[Math.min(9, Math.round(lumOf(colors[y][x] || '#000000') * 9))];
  return CHARFRAC(v.fracs ? v.fracs[y][x] : cellFrac(x, y));
}
let FRACS = null;
function cellFrac(x, y) { return FRACS[y][x]; }

// ink spec → fill for one cell (glyphs/pixels renderers)
function inkColor(v, x, y) {
  const ink = v.glyphInk;
  if (ink === 'sampled') return sampled(x, y);
  if (ink === 'aurora') return aurora(x);
  if (ink === 'rainbowRow') return rainbowRow(x, y);
  if (ink && ink.grad) return `url(#${ink.grad}-${v._uid})`;
  return ink.color;
}

// ---- backgrounds -----------------------------------------------------------
function drawBg(svg, defs, v) {
  const bg = v.bg;
  if (bg.type === 'solid') {
    el('rect', { x: 0, y: 0, width: 200, height: 200, rx: bg.rx ?? 36, fill: bg.fill }, svg);
  } else if (bg.type === 'gradient') {
    const id = `bg-${v._uid}`;
    const g = el('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    bg.stops.forEach(([o, c]) => el('stop', { offset: o, 'stop-color': c }, g));
    el('rect', { x: 0, y: 0, width: 200, height: 200, rx: bg.rx ?? 36, fill: `url(#${id})` }, svg);
  } else if (bg.type === 'conic') {
    const clip = el('clipPath', { id: `cc-${v._uid}` }, defs);
    el('rect', { x: 0, y: 0, width: 200, height: 200, rx: 36 }, clip);
    const pie = el('g', { 'clip-path': `url(#cc-${v._uid})` }, svg);
    const R = 170, N = 90, off = v._uid * 37; // per-tile rotation offset
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1.15) / N) * Math.PI * 2;
      const p = `M100 100 L${100 + R * Math.cos(a0)} ${100 + R * Math.sin(a0)} A${R} ${R} 0 0 1 ${100 + R * Math.cos(a1)} ${100 + R * Math.sin(a1)} Z`;
      el('path', { d: p, fill: `hsl(${(i / N * 360 + off) % 360} 95% 58%)` }, pie);
    }
  }
  if (bg.grid) {
    const id = `gp-${v._uid}`;
    const pat = el('pattern', { id, width: 8, height: 8, patternUnits: 'userSpaceOnUse' }, defs);
    el('path', { d: 'M8 0H0V8', fill: 'none', stroke: '#1c3a55', 'stroke-width': .6 }, pat);
    el('rect', { x: 0, y: 0, width: 200, height: 200, rx: 36, fill: `url(#${id})` }, svg);
  }
}

// ---- renderers -------------------------------------------------------------
function drawGlyphs(g, v) {
  const k = 0.56, off = (200 - 260 * k) / 2;
  const gt = el('g', {
    transform: `translate(${off},${off}) scale(${k})`,
    'font-family': `ui-monospace,'SF Mono',Menlo,Consolas,monospace`,
    'font-size': 16.25, 'text-anchor': 'middle'
  }, g);
  const animated = v.glyphInk && v.glyphInk.grad;
  for (let y = 0; y < ROWS; y++) {
    const t = el('text', {}, gt);
    for (let x = 0; x < COLS; x++) {
      const ch = charFor(v, x, y);
      if (ch === ' ' || ch === undefined) continue;
      const fill = inkColor(v, x, y);
      el('tspan', { x: x * 10 + 5, y: y * 16.25 + 13, fill }, t).textContent = ch;
    }
  }
  return gt;
}

function drawPixels(g, v) {
  const b = 6.5, ox = (200 - COLS * b) / 2, oy = (200 - ROWS * b) / 2;
  const pg = el('g', { transform: `translate(${ox},${oy})`, 'shape-rendering': 'crispEdges' }, g);
  const ink = v.glyphInk === 'dither' ? { color: '#e8e8ea' } : v.glyphInk;
  const proxy = { ...v, glyphInk: ink, _uid: v._uid };
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (!sampled(x, y)) continue; // on-cells only
    el('rect', { x: x * b, y: y * b, width: b, height: b, fill: inkColor(proxy, x, y) }, pg);
  }
}

function drawTrace(g, defs, v) {
  const k = 1.17, w = 128 * k, h = 118 * k;
  // potrace emits bitmap coords ×10 with y flipped — undo its outer transform
  const tg = el('g', { transform: `translate(${(200 - w) / 2},${(200 - h) / 2}) scale(${k}) translate(0,118) scale(0.1,-0.1)` }, g);
  const ink = v.vectorInk;
  const common = { d: trace.d };
  if (ink.stroke) {
    el('path', { ...common, fill: 'none', stroke: ink.stroke, 'stroke-width': ink.sw || 1.6, 'stroke-linejoin': 'round' }, tg);
  } else if (ink.glow) {
    const mk = (blur, color, op) => {
      const f = el('filter', { id: `gl${blur}-${v._uid}`, x: '-40%', y: '-40%', width: '180%', height: '180%' }, defs);
      el('feGaussianBlur', { stdDeviation: blur }, f);
      el('path', { ...common, fill: color, opacity: op, filter: `url(#gl${blur}-${v._uid})` }, tg);
    };
    mk(11, '#ff3df5', .55); mk(5, '#7a5cff', .8); mk(2, '#20d4ff', .95);
    const gid = `rg-${v._uid}`;
    const gr = el('linearGradient', { id: gid, gradientUnits: 'userSpaceOnUse', x1: 0, y1: 1180, x2: 0, y2: 0 }, defs);
    [['0', '#ff5ad5'], ['.35', '#a06bff'], ['.65', '#37e0ff'], ['1', '#5cff8a']].forEach(([o, c]) => el('stop', { offset: o, 'stop-color': c }, gr));
    el('path', { ...common, fill: `url(#${gid})` }, tg);
  } else if (ink.sticker) {
    const f = el('filter', { id: `sh-${v._uid}`, x: '-30%', y: '-30%', width: '160%', height: '160%' }, defs);
    el('feDropShadow', { dx: 0, dy: 4, stdDeviation: 4, 'flood-color': '#000', 'flood-opacity': .35 }, f);
    el('path', { ...common, fill: ink.fill, stroke: ink.fill, 'stroke-width': 12, 'stroke-linejoin': 'round', 'paint-order': 'stroke', filter: `url(#sh-${v._uid})` }, tg);
  } else {
    let fill = ink.fill;
    if (ink.grad) {
      const gid = `${ink.grad}-${v._uid}`;
      const vert = ink.grad === 'rainbowV';
      // gradients on the trace path resolve in RAW potrace coords (×10, y flipped):
      // top of the displayed shape = raw y 1180, bottom = raw y 0
      const gr = el('linearGradient', { id: gid, gradientUnits: 'userSpaceOnUse', x1: 0, y1: vert ? 1180 : 0, x2: vert ? 0 : 1280, y2: 0 }, defs);
      const stops = ink.grad === 'rainbowV'
        ? [['0', '#ff5ad5'], ['.3', '#8a5cff'], ['.55', '#37b6ff'], ['.78', '#43ef8a'], ['1', '#ffe14d']]
        : [['0', '#7dd3fc'], ['.5', '#c084fc'], ['1', '#f9a8d4']];
      stops.forEach(([o, c]) => el('stop', { offset: o, 'stop-color': c }, gr));
      fill = `url(#${gid})`;
    }
    el('path', { ...common, fill }, tg);
  }
  if (v.brows) {
    eyes.forEach(e => {
      el('rect', { x: e.cx - e.rx * .62, y: e.cy - e.ry * 1.28, width: e.rx * 1.24, height: e.ry * .18, rx: e.ry * .09, fill: '#101014' }, tg);
    });
  }
  if (v.kawaii) drawBlush(tg);
  return tg;
}

// blush, in trace coords: below and outside each eye
function drawBlush(tg) {
  const l = eyes[0], r = eyes[1];
  el('ellipse', { cx: l.cx - l.rx * 1.45, cy: l.cy + l.ry * .95, rx: 8.5, ry: 4.8, fill: '#ff9fb0', opacity: .9 }, tg);
  el('ellipse', { cx: r.cx + r.rx * 1.45, cy: r.cy + r.ry * .95, rx: 8.5, ry: 4.8, fill: '#ff9fb0', opacity: .9 }, tg);
}

// face details live in the trace's own coordinate space (128×118)
function drawEyes(tg) {
  eyes.forEach(e => {
    el('ellipse', { cx: e.cx, cy: e.cy, rx: e.rx * .92, ry: e.ry * .92, fill: '#ffffff' }, tg);
    el('ellipse', { cx: e.cx, cy: e.cy + 1.5, rx: e.rx * .52, ry: e.ry * .58, fill: '#1a1a24' }, tg);
    el('circle', { cx: e.cx - e.rx * .28, cy: e.cy - e.ry * .34, r: 2.6, fill: '#ffffff' }, tg);
    el('circle', { cx: e.cx + e.rx * .3, cy: e.cy - e.ry * .18, r: 1.3, fill: '#ffffff', opacity: .8 }, tg);
  });
}

function drawScanlines(svg, defs, v) {
  const id = `sc-${v._uid}`;
  const pat = el('pattern', { id, width: 3, height: 3, patternUnits: 'userSpaceOnUse' }, defs);
  el('rect', { width: 3, height: 1.6, fill: 'rgba(0,0,0,.38)' }, pat);
  el('rect', { x: 0, y: 0, width: 200, height: 200, rx: 36, fill: `url(#${id})` }, svg);
}

// ---- prism animated gradient ----------------------------------------------
function prismGrad(defs, v) {
  const gid = `prism-${v._uid}`;
  const gr = el('linearGradient', {
    id: gid, gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: 260, y2: 0,
    spreadMethod: 'repeat'
  }, defs);
  for (let i = 0; i <= 12; i++) el('stop', { offset: i / 12, 'stop-color': `hsl(${i * 30} 95% 62%)` }, gr);
  const an = el('animateTransform', {
    attributeName: 'gradientTransform', type: 'translate',
    from: '0 0', to: '260 0', dur: '7s', repeatCount: 'indefinite'
  }, gr);
  return gid;
}

// ---- tile renderer ---------------------------------------------------------
function renderTile(v, lensOverride, opts = {}) {
  v._uid = v._uid || (++uid);
  const lens = (lensOverride && !v.fixed) ? lensOverride : v.lens;
  const svg = el('svg', { viewBox: '0 0 200 200', role: 'img', 'aria-label': `${v.name} — ${v.cat}` });
  const defs = el('defs', {}, svg);
  drawBg(svg, defs, v);
  const g = el('g', {}, svg);
  if (lens === 'glyphs') {
    if (v.glyphInk && v.glyphInk.grad === 'prism') prismGrad(defs, v); // id = prism-<uid>, inkColor resolves it
    drawGlyphs(g, v);
  } else if (lens === 'pixels') {
    drawPixels(g, v);
  } else {
    const tg = drawTrace(g, defs, v);
    if (v.kawaii) drawEyes(tg);
  }
  if (v.scan && lens !== 'vector') drawScanlines(svg, defs, v);
  if (opts.pause && matchMedia('(prefers-reduced-motion: reduce)').matches) svg.pauseAnimations();
  return svg;
}

// ---- variant registry ------------------------------------------------------
// glyphInk: 'sampled' | 'aurora' | 'rainbowRow' | 'dither' | {grad} | {color}
// vectorInk: {fill} | {grad:'rainbowV'|'auroraH'} | {stroke,sw} | {glow} | {sticker}
const VARIANTS = [
  { id: 'bloom', name: 'Bloom', cat: 'glyphs', lens: 'glyphs',
    note: 'The original, regenerated cell-for-cell: every glyph colored from the sampled pixel of bloom.png beneath it.',
    bg: { type: 'solid', fill: '#0b0d10' }, glyphInk: 'sampled', vectorInk: { grad: 'rainbowV' } },
  { id: 'icon', name: 'Icon', cat: 'vector', lens: 'vector', fixed: true, brows: true,
    note: 'The flat app-icon look: the smooth vector trace on the product’s sage green, eyebrow marks included.',
    bg: { type: 'gradient', stops: [['0', '#98d2a6'], ['1', '#7cbb8c']], rx: 44 }, glyphInk: { color: '#23402a' }, vectorInk: { fill: '#101014' } },
  { id: 'pixels', name: 'Pixels', cat: 'pixel', lens: 'pixels', fixed: true,
    note: 'One crisp <rect> per on-cell — the mask as chunky pixel art, same sampled colors.',
    bg: { type: 'solid', fill: '#0b0d10' }, glyphInk: 'sampled', vectorInk: { grad: 'rainbowV' } },
  { id: 'conic', name: 'Conic', cat: 'silhouette', lens: 'vector',
    note: 'White mascot on a full conic rainbow — the inverse of the original: color moves to the background.',
    bg: { type: 'conic' }, glyphInk: { color: '#ffffff' }, vectorInk: { fill: '#ffffff' } },
  { id: 'kawaii', name: 'Kawaii', cat: 'vector', lens: 'vector',
    note: 'Glossy eyes, sparkles and blush — the silhouette taught to smile.',
    bg: { type: 'solid', fill: '#fdf3e7' }, kawaii: true, glyphInk: { color: '#2a2a35' }, vectorInk: { fill: '#2a2a35' } },
  { id: 'inverse', name: 'Inverse', cat: 'silhouette', lens: 'vector',
    note: 'The rainbow poured into the mascot itself: a vertical spectrum fill on black.',
    bg: { type: 'solid', fill: '#050507' }, glyphInk: 'rainbowRow', vectorInk: { grad: 'rainbowV' } },
  { id: 'dither', name: 'Dither', cat: 'glyphs', lens: 'glyphs',
    note: 'Pure text: the glyph chosen by each cell’s sampled luminance, from space to @.',
    bg: { type: 'solid', fill: '#101014' }, glyphInk: 'dither', vectorInk: { fill: '#e8e8ea' } },
  { id: 'blueprint', name: 'Blueprint', cat: 'vector', lens: 'vector',
    note: 'The mascot as an engineering drawing: cyan outline over a faint drafting grid.',
    bg: { type: 'solid', fill: '#0a1626', grid: true }, glyphInk: { color: '#7dd8ff' }, vectorInk: { stroke: '#53c7ff', sw: 1.6 } },
  { id: 'aurora', name: 'Aurora', cat: 'glyphs', lens: 'glyphs',
    note: 'One recolor, done properly: the glyph colors swept sky-to-dusk across the columns.',
    bg: { type: 'solid', fill: '#0b0d10' }, glyphInk: 'aurora', vectorInk: { grad: 'auroraH' } },
  { id: 'sticker', name: 'Sticker', cat: 'vector', lens: 'vector',
    note: 'Die-cut sticker: fat white border, soft shadow, ready for a laptop lid.',
    bg: { type: 'solid', fill: '#b3a698' }, glyphInk: { color: '#ffffff' }, vectorInk: { sticker: true, fill: '#ffffff' } },
  { id: 'term', name: 'Term', cat: 'glyphs', lens: 'glyphs',
    note: 'Phosphor green on a scanning CRT — the mascot as a terminal session.',
    bg: { type: 'solid', fill: '#050805' }, scan: true, glyphInk: { color: '#33ff66' }, vectorInk: { fill: '#33ff66' } },
  { id: 'onyx', name: 'Onyx', cat: 'silhouette', lens: 'vector',
    note: 'Black mascot, same conic rainbow — Conic’s dark twin.',
    bg: { type: 'conic' }, glyphInk: { color: '#0c0d10' }, vectorInk: { fill: '#0c0d10' } },
  { id: 'neon', name: 'Neon', cat: 'vector', lens: 'vector',
    note: 'Three stacked glow layers under a spectrum core — the mascot as a sign on Congress Ave.',
    bg: { type: 'solid', fill: '#050508' }, glyphInk: { color: '#8be9fd' }, vectorInk: { glow: true } },
  { id: 'prism', name: 'Prism', cat: 'glyphs', lens: 'glyphs', fixed: true,
    note: 'Alive: one rainbow gradient sweeping through the glyphs on a 7-second loop.',
    bg: { type: 'solid', fill: '#0a0a0e' }, glyphInk: { grad: 'prism' }, vectorInk: { grad: 'rainbowV' } },
];

// short caption line per tile (the note's full text lives in the lightbox)
const TAGS = {
  bloom: 'the original, verbatim', icon: 'the app icon', pixels: 'chunky pixel art',
  conic: 'white on rainbow', kawaii: 'taught to smile', inverse: 'rainbow fill, on black',
  dither: 'pure text', blueprint: 'engineering drawing', aurora: 'one proper recolor',
  sticker: 'die-cut', term: 'terminal session', onyx: 'black on rainbow',
  neon: 'glow sign', prism: 'alive — 7s loop',
};
FRACS = MASCOT.fracs;

// ---- grid ------------------------------------------------------------------
const gridEl = document.getElementById('grid');
let lensOverride = '';
function buildGrid() {
  gridEl.replaceChildren();
  VARIANTS.forEach((v, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    const btn = document.createElement('button');
    btn.className = 'tile';
    btn.setAttribute('aria-label', `${v.name} — open details`);
    const svg = renderTile(v, lensOverride, { pause: true });
    btn.append(svg);
    btn.addEventListener('click', () => openLb(i));
    const cap = document.createElement('div');
    cap.className = 'cap';
    cap.innerHTML = `<b>${v.name}</b><small>${TAGS[v.id] || ''}</small>`;
    card.append(btn, cap);
    gridEl.append(card);
  });
}
buildGrid();

// lens switcher
document.querySelectorAll('.lenses button').forEach(b => {
  b.addEventListener('click', () => {
    lensOverride = b.dataset.lens;
    document.querySelectorAll('.lenses button').forEach(x =>
      x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    buildGrid();
  });
});

// ---- lightbox --------------------------------------------------------------
const lb = document.getElementById('lb');
const lbStage = document.getElementById('lbStage');
let cur = 0;
function effectiveLens(v) { return (lensOverride && !v.fixed) ? lensOverride : v.lens; }

function asciiText(v) {
  const out = [];
  for (let y = 0; y < ROWS; y++) {
    let line = '';
    for (let x = 0; x < COLS; x++) {
      const on = !!colors[y][x];
      line += on ? charFor(v, x, y) : ' ';
    }
    out.push(line.replace(/\s+$/, ''));
  }
  return out.join('\n');
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 1600);
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function serialize(v) {
  const svg = renderTile(v, lensOverride);
  svg.setAttribute('xmlns', NS);
  return new XMLSerializer().serializeToString(svg);
}

function openLb(i) {
  cur = (i + VARIANTS.length) % VARIANTS.length;
  const v = VARIANTS[cur];
  lbStage.replaceChildren(renderTile(v, lensOverride, { pause: true }));
  document.getElementById('lbName').textContent = v.name;
  document.getElementById('lbCat').textContent = v.cat;
  document.getElementById('lbNote').textContent = v.note;
  document.getElementById('dlTxt').hidden = effectiveLens(v) !== 'glyphs';
  document.getElementById('prev').hidden = false;
  document.getElementById('next').hidden = false;
  if (!lb.open) lb.showModal();
}

function closeLb() { if (lb.open) lb.close(); document.getElementById('prev').hidden = true; document.getElementById('next').hidden = true; }

document.getElementById('prev').addEventListener('click', () => openLb(cur - 1));
document.getElementById('next').addEventListener('click', () => openLb(cur + 1));
lb.addEventListener('close', () => { document.getElementById('prev').hidden = true; document.getElementById('next').hidden = true; });
lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
document.addEventListener('keydown', e => {
  if (!lb.open) return;
  if (e.key === 'ArrowLeft') openLb(cur - 1);
  if (e.key === 'ArrowRight') openLb(cur + 1);
  if (e.key === 'Escape') closeLb();
});

document.getElementById('dlSvg').addEventListener('click', () => {
  const v = VARIANTS[cur];
  download(new Blob([serialize(v)], { type: 'image/svg+xml' }), `bloom-${v.id}.svg`);
  toast('SVG downloaded');
});
document.getElementById('dlPng').addEventListener('click', () => {
  const v = VARIANTS[cur];
  const svg = renderTile(v, lensOverride);
  svg.setAttribute('xmlns', NS);
  const src = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = c.height = 1000;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, 1000, 1000);
    c.toBlob(b => { download(b, `bloom-${v.id}.png`); toast('PNG downloaded'); });
  };
  img.onerror = () => toast('PNG export failed');
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
});
document.getElementById('dlTxt').addEventListener('click', async () => {
  const v = VARIANTS[cur];
  const txt = asciiText(v);
  try {
    await navigator.clipboard.writeText(txt);
    toast('ASCII copied');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = txt; document.body.append(ta); ta.select();
    try { document.execCommand('copy'); toast('ASCII copied'); }
    catch { toast('Copy failed'); }
    ta.remove();
  }
});
