const { createCanvas } = require('canvas');
const fs = require('fs');
const PixelWorld = require('./js/pixelworld.js');

fs.mkdirSync('/home/claude/preview', { recursive: true });

const SCALE = 3;
for (const [name, scene] of Object.entries(PixelWorld.scenes)) {
  const low = createCanvas(scene.w, scene.h);
  const lctx = low.getContext('2d');
  scene.draw(lctx, scene.w, scene.h, 2.0); // t=2s frame

  const hi = createCanvas(scene.w * SCALE, scene.h * SCALE);
  const hctx = hi.getContext('2d');
  hctx.imageSmoothingEnabled = false;
  hctx.drawImage(low, 0, 0, hi.width, hi.height);
  fs.writeFileSync(`/home/claude/preview/${name}.png`, hi.toBuffer('image/png'));
  console.log('rendered', name);
}
