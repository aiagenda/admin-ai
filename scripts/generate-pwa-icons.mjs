/**
 * Generates PWA icons (192, 512, apple-touch 180) – no deps, Node built-in zlib.
 * Run: node scripts/generate-pwa-icons.mjs
 */
import { createWriteStream } from "fs";
import { deflateSync } from "zlib";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "../public");

const blue = [59, 130, 246];
const white = [255, 255, 255];

function crc32(b) {
  let c = 0xffffffff;
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let k = n;
    for (let i = 0; i < 8; i++) k = (k >>> 1) ^ (0xedb88320 & -(k & 1));
    t[n] = k >>> 0;
  }
  for (let i = 0; i < b.length; i++) c = (c >>> 8) ^ t[(c ^ b[i]) & 0xff];
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function drawIcon(size) {
  const thick = Math.max(2, Math.floor(size * 0.08));
  const cx = size / 2;
  const top = Math.floor(size * 0.2);
  const bot = Math.floor(size * 0.82);
  const midY = Math.floor(size * 0.58);
  const arm = Math.floor(size * 0.32);

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      const inVert = Math.abs(x - cx) <= thick && y >= top && y <= bot;
      const inBar = y >= midY - thick / 2 && y <= midY + thick / 2 && x >= cx - arm && x <= cx + arm;
      const leftDiag = y >= top && y <= midY && x >= cx - arm && x <= cx && Math.abs((x - (cx - arm)) - (y - top) * (arm / (midY - top))) <= thick;
      const rightDiag = y >= top && y <= midY && x >= cx && x <= cx + arm && Math.abs((cx + arm - x) - (y - top) * (arm / (midY - top))) <= thick;
      const [r, g, b] = inVert || inBar || leftDiag || rightDiag ? white : blue;
      const i = 1 + (x << 2);
      row[i] = r;
      row[i + 1] = g;
      row[i + 2] = b;
      row[i + 3] = 255;
    }
    rows.push(row);
  }
  return Buffer.concat(rows);
}

function toPng(size) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = deflateSync(drawIcon(size), { level: 6 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function main() {
  const sizes = [
    { name: "icon-192.png", w: 192 },
    { name: "icon-512.png", w: 512 },
    { name: "apple-touch-icon.png", w: 180 },
  ];
  for (const { name, w } of sizes) {
    const png = toPng(w);
    const out = createWriteStream(resolve(publicDir, name));
    out.write(png);
    out.end();
    await new Promise((r, rej) => {
      out.on("finish", r);
      out.on("error", rej);
    });
    console.log("Created", name);
  }
  console.log("PWA icons done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
