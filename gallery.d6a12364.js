// Bloom shape studies — twelve different body plans for the rainbow mascot.
// Every silhouette is hand-built from clean SVG primitives (rects, ellipses,
// curve paths) rendered through a mask, so edges stay crisp and eyes are true
// holes that work over any background. No ASCII, no bitmap tracing.
'use strict';

const NS = 'http://www.w3.org/2000/svg';
let uid = 0;

function el(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.append(n);
  return n;
}

// ---- shape helpers (all return SVG elements; fill inherited unless given) --
function head(x, y, w, h, r, parent, shape) {
  if (shape === 'ellipse') return el('ellipse', { cx: x + w / 2, cy: y + h / 2, rx: w / 2, ry: h / 2 }, parent);
  return el('rect', { x, y, width: w, height: h, rx: r ?? Math.min(w, h) * 0.3 }, parent);
}
// soft triangle ear: base (bx0..bx1 at by), apex (ax, ay)
function earPath(ax, ay, bx0, bx1, by, parent, tip = 0.35) {
  const c = (by - ay) * tip; // how far below the apex the curve controls sit
  const d = `M${bx0} ${by} Q${bx0 + (ax - bx0) * 0.12} ${by - c} ${ax} ${ay} Q${bx1 - (bx1 - ax) * 0.12} ${by - c} ${bx1} ${by} Z`;
  return el('path', { d }, parent);
}
function oval(cx, cy, rx, ry, parent, extra = {}) {
  return el('ellipse', { cx, cy, rx, ry, ...extra }, parent);
}
// scalloped bottom edge (ghost): from (x1,y) back to (x0,y) with n bumps
function ghostBody(x0, x1, y, bumps, depth, parent) {
  const step = (x1 - x0) / bumps;
  let d = `M${x0} ${y - depth * 2} L${x0} ${y}`;
  for (let i = 0; i < bumps; i++) {
    const sx = x0 + i * step;
    d += ` A${step / 2} ${depth} 0 0 0 ${sx + step} ${y}`;
  }
  d += ` L${x1} ${y - depth * 2} Z`;
  return el('path', { d }, parent);
}

// ---- tile backgrounds ------------------------------------------------------
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
    const R = 170, N = 90;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1.15) / N) * Math.PI * 2;
      const p = `M100 100 L${100 + R * Math.cos(a0)} ${100 + R * Math.sin(a0)} A${R} ${R} 0 0 1 ${100 + R * Math.cos(a1)} ${100 + R * Math.sin(a1)} Z`;
      el('path', { d: p, fill: `hsl(${(i / N * 360) % 360} 95% 58%)` }, pie);
    }
  }
  if (bg.grid) {
    const id = `gp-${v._uid}`;
    const pat = el('pattern', { id, width: 8, height: 8, patternUnits: 'userSpaceOnUse' }, defs);
    el('path', { d: 'M8 0H0V8', fill: 'none', stroke: '#1c3a55', 'stroke-width': .6 }, pat);
    el('rect', { x: 0, y: 0, width: 200, height: 200, rx: 36, fill: `url(#${id})` }, svg);
  }
}

// ---- the twelve body plans -------------------------------------------------
// Each compose(shape, detail) fills `shape` (white, masked → true holes) and
// `detail` (drawn on top in the foreground color, never masked).
const PLANS = {
  classic(s) {
    head(45, 42, 110, 96, 34, s);                    // wide head
    earPath(56, 34, 40, 74, 58, s);                  // left nub ear
    earPath(144, 34, 126, 160, 58, s);               // right nub ear
    el('rect', { x: 62, y: 134, width: 76, height: 18, rx: 9 }, s); // feet bar
    oval(83, 92, 15, 22, s, { fill: '#000' });       // left eye (hole)
    oval(117, 92, 15, 22, s, { fill: '#000' });      // right eye (hole)
  },
  icon(s, d) {
    head(48, 52, 104, 88, 30, s);
    earPath(64, 44, 48, 82, 66, s, 0.5);             // short folded-ish left ear
    earPath(138, 32, 120, 156, 62, s, 0.3);          // tall right ear
    oval(84, 98, 16, 21, s, { fill: '#000' });
    oval(118, 98, 16, 21, s, { fill: '#000' });
    el('rect', { x: 68, y: 66, width: 20, height: 6, rx: 3 }, d);  // brows
    el('rect', { x: 114, y: 66, width: 20, height: 6, rx: 3 }, d);
  },
  chibi(s, d) {
    head(34, 40, 132, 108, 46, s);                   // mega head
    earPath(58, 22, 48, 76, 58, s, 0.6);             // tiny ears poking above
    earPath(142, 22, 124, 152, 58, s, 0.6);
    oval(76, 96, 17, 26, s, { fill: '#000' });       // huge eyes
    oval(124, 96, 17, 26, s, { fill: '#000' });
    oval(56, 128, 9, 5.5, d, { fill: '#ff9fb0' });   // blush
    oval(144, 128, 9, 5.5, d, { fill: '#ff9fb0' });
  },
  fox(s) {
    head(52, 62, 96, 76, 26, s);                     // slim face
    earPath(60, 18, 50, 86, 74, s, 0.18);            // tall point ears
    earPath(140, 18, 114, 150, 74, s, 0.18);
    oval(84, 100, 12, 18, s, { fill: '#000' });
    oval(118, 100, 12, 18, s, { fill: '#000' });
    el('path', { d: 'M96 126 Q101 134 106 126', fill: 'none', stroke: '#000', 'stroke-width': 4, 'stroke-linecap': 'round' }, s); // tiny mouth notch
  },
  round(s) {
    head(50, 52, 100, 100, 50, s, 'ellipse');        // perfect circle
    oval(64, 62, 13, 16, s, { transform: 'rotate(-18 64 62)' });   // tiny round ears
    oval(136, 62, 13, 16, s, { transform: 'rotate(18 136 62)' });
    oval(84, 102, 8, 11, s, { fill: '#000' });       // dot eyes
    oval(116, 102, 8, 11, s, { fill: '#000' });
  },
  box(s) {
    head(48, 46, 104, 100, 12, s);                   // square head
    el('rect', { x: 56, y: 30, width: 26, height: 24, rx: 5 }, s);  // blocky ears
    el('rect', { x: 118, y: 30, width: 26, height: 24, rx: 5 }, s);
    el('rect', { x: 74, y: 84, width: 18, height: 26, rx: 3, fill: '#000' }, s);
    el('rect', { x: 108, y: 84, width: 18, height: 26, rx: 3, fill: '#000' }, s);
  },
  robo(s, d) {
    head(44, 58, 112, 84, 14, s);                    // boxy low head
    el('rect', { x: 98, y: 30, width: 4, height: 28 }, d);          // antenna
    oval(100, 24, 7, 7, d);                          // antenna bulb
    el('rect', { x: 34, y: 88, width: 10, height: 14, rx: 3 }, d);  // side bolts
    el('rect', { x: 156, y: 88, width: 10, height: 14, rx: 3 }, d);
    el('rect', { x: 62, y: 78, width: 76, height: 26, rx: 12, fill: '#000' }, s); // visor slot
    el('rect', { x: 74, y: 86, width: 14, height: 14, rx: 2 }, d);  // pupils
    el('rect', { x: 112, y: 86, width: 14, height: 14, rx: 2 }, d);
  },
  loaf(s, d) {
    el('rect', { x: 30, y: 108, width: 140, height: 58, rx: 26 }, s); // loaf body
    head(56, 52, 88, 74, 28, s);                     // head on top
    earPath(72, 44, 58, 88, 62, s, 0.45);
    earPath(128, 44, 112, 142, 62, s, 0.45);
    oval(88, 92, 11, 16, s, { fill: '#000' });
    oval(112, 92, 11, 16, s, { fill: '#000' });
    el('rect', { x: 78, y: 128, width: 3.5, height: 36, fill: '#000' }, s); // paw seams
    el('rect', { x: 99, y: 128, width: 3.5, height: 36, fill: '#000' }, s);
    el('rect', { x: 120, y: 128, width: 3.5, height: 36, fill: '#000' }, s);
  },
  ghost(s) {
    head(46, 40, 108, 110, 40, s);
    earPath(66, 34, 50, 84, 56, s, 0.5);
    earPath(134, 34, 116, 150, 56, s, 0.5);
    oval(84, 96, 14, 20, s, { fill: '#000' });
    oval(118, 96, 14, 20, s, { fill: '#000' });
    ghostBody(56, 144, 162, 5, 10, s);               // wavy bottom, deeper scallops
  },
  tall(s) {
    head(62, 36, 76, 122, 30, s);                    // elongated head
    earPath(74, 20, 64, 92, 52, s, 0.2);
    earPath(126, 20, 108, 136, 52, s, 0.2);
    oval(88, 96, 11, 24, s, { fill: '#000' });       // capsule eyes
    oval(112, 96, 11, 24, s, { fill: '#000' });
  },
  wide(s) {
    head(26, 66, 148, 74, 30, s);                    // low & extra wide
    earPath(48, 52, 34, 68, 78, s, 0.5);
    earPath(152, 52, 132, 166, 78, s, 0.5);
    oval(70, 104, 13, 18, s, { fill: '#000' });      // wide-set eyes
    oval(130, 104, 13, 18, s, { fill: '#000' });
    el('rect', { x: 84, y: 118, width: 32, height: 9, rx: 4.5, fill: '#000' }, s); // wide mouth bar
  },
};

// ---- tile renderer ---------------------------------------------------------
function renderTile(v, opts = {}) {
  v._uid = v._uid || (++uid);
  const svg = el('svg', { viewBox: '0 0 200 200', role: 'img', 'aria-label': `${v.name} — ${v.tag}` });
  const defs = el('defs', {}, svg);
  drawBg(svg, defs, v);

  const fg = v.fg;
  if (v.id === 'line') {
    // rim trick: dilated silhouette in fg, then silhouette filled with bg
    const gid = `sil-${v._uid}`;
    const g = el('g', { id: gid }, defs);
    foxSilhouette(g);
    const f = el('filter', { id: `rim-${v._uid}`, x: '-20%', y: '-20%', width: '140%', height: '140%' }, defs);
    el('feMorphology', { operator: 'dilate', radius: 3, in: 'SourceAlpha', result: 'd' }, f);
    el('feFlood', { 'flood-color': fg }, f);
    el('feComposite', { operator: 'in', in2: 'd' }, f);
    el('use', { href: `#${gid}`, filter: `url(#rim-${v._uid})` }, svg);
    el('use', { href: `#${gid}`, fill: v.bg.fill }, svg);
    // face details as strokes
    el('use', { href: `#${gid}`, fill: 'none' }, svg);
    oval(84, 100, 12, 18, svg, { fill: 'none', stroke: fg, 'stroke-width': 3 });
    oval(118, 100, 12, 18, svg, { fill: 'none', stroke: fg, 'stroke-width': 3 });
    el('path', { d: 'M92 128 Q101 138 110 128', fill: 'none', stroke: fg, 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
    return svg;
  }

  const mid = el('mask', { id: `m-${v._uid}` }, defs);
  el('rect', { x: 0, y: 0, width: 200, height: 200, fill: '#000' }, mid);
  const shape = el('g', { fill: '#fff' }, mid);
  const detail = el('g', { fill: fg }, svg);
  PLANS[v.id](shape, detail, fg);
  // hole shapes were marked fill:#000 inside PLANS — inside the mask they cut
  // holes; but PLANS also drew them with fill #000 which in the mask = hole ✓
  el('rect', { x: 0, y: 0, width: 200, height: 200, fill: fg, mask: `url(#m-${v._uid})` }, svg);
  if (v.id === 'loaf') { // tail drawn over, in fg
    el('path', { d: 'M168 132 Q186 128 182 108', fill: 'none', stroke: fg, 'stroke-width': 9, 'stroke-linecap': 'round' }, svg);
  }
  return svg;
}

// fox outline silhouette reused by the Line variant
function foxSilhouette(g) {
  head(52, 62, 96, 76, 26, g);
  earPath(60, 18, 50, 86, 74, g, 0.18);
  earPath(140, 18, 114, 150, 74, g, 0.18);
}

// ---- variant registry ------------------------------------------------------
const VARIANTS = [
  { id: 'classic', name: 'Classic', tag: 'the original proportions',
    note: 'The bloom silhouette kept honest: wide head, nub ears, tall oval eyes, feet bar — now drawn as clean vectors on the conic rainbow.',
    bg: { type: 'conic' }, fg: '#ffffff' },
  { id: 'icon', name: 'Icon', tag: 'the flat app look',
    note: 'Your app icon as geometry: one ear tall, one ear folded, brow marks over big oval eyes on the sage tile.',
    bg: { type: 'gradient', stops: [['0', '#98d2a6'], ['1', '#7cbb8c']] }, fg: '#101418' },
  { id: 'chibi', name: 'Chibi', tag: 'mega head, tiny ears',
    note: 'Same DNA, baby proportions: the head grows, the ears shrink, the eyes double and blush appears.',
    bg: { type: 'solid', fill: '#fdf3e7' }, fg: '#23242b' },
  { id: 'fox', name: 'Fox', tag: 'tall points, slim face',
    note: 'Ears stretched into tall soft points, the face slimmed, the eyes narrowed — the mascots feral cousin.',
    bg: { type: 'solid', fill: '#12141c' }, fg: '#f2f3f5' },
  { id: 'round', name: 'Round', tag: 'everything is curves',
    note: 'The whole body plan collapses to a circle: round head, round ears, dot eyes. Maximum huggability.',
    bg: { type: 'solid', fill: '#12141c' }, fg: '#f2f3f5' },
  { id: 'box', name: 'Box', tag: 'squared off',
    note: 'Every curve replaced with a radius-12 corner: blocky ears, square eyes, a mascot built from pixels it never became.',
    bg: { type: 'solid', fill: '#12141c' }, fg: '#f2f3f5' },
  { id: 'robo', name: 'Robo', tag: 'antenna and visor',
    note: 'The robot showing through: low wide head, antenna, side bolts, and the eyes merged into one visor with square pupils.',
    bg: { type: 'solid', fill: '#0c0e14' }, fg: '#8be9fd' },
  { id: 'loaf', name: 'Loaf', tag: 'full body, sitting',
    note: 'The first variant with a body: tucked cat-loaf pose, paw seams, and a tail that curls out past the silhouette.',
    bg: { type: 'solid', fill: '#12141c' }, fg: '#f2f3f5' },
  { id: 'ghost', name: 'Ghost', tag: 'wavy bottom edge',
    note: 'The feet bar dissolves into five scallops — part mascot, part sheet, floats on any tile.',
    bg: { type: 'solid', fill: '#191b24' }, fg: '#cfd3dc' },
  { id: 'tall', name: 'Tall', tag: 'stretched vertical',
    note: 'Rotated proportions: the narrowest head, the longest ears, capsule eyes — the mascot on a late budget.',
    bg: { type: 'solid', fill: '#12141c' }, fg: '#f2f3f5' },
  { id: 'wide', name: 'Wide', tag: 'low and broad',
    note: 'The other axis: a broad low head, wide-set eyes and a wide mouth bar — dashboard-mascot proportions.',
    bg: { type: 'solid', fill: '#12141c' }, fg: '#f2f3f5' },
  { id: 'line', name: 'Line', tag: 'outline only',
    note: 'The fox plan reduced to a single clean rim — no fill anywhere, just the contour and a face in stroke.',
    bg: { type: 'solid', fill: '#10131a' }, fg: '#7dd8ff' },
];

// ---- grid ------------------------------------------------------------------
const gridEl = document.getElementById('grid');
function buildGrid() {
  gridEl.replaceChildren();
  VARIANTS.forEach((v, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    const btn = document.createElement('button');
    btn.className = 'tile';
    btn.setAttribute('aria-label', `${v.name} — open details`);
    btn.append(renderTile(v));
    btn.addEventListener('click', () => openLb(i));
    const cap = document.createElement('div');
    cap.className = 'cap';
    cap.innerHTML = `<b>${v.name}</b><small>${v.tag}</small>`;
    card.append(btn, cap);
    gridEl.append(card);
  });
}
buildGrid();

// ---- lightbox --------------------------------------------------------------
const lb = document.getElementById('lb');
const lbStage = document.getElementById('lbStage');
let cur = 0;

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
  const svg = renderTile(v);
  svg.setAttribute('xmlns', NS);
  return new XMLSerializer().serializeToString(svg);
}

function openLb(i) {
  cur = (i + VARIANTS.length) % VARIANTS.length;
  const v = VARIANTS[cur];
  lbStage.replaceChildren(renderTile(v));
  document.getElementById('lbName').textContent = v.name;
  document.getElementById('lbCat').textContent = v.tag;
  document.getElementById('lbNote').textContent = v.note;
  document.getElementById('prev').hidden = false;
  document.getElementById('next').hidden = false;
  if (!lb.open) lb.showModal();
}

function closeLb() {
  if (lb.open) lb.close();
  document.getElementById('prev').hidden = true;
  document.getElementById('next').hidden = true;
}

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
  const svg = renderTile(v);
  svg.setAttribute('xmlns', NS);
  const src = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = c.height = 1000;
    c.getContext('2d').drawImage(img, 0, 0, 1000, 1000);
    c.toBlob(b => { download(b, `bloom-${v.id}.png`); toast('PNG downloaded'); });
  };
  img.onerror = () => toast('PNG export failed');
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
});
