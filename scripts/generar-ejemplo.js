// scripts/generar-ejemplo.js
// Genera los dos retratos de muestra del juego de ejemplo «La llave del faro» (64×64,
// pixel art con la paleta del taller). No tienen autor humano y se publican bajo CC0.
// Determinista: sin azar. Uso: node scripts/generar-ejemplo.js
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { png, lienzo } from './png-wav.js';

const RAIZ = resolve(fileURLToPath(new URL('../', import.meta.url)));
const paleta = JSON.parse(readFileSync(resolve(RAIZ, 'plataforma/contenido/paleta.json'), 'utf8'));
const C = Object.fromEntries(paleta.colores.map((c) => [c.nombre, [parseInt(c.hex.slice(1, 3), 16), parseInt(c.hex.slice(3, 5), 16), parseInt(c.hex.slice(5, 7), 16)]]));

function cara(l, { piel, pelo, ropa, fondo }) {
  l.relleno(fondo);
  l.rect(16, 46, 32, 18, ropa); // hombros
  l.rect(26, 38, 12, 10, piel); // cuello
  l.circulo(32, 26, 14, piel); // cara
  l.rect(24, 24, 4, 4, C.noche); // ojos
  l.rect(36, 24, 4, 4, C.noche);
  l.rect(27, 33, 10, 2, C.cacao); // boca
  return pelo;
}

function retratoAna() {
  const l = lienzo(64, 64);
  const pelo = cara(l, { piel: C.arena, pelo: C.cacao, ropa: C.mar, fondo: C.cielo });
  l.rect(17, 10, 30, 8, pelo); // flequillo
  l.rect(15, 14, 6, 26, pelo); // pelo largo
  l.rect(43, 14, 6, 26, pelo);
  return png(64, 64, l.rgba);
}

function retratoFarero() {
  const l = lienzo(64, 64);
  const pelo = cara(l, { piel: C.arena, pelo: C.hueso, ropa: C.pino, fondo: C.pizarra });
  l.rect(19, 9, 26, 6, pelo); // gorra
  l.rect(15, 14, 34, 3, C.noche);
  l.rect(22, 35, 20, 6, pelo); // barba
  return png(64, 64, l.rgba);
}

export function retratos() {
  return { 'retrato-ana.png': retratoAna(), 'retrato-farero.png': retratoFarero() };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const carpeta = resolve(RAIZ, 'plataforma/ejemplo');
  mkdirSync(carpeta, { recursive: true });
  for (const [nombre, bytes] of Object.entries(retratos())) writeFileSync(resolve(carpeta, nombre), bytes);
  console.log('Retratos de muestra escritos en plataforma/ejemplo/.');
}
