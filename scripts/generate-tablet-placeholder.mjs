// Utilitário de preparação de assets: gera public/placeholder-1668x2388.png
// (placeholder do Tablet) sem dependências externas — encoder PNG mínimo em
// Node puro (zlib built-in) com fundo xadrez sutil e o texto "1668×2388"
// desenhado com uma fonte bitmap 5x7 escalada.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const WIDTH = 1668;
const HEIGHT = 2388;
const OUTPUT_PATH = "public/placeholder-1668x2388.png";

const CHECKER_CELL = 60;
const COLOR_A = [255, 255, 255];
const COLOR_B = [240, 240, 240];
const TEXT_COLOR = [154, 160, 166];

// Fonte bitmap 5x7 apenas com os glifos usados pelo texto "1668×2388".
const GLYPHS = {
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["01110", "10001", "00001", "00110", "00001", "10001", "01110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "×": ["00000", "10001", "01010", "00100", "01010", "10001", "00000"],
};

const TEXT = "1668×2388";
const GLYPH_SCALE = 22; // 5x7 → 110x154 px por glifo
const GLYPH_GAP = 2; // colunas de espaçamento (na malha 5x7)

function drawPixels() {
  const pixels = new Uint8Array(WIDTH * HEIGHT * 3);

  // Fundo xadrez.
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const even =
        (Math.floor(x / CHECKER_CELL) + Math.floor(y / CHECKER_CELL)) % 2 === 0;
      const [r, g, b] = even ? COLOR_B : COLOR_A;
      const i = (y * WIDTH + x) * 3;
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
    }
  }

  // Texto centralizado.
  const glyphW = (5 + GLYPH_GAP) * GLYPH_SCALE;
  const textW = TEXT.length * glyphW - GLYPH_GAP * GLYPH_SCALE;
  const textH = 7 * GLYPH_SCALE;
  const originX = Math.floor((WIDTH - textW) / 2);
  const originY = Math.floor((HEIGHT - textH) / 2);

  [...TEXT].forEach((char, index) => {
    const glyph = GLYPHS[char];
    if (!glyph) return;
    const baseX = originX + index * glyphW;

    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 5; col += 1) {
        if (glyph[row][col] !== "1") continue;
        for (let dy = 0; dy < GLYPH_SCALE; dy += 1) {
          for (let dx = 0; dx < GLYPH_SCALE; dx += 1) {
            const px = baseX + col * GLYPH_SCALE + dx;
            const py = originY + row * GLYPH_SCALE + dy;
            if (px < 0 || px >= WIDTH || py < 0 || py >= HEIGHT) continue;
            const i = (py * WIDTH + px) * 3;
            pixels[i] = TEXT_COLOR[0];
            pixels[i + 1] = TEXT_COLOR[1];
            pixels[i + 2] = TEXT_COLOR[2];
          }
        }
      }
    }
  });

  return pixels;
}

// --- Encoder PNG mínimo (color type 2 = RGB, sem alpha) ---------------------
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBytes = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, crc]);
}

function encodePng(pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Scanlines com filtro 0 (None) por linha.
  const raw = Buffer.alloc(HEIGHT * (1 + WIDTH * 3));
  for (let y = 0; y < HEIGHT; y += 1) {
    const rowStart = y * (1 + WIDTH * 3);
    raw[rowStart] = 0;
    raw.set(
      pixels.subarray(y * WIDTH * 3, (y + 1) * WIDTH * 3),
      rowStart + 1,
    );
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

writeFileSync(OUTPUT_PATH, encodePng(drawPixels()));
console.log(`Arquivo gerado em ${OUTPUT_PATH}`);
