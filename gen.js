// Generate 50 truly-unique black-mascot images via pollinations.ai (FLUX, keyless).
// Each variant = a distinct art style; the mascot identity stays constant:
// cute robot-cat head, two ears, two large oval eyes, rendered BLACK.
const fs = require('fs');
const path = require('path');
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
  ['felt patch', 'embroidered felt patch with visible thread texture, black threads, denim background'],
  ['denim patch', 'embroidered patch stitched on denim jacket fabric, black thread, indigo denim'],
  ['enamel pin', 'hard enamel pin badge, black enamel with metal rim, on pale blue background'],
  ['woodcut', 'bold woodcut print, rough carved black ink, off-white paper background'],
  ['linocut', 'linocut block print with visible carving marks, black ink on kraft paper'],
  ['ink brush', 'expressive sumi-e ink brush painting, black strokes on rice paper'],
  ['charcoal sketch', 'detailed charcoal sketch with smudged shading, on textured gray paper'],
  ['chalk', 'chalk drawing on a dark chalkboard, white chalk dust, blackboard background'],
  ['stencil graffiti', 'spray-paint stencil graffiti art, pure black paint on concrete wall'],
  ['paper silhouette', 'intricate cut-paper silhouette with fine details, on warm orange background'],
  ['etching', 'vintage copperplate etching, fine crosshatching, black on aged ivory'],
  ['engraving', 'classic steel engraving style, dense line work, black on white'],
  ['continuous line', 'single continuous line drawing that forms the mascot, one weight, on white'],
  ['bauhaus', 'bauhaus poster style, geometric black shapes, primary color accent circle, cream background'],
  ['swiss design', 'swiss international style poster, black shape on grid-aligned off-white, helvetica era'],
  ['memphis', 'memphis design style, black mascot with squiggles and confetti around, pastel background'],
  ['pixel art', 'chunky pixel art, black pixels, 32x32 aesthetic upscaled, on dark gray'],
  ['voxel', 'voxel 3d render, tiny black cubes forming the mascot, isometric, soft shadow'],
  ['toy figurine', 'collectible vinyl toy figurine photo, glossy black figure, product shot on pastel pink'],
  ['plush toy', 'fluffy black plush toy photograph, studio product shot, light background'],
  ['mochi', 'squishy mochi-style render, matte black soft body, squished proportions, pastel background'],
  ['balloon', 'inflated black foil balloon shaped like the mascot, floating, sky blue background'],
  ['glass figurine', 'black obsidian glass figurine, subtle reflections, on marble surface'],
  ['ice sculpture', 'frozen black ice sculpture with frost details, cold blue-white background'],
  ['shadow puppet', 'traditional shadow puppet with jointed limbs, black leather texture, warm lamp glow background'],
  ['badge emblem', 'circular badge emblem design, black mascot centered in ring, flat colors, white background'],
  ['shield crest', 'heraldic shield crest with black mascot, clean vector lines, parchment background'],
  ['tarot card', 'tarot card illustration, black mascot with ornate frame, mystical cream and gold border'],
  ['postage stamp', 'vintage postage stamp design with perforated edge, black mascot, muted background'],
  ['matchbox label', 'retro matchbox label print, black mascot, limited two-color print aesthetic'],
  ['risograph', 'risograph print texture, grainy black ink overprint, on fluorescent pink paper'],
  ['riso blue', 'risograph print, grainy black ink, halftone dots, on light blue paper'],
  ['graffiti mural', 'large smooth graffiti mural, solid black mascot, on light brick wall'],
  ['neon sign', 'black acrylic neon sign shape with warm white tube outline, on dark wall'],
  ['carved wood', 'carved and inked wooden totem, black lacquer finish, natural linen background'],
  ['stone carving', 'ancient stone relief carving of the mascot, black patina, sandstone background'],
  ['miniature diorama', 'tiny black mascot figurine in a miniature diorama scene, tilt shift'],
  ['candy', 'black gummy candy version of the mascot, glossy sugar texture, on pastel green'],
  ['lego', 'built from black lego bricks, stud texture visible, on bright yellow background'],
  ['mascot suit', 'person in a black mascot costume photographed head-only, studio white background'],
];

if (STYLES.length !== 50) throw new Error(`need 50 styles, have ${STYLES.length}`);

const promptFor = ([name, detail]) =>
  `${ID}, ${detail}. centered composition, clean, no text, no letters, no watermark`;

async function fetchOne([name, detail], seed, attempt = 1) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptFor([name, detail]))}?width=768&height=768&seed=${seed}&nologo=true&model=flux&safe=false`;
  const file = path.join(OUT, `${String(STYLES.findIndex(s => s[0] === name)).padStart(2, '0')}-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`);
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 90000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 5000) throw new Error('tiny body ' + buf.length);
    fs.writeFileSync(file, buf);
    return { file, ok: true };
  } catch (e) {
    if (attempt < 4) { await new Promise(r => setTimeout(r, 3000 * attempt)); return fetchOne([name, detail], seed + 977, attempt + 1); }
    return { file, ok: false, err: String(e.message || e) };
  }
}

(async () => {
  const jobs = [];
  let i = 0;
  const queue = [...STYLES];
  const results = [];
  async function worker() {
    while (queue.length) {
      const st = queue.shift();
      const seed = 1000 + (++i) * 7919;
      const r = await fetchOne(st, seed);
      results.push(r);
      console.error((r.ok ? 'OK ' : 'FAIL ') + path.basename(r.file));
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  const fails = results.filter(r => !r.ok);
  console.error(`done: ${results.length - fails.length}/${STYLES.length}, fails: ${fails.map(f => path.basename(f.file) + ' ' + f.err).join('; ') || 'none'}`);
})();
