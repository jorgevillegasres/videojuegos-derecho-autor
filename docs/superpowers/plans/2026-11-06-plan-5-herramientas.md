# Plan 5 de 6: Herramientas de creación — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Las tres herramientas de la sección 9 del spec, deliberadamente simples: pixel art con la paleta fija (retratos de 64×64 y fondos de 192×108), grabador con el micrófono (hasta 30 segundos, con recorte), y secuenciador de dos compases con cuatro instrumentos. Cada una devuelve un archivo que entra al juego como elemento con origen `creado`, sello de fecha y huella, y ficha en verde.

**Architecture:** Cada herramienta se parte en un módulo puro probado en Node y una vista que solo usa el navegador a través de funciones inyectables. `herramientas/pixel.js` es el lienzo de índices de paleta con lápiz, borrador, relleno, cuentagotas, línea e historial de 20 pasos; `herramientas/pixelart.js` lo dibuja en un canvas (contexto inyectado) y codifica el PNG. `herramientas/secuencia.js` es el patrón y su síntesis a muestras, determinista; `herramientas/secuenciador.js` lo toca en bucle con Web Audio (inyectado) y guarda el WAV con el mismo render. `herramientas/audio-util.js` trae WAV, forma de onda y recorte; `herramientas/grabador.js` usa `getUserMedia`, `MediaRecorder` y `decodeAudioData` inyectados. El editor abre cada herramienta como una capa, igual que la biblioteca, y mete el resultado con `crearElementoCreado`, que calcula el sello.

**Tech Stack:** El de los planes anteriores. Sin dependencias nuevas. Spec: secciones 9, 10 (ajuste de imágenes), 15.3 (`herramientas/*.js: abrir(opciones) → Promise<Blob | null>`), 16 y 17 (micrófono sin permiso).

---

## Mapa de planes

| Plan | Qué construye | Sección del spec |
|---|---|---|
| 1. Núcleo (hecho) | Modelo, fichas, licencias, semáforo, contenido jurídico, almacén, copias | 6, 12.2–12.5, 12.9, 13 |
| 2. Motor y editor (hecho) | Reproductor, `index.html`, arranque, inventario, guion, vista previa, propiedades, subida, copias | 3, 7, 8, 10, 13, 15.4, 16, 17 |
| 3. Fichas en pantalla (hecho) | Panel de ficha, semáforos, mapa de activos, créditos, foco al subir | 10, 12.1–12.6, 12.8, 12.9, 19.13 |
| 4. Biblioteca (hecho) | Catálogo validado, selector, licencia del curso, créditos, paleta | 11, 12.2, 9 (paleta) |
| **5. Herramientas (este)** | Pixel art, grabador, secuenciador; sello de creación; reabrir un pixel art | 9, 15.3, 17 |
| 6. Publicación | Decisión de registro, informe, paquete de entrega, recorrido Playwright | 12.7, 14, 18 |

**Decisiones que este plan fija y el spec no decía:**

- **Lo que se oye es lo que se guarda.** El secuenciador no usa osciladores en vivo: `renderizar()` produce las muestras de los dos compases y el navegador las toca en bucle con un `AudioBufferSourceNode`; «Guardar» codifica esas mismas muestras en WAV a 22050 Hz. No hace falta `OfflineAudioContext`.
- **Recorte del grabador.** `MediaRecorder` no recorta. Si el estudiante mueve las manijas, la grabación se decodifica, se recorta y se guarda como WAV (mono, 22050 Hz); si no la recorta, se guarda tal cual la entregó el navegador (WebM/Opus o MP4/AAC). Treinta segundos en WAV pesan 1,3 MB, por debajo del límite de audio.
- **Qué tipo de elemento.** Antes de abrir la herramienta el editor pregunta con el mismo diálogo de la subida: pixel art → fondo o retrato (fija el tamaño del lienzo); grabador → voz o efecto; el secuenciador siempre hace música. Las herramientas devuelven `Blob | null`, como dice el spec; el nombre inicial lo pone el editor («Fondo creado 1», «Grabación 2», «Pista 3») y se cambia en propiedades.
- **Reabrir un pixel art.** En las propiedades de un fondo o retrato con origen `creado` hay «Editar en pixel art»; al guardar se reemplaza el archivo y se recalcula el sello (spec 9). Los colores que no estén en la paleta se aproximan al más cercano.
- **Teclado.** El lienzo tiene un cursor que se mueve con las flechas y pinta con Enter o Espacio; la rejilla del secuenciador son botones; las manijas del grabador son controles de rango. Todo se usa sin ratón.
- **Micrófono negado o inexistente** (spec 17): el grabador explica cómo permitirlo y ofrece «Subir un archivo en su lugar», que abre la subida con el tipo elegido.

## Convenciones de este plan

- Las de los planes anteriores. Cada vista de herramienta se crea con `crearX(contenedor, dependencias)` y expone `abrir(opciones) → Promise<Blob | null>`: resuelve con el archivo al guardar y con `null` al cancelar (botón, Escape).
- Las dependencias del navegador se inyectan con valores por defecto: `crearContexto(canvas)`, `codificarPng(rgba, ancho, alto) → Promise<Blob>`, `decodificarPng(archivo) → Promise<Uint8ClampedArray>`, `crearAudioContext()`, `pedirMicrofono()`, `crearGrabadora(stream, opciones)`, `formatoSoportado(tipo)`, `decodificar(blob) → Promise<{ muestras, frecuencia }>`. En las pruebas se pasan dobles; jsdom no tiene canvas ni audio.
- Conteo de pruebas: el plan 4 dejó 259. Cada tarea dice cuántas agrega; el cierre espera 299.

## Estructura de archivos que deja este plan

```
plataforma/
  css/editor.css                    + herramientas (lienzo, paleta, rejilla, forma de onda)
  js/
    herramientas/
      audio-util.js                 mezclarAMono, remuestrear, codificarWav, formaDeOnda, recortar, elegirFormato
      secuencia.js                  crearPatron, alternar, fijarTempo, esVacio, frecuenciaDe, renderizar
      pixel.js                      crearLienzo, pintar, borrar, rellenar, tomar, linea, crearHistorial, aRgba, desdeRgba
      pixelart.js                   crearPixelArt(contenedor, deps) → { abrir({ tipo, archivo }) }
      secuenciador.js               crearSecuenciador(contenedor, deps) → { abrir() }
      grabador.js                   crearGrabador(contenedor, deps) → { abrir({ alSubirEnSuLugar }) }
    editor/
      creados.js                    crearElementoCreado(sesion, blob, { tipo, nombre }) y reemplazarArchivoCreado
      inventario.js                 (cambia) botones «Pixel art», «Grabar», «Secuenciador»
      propiedades.js                (cambia) «Editar en pixel art» en fondos y retratos creados
      editor.js                     (cambia) abre las herramientas y mete los resultados
    app.js                          (cambia) carga la paleta
tests/
  audio-util.test.js  secuencia.test.js  pixel.test.js  pixelart.test.js  secuenciador.test.js  grabador.test.js  creados.test.js
  inventario.test.js  propiedades.test.js  editor.test.js   (cambian)
```

---

### Task 1: Utilidades de audio

**Files:**
- Create: `plataforma/js/herramientas/audio-util.js`
- Create: `tests/audio-util.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/audio-util.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cabeceraWav } from '../scripts/png-wav.js';
import { mezclarAMono, remuestrear, codificarWav, formaDeOnda, recortar, elegirFormato, FORMATOS_GRABACION } from '../plataforma/js/herramientas/audio-util.js';

test('mezclarAMono promedia los canales y con ninguno devuelve vacío', () => {
  const mono = mezclarAMono([new Float32Array([1, 0, -1]), new Float32Array([0, 0, 1])]);
  assert.deepEqual([...mono], [0.5, 0, 0]);
  assert.equal(mezclarAMono([]).length, 0);
});

test('remuestrear conserva la duración y los extremos', () => {
  const original = new Float32Array([0, 1, 0, -1]);
  const doble = remuestrear(original, 4, 8);
  assert.equal(doble.length, 8);
  assert.equal(doble[0], 0);
  assert.equal(doble[2], 1);
  assert.ok(Math.abs(doble[1] - 0.5) < 1e-6, 'punto medio interpolado');
  assert.equal(remuestrear(original, 4, 4), original, 'sin cambio devuelve la misma');
  assert.equal(remuestrear(new Float32Array(44100), 44100, 22050).length, 22050);
});

test('codificarWav escribe PCM 16 bits mono con cabecera y recorte', () => {
  const bytes = codificarWav(new Float32Array([0, 0.5, 2, -2]), 22050);
  assert.equal(bytes.byteLength, 44 + 8);
  assert.deepEqual(cabeceraWav(new Uint8Array(bytes)), { canales: 1, frecuencia: 22050, bits: 16, muestras: 4 });
  const vista = new DataView(bytes);
  assert.equal(vista.getInt16(44, true), 0);
  assert.equal(vista.getInt16(46, true), Math.round(0.5 * 32767));
  assert.equal(vista.getInt16(48, true), 32767);
  assert.equal(vista.getInt16(50, true), -32767);
});

test('formaDeOnda da el pico de cada columna', () => {
  const picos = formaDeOnda(new Float32Array([0.1, -0.9, 0.2, 0.3, 0, 0]), 3);
  assert.deepEqual([...picos].map((v) => Number(v.toFixed(2))), [0.9, 0.3, 0]);
  assert.deepEqual([...formaDeOnda(new Float32Array(0), 4)], [0, 0, 0, 0]);
  assert.equal(formaDeOnda(new Float32Array([1, 1]), 8).length, 8, 'más columnas que muestras no rompe');
});

test('recortar respeta los bordes y devuelve una copia', () => {
  const muestras = new Float32Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const medio = recortar(muestras, 10, 0.2, 0.5);
  assert.deepEqual([...medio], [2, 3, 4]);
  medio[0] = 99;
  assert.equal(muestras[2], 2, 'no toca el original');
  assert.deepEqual([...recortar(muestras, 10, -1, 99)], [...muestras]);
  assert.equal(recortar(muestras, 10, 0.8, 0.3).length, 0, 'fin antes del inicio: vacío');
});

test('elegirFormato prefiere WebM/Opus, cae a MP4 y devuelve vacío si nada se soporta', () => {
  assert.equal(elegirFormato(() => true), 'audio/webm;codecs=opus');
  assert.equal(elegirFormato((f) => f.startsWith('audio/mp4')), 'audio/mp4;codecs=mp4a.40.2');
  assert.equal(elegirFormato(() => false), '');
  assert.equal(elegirFormato(() => { throw new Error('sin MediaRecorder'); }), '');
  assert.equal(FORMATOS_GRABACION.length, 4);
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/audio-util.test.js`
Expected: falla al importar `plataforma/js/herramientas/audio-util.js`.

- [ ] **Step 3: Escribir `plataforma/js/herramientas/audio-util.js`**

```js
// plataforma/js/herramientas/audio-util.js
// Utilidades de audio puras que comparten el grabador y el secuenciador: mezcla a mono,
// remuestreo, WAV (PCM 16 bits mono) como ArrayBuffer, forma de onda y recorte.
// Funcionan igual en el navegador y en Node (no usan Web Audio).

export const FRECUENCIA_WAV = 22050;

/** Promedio de varios canales (Float32Array del mismo largo) en uno. */
export function mezclarAMono(canales) {
  if (!canales.length) return new Float32Array(0);
  const n = canales[0].length;
  const salida = new Float32Array(n);
  for (const canal of canales) {
    for (let i = 0; i < n; i += 1) salida[i] += canal[i] / canales.length;
  }
  return salida;
}

/** Cambia la frecuencia de muestreo por interpolación lineal. */
export function remuestrear(muestras, de, a) {
  if (de === a) return muestras;
  const n = Math.round((muestras.length * a) / de);
  const salida = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const pos = (i * de) / a;
    const j = Math.floor(pos);
    const t = pos - j;
    const actual = muestras[j] ?? 0;
    const siguiente = muestras[j + 1] ?? actual;
    salida[i] = actual * (1 - t) + siguiente * t;
  }
  return salida;
}

/** WAV PCM 16 bits mono. Recorta lo que se sale de [-1, 1]. */
export function codificarWav(muestras, frecuencia = FRECUENCIA_WAV) {
  const n = muestras.length;
  const buffer = new ArrayBuffer(44 + n * 2);
  const vista = new DataView(buffer);
  const texto = (pos, s) => { for (let i = 0; i < s.length; i += 1) vista.setUint8(pos + i, s.charCodeAt(i)); };
  texto(0, 'RIFF');
  vista.setUint32(4, 36 + n * 2, true);
  texto(8, 'WAVE');
  texto(12, 'fmt ');
  vista.setUint32(16, 16, true);
  vista.setUint16(20, 1, true); // PCM
  vista.setUint16(22, 1, true); // mono
  vista.setUint32(24, frecuencia, true);
  vista.setUint32(28, frecuencia * 2, true);
  vista.setUint16(32, 2, true);
  vista.setUint16(34, 16, true);
  texto(36, 'data');
  vista.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i += 1) {
    const m = Math.max(-1, Math.min(1, muestras[i]));
    vista.setInt16(44 + i * 2, Math.round(m * 32767), true);
  }
  return buffer;
}

/** Pico absoluto por columna, para dibujar la forma de onda. */
export function formaDeOnda(muestras, columnas) {
  const salida = new Float32Array(columnas);
  if (!muestras.length || columnas <= 0) return salida;
  const porColumna = muestras.length / columnas;
  for (let c = 0; c < columnas; c += 1) {
    const inicio = Math.floor(c * porColumna);
    const fin = Math.max(inicio + 1, Math.floor((c + 1) * porColumna));
    let pico = 0;
    for (let i = inicio; i < fin && i < muestras.length; i += 1) pico = Math.max(pico, Math.abs(muestras[i]));
    salida[c] = pico;
  }
  return salida;
}

/** Recorta entre dos tiempos en segundos (copia). */
export function recortar(muestras, frecuencia, inicioSeg, finSeg) {
  const inicio = Math.max(0, Math.round(inicioSeg * frecuencia));
  const fin = Math.min(muestras.length, Math.round(finSeg * frecuencia));
  return muestras.slice(inicio, Math.max(inicio, fin));
}

export const FORMATOS_GRABACION = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4'];

/** Primer formato de grabación que el navegador soporta; '' si ninguno (MediaRecorder elige). */
export function elegirFormato(soporta) {
  return FORMATOS_GRABACION.find((formato) => {
    try {
      return Boolean(soporta(formato));
    } catch {
      return false;
    }
  }) ?? '';
}
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/audio-util.test.js`
Expected: `# pass 6`.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/herramientas/audio-util.js tests/audio-util.test.js
git commit -m "Herramientas: utilidades de audio puras (mono, remuestreo, WAV, forma de onda, recorte, formato)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Patrón y síntesis del secuenciador

**Files:**
- Create: `plataforma/js/herramientas/secuencia.js`
- Create: `tests/secuencia.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/secuencia.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearPatron, alternar, fijarTempo, esVacio, duracionSegundos, frecuenciaDe, renderizar, PASOS, INSTRUMENTOS, GRADOS, TEMPO } from '../plataforma/js/herramientas/secuencia.js';

test('crearPatron deja dos compases de ocho pasos vacíos para cuatro instrumentos', () => {
  const patron = crearPatron();
  assert.equal(patron.tempo, TEMPO.defecto);
  assert.deepEqual(Object.keys(patron.pasos), INSTRUMENTOS);
  for (const instrumento of INSTRUMENTOS) assert.equal(patron.pasos[instrumento].length, PASOS);
  assert.ok(esVacio(patron));
  assert.equal(PASOS, 16);
});

test('alternar recorre los grados en círculo, la percusión se enciende y apaga, y lo inválido se ignora', () => {
  const patron = crearPatron();
  alternar(patron, 'melodia', 3);
  assert.equal(patron.pasos.melodia[3], 1);
  for (let i = 0; i < GRADOS; i += 1) alternar(patron, 'melodia', 3);
  assert.equal(patron.pasos.melodia[3], 0, 'después del quinto grado vuelve al silencio');
  alternar(patron, 'bajo', 0, -1);
  assert.equal(patron.pasos.bajo[0], GRADOS, 'hacia atrás desde el silencio llega al último grado');
  alternar(patron, 'percusion', 15);
  assert.equal(patron.pasos.percusion[15], true);
  alternar(patron, 'percusion', 15);
  assert.equal(patron.pasos.percusion[15], false);
  alternar(patron, 'violin', 0);
  alternar(patron, 'bajo', 16);
  alternar(patron, 'bajo', -1);
  assert.deepEqual(patron.pasos.bajo.slice(1), Array(15).fill(0));
  assert.ok(!esVacio(patron));
});

test('fijarTempo acota entre 80 y 160 y vuelve al tempo por defecto si no es un número', () => {
  const patron = crearPatron();
  assert.equal(fijarTempo(patron, 300).tempo, 160);
  assert.equal(fijarTempo(patron, 10).tempo, 80);
  assert.equal(fijarTempo(patron, '120.4').tempo, 120);
  assert.equal(fijarTempo(patron, 'rápido').tempo, TEMPO.defecto);
  assert.ok(Math.abs(duracionSegundos(fijarTempo(patron, 120)) - 4) < 1e-9, 'a 120 los dos compases duran 4 segundos');
});

test('frecuenciaDe sigue la pentatónica mayor y sube de octava', () => {
  assert.ok(Math.abs(frecuenciaDe('melodia', 1) - 220) < 1e-9);
  assert.ok(Math.abs(frecuenciaDe('melodia', 2) - 220 * 2 ** (2 / 12)) < 1e-9);
  assert.ok(Math.abs(frecuenciaDe('melodia', 6) - 440) < 1e-9, 'el sexto grado es la base una octava arriba');
  assert.ok(frecuenciaDe('bajo', 1) < frecuenciaDe('acorde', 1) && frecuenciaDe('acorde', 1) < frecuenciaDe('melodia', 1));
});

test('renderizar produce las muestras justas, silencio con el patrón vacío, sonido con notas y siempre lo mismo', () => {
  const vacio = crearPatron(120);
  const silencio = renderizar(vacio, 22050);
  assert.equal(silencio.length, Math.round(0.25 * 22050) * 16, 'dieciséis pasos de un cuarto de segundo, cada uno redondeado a muestras enteras');
  assert.ok(silencio.every((v) => v === 0));
  const patron = crearPatron(120);
  alternar(patron, 'bajo', 0);
  alternar(patron, 'melodia', 4);
  alternar(patron, 'acorde', 8);
  alternar(patron, 'percusion', 12);
  const a = renderizar(patron, 22050);
  const b = renderizar(patron, 22050);
  assert.deepEqual(a, b, 'determinista');
  let pico = 0;
  for (const v of a) pico = Math.max(pico, Math.abs(v));
  assert.ok(pico > 0.1 && pico <= 1);
  const largoPaso = Math.round(22050 * 0.25);
  const energia = (desde, hasta) => { let s = 0; for (let i = desde; i < hasta; i += 1) s += Math.abs(a[i]); return s; };
  assert.ok(energia(0, largoPaso) > 0, 'el bajo suena en el primer paso');
  assert.equal(energia(largoPaso * 2, largoPaso * 4), 0, 'los pasos 3 y 4 están en silencio');
  assert.ok(energia(largoPaso * 12, largoPaso * 13) > 0, 'la percusión suena en el paso 13');
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/secuencia.test.js`
Expected: falla al importar `plataforma/js/herramientas/secuencia.js`.

- [ ] **Step 3: Escribir `plataforma/js/herramientas/secuencia.js`**

```js
// plataforma/js/herramientas/secuencia.js
// El patrón del secuenciador (spec, sección 9) y su render a muestras: dos compases de
// ocho pasos, cuatro instrumentos sintetizados (bajo, melodía, acorde, percusión),
// tempo entre 80 y 160 y escala pentatónica. Puro: lo que se oye en el editor y lo que
// se guarda en WAV sale de renderizar(), sin Web Audio.

export const PASOS = 16;
export const INSTRUMENTOS = ['bajo', 'melodia', 'acorde', 'percusion'];
export const NOMBRES_INSTRUMENTO = { bajo: 'Bajo', melodia: 'Melodía', acorde: 'Acorde', percusion: 'Percusión' };
export const GRADOS = 5; // grados de la pentatónica por paso: 0 es silencio, 1 a 5 suben
export const TEMPO = { min: 80, max: 160, defecto: 110 };
const PENTATONICA = [0, 2, 4, 7, 9]; // semitonos sobre la base (pentatónica mayor)
const BASE = { bajo: 55, melodia: 220, acorde: 110 };

export function crearPatron(tempo = TEMPO.defecto) {
  return {
    tempo,
    pasos: {
      bajo: Array(PASOS).fill(0),
      melodia: Array(PASOS).fill(0),
      acorde: Array(PASOS).fill(0),
      percusion: Array(PASOS).fill(false),
    },
  };
}

/** Para bajo, melodía y acorde recorre 0 → 1 → … → 5 → 0 (o al revés con direccion -1); la percusión se enciende y apaga. */
export function alternar(patron, instrumento, paso, direccion = 1) {
  if (!INSTRUMENTOS.includes(instrumento) || !Number.isInteger(paso) || paso < 0 || paso >= PASOS) return patron;
  if (instrumento === 'percusion') {
    patron.pasos.percusion[paso] = !patron.pasos.percusion[paso];
    return patron;
  }
  const ciclo = GRADOS + 1;
  patron.pasos[instrumento][paso] = (((patron.pasos[instrumento][paso] + direccion) % ciclo) + ciclo) % ciclo;
  return patron;
}

export function fijarTempo(patron, tempo) {
  const numero = Math.round(Number(tempo));
  patron.tempo = Number.isFinite(numero) ? Math.min(TEMPO.max, Math.max(TEMPO.min, numero)) : TEMPO.defecto;
  return patron;
}

export function esVacio(patron) {
  return INSTRUMENTOS.every((instrumento) => patron.pasos[instrumento].every((valor) => !valor));
}

export const duracionPaso = (patron) => 60 / patron.tempo / 2;
export const duracionSegundos = (patron) => duracionPaso(patron) * PASOS;

/** Frecuencia del grado (1 a 5 y más, por octavas) de un instrumento. */
export function frecuenciaDe(instrumento, grado) {
  const g = grado - 1;
  const octava = Math.floor(g / PENTATONICA.length);
  const semitonos = PENTATONICA[g % PENTATONICA.length] + 12 * octava;
  return BASE[instrumento] * 2 ** (semitonos / 12);
}

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

/** Dos compases a la frecuencia dada. Determinista: el mismo patrón da las mismas muestras. */
export function renderizar(patron, frecuencia = 22050) {
  const paso = duracionPaso(patron);
  const largoPaso = Math.round(paso * frecuencia);
  const total = largoPaso * PASOS;
  const salida = new Float32Array(total);
  const r = azar(7);

  const sumar = (inicio, duracion, fn) => {
    const n = Math.min(Math.round(duracion * frecuencia), total - inicio);
    for (let i = 0; i < n; i += 1) salida[inicio + i] += fn(i / frecuencia, i / n);
  };
  const ataque = (t) => Math.min(1, t / 0.008);

  for (let i = 0; i < PASOS; i += 1) {
    const inicio = i * largoPaso;
    const bajo = patron.pasos.bajo[i];
    if (bajo) {
      const f = frecuenciaDe('bajo', bajo);
      sumar(inicio, paso * 1.9, (t, p) => (4 * Math.abs(((t * f) % 1) - 0.5) - 1) * ataque(t) * Math.exp(-p * 2.5) * 0.28);
    }
    const melodia = patron.pasos.melodia[i];
    if (melodia) {
      const f = frecuenciaDe('melodia', melodia);
      sumar(inicio, paso * 0.95, (t, p) => (((t * f) % 1 < 0.5 ? 1 : -1) * 0.55 + Math.sin(2 * Math.PI * f * t) * 0.45) * ataque(t) * Math.exp(-p * 3) * 0.2);
    }
    const acorde = patron.pasos.acorde[i];
    if (acorde) {
      const notas = [acorde, acorde + 2, acorde + 4].map((g) => frecuenciaDe('acorde', g));
      sumar(inicio, paso * 1.9, (t, p) => notas.reduce((s, f) => s + Math.sin(2 * Math.PI * f * t), 0) / 3 * ataque(t) * Math.exp(-p * 1.8) * 0.18);
    }
    if (patron.pasos.percusion[i]) {
      sumar(inicio, Math.min(paso, 0.18), (t, p) => ((r() * 2 - 1) * 0.35 + Math.sin(2 * Math.PI * 70 * t) * 0.5) * Math.exp(-p * 6));
    }
  }
  for (let i = 0; i < total; i += 1) salida[i] = Math.max(-1, Math.min(1, salida[i]));
  return salida;
}
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/secuencia.test.js`
Expected: `# pass 5`.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/herramientas/secuencia.js tests/secuencia.test.js
git commit -m "Secuenciador: patrón de dos compases, cuatro instrumentos, pentatónica y render determinista" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Lienzo del pixel art

**Files:**
- Create: `plataforma/js/herramientas/pixel.js`
- Create: `tests/pixel.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/pixel.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TAMANOS, TRANSPARENTE, crearLienzo, pintar, borrar, rellenar, tomar, linea, crearHistorial, aRgba, desdeRgba, hexARgb } from '../plataforma/js/herramientas/pixel.js';

const PALETA = ['#000000', '#ff0000', '#00ff00', '#0000ff'];

test('el lienzo nace transparente y el lápiz, el borrador y el cuentagotas trabajan por celda', () => {
  const l = crearLienzo(4, 3);
  assert.equal(l.celdas.length, 12);
  assert.ok(l.celdas.every((c) => c === TRANSPARENTE));
  assert.equal(pintar(l, 1, 2, 2), true);
  assert.equal(tomar(l, 1, 2), 2);
  assert.equal(pintar(l, 1, 2, 2), false, 'pintar lo mismo no cambia nada');
  assert.equal(pintar(l, 9, 9, 1), false, 'fuera del lienzo no pinta');
  assert.equal(pintar(l, 1.5, 0, 1), false, 'solo celdas enteras');
  assert.equal(tomar(l, -1, 0), TRANSPARENTE);
  assert.equal(borrar(l, 1, 2), true);
  assert.equal(tomar(l, 1, 2), TRANSPARENTE);
  assert.deepEqual(TAMANOS, { retrato: { ancho: 64, alto: 64 }, fondo: { ancho: 192, alto: 108 } });
  assert.deepEqual(hexARgb('#ff8000'), [255, 128, 0]);
});

test('rellenar cubre la zona contigua del mismo color sin cruzar otros colores', () => {
  const l = crearLienzo(5, 5);
  for (let y = 0; y < 5; y += 1) pintar(l, 2, y, 1); // una pared vertical roja
  assert.equal(rellenar(l, 0, 0, 3), true);
  assert.equal(tomar(l, 1, 4), 3, 'todo el lado izquierdo');
  assert.equal(tomar(l, 3, 0), TRANSPARENTE, 'el lado derecho no');
  assert.equal(tomar(l, 2, 2), 1, 'la pared sigue');
  assert.equal(rellenar(l, 0, 0, 3), false, 'rellenar con el mismo color no cambia nada');
  assert.equal(rellenar(l, 7, 7, 3), false);
});

test('linea une dos celdas sin huecos, en diagonal y hacia atrás', () => {
  const l = crearLienzo(8, 8);
  assert.equal(linea(l, 0, 0, 7, 3, 1), true);
  for (let x = 0; x < 8; x += 1) assert.ok([0, 1, 2, 3].some((y) => tomar(l, x, y) === 1), `columna ${x} pintada`);
  const l2 = crearLienzo(8, 8);
  linea(l2, 7, 7, 0, 0, 2);
  assert.equal(tomar(l2, 0, 0), 2);
  assert.equal(tomar(l2, 7, 7), 2);
  assert.equal(tomar(l2, 4, 4), 2);
  assert.equal(linea(l2, 0, 0, 0, 0, 2), false, 'un punto ya pintado no cambia');
});

test('el historial deshace y rehace hasta veinte pasos y olvida un registro vacío', () => {
  const l = crearLienzo(2, 2);
  const h = crearHistorial(l, 3);
  assert.equal(h.puedeDeshacer, false);
  h.registrar(); pintar(l, 0, 0, 1);
  h.registrar(); pintar(l, 1, 0, 2);
  h.registrar(); pintar(l, 0, 1, 3);
  h.registrar(); pintar(l, 1, 1, 1);
  assert.ok(h.deshacer());
  assert.equal(tomar(l, 1, 1), TRANSPARENTE);
  assert.ok(h.puedeRehacer);
  assert.ok(h.rehacer());
  assert.equal(tomar(l, 1, 1), 1);
  assert.ok(h.deshacer() && h.deshacer() && h.deshacer());
  assert.equal(h.deshacer(), false, 'el límite de tres dejó fuera el primer paso');
  assert.equal(tomar(l, 0, 0), 1, 'el primer trazo ya no se puede deshacer');
  h.registrar();
  h.olvidar();
  assert.equal(h.puedeDeshacer, false, 'un registro sin trazo se descarta');
  assert.equal(h.puedeRehacer, false, 'registrar borra lo rehacible');
  const grande = crearLienzo(1, 1);
  const hg = crearHistorial(grande);
  for (let i = 0; i < 25; i += 1) { hg.registrar(); pintar(grande, 0, 0, i % 4); }
  let pasos = 0;
  while (hg.deshacer()) pasos += 1;
  assert.equal(pasos, 20);
});

test('aRgba y desdeRgba van y vuelven: colores exactos, aproximados al más cercano y transparencia', () => {
  const l = crearLienzo(2, 2);
  pintar(l, 0, 0, 1);
  pintar(l, 1, 1, 3);
  const rgba = aRgba(l, PALETA);
  assert.deepEqual([...rgba.slice(0, 4)], [255, 0, 0, 255]);
  assert.deepEqual([...rgba.slice(4, 8)], [0, 0, 0, 0], 'transparente');
  assert.deepEqual([...rgba.slice(12, 16)], [0, 0, 255, 255]);
  const vuelta = desdeRgba(rgba, 2, 2, PALETA);
  assert.deepEqual([...vuelta.celdas], [...l.celdas]);
  const aproximado = desdeRgba(new Uint8ClampedArray([250, 10, 10, 255, 20, 20, 20, 255, 0, 200, 0, 100, 0, 0, 0, 0]), 2, 2, PALETA);
  assert.deepEqual([...aproximado.celdas], [1, 0, TRANSPARENTE, TRANSPARENTE], 'casi rojo → rojo; casi negro → negro; alfa baja → transparente');
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/pixel.test.js`
Expected: falla al importar `plataforma/js/herramientas/pixel.js`.

- [ ] **Step 3: Escribir `plataforma/js/herramientas/pixel.js`**

```js
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
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/pixel.test.js`
Expected: `# pass 5`.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/herramientas/pixel.js tests/pixel.test.js
git commit -m "Pixel art: lienzo de índices con lápiz, borrador, relleno, cuentagotas, línea e historial" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Vista del pixel art

**Files:**
- Create: `plataforma/js/herramientas/pixelart.js`
- Create: `tests/pixelart.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/pixelart.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { instalarDom, clic, teclear, escribir } from './ayudas/dom.js';
import { png, medidasPng } from '../scripts/png-wav.js';
import { crearPixelArt, HERRAMIENTAS, ZOOMS } from '../plataforma/js/herramientas/pixelart.js';

instalarDom();
const paleta = JSON.parse(readFileSync(new URL('../plataforma/contenido/paleta.json', import.meta.url), 'utf8')).colores;
const rojo = paleta.findIndex((c) => c.nombre === 'rojo');
const cielo = paleta.findIndex((c) => c.nombre === 'cielo');
const tick = () => new Promise((r) => setTimeout(r, 0));

function armar(extra = {}) {
  const codificadas = [];
  const contenedor = document.createElement('div');
  contenedor.hidden = true;
  document.body.append(contenedor);
  const herramienta = crearPixelArt(contenedor, {
    paleta,
    crearContexto: () => null,
    codificarPng: async (rgba, ancho, alto) => { codificadas.push({ rgba, ancho, alto }); return new Blob([png(ancho, alto, new Uint8Array(rgba.buffer))], { type: 'image/png' }); },
    decodificarPng: async () => { throw new Error('sin decodificador'); },
    ...extra,
  });
  const q = (s) => contenedor.querySelector(s);
  const canvas = () => q('canvas.pixel-lienzo');
  const zoomActual = () => Number(q('[data-accion="zoom"]').value);
  const puntero = (tipo, x, y) => canvas().dispatchEvent(new window.MouseEvent(tipo, { clientX: x * zoomActual(), clientY: y * zoomActual(), bubbles: true }));
  const pixel = (rgba, ancho, x, y) => [...rgba.slice((y * ancho + x) * 4, (y * ancho + x) * 4 + 4)];
  return { contenedor, herramienta, codificadas, q, canvas, puntero, pixel };
}

test('abrir muestra el lienzo del tamaño del tipo, los dieciséis colores y las cuatro herramientas', async () => {
  const { contenedor, herramienta, q, canvas } = armar();
  const pendiente = herramienta.abrir({ tipo: 'retrato' });
  await tick();
  assert.equal(contenedor.hidden, false);
  assert.equal(q('#pixelart-titulo').textContent, 'Pixel art: retrato');
  assert.equal(canvas().width, 64 * 6);
  assert.equal(canvas().height, 64 * 6);
  assert.equal(contenedor.querySelectorAll('.pixel-color').length, 16);
  assert.equal(q('.pixel-color[aria-pressed="true"]').dataset.color, '0');
  assert.deepEqual([...contenedor.querySelectorAll('[data-herramienta]')].map((b) => b.textContent), Object.values(HERRAMIENTAS));
  assert.equal(q('[data-herramienta="lapiz"]').getAttribute('aria-pressed'), 'true');
  assert.equal(q('[data-accion="deshacer"]').disabled, true);
  assert.equal(document.activeElement, canvas());
  assert.deepEqual(ZOOMS, [2, 4, 6, 8]);
  clic(q('[data-accion="cancelar"]'));
  assert.equal(await pendiente, null);
  assert.equal(contenedor.hidden, true);
  const fondo = herramienta.abrir({ tipo: 'fondo' });
  await tick();
  assert.equal(canvas().width, 192 * 4);
  assert.equal(q('#pixelart-titulo').textContent, 'Pixel art: fondo');
  teclear(q('.pixelart'), 'Escape');
  assert.equal(await fondo, null);
});

test('el lápiz pinta con el color elegido, deshacer y rehacer funcionan y guardar entrega el PNG', async () => {
  const { herramienta, codificadas, q, puntero, pixel } = armar();
  const pendiente = herramienta.abrir({ tipo: 'retrato' });
  await tick();
  puntero('pointerdown', 3, 4);
  puntero('pointerup', 3, 4);
  clic(q(`.pixel-color[data-color="${rojo}"]`));
  assert.equal(q('.pixel-color[aria-pressed="true"]').dataset.color, String(rojo));
  puntero('pointerdown', 10, 10);
  puntero('pointerup', 10, 10);
  assert.equal(q('[data-accion="deshacer"]').disabled, false);
  clic(q('[data-accion="deshacer"]'));
  assert.equal(q('[data-accion="rehacer"]').disabled, false);
  clic(q('[data-accion="rehacer"]'));
  clic(q('[data-accion="guardar"]'));
  const blob = await pendiente;
  assert.equal(blob.type, 'image/png');
  assert.deepEqual(medidasPng(new Uint8Array(await blob.arrayBuffer())), { ancho: 64, alto: 64 });
  const { rgba } = codificadas[0];
  assert.deepEqual(pixel(rgba, 64, 3, 4), [27, 31, 42, 255], 'noche (color 0)');
  assert.deepEqual(pixel(rgba, 64, 10, 10), [201, 42, 42, 255], 'rojo');
  assert.deepEqual(pixel(rgba, 64, 0, 0), [0, 0, 0, 0], 'transparente');
});

test('arrastrar pinta una línea sin huecos; el borrador borra; el relleno llena; el cuentagotas toma el color', async () => {
  const { herramienta, codificadas, q, puntero, pixel } = armar();
  const pendiente = herramienta.abrir({ tipo: 'retrato' });
  await tick();
  clic(q(`.pixel-color[data-color="${cielo}"]`));
  puntero('pointerdown', 0, 0);
  puntero('pointermove', 5, 0);
  puntero('pointerup', 5, 0);
  clic(q('[data-herramienta="borrador"]'));
  assert.equal(q('[data-herramienta="borrador"]').getAttribute('aria-pressed'), 'true');
  assert.equal(q('[data-herramienta="lapiz"]').getAttribute('aria-pressed'), 'false');
  puntero('pointerdown', 2, 0);
  puntero('pointerup', 2, 0);
  clic(q('[data-herramienta="cuentagotas"]'));
  clic(q(`.pixel-color[data-color="${rojo}"]`));
  puntero('pointerdown', 1, 0);
  puntero('pointerup', 1, 0);
  assert.equal(q('.pixel-color[aria-pressed="true"]').dataset.color, String(cielo), 'el cuentagotas tomó el cielo');
  clic(q('[data-herramienta="relleno"]'));
  clic(q(`.pixel-color[data-color="${rojo}"]`));
  puntero('pointerdown', 30, 30);
  puntero('pointerup', 30, 30);
  clic(q('[data-accion="guardar"]'));
  await pendiente;
  const { rgba } = codificadas[0];
  for (const x of [0, 1, 3, 4, 5]) assert.deepEqual(pixel(rgba, 64, x, 0), [76, 201, 240, 255], `celda ${x} celeste`);
  assert.deepEqual(pixel(rgba, 64, 2, 0), [201, 42, 42, 255], 'la celda borrada la llenó el relleno rojo');
  assert.deepEqual(pixel(rgba, 64, 30, 30), [201, 42, 42, 255]);
  assert.deepEqual(pixel(rgba, 64, 0, 1), [201, 42, 42, 255], 'el relleno cubre todo lo transparente conectado');
});

test('con el teclado las flechas mueven el cursor y Enter pinta; Escape cancela', async () => {
  const { contenedor, herramienta, codificadas, q, canvas, pixel } = armar();
  const pendiente = herramienta.abrir({ tipo: 'retrato' });
  await tick();
  teclear(canvas(), 'ArrowLeft');
  teclear(canvas(), 'ArrowUp');
  teclear(canvas(), 'Enter');
  assert.equal(q('[data-accion="deshacer"]').disabled, false);
  clic(q('[data-accion="guardar"]'));
  await pendiente;
  assert.deepEqual(pixel(codificadas[0].rgba, 64, 31, 31), [27, 31, 42, 255], 'desde el centro (32, 32), una a la izquierda y una arriba');
  const segunda = herramienta.abrir({ tipo: 'retrato' });
  await tick();
  teclear(q('.pixelart'), 'Escape');
  assert.equal(await segunda, null);
  assert.equal(contenedor.childNodes.length, 0);
});

test('reabrir con un archivo carga sus píxeles aproximados a la paleta; si no se puede leer, empieza en blanco', async () => {
  const rgba = new Uint8ClampedArray(64 * 64 * 4);
  rgba.set([250, 40, 40, 255], (5 * 64 + 7) * 4);
  rgba.set([70, 200, 240, 255], (6 * 64 + 7) * 4);
  const { herramienta, codificadas, q } = armar({ decodificarPng: async (archivo, ancho, alto) => { assert.equal(ancho, 64); assert.equal(alto, 64); assert.equal(archivo.tipo, 'image/png'); return rgba; } });
  const pendiente = herramienta.abrir({ tipo: 'retrato', archivo: { tipo: 'image/png', datos: new ArrayBuffer(4) } });
  await tick();
  clic(q('[data-accion="guardar"]'));
  await pendiente;
  const salida = codificadas[0].rgba;
  assert.deepEqual([...salida.slice((5 * 64 + 7) * 4, (5 * 64 + 7) * 4 + 4)], [201, 42, 42, 255], 'casi rojo → rojo de la paleta');
  assert.deepEqual([...salida.slice((6 * 64 + 7) * 4, (6 * 64 + 7) * 4 + 4)], [76, 201, 240, 255], 'casi celeste → cielo');
  const roto = armar();
  const otra = roto.herramienta.abrir({ tipo: 'retrato', archivo: { tipo: 'image/png', datos: new ArrayBuffer(1) } });
  await tick();
  clic(roto.q('[data-accion="guardar"]'));
  await otra;
  assert.ok(roto.codificadas[0].rgba.every((v) => v === 0), 'en blanco');
});

test('un trazo que no cambia nada no apila historial; el zoom cambia el tamaño del canvas', async () => {
  const { herramienta, q, canvas, puntero } = armar();
  const pendiente = herramienta.abrir({ tipo: 'retrato' });
  await tick();
  puntero('pointerdown', 1, 1);
  puntero('pointerup', 1, 1);
  puntero('pointerdown', 1, 1);
  puntero('pointerup', 1, 1);
  clic(q('[data-accion="deshacer"]'));
  assert.equal(q('[data-accion="deshacer"]').disabled, true, 'solo había un paso real');
  escribir(q('[data-accion="zoom"]'), '8');
  assert.equal(canvas().width, 64 * 8);
  clic(q('[data-accion="cancelar"]'));
  assert.equal(await pendiente, null);
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/pixelart.test.js`
Expected: falla al importar `plataforma/js/herramientas/pixelart.js`.

- [ ] **Step 3: Escribir `plataforma/js/herramientas/pixelart.js`**

```js
// plataforma/js/herramientas/pixelart.js
// La herramienta de pixel art (spec, sección 9): lienzo fijo (retratos de 64×64, fondos
// de 192×108), paleta de dieciséis colores, lápiz, borrador, relleno, cuentagotas,
// deshacer y rehacer, zoom. Produce un PNG. El lienzo es herramientas/pixel.js; aquí
// solo se dibuja y se maneja la entrada. El canvas y la codificación se inyectan para
// poder probar sin navegador.
import { h, vaciar } from '../ui/dom.js';
import { TAMANOS, TRANSPARENTE, crearLienzo, pintar, borrar, rellenar, tomar, linea, crearHistorial, aRgba, desdeRgba } from './pixel.js';

export const HERRAMIENTAS = { lapiz: 'Lápiz', borrador: 'Borrador', relleno: 'Relleno', cuentagotas: 'Cuentagotas' };
export const ZOOMS = [2, 4, 6, 8];

/** PNG desde píxeles RGBA con el canvas del navegador. */
export async function codificarPngConCanvas(rgba, ancho, alto) {
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  canvas.getContext('2d').putImageData(new ImageData(rgba, ancho, alto), 0, 0);
  return new Promise((resolver, rechazar) => canvas.toBlob((blob) => (blob ? resolver(blob) : rechazar(new Error('No se pudo codificar el PNG.'))), 'image/png'));
}

/** Píxeles RGBA de una imagen ({ tipo, datos } o Blob), ajustada al tamaño del lienzo sin suavizado. */
export async function decodificarPngConCanvas(archivo, ancho, alto) {
  const blob = archivo instanceof Blob ? archivo : new Blob([archivo.datos], { type: archivo.tipo });
  const imagen = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(imagen, 0, 0, ancho, alto);
  return ctx.getImageData(0, 0, ancho, alto).data;
}

/**
 * @param {HTMLElement} contenedor capa oculta hasta abrir()
 * @param {{ paleta: Array<{ nombre: string, hex: string }>, crearContexto?, codificarPng?, decodificarPng? }} deps
 */
export function crearPixelArt(contenedor, {
  paleta,
  crearContexto = (canvas) => canvas.getContext('2d'),
  codificarPng = codificarPngConCanvas,
  decodificarPng = decodificarPngConCanvas,
}) {
  const hexes = paleta.map((c) => c.hex);
  let cerrarActual = null;

  /**
   * @param {{ tipo?: 'retrato'|'fondo', archivo?: { tipo, datos }|Blob|null }} opciones
   * @returns {Promise<Blob|null>} el PNG al guardar, null al cancelar
   */
  function abrir({ tipo = 'retrato', archivo = null } = {}) {
    cerrarActual?.(null);
    return new Promise((resolver) => {
      preparar({ tipo, archivo }, resolver).catch((error) => {
        vaciar(contenedor);
        contenedor.hidden = true;
        resolver(null);
        throw error;
      });
    });
  }

  async function preparar({ tipo, archivo }, resolver) {
    const { ancho, alto } = TAMANOS[tipo] ?? TAMANOS.retrato;
    let lienzo = crearLienzo(ancho, alto);
    if (archivo) {
      try {
        lienzo = desdeRgba(await decodificarPng(archivo, ancho, alto), ancho, alto, hexes);
      } catch {
        lienzo = crearLienzo(ancho, alto); // si la imagen no se puede leer, se empieza en blanco
      }
    }
    const historial = crearHistorial(lienzo);
    let herramienta = 'lapiz';
    let color = 0;
    let zoom = tipo === 'fondo' ? 4 : 6;
    let cursor = { x: Math.floor(ancho / 2), y: Math.floor(alto / 2) };
    let trazo = null;

    const oculto = h('canvas', { width: ancho, height: alto });
    const ctxOculto = crearContexto(oculto);
    const canvas = h('canvas', {
      class: 'pixel-lienzo',
      width: ancho * zoom,
      height: alto * zoom,
      tabIndex: 0,
      role: 'img',
      'aria-label': `Lienzo de ${ancho} por ${alto} píxeles. Flechas para mover el cursor, Enter para pintar.`,
      onpointerdown: (e) => { canvas.focus(); const celda = celdaDe(e); cursor = celda; empezarTrazo(celda.x, celda.y); },
      onpointermove: (e) => { if (!trazo) return; const celda = celdaDe(e); cursor = celda; seguirTrazo(celda.x, celda.y); },
      onpointerup: terminarTrazo,
      onpointerleave: terminarTrazo,
      onkeydown: alTeclear,
    });
    const ctx = crearContexto(canvas);

    const celdaDe = (e) => {
      const rect = canvas.getBoundingClientRect();
      return { x: Math.floor((e.clientX - rect.left) / zoom), y: Math.floor((e.clientY - rect.top) / zoom) };
    };

    function aplicar(x, y) {
      switch (herramienta) {
        case 'lapiz': return trazo?.ultimo ? linea(lienzo, trazo.ultimo.x, trazo.ultimo.y, x, y, color) : pintar(lienzo, x, y, color);
        case 'borrador': return trazo?.ultimo ? linea(lienzo, trazo.ultimo.x, trazo.ultimo.y, x, y, TRANSPARENTE) : borrar(lienzo, x, y);
        case 'relleno': return rellenar(lienzo, x, y, color);
        case 'cuentagotas': {
          const tomado = tomar(lienzo, x, y);
          if (tomado !== TRANSPARENTE) { color = tomado; pintarPaleta(); }
          return false;
        }
        default: return false;
      }
    }
    function empezarTrazo(x, y) {
      historial.registrar();
      trazo = { ultimo: null, cambio: false };
      if (aplicar(x, y)) trazo.cambio = true;
      trazo.ultimo = { x, y };
      pintarTodo();
    }
    function seguirTrazo(x, y) {
      if (!trazo || (herramienta !== 'lapiz' && herramienta !== 'borrador')) return;
      if (aplicar(x, y)) trazo.cambio = true;
      trazo.ultimo = { x, y };
      pintarTodo();
    }
    function terminarTrazo() {
      if (!trazo) return;
      if (!trazo.cambio) historial.olvidar();
      trazo = null;
      actualizarBotones();
    }
    function alTeclear(e) {
      const mover = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (mover) {
        e.preventDefault();
        cursor = { x: Math.max(0, Math.min(ancho - 1, cursor.x + mover[0])), y: Math.max(0, Math.min(alto - 1, cursor.y + mover[1])) };
        pintarTodo();
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        empezarTrazo(cursor.x, cursor.y);
        terminarTrazo();
      }
    }

    // ---- dibujo ----
    function pintarTodo() {
      if (!ctx || !ctxOculto) return;
      ctxOculto.putImageData(new ImageData(aRgba(lienzo, hexes), ancho, alto), 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#d9d2c3';
      ctx.fillRect(0, 0, ancho * zoom, alto * zoom);
      ctx.fillStyle = '#ebe5d7';
      for (let y = 0; y < alto; y += 4) for (let x = (y / 4) % 2 ? 4 : 0; x < ancho; x += 8) ctx.fillRect(x * zoom, y * zoom, 4 * zoom, 4 * zoom);
      ctx.drawImage(oculto, 0, 0, ancho * zoom, alto * zoom);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(cursor.x * zoom + 0.5, cursor.y * zoom + 0.5, zoom - 1, zoom - 1);
    }
    function cambiarZoom(nuevo) {
      zoom = nuevo;
      canvas.width = ancho * zoom;
      canvas.height = alto * zoom;
      pintarTodo();
    }

    // ---- controles ----
    const botonesHerramienta = Object.entries(HERRAMIENTAS).map(([clave, texto]) => h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { herramienta: clave }, 'aria-pressed': clave === herramienta ? 'true' : 'false', onclick: () => { herramienta = clave; for (const b of botonesHerramienta) b.setAttribute('aria-pressed', b.dataset.herramienta === clave ? 'true' : 'false'); } }, texto));
    const zonaPaleta = h('div', { class: 'pixel-paleta', role: 'group', 'aria-label': 'Paleta' });
    function pintarPaleta() {
      vaciar(zonaPaleta).append(...paleta.map((c, i) => h('button', { type: 'button', class: 'pixel-color', style: `background:${c.hex}`, title: c.nombre, 'aria-label': `Color ${c.nombre}`, 'aria-pressed': i === color ? 'true' : 'false', dataset: { color: String(i) }, onclick: () => { color = i; pintarPaleta(); } })));
    }
    const botonDeshacer = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'deshacer' }, onclick: () => { if (historial.deshacer()) { pintarTodo(); actualizarBotones(); } } }, 'Deshacer');
    const botonRehacer = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'rehacer' }, onclick: () => { if (historial.rehacer()) { pintarTodo(); actualizarBotones(); } } }, 'Rehacer');
    function actualizarBotones() {
      botonDeshacer.disabled = !historial.puedeDeshacer;
      botonRehacer.disabled = !historial.puedeRehacer;
    }
    const selectorZoom = h('select', { 'aria-label': 'Zoom', dataset: { accion: 'zoom' }, onchange: (e) => cambiarZoom(Number(e.target.value)) }, ZOOMS.map((z) => h('option', { value: String(z) }, `${z}×`)));
    selectorZoom.value = String(zoom);

    function cerrar(valor) {
      cerrarActual = null;
      vaciar(contenedor);
      contenedor.hidden = true;
      resolver(valor);
    }
    cerrarActual = cerrar;
    async function guardar() {
      const blob = await codificarPng(aRgba(lienzo, hexes), ancho, alto);
      cerrar(blob);
    }

    contenedor.hidden = false;
    vaciar(contenedor).append(h('div', { class: 'herramienta pixelart', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pixelart-titulo', onkeydown: (e) => { if (e.key === 'Escape') cerrar(null); } },
      h('div', { class: 'mapa-cabecera' },
        h('div', {}, h('h2', { id: 'pixelart-titulo' }, tipo === 'fondo' ? 'Pixel art: fondo' : 'Pixel art: retrato'), h('p', { class: 'mapa-resumen' }, `${ancho} × ${alto} píxeles, dieciséis colores. Lo que dibujes entra al juego como obra tuya, con sello de fecha.`)),
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'cancelar' }, onclick: () => cerrar(null) }, 'Cancelar')),
      h('div', { class: 'pixel-barra' }, h('div', { class: 'pixel-herramientas', role: 'group', 'aria-label': 'Herramienta' }, botonesHerramienta), botonDeshacer, botonRehacer, h('label', { class: 'pixel-zoom' }, 'Zoom ', selectorZoom)),
      zonaPaleta,
      h('div', { class: 'pixel-marco' }, canvas),
      h('div', { class: 'acciones' }, h('button', { type: 'button', class: 'btn btn-primary', dataset: { accion: 'guardar' }, onclick: guardar }, 'Guardar'), h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => cerrar(null) }, 'Cancelar'))));
    pintarPaleta();
    actualizarBotones();
    pintarTodo();
    canvas.focus();
  }

  return { abrir };
}
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/pixelart.test.js`
Expected: `# pass 6`.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/herramientas/pixelart.js tests/pixelart.test.js
git commit -m "Pixel art: vista con canvas, paleta, herramientas, historial, zoom, teclado y PNG" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Vista del secuenciador

**Files:**
- Create: `plataforma/js/herramientas/secuenciador.js`
- Create: `tests/secuenciador.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/secuenciador.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instalarDom, clic, teclear, escribir } from './ayudas/dom.js';
import { cabeceraWav } from '../scripts/png-wav.js';
import { crearSecuenciador } from '../plataforma/js/herramientas/secuenciador.js';

instalarDom();

function audioFalso() {
  const registro = [];
  const contexto = {
    destination: {},
    createBuffer: (canales, largo, frecuencia) => ({ canales, largo, frecuencia, datos: null, copyToChannel(muestras) { this.datos = muestras; } }),
    createBufferSource() {
      const fuente = { buffer: null, loop: false, connect: () => registro.push('connect'), start: () => registro.push(['start', fuente.buffer.largo, fuente.buffer.frecuencia, fuente.loop]), stop: () => registro.push('stop'), disconnect: () => {} };
      return fuente;
    },
    resume: async () => {},
    close: async () => { registro.push('close'); },
  };
  return { contexto, registro };
}

function armar() {
  const { contexto, registro } = audioFalso();
  let contextos = 0;
  const contenedor = document.createElement('div');
  contenedor.hidden = true;
  document.body.append(contenedor);
  const herramienta = crearSecuenciador(contenedor, { crearAudioContext: () => { contextos += 1; return contexto; } });
  const q = (s) => contenedor.querySelector(s);
  const celda = (instrumento, paso) => q(`button[data-instrumento="${instrumento}"][data-paso="${paso}"]`);
  return { contenedor, herramienta, registro, contextos: () => contextos, q, celda };
}

test('abrir dibuja cuatro filas de dieciséis pasos, el tempo por defecto y Guardar deshabilitado; Cancelar devuelve null', async () => {
  const { contenedor, herramienta, q, celda } = armar();
  const pendiente = herramienta.abrir();
  assert.equal(contenedor.hidden, false);
  assert.equal(contenedor.querySelectorAll('.secuenciador-fila').length, 4);
  assert.equal(contenedor.querySelectorAll('button.paso').length, 64);
  assert.equal(celda('melodia', 0).textContent, '·');
  assert.equal(celda('percusion', 8).classList.contains('paso-compas'), true, 'el segundo compás se marca');
  assert.equal(q('[data-accion="tempo"]').value, '110');
  assert.equal(q('.secuenciador-tempo').textContent, '110 pulsos por minuto');
  assert.equal(q('[data-accion="guardar"]').disabled, true);
  assert.equal(document.activeElement, celda('melodia', 0));
  clic(q('[data-accion="cancelar"]'));
  assert.equal(await pendiente, null);
  assert.equal(contenedor.hidden, true);
});

test('las celdas suben de grado con clic, bajan con Mayús y flecha abajo, y la percusión alterna; Guardar entrega un WAV', async () => {
  const { herramienta, q, celda } = armar();
  const pendiente = herramienta.abrir();
  clic(celda('melodia', 2));
  assert.equal(celda('melodia', 2).textContent, '1');
  assert.equal(celda('melodia', 2).getAttribute('aria-pressed'), 'true');
  assert.match(celda('melodia', 2).getAttribute('aria-label'), /Melodía, paso 3: grado 1/);
  clic(celda('melodia', 2));
  assert.equal(celda('melodia', 2).textContent, '2');
  celda('melodia', 2).dispatchEvent(new window.MouseEvent('click', { bubbles: true, shiftKey: true }));
  assert.equal(celda('melodia', 2).textContent, '1');
  teclear(celda('melodia', 2), 'ArrowDown');
  assert.equal(celda('melodia', 2).textContent, '·');
  teclear(celda('bajo', 0), 'ArrowUp');
  assert.equal(celda('bajo', 0).textContent, '1');
  clic(celda('percusion', 4));
  assert.equal(celda('percusion', 4).textContent, '●');
  teclear(celda('percusion', 4), 'ArrowUp');
  assert.equal(celda('percusion', 4).textContent, '●', 'las flechas no cambian la percusión');
  assert.equal(q('[data-accion="guardar"]').disabled, false);
  clic(q('[data-accion="guardar"]'));
  const blob = await pendiente;
  assert.equal(blob.type, 'audio/wav');
  const cabecera = cabeceraWav(new Uint8Array(await blob.arrayBuffer()));
  assert.equal(cabecera.frecuencia, 22050);
  assert.equal(cabecera.muestras, Math.round((60 / 110 / 2) * 22050) * 16);
});

test('Tocar en bucle crea el contexto una vez, arranca la fuente en bucle, se reinicia al editar y Parar la detiene', async () => {
  const { herramienta, registro, contextos, q, celda } = armar();
  const pendiente = herramienta.abrir();
  clic(celda('acorde', 0));
  clic(q('[data-accion="tocar"]'));
  assert.equal(contextos(), 1);
  assert.equal(q('[data-accion="tocar"]').getAttribute('aria-pressed'), 'true');
  assert.equal(q('[data-accion="tocar"]').textContent, 'Parar');
  assert.deepEqual(registro, ['connect', ['start', Math.round((60 / 110 / 2) * 22050) * 16, 22050, true]]);
  clic(celda('acorde', 4));
  assert.deepEqual(registro.slice(2), ['stop', 'connect', ['start', Math.round((60 / 110 / 2) * 22050) * 16, 22050, true]], 'editar reinicia el bucle');
  assert.equal(contextos(), 1, 'el contexto se reutiliza');
  clic(q('[data-accion="tocar"]'));
  assert.equal(registro.at(-1), 'stop');
  assert.equal(q('[data-accion="tocar"]').textContent, 'Tocar en bucle');
  clic(q('[data-accion="tocar"]'));
  clic(q('[data-accion="cancelar"]'));
  assert.equal(await pendiente, null);
  assert.deepEqual(registro.slice(-2), ['stop', 'close'], 'cancelar para y cierra el contexto');
});

test('el tempo cambia la duración y se acota entre 80 y 160', async () => {
  const { herramienta, q, celda } = armar();
  const pendiente = herramienta.abrir();
  clic(celda('bajo', 0));
  escribir(q('[data-accion="tempo"]'), '140');
  assert.equal(q('.secuenciador-tempo').textContent, '140 pulsos por minuto');
  escribir(q('[data-accion="tempo"]'), '999');
  assert.equal(q('.secuenciador-tempo').textContent, '160 pulsos por minuto');
  clic(q('[data-accion="guardar"]'));
  const blob = await pendiente;
  assert.equal(cabeceraWav(new Uint8Array(await blob.arrayBuffer())).muestras, Math.round((60 / 160 / 2) * 22050) * 16);
});

test('Limpiar vacía el patrón y deshabilita Guardar; Escape cancela', async () => {
  const { contenedor, herramienta, q, celda } = armar();
  const pendiente = herramienta.abrir();
  clic(celda('melodia', 1));
  clic(celda('percusion', 1));
  clic(q('[data-accion="limpiar"]'));
  assert.equal(celda('melodia', 1).textContent, '·');
  assert.equal(celda('percusion', 1).textContent, '·');
  assert.equal(q('[data-accion="guardar"]').disabled, true);
  clic(q('[data-accion="guardar"]'));
  teclear(q('.secuenciador'), 'Escape');
  assert.equal(await pendiente, null);
  assert.equal(contenedor.childNodes.length, 0);
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/secuenciador.test.js`
Expected: falla al importar `plataforma/js/herramientas/secuenciador.js`.

- [ ] **Step 3: Escribir `plataforma/js/herramientas/secuenciador.js`**

```js
// plataforma/js/herramientas/secuenciador.js
// El secuenciador (spec, sección 9): dos compases de ocho pasos, cuatro instrumentos,
// tempo entre 80 y 160, escala pentatónica. Se oye en bucle mientras se edita y al
// guardar se escribe un WAV. El patrón y la síntesis son herramientas/secuencia.js;
// aquí se dibuja la rejilla y se toca con Web Audio, que se inyecta para poder probar.
import { h, vaciar } from '../ui/dom.js';
import { crearPatron, alternar, fijarTempo, esVacio, renderizar, PASOS, INSTRUMENTOS, NOMBRES_INSTRUMENTO, TEMPO, duracionSegundos } from './secuencia.js';
import { codificarWav, FRECUENCIA_WAV } from './audio-util.js';

/** Toca unas muestras en bucle con Web Audio. crearAudioContext() devuelve un AudioContext (o un doble). */
export function crearReproductorDeBucle(crearAudioContext) {
  let contexto = null;
  let fuente = null;
  function parar() {
    if (!fuente) return;
    try { fuente.stop(); } catch { /* ya parada */ }
    fuente.disconnect?.();
    fuente = null;
  }
  return {
    tocar(muestras, frecuencia) {
      parar();
      contexto ??= crearAudioContext();
      const buffer = contexto.createBuffer(1, muestras.length, frecuencia);
      buffer.copyToChannel(muestras, 0);
      fuente = contexto.createBufferSource();
      fuente.buffer = buffer;
      fuente.loop = true;
      fuente.connect(contexto.destination);
      fuente.start();
      contexto.resume?.()?.catch?.(() => {});
    },
    parar,
    get sonando() { return fuente !== null; },
    cerrar() {
      parar();
      contexto?.close?.()?.catch?.(() => {});
      contexto = null;
    },
  };
}

/**
 * @param {HTMLElement} contenedor capa oculta hasta abrir()
 * @param {{ crearAudioContext?: () => AudioContext }} deps
 */
export function crearSecuenciador(contenedor, { crearAudioContext = () => new (window.AudioContext || window.webkitAudioContext)() } = {}) {
  let cerrarActual = null;

  /** @returns {Promise<Blob|null>} el WAV al guardar, null al cancelar */
  function abrir() {
    cerrarActual?.(null);
    return new Promise((resolver) => {
      const patron = crearPatron();
      const bucle = crearReproductorDeBucle(crearAudioContext);
      let sonando = false;

      const celdas = {};
      const botonGuardar = h('button', { type: 'button', class: 'btn btn-primary', dataset: { accion: 'guardar' }, onclick: guardar }, 'Guardar');
      const botonTocar = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'tocar' }, 'aria-pressed': 'false', onclick: () => (sonando ? parar() : tocar()) }, 'Tocar en bucle');
      const salidaTempo = h('output', { class: 'secuenciador-tempo' }, `${patron.tempo} pulsos por minuto`);
      const entradaTempo = h('input', { type: 'range', min: String(TEMPO.min), max: String(TEMPO.max), step: '1', value: String(patron.tempo), dataset: { accion: 'tempo' }, 'aria-label': 'Tempo', oninput: (e) => { fijarTempo(patron, e.target.value); e.target.value = String(patron.tempo); salidaTempo.textContent = `${patron.tempo} pulsos por minuto`; cambio(); } });

      function textoCelda(instrumento, paso) {
        const valor = patron.pasos[instrumento][paso];
        if (instrumento === 'percusion') return valor ? '●' : '·';
        return valor ? String(valor) : '·';
      }
      function pintarCelda(instrumento, paso) {
        const boton = celdas[`${instrumento}:${paso}`];
        const valor = patron.pasos[instrumento][paso];
        boton.textContent = textoCelda(instrumento, paso);
        boton.classList.toggle('paso-activo', Boolean(valor));
        boton.setAttribute('aria-pressed', valor ? 'true' : 'false');
        boton.setAttribute('aria-label', `${NOMBRES_INSTRUMENTO[instrumento]}, paso ${paso + 1}: ${instrumento === 'percusion' ? (valor ? 'suena' : 'silencio') : (valor ? `grado ${valor}` : 'silencio')}`);
      }
      function cambio() {
        botonGuardar.disabled = esVacio(patron);
        if (sonando) tocar();
      }
      function celda(instrumento, paso) {
        const boton = h('button', {
          type: 'button',
          class: `paso${paso % 8 === 0 ? ' paso-compas' : ''}`,
          dataset: { instrumento, paso: String(paso) },
          onclick: (e) => { alternar(patron, instrumento, paso, e.shiftKey ? -1 : 1); pintarCelda(instrumento, paso); cambio(); },
          oncontextmenu: (e) => { e.preventDefault(); alternar(patron, instrumento, paso, -1); pintarCelda(instrumento, paso); cambio(); },
          onkeydown: (e) => {
            if (instrumento === 'percusion' || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
            e.preventDefault();
            alternar(patron, instrumento, paso, e.key === 'ArrowUp' ? 1 : -1);
            pintarCelda(instrumento, paso);
            cambio();
          },
        });
        celdas[`${instrumento}:${paso}`] = boton;
        pintarCelda(instrumento, paso);
        return boton;
      }
      function tocar() {
        sonando = true;
        botonTocar.setAttribute('aria-pressed', 'true');
        botonTocar.textContent = 'Parar';
        bucle.tocar(renderizar(patron, FRECUENCIA_WAV), FRECUENCIA_WAV);
      }
      function parar() {
        sonando = false;
        botonTocar.setAttribute('aria-pressed', 'false');
        botonTocar.textContent = 'Tocar en bucle';
        bucle.parar();
      }
      function limpiar() {
        for (const instrumento of INSTRUMENTOS) {
          for (let paso = 0; paso < PASOS; paso += 1) {
            patron.pasos[instrumento][paso] = instrumento === 'percusion' ? false : 0;
            pintarCelda(instrumento, paso);
          }
        }
        cambio();
      }
      function cerrar(valor) {
        cerrarActual = null;
        parar();
        bucle.cerrar();
        vaciar(contenedor);
        contenedor.hidden = true;
        resolver(valor);
      }
      function guardar() {
        if (esVacio(patron)) return;
        const muestras = renderizar(patron, FRECUENCIA_WAV);
        cerrar(new Blob([codificarWav(muestras, FRECUENCIA_WAV)], { type: 'audio/wav' }));
      }
      cerrarActual = cerrar;

      contenedor.hidden = false;
      vaciar(contenedor).append(h('div', { class: 'herramienta secuenciador', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'secuenciador-titulo', onkeydown: (e) => { if (e.key === 'Escape') cerrar(null); } },
        h('div', { class: 'mapa-cabecera' },
          h('div', {}, h('h2', { id: 'secuenciador-titulo' }, 'Secuenciador'), h('p', { class: 'mapa-resumen' }, `Dos compases de ocho pasos. Clic sube el grado (Mayús y clic lo baja); la percusión se enciende y apaga. Dura ${duracionSegundos(patron).toFixed(1)} s a ${patron.tempo} pulsos.`)),
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'cancelar' }, onclick: () => cerrar(null) }, 'Cancelar')),
        h('div', { class: 'secuenciador-rejilla', role: 'grid', 'aria-label': 'Patrón' }, INSTRUMENTOS.map((instrumento) =>
          h('div', { class: 'secuenciador-fila', role: 'row' },
            h('span', { class: 'secuenciador-instrumento', role: 'rowheader' }, NOMBRES_INSTRUMENTO[instrumento]),
            Array.from({ length: PASOS }, (_, paso) => celda(instrumento, paso))))),
        h('div', { class: 'secuenciador-controles' },
          h('label', { class: 'campo-tempo' }, 'Tempo ', entradaTempo, ' ', salidaTempo),
          botonTocar,
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'limpiar' }, onclick: limpiar }, 'Limpiar')),
        h('div', { class: 'acciones' }, botonGuardar, h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => cerrar(null) }, 'Cancelar'))));
      botonGuardar.disabled = true;
      celdas['melodia:0'].focus();
    });
  }

  return { abrir };
}
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/secuenciador.test.js`
Expected: `# pass 5`.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/herramientas/secuenciador.js tests/secuenciador.test.js
git commit -m "Secuenciador: rejilla de dos compases, tempo, bucle con Web Audio y WAV del mismo render" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Vista del grabador

**Files:**
- Create: `plataforma/js/herramientas/grabador.js`
- Create: `tests/grabador.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/grabador.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instalarDom, clic, teclear, escribir } from './ayudas/dom.js';
import { cabeceraWav } from '../scripts/png-wav.js';
import { crearGrabador, MAXIMO_SEGUNDOS } from '../plataforma/js/herramientas/grabador.js';

instalarDom();
const tick = () => new Promise((r) => setTimeout(r, 0));

function armar({ microfono = 'ok', decodifica = true, alSubirEnSuLugar = null } = {}) {
  const registro = [];
  const temporizadores = [];
  const stream = { getTracks: () => [{ stop: () => registro.push('pista-parada') }] };
  class GrabadoraFalsa {
    constructor(flujo, opciones) { this.state = 'inactive'; this.mimeType = opciones.mimeType ?? ''; registro.push(['grabadora', this.mimeType]); }
    start() { this.state = 'recording'; registro.push('start'); }
    stop() { this.state = 'inactive'; registro.push('stop'); this.ondataavailable?.({ data: new Blob(['audio'], { type: this.mimeType }) }); this.onstop?.(); }
  }
  const contenedor = document.createElement('div');
  contenedor.hidden = true;
  document.body.append(contenedor);
  const herramienta = crearGrabador(contenedor, {
    pedirMicrofono: async () => { if (microfono === 'ok') return stream; throw new Error('Permission denied'); },
    crearGrabadora: (flujo, opciones) => new GrabadoraFalsa(flujo, opciones),
    formatoSoportado: (tipo) => tipo === 'audio/webm;codecs=opus' || tipo === 'audio/webm',
    decodificar: async () => { if (!decodifica) throw new Error('no se pudo'); return { muestras: Float32Array.from({ length: 100 }, (_, i) => (i % 10) / 10), frecuencia: 100 }; },
    crearAudio: (url) => { registro.push(['audio', url]); return { play: () => { registro.push('play'); return Promise.resolve(); }, pause: () => registro.push('pause') }; },
    crearUrl: () => { registro.push('crear-url'); return 'blob:grabacion'; },
    liberarUrl: (url) => registro.push(['liberar', url]),
    planificar: (fn, ms) => { temporizadores.push({ fn, ms }); return temporizadores.length; },
    cancelar: (id) => registro.push(['cancelar', id]),
    crearContexto: () => null,
  });
  const q = (s) => contenedor.querySelector(s);
  return { contenedor, herramienta, registro, temporizadores, q, alSubirEnSuLugar };
}

test('grabar pide el micrófono, usa el formato preferido y detener deja la grabación lista; guardar sin recorte devuelve el blob original', async () => {
  const { contenedor, herramienta, registro, q } = armar();
  const pendiente = herramienta.abrir();
  assert.equal(contenedor.hidden, false);
  assert.match(q('.grabador-estado').textContent, /Pulsa Grabar/);
  assert.equal(q('[data-accion="detener"]').disabled, true);
  assert.equal(q('[data-accion="guardar"]').disabled, true);
  assert.equal(document.activeElement, q('[data-accion="grabar"]'));
  clic(q('[data-accion="grabar"]'));
  await tick();
  assert.deepEqual(registro.slice(0, 2), [['grabadora', 'audio/webm;codecs=opus'], 'start']);
  assert.match(q('.grabador-estado').textContent, /Grabando/);
  assert.equal(q('[data-accion="grabar"]').disabled, true);
  clic(q('[data-accion="detener"]'));
  await tick();
  assert.ok(registro.includes('pista-parada'));
  assert.match(q('.grabador-estado').textContent, /Grabación lista/);
  assert.equal(q('.grabador-tiempo').textContent, '1.0 s');
  assert.equal(q('[data-accion="recorte-fin"]').value, '1.0');
  assert.equal(q('[data-accion="guardar"]').disabled, false);
  clic(q('[data-accion="guardar"]'));
  const blob = await pendiente;
  assert.equal(blob.type, 'audio/webm;codecs=opus');
  assert.equal(await blob.text(), 'audio');
  assert.equal(contenedor.hidden, true);
});

test('con las manijas movidas, guardar decodifica, recorta, remuestrea y entrega un WAV', async () => {
  const { herramienta, q } = armar();
  const pendiente = herramienta.abrir();
  clic(q('[data-accion="grabar"]'));
  await tick();
  clic(q('[data-accion="detener"]'));
  await tick();
  escribir(q('[data-accion="recorte-inicio"]'), '0.25');
  escribir(q('[data-accion="recorte-fin"]'), '0.75');
  assert.match(q('.grabador-tiempo').textContent, /recorte: 0\.3 a 0\.8 s|recorte: 0\.2 a 0\.8 s|recorte: 0\.3 a 0\.7 s|recorte: 0\.2 a 0\.7 s/);
  clic(q('[data-accion="guardar"]'));
  const blob = await pendiente;
  assert.equal(blob.type, 'audio/wav');
  const cabecera = cabeceraWav(new Uint8Array(await blob.arrayBuffer()));
  assert.equal(cabecera.frecuencia, 22050);
  assert.equal(cabecera.muestras, Math.round(50 * (22050 / 100)), 'medio segundo remuestreado a 22050');
});

test('si el micrófono falla, explica cómo permitirlo y ofrece subir un archivo en su lugar', async () => {
  const llamadas = [];
  const { herramienta, q } = armar({ microfono: 'negado', alSubirEnSuLugar: () => llamadas.push('subir') });
  const pendiente = herramienta.abrir({ alSubirEnSuLugar: () => llamadas.push('subir') });
  clic(q('[data-accion="grabar"]'));
  await tick();
  assert.equal(q('.grabador-error').hidden, false);
  assert.match(q('.grabador-error').textContent, /Permission denied/);
  assert.match(q('.grabador-error').textContent, /Permite el micrófono para este sitio/);
  clic(q('[data-accion="subir"]'));
  assert.equal(await pendiente, null);
  assert.deepEqual(llamadas, ['subir']);
  const sinOpcion = armar({ microfono: 'negado' });
  const otra = sinOpcion.herramienta.abrir();
  clic(sinOpcion.q('[data-accion="grabar"]'));
  await tick();
  assert.equal(sinOpcion.q('[data-accion="subir"]'), null, 'sin alternativa no hay botón');
  clic(sinOpcion.q('[data-accion="cancelar"]'));
  assert.equal(await otra, null);
});

test('a los treinta segundos se detiene sola; si no se puede decodificar, se guarda completa sin recorte', async () => {
  const { herramienta, temporizadores, registro, q } = armar({ decodifica: false });
  const pendiente = herramienta.abrir();
  clic(q('[data-accion="grabar"]'));
  await tick();
  assert.equal(temporizadores.length, 1);
  assert.equal(temporizadores[0].ms, MAXIMO_SEGUNDOS * 1000);
  temporizadores[0].fn();
  await tick();
  assert.ok(registro.includes('stop'));
  assert.match(q('.grabador-estado').textContent, /No se pudo analizar/);
  assert.equal(q('[data-accion="recorte-inicio"]').disabled, true);
  clic(q('[data-accion="guardar"]'));
  const blob = await pendiente;
  assert.equal(blob.type, 'audio/webm;codecs=opus');
});

test('escuchar reproduce la grabación; cancelar libera la URL, detiene y devuelve null; Escape también', async () => {
  const { contenedor, herramienta, registro, q } = armar();
  const pendiente = herramienta.abrir();
  clic(q('[data-accion="grabar"]'));
  await tick();
  clic(q('[data-accion="detener"]'));
  await tick();
  clic(q('[data-accion="escuchar"]'));
  assert.deepEqual(registro.slice(-3), ['crear-url', ['audio', 'blob:grabacion'], 'play']);
  clic(q('[data-accion="cancelar"]'));
  assert.equal(await pendiente, null);
  assert.ok(registro.some((r) => Array.isArray(r) && r[0] === 'liberar' && r[1] === 'blob:grabacion'));
  assert.equal(contenedor.childNodes.length, 0);
  const otra = herramienta.abrir();
  teclear(q('.grabador'), 'Escape');
  assert.equal(await otra, null);
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/grabador.test.js`
Expected: falla al importar `plataforma/js/herramientas/grabador.js`.

- [ ] **Step 3: Escribir `plataforma/js/herramientas/grabador.js`**

```js
// plataforma/js/herramientas/grabador.js
// El grabador (spec, sección 9): micrófono del navegador, grabar, detener, escuchar y
// recortar inicio y final con dos manijas sobre una forma de onda; máximo treinta
// segundos. Sin recorte se guarda lo que entregó el navegador (WebM/Opus o MP4/AAC);
// con recorte se decodifica y se guarda en WAV. Si el micrófono falla, explica cómo
// permitirlo y ofrece subir un archivo (spec, sección 17). Todo lo del navegador se inyecta.
import { h, vaciar } from '../ui/dom.js';
import { mezclarAMono, remuestrear, codificarWav, formaDeOnda, recortar, elegirFormato, FRECUENCIA_WAV } from './audio-util.js';

export const MAXIMO_SEGUNDOS = 30;
export const COLUMNAS_ONDA = 120;
const MARGEN_RECORTE = 0.05;

/** Muestras mono de un Blob de audio, con Web Audio. */
export async function decodificarConWebAudio(blob) {
  const Contexto = window.AudioContext || window.webkitAudioContext;
  const contexto = new Contexto();
  try {
    const buffer = await contexto.decodeAudioData(await blob.arrayBuffer());
    const canales = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
    return { muestras: mezclarAMono(canales), frecuencia: buffer.sampleRate };
  } finally {
    contexto.close?.();
  }
}

/**
 * @param {HTMLElement} contenedor capa oculta hasta abrir()
 * @param {object} deps pedirMicrofono, crearGrabadora, formatoSoportado, decodificar, crearAudio, crearUrl, liberarUrl, planificar, cancelar, crearContexto
 */
export function crearGrabador(contenedor, {
  pedirMicrofono = () => navigator.mediaDevices.getUserMedia({ audio: true }),
  crearGrabadora = (stream, opciones) => new MediaRecorder(stream, opciones),
  formatoSoportado = (tipo) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(tipo),
  decodificar = decodificarConWebAudio,
  crearAudio = (url) => new Audio(url),
  crearUrl = (blob) => URL.createObjectURL(blob),
  liberarUrl = (url) => URL.revokeObjectURL(url),
  planificar = (fn, ms) => setTimeout(fn, ms),
  cancelar = (temporizador) => clearTimeout(temporizador),
  crearContexto = (canvas) => canvas.getContext('2d'),
} = {}) {
  let cerrarActual = null;

  /**
   * @param {{ alSubirEnSuLugar?: (() => void)|null }} opciones se ofrece cuando el micrófono falla
   * @returns {Promise<Blob|null>}
   */
  function abrir({ alSubirEnSuLugar = null } = {}) {
    cerrarActual?.(null);
    return new Promise((resolver) => {
      let estado = 'listo'; // listo | grabando | grabado | sin-microfono
      let grabacion = null; // { blob, muestras, frecuencia, duracion }
      let inicio = 0;
      let fin = 0;
      let stream = null;
      let grabadora = null;
      let temporizador = null;
      let urlEscucha = null;
      let audioEscucha = null;

      const texto = h('p', { class: 'grabador-estado', 'aria-live': 'polite' });
      const errorNodo = h('div', { class: 'grabador-error', role: 'alert', hidden: true });
      const canvas = h('canvas', { class: 'grabador-onda', width: 480, height: 80, role: 'img', 'aria-label': 'Forma de onda de la grabación' });
      const ctx = crearContexto(canvas);
      const tiempo = h('span', { class: 'grabador-tiempo' }, '0.0 s');
      const botonGrabar = h('button', { type: 'button', class: 'btn btn-primary btn-sm', dataset: { accion: 'grabar' }, onclick: grabar }, 'Grabar');
      const botonDetener = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'detener' }, onclick: detener }, 'Detener');
      const botonEscuchar = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'escuchar' }, onclick: escuchar }, 'Escuchar');
      const botonGuardar = h('button', { type: 'button', class: 'btn btn-primary', dataset: { accion: 'guardar' }, onclick: guardar }, 'Guardar');
      const rangoInicio = h('input', { type: 'range', min: '0', max: '0', step: '0.1', value: '0', dataset: { accion: 'recorte-inicio' }, 'aria-label': 'Inicio del recorte, en segundos', oninput: (e) => { inicio = Math.min(Number(e.target.value), Math.max(0, fin - 0.1)); e.target.value = String(inicio); pintar(); } });
      const rangoFin = h('input', { type: 'range', min: '0', max: '0', step: '0.1', value: '0', dataset: { accion: 'recorte-fin' }, 'aria-label': 'Final del recorte, en segundos', oninput: (e) => { fin = Math.max(Number(e.target.value), Math.min(grabacion?.duracion ?? 0, inicio + 0.1)); e.target.value = String(fin); pintar(); } });
      const botonSubir = alSubirEnSuLugar ? h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'subir' }, onclick: () => { cerrar(null); alSubirEnSuLugar(); } }, 'Subir un archivo en su lugar') : null;

      function mensajeEstado() {
        switch (estado) {
          case 'grabando': return `Grabando… Pulsa Detener cuando termines. Máximo ${MAXIMO_SEGUNDOS} segundos.`;
          case 'grabado': return grabacion?.muestras ? 'Grabación lista. Escúchala y, si quieres, recorta el inicio y el final con las manijas.' : 'Grabación lista. No se pudo analizar para recortarla; se guardará completa.';
          case 'sin-microfono': return 'No se pudo usar el micrófono.';
          default: return 'Pulsa Grabar y habla o haz el sonido. Sirve para voces y para efectos caseros.';
        }
      }

      function pintarOnda() {
        if (!ctx) return;
        const ancho = canvas.width;
        const alto = canvas.height;
        ctx.fillStyle = '#0a0d12';
        ctx.fillRect(0, 0, ancho, alto);
        if (!grabacion?.muestras) return;
        const picos = formaDeOnda(grabacion.muestras, COLUMNAS_ONDA);
        const paso = ancho / COLUMNAS_ONDA;
        const { duracion } = grabacion;
        for (let c = 0; c < COLUMNAS_ONDA; c += 1) {
          const t = (c / COLUMNAS_ONDA) * duracion;
          ctx.fillStyle = t >= inicio && t <= fin ? '#b6ff3b' : '#3a4a5c';
          const h2 = Math.max(1, picos[c] * (alto - 4));
          ctx.fillRect(c * paso, (alto - h2) / 2, Math.max(1, paso - 1), h2);
        }
      }

      function pintar() {
        texto.textContent = mensajeEstado();
        botonGrabar.disabled = estado === 'grabando';
        botonDetener.disabled = estado !== 'grabando';
        botonEscuchar.disabled = estado !== 'grabado';
        botonGuardar.disabled = estado !== 'grabado';
        const puedeRecortar = estado === 'grabado' && Boolean(grabacion?.muestras);
        rangoInicio.disabled = !puedeRecortar;
        rangoFin.disabled = !puedeRecortar;
        const duracion = grabacion?.duracion ?? 0;
        rangoInicio.max = String(duracion.toFixed(1));
        rangoFin.max = String(duracion.toFixed(1));
        tiempo.textContent = `${duracion.toFixed(1)} s${puedeRecortar && (inicio > 0 || fin < duracion) ? ` (recorte: ${inicio.toFixed(1)} a ${fin.toFixed(1)} s)` : ''}`;
        pintarOnda();
      }

      async function grabar() {
        if (estado === 'grabando') return;
        try {
          stream = await pedirMicrofono();
        } catch (error) {
          estado = 'sin-microfono';
          errorNodo.hidden = false;
          vaciar(errorNodo).append(
            h('p', {}, `No se pudo usar el micrófono${error?.message ? ` (${error.message})` : ''}. Permite el micrófono para este sitio en el navegador (el candado o el ícono junto a la dirección) y vuelve a intentar.`),
            h('p', {}, 'Si no tienes micrófono, puedes subir un archivo de audio en su lugar.'),
            botonSubir);
          pintar();
          return;
        }
        const formato = elegirFormato(formatoSoportado);
        grabadora = crearGrabadora(stream, formato ? { mimeType: formato } : {});
        const trozos = [];
        grabadora.ondataavailable = (e) => { if (e.data?.size) trozos.push(e.data); };
        grabadora.onstop = async () => {
          const blob = new Blob(trozos, { type: grabadora.mimeType || formato || 'audio/webm' });
          stream?.getTracks?.().forEach((pista) => pista.stop());
          stream = null;
          try {
            const { muestras, frecuencia } = await decodificar(blob);
            grabacion = { blob, muestras, frecuencia, duracion: muestras.length / frecuencia };
          } catch {
            grabacion = { blob, muestras: null, frecuencia: null, duracion: 0 };
          }
          inicio = 0;
          fin = grabacion.duracion;
          estado = 'grabado';
          pintar(); // fija los máximos de las manijas antes de ponerles valor
          rangoInicio.value = '0';
          rangoFin.value = String(fin.toFixed(1));
        };
        errorNodo.hidden = true;
        grabadora.start();
        estado = 'grabando';
        temporizador = planificar(() => detener(), MAXIMO_SEGUNDOS * 1000);
        pintar();
      }

      function detener() {
        if (temporizador !== null) { cancelar(temporizador); temporizador = null; }
        if (grabadora && grabadora.state !== 'inactive') grabadora.stop();
      }

      function liberarEscucha() {
        audioEscucha?.pause?.();
        audioEscucha = null;
        if (urlEscucha) { liberarUrl(urlEscucha); urlEscucha = null; }
      }

      function escuchar() {
        if (!grabacion) return;
        liberarEscucha();
        urlEscucha = crearUrl(grabacion.blob);
        audioEscucha = crearAudio(urlEscucha);
        const promesa = audioEscucha.play?.();
        if (promesa && typeof promesa.catch === 'function') promesa.catch(() => {});
      }

      function guardar() {
        if (!grabacion) return;
        const recortada = grabacion.muestras && (inicio > MARGEN_RECORTE || fin < grabacion.duracion - MARGEN_RECORTE);
        if (!recortada) { cerrar(grabacion.blob); return; }
        const muestras = remuestrear(recortar(grabacion.muestras, grabacion.frecuencia, inicio, fin), grabacion.frecuencia, FRECUENCIA_WAV);
        cerrar(new Blob([codificarWav(muestras, FRECUENCIA_WAV)], { type: 'audio/wav' }));
      }

      function cerrar(valor) {
        cerrarActual = null;
        detener();
        stream?.getTracks?.().forEach((pista) => pista.stop());
        stream = null;
        liberarEscucha();
        vaciar(contenedor);
        contenedor.hidden = true;
        resolver(valor);
      }
      cerrarActual = cerrar;

      contenedor.hidden = false;
      vaciar(contenedor).append(h('div', { class: 'herramienta grabador', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'grabador-titulo', onkeydown: (e) => { if (e.key === 'Escape') cerrar(null); } },
        h('div', { class: 'mapa-cabecera' },
          h('div', {}, h('h2', { id: 'grabador-titulo' }, 'Grabador'), h('p', { class: 'mapa-resumen' }, `Hasta ${MAXIMO_SEGUNDOS} segundos con el micrófono. Lo que grabes entra al juego como obra tuya, con sello de fecha.`)),
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'cancelar' }, onclick: () => cerrar(null) }, 'Cancelar')),
        texto,
        errorNodo,
        h('div', { class: 'grabador-controles' }, botonGrabar, botonDetener, botonEscuchar, tiempo),
        h('div', { class: 'grabador-marco' }, canvas),
        h('div', { class: 'grabador-recorte' },
          h('label', { class: 'campo-rango' }, 'Inicio ', rangoInicio),
          h('label', { class: 'campo-rango' }, 'Final ', rangoFin)),
        h('div', { class: 'acciones' }, botonGuardar, h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => cerrar(null) }, 'Cancelar'))));
      pintar();
      botonGrabar.focus();
    });
  }

  return { abrir };
}
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/grabador.test.js`
Expected: `# pass 5`.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/herramientas/grabador.js tests/grabador.test.js
git commit -m "Grabador: micrófono, treinta segundos, forma de onda, recorte a WAV y alternativa de subir" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6b: Elementos creados con sello

**Files:**
- Create: `plataforma/js/editor/creados.js`
- Create: `tests/creados.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/creados.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sesionDePrueba } from './ayudas/sesion.js';
import { huellaSha256 } from '../plataforma/js/estado/archivos.js';
import { evaluar } from '../plataforma/js/juridico/semaforo.js';
import { crearElementoCreado, reemplazarArchivoCreado } from '../plataforma/js/editor/creados.js';

const blobDe = (texto, tipo) => new Blob([texto], { type: tipo });

test('crearElementoCreado mete el elemento con origen creado, sello con fecha y huella, archivo y ficha en verde', async () => {
  const { sesion, eventos } = sesionDePrueba();
  const ahora = new Date('2026-11-06T15:00:00Z');
  const elemento = await crearElementoCreado(sesion, blobDe('png falso', 'image/png'), { tipo: 'retrato', nombre: 'Retrato creado 1', ahora });
  assert.equal(elemento.origen, 'creado');
  assert.equal(elemento.tipo, 'retrato');
  assert.equal(elemento.nombre, 'Retrato creado 1');
  assert.equal(elemento.archivo, `${elemento.id}.png`);
  assert.equal(elemento.sello.fecha, '2026-11-06T15:00:00.000Z');
  assert.equal(elemento.sello.huella, await huellaSha256(new TextEncoder().encode('png falso')));
  const ficha = sesion.proyecto.fichas[elemento.id];
  assert.equal(ficha.origen, 'creado');
  assert.equal(ficha.prueba, 'sello');
  assert.equal(ficha.autoria, 'yo');
  assert.deepEqual(evaluar(ficha, { destino: 'venta' }), { color: 'verde', razones: [], notas: ['N_SELLO'] });
  const archivo = sesion.archivos.get(elemento.id);
  assert.equal(archivo.tipo, 'image/png');
  assert.equal(new TextDecoder().decode(archivo.datos), 'png falso');
  assert.deepEqual(eventos[0], { tipo: 'cambio', origen: 'herramienta', estructura: true });
  const wav = await crearElementoCreado(sesion, blobDe('wav', 'audio/wav'), { tipo: 'musica', nombre: 'Pista 1' });
  assert.equal(wav.archivo, `${wav.id}.wav`);
  const webm = await crearElementoCreado(sesion, blobDe('webm', 'audio/webm;codecs=opus'), { tipo: 'voz', nombre: 'Grabación 1' });
  assert.equal(webm.archivo, `${webm.id}.webm`);
  assert.equal(sesion.archivos.get(webm.id).tipo, 'audio/webm;codecs=opus');
});

test('si el almacén falla al guardar, el elemento se retira y el error se propaga', async () => {
  const fallo = Object.assign(new Error('No hay espacio'), { codigo: 'sin_espacio' });
  const { sesion } = sesionDePrueba(undefined, { almacen: { guardar: async () => {}, guardarArchivo: async () => { throw fallo; }, borrarArchivo: async () => {} } });
  await assert.rejects(crearElementoCreado(sesion, blobDe('x', 'image/png'), { tipo: 'fondo', nombre: 'Fondo creado 1' }), (e) => e === fallo);
  assert.deepEqual(sesion.proyecto.juego.elementos, []);
  assert.deepEqual(Object.keys(sesion.proyecto.fichas), ['titulo', 'historia']);
});

test('reemplazarArchivoCreado cambia el archivo y recalcula el sello; con un id desconocido falla sin guardar nada', async () => {
  const { sesion } = sesionDePrueba();
  const elemento = await crearElementoCreado(sesion, blobDe('v1', 'image/png'), { tipo: 'fondo', nombre: 'Fondo creado 1', ahora: new Date('2026-11-06T15:00:00Z') });
  const huellaAntes = elemento.sello.huella;
  const cambiado = await reemplazarArchivoCreado(sesion, elemento.id, blobDe('v2', 'image/png'), { ahora: new Date('2026-11-06T16:00:00Z') });
  assert.equal(cambiado, elemento);
  assert.equal(elemento.sello.fecha, '2026-11-06T16:00:00.000Z');
  assert.notEqual(elemento.sello.huella, huellaAntes);
  assert.equal(elemento.sello.huella, await huellaSha256(new TextEncoder().encode('v2')));
  assert.equal(new TextDecoder().decode(sesion.archivos.get(elemento.id).datos), 'v2');
  await assert.rejects(reemplazarArchivoCreado(sesion, 'el_nadie', blobDe('v3', 'image/png')), /ya no existe/);
  assert.equal(sesion.archivos.has('el_nadie'), false);
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/creados.test.js`
Expected: falla al importar `plataforma/js/editor/creados.js`.

- [ ] **Step 3: Escribir `plataforma/js/editor/creados.js`**

```js
// plataforma/js/editor/creados.js
// Lo que sale de una herramienta entra al proyecto como elemento con origen 'creado',
// sello de creación (fecha y huella SHA-256 del archivo) y ficha con prueba «sello».
// Reabrir un pixel art reemplaza el archivo y recalcula el sello (spec, sección 9).
import { agregarElemento, eliminarElemento } from '../estado/modelo.js';
import { crearSello, extensionPorMime } from '../estado/archivos.js';

const mimeDe = (blob) => blob.type || 'application/octet-stream';

/**
 * @param {object} sesion de crearSesion
 * @param {Blob} blob lo que devolvió la herramienta
 * @param {{ tipo: string, nombre: string, ahora?: Date }} datos tipo de elemento y nombre inicial
 */
export async function crearElementoCreado(sesion, blob, { tipo, nombre, ahora = new Date() }) {
  const datos = await blob.arrayBuffer();
  const mime = mimeDe(blob);
  const sello = await crearSello(datos, ahora);
  const elemento = sesion.cambiar((proyecto) => {
    const nuevo = agregarElemento(proyecto, { tipo, nombre, archivo: 'pendiente', origen: 'creado', sello });
    nuevo.archivo = `${nuevo.id}.${extensionPorMime(mime)}`;
    return nuevo;
  }, { origen: 'herramienta', estructura: true });
  try {
    await sesion.agregarArchivo(elemento.id, { tipo: mime, datos });
  } catch (error) {
    sesion.cambiar((proyecto) => eliminarElemento(proyecto, elemento.id), { origen: 'herramienta', estructura: true });
    throw error;
  }
  return elemento;
}

/** Reemplaza el archivo de un elemento creado y recalcula su sello. Lanza si el elemento ya no existe. */
export async function reemplazarArchivoCreado(sesion, id, blob, { ahora = new Date() } = {}) {
  const existe = sesion.proyecto.juego.elementos.some((e) => e.id === id);
  if (!existe) throw new Error('El elemento ya no existe.');
  const datos = await blob.arrayBuffer();
  const mime = mimeDe(blob);
  const sello = await crearSello(datos, ahora);
  await sesion.agregarArchivo(id, { tipo: mime, datos });
  return sesion.cambiar((proyecto) => {
    const elemento = proyecto.juego.elementos.find((e) => e.id === id);
    elemento.sello = sello;
    elemento.archivo = `${id}.${extensionPorMime(mime)}`;
    return elemento;
  }, { origen: 'herramienta', estructura: true });
}
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/creados.test.js`
Expected: `# pass 3`.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/editor/creados.js tests/creados.test.js
git commit -m "Elementos creados: alta con sello de creación y reemplazo con sello nuevo" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Botones de crear, apertura de las herramientas, alta con sello y reabrir un pixel art

**Files:**
- Modify: `plataforma/js/editor/inventario.js`, `tests/inventario.test.js`
- Modify: `plataforma/js/editor/propiedades.js`, `tests/propiedades.test.js`
- Modify: `plataforma/js/editor/editor.js`, `tests/editor.test.js`
- Modify: `plataforma/js/app.js`
- Modify: `plataforma/css/editor.css`

- [ ] **Step 1: Escribir las pruebas que fallan**

En `tests/inventario.test.js`, `armar` pasa `alCrear: (clave) => creaciones.push(clave)` y devuelve `creaciones`. La prueba «sin biblioteca disponible…» pasa a llamarse «sin biblioteca ni herramientas los botones quedan deshabilitados y explican por qué» y comprueba además que `crear-pixel`, `crear-grabar` y `crear-secuencia` estén deshabilitados. Nueva prueba:

```js
test('los botones de crear avisan qué herramienta abrir', () => {
  const { contenedor, inventario, creaciones } = armar();
  inventario.dibujar(null);
  assert.deepEqual([...contenedor.querySelectorAll('.inventario-botones button')].map((b) => b.textContent), ['Nueva escena', 'Nuevo personaje', 'Pixel art', 'Grabar', 'Secuenciador', 'Biblioteca', 'Subir archivo']);
  clic(contenedor.querySelector('button[data-accion="crear-pixel"]'));
  clic(contenedor.querySelector('button[data-accion="crear-grabar"]'));
  clic(contenedor.querySelector('button[data-accion="crear-secuencia"]'));
  assert.deepEqual(creaciones, ['pixel', 'grabar', 'secuencia']);
  assert.equal(contenedor.querySelector('button[data-accion="crear-pixel"]').disabled, false);
});
```

En `tests/propiedades.test.js`, `armar` pasa `alEditarPixel: (id) => ediciones.push(id)` y devuelve `ediciones`. Nueva prueba:

```js
test('un fondo o retrato creado dentro ofrece «Editar en pixel art»; lo subido o el audio no', async () => {
  const { contenedor, propiedades, fondo, retrato, tema, ediciones } = await armar();
  propiedades.dibujar({ tipo: 'elemento', id: fondo.id });
  clic(contenedor.querySelector('button[data-accion="editar-pixel"]'));
  assert.deepEqual(ediciones, [fondo.id]);
  propiedades.dibujar({ tipo: 'elemento', id: retrato.id });
  assert.equal(contenedor.querySelector('button[data-accion="editar-pixel"]'), null, 'subido: no');
  propiedades.dibujar({ tipo: 'elemento', id: tema.id });
  assert.equal(contenedor.querySelector('button[data-accion="editar-pixel"]'), null, 'audio: no');
  contenedor.remove();
});
```

En `tests/editor.test.js`, `armar` acepta `herramientas = null` y pasa `crearHerramientas: herramientas ? () => herramientas : null`. Antes de la prueba del destino, la ayuda y las tres pruebas nuevas:

```js
function herramientasFalsas(resultados = {}) {
  const llamadas = [];
  const blob = (tipo, texto) => new Blob([texto], { type: tipo });
  return {
    llamadas,
    pixelart: { abrir: async (opciones) => { llamadas.push(['pixelart', opciones]); return resultados.pixelart === null ? null : blob('image/png', 'png nuevo'); } },
    grabador: { abrir: async (opciones) => { llamadas.push(['grabador', Object.keys(opciones)]); return resultados.grabador === null ? null : blob('audio/webm;codecs=opus', 'voz'); } },
    secuenciador: { abrir: async () => { llamadas.push(['secuenciador']); return resultados.secuenciador === null ? null : blob('audio/wav', 'wav'); } },
  };
}

test('Pixel art pregunta qué dibujar, abre la herramienta y mete el resultado como elemento creado con sello y ficha en verde', async () => {
  const herramientas = herramientasFalsas();
  const { p } = proyectoConLineas();
  const { sesion, contenedor, q } = armar({ proyecto: p, herramientas });
  clic(q('.inventario button[data-accion="crear-pixel"]'));
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(q('.dialogo h2').textContent, '¿Qué vas a dibujar?');
  assert.deepEqual(textos(contenedor, '.dialogo button'), ['Fondo', 'Retrato', 'Cancelar']);
  clic(q('.dialogo button[data-tipo="retrato"]'));
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(herramientas.llamadas, [['pixelart', { tipo: 'retrato' }]]);
  const elemento = sesion.proyecto.juego.elementos[0];
  assert.equal(elemento.origen, 'creado');
  assert.equal(elemento.tipo, 'retrato');
  assert.equal(elemento.nombre, 'Retrato creado 1');
  assert.match(elemento.sello.huella, /^sha256:[0-9a-f]{64}$/);
  assert.equal(q('.propiedades h2').textContent, 'Retrato');
  assert.equal(document.activeElement, q(`section.ficha[data-ficha="${elemento.id}"]`));
  assert.ok(q('.inventario .punto-semaforo').classList.contains('semaforo-verde'));
  assert.ok(q('.ficha-notas li[data-codigo="N_SELLO"]'), 'la ficha explica el sello');
  assert.ok([...contenedor.querySelectorAll('.aviso')].some((a) => /sello de creación/.test(a.textContent)));
  assert.ok(!document.body.classList.contains('con-herramienta'));
  contenedor.remove();
});

test('Grabar pregunta voz o efecto y ofrece subir en su lugar; el secuenciador no pregunta; cancelar no crea nada; sin herramientas, los botones se deshabilitan', async () => {
  const herramientas = herramientasFalsas({ secuenciador: null });
  const { p } = proyectoConLineas();
  const { sesion, contenedor, q } = armar({ proyecto: p, herramientas });
  clic(q('.inventario button[data-accion="crear-grabar"]'));
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(q('.dialogo h2').textContent, '¿Qué vas a grabar?');
  assert.deepEqual(textos(contenedor, '.dialogo button'), ['Voz', 'Efecto', 'Cancelar']);
  clic(q('.dialogo button[data-tipo="voz"]'));
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(herramientas.llamadas.at(-1), ['grabador', ['alSubirEnSuLugar']]);
  assert.equal(sesion.proyecto.juego.elementos[0].tipo, 'voz');
  assert.equal(sesion.proyecto.juego.elementos[0].nombre, 'Grabación 1');
  assert.equal(sesion.proyecto.juego.elementos[0].archivo, `${sesion.proyecto.juego.elementos[0].id}.webm`);
  clic(q('.inventario button[data-accion="crear-secuencia"]'));
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(q('.dialogo'), null, 'el secuenciador no pregunta el tipo');
  assert.deepEqual(herramientas.llamadas.at(-1), ['secuenciador']);
  assert.equal(sesion.proyecto.juego.elementos.length, 1, 'cancelar no crea nada');
  contenedor.remove();
  const sinHerramientas = armar({ proyecto: proyectoConLineas().p });
  assert.equal(sinHerramientas.q('.inventario button[data-accion="crear-pixel"]').disabled, true);
  sinHerramientas.contenedor.remove();
});

test('«Editar en pixel art» reabre el fondo creado con su archivo y, al guardar, reemplaza el archivo y el sello', async () => {
  const herramientas = herramientasFalsas();
  const { p } = proyectoConLineas();
  const { sesion, contenedor, editor, q } = armar({ proyecto: p, herramientas });
  await editor.crearConHerramienta('secuencia');
  clic(q('.inventario button[data-accion="crear-pixel"]'));
  await new Promise((r) => setTimeout(r, 0));
  clic(q('.dialogo button[data-tipo="fondo"]'));
  await new Promise((r) => setTimeout(r, 20));
  const fondo = sesion.proyecto.juego.elementos.find((e) => e.tipo === 'fondo');
  const huellaAntes = fondo.sello.huella;
  herramientas.pixelart.abrir = async (opciones) => { herramientas.llamadas.push(['pixelart', opciones.tipo, new TextDecoder().decode(opciones.archivo.datos)]); return new Blob(['png editado'], { type: 'image/png' }); };
  clic(q('.propiedades button[data-accion="editar-pixel"]'));
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(herramientas.llamadas.at(-1), ['pixelart', 'fondo', 'png nuevo']);
  assert.notEqual(fondo.sello.huella, huellaAntes);
  assert.equal(new TextDecoder().decode(sesion.archivos.get(fondo.id).datos), 'png editado');
  assert.equal(q('.propiedades h2').textContent, 'Fondo');
  contenedor.remove();
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/inventario.test.js tests/propiedades.test.js tests/editor.test.js`
Expected: fallan las cinco pruebas nuevas.

- [ ] **Step 3: Cambiar `inventario.js`**

La firma gana `alCrear = null`. En la sección «Elementos», antes del botón «Biblioteca», tres botones:

```js
          botonCrear('Pixel art', alCrear ? () => alCrear('pixel') : undefined, { dataset: { accion: 'crear-pixel' }, disabled: !alCrear, title: alCrear ? 'Dibujar un fondo o un retrato' : 'Las herramientas no están disponibles' }),
          botonCrear('Grabar', alCrear ? () => alCrear('grabar') : undefined, { dataset: { accion: 'crear-grabar' }, disabled: !alCrear, title: alCrear ? 'Grabar una voz o un efecto con el micrófono' : 'Las herramientas no están disponibles' }),
          botonCrear('Secuenciador', alCrear ? () => alCrear('secuencia') : undefined, { dataset: { accion: 'crear-secuencia' }, disabled: !alCrear, title: alCrear ? 'Componer una pista' : 'Las herramientas no están disponibles' }),
```

- [ ] **Step 4: Cambiar `propiedades.js`**

La firma gana `alEditarPixel = null`. En `deElemento`, dentro de `h('div', { class: 'acciones' }, ...)`, antes del botón de eliminar:

```js
        esImagen && elemento.origen === 'creado' && alEditarPixel
          ? h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'editar-pixel' }, onclick: () => alEditarPixel(elemento.id) }, 'Editar en pixel art')
          : null,
```

- [ ] **Step 5: Cambiar `editor.js`**

Importar `{ crearElementoCreado, reemplazarArchivoCreado } from './creados.js'`. La firma gana `crearHerramientas = null`. Agregar la capa `const zonaHerramienta = h('div', { class: 'capa-herramienta', hidden: true });` (en el `append`, entre `zonaBiblioteca` y `zonaMapa`) y, justo después del `append`, `const herramientas = crearHerramientas ? crearHerramientas(zonaHerramienta) : null;`. El inventario recibe `alCrear: herramientas ? (clave) => crearConHerramienta(clave) : null`; propiedades recibe `alEditarPixel: herramientas ? (id) => editarPixel(id) : null`. `elegirTipo` acepta un título: `function elegirTipo(tipos, nombre, titulo = \`¿Qué es «${nombre}»?\`)` y usa `titulo` en el `h2`. Antes del arranque:

```js
  // ---- herramientas de creación (spec, sección 9) ----
  const NOMBRES_CREADO = { fondo: 'Fondo creado', retrato: 'Retrato creado', voz: 'Grabación', efecto: 'Efecto grabado', musica: 'Pista' };

  function nombreCreado(tipo) {
    const n = sesion.proyecto.juego.elementos.filter((e) => e.tipo === tipo && e.origen === 'creado').length + 1;
    return `${NOMBRES_CREADO[tipo]} ${n}`;
  }

  async function conHerramientaAbierta(fn) {
    document.body.classList.add('con-herramienta');
    try {
      return await fn();
    } finally {
      document.body.classList.remove('con-herramienta');
    }
  }

  /** Abre la herramienta pedida ('pixel', 'grabar' o 'secuencia') y mete lo que devuelva como elemento creado. */
  async function crearConHerramienta(clave) {
    let tipo;
    let blob;
    if (clave === 'pixel') {
      tipo = await elegirTipo(['fondo', 'retrato'], null, '¿Qué vas a dibujar?');
      if (!tipo) return;
      blob = await conHerramientaAbierta(() => herramientas.pixelart.abrir({ tipo }));
    } else if (clave === 'grabar') {
      tipo = await elegirTipo(['voz', 'efecto'], null, '¿Qué vas a grabar?');
      if (!tipo) return;
      blob = await conHerramientaAbierta(() => herramientas.grabador.abrir({ alSubirEnSuLugar: () => subirArchivo() }));
    } else if (clave === 'secuencia') {
      tipo = 'musica';
      blob = await conHerramientaAbierta(() => herramientas.secuenciador.abrir());
    } else {
      return;
    }
    if (!blob) return;
    try {
      const elemento = await crearElementoCreado(sesion, blob, { tipo, nombre: nombreCreado(tipo) });
      seleccionar({ tipo: 'elemento', id: elemento.id }, { enfocar: `ficha:${elemento.id}` });
      avisar(`«${elemento.nombre}» entró al juego como obra tuya, con sello de creación.`);
    } catch (error) {
      mostrarError(error);
    }
  }

  /** Reabre un fondo o retrato creado dentro en el pixel art; al guardar se reemplaza el archivo y se recalcula el sello. */
  async function editarPixel(id) {
    const elemento = sesion.proyecto.juego.elementos.find((e) => e.id === id);
    if (!elemento) return;
    const blob = await conHerramientaAbierta(() => herramientas.pixelart.abrir({ tipo: elemento.tipo, archivo: sesion.archivos.get(id) ?? null }));
    if (!blob) return;
    try {
      await reemplazarArchivoCreado(sesion, id, blob);
      seleccionar({ tipo: 'elemento', id });
      avisar(`«${elemento.nombre}» se actualizó, con un sello de creación nuevo.`);
    } catch (error) {
      mostrarError(error);
    }
  }
```

Y exponer `crearConHerramienta` y `editarPixel` en el objeto devuelto.

- [ ] **Step 6: Cambiar `app.js`**

Importar `crearPixelArt`, `crearGrabador` y `crearSecuenciador`. Variable de módulo `let paletaActual = null;`. En `arrancar`, después de cargar el catálogo:

```js
  try {
    const respuesta = await fetch(new URL('../contenido/paleta.json', import.meta.url));
    if (!respuesta.ok) throw new Error(`paleta.json (${respuesta.status})`);
    paletaActual = (await respuesta.json()).colores;
  } catch (error) {
    avisoBiblioteca = [avisoBiblioteca, `Las herramientas de creación no están disponibles: ${error.message}`].filter(Boolean).join(' ');
  }
```

Y en `mostrarEditor`, la opción:

```js
    crearHerramientas: paletaActual ? (zona) => ({
      pixelart: crearPixelArt(zona, { paleta: paletaActual }),
      grabador: crearGrabador(zona),
      secuenciador: crearSecuenciador(zona),
    }) : null,
```

- [ ] **Step 7: Estilos en `editor.css`**

Antes del bloque de pantallas angostas, el bloque `/* ---------- Herramientas de creación ---------- */` con la capa `.capa-herramienta`, el panel `.herramienta`, la barra y la paleta del pixel art (`.pixel-barra`, `.pixel-paleta` de 16 columnas de 28 px, `.pixel-color` con borde al estar pulsado, `.pixel-marco` con desplazamiento y `.pixel-lienzo` con `image-rendering: pixelated` y `touch-action: none`), la rejilla del secuenciador (`.secuenciador-fila`, `.paso` de 30 px, `.paso-activo`, `.paso-compas` con margen), los controles del grabador (`.grabador-estado`, `.grabador-error`, `.grabador-onda` a ancho completo, `.campo-rango`) y `body.con-herramienta { overflow: hidden; }`. El bloque completo está en `plataforma/css/editor.css`.

- [ ] **Step 8: Correr las pruebas para ver que pasan**

Run: `node --test tests/inventario.test.js tests/propiedades.test.js tests/editor.test.js`
Expected: `# pass 34` (8 + 9 + 17).

- [ ] **Step 9: Commit**

```bash
git add plataforma/js/editor/inventario.js tests/inventario.test.js plataforma/js/editor/propiedades.js tests/propiedades.test.js plataforma/js/editor/editor.js tests/editor.test.js plataforma/js/app.js plataforma/css/editor.css
git commit -m "Editor: botones de crear, apertura de las herramientas, alta con sello y reabrir un pixel art" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Cierre del plan: suite, comprobación manual y README

**Files:**
- Modify: `plataforma/README.md`

- [ ] **Step 1: Correr toda la suite**

Run: `npm test`
Expected: 299 pruebas, `# fail 0` (259 del plan 4 + 6 audio + 5 secuencia + 5 pixel + 6 pixel art + 5 secuenciador + 5 grabador + 3 creados + 1 inventario + 1 propiedades + 3 editor).

- [ ] **Step 2: Comprobación manual en el navegador**

Run en segundo plano: `node tests/manual/servir.js`. Abrir `http://localhost:8080/plataforma/`, empezar un juego y recorrer:

1. **Pixel art.** «Pixel art» → «Retrato»: se ve el lienzo con damero, la paleta y las herramientas. Dibujar con el ratón, cambiar de color, rellenar, usar el cuentagotas, deshacer y rehacer, cambiar el zoom, mover el cursor con flechas y pintar con Enter. Guardar: el retrato aparece en el inventario con punto verde, la ficha muestra la nota del sello y la vista en propiedades se ve pixelada. «Editar en pixel art» reabre el dibujo con sus colores; guardar actualiza el sello (la fecha cambia).
2. **Secuenciador.** Poner notas en bajo, melodía y acorde y golpes de percusión; «Tocar en bucle» suena y se reinicia al editar; cambiar el tempo; Guardar crea «Pista 1». Asignarla a la escena y jugar: suena en bucle.
3. **Grabador.** «Grabar» → «Voz»: el navegador pide permiso al micrófono (en localhost sí lo pide). Grabar unos segundos, detener, ver la forma de onda, escuchar, mover las manijas y guardar: entra como «Grabación 1» (WAV si se recortó). Negar el permiso en otra prueba: aparece la explicación y «Subir un archivo en su lugar» abre la subida.
4. **Fichas y mapa.** Las tres piezas creadas están en verde con «Sello de la plataforma» como prueba; el mapa de activos las lista con «Yo» como creador.
5. **Teclado.** Las herramientas se recorren con Tab; Escape las cierra sin crear nada.

Detener el servidor al terminar. Si algo falla, corregirlo en el módulo que corresponde, con su prueba.

- [ ] **Step 3: Actualizar `plataforma/README.md`**

En `## Estado`, reemplazar la última frase «Faltan las herramientas de creación (plan 5) y la publicación (plan 6).» por:

```markdown
El plan 5 agrega las tres herramientas de creación: pixel art con la paleta fija, grabador
con el micrófono y secuenciador de dos compases; lo que producen entra con sello de fecha y
huella. Falta la publicación (plan 6).
```

En «Cómo está armado el código», agregar después de la línea de `js/editor/`:

```markdown
- `js/herramientas/`: `pixel.js`, `secuencia.js` y `audio-util.js` son puros (se prueban en Node); `pixelart.js`, `secuenciador.js` y `grabador.js` son las vistas, con canvas, Web Audio y micrófono inyectables.
```

- [ ] **Step 4: Commit**

```bash
git add plataforma/README.md
git commit -m "Cierre del plan 5: README con las herramientas de creación" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Autorrevisión del plan contra el spec

**Cobertura.** Sección 9, pixel art: lienzo fijo de 64×64 y 192×108 (`TAMANOS`), paleta de `contenido/paleta.json`, lápiz, borrador, relleno, cuentagotas, deshacer y rehacer de veinte pasos, zoom, PNG, reabrir para editar con sello actualizado (tareas 3, 4 y 7). Grabador: micrófono, grabar, detener, escuchar, recorte con dos manijas sobre la forma de onda, máximo de treinta segundos, WebM/Opus con alternativa MP4/AAC, voces y efectos (tareas 1 y 6). Secuenciador: dos compases de ocho pasos, cuatro instrumentos sintetizados, tempo de 80 a 160, pentatónica, bucle mientras se edita, WAV al guardar (tareas 2 y 5). Sello de creación con fecha, hora y huella, autoría «yo» (tarea 7 con `crearElementoCreado`; `crearFicha` ya ponía la prueba en «sello»). Sección 15.3 (`abrir(opciones) → Promise<Blob | null>`): las tres vistas. Sección 17 (micrófono sin permiso): tarea 6. Sección 16 (teclado): cursor del lienzo, botones de la rejilla y controles de rango.

**Lo que queda fuera y dónde va.** El recorrido Playwright con micrófono simulado: plan 6. Un contador en vivo del tiempo de grabación: no lo pide el spec; el límite de treinta segundos sí se aplica.

**Placeholders.** Ninguno: las tareas 1 a 6 traen el código completo; la 7 dice qué texto cambiar.

**Consistencia de nombres.** `codificarWav(muestras, frecuencia)`, `formaDeOnda(muestras, columnas)`, `recortar(muestras, frecuencia, inicio, fin)`, `elegirFormato(soporta)`. `crearPatron`, `alternar(patron, instrumento, paso, direccion)`, `fijarTempo`, `renderizar(patron, frecuencia)`. `crearLienzo`, `pintar`, `borrar`, `rellenar`, `tomar`, `linea`, `crearHistorial(lienzo, limite)`, `aRgba`, `desdeRgba`. `crearPixelArt(contenedor, { paleta, crearContexto, codificarPng, decodificarPng }).abrir({ tipo, archivo })`, `crearSecuenciador(contenedor, { crearAudioContext }).abrir()`, `crearGrabador(contenedor, deps).abrir({ alSubirEnSuLugar })`. `crearElementoCreado(sesion, blob, { tipo, nombre })`, `reemplazarArchivoCreado(sesion, id, blob)`. `crearInventario(..., { alCrear })`, `crearPropiedades(..., { alEditarPixel })`, `crearEditor(..., { crearHerramientas })`.
