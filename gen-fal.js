// Generate 50 black-mascot images via fal.ai queue API — fal-ai/nano-banana-2.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const KEY = execSync('security find-generic-password -s fal-key -w').toString().trim();
const OUT = '/tmp/rainbow-variants-site/images';
fs.mkdirSync(OUT, { recursive: true });

const ID = 'solid black cute robot-cat mascot head with two pointed ears and two large oval eyes, the mascot itself is pure black';

const STYLES = [
  ['flat vector icon', 'flat minimal vector style, crisp edges, light gray background'],
  ['sticker', 'die-cut sticker with thick white border and soft drop shadow, white background'],
  ['origami', 'origami papercraft folded from black paper, subtle paper texture, cream background'],
  ['layered papercut', 'layered paper-cut art with depth shadows, black paper layers, mint background'],
  ['claymation', 'glossy black claymation render, handmade plasticine texture, soft studio light, beige background'],
  ['low poly', 'low-poly 3d render, faceted black surfaces, soft gradient studio background'],
  ['isometric 3d', 'isometric 3d render of the mascot as a chunky toy, black plastic, pastel yellow background'],
  ['glossy 3d', 'glossy 3d product render, black ceramic finish, studio reflections, light gray background'],
  ['matte 3d', 'matte soft-touch 3d render, velvety black material, sage green background'],
  ['knitted plush', 'knitted wool plush toy, black yarn with visible stitches, cozy cream background'],
  ['felt patch', 'embroidered felt patch with visible thread texture, black threads, cream background'],
  ['denim patch', 'embroidered patch stitched on denim jacket fabric, black thread, indigo denim'],
  ['enamel pin', 'hard enamel pin badge, black enamel with metal rim, on pale blue background'],
  ['woodcut', 'bold woodcut print, rough carved black ink, off-white paper background'],
  ['linocut', 'linocut block print with visible carving marks, black ink on kraft paper'],
  ['ink brush', 'expressive sumi-e ink brush painting, black strokes on rice paper'],
  ['charcoal sketch', 'detailed charcoal sketch with smudged shading, on textured gray paper'],
  ['gouache print', 'flat gouache painting, solid black pigment, textured off-white paper'],
  ['stencil graffiti', 'spray-paint stencil graffiti art, pure black paint on concrete wall'],
  ['paper silhouette', 'intricate cut-paper silhouette with fine details, on warm orange background'],
  ['etching', 'vintage copperplate etching, fine crosshatching, black on aged ivory'],
  ['engraving', 'classic steel engraving style, dense line work, black on white'],
  ['continuous line', 'single continuous line drawing forming the mascot, one line weight, white background'],
  ['bauhaus', 'bauhaus poster style, geometric black shapes, one primary color accent circle, cream background'],
  ['swiss design', 'swiss international style poster, black shape on grid-aligned off-white'],
  ['memphis', 'memphis design style, black mascot with squiggles and confetti around it, pastel background'],
  ['pixel art', 'chunky pixel art, black pixels, 32x32 aesthetic upscaled, dark gray background'],
  ['voxel', 'voxel 3d render, tiny black cubes forming the mascot, isometric, soft shadow'],
  ['toy figurine', 'collectible vinyl toy figurine product photo, glossy black figure, pastel pink background'],
  ['plush toy', 'fluffy black plush toy photograph, studio product shot, light background'],
  ['mochi', 'squishy mochi-style render, matte black soft body, squished proportions, pastel background'],
  ['balloon', 'inflated black foil balloon shaped like the mascot, floating, sky blue background'],
  ['glass figurine', 'black obsidian glass figurine, subtle reflections, on light marble surface'],
  ['ice sculpture', 'frozen black ice sculpture with frost details, cold blue-white background'],
  ['shadow puppet', 'traditional shadow puppet, black leather texture with joint holes, warm lamp glow background'],
  ['badge emblem', 'circular badge emblem design, black mascot centered in a plain ring, flat colors, white background'],
  ['shield crest', 'heraldic shield crest with black mascot, clean vector lines, parchment background'],
  ['tarot card', 'tarot card illustration, black mascot with ornate frame, cream and gold border'],
  ['postage stamp', 'vintage postage stamp design with perforated edge, black mascot, muted background'],
  ['matchbox label', 'retro matchbox label print, black mascot, limited two-color print aesthetic'],
  ['risograph', 'risograph print texture, grainy black ink overprint, on fluorescent pink paper'],
  ['riso blue', 'risograph print, grainy black ink, halftone dots, on light blue paper'],
  ['graffiti mural', 'large smooth graffiti mural, solid black mascot, on light painted brick wall'],
  ['neon sign', 'black acrylic sign shape of the mascot with warm white neon tube outline, on dark wall'],
  ['carved wood', 'carved and inked wooden totem, black lacquer finish, natural linen background'],
  ['stone carving', 'ancient stone relief carving of the mascot, black patina, sandstone background'],
  ['miniature diorama', 'tiny black mascot figurine in a miniature diorama scene, tilt shift photography'],
  ['candy', 'black gummy candy version of the mascot, glossy sugar texture, on pastel green background'],
  ['lego', 'built from black toy bricks, stud texture visible, on bright yellow background'],
  ['mascot suit', 'full black mascot costume head photographed in a studio, white background'],
];
if (STYLES.length !== 50) throw new Error('need 50, have ' + STYLES.length);

const slug = n => n.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
const fileFor = i => path.join(OUT, `${String(i).padStart(2, '0')}-${slug(STYLES[i][0])}.png`);
const promptFor = ([, detail]) =>
  `${ID}, ${detail}. centered composition, clean, no text, no letters, no watermark`;

async function submit(i) {
  const res = await fetch(`https://queue.fal.run/fal-ai/nano-banana-2`, {
    method: 'POST',
    headers: { Authorization: `Key ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: promptFor(STYLES[i]), image_size: 'square' })
  });
  if (!res.ok) throw new Error('submit ' + res.status + ' ' + (await res.text()).slice(0, 120));
  return res.json(); // {request_id, response_url, status_url}
}

async function poll(statusUrl) {
  for (let t = 0; t < 90; t++) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await fetch(statusUrl, { headers: { Authorization: `Key ${KEY}` } });
    const j = await res.json();
    if (j.status === 'COMPLETED') return j;
    if (j.status === 'FAILED' || j.error) throw new Error('gen failed: ' + JSON.stringify(j).slice(0, 160));
  }
  throw new Error('timeout');
}

async function genOne(i) {
  const file = fileFor(i);
  if (fs.existsSync(file) && fs.statSync(file).size > 5000) { console.error('SKIP', path.basename(file)); return { file, ok: true }; }
  try {
    const q = await submit(i);
    await poll(q.status_url); // COMPLETED → fetch the payload from response_url
    const done = await (await fetch(q.response_url, { headers: { Authorization: `Key ${KEY}` } })).json();
    const url = done?.images?.[0]?.url || done?.image?.url;
    if (!url) throw new Error('no image url: ' + JSON.stringify(done).slice(0, 160));
    const img = await fetch(url);
    if (!img.ok) throw new Error('dl ' + img.status);
    fs.writeFileSync(file, Buffer.from(await img.arrayBuffer()));
    console.error('OK', path.basename(file));
    return { file, ok: true };
  } catch (e) {
    console.error('FAIL', path.basename(file), String(e.message).slice(0, 140));
    return { file, ok: false, err: String(e.message) };
  }
}

(async () => {
  const idx = STYLES.map((_, i) => i);
  const results = [];
  async function worker() {
    while (idx.length) {
      const i = idx.shift();
      results[i] = await genOne(i);
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));
  const fails = results.filter(r => !r || !r.ok);
  console.error(`DONE ${results.filter(r => r && r.ok).length}/50`);
  if (fails.length) console.error('FAILS:', fails.map(f => path.basename(f.file)).join(', '));
})();
