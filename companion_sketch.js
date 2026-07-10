/* Capybara companion sketch: map-based pixel art, 24x16 body grid */
const { createCanvas } = require('canvas');
const fs = require('fs');

const C = {
  o: '#3a2415', // outline
  b: '#a9713d', // base fur
  s: '#7d4f27', // shade
  h: '#c98f55', // highlight
  m: '#c9a06b', // muzzle
  e: '#241408', // eye
  w: '#f4e9d0', // eye glint
  n: '#241408', // nostril
  i: '#8a5a34', // inner ear
  k: '#c97f5a', // blush
};

// 24 wide x 16 tall, facing right. Frame A (standing)
const BODY_A = [
  '...............oo.......',
  '..............oiio......',
  '.......ooooooobiibo.....',
  '.....oobbbbbbbbbbbboo...',
  '....obhhhbbbbbbbbbbbo...',
  '...obhhbbbbbbbeebbbbbo..',
  '..obhbbbbbbbbbewbbmmmo..',
  '..obbbbbbbbbbbbbbmmmmno.',
  '..obbbbbbbbbbbbbkbmmmmo.',
  '..obbbbbbbbbbbbbbbmooo..',
  '..obbsbbbbbbbbbbbbbo....',
  '..obssbbbbbbbbbbsbbo....',
  '..obsssbbbbbbbsssssbo...',
  '...oossooooossooossoo...',
  '....osbo...osbo..osbo...',
  '....oooo...oooo..oooo...',
];
// Frame B (walk: legs alternate)
const BODY_B = BODY_A.slice(0, 13).concat([
  '...oossooooossooossoo...',
  '...osbo...osbo....osbo..',
  '...oooo...oooo....oooo..',
]);

// fruits drawn ABOVE the head (anchor col ~9, occupying 4 rows above body)
const FRUITS = {
  none: [],
  orange: [
    '..........gg............',
    '.........oggo...........',
    '........oaaaao..........',
    '........oaaaao..........',
  ],
  strawberry: [
    '.........g.g............',
    '........orrrro..........',
    '........oryryo..........',
    '.........orro...........',
  ],
  glowberry: [
    '..........x.............',
    '.........opxpo..........',
    '........oppppo..........',
    '.........oppo...........',
  ],
};
const FC = { o: '#3a2415', a: '#e8862e', g: '#4c8a5b', r: '#d94f4f', y: '#f2e394', p: '#8e7cc3', x: '#d9c9ff' };

function drawMap(ctx, map, colors, ox, oy) {
  map.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = colors[ch] || '#ff00ff';
      ctx.fillRect(ox + x, oy + y, 1, 1);
    });
  });
}

const S = 8, W = 24, H = 20; // 4 rows of hat space + 16 body
const variants = ['none', 'orange', 'strawberry', 'glowberry'];
const sheet = createCanvas((W * S + 16) * variants.length + 16, H * S * 2 + 60);
const g = sheet.getContext('2d');
g.fillStyle = '#241c33'; g.fillRect(0, 0, sheet.width, sheet.height);
g.imageSmoothingEnabled = false;

variants.forEach((v, vi) => {
  [BODY_A, BODY_B].forEach((frame, fi) => {
    const lo = createCanvas(W, H);
    const lg = lo.getContext('2d');
    drawMap(lg, FRUITS[v], FC, 0, 0);
    drawMap(lg, frame, C, 0, 4);
    g.drawImage(lo, 16 + vi * (W * S + 16), 20 + fi * (H * S + 20), W * S, H * S);
  });
});
fs.writeFileSync('preview/capybara_sheet.png', sheet.toBuffer('image/png'));

// scale test beside the hero sprite
const PW = require('./js/pixelworld.js');
const duo = createCanvas(60 * 6, 26 * 6);
const dg = duo.getContext('2d'); dg.imageSmoothingEnabled = false;
dg.fillStyle = '#241c33'; dg.fillRect(0, 0, duo.width, duo.height);
const heroLo = createCanvas(16, 20); PW.sprite.draw(heroLo.getContext('2d'), 0);
const capyLo = createCanvas(24, 20); const cg = capyLo.getContext('2d');
drawMap(cg, FRUITS.orange, FC, 0, 0); drawMap(cg, BODY_A, C, 0, 4);
dg.drawImage(heroLo, 6 * 6, 3 * 6, 16 * 6, 20 * 6);
dg.drawImage(capyLo, 28 * 6, 3 * 6, 24 * 6, 20 * 6);
fs.writeFileSync('preview/capy_scale.png', duo.toBuffer('image/png'));
console.log('rendered');
