# Plan 4 de 6: Biblioteca — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar a la plataforma su biblioteca (spec, sección 11): un catálogo con fondos, retratos, pistas y efectos con licencias de la tabla, el selector en el editor que mete una pieza al juego con su ficha precargada, la licencia del curso, los créditos del catálogo, y la revelación honesta de las piezas simuladas en «ver más».

**Architecture:** `biblioteca/catalogo.js` valida el catálogo (forma, licencias, mínimos y reglas de mezcla del spec) y carga las piezas; es puro salvo `fetch`, que se inyecta. `editor/biblioteca.js` tiene el selector (una capa como el mapa) y `tomarPieza`, que mete la pieza al proyecto igual que `subirElemento`. El catálogo que deja este plan es **provisional**: sus piezas las genera un programa (`scripts/generar-biblioteca-provisional.js`) con una paleta fija, y el catálogo lo dice en cada entrada (`simulado`) y en `CREDITOS.md`. Reemplazarlo por piezas reales de repositorios abiertos es una tarea de contenido, con lista de verificación al final del plan, que no cambia el código.

**Tech Stack:** El de los planes anteriores. Los generadores de PNG y WAV son Node puro (`zlib` para el PNG), sin dependencias nuevas. Spec: secciones 11, 12.2 (crédito precargado), 12.9 y 15.3 (`biblioteca/catalogo.js`).

---

## Mapa de planes

| Plan | Qué construye | Sección del spec |
|---|---|---|
| 1. Núcleo (hecho) | Modelo, fichas, licencias, semáforo, contenido jurídico, almacén, copias | 6, 12.2–12.5, 12.9, 13 |
| 2. Motor y editor (hecho) | Reproductor, `index.html`, arranque, inventario, guion, vista previa, propiedades, subida, copias | 3, 7, 8, 10, 13, 15.4, 16, 17 |
| 3. Fichas en pantalla (hecho) | Panel de ficha, semáforos en el inventario, mapa de activos, créditos, foco al subir | 10, 12.1–12.6, 12.8, 12.9, 19.13 |
| **4. Biblioteca (este)** | Catálogo validado, selector en el editor, licencia del curso, créditos del catálogo, piezas simuladas reveladas, paleta de 16 colores | 11, 12.2, 9 (paleta) |
| 5. Herramientas | Pixel art (usa `contenido/paleta.json`), grabador, secuenciador | 9 |
| 6. Publicación | Decisión de registro, informe, paquete de entrega, recorrido Playwright | 12.7, 14, 18 |

**Decisiones que este plan fija y el spec no decía:**

- **Catálogo provisional generado por programa.** El spec pide piezas de repositorios abiertos verificadas en la fuente. Reunirlas exige descargar archivos y cotejar licencias una por una, cosa que el docente debe aprobar y revisar. Mientras tanto, el programa genera 34 piezas (8 fondos, 8 retratos, 6 pistas, 12 efectos) con la paleta de 16 colores, las publica bajo CC0 (no tienen autor humano) y el catálogo las **presenta** con las licencias de la tabla para que el ejercicio funcione. Cada entrada así lleva `simulado` con su licencia y origen reales, el catálogo lleva `provisional: true`, y la ficha lo revela en «ver más». No se inventa ningún autor: el autor mostrado es «Programa generador del taller» y la fuente es el propio script.
- **Reglas del catálogo que valida el código:** ids únicos; tipos `fondo`, `retrato`, `musica`, `efecto`; licencia de la tabla (nunca `OTRA`); `condiciones` iguales a las del código de licencia; archivo en la carpeta de su tipo con extensión de imagen o de audio según el tipo; `CURSO` y `DESCONOCIDO` exigen `simulado` con licencia real `CC0` o `DP`; `simulado` en otras licencias solo si el catálogo es provisional; ningún audio con `ND` (spec 11 y 19.10); mínimos y mezcla de la sección 11.
- **Crédito sugerido** por licencia: «Título», autor, licencia abreviada (CC BY 4.0, CC0, dominio público, etc.); vacío para `DESCONOCIDO` (no hay a quién acreditar) y «licencia limitada al curso» para `CURSO`.
- **La paleta** `contenido/paleta.json` (spec 9) se define aquí, porque el generador la necesita; el pixel art del plan 5 la reutiliza.
- **Licencia del curso.** `biblioteca/LICENCIA-CURSO.md` dice qué permite (usar la pieza dentro de la plataforma y del curso) y qué no (publicar fuera, gratis o vendido; sublicenciar), y aclara que es un ejercicio sobre piezas que en realidad son CC0.
- **Selector.** Una capa sobre el editor con filtros por tipo, tarjetas con vista previa (imagen o audio), licencia y condiciones, y «Usar». Al elegir, la pieza entra con `origen: 'biblioteca'` y la ficha precargada por `crearFicha`; el panel queda con el foco en la ficha.
- **Si el catálogo no carga** (archivo ausente o inválido), el editor avisa y el botón «Biblioteca» queda deshabilitado; nada más se bloquea.

## Convenciones de este plan

- Las de los planes 2 y 3. Los archivos binarios generados se guardan en el repositorio (GitHub Pages los sirve tal cual) y `.gitattributes` ya los marca como binarios.
- El generador es determinista: la misma semilla produce los mismos bytes, así `git diff` no cambia si se vuelve a correr.
- Conteo de pruebas: el plan 3 dejó 236. Cada tarea dice cuántas agrega; el cierre espera 259.

## Estructura de archivos que deja este plan

```
plataforma/
  biblioteca/
    catalogo.json                   catálogo (provisional) con 34 piezas
    CREDITOS.md                     generado desde el catálogo por scripts/creditos-biblioteca.js
    LICENCIA-CURSO.md               texto de la licencia limitada al curso
    fondos/*.png  retratos/*.png  musica/*.wav  efectos/*.wav
  contenido/paleta.json             16 colores con nombre
  css/editor.css                    + selector de biblioteca
  js/
    biblioteca/catalogo.js          validarCatalogo, faltantesDelMinimo, entradaDeFicha, crearCatalogo
    editor/biblioteca.js            crearBiblioteca (selector) y tomarPieza
    editor/inventario.js            (cambia) botón «Biblioteca»
    editor/panel-ficha.js           (cambia) pieza de biblioteca, «ver más» con lo simulado, enlace a la licencia del curso
    editor/propiedades.js           (cambia) pasa piezaDe a las fichas
    editor/editor.js                (cambia) selector, tomar pieza, aviso si no hay catálogo
    js/app.js                       (cambia) carga el catálogo
scripts/
  png-wav.js                        escritores de PNG (RGBA) y WAV (16 bits mono)
  generar-biblioteca-provisional.js genera piezas y catalogo.json
  creditos-biblioteca.js            genera CREDITOS.md
tests/
  ayudas/catalogo.js                catalogoDePrueba() válido y mínimo
  catalogo.test.js  png-wav.test.js  biblioteca-real.test.js  biblioteca.test.js
  inventario.test.js  panel-ficha.test.js  editor.test.js   (cambian)
```

---

### Task 1: Validación y carga del catálogo

**Files:**
- Create: `plataforma/js/biblioteca/catalogo.js`
- Create: `tests/ayudas/catalogo.js`
- Create: `tests/catalogo.test.js`

- [ ] **Step 1: Escribir la ayuda `tests/ayudas/catalogo.js`**

Un catálogo válido que cumple justo los mínimos y la mezcla, con archivos ficticios.

```js
// tests/ayudas/catalogo.js
// Catálogo de prueba: cumple los mínimos y la mezcla de la sección 11 con piezas ficticias.
const SIMULADO = { licencia: 'CC0', autor: 'Generada por programa, sin autor humano', fuente: 'scripts/prueba.js' };

function pieza(id, tipo, titulo, licencia, extra = {}) {
  const carpeta = { fondo: 'fondos', retrato: 'retratos', musica: 'musica', efecto: 'efectos' }[tipo];
  const ext = tipo === 'fondo' || tipo === 'retrato' ? 'png' : 'wav';
  const condiciones = { DP: [], CC0: [], 'CC-BY-4.0': ['BY'], 'CC-BY-SA-4.0': ['BY', 'SA'], 'CC-BY-NC-4.0': ['BY', 'NC'], 'CC-BY-ND-4.0': ['BY', 'ND'], CURSO: [], DESCONOCIDO: [] }[licencia];
  return {
    id, tipo, titulo,
    autor: licencia === 'DESCONOCIDO' ? 'Desconocido' : 'Autora de Prueba',
    fuente: 'https://ejemplo.test/piezas/' + id,
    licencia, condiciones,
    archivo: `${carpeta}/${id}.${ext}`,
    creditoSugerido: licencia === 'DESCONOCIDO' ? '' : `«${titulo}», Autora de Prueba, ${licencia}`,
    ...(licencia === 'CURSO' || licencia === 'DESCONOCIDO' ? { simulado: SIMULADO } : {}),
    ...extra,
  };
}

export function catalogoDePrueba() {
  const piezas = [];
  const fondos = ['CC-BY-4.0', 'CC0', 'CC-BY-SA-4.0', 'CC-BY-ND-4.0', 'DP', 'CC-BY-4.0', 'CURSO', 'DESCONOCIDO'];
  const retratos = ['CC-BY-4.0', 'CC0', 'CC-BY-SA-4.0', 'CC-BY-ND-4.0', 'DP', 'CC-BY-4.0', 'CURSO', 'DESCONOCIDO'];
  const musica = ['CC-BY-4.0', 'CC0', 'CC-BY-NC-4.0', 'DP', 'CC-BY-SA-4.0', 'CURSO'];
  const efectos = ['CC-BY-4.0', 'CC0', 'CC-BY-NC-4.0', 'DP', 'CC-BY-4.0', 'CC0', 'CC-BY-SA-4.0', 'CC-BY-4.0', 'CC0', 'DP', 'CURSO', 'DESCONOCIDO'];
  fondos.forEach((l, i) => piezas.push(pieza(`bib_f${i + 1}`, 'fondo', `Fondo ${i + 1}`, l)));
  retratos.forEach((l, i) => piezas.push(pieza(`bib_r${i + 1}`, 'retrato', `Retrato ${i + 1}`, l)));
  musica.forEach((l, i) => piezas.push(pieza(`bib_m${i + 1}`, 'musica', `Pista ${i + 1}`, l)));
  efectos.forEach((l, i) => piezas.push(pieza(`bib_e${i + 1}`, 'efecto', `Efecto ${i + 1}`, l)));
  return { version: 1, provisional: false, piezas };
}

export { pieza };
```

- [ ] **Step 2: Escribir las pruebas que fallan**

```js
// tests/catalogo.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalogoDePrueba, pieza } from './ayudas/catalogo.js';
import { validarCatalogo, faltantesDelMinimo, entradaDeFicha, crearCatalogo, MINIMO_CATALOGO, CARPETAS } from '../plataforma/js/biblioteca/catalogo.js';
import { crearFicha } from '../plataforma/js/juridico/ficha.js';

test('un catálogo bien formado no tiene problemas ni faltantes', () => {
  const catalogo = catalogoDePrueba();
  assert.deepEqual(validarCatalogo(catalogo), []);
  assert.deepEqual(faltantesDelMinimo(catalogo), []);
  assert.equal(catalogo.piezas.length, 34);
  assert.deepEqual(MINIMO_CATALOGO, { fondo: 8, retrato: 8, musica: 6, efecto: 12 });
  assert.deepEqual(CARPETAS, { fondo: 'fondos', retrato: 'retratos', musica: 'musica', efecto: 'efectos' });
});

test('validarCatalogo enumera los problemas de forma sin lanzar', () => {
  assert.deepEqual(validarCatalogo(null), ['el catálogo no es un objeto']);
  assert.deepEqual(validarCatalogo({ version: 1 }), ['el catálogo no tiene lista de piezas']);
  const problemasDe = (modificar) => { const c = catalogoDePrueba(); modificar(c); return validarCatalogo(c); };
  assert.ok(problemasDe((c) => { c.piezas[1].id = c.piezas[0].id; }).some((m) => /repetido/.test(m)), 'id repetido');
  assert.ok(problemasDe((c) => { c.piezas[0].tipo = 'voz'; }).some((m) => /tipo «voz» no es de biblioteca/.test(m)), 'tipo');
  assert.ok(problemasDe((c) => { c.piezas[0].licencia = 'OTRA'; }).some((m) => /licencia «OTRA»/.test(m)), 'OTRA no va en el catálogo');
  assert.ok(problemasDe((c) => { c.piezas[0].licencia = 'MIT'; }).some((m) => /licencia «MIT»/.test(m)), 'licencia desconocida');
  assert.ok(problemasDe((c) => { c.piezas[0].condiciones = ['NC']; }).some((m) => /condiciones .* no son las de CC-BY-4\.0/.test(m)), 'condiciones');
  assert.ok(problemasDe((c) => { c.piezas[0].archivo = 'retratos/x.png'; }).some((m) => /carpeta «fondos»/.test(m)), 'carpeta');
  assert.ok(problemasDe((c) => { c.piezas[0].archivo = 'fondos/x.wav'; }).some((m) => /extensión/.test(m)), 'extensión de imagen');
  assert.ok(problemasDe((c) => { c.piezas[16].archivo = 'musica/x.png'; }).some((m) => /extensión/.test(m)), 'extensión de audio');
  assert.ok(problemasDe((c) => { c.piezas[0].titulo = ' '; }).some((m) => /título/.test(m)), 'título vacío');
  assert.ok(problemasDe((c) => { delete c.piezas[0].fuente; }).some((m) => /fuente/.test(m)), 'fuente');
  assert.ok(problemasDe((c) => { c.piezas[0].creditoSugerido = 3; }).some((m) => /crédito/.test(m)), 'crédito');
  assert.ok(problemasDe((c) => { delete c.piezas[6].simulado; }).some((m) => /CURSO.*simulado/.test(m)), 'CURSO sin simulado');
  assert.ok(problemasDe((c) => { c.piezas[7].simulado = { licencia: 'CC-BY-4.0', autor: 'x', fuente: 'y' }; }).some((m) => /simulado.*CC0 o DP/.test(m)), 'simulado con licencia que no se puede distribuir');
  assert.ok(problemasDe((c) => { c.piezas[0].simulado = { licencia: 'CC0', autor: 'x', fuente: 'y' }; }).some((m) => /solo .* provisional/.test(m)), 'simulado fuera de CURSO/DESCONOCIDO sin catálogo provisional');
  assert.deepEqual(problemasDe((c) => { c.provisional = true; c.piezas[0].simulado = { licencia: 'CC0', autor: 'x', fuente: 'y' }; }), [], 'con catálogo provisional sí');
  assert.ok(problemasDe((c) => { c.piezas[16].licencia = 'CC-BY-ND-4.0'; c.piezas[16].condiciones = ['BY', 'ND']; }).some((m) => /audio sin derivadas/.test(m)), 'audio con ND');
});

test('faltantesDelMinimo exige las cantidades y la mezcla de la sección 11', () => {
  const faltantesDe = (modificar) => { const c = catalogoDePrueba(); modificar(c); return faltantesDelMinimo(c).map((f) => f.codigo); };
  assert.deepEqual(faltantesDe((c) => { c.piezas = c.piezas.filter((p) => p.id !== 'bib_f1'); }), ['M_FONDO'], 'quedan otros CC-BY en fondos: solo falta la cantidad');
  assert.ok(faltantesDe((c) => { c.piezas = c.piezas.filter((p) => p.tipo !== 'efecto').concat(c.piezas.filter((p) => p.tipo === 'efecto').slice(0, 11)); }).includes('M_EFECTO'));
  assert.ok(faltantesDe((c) => { for (const p of c.piezas) if (p.tipo === 'musica' && p.licencia === 'CC-BY-NC-4.0') { p.licencia = 'CC-BY-4.0'; p.condiciones = ['BY']; } }).includes('MEZCLA_NC_MUSICA'));
  assert.ok(faltantesDe((c) => { for (const p of c.piezas) if (p.licencia === 'CC-BY-ND-4.0') { p.licencia = 'CC-BY-4.0'; p.condiciones = ['BY']; } }).includes('MEZCLA_ND_IMAGEN'));
  assert.ok(faltantesDe((c) => { for (const p of c.piezas) if (p.licencia === 'CC-BY-SA-4.0' && (p.tipo === 'fondo' || p.tipo === 'retrato')) { p.licencia = 'CC-BY-4.0'; p.condiciones = ['BY']; } }).includes('MEZCLA_SA_IMAGEN'));
  assert.ok(faltantesDe((c) => { for (const p of c.piezas) if (p.licencia === 'CURSO') { p.licencia = 'CC0'; delete p.simulado; } }).includes('MEZCLA_CURSO'));
  assert.ok(faltantesDe((c) => { for (const p of c.piezas) if (p.licencia === 'DESCONOCIDO') { p.licencia = 'CC0'; delete p.simulado; p.autor = 'A'; } }).includes('MEZCLA_DESCONOCIDO'));
  assert.ok(faltantesDe((c) => { for (const p of c.piezas) if (p.tipo === 'retrato' && (p.licencia === 'CC0' || p.licencia === 'DP')) { p.licencia = 'CC-BY-4.0'; p.condiciones = ['BY']; } }).includes('MEZCLA_LIBRE_retrato'));
  const faltantes = faltantesDelMinimo({ version: 1, piezas: [] });
  assert.equal(faltantes.find((f) => f.codigo === 'M_FONDO').mensaje, 'Fondos: 0 de 8.');
});

test('entradaDeFicha da lo que crearFicha espera de una pieza de biblioteca', () => {
  const p = pieza('bib_x', 'musica', 'Tema', 'CC-BY-NC-4.0');
  const entrada = entradaDeFicha(p);
  assert.deepEqual(entrada, { id: 'bib_x', autor: 'Autora de Prueba', licencia: 'CC-BY-NC-4.0', creditoSugerido: '«Tema», Autora de Prueba, CC-BY-NC-4.0' });
  const ficha = crearFicha('musica', { origen: 'biblioteca', biblioteca: entrada });
  assert.equal(ficha.licencia, 'CC-BY-NC-4.0');
  assert.equal(ficha.credito, entrada.creditoSugerido);
  assert.equal(ficha.autorNombre, 'Autora de Prueba');
});

test('crearCatalogo carga y valida el catálogo, resuelve URLs y trae archivos con su tipo', async () => {
  const datos = catalogoDePrueba();
  const pedidas = [];
  const fetchFalso = async (url) => {
    const texto = String(url);
    pedidas.push(texto);
    if (texto.endsWith('catalogo.json')) return { ok: true, json: async () => datos };
    if (texto.endsWith('.png') || texto.endsWith('.wav')) return { ok: true, arrayBuffer: async () => new TextEncoder().encode(`bytes de ${texto}`).buffer };
    return { ok: false, status: 404 };
  };
  const catalogo = crearCatalogo({ url: 'http://localhost/plataforma/biblioteca/catalogo.json', fetch: fetchFalso });
  const cargado = await catalogo.cargar();
  assert.equal(cargado.piezas.length, 34);
  assert.deepEqual(catalogo.piezas().map((p) => p.id).slice(0, 2), ['bib_f1', 'bib_f2']);
  assert.equal(catalogo.piezaDe('bib_m1').titulo, 'Pista 1');
  assert.equal(catalogo.piezaDe('nada'), null);
  assert.equal(catalogo.urlDe(catalogo.piezaDe('bib_f1')), 'http://localhost/plataforma/biblioteca/fondos/bib_f1.png');
  const archivo = await catalogo.obtenerArchivo('bib_m1');
  assert.equal(archivo.tipo, 'audio/wav');
  assert.equal(new TextDecoder().decode(archivo.datos), 'bytes de http://localhost/plataforma/biblioteca/musica/bib_m1.wav');
  await assert.rejects(catalogo.obtenerArchivo('nada'), /no está en el catálogo/);
  assert.equal(pedidas.length, 2, 'cargar se hace una sola vez');
  await catalogo.cargar();
  assert.equal(pedidas.length, 2);
});

test('crearCatalogo rechaza un catálogo ausente o inválido con un mensaje para la interfaz', async () => {
  const ausente = crearCatalogo({ url: 'http://localhost/x/catalogo.json', fetch: async () => ({ ok: false, status: 404 }) });
  await assert.rejects(ausente.cargar(), (e) => e.codigo === 'catalogo' && /404/.test(e.message));
  const invalido = crearCatalogo({ url: 'http://localhost/x/catalogo.json', fetch: async () => ({ ok: true, json: async () => ({ version: 1, piezas: [{ id: 'a' }] }) }) });
  await assert.rejects(invalido.cargar(), (e) => e.codigo === 'catalogo' && Array.isArray(e.problemas) && e.problemas.length > 0);
  assert.equal(invalido.piezas().length, 0, 'sin cargar, no hay piezas');
});
```

- [ ] **Step 3: Correr las pruebas para ver que fallan**

Run: `node --test tests/catalogo.test.js`
Expected: falla al importar `catalogo.js`.

- [ ] **Step 4: Escribir `plataforma/js/biblioteca/catalogo.js`**

```js
// plataforma/js/biblioteca/catalogo.js
// El catálogo de la biblioteca (spec, sección 11): qué forma tiene, qué mínimos y
// mezcla de licencias exige, y cómo se cargan las piezas. Puro salvo fetch, que se
// inyecta. Las piezas CURSO y DESCONOCIDO son en realidad CC0 o dominio público y lo
// dicen en `simulado`; un catálogo `provisional` puede simular también las demás.
import { LICENCIAS } from '../juridico/licencias.js';
import { mimePorExtension } from '../estado/archivos.js';

export const MINIMO_CATALOGO = { fondo: 8, retrato: 8, musica: 6, efecto: 12 };
export const CARPETAS = { fondo: 'fondos', retrato: 'retratos', musica: 'musica', efecto: 'efectos' };
export const TIPOS_BIBLIOTECA = Object.keys(MINIMO_CATALOGO);
const NOMBRES = { fondo: 'Fondos', retrato: 'Retratos', musica: 'Pistas musicales', efecto: 'Efectos de sonido' };
const EXTENSIONES = { imagen: ['png', 'jpg', 'jpeg', 'webp'], audio: ['mp3', 'ogg', 'wav'] };
const LIBRES = ['CC0', 'DP'];
const SIMULADAS = ['CURSO', 'DESCONOCIDO'];
const NOMBRE_ARCHIVO = /^[a-z]+\/[\w.-]+\.[a-z0-9]+$/;

const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const texto = (v) => typeof v === 'string' && v.trim() !== '';
export const medioDeTipo = (tipo) => (tipo === 'fondo' || tipo === 'retrato' ? 'imagen' : 'audio');

/** Problemas de forma del catálogo, sin lanzar. Vacío si está bien. */
export function validarCatalogo(catalogo) {
  if (!esObjeto(catalogo)) return ['el catálogo no es un objeto'];
  if (!Array.isArray(catalogo.piezas)) return ['el catálogo no tiene lista de piezas'];
  const problemas = [];
  const ids = new Set();
  catalogo.piezas.forEach((pieza, i) => {
    const etiqueta = `la pieza ${esObjeto(pieza) && texto(pieza.id) ? `«${pieza.id}»` : `n.º ${i + 1}`}`;
    if (!esObjeto(pieza) || !texto(pieza.id)) {
      problemas.push(`${etiqueta} no tiene identificador`);
      return;
    }
    if (ids.has(pieza.id)) problemas.push(`el identificador «${pieza.id}» está repetido`);
    ids.add(pieza.id);
    if (!TIPOS_BIBLIOTECA.includes(pieza.tipo)) problemas.push(`${etiqueta}: el tipo «${pieza.tipo}» no es de biblioteca`);
    if (!texto(pieza.titulo)) problemas.push(`${etiqueta} no tiene título`);
    if (!texto(pieza.autor)) problemas.push(`${etiqueta} no tiene autor`);
    if (!texto(pieza.fuente)) problemas.push(`${etiqueta} no tiene fuente`);
    if (typeof pieza.creditoSugerido !== 'string') problemas.push(`${etiqueta}: el crédito sugerido no es texto`);
    const licencia = LICENCIAS[pieza.licencia];
    if (!licencia || pieza.licencia === 'OTRA') {
      problemas.push(`${etiqueta}: la licencia «${pieza.licencia}» no va en el catálogo`);
    } else {
      const esperadas = licencia.condiciones ?? [];
      const dadas = Array.isArray(pieza.condiciones) ? pieza.condiciones : null;
      if (!dadas || dadas.length !== esperadas.length || !esperadas.every((c) => dadas.includes(c))) {
        problemas.push(`${etiqueta}: las condiciones ${JSON.stringify(pieza.condiciones)} no son las de ${pieza.licencia}`);
      }
      if (pieza.licencia === 'CC-BY-ND-4.0' && medioDeTipo(pieza.tipo) === 'audio') problemas.push(`${etiqueta}: el catálogo no lleva audio sin derivadas (ND)`);
      if (SIMULADAS.includes(pieza.licencia) && !esObjeto(pieza.simulado)) problemas.push(`${etiqueta}: una pieza ${pieza.licencia} necesita «simulado» con su licencia y fuente reales`);
      if (esObjeto(pieza.simulado)) {
        if (!LIBRES.includes(pieza.simulado.licencia)) problemas.push(`${etiqueta}: lo simulado debe ser CC0 o DP para poder distribuirse`);
        if (!texto(pieza.simulado.autor) || !texto(pieza.simulado.fuente)) problemas.push(`${etiqueta}: «simulado» necesita autor y fuente reales`);
        if (!SIMULADAS.includes(pieza.licencia) && catalogo.provisional !== true) problemas.push(`${etiqueta}: solo un catálogo provisional simula licencias distintas de CURSO y DESCONOCIDO`);
      }
    }
    if (TIPOS_BIBLIOTECA.includes(pieza.tipo)) {
      if (!texto(pieza.archivo) || !NOMBRE_ARCHIVO.test(pieza.archivo)) {
        problemas.push(`${etiqueta}: el archivo «${pieza.archivo}» no tiene un nombre permitido`);
      } else {
        const [carpeta, nombre] = pieza.archivo.split('/');
        const extension = nombre.split('.').pop().toLowerCase();
        if (carpeta !== CARPETAS[pieza.tipo]) problemas.push(`${etiqueta}: el archivo debe estar en la carpeta «${CARPETAS[pieza.tipo]}»`);
        if (!EXTENSIONES[medioDeTipo(pieza.tipo)].includes(extension)) problemas.push(`${etiqueta}: la extensión «${extension}» no es de ${medioDeTipo(pieza.tipo)}`);
      }
    }
  });
  return problemas;
}

/** Mínimos y mezcla de licencias de la sección 11. Devuelve [{ codigo, mensaje }]. */
export function faltantesDelMinimo(catalogo) {
  const piezas = Array.isArray(catalogo?.piezas) ? catalogo.piezas.filter(esObjeto) : [];
  const faltantes = [];
  const cuenta = (filtro) => piezas.filter(filtro).length;
  for (const tipo of TIPOS_BIBLIOTECA) {
    const actual = cuenta((p) => p.tipo === tipo);
    if (actual < MINIMO_CATALOGO[tipo]) faltantes.push({ codigo: `M_${tipo.toUpperCase()}`, mensaje: `${NOMBRES[tipo]}: ${actual} de ${MINIMO_CATALOGO[tipo]}.` });
    if (!cuenta((p) => p.tipo === tipo && p.licencia === 'CC-BY-4.0')) faltantes.push({ codigo: `MEZCLA_BY_${tipo}`, mensaje: `${NOMBRES[tipo]}: falta una pieza CC-BY-4.0.` });
    if (!cuenta((p) => p.tipo === tipo && LIBRES.includes(p.licencia))) faltantes.push({ codigo: `MEZCLA_LIBRE_${tipo}`, mensaje: `${NOMBRES[tipo]}: falta una pieza CC0 o de dominio público.` });
  }
  const esImagen = (p) => medioDeTipo(p.tipo) === 'imagen';
  if (!cuenta((p) => p.tipo === 'musica' && p.licencia === 'CC-BY-NC-4.0')) faltantes.push({ codigo: 'MEZCLA_NC_MUSICA', mensaje: 'Falta una pista CC-BY-NC-4.0.' });
  if (!cuenta((p) => esImagen(p) && p.licencia === 'CC-BY-ND-4.0')) faltantes.push({ codigo: 'MEZCLA_ND_IMAGEN', mensaje: 'Falta una imagen CC-BY-ND-4.0.' });
  if (!cuenta((p) => esImagen(p) && p.licencia === 'CC-BY-SA-4.0')) faltantes.push({ codigo: 'MEZCLA_SA_IMAGEN', mensaje: 'Falta una imagen CC-BY-SA-4.0.' });
  if (!cuenta((p) => p.licencia === 'CURSO')) faltantes.push({ codigo: 'MEZCLA_CURSO', mensaje: 'Falta una pieza CURSO.' });
  if (!cuenta((p) => p.licencia === 'DESCONOCIDO')) faltantes.push({ codigo: 'MEZCLA_DESCONOCIDO', mensaje: 'Falta una pieza DESCONOCIDO.' });
  return faltantes;
}

/** Lo que crearFicha espera en `biblioteca` al agregar un elemento. */
export function entradaDeFicha(pieza) {
  return { id: pieza.id, autor: pieza.autor, licencia: pieza.licencia, creditoSugerido: pieza.creditoSugerido ?? '' };
}

const falla = (mensaje, extra = {}) => Object.assign(new Error(mensaje), { codigo: 'catalogo', ...extra });

/**
 * @param {{ url?: string|URL, fetch?: typeof fetch }} opciones url del catalogo.json; las piezas se resuelven junto a él.
 */
export function crearCatalogo({ url = new URL('../../biblioteca/catalogo.json', import.meta.url), fetch = globalThis.fetch } = {}) {
  const base = new URL('.', new URL(String(url), 'http://localhost/'));
  const absoluta = (ruta) => new URL(ruta, base).href;
  let catalogo = null;
  let cargando = null;

  async function cargarDeVerdad() {
    const respuesta = await fetch(String(url));
    if (!respuesta.ok) throw falla(`No se pudo cargar el catálogo de la biblioteca (${respuesta.status}).`);
    let datos;
    try {
      datos = await respuesta.json();
    } catch {
      throw falla('El catálogo de la biblioteca está dañado.');
    }
    const problemas = validarCatalogo(datos);
    if (problemas.length) throw falla(`El catálogo de la biblioteca no tiene la forma esperada: ${problemas[0]}${problemas.length > 1 ? ` (y ${problemas.length - 1} más)` : ''}.`, { problemas });
    catalogo = datos;
    return catalogo;
  }

  return {
    cargar() {
      if (catalogo) return Promise.resolve(catalogo);
      cargando ??= cargarDeVerdad().catch((error) => { cargando = null; throw error; });
      return cargando;
    },
    piezas: () => catalogo?.piezas ?? [],
    piezaDe: (id) => catalogo?.piezas.find((p) => p.id === id) ?? null,
    provisional: () => catalogo?.provisional === true,
    urlDe: (pieza) => absoluta(pieza.archivo),
    async obtenerArchivo(id) {
      const pieza = catalogo?.piezas.find((p) => p.id === id);
      if (!pieza) throw falla(`La pieza «${id}» no está en el catálogo.`);
      const respuesta = await fetch(absoluta(pieza.archivo));
      if (!respuesta.ok) throw falla(`No se pudo descargar «${pieza.titulo}» (${respuesta.status}).`);
      return { tipo: mimePorExtension(pieza.archivo), datos: await respuesta.arrayBuffer() };
    },
  };
}
```

- [ ] **Step 5: Correr las pruebas para ver que pasan**

Run: `node --test tests/catalogo.test.js`
Expected: `# pass 6`.

- [ ] **Step 6: Commit**

```bash
git add plataforma/js/biblioteca/catalogo.js tests/ayudas/catalogo.js tests/catalogo.test.js
git commit -m "Biblioteca: validación del catálogo, mínimos y mezcla de licencias, carga de piezas" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Escritores de PNG y WAV, y la paleta de 16 colores

**Files:**
- Create: `scripts/png-wav.js`
- Create: `plataforma/contenido/paleta.json`
- Create: `tests/png-wav.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/png-wav.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { png, wav, lienzo, medidasPng, cabeceraWav } from '../scripts/png-wav.js';

test('png escribe un PNG RGBA válido: firma, IHDR y píxeles recuperables', () => {
  const l = lienzo(3, 2);
  l.relleno([10, 20, 30]);
  l.pinta(2, 1, [200, 100, 50, 128]);
  const bytes = png(3, 2, l.rgba);
  assert.deepEqual(medidasPng(bytes), { ancho: 3, alto: 2 });
  assert.equal(bytes.subarray(12, 16).toString('latin1'), 'IHDR');
  assert.equal(bytes[24], 8, '8 bits');
  assert.equal(bytes[25], 6, 'RGBA');
  const largoIdat = bytes.readUInt32BE(33);
  assert.equal(bytes.subarray(37, 41).toString('latin1'), 'IDAT');
  const filas = inflateSync(bytes.subarray(41, 41 + largoIdat));
  assert.equal(filas.length, (3 * 4 + 1) * 2);
  assert.equal(filas[0], 0, 'filtro ninguno');
  assert.deepEqual([...filas.subarray(1, 5)], [10, 20, 30, 255]);
  assert.deepEqual([...filas.subarray(13 + 9, 13 + 13)], [200, 100, 50, 128], 'último píxel de la segunda fila');
  assert.equal(bytes.subarray(bytes.length - 8, bytes.length - 4).toString('latin1'), 'IEND');
  assert.throws(() => png(2, 2, new Uint8Array(3)), /Se esperaban 16 bytes/);
});

test('wav escribe PCM 16 bits mono con la cabecera correcta y recorta lo que se sale', () => {
  const muestras = new Float32Array([0, 0.5, -0.5, 1.5, -1.5]);
  const bytes = wav(muestras, 22050);
  assert.deepEqual(cabeceraWav(bytes), { canales: 1, frecuencia: 22050, bits: 16, muestras: 5 });
  assert.equal(bytes.length, 44 + 10);
  assert.equal(bytes.readInt16LE(44), 0);
  assert.equal(bytes.readInt16LE(46), Math.round(0.5 * 32767));
  assert.equal(bytes.readInt16LE(48), Math.round(-0.5 * 32767));
  assert.equal(bytes.readInt16LE(50), 32767, 'recortado a 1');
  assert.equal(bytes.readInt16LE(52), -32767, 'recortado a -1');
});

test('el lienzo dibuja rectángulos, círculos y degradados tramados dentro de los bordes', () => {
  const l = lienzo(8, 8);
  l.rect(-2, -2, 4, 4, [1, 1, 1]);
  l.degradado(4, 8, [3, 3, 3], [4, 4, 4]);
  l.circulo(6, 6, 2, [2, 2, 2]);
  const en = (x, y) => l.rgba[(y * 8 + x) * 4];
  assert.equal(en(0, 0), 1);
  assert.equal(en(2, 2), 0, 'fuera del rectángulo recortado');
  assert.equal(en(6, 6), 2);
  assert.equal(en(4, 6), 2, 'borde del círculo');
  assert.ok([3, 4].includes(en(0, 5)));
  assert.equal(en(0, 7), 4, 'al final del degradado domina el color de abajo');
});

test('la paleta tiene dieciséis colores con nombre y hexadecimal distintos', () => {
  const paleta = JSON.parse(readFileSync(new URL('../plataforma/contenido/paleta.json', import.meta.url), 'utf8'));
  assert.equal(paleta.colores.length, 16);
  const hex = paleta.colores.map((c) => c.hex);
  assert.equal(new Set(hex).size, 16);
  for (const c of paleta.colores) {
    assert.match(c.hex, /^#[0-9a-f]{6}$/);
    assert.ok(c.nombre.trim());
  }
  assert.equal(new Set(paleta.colores.map((c) => c.nombre)).size, 16);
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/png-wav.test.js`
Expected: falla al importar `scripts/png-wav.js`.

- [ ] **Step 3: Escribir `plataforma/contenido/paleta.json`**

```json
{
  "nombre": "Paleta del taller",
  "nota": "Dieciséis colores fijos (spec, sección 9). Los usan el pixel art y el generador de la biblioteca provisional.",
  "colores": [
    { "nombre": "noche", "hex": "#1b1f2a" },
    { "nombre": "pizarra", "hex": "#3a4a5c" },
    { "nombre": "niebla", "hex": "#8da1b4" },
    { "nombre": "hueso", "hex": "#f2efe6" },
    { "nombre": "rojo", "hex": "#c92a2a" },
    { "nombre": "naranja", "hex": "#e8762b" },
    { "nombre": "ambar", "hex": "#ffb648" },
    { "nombre": "arena", "hex": "#e9d8a6" },
    { "nombre": "lima", "hex": "#b6ff3b" },
    { "nombre": "musgo", "hex": "#2b8a3e" },
    { "nombre": "pino", "hex": "#1d5c3a" },
    { "nombre": "mar", "hex": "#1f6f8b" },
    { "nombre": "cielo", "hex": "#4cc9f0" },
    { "nombre": "lila", "hex": "#9b5de5" },
    { "nombre": "rosa", "hex": "#ff5c7a" },
    { "nombre": "cacao", "hex": "#5a3a2e" }
  ]
}
```

- [ ] **Step 4: Escribir `scripts/png-wav.js`**

```js
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
```

- [ ] **Step 5: Correr las pruebas para ver que pasan**

Run: `node --test tests/png-wav.test.js`
Expected: `# pass 4`.

- [ ] **Step 6: Commit**

```bash
git add scripts/png-wav.js plataforma/contenido/paleta.json tests/png-wav.test.js
git commit -m "Escritores de PNG y WAV sin dependencias, y paleta de dieciséis colores" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Catálogo provisional generado por programa, licencia del curso y créditos

**Files:**
- Create: `scripts/generar-biblioteca-provisional.js`
- Create: `scripts/creditos-biblioteca.js`
- Create: `plataforma/biblioteca/LICENCIA-CURSO.md`
- Create: `tests/biblioteca-real.test.js`
- Generated: `plataforma/biblioteca/catalogo.json`, `CREDITOS.md`, `fondos/*.png`, `retratos/*.png`, `musica/*.wav`, `efectos/*.wav`

- [ ] **Step 1: Escribir la prueba que falla (`tests/biblioteca-real.test.js`)**

```js
// tests/biblioteca-real.test.js
// El catálogo que de verdad lleva la plataforma: forma, mínimos, archivos y créditos en sincronía.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { validarCatalogo, faltantesDelMinimo, MINIMO_CATALOGO } from '../plataforma/js/biblioteca/catalogo.js';
import { medidasPng, cabeceraWav } from '../scripts/png-wav.js';
import { generarCreditos } from '../scripts/creditos-biblioteca.js';

const BIBLIOTECA = new URL('../plataforma/biblioteca/', import.meta.url);
const catalogo = JSON.parse(readFileSync(new URL('catalogo.json', BIBLIOTECA), 'utf8'));

test('el catálogo real está bien formado, cumple los mínimos y se declara provisional con honestidad', () => {
  assert.deepEqual(validarCatalogo(catalogo), []);
  assert.deepEqual(faltantesDelMinimo(catalogo), []);
  assert.equal(catalogo.provisional, true);
  assert.match(catalogo.nota, /provisional/i);
  for (const [tipo, minimo] of Object.entries(MINIMO_CATALOGO)) {
    assert.ok(catalogo.piezas.filter((p) => p.tipo === tipo).length >= minimo, `${tipo}: al menos ${minimo}`);
  }
  for (const p of catalogo.piezas) {
    if (p.licencia !== 'CC0') assert.ok(p.simulado, `${p.id} se presenta como ${p.licencia}: debe decir lo que es en realidad`);
    assert.ok(!/Ejemplo|Fulano|Autora de Prueba/.test(p.autor), 'no se inventan autores');
  }
});

test('cada archivo del catálogo existe y es una imagen o un audio con las medidas esperadas', () => {
  for (const p of catalogo.piezas) {
    const ruta = new URL(p.archivo, BIBLIOTECA);
    assert.ok(existsSync(ruta), `falta ${p.archivo}`);
    const bytes = readFileSync(ruta);
    if (p.tipo === 'fondo') assert.deepEqual(medidasPng(bytes), { ancho: 192, alto: 108 }, p.archivo);
    else if (p.tipo === 'retrato') assert.deepEqual(medidasPng(bytes), { ancho: 64, alto: 64 }, p.archivo);
    else {
      const cabecera = cabeceraWav(bytes);
      assert.equal(cabecera.canales, 1, p.archivo);
      assert.equal(cabecera.bits, 16, p.archivo);
      assert.ok(cabecera.muestras > 1000, `${p.archivo} está vacío`);
      assert.ok(bytes.length < 1024 * 1024, `${p.archivo} pesa más de 1 MB`);
    }
  }
});

test('CREDITOS.md sale del catálogo y LICENCIA-CURSO.md explica la licencia del curso', () => {
  const creditos = readFileSync(new URL('CREDITOS.md', BIBLIOTECA), 'utf8');
  assert.equal(creditos, generarCreditos(catalogo), 'CREDITOS.md está desactualizado: corre node scripts/creditos-biblioteca.js');
  assert.match(creditos, /## Lo que hay detrás de las piezas simuladas/);
  const licencia = readFileSync(new URL('LICENCIA-CURSO.md', BIBLIOTECA), 'utf8');
  assert.match(licencia, /dentro de la plataforma/);
  assert.match(licencia, /CC0/);
  assert.match(licencia, /R05/);
});
```

- [ ] **Step 2: Correr la prueba para ver que falla**

Run: `node --test tests/biblioteca-real.test.js`
Expected: falla porque no existe `plataforma/biblioteca/catalogo.json`.

- [ ] **Step 3: Escribir `plataforma/biblioteca/LICENCIA-CURSO.md`**

````markdown
# Licencia limitada al curso (`CURSO`)

Esta licencia acompaña a las piezas de la biblioteca marcadas con el código `CURSO`.

## Qué permite

- Usar la pieza **dentro de la plataforma**, en el juego que armas como ejercicio del curso «¿De quién es tu videojuego?».
- Modificarla y combinarla con tus propios elementos para ese ejercicio.

## Qué no permite

- Publicar el juego fuera de la plataforma con la pieza adentro, ni gratis ni vendido.
- Entregar la pieza a terceros, sublicenciarla o presentarla como propia.
- Cualquier uso que no sea el del curso.

## Qué pasa en la plataforma

El semáforo lee esta licencia: con destino «uso personal» la pieza queda en verde; con destino «gratis» o «venta» se pone en rojo (regla R05), porque el juego saldría del único uso que la licencia cubre. La solución es reemplazar la pieza o cambiar el destino.

## Nota de honestidad

Esta licencia es un ejercicio. Las piezas que la llevan son, en realidad, piezas que la plataforma puede distribuir libremente (CC0 o dominio público); el catálogo guarda su licencia y origen reales en el campo `simulado`, y la ficha lo muestra en «ver más». Se presentan con esta licencia para que practiques con una licencia que limita los usos a un contexto concreto, que es algo frecuente en la vida real.
````

- [ ] **Step 4: Escribir `scripts/generar-biblioteca-provisional.js`**

```js
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
```

- [ ] **Step 5: Escribir `scripts/creditos-biblioteca.js`**

```js
// scripts/creditos-biblioteca.js
// Escribe plataforma/biblioteca/CREDITOS.md a partir de catalogo.json, para que los
// créditos nunca se desvíen del catálogo. Uso: node scripts/creditos-biblioteca.js
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(fileURLToPath(new URL('../', import.meta.url)));
const BIBLIOTECA = resolve(RAIZ, 'plataforma/biblioteca');
const NOMBRES = { fondo: 'Fondos', retrato: 'Retratos', musica: 'Pistas musicales', efecto: 'Efectos de sonido' };
const NOMBRES_LICENCIA = {
  DP: 'Dominio público',
  CC0: 'CC0 1.0',
  'CC-BY-4.0': 'CC BY 4.0',
  'CC-BY-SA-4.0': 'CC BY-SA 4.0',
  'CC-BY-NC-4.0': 'CC BY-NC 4.0',
  'CC-BY-ND-4.0': 'CC BY-ND 4.0',
  CURSO: 'Licencia limitada al curso',
  DESCONOCIDO: 'Autor desconocido',
};

const celda = (texto) => String(texto ?? '').replaceAll('|', '\\|');
const enlace = (fuente) => (/^https?:\/\//.test(fuente) ? `<${fuente}>` : `\`${fuente}\``);

export function generarCreditos(catalogo) {
  const lineas = ['# Créditos de la biblioteca', ''];
  if (catalogo.provisional) {
    lineas.push(`> **Catálogo provisional.** ${catalogo.nota ?? ''}`.trim(), '');
  }
  lineas.push('Cada pieza aparece con el autor, la licencia y la fuente que muestra la plataforma. Las piezas simuladas se explican al final.', '');
  for (const tipo of Object.keys(NOMBRES)) {
    const piezas = catalogo.piezas.filter((p) => p.tipo === tipo);
    if (!piezas.length) continue;
    lineas.push(`## ${NOMBRES[tipo]}`, '', '| Título | Autor | Licencia | Fuente |', '|---|---|---|---|');
    for (const p of piezas) lineas.push(`| ${celda(p.titulo)} | ${celda(p.autor)} | ${NOMBRES_LICENCIA[p.licencia] ?? p.licencia} | ${enlace(p.fuente)} |`);
    lineas.push('');
  }
  const simuladas = catalogo.piezas.filter((p) => p.simulado);
  if (simuladas.length) {
    lineas.push('## Lo que hay detrás de las piezas simuladas', '', 'La plataforma presenta estas piezas con una licencia distinta de la real para que el ejercicio tenga casos de todos los colores. Lo real es lo siguiente.', '', '| Título | Se presenta como | En realidad es | Autor real | Fuente real |', '|---|---|---|---|---|');
    for (const p of simuladas) lineas.push(`| ${celda(p.titulo)} | ${NOMBRES_LICENCIA[p.licencia] ?? p.licencia} | ${NOMBRES_LICENCIA[p.simulado.licencia] ?? p.simulado.licencia} | ${celda(p.simulado.autor)} | ${enlace(p.simulado.fuente)} |`);
    lineas.push('');
  }
  return `${lineas.join('\n')}`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const catalogo = JSON.parse(readFileSync(resolve(BIBLIOTECA, 'catalogo.json'), 'utf8'));
  writeFileSync(resolve(BIBLIOTECA, 'CREDITOS.md'), generarCreditos(catalogo));
  console.log(`CREDITOS.md: ${catalogo.piezas.length} piezas`);
}
```

- [ ] **Step 6: Generar las piezas, el catálogo y los créditos**

Run: `node scripts/generar-biblioteca-provisional.js && node scripts/creditos-biblioteca.js`
Expected: `Biblioteca provisional: 34 piezas en …/plataforma/biblioteca` y `CREDITOS.md: 34 piezas`. La carpeta pesa cerca de 2 MB (las pistas son WAV de unos 4 segundos). Abrir dos o tres PNG y oír un WAV para confirmar que se ven y se oyen.

- [ ] **Step 7: Correr la prueba para ver que pasa**

Run: `node --test tests/biblioteca-real.test.js`
Expected: `# pass 3`.

- [ ] **Step 8: Commit**

```bash
git add scripts/generar-biblioteca-provisional.js scripts/creditos-biblioteca.js plataforma/biblioteca tests/biblioteca-real.test.js
git commit -m "Biblioteca provisional generada por programa: 34 piezas, catálogo, licencia del curso y créditos" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Selector de la biblioteca y tomarPieza

**Files:**
- Create: `plataforma/js/editor/biblioteca.js`
- Create: `tests/biblioteca.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/biblioteca.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instalarDom, clic, teclear, textos } from './ayudas/dom.js';
import { sesionDePrueba } from './ayudas/sesion.js';
import { catalogoDePrueba } from './ayudas/catalogo.js';
import { crearCatalogo } from '../plataforma/js/biblioteca/catalogo.js';
import { tomarPieza, crearBiblioteca } from '../plataforma/js/editor/biblioteca.js';

instalarDom();

async function catalogoCargado(datos = catalogoDePrueba()) {
  const fetchFalso = async (url) => {
    const texto = String(url);
    if (texto.endsWith('catalogo.json')) return { ok: true, json: async () => datos };
    if (texto.endsWith('.png') || texto.endsWith('.wav')) return { ok: true, arrayBuffer: async () => new TextEncoder().encode(`bytes de ${texto}`).buffer };
    return { ok: false, status: 404 };
  };
  const catalogo = crearCatalogo({ url: 'http://localhost/plataforma/biblioteca/catalogo.json', fetch: fetchFalso });
  await catalogo.cargar();
  return catalogo;
}

test('tomarPieza mete la pieza como elemento de biblioteca con su ficha precargada y su archivo', async () => {
  const catalogo = await catalogoCargado();
  const { sesion, eventos } = sesionDePrueba();
  const pieza = catalogo.piezaDe('bib_m3');
  const elemento = await tomarPieza(sesion, catalogo, pieza);
  assert.equal(elemento.tipo, 'musica');
  assert.equal(elemento.origen, 'biblioteca');
  assert.equal(elemento.nombre, 'Pista 3');
  assert.equal(elemento.archivo, `${elemento.id}.wav`);
  assert.deepEqual(elemento.biblioteca, { id: 'bib_m3', autor: 'Autora de Prueba', licencia: 'CC-BY-NC-4.0', creditoSugerido: '«Pista 3», Autora de Prueba, CC-BY-NC-4.0' });
  const ficha = sesion.proyecto.fichas[elemento.id];
  assert.equal(ficha.origen, 'biblioteca');
  assert.equal(ficha.licencia, 'CC-BY-NC-4.0');
  assert.equal(ficha.autorNombre, 'Autora de Prueba');
  assert.equal(ficha.credito, '«Pista 3», Autora de Prueba, CC-BY-NC-4.0');
  const archivo = sesion.archivos.get(elemento.id);
  assert.equal(archivo.tipo, 'audio/wav');
  assert.equal(new TextDecoder().decode(archivo.datos), 'bytes de http://localhost/plataforma/biblioteca/musica/bib_m3.wav');
  assert.deepEqual(eventos[0], { tipo: 'cambio', origen: 'biblioteca', estructura: true });
});

test('si el almacén no puede guardar el archivo, tomarPieza retira el elemento y propaga el error', async () => {
  const catalogo = await catalogoCargado();
  const fallo = Object.assign(new Error('No hay espacio'), { codigo: 'sin_espacio' });
  const { sesion } = sesionDePrueba(undefined, { almacen: { guardar: async () => {}, guardarArchivo: async () => { throw fallo; }, borrarArchivo: async () => {} } });
  await assert.rejects(tomarPieza(sesion, catalogo, catalogo.piezaDe('bib_f1')), (e) => e === fallo);
  assert.deepEqual(sesion.proyecto.juego.elementos, []);
  assert.deepEqual(Object.keys(sesion.proyecto.fichas), ['titulo', 'historia']);
});

test('abrir muestra los filtros con sus cuentas y las tarjetas del tipo activo, con vista previa, autor y licencia', async () => {
  const catalogo = await catalogoCargado();
  const contenedor = document.createElement('div');
  contenedor.hidden = true;
  document.body.append(contenedor);
  const biblioteca = crearBiblioteca(contenedor, catalogo, { alElegir: () => {} });
  biblioteca.abrir();
  assert.equal(contenedor.hidden, false);
  assert.ok(biblioteca.abierto);
  assert.deepEqual(textos(contenedor, '[role="tab"]'), ['Fondos (8)', 'Retratos (8)', 'Música (6)', 'Efectos (12)']);
  assert.equal(contenedor.querySelector('[role="tab"][aria-selected="true"]').dataset.filtro, 'fondo');
  assert.equal(document.activeElement, contenedor.querySelector('[data-filtro="fondo"]'));
  const tarjetas = [...contenedor.querySelectorAll('.biblioteca-pieza')];
  assert.equal(tarjetas.length, 8);
  assert.equal(tarjetas[0].querySelector('img').getAttribute('src'), 'http://localhost/plataforma/biblioteca/fondos/bib_f1.png');
  assert.equal(tarjetas[0].querySelector('h3').textContent, 'Fondo 1');
  assert.equal(tarjetas[0].querySelector('.biblioteca-autor').textContent, 'Autora de Prueba');
  assert.deepEqual(textos(tarjetas[0], '.chip'), ['CC BY', 'BY']);
  assert.deepEqual(textos(tarjetas[2], '.chip'), ['CC BY-SA', 'BY', 'SA']);
  assert.deepEqual(textos(tarjetas[7], '.chip'), ['Autor desconocido']);
  assert.match(contenedor.querySelector('.mapa-resumen').textContent, /34 piezas con licencias reales/);
  clic(contenedor.querySelector('[data-filtro="musica"]'));
  assert.equal(contenedor.querySelectorAll('.biblioteca-pieza').length, 6);
  assert.equal(contenedor.querySelector('.biblioteca-pieza audio').getAttribute('src'), 'http://localhost/plataforma/biblioteca/musica/bib_m1.wav');
  assert.equal(document.activeElement, contenedor.querySelector('[data-filtro="musica"]'), 'el foco sigue en el filtro');
  contenedor.remove();
});

test('«Usar esta pieza» cierra y avisa cuál; Cerrar y Escape cierran y avisan una sola vez', async () => {
  const catalogo = await catalogoCargado();
  const llamadas = [];
  const contenedor = document.createElement('div');
  document.body.append(contenedor);
  const biblioteca = crearBiblioteca(contenedor, catalogo, { alElegir: (p) => llamadas.push(['elegir', p.id]), alCerrar: () => llamadas.push(['cerrar']) });
  biblioteca.abrir('retrato');
  clic(contenedor.querySelector('.biblioteca-pieza[data-pieza="bib_r2"] button[data-accion="usar"]'));
  assert.equal(contenedor.hidden, true);
  assert.deepEqual(llamadas, [['cerrar'], ['elegir', 'bib_r2']]);
  biblioteca.abrir();
  assert.equal(contenedor.querySelector('[role="tab"][aria-selected="true"]').dataset.filtro, 'retrato', 'recuerda el último filtro');
  clic(contenedor.querySelector('button[data-accion="cerrar-biblioteca"]'));
  assert.deepEqual(llamadas.at(-1), ['cerrar']);
  biblioteca.cerrar();
  assert.equal(llamadas.length, 3, 'cerrar dos veces no avisa dos veces');
  biblioteca.abrir('nada');
  assert.equal(contenedor.querySelector('[role="tab"][aria-selected="true"]').dataset.filtro, 'retrato', 'un tipo desconocido no cambia el filtro');
  teclear(contenedor.querySelector('.biblioteca'), 'Escape');
  assert.equal(contenedor.hidden, true);
  contenedor.remove();
});

test('un catálogo provisional lo dice en la cabecera; sin piezas del tipo muestra el vacío', async () => {
  const datos = catalogoDePrueba();
  datos.provisional = true;
  datos.piezas = datos.piezas.filter((p) => p.tipo !== 'efecto');
  const catalogo = await catalogoCargado(datos);
  const contenedor = document.createElement('div');
  document.body.append(contenedor);
  const biblioteca = crearBiblioteca(contenedor, catalogo, { alElegir: () => {} });
  biblioteca.abrir('efecto');
  assert.match(contenedor.querySelector('.mapa-resumen').textContent, /provisional/);
  assert.equal(contenedor.querySelector('.vacio').textContent, 'No hay piezas de este tipo.');
  assert.ok(textos(contenedor, '[role="tab"]').includes('Efectos (0)'));
  contenedor.remove();
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/biblioteca.test.js`
Expected: falla al importar `editor/biblioteca.js`.

- [ ] **Step 3: Escribir `plataforma/js/editor/biblioteca.js`**

```js
// plataforma/js/editor/biblioteca.js
// El selector de la biblioteca (spec, sección 11) sobre el editor: filtros por tipo y
// tarjetas con vista previa, autor, licencia y condiciones. tomarPieza mete la pieza
// elegida al proyecto con origen 'biblioteca', la ficha precargada por crearFicha y el
// archivo guardado, igual que subirElemento con los archivos subidos.
import { h, vaciar } from '../ui/dom.js';
import { ETIQUETAS } from '../juridico/formulario.js';
import { agregarElemento, eliminarElemento } from '../estado/modelo.js';
import { extensionPorMime } from '../estado/archivos.js';
import { entradaDeFicha, TIPOS_BIBLIOTECA, medioDeTipo } from '../biblioteca/catalogo.js';

export const FILTROS = { fondo: 'Fondos', retrato: 'Retratos', musica: 'Música', efecto: 'Efectos' };
export const ABREVIATURAS = { DP: 'Dominio público', CC0: 'CC0', 'CC-BY-4.0': 'CC BY', 'CC-BY-SA-4.0': 'CC BY-SA', 'CC-BY-NC-4.0': 'CC BY-NC', 'CC-BY-ND-4.0': 'CC BY-ND', CURSO: 'Solo curso', DESCONOCIDO: 'Autor desconocido' };

/**
 * Mete una pieza del catálogo al proyecto. Si el almacén falla al guardar el archivo,
 * retira el elemento y propaga el error.
 * @param {object} sesion de crearSesion
 * @param {object} catalogo de crearCatalogo, ya cargado
 * @param {object} pieza entrada del catálogo
 */
export async function tomarPieza(sesion, catalogo, pieza) {
  const archivo = await catalogo.obtenerArchivo(pieza.id);
  const elemento = sesion.cambiar((proyecto) => {
    const nuevo = agregarElemento(proyecto, { tipo: pieza.tipo, nombre: pieza.titulo, archivo: 'pendiente', origen: 'biblioteca', biblioteca: entradaDeFicha(pieza) });
    nuevo.archivo = `${nuevo.id}.${extensionPorMime(archivo.tipo)}`;
    return nuevo;
  }, { origen: 'biblioteca', estructura: true });
  try {
    await sesion.agregarArchivo(elemento.id, archivo);
  } catch (error) {
    sesion.cambiar((proyecto) => eliminarElemento(proyecto, elemento.id), { origen: 'biblioteca', estructura: true });
    throw error;
  }
  return elemento;
}

/**
 * @param {HTMLElement} contenedor capa oculta hasta abrir()
 * @param {object} catalogo de crearCatalogo, ya cargado
 * @param {{ alElegir: (pieza: object) => void, alCerrar?: () => void }} opciones
 */
export function crearBiblioteca(contenedor, catalogo, { alElegir, alCerrar = () => {} }) {
  let abierto = false;
  let filtro = 'fondo';

  function tarjeta(pieza) {
    const url = catalogo.urlDe(pieza);
    const vista = medioDeTipo(pieza.tipo) === 'imagen'
      ? h('img', { class: 'biblioteca-vista', src: url, alt: '' })
      : h('audio', { class: 'biblioteca-vista', controls: true, preload: 'none', src: url });
    return h('article', { class: 'biblioteca-pieza', dataset: { pieza: pieza.id } },
      h('div', { class: `biblioteca-marco marco-${pieza.tipo}` }, vista),
      h('h3', {}, pieza.titulo),
      h('p', { class: 'biblioteca-autor' }, pieza.autor),
      h('p', { class: 'biblioteca-licencia' },
        h('span', { class: `chip licencia-${pieza.licencia}` }, ABREVIATURAS[pieza.licencia] ?? pieza.licencia),
        pieza.condiciones.map((c) => h('span', { class: 'chip', title: ETIQUETAS.condiciones[c] }, c))),
      h('button', { type: 'button', class: 'btn btn-primary btn-sm', dataset: { accion: 'usar' }, onclick: () => { cerrar(); alElegir(pieza); } }, 'Usar esta pieza'));
  }

  function dibujar() {
    const piezas = catalogo.piezas().filter((p) => p.tipo === filtro);
    vaciar(contenedor).append(h('div', { class: 'biblioteca', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'biblioteca-titulo', onkeydown: (e) => { if (e.key === 'Escape') cerrar(); } },
      h('div', { class: 'mapa-cabecera' },
        h('div', {},
          h('h2', { id: 'biblioteca-titulo' }, 'Biblioteca'),
          h('p', { class: 'mapa-resumen' }, catalogo.provisional()
            ? 'Catálogo provisional: piezas generadas por programa; la licencia de cada una es parte del ejercicio.'
            : `${catalogo.piezas().length} piezas con licencias reales, verificadas en la fuente.`)),
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'cerrar-biblioteca' }, onclick: cerrar }, 'Cerrar')),
      h('div', { class: 'biblioteca-filtros', role: 'tablist', 'aria-label': 'Tipo de pieza' },
        Object.entries(FILTROS).map(([tipo, texto]) => h('button', {
          type: 'button',
          role: 'tab',
          class: `btn btn-sm ${tipo === filtro ? 'btn-primary' : 'btn-ghost'}`,
          'aria-selected': tipo === filtro ? 'true' : 'false',
          dataset: { filtro: tipo },
          onclick: () => { filtro = tipo; dibujar(); },
        }, `${texto} (${catalogo.piezas().filter((p) => p.tipo === tipo).length})`))),
      piezas.length ? h('div', { class: 'biblioteca-piezas' }, piezas.map(tarjeta)) : h('p', { class: 'vacio' }, 'No hay piezas de este tipo.')));
    contenedor.querySelector(`[data-filtro="${filtro}"]`)?.focus();
  }

  function abrir(tipo = filtro) {
    if (TIPOS_BIBLIOTECA.includes(tipo)) filtro = tipo;
    abierto = true;
    contenedor.hidden = false;
    dibujar();
  }

  function cerrar() {
    if (!abierto) return;
    abierto = false;
    vaciar(contenedor);
    contenedor.hidden = true;
    alCerrar();
  }

  return { abrir, cerrar, get abierto() { return abierto; } };
}
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/biblioteca.test.js`
Expected: `# pass 5`.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/editor/biblioteca.js tests/biblioteca.test.js
git commit -m "Editor: selector de la biblioteca y tomarPieza con ficha precargada" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Botón «Biblioteca» en el inventario y la pieza en la ficha

**Files:**
- Modify: `plataforma/js/editor/inventario.js`, `tests/inventario.test.js`
- Modify: `plataforma/js/editor/panel-ficha.js`, `tests/panel-ficha.test.js`
- Modify: `plataforma/js/editor/propiedades.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

En `tests/inventario.test.js`, en `armar`, agregar un contador `let bibliotecas = 0;`, pasar `alBiblioteca: () => { bibliotecas += 1; }` a `crearInventario` y devolver `bibliotecas: () => bibliotecas`. Reemplazar la prueba «pulsar una entrada selecciona lo correcto y Subir archivo avisa» por:

```js
test('pulsar una entrada selecciona lo correcto; Subir archivo y Biblioteca avisan', () => {
  const { contenedor, inventario, selecciones, subidas, bibliotecas, muelle, ana, fondo } = armar();
  inventario.dibujar(null);
  const botones = [...contenedor.querySelectorAll('button.entrada')];
  clic(botones[0]);
  clic(botones[1]);
  clic(botones[3]);
  clic(botones[5]);
  assert.deepEqual(selecciones, [{ tipo: 'juego' }, { tipo: 'escena', id: muelle.id }, { tipo: 'personaje', id: ana.id }, { tipo: 'elemento', id: fondo.id }]);
  clic(contenedor.querySelector('button[data-accion="subir"]'));
  assert.equal(subidas(), 1);
  clic(contenedor.querySelector('button[data-accion="biblioteca"]'));
  assert.equal(bibliotecas(), 1);
  assert.equal(contenedor.querySelector('button[data-accion="biblioteca"]').disabled, false);
});

test('sin biblioteca disponible el botón queda deshabilitado y explica por qué', () => {
  const { sesion } = sesionDePrueba();
  const contenedor = document.createElement('div');
  crearInventario(contenedor, sesion, { alSeleccionar: () => {}, alSubir: () => {} }).dibujar(null);
  const boton = contenedor.querySelector('button[data-accion="biblioteca"]');
  assert.equal(boton.disabled, true);
  assert.equal(boton.title, 'La biblioteca no está disponible');
  assert.equal(contenedor.querySelector('button[data-accion="subir"]').disabled, false);
});
```

En `tests/panel-ficha.test.js`, en `armar`, después de crear `tema`, definir las piezas conocidas y pasar `piezaDe` al panel:

```js
  const piezas = {
    bib_m1: { id: 'bib_m1', tipo: 'musica', titulo: 'Tema del muelle', autor: 'Autora Ejemplo', fuente: 'https://ejemplo.test/tema', licencia: 'CC-BY-ND-4.0', simulado: { licencia: 'CC0', autor: 'Generada por programa', fuente: 'scripts/x.js' } },
  };
  // ...
  const dibujar = (id) => { vaciar(contenedor).append(panelFicha(sesion, id, { contenido, alSeleccionar: (s) => selecciones.push(s), piezaDe: (idPieza) => piezas[idPieza] ?? null })); return contenedor; };
```

Y al final del archivo:

```js
test('una pieza de biblioteca muestra título, autor y fuente, y «ver más» revela lo que es en realidad', () => {
  const { dibujar, q, tema, fondo } = armar();
  dibujar(tema.id);
  const pieza = q('.ficha-pieza');
  assert.equal(pieza.querySelector('strong').textContent, 'Tema del muelle');
  assert.match(pieza.querySelector('p').textContent, /· Autora Ejemplo ·/);
  assert.equal(pieza.querySelector('a').getAttribute('href'), 'https://ejemplo.test/tema');
  assert.equal(pieza.querySelector('a').getAttribute('target'), '_blank');
  const revelado = pieza.querySelector('details p').textContent;
  assert.match(revelado, /^En la vida real esta pieza es Creative Commons Zero \(CC0 1\.0\) de Generada por programa \(scripts\/x\.js\)/);
  assert.match(revelado, /se presenta como Creative Commons Atribución y sin derivadas 4\.0 para que practiques\.$/);
  assert.equal(q('a[data-accion="licencia-curso"]'), null, 'no es CURSO');
  dibujar(fondo.id);
  assert.equal(q('.ficha-pieza'), null, 'un elemento creado no viene de la biblioteca');
});

test('una pieza CURSO enlaza a la licencia del curso; sin entrada en el catálogo se usa lo que guarda el elemento', () => {
  const { dibujar, q, p } = armar();
  const curso = agregarElemento(p, { tipo: 'efecto', nombre: 'Zumbido', archivo: 'z.wav', origen: 'biblioteca', biblioteca: { id: 'bib_e11', autor: 'Taller', licencia: 'CURSO', creditoSugerido: '«Zumbido», licencia limitada al curso' } });
  dibujar(curso.id);
  const enlace = q('a[data-accion="licencia-curso"]');
  assert.ok(enlace);
  assert.match(enlace.getAttribute('href'), /biblioteca\/LICENCIA-CURSO\.md$/);
  assert.equal(enlace.textContent, 'Leer la licencia del curso');
  const pieza = q('.ficha-pieza');
  assert.equal(pieza.querySelector('strong').textContent, 'Zumbido');
  assert.match(pieza.querySelector('p').textContent, /· Taller$/);
  assert.equal(pieza.querySelector('details'), null, 'sin entrada del catálogo no hay nada que revelar');
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/inventario.test.js tests/panel-ficha.test.js`
Expected: fallan las cuatro pruebas nuevas o cambiadas.

- [ ] **Step 3: Cambiar `inventario.js`**

La firma pasa a `crearInventario(contenedor, sesion, { alSeleccionar, alSubir, alBiblioteca = null })`. Reemplazar la función `seccion` por una que reciba una lista de botones:

```js
  const botonCrear = (texto, alPulsar, extra = {}) => h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: alPulsar, ...extra }, texto);

  function seccion(titulo, botones, entradas) {
    return h('section', { class: 'inventario-seccion' },
      h('div', { class: 'inventario-cabecera' }, h('h2', {}, titulo), h('span', { class: 'inventario-botones' }, botones)),
      entradas.length ? h('ul', { class: 'lista' }, entradas) : h('p', { class: 'vacio' }, 'Nada todavía.'));
  }
```

Y en `dibujar`, las tres llamadas pasan a:

```js
        seccion('Escenas', [botonCrear('Nueva escena', nuevaEscena)], juego.escenas.map((escena, i) => entrada({
        // ...
        seccion('Personajes', [botonCrear('Nuevo personaje', nuevoPersonaje)], juego.personajes.map((personaje) => entrada({
        // ...
        seccion('Elementos', [
          botonCrear('Biblioteca', alBiblioteca ?? undefined, { dataset: { accion: 'biblioteca' }, disabled: !alBiblioteca, title: alBiblioteca ? null : 'La biblioteca no está disponible' }),
          botonCrear('Subir archivo', alSubir, { dataset: { accion: 'subir' } }),
        ], juego.elementos.map((elemento) => entrada({
```

- [ ] **Step 4: Cambiar `panel-ficha.js`**

Antes de `panelFicha`, tres ayudas:

```js
const nombreLicencia = (codigo) => LICENCIAS[codigo]?.nombre ?? codigo;
const fuenteNodo = (fuente) => (/^https?:\/\//.test(fuente) ? h('a', { href: fuente, target: '_blank', rel: 'noopener' }, fuente) : h('code', {}, fuente));
const URL_LICENCIA_CURSO = new URL('../../biblioteca/LICENCIA-CURSO.md', import.meta.url).href;
```

La firma pasa a `panelFicha(sesion, idFicha, { contenido, alSeleccionar = () => {}, titulo = 'Ficha jurídica', piezaDe = () => null })` y, después de `const { juego } = sesion.proyecto;`:

```js
  const elemento = juego.elementos.find((e) => e.id === idFicha) ?? null;
  const pieza = elemento?.biblioteca ? piezaDe(elemento.biblioteca.id) : null;
```

Antes de `enlaceRetrato`, la pieza de biblioteca con lo simulado:

```js
  /** De dónde salió una pieza de biblioteca y, si es simulada, lo que es en realidad (spec 11, honestidad del catálogo). */
  function piezaDeBiblioteca() {
    if (!elemento?.biblioteca) return null;
    const fuente = pieza?.fuente ?? null;
    return h('div', { class: 'ficha-pieza' },
      h('p', {}, 'De la biblioteca: ', h('strong', {}, pieza?.titulo ?? elemento.nombre), ` · ${elemento.biblioteca.autor?.trim() || 'autor desconocido'}`, fuente ? [' · ', fuenteNodo(fuente)] : null),
      pieza?.simulado ? h('details', { class: 'ficha-mas' }, h('summary', {}, 'Ver más'),
        h('p', {}, `En la vida real esta pieza es ${nombreLicencia(pieza.simulado.licencia)} de ${pieza.simulado.autor} (${pieza.simulado.fuente}); aquí se presenta como ${nombreLicencia(pieza.licencia)} para que practiques.`)) : null);
  }
```

En la sección `tipoObra`, agregar `piezaDeBiblioteca(),` entre `explicacion(...)` y `enlaceRetrato()`. En el grupo `respaldo`, después de `v.licencia ? selectorLicencia() : null,`:

```js
      ficha.licencia === 'CURSO' ? h('p', {}, h('a', { class: 'ficha-enlace', href: URL_LICENCIA_CURSO, target: '_blank', rel: 'noopener', dataset: { accion: 'licencia-curso' } }, 'Leer la licencia del curso')) : null,
```

- [ ] **Step 5: Cambiar `propiedades.js`**

La firma pasa a `crearPropiedades(contenedor, sesion, { contenido = null, alSeleccionar, confirmar = ..., piezaDe = () => null })` y la ayuda `ficha` pasa `piezaDe`:

```js
  const ficha = (id, titulo) => panelFicha(sesion, id, { contenido: contenido ?? {}, alSeleccionar, titulo, piezaDe });
```

- [ ] **Step 6: Correr las pruebas para ver que pasan**

Run: `node --test tests/inventario.test.js tests/panel-ficha.test.js tests/propiedades.test.js`
Expected: `# pass 25` (7 + 10 + 8).

- [ ] **Step 7: Commit**

```bash
git add plataforma/js/editor/inventario.js tests/inventario.test.js plataforma/js/editor/panel-ficha.js tests/panel-ficha.test.js plataforma/js/editor/propiedades.js
git commit -m "Inventario con botón Biblioteca; la ficha muestra la pieza, su fuente, lo simulado y la licencia del curso" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: El editor y el arranque cargan la biblioteca

**Files:**
- Modify: `plataforma/js/editor/editor.js`, `tests/editor.test.js`, `tests/ayudas/catalogo.js`
- Modify: `plataforma/js/app.js`
- Modify: `plataforma/css/editor.css`

- [ ] **Step 1: Escribir las pruebas que fallan**

Al final de `tests/ayudas/catalogo.js`, un catálogo ya cargado con `fetch` falso:

```js
/** Un catálogo ya cargado con fetch falso: el JSON y bytes ficticios por archivo. */
export async function catalogoCargado(datos = catalogoDePrueba()) {
  const { crearCatalogo } = await import('../../plataforma/js/biblioteca/catalogo.js');
  const fetchFalso = async (url) => {
    const texto = String(url);
    if (texto.endsWith('catalogo.json')) return { ok: true, json: async () => datos };
    if (texto.endsWith('.png') || texto.endsWith('.wav')) return { ok: true, arrayBuffer: async () => new TextEncoder().encode(`bytes de ${texto}`).buffer };
    return { ok: false, status: 404 };
  };
  const catalogo = crearCatalogo({ url: 'http://localhost/plataforma/biblioteca/catalogo.json', fetch: fetchFalso });
  await catalogo.cargar();
  return catalogo;
}
```

En `tests/editor.test.js`: importar `catalogoCargado` de `./ayudas/catalogo.js`; `armar` acepta `catalogo = null` y `avisoInicial = null` y los pasa a `crearEditor`. Agregar, antes de la prueba del destino:

```js
test('Biblioteca abre el selector; «Usar esta pieza» mete la pieza con su ficha precargada y deja el foco en la ficha', async () => {
  const catalogo = await catalogoCargado();
  const { p } = proyectoConLineas();
  const { sesion, contenedor, q } = armar({ proyecto: p, catalogo });
  clic(q('.inventario button[data-accion="biblioteca"]'));
  assert.equal(q('.capa-biblioteca').hidden, false);
  assert.ok(document.body.classList.contains('con-biblioteca'));
  clic(q('.capa-biblioteca [data-filtro="musica"]'));
  clic(q('.capa-biblioteca .biblioteca-pieza[data-pieza="bib_m3"] button[data-accion="usar"]'));
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(q('.capa-biblioteca').hidden, true);
  assert.ok(!document.body.classList.contains('con-biblioteca'));
  const elemento = sesion.proyecto.juego.elementos[0];
  assert.equal(elemento.origen, 'biblioteca');
  assert.equal(elemento.nombre, 'Pista 3');
  assert.equal(sesion.proyecto.fichas[elemento.id].licencia, 'CC-BY-NC-4.0');
  assert.equal(q('.propiedades h2').textContent, 'Música');
  assert.equal(document.activeElement, q(`section.ficha[data-ficha="${elemento.id}"]`));
  assert.equal(q('.ficha-pieza strong').textContent, 'Pista 3');
  assert.ok(q('.inventario .punto-semaforo').classList.contains('semaforo-amarillo'), 'falta leer la licencia');
  assert.ok([...contenedor.querySelectorAll('.aviso')].some((a) => /entró al juego desde la biblioteca/.test(a.textContent)));
  clic(q('.inventario button[data-accion="biblioteca"]'));
  clic(q('.capa-biblioteca button[data-accion="cerrar-biblioteca"]'));
  assert.equal(document.activeElement, q('.inventario button[data-accion="biblioteca"]'), 'cerrar devuelve el foco al botón');
  contenedor.remove();
});

test('sin catálogo, Biblioteca queda deshabilitado y el aviso inicial se muestra', () => {
  const { p } = proyectoConLineas();
  const { contenedor, q } = armar({ proyecto: p, avisoInicial: 'La biblioteca no está disponible: el catálogo no cargó.' });
  assert.equal(q('.inventario button[data-accion="biblioteca"]').disabled, true);
  assert.ok([...contenedor.querySelectorAll('.aviso')].some((a) => /La biblioteca no está disponible/.test(a.textContent)));
  assert.equal(q('.capa-biblioteca').hidden, true);
  contenedor.remove();
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/editor.test.js`
Expected: las dos nuevas fallan.

- [ ] **Step 3: Cambiar `editor.js`**

Importar `{ crearBiblioteca, tomarPieza } from './biblioteca.js'`. La firma gana `catalogo = null` y `avisoInicial = null`. Agregar la capa `const zonaBiblioteca = h('div', { class: 'capa-biblioteca', hidden: true });` y ponerla en el `append` antes de `zonaMapa`. El inventario recibe `alBiblioteca: catalogo ? () => abrirBiblioteca() : null`; propiedades recibe `piezaDe: (id) => catalogo?.piezaDe(id) ?? null`. Después de `const propiedades = ...`:

```js
  const biblioteca = catalogo ? crearBiblioteca(zonaBiblioteca, catalogo, {
    alElegir: usarPieza,
    alCerrar: () => {
      document.body.classList.remove('con-biblioteca');
      zonaInventario.querySelector('[data-accion="biblioteca"]')?.focus();
    },
  }) : null;

  function abrirBiblioteca() {
    document.body.classList.add('con-biblioteca');
    biblioteca.abrir();
  }

  /** Mete la pieza elegida al juego y abre su ficha, que llega precargada desde el catálogo. */
  async function usarPieza(pieza) {
    try {
      const elemento = await tomarPieza(sesion, catalogo, pieza);
      seleccionar({ tipo: 'elemento', id: elemento.id }, { enfocar: `ficha:${elemento.id}` });
      avisar(`«${elemento.nombre}» entró al juego desde la biblioteca, con su ficha precargada.`);
    } catch (error) {
      mostrarError(error);
    }
  }
```

En `abrirCopia`, `nuevoJuego` y `destruir`, agregar `biblioteca?.cerrar();` antes de `mapa.cerrar();`. Al final del arranque, después de `seleccionar(...)`: `if (avisoInicial) avisar(avisoInicial);`. Exponer `usarPieza` en el objeto devuelto.

- [ ] **Step 4: Cambiar `app.js`**

Importar `{ crearCatalogo } from './biblioteca/catalogo.js'`. Dos variables de módulo: `let catalogoActual = null;` y `let avisoBiblioteca = null;`. En `arrancar`, después de `document.title = contenido.nombre;`:

```js
  // La biblioteca no es imprescindible: si su catálogo falta o está mal, el editor arranca igual y lo dice.
  const catalogo = crearCatalogo();
  try {
    await catalogo.cargar();
    catalogoActual = catalogo;
  } catch (error) {
    avisoBiblioteca = `La biblioteca no está disponible: ${error.message}`;
  }
```

Y en `mostrarEditor`, pasar a `crearEditor` las opciones `catalogo: catalogoActual, avisoInicial: avisoBiblioteca`.

- [ ] **Step 5: Estilos en `editor.css`**

Antes del bloque de pantallas angostas:

```css
/* ---------- Biblioteca ---------- */
.inventario-botones { display: flex; gap: 4px; }
.capa-biblioteca { position: fixed; inset: 0; z-index: 66; overflow: auto; padding: 24px; background: rgba(26, 29, 34, .55); }
.biblioteca { width: min(1100px, 100%); margin: 0 auto; padding: 20px 24px; background: var(--claro-panel); border-radius: var(--radius); box-shadow: var(--shadow); }
.biblioteca-filtros { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
.biblioteca-piezas { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px; }
.biblioteca-pieza { display: grid; gap: 6px; padding: 10px; background: var(--claro-panel-2); border: 1px solid var(--claro-line); border-radius: 10px; }
.biblioteca-pieza h3 { font-size: 14px; }
.biblioteca-marco { display: grid; place-items: center; min-height: 96px; background: #000; border-radius: 6px; overflow: hidden; }
.biblioteca-marco img { max-width: 100%; display: block; }
.marco-retrato img { width: 96px; height: 96px; image-rendering: pixelated; }
.marco-fondo img { width: 100%; image-rendering: pixelated; }
.biblioteca-marco audio { width: 100%; }
.biblioteca-autor { margin: 0; font-size: 12px; color: var(--claro-muted); }
.biblioteca-licencia { margin: 0; display: flex; flex-wrap: wrap; gap: 4px; }
.chip { display: inline-block; padding: 2px 7px; border-radius: 99px; border: 1px solid var(--claro-line); font-family: var(--mono); font-size: 10px; letter-spacing: .06em; text-transform: uppercase; color: var(--claro-muted); }
.chip.licencia-CURSO, .chip.licencia-DESCONOCIDO { border-color: var(--amarillo); color: var(--claro-ink); }
.ficha-pieza { margin: 6px 0 8px; padding: 8px 10px; background: var(--claro-panel-2); border-radius: 8px; font-size: 13px; }
.ficha-pieza p { margin: 0 0 4px; }
.ficha-pieza code { font-size: 12px; }
body.con-biblioteca { overflow: hidden; }
```

- [ ] **Step 6: Correr las pruebas para ver que pasan**

Run: `node --test tests/editor.test.js`
Expected: `# pass 14`.

- [ ] **Step 7: Commit**

```bash
git add plataforma/js/editor/editor.js tests/editor.test.js tests/ayudas/catalogo.js plataforma/js/app.js plataforma/css/editor.css
git commit -m "Editor y arranque: la biblioteca se carga, se abre desde el inventario y mete piezas con su ficha" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Cierre del plan: suite, comprobación manual, README y lista para las piezas reales

**Files:**
- Modify: `plataforma/README.md`

- [ ] **Step 1: Correr toda la suite**

Run: `npm test`
Expected: 259 pruebas, `# fail 0` (236 del plan 3 + 6 catálogo + 4 PNG/WAV y paleta + 3 catálogo real + 5 selector + 3 inventario y ficha + 2 editor). Lo que importa es `# fail 0`.

- [ ] **Step 2: Comprobación manual en el navegador**

Run en segundo plano: `node tests/manual/servir.js`. Abrir `http://localhost:8080/plataforma/`, empezar un juego y recorrer:

1. **Biblioteca.** El botón del inventario abre la capa con los cuatro filtros y sus cuentas (8, 8, 6, 12); las tarjetas muestran la imagen o el reproductor de audio, el autor y los chips de licencia; la cabecera dice que el catálogo es provisional.
2. **Usar una pieza.** «Usar esta pieza» en un fondo CC-BY: la capa se cierra, el elemento aparece en el inventario con punto amarillo (falta leer la licencia), el panel derecho muestra sus propiedades con la imagen y la ficha precargada (autor, titular, respaldo y licencia como texto fijo; crédito escrito). El foco queda en la ficha. Marcar «Leí la licencia» la pone en verde.
3. **Pieza simulada.** Tomar la pieza CURSO (Cueva) y la DESCONOCIDO (Interior del faro): rojas con R05 (si el destino no es personal) y R01; en la ficha, «De la biblioteca» muestra el título y, en «Ver más», lo que la pieza es en realidad. El enlace «Leer la licencia del curso» abre `LICENCIA-CURSO.md`.
4. **Audio.** Una pista y un efecto de la biblioteca suenan en el reproductor (asignar la pista a la escena y el efecto a un diálogo; «Jugar»).
5. **Sin catálogo.** Renombrar temporalmente `plataforma/biblioteca/catalogo.json`, recargar: aviso «La biblioteca no está disponible…», botón deshabilitado, todo lo demás funciona. Restaurar el nombre.
6. **Mapa de activos** y **créditos** incluyen las piezas de biblioteca con su crédito sugerido.

Detener el servidor al terminar. Si algo falla, corregirlo en el módulo que corresponde, con su prueba.

- [ ] **Step 3: Actualizar `plataforma/README.md`**

Reemplazar la sección `## Estado` por:

```markdown
## Estado

Planes 1 (núcleo), 2 (motor y editor), 3 (fichas en pantalla) y 4 (biblioteca) terminados.
La biblioteca trae un **catálogo provisional** de 34 piezas generadas por programa
(`scripts/generar-biblioteca-provisional.js`): no tienen autor humano, se publican bajo CC0 y el
catálogo las presenta con las licencias del ejercicio, diciéndolo en cada entrada (`simulado`) y en
`biblioteca/CREDITOS.md`. Reemplazarlas por piezas reales es una tarea de contenido (ver abajo).
Faltan las herramientas de creación (plan 5) y la publicación (plan 6).
```

Y agregar, al final del archivo:

```markdown
## Biblioteca: cómo pasar del catálogo provisional a piezas reales

El código no cambia; cambian los archivos y `biblioteca/catalogo.json`. Por cada pieza:

1. Buscarla en un repositorio con licencia abierta (Kenney y OpenGameArt para imágenes y sonidos;
   Wikimedia Commons para imágenes de dominio público; Freesound exige cuenta para descargar).
2. Verificar la licencia **en la página de la pieza**, no en la del repositorio, y guardar el enlace.
3. Copiar el archivo a la carpeta de su tipo (`fondos/`, `retratos/`, `musica/`, `efectos/`) en PNG, JPG,
   WebP, MP3, OGG o WAV. Fondos y retratos se muestran enteros, sin recortar; conviene 192×108 y 64×64
   o proporciones parecidas.
4. Escribir la entrada: `id`, `tipo`, `titulo`, `autor` (el real), `fuente` (el enlace), `licencia`
   (código de la tabla del spec), `condiciones` (las del código), `archivo`, `creditoSugerido` (en el
   formato que pide la licencia). Las piezas `CURSO` y `DESCONOCIDO` deben ser en realidad CC0 o de
   dominio público y llevar `simulado` con su licencia, autor y fuente reales.
5. Quitar `provisional: true` del catálogo cuando ya no quede ninguna pieza generada, correr
   `node scripts/creditos-biblioteca.js` y `npm test`: la prueba `biblioteca-real` comprueba la forma,
   los mínimos (8 fondos, 8 retratos, 6 pistas, 12 efectos), la mezcla de licencias, que cada archivo
   exista y que `CREDITOS.md` esté al día.
```

- [ ] **Step 4: Commit**

```bash
git add plataforma/README.md
git commit -m "Cierre del plan 4: README con el estado y la guía para reemplazar el catálogo provisional" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Autorrevisión del plan contra el spec

**Cobertura.** Sección 11, catálogo con sus campos: tarea 1 (validación) y tarea 3 (catálogo generado con `id, tipo, titulo, autor, fuente, licencia, condiciones, archivo, creditoSugerido`). Tabla de licencias: ya en `licencias.js` (plan 1); el selector las muestra con chips (tarea 4). Mínimos y mezcla, audio sin ND fuera: `faltantesDelMinimo` y `validarCatalogo` (tarea 1), cumplidos por el catálogo generado (tarea 3) y vigilados por `biblioteca-real.test.js`. Licencia del curso con texto propio enlazado desde la ficha: tareas 3 y 5. Honestidad del catálogo (`simulado` revelado en «ver más», sin inventar autores): tareas 1, 3 y 5; el catálogo provisional extiende la simulación a todas las licencias y lo declara. Procedencia y `CREDITOS.md`: tarea 3 (generado desde el catálogo) y la guía del README (tarea 7) para las piezas reales. Sección 12.2 (crédito precargado para piezas de biblioteca): `crearFicha` lo hacía; `tomarPieza` le pasa la entrada (tarea 4). Sección 15.3 (`biblioteca/catalogo.js: cargar() → entradas[], obtenerArchivo(id) → Blob`): `crearCatalogo` da `cargar()`, `piezas()`, `piezaDe()`, `urlDe()` y `obtenerArchivo()`; devuelve `{ tipo, datos: ArrayBuffer }` en vez de Blob porque así lo guarda el almacén (plan 1). Sección 9 (paleta fija de 16 colores en `contenido/paleta.json`): tarea 2, lista para el plan 5.

**Lo que queda fuera y dónde va.** Las piezas reales: tarea de contenido del docente con la guía del README; no cambia el código. El pixel art que usa la paleta: plan 5. El informe que lista las piezas de biblioteca con su fuente: plan 6 (`juridico/mapa.js` y `cadena.js` ya traen lo necesario).

**Placeholders.** Ninguno. Las tareas 3 y 4 traen el código completo de los scripts y del selector; las tareas 5 y 6 dicen qué texto cambiar en los archivos del plan 3.

**Consistencia de nombres.** `validarCatalogo(catalogo) → problemas[]`, `faltantesDelMinimo(catalogo) → [{ codigo, mensaje }]`, `entradaDeFicha(pieza) → { id, autor, licencia, creditoSugerido }`, `crearCatalogo({ url, fetch }) → { cargar, piezas, piezaDe, provisional, urlDe, obtenerArchivo }`, `MINIMO_CATALOGO`, `CARPETAS`, `TIPOS_BIBLIOTECA`, `medioDeTipo`. `tomarPieza(sesion, catalogo, pieza) → elemento`, `crearBiblioteca(contenedor, catalogo, { alElegir, alCerrar }) → { abrir(tipo), cerrar, abierto }`. `crearInventario(..., { alBiblioteca })`, `panelFicha(..., { piezaDe })`, `crearPropiedades(..., { piezaDe })`, `crearEditor(..., { catalogo, avisoInicial })`. Scripts: `png(ancho, alto, rgba)`, `wav(muestras, frecuencia)`, `lienzo(ancho, alto)`, `medidasPng`, `cabeceraWav`, `generar()`, `generarCreditos(catalogo)`.
