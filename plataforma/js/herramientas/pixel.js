// plataforma/js/herramientas/pixel.js
// El lienzo del pixel art (spec, sección 9) como índices de la paleta: lápiz, borrador,
// relleno, cuentagotas, línea (para que el lápiz no deje huecos) e historial de veinte
// pasos. Puro: lo dibuja pixelart.js. 255 es transparente.

export const TAMANOS = { retrato: { ancho: 64, alto: 64 }, fondo: { ancho: 192, alto: 108 } };
export const TRANSPARENTE = 255;
export const LIMITE_HISTORIAL = 20;

export function hexARgb(hex) {
  const h = String(hex).replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function crearLienzo(ancho, alto, celdas = null) {
  return { ancho, alto, celdas: celdas ? Uint8Array.from(celdas) : new Uint8Array(ancho * alto).fill(TRANSPARENTE) };
}

const dentro = (lienzo, x, y) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < lienzo.ancho && y < lienzo.alto;

/** Cuentagotas: el índice de la celda, o transparente fuera del lienzo. */
export function tomar(lienzo, x, y) {
  return dentro(lienzo, x, y) ? lienzo.celdas[y * lienzo.ancho + x] : TRANSPARENTE;
}

/** Lápiz. Devuelve true si cambió algo. */
export function pintar(lienzo, x, y, indice) {
  if (!dentro(lienzo, x, y)) return false;
  const i = y * lienzo.ancho + x;
  if (lienzo.celdas[i] === indice) return false;
  lienzo.celdas[i] = indice;
  return true;
}

export const borrar = (lienzo, x, y) => pintar(lienzo, x, y, TRANSPARENTE);

/** Relleno de la zona contigua del mismo color (cuatro vecinos), sin recursión. */
export function rellenar(lienzo, x, y, indice) {
  if (!dentro(lienzo, x, y)) return false;
  const objetivo = tomar(lienzo, x, y);
  if (objetivo === indice) return false;
  const { ancho, alto, celdas } = lienzo;
  const pila = [[x, y]];
  while (pila.length) {
    const [cx, cy] = pila.pop();
    if (cx < 0 || cy < 0 || cx >= ancho || cy >= alto) continue;
    const i = cy * ancho + cx;
    if (celdas[i] !== objetivo) continue;
    celdas[i] = indice;
    pila.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  return true;
}

/** Línea de celdas entre dos puntos (Bresenham). Devuelve true si cambió algo. */
export function linea(lienzo, x0, y0, x1, y1, indice) {
  let [ax, ay] = [x0, y0];
  const dx = Math.abs(x1 - ax);
  const dy = -Math.abs(y1 - ay);
  const sx = ax < x1 ? 1 : -1;
  const sy = ay < y1 ? 1 : -1;
  let error = dx + dy;
  let cambio = false;
  for (;;) {
    if (pintar(lienzo, ax, ay, indice)) cambio = true;
    if (ax === x1 && ay === y1) break;
    const e2 = 2 * error;
    if (e2 >= dy) { error += dy; ax += sx; }
    if (e2 <= dx) { error += dx; ay += sy; }
  }
  return cambio;
}

/** Historial de deshacer y rehacer. registrar() guarda el estado ANTES de un trazo; olvidar() descarta el último si el trazo no cambió nada. */
export function crearHistorial(lienzo, limite = LIMITE_HISTORIAL) {
  let pasado = [];
  let futuro = [];
  return {
    registrar() {
      pasado.push(Uint8Array.from(lienzo.celdas));
      if (pasado.length > limite) pasado.shift();
      futuro = [];
    },
    olvidar() {
      pasado.pop();
    },
    deshacer() {
      if (!pasado.length) return false;
      futuro.push(Uint8Array.from(lienzo.celdas));
      lienzo.celdas.set(pasado.pop());
      return true;
    },
    rehacer() {
      if (!futuro.length) return false;
      pasado.push(Uint8Array.from(lienzo.celdas));
      lienzo.celdas.set(futuro.pop());
      return true;
    },
    get puedeDeshacer() { return pasado.length > 0; },
    get puedeRehacer() { return futuro.length > 0; },
  };
}

/** Píxeles RGBA (para el canvas y el PNG). paleta: lista de hexadecimales. */
export function aRgba(lienzo, paleta) {
  const rgb = paleta.map(hexARgb);
  const salida = new Uint8ClampedArray(lienzo.ancho * lienzo.alto * 4);
  for (let i = 0; i < lienzo.celdas.length; i += 1) {
    const color = rgb[lienzo.celdas[i]];
    if (!color) continue;
    salida[i * 4] = color[0];
    salida[i * 4 + 1] = color[1];
    salida[i * 4 + 2] = color[2];
    salida[i * 4 + 3] = 255;
  }
  return salida;
}

/** Lienzo a partir de píxeles RGBA: cada color se aproxima al más cercano de la paleta; lo casi transparente queda transparente. */
export function desdeRgba(rgba, ancho, alto, paleta) {
  const rgb = paleta.map(hexARgb);
  const lienzo = crearLienzo(ancho, alto);
  for (let i = 0; i < ancho * alto; i += 1) {
    if (rgba[i * 4 + 3] < 128) continue;
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    let mejor = 0;
    let distancia = Infinity;
    rgb.forEach(([pr, pg, pb], k) => {
      const d = (pr - r) ** 2 + (pg - g) ** 2 + (pb - b) ** 2;
      if (d < distancia) { distancia = d; mejor = k; }
    });
    lienzo.celdas[i] = mejor;
  }
  return lienzo;
}
