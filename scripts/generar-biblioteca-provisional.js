// scripts/generar-biblioteca-provisional.js
// Genera las piezas provisionales de la biblioteca (8 fondos, 8 retratos, 6 pistas y
// 12 efectos) con la paleta del taller, y escribe plataforma/biblioteca/catalogo.json.
// Las piezas no tienen autor humano: se publican bajo CC0 y el catálogo las presenta
// con las licencias de la tabla del spec para el ejercicio, diciéndolo en `simulado`.
// Determinista: la misma semilla produce los mismos bytes.
// Uso: node scripts/generar-biblioteca-provisional.js
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { png, wav, lienzo } from './png-wav.js';

const RAIZ = resolve(fileURLToPath(new URL('../', import.meta.url)));
const BIBLIOTECA = resolve(RAIZ, 'plataforma/biblioteca');
export const SCRIPT = 'scripts/generar-biblioteca-provisional.js';
const FRECUENCIA = 22050;

const paleta = JSON.parse(readFileSync(resolve(RAIZ, 'plataforma/contenido/paleta.json'), 'utf8'));
const C = Object.fromEntries(paleta.colores.map((c) => [c.nombre, [parseInt(c.hex.slice(1, 3), 16), parseInt(c.hex.slice(3, 5), 16), parseInt(c.hex.slice(5, 7), 16)]]));

// ---- azar determinista ----
function azar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const entre = (r, a, b) => a + Math.floor(r() * (b - a + 1));

// ---- fondos (192 × 108) ----
function estrellas(l, r, n, color) {
  for (let i = 0; i < n; i += 1) l.pinta(entre(r, 0, 191), entre(r, 0, 58), color);
}
function colinas(l, r, base, amplitud, color) {
  let y = base;
  for (let x = 0; x < 192; x += 1) {
    if (x % 8 === 0) y = Math.max(base - amplitud, Math.min(base + amplitud, y + entre(r, -2, 2)));
    l.rect(x, y, 1, 108 - y, color);
  }
}
function arbol(l, x, base, alto, tronco, copa) {
  l.rect(x + 2, base - alto, 2, alto, tronco);
  for (let i = 0; i < 3; i += 1) l.rect(x - i, base - alto - 6 + i * 4, 6 + i * 2, 4, copa);
}
function edificio(l, r, x, ancho, alto, color, ventana) {
  l.rect(x, 108 - alto, ancho, alto, color);
  for (let y = 108 - alto + 3; y < 104; y += 5) {
    for (let xx = x + 2; xx < x + ancho - 2; xx += 4) if (r() < 0.6) l.pinta(xx, y, ventana);
  }
}

const FONDOS = [
  ['muelle-noche', 'Muelle de noche', (l, r) => {
    l.degradado(0, 60, C.noche, C.pizarra);
    estrellas(l, r, 40, C.hueso);
    l.circulo(150, 18, 7, C.hueso);
    l.circulo(153, 16, 6, C.pizarra);
    l.rect(0, 60, 192, 48, C.mar);
    for (let x = 0; x < 192; x += 6) l.pinta(x + entre(r, 0, 5), entre(r, 62, 100), C.niebla);
    l.rect(0, 84, 110, 24, C.cacao);
    for (let x = 0; x < 110; x += 10) l.rect(x, 84, 1, 24, C.noche);
    l.rect(20, 40, 10, 44, C.hueso);
    l.rect(20, 36, 10, 4, C.rojo);
    l.rect(22, 30, 6, 6, C.ambar);
  }],
  ['bosque', 'Bosque de pinos', (l, r) => {
    l.degradado(0, 70, C.cielo, C.niebla);
    colinas(l, r, 60, 6, C.pino);
    l.rect(0, 84, 192, 24, C.musgo);
    for (let i = 0; i < 14; i += 1) arbol(l, entre(r, 0, 186), entre(r, 86, 104), entre(r, 14, 30), C.cacao, i % 2 ? C.pino : C.musgo);
  }],
  ['ciudad-atardecer', 'Ciudad al atardecer', (l, r) => {
    l.degradado(0, 50, C.lila, C.naranja);
    l.degradado(50, 70, C.naranja, C.ambar);
    l.circulo(140, 56, 14, C.ambar);
    let x = 0;
    while (x < 192) {
      const w = entre(r, 10, 24);
      edificio(l, r, x, w, entre(r, 30, 80), C.noche, C.ambar);
      x += w + entre(r, 1, 4);
    }
    l.rect(0, 100, 192, 8, C.pizarra);
  }],
  ['desierto', 'Desierto', (l, r) => {
    l.degradado(0, 60, C.cielo, C.arena);
    l.circulo(40, 22, 10, C.ambar);
    colinas(l, r, 66, 5, C.ambar);
    colinas(l, r, 80, 6, C.arena);
    for (let i = 0; i < 4; i += 1) {
      const x = entre(r, 10, 180);
      const base = entre(r, 90, 104);
      l.rect(x, base - 16, 3, 16, C.musgo);
      l.rect(x - 4, base - 10, 4, 2, C.musgo);
      l.rect(x - 4, base - 14, 2, 5, C.musgo);
    }
  }],
  ['playa', 'Playa', (l, r) => {
    l.degradado(0, 56, C.cielo, C.hueso);
    l.rect(0, 56, 192, 24, C.mar);
    l.degradado(80, 86, C.mar, C.cielo);
    l.rect(0, 86, 192, 22, C.arena);
    for (let x = 0; x < 192; x += 5) l.pinta(x + entre(r, 0, 4), entre(r, 58, 78), C.hueso);
    l.rect(160, 50, 3, 40, C.cacao);
    for (let i = 0; i < 4; i += 1) l.rect(150 + i * 6, 46 + (i % 2) * 2, 12, 3, C.musgo);
  }],
  ['montana', 'Montaña nevada', (l, r) => {
    l.degradado(0, 60, C.cielo, C.niebla);
    colinas(l, r, 50, 14, C.pizarra);
    for (let x = 0; x < 192; x += 1) if (r() < 0.5) l.pinta(x, entre(r, 36, 60), C.hueso);
    colinas(l, r, 84, 4, C.pino);
    for (let i = 0; i < 8; i += 1) arbol(l, entre(r, 0, 186), entre(r, 92, 106), entre(r, 10, 18), C.cacao, C.pino);
  }],
  ['cueva', 'Cueva', (l, r) => {
    l.relleno(C.noche);
    for (let i = 0; i < 300; i += 1) l.pinta(entre(r, 0, 191), entre(r, 0, 107), C.pizarra);
    colinas(l, r, 20, 10, C.noche);
    l.rect(0, 92, 192, 16, C.cacao);
    for (let i = 0; i < 9; i += 1) {
      const x = entre(r, 5, 185);
      const h = entre(r, 6, 18);
      l.rect(x, 92 - h, 3, h, i % 2 ? C.lila : C.cielo);
    }
  }],
  ['interior-faro', 'Interior del faro', (l, r) => {
    l.relleno(C.arena);
    l.rect(0, 0, 192, 10, C.cacao);
    l.rect(0, 98, 192, 10, C.cacao);
    l.rect(120, 20, 40, 40, C.noche);
    for (let i = 0; i < 10; i += 1) l.pinta(entre(r, 122, 158), entre(r, 22, 58), C.hueso);
    l.rect(118, 18, 44, 2, C.cacao);
    l.rect(118, 60, 44, 2, C.cacao);
    for (let i = 0; i < 6; i += 1) l.rect(20 + i * 8, 90 - i * 12, 30, 4, C.cacao);
    l.rect(70, 30, 6, 60, C.pizarra);
    l.circulo(73, 26, 6, C.ambar);
  }],
];

// ---- retratos (64 × 64, fondo transparente) ----
function cara(l, { piel, ropa, ojos = C.noche, forma = 'redonda' }) {
  l.rect(18, 46, 28, 18, ropa);
  l.rect(26, 40, 12, 8, piel);
  if (forma === 'cuadrada') l.rect(16, 12, 32, 32, piel);
  else l.circulo(32, 28, 15, piel);
  l.rect(24, 24, 4, 4, ojos);
  l.rect(36, 24, 4, 4, ojos);
  l.rect(28, 34, 8, 2, C.rojo);
}

const RETRATOS = [
  ['farera', 'Farera', (l) => {
    cara(l, { piel: C.arena, ropa: C.mar });
    l.rect(17, 12, 30, 8, C.cacao);
    l.rect(14, 6, 36, 8, C.mar);
    l.rect(12, 12, 40, 3, C.noche);
  }],
  ['nino', 'Niño', (l) => {
    cara(l, { piel: C.hueso, ropa: C.lima });
    l.rect(18, 12, 28, 7, C.naranja);
    l.pinta(22, 30, C.rosa);
    l.pinta(41, 30, C.rosa);
  }],
  ['anciana', 'Anciana', (l) => {
    cara(l, { piel: C.arena, ropa: C.lila });
    l.rect(16, 12, 32, 9, C.niebla);
    l.rect(22, 22, 8, 8, C.pizarra);
    l.rect(34, 22, 8, 8, C.pizarra);
    l.rect(30, 25, 4, 1, C.pizarra);
    l.rect(24, 24, 4, 4, C.noche);
    l.rect(36, 24, 4, 4, C.noche);
  }],
  ['robot', 'Robot', (l) => {
    cara(l, { piel: C.pizarra, ropa: C.niebla, ojos: C.cielo, forma: 'cuadrada' });
    l.rect(31, 4, 2, 8, C.niebla);
    l.circulo(32, 4, 2, C.rojo);
    l.rect(26, 34, 12, 3, C.noche);
    for (let x = 26; x < 38; x += 3) l.pinta(x, 35, C.cielo);
  }],
  ['marinero', 'Marinero', (l) => {
    cara(l, { piel: C.arena, ropa: C.hueso });
    l.rect(18, 36, 28, 10, C.cacao);
    l.rect(16, 8, 32, 8, C.hueso);
    l.rect(16, 15, 32, 2, C.mar);
    l.rect(20, 50, 24, 2, C.mar);
    l.rect(20, 56, 24, 2, C.mar);
  }],
  ['gata', 'Gata', (l) => {
    cara(l, { piel: C.naranja, ropa: C.naranja, ojos: C.musgo });
    l.rect(16, 6, 8, 10, C.naranja);
    l.rect(40, 6, 8, 10, C.naranja);
    l.rect(18, 8, 4, 6, C.rosa);
    l.rect(42, 8, 4, 6, C.rosa);
    l.rect(30, 31, 4, 3, C.rosa);
    l.rect(12, 32, 10, 1, C.hueso);
    l.rect(42, 32, 10, 1, C.hueso);
  }],
  ['fantasma', 'Fantasma', (l) => {
    const blanco = [...C.hueso, 210];
    l.circulo(32, 24, 16, blanco);
    l.rect(16, 24, 32, 30, blanco);
    for (let x = 16; x < 48; x += 8) l.rect(x, 54, 4, 4, blanco);
    l.rect(25, 20, 4, 6, C.noche);
    l.rect(35, 20, 4, 6, C.noche);
    l.rect(29, 32, 6, 4, C.noche);
  }],
  ['extrano', 'Extraño', (l) => {
    cara(l, { piel: C.noche, ropa: C.pizarra, ojos: C.lila });
    l.rect(14, 6, 36, 14, C.pizarra);
    l.rect(12, 18, 40, 4, C.pizarra);
    l.rect(16, 40, 32, 8, C.pizarra);
  }],
];

// ---- audio ----
function tono(freq, dur, { forma = 'cuadrada', gan = 0.3, decaimiento = 3 } = {}) {
  const n = Math.round(dur * FRECUENCIA);
  const m = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const t = i / FRECUENCIA;
    const fase = (t * freq) % 1;
    let v;
    if (forma === 'cuadrada') v = (fase < 0.5 ? 1 : -1) * 0.6 + Math.sin(2 * Math.PI * fase) * 0.4;
    else if (forma === 'triangulo') v = 4 * Math.abs(fase - 0.5) - 1;
    else if (forma === 'sierra') v = fase * 2 - 1;
    else v = Math.sin(2 * Math.PI * fase);
    const ataque = Math.min(1, i / (FRECUENCIA * 0.008));
    m[i] = v * ataque * Math.exp(-t * decaimiento) * gan;
  }
  return m;
}
function ruidoCrudo(dur, r, suavizado = 1) {
  const n = Math.round(dur * FRECUENCIA);
  const m = new Float32Array(n);
  let v = 0;
  for (let i = 0; i < n; i += 1) {
    v += ((r() * 2 - 1) - v) / suavizado;
    m[i] = v * Math.min(4, Math.sqrt(suavizado));
  }
  return m;
}
function envolver(m, fn) {
  const n = m.length;
  for (let i = 0; i < n; i += 1) m[i] *= fn(i / n);
  return m;
}
function mezclar(duracion, capas) {
  const largo = Math.round(duracion * FRECUENCIA);
  const out = new Float32Array(largo);
  for (const { en, muestras } of capas) {
    const inicio = Math.round(en * FRECUENCIA);
    for (let i = 0; i < muestras.length && inicio + i < largo; i += 1) out[inicio + i] += muestras[i];
  }
  for (let i = 0; i < largo; i += 1) out[i] = Math.max(-1, Math.min(1, out[i]));
  return out;
}
const ESCALAS = { mayor: [0, 2, 4, 7, 9, 12, 14, 16], menor: [0, 3, 5, 7, 10, 12, 15, 17] };
const nota = (base, semitonos) => base * 2 ** (semitonos / 12);

/** Dos compases de ocho pasos, como el secuenciador del plan 5: melodía pentatónica, bajo en los tiempos fuertes y, si se pide, percusión. */
function pista({ semilla, tempo, base, escala, forma, percusion }) {
  const r = azar(semilla);
  const paso = 60 / tempo / 2;
  const capas = [];
  const grados = ESCALAS[escala];
  for (let i = 0; i < 16; i += 1) {
    if (r() < 0.8) capas.push({ en: i * paso, muestras: tono(nota(base * 2, grados[entre(r, 0, grados.length - 1)]), paso * 0.9, { forma, gan: 0.22, decaimiento: 4 }) });
    if (i % 4 === 0) capas.push({ en: i * paso, muestras: tono(nota(base, i % 8 === 0 ? 0 : 7), paso * 1.8, { forma: 'triangulo', gan: 0.25, decaimiento: 2 }) });
    if (percusion && i % 4 === 2) capas.push({ en: i * paso, muestras: envolver(ruidoCrudo(0.08, r, 1), (t) => (1 - t) ** 2 * 0.25) });
  }
  return mezclar(paso * 16, capas);
}

const PISTAS = [
  ['tema-del-faro', 'Tema del faro', { semilla: 101, tempo: 100, base: 110, escala: 'menor', forma: 'cuadrada', percusion: false }],
  ['marea', 'Marea', { semilla: 102, tempo: 80, base: 98, escala: 'mayor', forma: 'seno', percusion: false }],
  ['persecucion', 'Persecución', { semilla: 103, tempo: 160, base: 123, escala: 'menor', forma: 'sierra', percusion: true }],
  ['nana', 'Nana', { semilla: 104, tempo: 84, base: 131, escala: 'mayor', forma: 'triangulo', percusion: false }],
  ['fiesta', 'Fiesta en el muelle', { semilla: 105, tempo: 140, base: 110, escala: 'mayor', forma: 'cuadrada', percusion: true }],
  ['suspenso', 'Suspenso', { semilla: 106, tempo: 72, base: 87, escala: 'menor', forma: 'seno', percusion: false }],
];

function efecto(nombre, r) {
  switch (nombre) {
    case 'olas': return envolver(ruidoCrudo(1.6, r, 6), (t) => Math.sin(Math.PI * t) ** 2 * 0.6);
    case 'puerta': return envolver(tono(180, 0.8, { forma: 'sierra', gan: 0.35, decaimiento: 1 }), (t) => 0.6 + 0.4 * Math.sin(t * 70));
    case 'pasos': return mezclar(1.0, [0, 0.25, 0.5, 0.75].map((en) => ({ en, muestras: envolver(ruidoCrudo(0.12, r, 4), (t) => (1 - t) ** 2 * 0.6) })));
    case 'campana': return mezclar(1.2, [{ en: 0, muestras: tono(880, 1.2, { forma: 'seno', gan: 0.4, decaimiento: 2.5 }) }, { en: 0, muestras: tono(1320, 1.2, { forma: 'seno', gan: 0.2, decaimiento: 4 }) }]);
    case 'trueno': return envolver(ruidoCrudo(1.6, r, 12), (t) => Math.exp(-t * 3) * 0.9);
    case 'chispa': return mezclar(0.3, [{ en: 0, muestras: envolver(ruidoCrudo(0.25, r, 1), (t) => (1 - t) ** 3 * 0.5) }, { en: 0, muestras: tono(2200, 0.1, { forma: 'seno', gan: 0.3, decaimiento: 20 }) }]);
    case 'viento': return envolver(ruidoCrudo(1.8, r, 10), (t) => (0.4 + 0.3 * Math.sin(2 * Math.PI * t * 1.5)) * 0.7);
    case 'salpicadura': return envolver(ruidoCrudo(0.6, r, 2), (t) => Math.exp(-t * 4) * 0.6);
    case 'clic': return tono(1000, 0.08, { forma: 'cuadrada', gan: 0.4, decaimiento: 30 });
    case 'pitido': return mezclar(0.45, [0, 0.22].map((en) => ({ en, muestras: tono(1200, 0.18, { forma: 'seno', gan: 0.4, decaimiento: 6 }) })));
    case 'zumbido': return mezclar(1.0, [{ en: 0, muestras: tono(110, 1.0, { forma: 'cuadrada', gan: 0.2, decaimiento: 0.5 }) }, { en: 0, muestras: tono(113, 1.0, { forma: 'cuadrada', gan: 0.2, decaimiento: 0.5 }) }]);
    case 'risa': return mezclar(0.8, [0, 0.15, 0.3, 0.45, 0.6].map((en, i) => ({ en, muestras: tono(i % 2 ? 280 : 320, 0.11, { forma: 'seno', gan: 0.4, decaimiento: 12 }) })));
    default: throw new Error(`Efecto desconocido: ${nombre}`);
  }
}

const EFECTOS = [
  ['olas', 'Olas', 'olas'], ['puerta-que-cruje', 'Puerta que cruje', 'puerta'], ['pasos', 'Pasos', 'pasos'], ['campana', 'Campana', 'campana'],
  ['trueno', 'Trueno', 'trueno'], ['chispa', 'Chispa', 'chispa'], ['viento', 'Viento', 'viento'], ['salpicadura', 'Salpicadura', 'salpicadura'],
  ['clic', 'Clic', 'clic'], ['pitido', 'Pitido', 'pitido'], ['zumbido', 'Zumbido', 'zumbido'], ['risa', 'Risa', 'risa'],
];

// ---- catálogo ----
export const AUTOR = 'Programa generador del taller «¿De quién es tu videojuego?» (sin autor humano)';
const AUTOR_CORTO = 'Programa generador del taller';
const SIMULADO = { licencia: 'CC0', autor: AUTOR, fuente: SCRIPT };
const CONDICIONES = { DP: [], CC0: [], 'CC-BY-4.0': ['BY'], 'CC-BY-SA-4.0': ['BY', 'SA'], 'CC-BY-NC-4.0': ['BY', 'NC'], 'CC-BY-ND-4.0': ['BY', 'ND'], CURSO: [], DESCONOCIDO: [] };
const ABREVIATURAS = { 'CC-BY-4.0': 'CC BY 4.0', 'CC-BY-SA-4.0': 'CC BY-SA 4.0', 'CC-BY-NC-4.0': 'CC BY-NC 4.0', 'CC-BY-ND-4.0': 'CC BY-ND 4.0', CC0: 'CC0 1.0' };
const LICENCIAS = {
  fondo: ['CC-BY-4.0', 'CC0', 'CC-BY-SA-4.0', 'CC-BY-ND-4.0', 'DP', 'CC-BY-4.0', 'CURSO', 'DESCONOCIDO'],
  retrato: ['CC-BY-4.0', 'CC0', 'CC-BY-SA-4.0', 'CC-BY-ND-4.0', 'DP', 'CC-BY-4.0', 'CURSO', 'DESCONOCIDO'],
  musica: ['CC-BY-4.0', 'CC0', 'CC-BY-NC-4.0', 'DP', 'CC-BY-SA-4.0', 'CURSO'],
  efecto: ['CC-BY-4.0', 'CC0', 'CC-BY-NC-4.0', 'DP', 'CC-BY-4.0', 'CC0', 'CC-BY-SA-4.0', 'CC-BY-4.0', 'CC0', 'DP', 'CURSO', 'DESCONOCIDO'],
};

function credito(titulo, licencia) {
  if (licencia === 'DESCONOCIDO') return '';
  if (licencia === 'CURSO') return `«${titulo}», licencia limitada al curso`;
  if (licencia === 'DP') return `«${titulo}», dominio público`;
  return `«${titulo}», ${AUTOR_CORTO}, ${ABREVIATURAS[licencia]}`;
}

function entrada(id, tipo, titulo, licencia, archivo) {
  const autor = licencia === 'DESCONOCIDO' ? 'Desconocido' : licencia === 'CURSO' ? 'Taller «¿De quién es tu videojuego?»' : AUTOR;
  const pieza = { id, tipo, titulo, autor, fuente: SCRIPT, licencia, condiciones: CONDICIONES[licencia], archivo, creditoSugerido: credito(titulo, licencia) };
  if (licencia !== 'CC0') pieza.simulado = SIMULADO;
  return pieza;
}

export function generar() {
  const piezas = [];
  for (const carpeta of ['fondos', 'retratos', 'musica', 'efectos']) mkdirSync(resolve(BIBLIOTECA, carpeta), { recursive: true });

  FONDOS.forEach(([clave, titulo, dibuja], i) => {
    const l = lienzo(192, 108);
    dibuja(l, azar(1000 + i));
    const archivo = `fondos/${clave}.png`;
    writeFileSync(resolve(BIBLIOTECA, archivo), png(192, 108, l.rgba));
    piezas.push(entrada(`bib_f${String(i + 1).padStart(2, '0')}`, 'fondo', titulo, LICENCIAS.fondo[i], archivo));
  });
  RETRATOS.forEach(([clave, titulo, dibuja], i) => {
    const l = lienzo(64, 64);
    dibuja(l, azar(2000 + i));
    const archivo = `retratos/${clave}.png`;
    writeFileSync(resolve(BIBLIOTECA, archivo), png(64, 64, l.rgba));
    piezas.push(entrada(`bib_r${String(i + 1).padStart(2, '0')}`, 'retrato', titulo, LICENCIAS.retrato[i], archivo));
  });
  PISTAS.forEach(([clave, titulo, parametros], i) => {
    const archivo = `musica/${clave}.wav`;
    writeFileSync(resolve(BIBLIOTECA, archivo), wav(pista(parametros), FRECUENCIA));
    piezas.push(entrada(`bib_m${String(i + 1).padStart(2, '0')}`, 'musica', titulo, LICENCIAS.musica[i], archivo));
  });
  EFECTOS.forEach(([clave, titulo, tipoEfecto], i) => {
    const archivo = `efectos/${clave}.wav`;
    writeFileSync(resolve(BIBLIOTECA, archivo), wav(efecto(tipoEfecto, azar(3000 + i)), FRECUENCIA));
    piezas.push(entrada(`bib_e${String(i + 1).padStart(2, '0')}`, 'efecto', titulo, LICENCIAS.efecto[i], archivo));
  });

  const catalogo = {
    version: 1,
    provisional: true,
    nota: 'Catálogo provisional. Las piezas las generó un programa de la plataforma (sin autor humano) y se publican bajo CC0; la licencia que muestra cada entrada es parte del ejercicio y «simulado» dice la real. Pendiente de reemplazar por piezas reales de repositorios abiertos, verificadas en la fuente (spec, sección 11).',
    generadoCon: SCRIPT,
    piezas,
  };
  writeFileSync(resolve(BIBLIOTECA, 'catalogo.json'), `${JSON.stringify(catalogo, null, 2)}\n`);
  return catalogo;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const catalogo = generar();
  console.log(`Biblioteca provisional: ${catalogo.piezas.length} piezas en ${BIBLIOTECA}`);
}
