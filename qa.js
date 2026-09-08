// QA the 50 generated images: black-mascot pixel check + contact sheets.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');
const DIR = '/tmp/rainbow-variants-site/images';

function readPNG(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32BE(0) !== 0x89504e47) throw new Error('not png');
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  const depth = b[24], ctype = b[25];
  let idat = [], off = 8, interlace = false;
  while (off < b.length) {
    const len = b.readUInt32BE(off), type = b.toString('ascii', off + 4, off + 8);
    if (type === 'IDAT') idat.push(b.subarray(off + 8, off + 8 + len));
    if (type === 'IEND') break;
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const ch = ctype === 6 ? 4 : ctype === 2 ? 3 : ctype === 0 ? 1 : -1;
  if (ch === -1 || depth !== 8) throw new Error(`unsupported png ctype=${ctype} depth=${depth}`);
  const stride = w * ch;
  const px = new Uint8Array(w * h * 3);
  let prev = new Uint8Array(stride), cur = new Uint8Array(stride);
  const paeth = (a, b2, c) => { const p = a + b2 - c, pa = Math.abs(p - a), pb = Math.abs(p - b2), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b2 : c; };
  let ro = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[ro++];
    for (let x = 0; x < stride; x++) cur[x] = raw[ro + x];
    ro += stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0, bb = prev[x], c = x >= ch ? prev[x - ch] : 0;
      let v = cur[x];
      if (ft === 1) v = (v + a) & 255;
      else if (ft === 2) v = (v + bb) & 255;
      else if (ft === 3) v = (v + ((a + bb) >> 1)) & 255;
      else if (ft === 4) v = (v + paeth(a, bb, c)) & 255;
      cur[x] = v;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 3;
      if (ch === 3) { px[o] = cur[x * 3]; px[o + 1] = cur[x * 3 + 1]; px[o + 2] = cur[x * 3 + 2]; }
      else if (ch === 4) { const a = cur[x * 4 + 3] / 255, o2 = x * 4; px[o] = Math.round(cur[o2] * a + 255 * (1 - a)); px[o + 1] = Math.round(cur[o2 + 1] * a + 255 * (1 - a)); px[o + 2] = Math.round(cur[o2 + 2] * a + 255 * (1 - a)); }
      else { px[o] = px[o + 1] = px[o + 2] = cur[x]; }
    }
    [prev, cur] = [cur, prev];
  }
  return { w, h, px };
}

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.png')).sort();
const report = [];
for (const f of files) {
  try {
    const { w, h, px } = readPNG(path.join(DIR, f));
    // central region where the mascot should be
    const x0 = Math.round(w * .2), x1 = Math.round(w * .8), y0 = Math.round(h * .15), y1 = Math.round(h * .85);
    let dark = 0, colored = 0, tot = 0;
    for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
      const o = (y * w + x) * 3, R = px[o], G = px[o + 1], B = px[o + 2];
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
      tot++;
      if (mx < 70) dark++;                                     // near-black
      else if (mx - mn > 60 && mx > 90) colored++;             // saturated color
    }
    const darkFrac = dark / tot, coloredFrac = colored / tot;
    // mascot present = meaningful black mass; not recolored = little saturated mass
    const verdict = darkFrac < 0.06 ? 'NO-MASCOT' : coloredFrac > 0.30 ? 'COLORED' : 'ok';
    report.push({ f, darkFrac: +darkFrac.toFixed(3), coloredFrac: +coloredFrac.toFixed(3), verdict });
  } catch (e) {
    report.push({ f, verdict: 'DECODE-FAIL', err: String(e.message) });
  }
}
console.log(JSON.stringify(report, null, 1));
const bad = report.filter(r => r.verdict !== 'ok');
console.error(`${files.length} images, ${report.filter(r => r.verdict === 'ok').length} ok, flagged: ${bad.map(b => b.f).join(', ') || 'none'}`);

// contact sheets: 25 thumbs per sheet, 5x5 at 152px
function thumb(img, S) {
  const { w, h, px } = img;
  const out = new Uint8Array(S * S * 3);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const sx = Math.floor(x * w / S), sy = Math.floor(y * h / S), so = (sy * w + sx) * 3, o = (y * S + x) * 3;
    out[o] = px[so]; out[o + 1] = px[so + 1]; out[o + 2] = px[so + 2];
  }
  return { w: S, h: S, px: out };
}
function crc32(buf) { let c, t = crc32.t || (crc32.t = (() => { const a = new Int32Array(256); for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; a[n] = c; } return a; })()); c = -1; for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) { const t = Buffer.from(type), len = Buffer.alloc(4); len.writeUInt32BE(data.length); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, crc]); }
function writePNG(p, w, h, px) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w * 3; x++) raw[y * (w * 3 + 1) + 1 + x] = px[y * w * 3 + x]; }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(p, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
const S = 152, COLS = 5, ROWS = 5;
for (let sheet = 0; sheet * 25 < files.length; sheet++) {
  const W = COLS * (S + 4) + 4, H = ROWS * (S + 4) + 4;
  const out = new Uint8Array(W * H * 3).fill(20);
  for (let k = 0; k < 25; k++) {
    const fi = sheet * 25 + k; if (fi >= files.length) break;
    const im = thumb(readPNG(path.join(DIR, files[fi])), S);
    const gx = 4 + (k % COLS) * (S + 4), gy = 4 + Math.floor(k / COLS) * (S + 4);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const o = ((gy + y) * W + gx + x) * 3, so = (y * S + x) * 3;
      out[o] = im.px[so]; out[o + 1] = im.px[so + 1]; out[o + 2] = im.px[so + 2];
    }
  }
  writePNG(`/tmp/rainbow-variants-site/.tmp-sheet${sheet}.png`, W, H, out);
  console.error(`sheet${sheet}: files ${sheet * 25}..${Math.min(files.length, sheet * 25 + 25) - 1}`);
}
