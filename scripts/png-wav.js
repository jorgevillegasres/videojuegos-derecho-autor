// scripts/png-wav.js
// Escritores mínimos de PNG (RGBA, 8 bits) y WAV (PCM 16 bits, mono) para generar
// las piezas provisionales de la biblioteca sin dependencias. Solo Node.
import { deflateSync } from 'node:zlib';

const TABLA_CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = TABLA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function trozo(tipo, datos) {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length);
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'latin1'), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([largo, cuerpo, crc]);
}

/** PNG a partir de píxeles RGBA (Uint8Array de ancho*alto*4). */
export function png(ancho, alto, rgba) {
  if (rgba.length !== ancho * alto * 4) throw new Error(`Se esperaban ${ancho * alto * 4} bytes y llegaron ${rgba.length}.`);
  const paso = ancho * 4 + 1;
  const filas = Buffer.alloc(paso * alto);
  for (let y = 0; y < alto; y += 1) {
    filas[y * paso] = 0; // filtro: ninguno
    Buffer.from(rgba.buffer, rgba.byteOffset + y * ancho * 4, ancho * 4).copy(filas, y * paso + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0);
  ihdr.writeUInt32BE(alto, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 6; // color: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    trozo('IHDR', ihdr),
    trozo('IDAT', deflateSync(filas)),
    trozo('IEND', Buffer.alloc(0)),
  ]);
}

/** WAV PCM 16 bits mono a partir de muestras entre -1 y 1. */
export function wav(muestras, frecuencia = 22050) {
  const n = muestras.length;
  const datos = Buffer.alloc(44 + n * 2);
  datos.write('RIFF', 0, 'latin1');
  datos.writeUInt32LE(36 + n * 2, 4);
  datos.write('WAVE', 8, 'latin1');
  datos.write('fmt ', 12, 'latin1');
  datos.writeUInt32LE(16, 16);
  datos.writeUInt16LE(1, 20); // PCM
  datos.writeUInt16LE(1, 22); // mono
  datos.writeUInt32LE(frecuencia, 24);
  datos.writeUInt32LE(frecuencia * 2, 28);
  datos.writeUInt16LE(2, 32);
  datos.writeUInt16LE(16, 34);
  datos.write('data', 36, 'latin1');
  datos.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i += 1) {
    const v = Math.max(-1, Math.min(1, muestras[i]));
    datos.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return datos;
}

/** Lienzo RGBA con primitivas de dibujo entero (sin suavizado, como el pixel art). */
export function lienzo(ancho, alto) {
  const rgba = new Uint8Array(ancho * alto * 4);
  const l = {
    ancho,
    alto,
    rgba,
    pinta(x, y, color) {
      if (x < 0 || y < 0 || x >= ancho || y >= alto) return;
      const i = (y * ancho + x) * 4;
      const [r, g, b, a = 255] = color;
      rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = a;
    },
    rect(x, y, w, h, color) {
      for (let j = y; j < y + h; j += 1) for (let i = x; i < x + w; i += 1) l.pinta(i, j, color);
    },
    relleno(color) {
      l.rect(0, 0, ancho, alto, color);
    },
    circulo(cx, cy, radio, color) {
      for (let j = cy - radio; j <= cy + radio; j += 1) {
        for (let i = cx - radio; i <= cx + radio; i += 1) {
          if ((i - cx) ** 2 + (j - cy) ** 2 <= radio * radio) l.pinta(i, j, color);
        }
      }
    },
    /** Franja horizontal con un tramado en damero entre dos colores (para cielos y transiciones). */
    degradado(y0, y1, arriba, abajo) {
      const alturaTramo = y1 - y0;
      for (let j = y0; j < y1; j += 1) {
        const t = (j - y0) / Math.max(1, alturaTramo - 1);
        for (let i = 0; i < ancho; i += 1) {
          const umbral = ((i + j) % 2) * 0.5 + 0.25;
          l.pinta(i, j, t < umbral ? arriba : abajo);
        }
      }
    },
  };
  return l;
}

/** Lee ancho y alto de un PNG (para las pruebas). */
export function medidasPng(bytes) {
  const b = Buffer.from(bytes);
  if (b.subarray(0, 8).toString('latin1') !== '\x89PNG\r\n\x1a\n') throw new Error('No es un PNG.');
  return { ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20) };
}

/** Lee la cabecera de un WAV (para las pruebas). */
export function cabeceraWav(bytes) {
  const b = Buffer.from(bytes);
  if (b.subarray(0, 4).toString('latin1') !== 'RIFF' || b.subarray(8, 12).toString('latin1') !== 'WAVE') throw new Error('No es un WAV.');
  return { canales: b.readUInt16LE(22), frecuencia: b.readUInt32LE(24), bits: b.readUInt16LE(34), muestras: b.readUInt32LE(40) / 2 };
}
