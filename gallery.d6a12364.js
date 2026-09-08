// Image-tile gallery: 50 generated PNGs, grid + lightbox with prompt + download.
'use strict';

const gridEl = document.getElementById('grid');
MANIFEST.forEach((v, i) => {
  const card = document.createElement('div');
  card.className = 'card';
  const btn = document.createElement('button');
  btn.className = 'tile';
  btn.setAttribute('aria-label', `${v.name} — open details`);
  const img = document.createElement('img');
  img.loading = 'lazy'; img.decoding = 'async'; img.alt = v.name;
  img.src = v.file;
  btn.append(img);
  btn.addEventListener('click', () => openLb(i));
  const cap = document.createElement('div');
  cap.className = 'cap';
  cap.innerHTML = `<b>${v.name}</b><small>${v.tag}</small>`;
  card.append(btn, cap);
  gridEl.append(card);
});

const lb = document.getElementById('lb');
let cur = 0;

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 1600);
}

function openLb(i) {
  cur = (i + MANIFEST.length) % MANIFEST.length;
  const v = MANIFEST[cur];
  const im = document.getElementById('lbImg');
  im.src = v.file; im.alt = v.name;
  document.getElementById('lbName').textContent = v.name;
  document.getElementById('lbCat').textContent = `style ${cur + 1} / ${MANIFEST.length}`;
  document.getElementById('lbNote').textContent = v.prompt;
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

document.getElementById('dlPng').addEventListener('click', () => {
  const v = MANIFEST[cur];
  const a = document.createElement('a');
  a.href = v.file; a.download = v.file.split('/').pop();
  document.body.append(a); a.click(); a.remove();
  toast('PNG downloaded');
});
document.getElementById('openTab').addEventListener('click', () => {
  window.open(MANIFEST[cur].file, '_blank');
});
