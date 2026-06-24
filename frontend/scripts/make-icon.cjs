// Generates a placeholder 1024x1024 PNG (solid brand color) with zero deps so
// `npm run tauri icon` has a source image. Replace app-icon.png with real art
// before shipping. Usage: `node scripts/make-icon.cjs`
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const SIZE = 1024;
// QTRM accent teal (matches --c-accent in index.css), opaque.
const [R, G, B, A] = [97, 230, 181, 255];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
// 10,11,12 = compression, filter, interlace = 0

const row = Buffer.alloc(1 + SIZE * 4);
row[0] = 0; // filter: none
for (let x = 0; x < SIZE; x++) {
  row[1 + x * 4] = R;
  row[1 + x * 4 + 1] = G;
  row[1 + x * 4 + 2] = B;
  row[1 + x * 4 + 3] = A;
}
const raw = Buffer.concat(Array.from({ length: SIZE }, () => row));
const idat = zlib.deflateSync(raw, { level: 9 });

const png = Buffer.concat([
  sig,
  chunk("IHDR", ihdr),
  chunk("IDAT", idat),
  chunk("IEND", Buffer.alloc(0)),
]);

const out = path.join(__dirname, "..", "app-icon.png");
fs.writeFileSync(out, png);
console.log(`Wrote ${out} (${png.length} bytes). Now run:  npm run tauri icon app-icon.png`);
