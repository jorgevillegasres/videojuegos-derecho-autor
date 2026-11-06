# Plan 6 de 6: Publicación — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar el recorrido del estudiante (spec, sección 3, paso 5): cuando «Publicar» se habilita, hacer la decisión de registro, generar el paquete de entrega `entrega-<estudiante>-<juego>.zip` con `juego.html` (el juego completo en un archivo, sin internet), `informe-juridico.html` (imprimible, con portada, mapa de activos, cadena de titularidad, decisión de registro y todas las fichas) y el proyecto en bruto; y dejar el recorrido completo probado en un navegador real con Playwright.

**Architecture:** Tres módulos nuevos sin DOM de la plataforma y una vista. `exportar/empaquetar.js` convierte los módulos ES del motor en un solo script clásico (quita `import`/`export`, los concatena en orden de dependencias) y codifica los archivos como `data:` URLs en base64; `exportar/paquete.js` arma `juego.html` con ese script, el documento y los recursos incrustados, calcula los pesos y genera el zip de entrega con la huella SHA-256 de `proyecto.json`; `juridico/informe.js` escribe el informe como HTML autónomo a partir de `mapa.filas`, `cadena.construir`, las fichas y los textos de `contenido/juridico.json`, marcando lo pendiente de verificación (spec 19.13). `editor/publicar.js` es la capa sobre el editor con los dos pasos (decisión de registro, resumen y descarga). El motor que se incrusta es el mismo que corre en el editor: `app.js` lo lee por `fetch` de los propios archivos de la plataforma y las pruebas lo leen del disco, con la misma lista de rutas, así una ruta olvidada rompe la prueba. Para que el motor no arrastre las fichas, `indiceCorte` pasa a `estado/corte.js` (modelo.js lo reexporta).

**Tech Stack:** El de los planes anteriores. Dependencia de desarrollo nueva: `@playwright/test` (recorrido de extremo a extremo; `npm test` sigue sin necesitar navegador). Spec: secciones 3 (paso 5), 12.6, 12.7, 13 (recordatorio tras publicar), 14, 15.3 (`exportar/paquete.js`, `juridico/informe.js`), 17 (paquete pesado), 18 (pruebas con navegador), 19.13.

---

## Mapa de planes

| Plan | Qué construye | Sección del spec |
|---|---|---|
| 1. Núcleo (hecho) | Modelo, fichas, licencias, semáforo, contenido jurídico, almacén, copias | 6, 12.2–12.5, 12.9, 13 |
| 2. Motor y editor (hecho) | Reproductor, `index.html`, arranque, inventario, guion, vista previa, propiedades, subida, copias | 3, 7, 8, 10, 13, 15.4, 16, 17 |
| 3. Fichas en pantalla (hecho) | Panel de ficha, semáforos, mapa de activos, créditos, foco al subir | 10, 12.1–12.6, 12.8, 12.9, 19.13 |
| 4. Biblioteca (hecho) | Catálogo validado, selector, licencia del curso, créditos, paleta | 11, 12.2, 9 (paleta) |
| 5. Herramientas (hecho) | Pixel art, grabador, secuenciador; sello de creación; reabrir un pixel art | 9, 15.3, 17 |
| **6. Publicación (este)** | Decisión de registro, informe, paquete de entrega, recorrido Playwright | 12.7, 14, 18 |

**Decisiones que este plan fija y el spec no decía:**

- **Un solo script clásico, no módulos.** `juego.html` no puede importar módulos (no hay servidor ni rutas). El motor se incrusta como un script clásico dentro de una función: los cinco módulos que necesita (`ui/dom.js`, `estado/corte.js`, `motor/partida.js`, `motor/pantalla.js`, `motor/reproductor.js`) se concatenan quitando `import` y `export`. Ningún nombre de primer nivel se repite entre ellos; la prueba de `empaquetar` lo comprueba evaluando el resultado. Esto exige que los `import` del motor sean de una línea y que `partida.js` no importe `modelo.js` (que arrastraría fichas y licencias): por eso `indiceCorte` se muda a `estado/corte.js`.
- **De dónde sale el motor en el navegador.** `app.js` lee los archivos del motor y los estilos con `fetch` desde la propia plataforma (`exportar/empaquetar.js: cargarMotor`), una sola vez, cuando el estudiante publica. Las pruebas leen los mismos archivos del disco (`tests/ayudas/motor.js`). La lista de rutas vive en un solo lugar (`RUTAS_MOTOR`, `RUTAS_ESTILOS`).
- **Recursos como `data:` URLs.** Cada archivo del proyecto entra en `juego.html` en base64. `resolverRecurso(id)` devuelve esa URL. Un archivo pesa 4/3 en base64, y además va en bruto en `archivos/`, así que el peso estimado del paquete es el doble de la suma de archivos; el aviso de 50 MB (spec 14) usa esa estimación y lo dice.
- **La huella del proyecto** es el SHA-256 del texto exacto de `proyecto.json` que va en el zip. Va en el informe, no en `proyecto.json` (sería circular). `proyecto.publicado` guarda la fecha ISO de la última publicación y se escribe antes de serializar, así queda en el proyecto y en el informe.
- **Decisión de registro** (spec 12.7): se eligen hasta tres activos entre la historia, los personajes y los elementos (el título no, porque no es obra). Por cada uno: «¿Lo registrarías ante la DNDA?» (sí/no), «¿A nombre de quién?» (texto, precargado con el estudiante o con el autor de la ficha) y «¿Con qué prueba?» (texto, precargado con la prueba de la ficha), más un «¿Por qué?» opcional. Hace falta al menos uno para seguir: el paso existe para pensarlo. Las respuestas se guardan en `proyecto.registro` al escribirlas, así sobreviven a cerrar la capa. La explicación de qué prueba el registro y qué no sale de `campos.prueba` y `notas.N_SELLO` del contenido, sin textos jurídicos nuevos.
- **Después de publicar** (spec 13): el paquete trae el proyecto completo y «Abrir copia» lo acepta, así que el aviso lo dice, reinicia el contador de cambios y ofrece «Guardar copia» de todos modos.
- **Informe autónomo.** `informe-juridico.html` lleva sus estilos dentro, con `@media print` para que «Guardar como PDF» del navegador salga limpio. Las entradas con `verificacion: pendiente` llevan la marca «Por verificar» en el lugar donde se citan y se listan al final (spec 19.13).
- **Playwright** corre aparte (`npm run test:e2e`), con Chromium y micrófono falso (`--use-fake-device-for-media-stream`), contra el servidor de `tests/manual/servir.js` en el puerto 8089. `npm test` sigue siendo solo Node.

## Convenciones de este plan

- Las de los planes anteriores: TDD, un commit por tarea, mensajes en español, `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Todo lo que escribe HTML (informe, juego) escapa los textos del estudiante con `escaparHtml`; lo que incrusta JSON en un `<script>` pasa por `escaparParaScript` (`</` y los separadores U+2028/2029).
- Conteo de pruebas: el plan 5 dejó 299. Cada tarea dice cuántas agrega; el cierre espera 332 en Node más el recorrido de Playwright.

## Estructura de archivos que deja este plan

```
plataforma/
  css/editor.css                    + capa de publicación (pasos, candidatos, pesos)
  js/
    estado/
      corte.js                      indiceCorte (compartido por validación y motor, sin fichas)
      modelo.js                     (cambia) reexporta indiceCorte
      archivos.js                   (cambia) nombreDeArchivo
      copias.js                     (cambia) valida registro y publicado
    motor/partida.js                (cambia) importa estado/corte.js
    exportar/
      empaquetar.js                 aBase64, aDataUrl, escaparHtml, escaparParaScript, empaquetarModulos, RUTAS_MOTOR, RUTAS_ESTILOS, cargarMotor
      paquete.js                    generarJuegoHtml, pesos, nombreDeEntrega, generarEntrega
    juridico/informe.js             generar(proyecto, { contenido, huella, fecha, nombreProducto }) → HTML
    editor/
      publicar.js                   crearPublicar(contenedor, sesion, { contenido, alGenerar, alCerrar })
      editor.js                     (cambia) Publicar abre la capa; genera y descarga el paquete
    app.js                          (cambia) cargarMotor y nombre del producto
playwright.config.js
package.json                        (cambia) @playwright/test y test:e2e
tests/
  ayudas/motor.js                   motorDesdeDisco()
  corte.test.js  empaquetar.test.js  paquete.test.js  informe.test.js  exportar.test.js  publicar.test.js
  copias.test.js  editor.test.js    (cambian)
  e2e/recorrido.spec.js             el recorrido completo en Chromium
```

---


### Task 1: Regla de corte aparte del modelo y utilidades de empaquetado

**Files:**
- Create: `plataforma/js/estado/corte.js`
- Create: `plataforma/js/exportar/empaquetar.js`
- Modify: `plataforma/js/estado/modelo.js`
- Modify: `plataforma/js/motor/partida.js`
- Test: `tests/ayudas/motor.js`
- Test: `tests/corte.test.js`
- Test: `tests/empaquetar.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

`tests/ayudas/motor.js`:

```js
// tests/ayudas/motor.js
// El motor tal como lo incrusta juego.html, leído del disco con la misma lista de rutas
// que usa app.js en el navegador (exportar/empaquetar.js). Si falta una ruta, falla aquí.
import { readFileSync } from 'node:fs';
import { RUTAS_MOTOR, RUTAS_ESTILOS } from '../../plataforma/js/exportar/empaquetar.js';

const BASE = new URL('../../plataforma/', import.meta.url);

export function motorDesdeDisco() {
  const leer = (ruta) => readFileSync(new URL(ruta, BASE), 'utf8');
  return {
    modulos: RUTAS_MOTOR.map((ruta) => ({ ruta, codigo: leer(ruta) })),
    estilos: RUTAS_ESTILOS.map(leer).join('\n'),
  };
}
```

`tests/corte.test.js`:

```js
// tests/corte.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { indiceCorte } from '../plataforma/js/estado/corte.js';
import { indiceCorte as desdeModelo, crearEscena, agregarLinea } from '../plataforma/js/estado/modelo.js';

test('indiceCorte vive en estado/corte.js y modelo.js lo reexporta', () => {
  assert.equal(desdeModelo, indiceCorte);
  const escena = crearEscena('x');
  assert.equal(indiceCorte(escena), -1);
  agregarLinea(escena, 'narracion', { texto: 'a' });
  agregarLinea(escena, 'decision', { texto: '¿?' });
  agregarLinea(escena, 'fin', { texto: 'fin' });
  assert.equal(indiceCorte(escena), 1);
});

test('el motor no importa el modelo (arrastraría fichas y licencias al juego exportado)', () => {
  for (const ruta of ['motor/partida.js', 'motor/pantalla.js', 'motor/reproductor.js', 'ui/dom.js', 'estado/corte.js']) {
    const codigo = readFileSync(new URL(`../plataforma/js/${ruta}`, import.meta.url), 'utf8');
    assert.ok(!/from '\.\.\/estado\/modelo\.js'|from '\.\/modelo\.js'/.test(codigo), `${ruta} importa modelo.js`);
    assert.ok(!/juridico\//.test(codigo), `${ruta} importa algo jurídico`);
  }
});
```

`tests/empaquetar.test.js`:

```js
// tests/empaquetar.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aBase64, aDataUrl, escaparHtml, escaparParaScript, empaquetarModulos, declaracionesDe, cargarMotor, RUTAS_MOTOR, RUTAS_ESTILOS } from '../plataforma/js/exportar/empaquetar.js';
import { motorDesdeDisco } from './ayudas/motor.js';

test('aBase64 codifica igual que Node, con bytes sueltos, ArrayBuffer y más de un trozo', () => {
  assert.equal(aBase64(new Uint8Array([72, 111, 108, 97])), 'SG9sYQ==');
  assert.equal(aBase64(new Uint8Array(0)), '');
  const grande = new Uint8Array(100_003);
  for (let i = 0; i < grande.length; i += 1) grande[i] = (i * 31 + 7) % 256;
  assert.equal(aBase64(grande), Buffer.from(grande).toString('base64'));
  assert.equal(aBase64(grande.buffer), Buffer.from(grande).toString('base64'));
});

test('aDataUrl arma la URL con el tipo y el base64', () => {
  const datos = new TextEncoder().encode('PNG').buffer;
  assert.equal(aDataUrl({ tipo: 'image/png', datos }), 'data:image/png;base64,UE5H');
  assert.equal(aDataUrl({ tipo: '', datos }), 'data:application/octet-stream;base64,UE5H');
});

test('escaparHtml y escaparParaScript neutralizan lo que rompería la página', () => {
  assert.equal(escaparHtml(`<b class="x">Ana & 'Eva'</b>`), '&lt;b class=&quot;x&quot;&gt;Ana &amp; &#39;Eva&#39;&lt;/b&gt;');
  assert.equal(escaparHtml(null), '');
  const [sep1, sep2] = [String.fromCharCode(0x2028), String.fromCharCode(0x2029)];
  const json = JSON.stringify({ t: `</script><!-- x ${sep1} y ${sep2}` });
  const escapado = escaparParaScript(json);
  assert.ok(!escapado.includes('</script'));
  assert.ok(!escapado.includes('<!--'));
  assert.ok(!escapado.includes(sep1) && !escapado.includes(sep2), 'sin separadores de línea Unicode crudos');
  assert.deepEqual(new Function(`return ${escapado}`)(), JSON.parse(json), 'sigue siendo el mismo valor al evaluarlo');
});

test('empaquetarModulos quita import y export, conserva el código y separa por módulo', () => {
  const modulos = [
    { ruta: 'a.js', codigo: "import { x } from './x.js';\nimport './efecto.js';\nexport const A = 1;\nexport function f() { return A; }\nexport async function g() {}\nexport class C {}\nexport { f as h };\nexport { y } from './y.js';\n" },
    { ruta: 'b.js', codigo: "const B = 2;\r\nexport let z = B;\r\n" },
  ];
  const salida = empaquetarModulos(modulos);
  assert.ok(!/^\s*(import|export)\b/m.test(salida), 'no quedan import ni export');
  assert.ok(salida.includes('// ---- a.js'));
  assert.ok(salida.includes('// ---- b.js'));
  assert.ok(salida.includes('const A = 1;'));
  assert.ok(salida.includes('async function g() {}'));
  assert.ok(salida.includes('class C {}'));
  assert.ok(salida.includes('let z = B;'));
  assert.ok(!salida.includes('\r'), 'sin retornos de carro');
  assert.equal(new Function(`${salida}\nreturn f() + z;`)(), 3);
});

test('empaquetarModulos rechaza lo que no sabe quitar: import de varias líneas o export default', () => {
  assert.throws(() => empaquetarModulos([{ ruta: 'm.js', codigo: "import {\n  a,\n} from './a.js';\n" }]), /m\.js.*varias líneas/);
  assert.throws(() => empaquetarModulos([{ ruta: 'd.js', codigo: 'export default function () {}\n' }]), /d\.js.*export/);
});

test('el motor real se empaqueta, evalúa y no repite nombres de primer nivel entre módulos', () => {
  const { modulos, estilos } = motorDesdeDisco();
  assert.deepEqual(modulos.map((m) => m.ruta), RUTAS_MOTOR);
  assert.ok(estilos.includes('.reproductor') && estilos.includes('--accent'), 'los estilos traen tokens y reproductor');
  const salida = empaquetarModulos(modulos);
  const tipos = new Function(`${salida}\nreturn [typeof jugar, typeof crearPantalla, typeof crearPartida, typeof indiceCorte, typeof h];`)();
  assert.deepEqual(tipos, ['function', 'function', 'function', 'function', 'function']);
  const vistos = new Map();
  for (const modulo of modulos) {
    for (const nombre of declaracionesDe(modulo.codigo)) {
      assert.ok(!vistos.has(nombre), `«${nombre}» está declarado en ${vistos.get(nombre)} y en ${modulo.ruta}`);
      vistos.set(nombre, modulo.ruta);
    }
  }
  assert.ok(vistos.size >= 15, `se detectaron ${vistos.size} declaraciones; deberían ser muchas más`);
});

test('cargarMotor lee las rutas en orden con fetch y falla con la ruta que no carga', async () => {
  const pedidas = [];
  const fetch = async (url) => {
    const ruta = String(url).replace('http://x/plataforma/', '');
    pedidas.push(ruta);
    return { ok: true, status: 200, text: async () => `/* ${ruta} */` };
  };
  const motor = await cargarMotor({ base: 'http://x/plataforma/', fetch });
  assert.deepEqual(pedidas, [...RUTAS_MOTOR, ...RUTAS_ESTILOS]);
  assert.deepEqual(motor.modulos.map((m) => m.codigo), RUTAS_MOTOR.map((r) => `/* ${r} */`));
  assert.equal(motor.estilos, RUTAS_ESTILOS.map((r) => `/* ${r} */`).join('\n'));

  const roto = async (url) => ({ ok: !String(url).endsWith('pantalla.js'), status: 404, text: async () => '' });
  await assert.rejects(cargarMotor({ base: 'http://x/plataforma/', fetch: roto }), /js\/motor\/pantalla\.js \(404\)/);
});
```

- [ ] **Step 2: Correr las pruebas y ver que fallan**

Run: `node --test tests/corte.test.js tests/empaquetar.test.js`
Expected: FAIL: `Cannot find module .../plataforma/js/estado/corte.js` y `.../exportar/empaquetar.js`.

- [ ] **Step 3: Implementar**

`plataforma/js/estado/corte.js`:

```js
// plataforma/js/estado/corte.js
// La regla de corte (spec, sección 6): una escena termina en su primera línea de
// decisión o de fin. La comparten la validación y el motor; vive aparte para que el
// juego exportado (plan 6) incruste el motor sin arrastrar el modelo ni las fichas.

/** Índice de la primera línea de decisión o fin de la escena, o -1 si no hay. */
export function indiceCorte(escena) {
  return escena.lineas.findIndex((l) => l.tipo === 'decision' || l.tipo === 'fin');
}
```

`plataforma/js/exportar/empaquetar.js`:

```js
// plataforma/js/exportar/empaquetar.js
// Lo que hace falta para meter el juego en un solo archivo HTML (spec, sección 14):
// archivos como data: URLs en base64, textos escapados, y los módulos ES del motor
// convertidos en un solo script clásico. Puro: funciona igual en Node y en el navegador.
//
// Regla del empaquetado: los módulos se concatenan en orden de dependencias quitando
// las líneas `import` y la palabra `export`. Exige imports de una sola línea y que
// ningún nombre de primer nivel se repita entre módulos (tests/empaquetar.test.js lo
// comprueba con el motor real).

/** Rutas, relativas a plataforma/, de lo que juego.html incrusta. El orden es el de las dependencias. */
export const RUTAS_MOTOR = ['js/ui/dom.js', 'js/estado/corte.js', 'js/motor/partida.js', 'js/motor/pantalla.js', 'js/motor/reproductor.js'];
export const RUTAS_ESTILOS = ['css/tokens.css', 'css/reproductor.css'];

const TROZO = 0x8000;

/** @param {ArrayBuffer|Uint8Array} datos */
export function aBase64(datos) {
  const bytes = datos instanceof Uint8Array ? datos : new Uint8Array(datos);
  let binario = '';
  for (let i = 0; i < bytes.length; i += TROZO) binario += String.fromCharCode.apply(null, bytes.subarray(i, i + TROZO));
  return btoa(binario);
}

/** @param {{ tipo: string, datos: ArrayBuffer|Uint8Array }} archivo */
export function aDataUrl(archivo) {
  return `data:${archivo.tipo || 'application/octet-stream'};base64,${aBase64(archivo.datos)}`;
}

const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escaparHtml(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ENTIDADES[c]);
}

/** JSON que va dentro de un <script>: nada que cierre la etiqueta ni abra un comentario HTML, y sin separadores de línea Unicode. */
// Los separadores U+2028 y U+2029 se construyen con fromCharCode para que ningún editor los convierta en caracteres crudos.
const SEPARADORES_DE_LINEA = new RegExp(`[${String.fromCharCode(0x2028)}${String.fromCharCode(0x2029)}]`, 'g');

export function escaparParaScript(texto) {
  return texto
    .replace(/<\//g, '<\\/')
    .replace(/<!--/g, '<\\!--')
    .replace(SEPARADORES_DE_LINEA, (c) => `\\u${c.charCodeAt(0).toString(16)}`);
}

const IMPORT_DE_UNA_LINEA = /^import\s[^;]*;\s*$/;
const REEXPORT = /^export\s*\{[^}]*\}\s*(from\s*['"][^'"]+['"])?\s*;\s*$/;
const EXPORT_DECLARACION = /^export\s+(?=(?:async\s+)?function\b|const\b|let\b|class\b)/;
const DECLARACION = /^(?:export\s+)?(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm;

/** Nombres declarados en el primer nivel de un módulo (function, const, let, class). */
export function declaracionesDe(codigo) {
  return [...codigo.matchAll(DECLARACION)].map((m) => m[1]);
}

/**
 * @param {Array<{ ruta: string, codigo: string }>} modulos en orden de dependencias
 * @returns {string} un script clásico con todos los módulos
 */
export function empaquetarModulos(modulos) {
  return modulos.map(({ ruta, codigo }) => {
    const lineas = codigo.split('\n').map((cruda) => {
      const linea = cruda.replace(/\r$/, '');
      if (IMPORT_DE_UNA_LINEA.test(linea) || REEXPORT.test(linea)) return '';
      if (/^import\b/.test(linea)) throw new Error(`${ruta}: hay un import de varias líneas y no se puede empaquetar: ${linea}`);
      const sinExport = linea.replace(EXPORT_DECLARACION, '');
      if (/^export\b/.test(sinExport)) throw new Error(`${ruta}: hay un export que no se puede empaquetar: ${linea}`);
      return sinExport;
    });
    return `// ---- ${ruta}\n${lineas.join('\n')}`;
  }).join('\n');
}

/**
 * Lee el motor y los estilos desde la propia plataforma (en el navegador, con fetch).
 * @param {{ base?: string|URL, fetch?: typeof fetch }} opciones base es la carpeta plataforma/
 * @returns {Promise<{ modulos: Array<{ ruta, codigo }>, estilos: string }>}
 */
export async function cargarMotor({ base = new URL('../../', import.meta.url), fetch = globalThis.fetch } = {}) {
  const leer = async (ruta) => {
    const respuesta = await fetch(new URL(ruta, base));
    if (!respuesta.ok) throw new Error(`No se pudo leer ${ruta} (${respuesta.status}).`);
    return respuesta.text();
  };
  const modulos = [];
  for (const ruta of RUTAS_MOTOR) modulos.push({ ruta, codigo: await leer(ruta) });
  const estilos = [];
  for (const ruta of RUTAS_ESTILOS) estilos.push(await leer(ruta));
  return { modulos, estilos: estilos.join('\n') };
}
```

Cambio en `plataforma/js/estado/modelo.js`:

```diff
diff --git a/plataforma/js/estado/modelo.js b/plataforma/js/estado/modelo.js
index 15a23b5..01426fe 100644
--- a/plataforma/js/estado/modelo.js
+++ b/plataforma/js/estado/modelo.js
@@ -5,8 +5,9 @@
 // sin error; la validez estructural (nombres vacíos, opciones de más o de menos,
 // referencias rotas) la informa validar(), no los mutadores.
 import { crearFicha, DESTINOS } from '../juridico/ficha.js';
+import { indiceCorte } from './corte.js';
 
-export { DESTINOS };
+export { DESTINOS, indiceCorte };
 
 export const VERSION_PROYECTO = 1;
 export const TIPOS_ELEMENTO = ['fondo', 'retrato', 'musica', 'efecto', 'voz'];
@@ -137,7 +138,4 @@ export function eliminarLinea(escena, indice) {
   escena.lineas.splice(indice, 1);
 }
 
-/** Índice de la primera línea de decisión o fin de la escena, o -1 si no hay. El reproductor y la validación comparten esta regla. */
-export function indiceCorte(escena) {
-  return escena.lineas.findIndex((l) => l.tipo === 'decision' || l.tipo === 'fin');
-}
+// La regla de corte (indiceCorte) vive en corte.js y se reexporta arriba: el motor la importa de ahí sin arrastrar las fichas.
```

Cambio en `plataforma/js/motor/partida.js`:

```diff
diff --git a/plataforma/js/motor/partida.js b/plataforma/js/motor/partida.js
index 66255b6..1b6dd18 100644
--- a/plataforma/js/motor/partida.js
+++ b/plataforma/js/motor/partida.js
@@ -3,7 +3,7 @@
 // ni audio. Comparte la regla de corte con la validación (indiceCorte): una escena
 // termina en su primera decisión o fin; sin ninguna de las dos, sigue la siguiente
 // escena de la lista; sin siguiente, créditos. Una escena sin líneas se salta.
-import { indiceCorte } from '../estado/modelo.js';
+import { indiceCorte } from '../estado/corte.js';
 
 const escenaPorId = (juego, id) => juego.escenas.find((e) => e.id === id) ?? null;
```

- [ ] **Step 4: Correr las pruebas y ver que pasan**

Run: `node --test tests/corte.test.js tests/empaquetar.test.js`
Expected: PASS: 9 pruebas. La suite completa: 308.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Exportar: regla de corte aparte del modelo, base64, escapes y empaquetado del motor en un solo script"
```


### Task 2: juego.html en un solo archivo y pesos del paquete

**Files:**
- Create: `plataforma/js/exportar/paquete.js`
- Test: `tests/paquete.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

`tests/paquete.test.js`:

```js
// tests/paquete.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM, VirtualConsole } from 'jsdom';
import { generarJuegoHtml, pesos, FACTOR_PAQUETE } from '../plataforma/js/exportar/paquete.js';
import { creditos } from '../plataforma/js/juridico/cadena.js';
import { proyectoPublicable } from './ayudas/proyecto.js';
import { motorDesdeDisco } from './ayudas/motor.js';

const motor = motorDesdeDisco();

/** Abre el HTML generado en jsdom con los scripts corriendo; el audio de jsdom no está implementado y se silencia. */
function abrirJuego(html) {
  const virtualConsole = new VirtualConsole();
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole });
  const { document } = dom.window;
  const q = (selector) => document.querySelector(selector);
  const clic = (nodo) => nodo.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  return { dom, document, q, clic };
}

test('generarJuegoHtml incrusta el motor, los estilos, el documento, los recursos en base64 y los créditos', () => {
  const { p, archivos, muelle } = proyectoPublicable();
  const html = generarJuegoHtml(p, archivos, motor);
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(html.includes('<title>La llave del faro</title>'));
  assert.ok(html.includes('function jugar('), 'el reproductor está dentro');
  assert.ok(html.includes('.escenario-caja'), 'los estilos del reproductor están dentro');
  assert.ok(!/^\s*(import|export)\b/m.test(html), 'sin import ni export: es un script clásico');
  for (const archivo of archivos.values()) {
    assert.ok(html.includes(`data:${archivo.tipo};base64,`), 'cada archivo va como data: URL');
  }
  assert.ok(html.includes(JSON.stringify(muelle.fondo)), 'el documento del juego va dentro');
  for (const linea of creditos(p)) assert.ok(html.includes(JSON.stringify(linea)), `crédito presente: ${linea}`);
  assert.ok(!html.includes('"fichas"'), 'las fichas no viajan en el juego');
});

test('generarJuegoHtml escapa el título en la página y lo que cerraría el script', () => {
  const { p, archivos } = proyectoPublicable();
  p.juego.titulo = '</script><b>Faro</b>';
  p.juego.escenas[0].lineas[0].texto = 'Cuidado: </script> <!-- ahí';
  const html = generarJuegoHtml(p, archivos, motor);
  assert.ok(html.includes('<title>&lt;/script&gt;&lt;b&gt;Faro&lt;/b&gt;</title>'));
  const cuerpo = html.slice(html.indexOf('<script>') + 8);
  assert.equal(cuerpo.indexOf('</script>'), cuerpo.lastIndexOf('</script>'), 'solo cierra el script una vez');
  assert.ok(!cuerpo.includes('<!--'));
  const { q } = abrirJuego(html);
  assert.equal(q('.escenario-texto').textContent, 'Cuidado: </script> <!-- ahí', 'el texto llega intacto al jugador');
});

test('generarJuegoHtml falla si falta el archivo de un elemento', () => {
  const { p, archivos, olas } = proyectoPublicable();
  archivos.delete(olas.id);
  assert.throws(() => generarJuegoHtml(p, archivos, motor), (error) => error.codigo === 'archivo_faltante' && /«Olas»/.test(error.message));
});

test('el juego.html generado se juega solo en jsdom: avanza, decide y termina en los créditos con las líneas de las fichas', () => {
  const { p, archivos } = proyectoPublicable();
  const html = generarJuegoHtml(p, archivos, motor);
  const { document, q, clic } = abrirJuego(html);
  assert.equal(document.title, 'La llave del faro');
  assert.equal(q('.reproductor-titulo').textContent, 'La llave del faro');
  assert.equal(q('.escenario-nombre').textContent, 'Ana');
  assert.equal(q('.escenario-texto').textContent, '¿Quién dejó la puerta abierta?');
  assert.ok(q('.escenario-fondo img').getAttribute('src').startsWith('data:application/octet-stream;base64,'));
  assert.ok(q('.escenario-retrato img').classList.contains('pixel'), 'el retrato creado se escala sin suavizado');
  assert.equal(q('button[data-accion="cerrar"]'), null, 'el juego exportado no tiene Cerrar');
  clic(q('.reproductor-escena'));
  assert.equal(q('.escenario-texto').textContent, '¿Subes a la torre?');
  clic(q('.opcion[data-opcion="0"]'));
  assert.equal(q('.escenario-texto').textContent, 'Fin');
  clic(q('.reproductor-escena'));
  const lineas = [...document.querySelectorAll('.escenario-creditos li')].map((n) => n.textContent);
  assert.deepEqual(lineas, creditos(p));
  assert.ok(lineas[0].startsWith('Camila R.'));
});

test('pesos ordena los elementos de mayor a menor y estima el paquete', () => {
  const { p, archivos, olas, tema } = proyectoPublicable();
  archivos.set(olas.id, { tipo: 'audio/wav', datos: new ArrayBuffer(5000) });
  archivos.set(tema.id, { tipo: 'audio/ogg', datos: new ArrayBuffer(9000) });
  const resultado = pesos(p, archivos);
  assert.equal(resultado.elementos[0].id, tema.id);
  assert.equal(resultado.elementos[0].bytes, 9000);
  assert.equal(resultado.elementos[0].tipo, 'musica');
  assert.equal(resultado.elementos[1].id, olas.id);
  assert.equal(resultado.elementos.length, p.juego.elementos.length);
  const suma = [...archivos.values()].reduce((s, a) => s + a.datos.byteLength, 0);
  assert.equal(resultado.total, suma);
  assert.equal(resultado.estimado, suma * FACTOR_PAQUETE);
  archivos.delete(olas.id);
  assert.equal(pesos(p, archivos).elementos.find((e) => e.id === olas.id).bytes, 0, 'sin archivo pesa cero');
});
```

- [ ] **Step 2: Correr las pruebas y ver que fallan**

Run: `node --test tests/paquete.test.js`
Expected: FAIL: `Cannot find module .../plataforma/js/exportar/paquete.js`.

- [ ] **Step 3: Implementar**

`plataforma/js/exportar/paquete.js`:

```js
// plataforma/js/exportar/paquete.js
// El paquete de entrega (spec, sección 14): juego.html con el motor, el documento y
// los recursos incrustados; el informe; y el proyecto en bruto. Sin DOM de la
// plataforma: lo llama el editor en el navegador y las pruebas en Node.
import { creditos as creditosDe } from '../juridico/cadena.js';
import { empaquetarModulos, aDataUrl, escaparHtml, escaparParaScript } from './empaquetar.js';

/** Cada archivo va dos veces en el paquete (en bruto y en base64 dentro de juego.html): el peso se estima al doble. */
export const FACTOR_PAQUETE = 2;

const falla = (codigo, mensaje) => Object.assign(new Error(mensaje), { codigo });

const ESTILOS_PAGINA = `
html, body { margin: 0; min-height: 100%; background: #06080b; }
body { display: flex; }
#juego { flex: 1; display: flex; }
#juego .reproductor { flex: 1; }
noscript { display: block; padding: 24px; color: #f2efe6; font-family: system-ui, sans-serif; }`;

/**
 * El juego completo en un solo archivo HTML, sin internet (spec 14). El motor es el mismo
 * que corre en el editor; los recursos van como data: URLs.
 * @param {object} proyecto
 * @param {Map<string, { tipo, datos }>} archivos por id de elemento
 * @param {{ modulos: Array<{ ruta, codigo }>, estilos: string }} motor de cargarMotor() o motorDesdeDisco()
 * @param {{ creditos?: string[] }} opciones las líneas de créditos; por defecto salen de las fichas
 * @returns {string}
 */
export function generarJuegoHtml(proyecto, archivos, motor, { creditos = creditosDe(proyecto) } = {}) {
  const { juego } = proyecto;
  const recursos = {};
  for (const elemento of juego.elementos) {
    const archivo = archivos.get(elemento.id);
    if (!archivo) throw falla('archivo_faltante', `Falta el archivo del elemento «${elemento.nombre}».`);
    recursos[elemento.id] = aDataUrl(archivo);
  }
  const titulo = juego.titulo?.trim() || 'Sin título';
  const datos = escaparParaScript(JSON.stringify({ juego, recursos, creditos }));
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escaparHtml(titulo)}</title>
<style>
${motor.estilos}
${ESTILOS_PAGINA}
</style>
</head>
<body>
<div id="juego"></div>
<noscript>Este juego necesita JavaScript para funcionar.</noscript>
<script>
(() => {
${empaquetarModulos(motor.modulos)}
// ---- el juego
const DATOS = ${datos};
jugar(document.getElementById('juego'), DATOS.juego, (id) => DATOS.recursos[id] ?? null, { creditos: DATOS.creditos });
})();
</script>
</body>
</html>
`;
}

/**
 * Cuánto pesa cada elemento, de mayor a menor, y el total (spec 14 y 17: paquete pesado).
 * @returns {{ elementos: Array<{ id, nombre, tipo, bytes }>, total: number, estimado: number }}
 */
export function pesos(proyecto, archivos) {
  const elementos = proyecto.juego.elementos.map((e) => ({
    id: e.id,
    nombre: e.nombre?.trim() || 'Sin nombre',
    tipo: e.tipo,
    bytes: archivos.get(e.id)?.datos?.byteLength ?? 0,
  }));
  elementos.sort((a, b) => b.bytes - a.bytes);
  const total = elementos.reduce((suma, e) => suma + e.bytes, 0);
  return { elementos, total, estimado: total * FACTOR_PAQUETE };
}
```

- [ ] **Step 4: Correr las pruebas y ver que pasan**

Run: `node --test tests/paquete.test.js`
Expected: PASS: 5 pruebas (una de ellas abre el HTML generado en jsdom y lo juega hasta los créditos). La suite: 313.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Exportar: juego.html en un solo archivo con motor, documento, recursos en base64 y créditos; pesos del paquete"
```


### Task 3: El informe jurídico

**Files:**
- Create: `plataforma/js/juridico/informe.js`
- Modify: `plataforma/js/editor/propiedades.js`
- Modify: `plataforma/js/juridico/formulario.js`
- Modify: `plataforma/js/juridico/formulario.js`
- Modify: `plataforma/js/juridico/informe.js`
- Test: `tests/informe.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

`tests/informe.test.js`:

```js
// tests/informe.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { generar } from '../plataforma/js/juridico/informe.js';
import { filas } from '../plataforma/js/juridico/mapa.js';
import { proyectoPublicable } from './ayudas/proyecto.js';

const contenido = JSON.parse(readFileSync(new URL('../plataforma/contenido/juridico.json', import.meta.url), 'utf8'));
const HUELLA = 'sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const FECHA = '2026-11-06T15:30:00.000Z';

function armar(ajustar = () => {}) {
  const todo = proyectoPublicable();
  ajustar(todo);
  const html = generar(todo.p, { contenido, huella: HUELLA, fecha: FECHA });
  const { document } = new JSDOM(html).window;
  const q = (selector) => document.querySelector(selector);
  const qa = (selector) => [...document.querySelectorAll(selector)];
  const texto = (selector) => q(selector)?.textContent.replace(/\s+/g, ' ').trim();
  return { ...todo, html, document, q, qa, texto };
}

test('la portada trae estudiante, juego, destino, fecha, huella y la leyenda educativa', () => {
  const { html, q, texto } = armar();
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.equal(q('title').textContent, 'Informe jurídico: La llave del faro');
  assert.equal(q('h1').textContent, 'La llave del faro');
  const portada = texto('.portada');
  assert.ok(portada.includes('Camila R.'));
  assert.ok(portada.includes('Publicarlo gratis'));
  assert.ok(portada.includes(FECHA));
  assert.ok(portada.includes(HUELLA));
  assert.ok(portada.includes(contenido.nombre));
  assert.ok(texto('.aviso-legal').includes('Material educativo'));
  assert.ok(texto('footer').includes('Memo de verificación legal'));
  assert.ok(!html.includes('<script'), 'el informe no lleva scripts');
  assert.ok(html.includes('@media print'), 'está pensado para imprimirse');
});

test('el mapa de activos tiene una fila por ficha con creador, contrato, prueba, riesgo y acción', () => {
  const { p, qa, texto } = armar();
  const esperadas = filas(p, contenido);
  const filasHtml = qa('#mapa tbody tr');
  assert.equal(filasHtml.length, esperadas.length);
  esperadas.forEach((fila, i) => {
    const celdas = [...filasHtml[i].querySelectorAll('td')].map((td) => td.textContent.replace(/\s+/g, ' ').trim());
    assert.ok(celdas[0].includes(fila.activo), `activo ${fila.activo}`);
    assert.equal(celdas[1], fila.creador);
    assert.equal(celdas[2], fila.contrato);
    assert.equal(celdas[3], fila.prueba);
    assert.ok(celdas[4].includes(fila.color));
    if (fila.porVerificar) assert.ok(celdas[4].includes('Por verificar'));
  });
  assert.ok(texto('#mapa').includes('Nada por hacer'), 'un activo en verde no tiene acción');
});

test('la cadena de titularidad es un árbol: el retrato cuelga del personaje y cada nodo dice autoría, titular y respaldo', () => {
  const { q, texto } = armar();
  const arbol = q('#cadena ul.arbol');
  assert.ok(arbol);
  assert.ok(texto('#cadena > ul.arbol > li').startsWith('La llave del faro'));
  const ana = [...arbol.querySelectorAll('li')].find((li) => li.firstChild.textContent.includes('personaje «Ana»'));
  assert.ok(ana, 'nodo del personaje');
  assert.ok(ana.querySelector('ul li').textContent.includes('retrato «Ana»'), 'el retrato cuelga del personaje');
  const tema = [...arbol.querySelectorAll('li')].find((li) => li.textContent.includes('música «Tema»'));
  const detalle = tema.textContent.replace(/\s+/g, ' ');
  assert.ok(detalle.includes('Otra persona') && detalle.includes('Autora Ejemplo') && detalle.includes('Licencia') && detalle.includes('verde'));
});

test('la decisión de registro muestra cada respuesta; sin decisiones lo dice; la explicación de la prueba se marca por verificar', () => {
  const vacio = armar();
  assert.ok(vacio.texto('#registro').includes('no dejó decisiones de registro'));
  const { ana, tema, texto } = armar(({ p, ana, tema }) => {
    p.registro = [
      { id: ana.id, registraria: 'si', aNombreDe: 'Camila R.', prueba: 'El archivo PNG con la fecha del sello', porque: 'Es mi personaje principal.' },
      { id: tema.id, registraria: 'no', aNombreDe: 'Autora Ejemplo', prueba: 'La licencia', porque: '' },
    ];
  });
  const seccion = texto('#registro');
  assert.ok(seccion.includes('Ana') && seccion.includes('Sí lo registraría') && seccion.includes('Camila R.') && seccion.includes('El archivo PNG'));
  assert.ok(seccion.includes('Es mi personaje principal.'));
  assert.ok(seccion.includes('Tema') && seccion.includes('No lo registraría') && seccion.includes('Autora Ejemplo'));
  assert.ok(seccion.includes(contenido.campos.prueba.breve));
  assert.ok(seccion.includes('Por verificar'), 'campos.prueba está pendiente de verificación');
  assert.ok(ana && tema);
});

test('cada ficha completa: respuestas, licencia, crédito, prueba con sello, pieza de biblioteca, semáforo con razones y notas', () => {
  const { p, tema, olas, qa, document } = armar(({ p, tema, olas }) => {
    p.juego.elementos.find((e) => e.id === olas.id).sello = { fecha: '2026-11-05T10:00:00.000Z', huella: 'sha256:abc' };
    p.fichas[tema.id].credito = '«Tema» de Autora Ejemplo, CC BY-NC 4.0';
    p.fichas[olas.id].modificado = false;
  });
  const fichas = qa('#fichas article.ficha');
  assert.equal(fichas.length, Object.keys(p.fichas).length);
  const porId = (id) => document.querySelector(`#fichas article[data-ficha="${id}"]`).textContent.replace(/\s+/g, ' ');
  const titulo = porId('titulo');
  assert.ok(titulo.includes('Título: no es obra; puede ser marca') && titulo.includes(contenido.notas.N_TITULO.breve));
  assert.ok(!titulo.includes('¿Quién lo hizo?'), 'el título no pregunta autoría');
  const musica = porId(tema.id);
  assert.ok(musica.includes('Obra musical y grabación (fonograma)'));
  assert.ok(musica.includes('Otra persona') && musica.includes('Autora Ejemplo'));
  assert.ok(musica.includes('Creative Commons Atribución y no comercial 4.0'));
  assert.ok(musica.includes('Leí la licencia: sí'));
  assert.ok(musica.includes('«Tema» de Autora Ejemplo, CC BY-NC 4.0'));
  assert.ok(musica.includes('De la biblioteca') && musica.includes('bib_m1'));
  assert.ok(musica.includes('Semáforo: verde') && musica.includes('Ninguna regla aplica'));
  const efecto = porId(olas.id);
  assert.ok(efecto.includes('Sello de la plataforma') && efecto.includes('2026-11-05T10:00:00.000Z') && efecto.includes('sha256:abc'));
  assert.ok(efecto.includes(contenido.notas.N_SELLO.breve) && efecto.includes('Por verificar'));
  assert.ok(efecto.includes(contenido.notas.N_SELLO.fuente), 'las notas llevan su fuente');
});

test('una ficha en rojo muestra la razón con su acción, texto completo y fuente', () => {
  const { tema, document } = armar(({ p, tema }) => { p.juego.destino = 'venta'; p.fichas[tema.id].credito = 'x'; });
  const musica = document.querySelector(`#fichas article[data-ficha="${tema.id}"]`).textContent.replace(/\s+/g, ' ');
  assert.ok(musica.includes('Semáforo: rojo'));
  assert.ok(musica.includes(contenido.reglas.R03.breve));
  assert.ok(musica.includes(contenido.reglas.R03.accion));
  assert.ok(musica.includes(contenido.reglas.R03.completo));
  assert.ok(musica.includes(contenido.reglas.R03.fuente));
});

test('las explicaciones de los campos y los tipos de obra usados van una vez, y los textos pendientes se listan al final', () => {
  const { texto, qa } = armar();
  const explicaciones = texto('#explicaciones');
  for (const campo of ['autoria', 'titular', 'respaldo', 'credito', 'prueba', 'destino']) assert.ok(explicaciones.includes(contenido.campos[campo].completo), `campo ${campo}`);
  assert.ok(explicaciones.includes(contenido.tiposObra.artistica.completo));
  assert.ok(!explicaciones.includes(contenido.tiposObra.interpretacion.completo), 'sin voces, no se explica la interpretación');
  const pendientes = qa('#pendientes li').map((li) => li.textContent);
  assert.ok(pendientes.some((t) => t.includes('campos.prueba')));
  assert.ok(pendientes.some((t) => t.includes('notas.N_SELLO')));
  assert.ok(pendientes.some((t) => t.includes('tiposObra.musical_fonograma')));
  assert.ok(!pendientes.some((t) => t.includes('interpretacion')), 'solo lo que el informe usa');
});

test('escapa lo que escribe el estudiante y no deja undefined ni objetos sin formato', () => {
  const { html, document } = armar(({ p }) => {
    p.estudiante = '<b>Camila</b> & Eva';
    p.juego.titulo = '';
    p.juego.personajes[0].nombre = '';
  });
  assert.ok(html.includes('&lt;b&gt;Camila&lt;/b&gt; &amp; Eva'));
  assert.ok(!html.includes('<b>Camila</b>'));
  const cuerpo = document.body.textContent;
  assert.ok(!/undefined|\[object Object\]|\bnull\b|NaN/.test(cuerpo), cuerpo.match(/undefined|\[object Object\]|\bnull\b|NaN/)?.[0]);
  assert.ok(cuerpo.includes('Sin título') && cuerpo.includes('Sin nombre'));
});
```

- [ ] **Step 2: Correr las pruebas y ver que fallan**

Run: `node --test tests/informe.test.js`
Expected: FAIL: `Cannot find module .../plataforma/js/juridico/informe.js`.

- [ ] **Step 3: Implementar**

`plataforma/js/juridico/informe.js`:

```js
// plataforma/js/juridico/informe.js
// El informe jurídico del paquete de entrega (spec, sección 14): una página HTML
// autónoma e imprimible con portada, mapa de activos, cadena de titularidad, decisión
// de registro, todas las fichas con sus razones y notas, las explicaciones del
// contenido una sola vez y la lista de textos pendientes de verificación (spec 19.13).
// Puro: devuelve texto. Todo lo que escribió el estudiante pasa por escaparHtml.
import { evaluarTodo } from './semaforo.js';
import { describir } from './textos.js';
import { filas, TIPOS_ACTIVO } from './mapa.js';
import { construir } from './cadena.js';
import { visibles, ETIQUETAS, PREGUNTAS, NOMBRES_DESTINO } from './formulario.js';
import { LICENCIAS, condicionesDe } from './licencias.js';
import { TIPOS_OBRA } from './ficha.js';
import { nombreDe } from '../estado/validacion.js';
import { escaparHtml as e } from '../exportar/empaquetar.js';

const NOMBRES_ORIGEN = { escrito: 'Escrito en la plataforma', creado: 'Creado en la plataforma', subido: 'Subido', biblioteca: 'De la biblioteca' };
const CAMPOS_EXPLICADOS = ['tipoObra', 'autoria', 'titular', 'respaldo', 'credito', 'prueba', 'destino'];
const TITULOS_CAMPO = { ...PREGUNTAS, destino: 'Destino del juego' };
const siNo = (valor) => (valor ? 'sí' : 'no');
const oGuion = (texto) => (texto?.trim() ? e(texto) : '—');
const lista = (items) => (items.length ? `<ul>${items.join('')}</ul>` : '');

const ESTILOS = `
:root { color-scheme: light; }
body { max-width: 960px; margin: 0 auto; padding: 32px 24px 64px; font: 15px/1.5 Georgia, "Times New Roman", serif; color: #1a1d22; background: #fff; }
h1 { font: 700 32px/1.1 "Arial Black", "Segoe UI Black", Arial, sans-serif; margin: 0 0 16px; }
h2 { font: 700 20px/1.2 Arial, sans-serif; margin: 40px 0 12px; padding-top: 12px; border-top: 2px solid #1a1d22; }
h3 { font: 700 16px/1.3 Arial, sans-serif; margin: 20px 0 6px; }
.eyebrow { margin: 0 0 8px; font: 11px/1 Consolas, monospace; letter-spacing: .14em; text-transform: uppercase; color: #2f5d00; }
.portada { padding-bottom: 20px; border-bottom: 2px solid #1a1d22; }
.datos { display: grid; grid-template-columns: max-content 1fr; gap: 4px 16px; margin: 0 0 16px; }
.datos dt { font: 700 12px/1.6 Arial, sans-serif; text-transform: uppercase; letter-spacing: .06em; color: #5d5a52; }
.datos dd { margin: 0; overflow-wrap: anywhere; }
.aviso-legal { padding: 10px 14px; background: #f4f0e6; border-left: 4px solid #2f5d00; font-size: 13px; }
.indice { margin: 16px 0 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 6px 18px; font-family: Arial, sans-serif; font-size: 13px; }
table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 13px; }
th, td { padding: 6px 8px; border-bottom: 1px solid #d9d2c3; text-align: left; vertical-align: top; }
thead th { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #5d5a52; }
td ul, .razones, .notas { margin: 0; padding-left: 18px; }
.tipo { display: block; font: 10px/1.6 Consolas, monospace; text-transform: uppercase; letter-spacing: .06em; color: #5d5a52; }
.punto { display: inline-block; width: 10px; height: 10px; border-radius: 50%; vertical-align: middle; margin-right: 4px; border: 1px solid #868e96; }
.semaforo-verde { background: #2b8a3e; } .semaforo-amarillo { background: #d9930d; } .semaforo-rojo { background: #c92a2a; }
.riesgo-rojo td:first-child { box-shadow: inset 3px 0 0 #c92a2a; } .riesgo-amarillo td:first-child { box-shadow: inset 3px 0 0 #d9930d; }
.por-verificar { display: inline-block; margin-left: 6px; padding: 1px 6px; border-radius: 99px; background: #ffb648; color: #101408; font: 9px/1.6 Consolas, monospace; letter-spacing: .06em; text-transform: uppercase; vertical-align: middle; }
.arbol, .arbol ul { list-style: none; padding-left: 22px; margin: 4px 0; border-left: 1px solid #d9d2c3; }
.arbol > li { border: 0; }
.arbol li { margin: 4px 0; font-size: 14px; }
.nodo { font-weight: 700; }
.ficha { margin: 18px 0; padding: 14px 16px; border: 1px solid #d9d2c3; border-radius: 10px; page-break-inside: avoid; }
.ficha h3 { margin-top: 0; }
.ficha table th { width: 220px; font-weight: 700; }
.resultado { margin-top: 12px; padding: 10px 12px; background: #f4f0e6; border-radius: 8px; }
.resultado p { margin: 0 0 6px; }
.razones li, .notas li { margin-bottom: 8px; }
.fuente { font-size: 12px; font-style: italic; color: #5d5a52; }
.completo { font-size: 13px; }
.decision { margin: 12px 0; padding: 10px 14px; border-left: 3px solid #2f5d00; background: #fafaf7; }
.decision h3 { margin: 0 0 6px; }
.decision dl { display: grid; grid-template-columns: max-content 1fr; gap: 2px 14px; margin: 0; font-size: 14px; }
.decision dt { font-weight: 700; } .decision dd { margin: 0; }
footer { margin-top: 48px; padding-top: 12px; border-top: 1px solid #d9d2c3; font-size: 12px; color: #5d5a52; }
@page { margin: 2cm; }
@media print {
  body { padding: 0; font-size: 12px; }
  h2 { page-break-before: always; }
  .portada h2, #mapa h2 { page-break-before: auto; }
  a { color: inherit; text-decoration: none; }
}`;

/**
 * @param {object} proyecto
 * @param {{ contenido: object, huella: string, fecha: string, nombreProducto?: string }} opciones
 *   huella: SHA-256 del proyecto.json que va en el paquete; fecha: ISO de la publicación.
 * @returns {string} HTML completo
 */
export function generar(proyecto, { contenido, huella, fecha, nombreProducto = contenido.nombre ?? 'Mi primer videojuego' }) {
  const { juego } = proyecto;
  const titulo = juego.titulo?.trim() || 'Sin título';
  const estudiante = proyecto.estudiante?.trim() || 'Sin nombre';
  const semaforos = evaluarTodo(proyecto);
  const pendientes = new Map();

  /** Marca «Por verificar» y la anota para la lista final. */
  function marca(entrada, clave) {
    if (entrada?.verificacion !== 'pendiente') return '';
    pendientes.set(clave, entrada.breve ?? '');
    return ' <mark class="por-verificar">Por verificar</mark>';
  }
  const explicada = (entrada, clave) => `<p>${e(entrada.breve)}${marca(entrada, clave)}</p><p class="completo">${e(entrada.completo)}</p><p class="fuente">Fuente: ${e(entrada.fuente)}</p>`;

  // ---- 1. Mapa de activos ----
  const mapa = `<section id="mapa"><h2>1. Mapa de activos</h2>
<table><thead><tr><th>Activo</th><th>¿Quién lo creó?</th><th>Contrato o licencia</th><th>Prueba</th><th>Riesgo</th><th>Acción</th></tr></thead>
<tbody>${filas(proyecto, contenido).map((f) => `<tr class="riesgo-${f.color}">
<td><a href="#ficha-${e(f.id)}">${e(f.activo)}</a><span class="tipo">${e(f.tipo)}</span></td>
<td>${e(f.creador)}</td><td>${e(f.contrato)}</td><td>${e(f.prueba)}</td>
<td><span class="punto semaforo-${f.color}"></span>${f.color}${f.porVerificar ? ' <mark class="por-verificar">Por verificar</mark>' : ''}</td>
<td>${f.acciones.length ? lista(f.acciones.map((a) => `<li>${e(a)}</li>`)) : 'Nada por hacer'}</td></tr>`).join('')}</tbody></table></section>`;

  // ---- 2. Cadena de titularidad ----
  function nodo(n) {
    const detalle = n.id === 'juego'
      ? ` — ${e(n.estudiante)}`
      : ` — autoría: ${e(ETIQUETAS.autoria[n.autoria] ?? n.autoria)}${n.autorNombre ? ` (${e(n.autorNombre)})` : ''}; titular: ${e(ETIQUETAS.titular[n.titular] ?? n.titular)}; respaldo: ${e(ETIQUETAS.respaldo[n.respaldo] ?? n.respaldo)}${n.licencia ? ` (${e(LICENCIAS[n.licencia]?.nombre ?? n.licencia)})` : ''}; semáforo: ${n.color ?? '—'}`;
    return `<li><span class="nodo">${e(n.nombre)}</span>${detalle}${n.hijos.length ? `<ul>${n.hijos.map(nodo).join('')}</ul>` : ''}</li>`;
  }
  const cadena = `<section id="cadena"><h2>2. Cadena de titularidad</h2>
<p>El juego es del estudiante; de él cuelgan el título, la historia con sus escenas, cada personaje con su retrato y los demás elementos, con lo que dice cada ficha.</p>
<ul class="arbol">${nodo(construir(proyecto, semaforos))}</ul></section>`;

  // ---- 3. Decisión de registro ----
  const decisiones = Array.isArray(proyecto.registro) ? proyecto.registro : [];
  const registro = `<section id="registro"><h2>3. Decisión de registro</h2>
<p>El estudiante eligió hasta tres activos y respondió si los registraría ante la Dirección Nacional de Derecho de Autor, a nombre de quién y con qué prueba. No hay respuesta correcta: el ejercicio es pensarlo.</p>
${contenido.campos?.prueba ? explicada(contenido.campos.prueba, 'campos.prueba') : ''}
${decisiones.length ? decisiones.map((d) => `<article class="decision"><h3>${e(nombreDe(proyecto, d.id))}</h3><dl>
<dt>¿Lo registraría ante la DNDA?</dt><dd>${e(ETIQUETAS.registraria[d.registraria] ?? '—')}</dd>
<dt>¿A nombre de quién?</dt><dd>${oGuion(d.aNombreDe)}</dd>
<dt>¿Con qué prueba?</dt><dd>${oGuion(d.prueba)}</dd>
${d.porque?.trim() ? `<dt>¿Por qué?</dt><dd>${e(d.porque)}</dd>` : ''}</dl></article>`).join('') : '<p>El estudiante no dejó decisiones de registro.</p>'}</section>`;

  // ---- 4. Fichas ----
  const tiposObraUsados = new Set();
  function razonHtml(r, clave) {
    return `<li><p><strong>${e(r.breve)}</strong>${marca(r, clave)}</p>${r.accion ? `<p>Qué hacer: ${e(r.accion)}</p>` : ''}<p class="completo">${e(r.completo)}</p><p class="fuente">Fuente: ${e(r.fuente)}</p></li>`;
  }
  function fichaHtml(id, nombre, tipoActivo) {
    const ficha = proyecto.fichas[id];
    if (!ficha) return '';
    tiposObraUsados.add(ficha.tipoObra);
    const descrito = describir(semaforos.get(id), ficha, contenido);
    const hayA01 = descrito.razones.some((r) => r.codigo === 'A01');
    const razones = hayA01 ? descrito.razones.filter((r) => r.codigo !== 'A02') : descrito.razones;
    const v = visibles(ficha);
    const elemento = juego.elementos.find((x) => x.id === id) ?? null;
    const filasFicha = [];
    const fila = (etiqueta, valor) => filasFicha.push(`<tr><th scope="row">${etiqueta}</th><td>${valor}</td></tr>`);

    fila(e(PREGUNTAS.tipoObra), `${e(TIPOS_OBRA[ficha.tipoObra]?.nombre ?? ficha.tipoObra)}${marca(contenido.tiposObra?.[ficha.tipoObra], `tiposObra.${ficha.tipoObra}`)}`);
    const origen = [e(NOMBRES_ORIGEN[ficha.origen] ?? ficha.origen)];
    if (elemento?.biblioteca) origen.push(`(pieza ${e(elemento.biblioteca.id)}: autor ${oGuion(elemento.biblioteca.autor)}, licencia ${e(LICENCIAS[elemento.biblioteca.licencia]?.nombre ?? elemento.biblioteca.licencia)}${elemento.biblioteca.creditoSugerido ? `, crédito sugerido «${e(elemento.biblioteca.creditoSugerido)}»` : ''})`);
    fila('Origen', origen.join(' '));
    if (v.autoria) {
      const partes = [e(ETIQUETAS.autoria[ficha.autoria] ?? ficha.autoria)];
      if (v.autorNombre) partes.push(`(${oGuion(ficha.autorNombre)})`);
      if (v.herramientaIA) partes.push(`; herramienta: ${oGuion(ficha.herramientaIA)}`);
      if (v.aporteHumano) partes.push(`; aporte creativo: ${oGuion(ficha.aporteHumano)}`);
      if (v.reconoceSinDerechos) partes.push(`; reconoce que no puede reclamar derechos: ${siNo(ficha.reconoceSinDerechos)}`);
      if (v.basadoEnObraAjena) partes.push(`; basado en una obra ajena: ${siNo(ficha.basadoEnObraAjena)}`);
      if (v.autorizacionDerivada) partes.push(`; autorización del autor original: ${siNo(ficha.autorizacionDerivada)}`);
      fila(e(PREGUNTAS.autoria), partes.join(' '));
    }
    if (v.titular) fila(e(PREGUNTAS.titular), e(ETIQUETAS.titular[ficha.titular] ?? ficha.titular));
    if (ficha.tipo !== 'titulo') {
      const partes = [e(ETIQUETAS.respaldo[ficha.respaldo] ?? ficha.respaldo)];
      if (ficha.respaldo === 'licencia') {
        partes.push(`: ${e(ficha.licencia ? (LICENCIAS[ficha.licencia]?.nombre ?? ficha.licencia) : 'sin elegir')}`);
        if (ficha.licencia === 'OTRA') partes.push(`(${oGuion(ficha.licenciaTexto)})`);
        const condiciones = condicionesDe(ficha);
        if (condiciones.length) partes.push(`; condiciones: ${condiciones.map((c) => e(ETIQUETAS.condiciones[c] ?? c)).join(', ')}`);
        if (v.licenciaLeida) partes.push(`; Leí la licencia: ${siNo(ficha.licenciaLeida)}`);
        if (v.aceptaCompartirIgual) partes.push(`; acepto licenciar mi juego igual: ${siNo(ficha.aceptaCompartirIgual)}`);
        if (v.modificado) partes.push(`; lo modifiqué: ${siNo(ficha.modificado)}`);
      }
      fila(e(PREGUNTAS.respaldo), partes.join(' '));
    }
    if (v.credito) fila(e(PREGUNTAS.credito), oGuion(ficha.credito));
    if (v.prueba) {
      const partes = [e(ETIQUETAS.prueba[ficha.prueba] ?? ficha.prueba)];
      if (elemento?.sello) partes.push(`— sello de creación: ${e(elemento.sello.fecha)}, <code>${e(elemento.sello.huella)}</code>`);
      fila(e(PREGUNTAS.prueba), partes.join(' '));
    }
    const color = descrito.color;
    return `<article class="ficha" id="ficha-${e(id)}" data-ficha="${e(id)}">
<h3>${e(nombre)} <span class="tipo">${e(tipoActivo)}</span></h3>
<table>${filasFicha.join('')}</table>
<div class="resultado">
<p><span class="punto semaforo-${color}"></span><strong>Semáforo: ${color}</strong></p>
${razones.length ? `<ul class="razones">${razones.map((r) => razonHtml(r, `reglas.${r.codigo}`)).join('')}</ul>` : '<p>Ninguna regla aplica.</p>'}
${descrito.notas.length ? `<ul class="notas">${descrito.notas.map((n) => razonHtml(n, `notas.${n.codigo}`)).join('')}</ul>` : ''}
</div></article>`;
  }
  const fichas = `<section id="fichas"><h2>4. Fichas jurídicas</h2>
${[
    fichaHtml('titulo', titulo, TIPOS_ACTIVO.titulo),
    fichaHtml('historia', 'Historia', TIPOS_ACTIVO.historia),
    ...juego.personajes.map((p) => fichaHtml(p.id, p.nombre?.trim() || 'Sin nombre', TIPOS_ACTIVO.personaje)),
    ...juego.elementos.map((x) => fichaHtml(x.id, x.nombre?.trim() || 'Sin nombre', TIPOS_ACTIVO[x.tipo] ?? x.tipo)),
  ].join('')}</section>`;

  // ---- 5. Explicaciones (una vez) ----
  const explicaciones = `<section id="explicaciones"><h2>5. Explicaciones de los campos y de los tipos de obra</h2>
${CAMPOS_EXPLICADOS.filter((c) => contenido.campos?.[c]).map((c) => `<h3>${e(TITULOS_CAMPO[c] ?? c)}</h3>${explicada(contenido.campos[c], `campos.${c}`)}`).join('')}
${[...tiposObraUsados].filter((t) => contenido.tiposObra?.[t]).map((t) => `<h3>${e(TIPOS_OBRA[t]?.nombre ?? t)}</h3>${explicada(contenido.tiposObra[t], `tiposObra.${t}`)}`).join('')}</section>`;

  // ---- 6. Pendientes (se arma al final, cuando ya se marcó todo) ----
  const listaPendientes = `<section id="pendientes"><h2>6. Textos pendientes de verificación jurídica</h2>
<p>Estos textos aparecen en el informe con la marca «Por verificar»: corresponden a la sección 19 del diseño y no deben tomarse como verificados.</p>
${pendientes.size ? `<ul>${[...pendientes].map(([clave, breve]) => `<li><code>${e(clave)}</code>: ${e(breve)}</li>`).join('')}</ul>` : '<p>Ninguno.</p>'}</section>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Informe jurídico: ${e(titulo)}</title>
<style>${ESTILOS}</style>
</head>
<body>
<header class="portada">
<p class="eyebrow">${e(nombreProducto)} · Informe jurídico</p>
<h1>${e(titulo)}</h1>
<dl class="datos">
<dt>Estudiante</dt><dd>${e(estudiante)}</dd>
<dt>Destino del juego</dt><dd>${e(NOMBRES_DESTINO[juego.destino] ?? juego.destino)}</dd>
${juego.sinopsis?.trim() ? `<dt>Sinopsis</dt><dd>${e(juego.sinopsis)}</dd>` : ''}
<dt>Fecha de publicación</dt><dd>${e(fecha)}</dd>
<dt>Huella del proyecto</dt><dd><code>${e(huella)}</code> (SHA-256 de proyecto.json)</dd>
<dt>Proyecto creado</dt><dd>${e(proyecto.creado)}</dd>
</dl>
<p class="aviso-legal">${e(contenido.aviso ?? '')}</p>
<ul class="indice"><li><a href="#mapa">1. Mapa de activos</a></li><li><a href="#cadena">2. Cadena de titularidad</a></li><li><a href="#registro">3. Decisión de registro</a></li><li><a href="#fichas">4. Fichas jurídicas</a></li><li><a href="#explicaciones">5. Explicaciones</a></li><li><a href="#pendientes">6. Pendientes de verificación</a></li></ul>
</header>
${mapa}
${cadena}
${registro}
${fichas}
${explicaciones}
${listaPendientes}
<footer>
<p>${e(contenido.aviso ?? '')}</p>
<p>Fuente de los textos jurídicos: ${e(contenido.fuentePrincipal ?? '')}</p>
<p>Informe generado por ${e(nombreProducto)} el ${e(fecha)}. Los datos salen de las fichas que llenó el estudiante; la plataforma no los verifica.</p>
</footer>
</body>
</html>
`;
}
```

Cambio en `plataforma/js/editor/propiedades.js`:

```diff
diff --git a/plataforma/js/editor/propiedades.js b/plataforma/js/editor/propiedades.js
index cf97251..1eecb47 100644
--- a/plataforma/js/editor/propiedades.js
+++ b/plataforma/js/editor/propiedades.js
@@ -10,8 +10,9 @@ import { selector, campoTexto, areaTexto } from './controles.js';
 import { NOMBRES_TIPO } from './inventario.js';
 import { NOMBRES_LINEA } from './guion.js';
 import { panelFicha } from './panel-ficha.js';
+import { NOMBRES_DESTINO } from '../juridico/formulario.js';
 
-export const NOMBRES_DESTINO = { personal: 'Uso personal', gratis: 'Publicarlo gratis', venta: 'Venderlo' };
+export { NOMBRES_DESTINO };
 const NOMBRES_ORIGEN = { creado: 'Creado en la plataforma', subido: 'Subido', biblioteca: 'De la biblioteca' };
 
 /**
```

Cambio en `plataforma/js/juridico/formulario.js`:

```diff
diff --git a/plataforma/js/juridico/formulario.js b/plataforma/js/juridico/formulario.js
index eb44186..38fefdd 100644
--- a/plataforma/js/juridico/formulario.js
+++ b/plataforma/js/juridico/formulario.js
@@ -15,12 +15,15 @@ export const PREGUNTAS = {
   prueba: '¿Qué prueba la fecha?',
 };
 
+export const NOMBRES_DESTINO = { personal: 'Uso personal', gratis: 'Publicarlo gratis', venta: 'Venderlo' };
+
 export const ETIQUETAS = {
   autoria: { yo: 'Yo', otra_persona: 'Otra persona', ia: 'Una herramienta de IA', ia_con_aporte: 'IA con mi aporte creativo' },
   titular: { yo: 'Yo', otra_persona: 'Otra persona' },
   respaldo: { ninguno: 'Nada escrito', cesion: 'Cesión por escrito', licencia: 'Licencia', autorizacion: 'Autorización informal (mensaje, correo, de palabra)' },
   prueba: { ninguna: 'Ninguna', sello: 'Sello de la plataforma', original: 'Archivo original con fecha', repositorio: 'Repositorio con historial', registro_dnda: 'Registro ante la DNDA' },
   condiciones: { BY: 'Exige atribución (BY)', NC: 'No comercial (NC)', SA: 'Compartir igual (SA)', ND: 'Sin derivadas (ND)' },
+  registraria: { si: 'Sí lo registraría', no: 'No lo registraría' },
 };
 
 /** Códigos que el estudiante puede elegir cuando el respaldo es una licencia. */
```

Cambio en `plataforma/js/juridico/formulario.js`:

```diff
diff --git a/plataforma/js/juridico/formulario.js b/plataforma/js/juridico/formulario.js
index 38fefdd..20fc97a 100644
--- a/plataforma/js/juridico/formulario.js
+++ b/plataforma/js/juridico/formulario.js
@@ -23,9 +23,11 @@ export const ETIQUETAS = {
   respaldo: { ninguno: 'Nada escrito', cesion: 'Cesión por escrito', licencia: 'Licencia', autorizacion: 'Autorización informal (mensaje, correo, de palabra)' },
   prueba: { ninguna: 'Ninguna', sello: 'Sello de la plataforma', original: 'Archivo original con fecha', repositorio: 'Repositorio con historial', registro_dnda: 'Registro ante la DNDA' },
   condiciones: { BY: 'Exige atribución (BY)', NC: 'No comercial (NC)', SA: 'Compartir igual (SA)', ND: 'Sin derivadas (ND)' },
-  registraria: { si: 'Sí lo registraría', no: 'No lo registraría' },
 };
 
+/** Respuestas de la decisión de registro (spec 12.7); aparte de ETIQUETAS porque no son campos de la ficha. */
+export const ETIQUETAS_REGISTRO = { si: 'Sí lo registraría', no: 'No lo registraría' };
+
 /** Códigos que el estudiante puede elegir cuando el respaldo es una licencia. */
 export const LICENCIAS_ELEGIBLES = Object.keys(LICENCIAS);
```

Cambio en `plataforma/js/juridico/informe.js`:

```diff
diff --git a/plataforma/js/juridico/informe.js b/plataforma/js/juridico/informe.js
index 30e01a2..fd94ad4 100644
--- a/plataforma/js/juridico/informe.js
+++ b/plataforma/js/juridico/informe.js
@@ -8,7 +8,7 @@ import { evaluarTodo } from './semaforo.js';
 import { describir } from './textos.js';
 import { filas, TIPOS_ACTIVO } from './mapa.js';
 import { construir } from './cadena.js';
-import { visibles, ETIQUETAS, PREGUNTAS, NOMBRES_DESTINO } from './formulario.js';
+import { visibles, ETIQUETAS, ETIQUETAS_REGISTRO, PREGUNTAS, NOMBRES_DESTINO } from './formulario.js';
 import { LICENCIAS, condicionesDe } from './licencias.js';
 import { TIPOS_OBRA } from './ficha.js';
 import { nombreDe } from '../estado/validacion.js';
@@ -115,7 +115,7 @@ export function generar(proyecto, { contenido, huella, fecha, nombreProducto = c
 <p>El estudiante eligió hasta tres activos y respondió si los registraría ante la Dirección Nacional de Derecho de Autor, a nombre de quién y con qué prueba. No hay respuesta correcta: el ejercicio es pensarlo.</p>
 ${contenido.campos?.prueba ? explicada(contenido.campos.prueba, 'campos.prueba') : ''}
 ${decisiones.length ? decisiones.map((d) => `<article class="decision"><h3>${e(nombreDe(proyecto, d.id))}</h3><dl>
-<dt>¿Lo registraría ante la DNDA?</dt><dd>${e(ETIQUETAS.registraria[d.registraria] ?? '—')}</dd>
+<dt>¿Lo registraría ante la DNDA?</dt><dd>${e(ETIQUETAS_REGISTRO[d.registraria] ?? '—')}</dd>
 <dt>¿A nombre de quién?</dt><dd>${oGuion(d.aNombreDe)}</dd>
 <dt>¿Con qué prueba?</dt><dd>${oGuion(d.prueba)}</dd>
 ${d.porque?.trim() ? `<dt>¿Por qué?</dt><dd>${e(d.porque)}</dd>` : ''}</dl></article>`).join('') : '<p>El estudiante no dejó decisiones de registro.</p>'}</section>`;
```

- [ ] **Step 4: Correr las pruebas y ver que pasan**

Run: `node --test tests/informe.test.js`
Expected: PASS: 8 pruebas. La suite: 321 (una prueba de formulario exige que ETIQUETAS no cambie; por eso las etiquetas del registro van en ETIQUETAS_REGISTRO).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Jurídico: informe imprimible con portada, mapa, cadena, decisión de registro, fichas completas y textos pendientes"
```

```bash
git add -A
git commit -m "Formulario: las etiquetas de la decisión de registro van aparte de las de la ficha"
```


### Task 4: El paquete de entrega y la validación de registro y publicación

**Files:**
- Modify: `plataforma/js/editor/editor.js`
- Modify: `plataforma/js/estado/archivos.js`
- Modify: `plataforma/js/estado/copias.js`
- Modify: `plataforma/js/exportar/paquete.js`
- Test: `tests/copias.test.js` (cambia)
- Test: `tests/exportar.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

Cambio en `tests/copias.test.js`:

```diff
diff --git a/tests/copias.test.js b/tests/copias.test.js
index 1175ab9..853164a 100644
--- a/tests/copias.test.js
+++ b/tests/copias.test.js
@@ -163,3 +163,18 @@ test('validarEstructura rechaza fichas faltantes, cambiadas o incoherentes y esc
   assert.ok(problemasDe((p) => { p.fichas[p.juego.escenas[0].id] = crearFicha('fondo', { origen: 'creado' }); }).some((m) => /no corresponde a ningún elemento ni personaje/.test(m)), 'ficha de escena');
   assert.deepEqual(validarEstructura(base()), []);
 });
+
+test('validarEstructura exige la decisión de registro como lista con ids y la fecha de publicación como texto o null', () => {
+  const p = crearProyecto({ titulo: 'x' });
+  p.registro = 'no';
+  assert.deepEqual(validarEstructura(p), ['la decisión de registro no tiene la forma esperada']);
+  p.registro = [{ registraria: 'si' }];
+  assert.deepEqual(validarEstructura(p), ['la decisión de registro no tiene la forma esperada']);
+  p.registro = [{ id: 'historia', registraria: 'si', aNombreDe: 'Camila', prueba: 'sello', porque: '' }];
+  p.publicado = 12;
+  assert.deepEqual(validarEstructura(p), ['la fecha de publicación no es válida']);
+  p.publicado = '2026-11-06T15:30:00.000Z';
+  assert.deepEqual(validarEstructura(p), []);
+  delete p.registro;
+  assert.deepEqual(validarEstructura(p), ['la decisión de registro no tiene la forma esperada']);
+});
```

`tests/exportar.test.js`:

```js
// tests/exportar.test.js
// El paquete de entrega (spec, sección 18): las tres piezas, proyecto.json se vuelve a
// importar idéntico, juego.html contiene el motor, el documento y los créditos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import JSZip from 'jszip';
import { generarEntrega, nombreDeEntrega } from '../plataforma/js/exportar/paquete.js';
import { importarCopia } from '../plataforma/js/estado/copias.js';
import { huellaSha256 } from '../plataforma/js/estado/archivos.js';
import { proyectoPublicable } from './ayudas/proyecto.js';
import { motorDesdeDisco } from './ayudas/motor.js';

const contenido = JSON.parse(readFileSync(new URL('../plataforma/contenido/juridico.json', import.meta.url), 'utf8'));
const motor = motorDesdeDisco();
const FECHA = '2026-11-06T15:30:00.000Z';

test('nombreDeEntrega: entrega-<estudiante>-<juego>.zip sin acentos ni espacios', () => {
  const { p } = proyectoPublicable();
  assert.equal(nombreDeEntrega(p), 'entrega-camila-r-la-llave-del-faro.zip');
  p.estudiante = 'José Ñáñez';
  p.juego.titulo = '';
  assert.equal(nombreDeEntrega(p), 'entrega-jose-nanez-sin-nombre.zip');
});

test('generarEntrega arma el zip con juego.html, informe-juridico.html, proyecto.json y archivos/, y devuelve la huella de proyecto.json', async () => {
  const { p, archivos } = proyectoPublicable();
  p.publicado = FECHA;
  const { blob, huella, nombre } = await generarEntrega(p, archivos, { JSZip, contenido, motor });
  assert.equal(blob.type, 'application/zip');
  assert.equal(nombre, 'entrega-camila-r-la-llave-del-faro.zip');
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const nombres = Object.keys(zip.files).filter((n) => !zip.files[n].dir).sort();
  assert.deepEqual(nombres, ['archivos/ana.png', 'archivos/farero.png', 'archivos/muelle.png', 'archivos/olas.wav', 'archivos/tema.ogg', 'informe-juridico.html', 'juego.html', 'proyecto.json']);
  const texto = await zip.file('proyecto.json').async('string');
  assert.match(huella, /^sha256:[0-9a-f]{64}$/);
  assert.equal(huella, await huellaSha256(new TextEncoder().encode(texto)), 'la huella es la del texto exacto que va en el zip');
  assert.equal(JSON.parse(texto).publicado, FECHA);
  const informe = await zip.file('informe-juridico.html').async('string');
  assert.ok(informe.includes(huella) && informe.includes(FECHA) && informe.includes('Camila R.') && informe.includes(contenido.nombre));
  const juego = await zip.file('juego.html').async('string');
  assert.ok(juego.includes('function jugar(') && juego.includes('Camila R.: autor(a) del juego'));
  assert.ok(juego.includes(JSON.stringify(p.juego.escenaInicial)));
});

test('el proyecto.json del paquete se vuelve a importar idéntico con sus archivos, como una copia', async () => {
  const { p, archivos, ana } = proyectoPublicable();
  p.publicado = FECHA;
  p.registro = [{ id: ana.id, registraria: 'si', aNombreDe: 'Camila R.', prueba: 'El sello', porque: '' }];
  const { blob } = await generarEntrega(p, archivos, { JSZip, contenido, motor });
  const importado = await importarCopia(blob, { JSZip });
  assert.deepEqual(importado.proyecto, p);
  assert.equal(importado.archivos.size, archivos.size);
  for (const [id, archivo] of archivos) {
    assert.equal(new TextDecoder().decode(importado.archivos.get(id).datos), new TextDecoder().decode(archivo.datos));
  }
});

test('sin fecha de publicación usa «ahora»; no muta el proyecto; falla con la forma equivocada o un archivo faltante', async () => {
  const { p, archivos, olas } = proyectoPublicable();
  const antes = JSON.stringify(p);
  const ahora = new Date('2026-11-07T08:00:00.000Z');
  const { blob } = await generarEntrega(p, archivos, { JSZip, contenido, motor, ahora });
  assert.equal(JSON.stringify(p), antes, 'el proyecto no cambia');
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  assert.ok((await zip.file('informe-juridico.html').async('string')).includes('2026-11-07T08:00:00.000Z'));
  archivos.delete(olas.id);
  await assert.rejects(generarEntrega(p, archivos, { JSZip, contenido, motor }), /«Olas»/);
  await assert.rejects(generarEntrega({ version: 2 }, archivos, { JSZip, contenido, motor }), (error) => error.codigo === 'forma' && /versión 2/.test(error.message));
});
```

- [ ] **Step 2: Correr las pruebas y ver que fallan**

Run: `node --test tests/exportar.test.js tests/copias.test.js`
Expected: FAIL: `does not provide an export named 'generarEntrega'` y la prueba nueva de copias falla porque validarEstructura no mira registro ni publicado.

- [ ] **Step 3: Implementar**

Cambio en `plataforma/js/editor/editor.js`:

```diff
diff --git a/plataforma/js/editor/editor.js b/plataforma/js/editor/editor.js
index b8bbf8c..c68024b 100644
--- a/plataforma/js/editor/editor.js
+++ b/plataforma/js/editor/editor.js
@@ -17,14 +17,11 @@ import { nombreDe } from '../estado/validacion.js';
 import { crearMapaActivos } from './mapa-activos.js';
 import { crearBiblioteca, tomarPieza } from './biblioteca.js';
 import { crearElementoCreado, reemplazarArchivoCreado } from './creados.js';
+import { nombreDeArchivo } from '../estado/archivos.js';
 
 const AVISO_MS = 6000;
 
-/** «La llave del faro» → la-llave-del-faro, para nombrar descargas. */
-export function nombreDeArchivo(texto) {
-  const limpio = String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
-  return limpio || 'sin-nombre';
-}
+export { nombreDeArchivo };
 
 /** Abre el selector de archivos del navegador. Resuelve con el File o con null si se cancela. */
 export function elegirArchivoDelNavegador(accept) {
```

Cambio en `plataforma/js/estado/archivos.js`:

```diff
diff --git a/plataforma/js/estado/archivos.js b/plataforma/js/estado/archivos.js
index 833f8fa..063ba86 100644
--- a/plataforma/js/estado/archivos.js
+++ b/plataforma/js/estado/archivos.js
@@ -1,5 +1,6 @@
 // plataforma/js/estado/archivos.js
-// Utilidades para archivos binarios: tipo MIME, huella SHA-256 y sello de creación.
+// Utilidades para archivos binarios: tipo MIME, huella SHA-256, sello de creación y
+// nombres de archivo seguros para las descargas.
 
 const MIME_POR_EXTENSION = {
   png: 'image/png',
@@ -55,3 +56,9 @@ export async function huellaSha256(datos) {
 export async function crearSello(datos, ahora = new Date()) {
   return { fecha: ahora.toISOString(), huella: await huellaSha256(datos) };
 }
+
+/** «La llave del faro» → la-llave-del-faro, para nombrar descargas. */
+export function nombreDeArchivo(texto) {
+  const limpio = String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
+  return limpio || 'sin-nombre';
+}
```

Cambio en `plataforma/js/estado/copias.js`:

```diff
diff --git a/plataforma/js/estado/copias.js b/plataforma/js/estado/copias.js
index 1e8e6a6..1e88a98 100644
--- a/plataforma/js/estado/copias.js
+++ b/plataforma/js/estado/copias.js
@@ -190,5 +190,10 @@ export function validarEstructura(proyecto) {
   for (const id of Object.keys(fichas)) {
     if (!duenos.has(id)) problemas.push(`la ficha «${id}» no corresponde a ningún elemento ni personaje`);
   }
+  // Publicación (plan 6): la decisión de registro es una lista de respuestas con el id del activo; publicado es la fecha ISO o null.
+  if (!Array.isArray(proyecto.registro) || !proyecto.registro.every((d) => esObjeto(d) && typeof d.id === 'string')) {
+    problemas.push('la decisión de registro no tiene la forma esperada');
+  }
+  if (proyecto.publicado !== null && typeof proyecto.publicado !== 'string') problemas.push('la fecha de publicación no es válida');
   return problemas;
 }
```

Cambio en `plataforma/js/exportar/paquete.js`:

```diff
diff --git a/plataforma/js/exportar/paquete.js b/plataforma/js/exportar/paquete.js
index 8abf367..e54a5d2 100644
--- a/plataforma/js/exportar/paquete.js
+++ b/plataforma/js/exportar/paquete.js
@@ -3,6 +3,9 @@
 // los recursos incrustados; el informe; y el proyecto en bruto. Sin DOM de la
 // plataforma: lo llama el editor en el navegador y las pruebas en Node.
 import { creditos as creditosDe } from '../juridico/cadena.js';
+import { generar as generarInforme } from '../juridico/informe.js';
+import { validarEstructura } from '../estado/copias.js';
+import { huellaSha256, nombreDeArchivo } from '../estado/archivos.js';
 import { empaquetarModulos, aDataUrl, escaparHtml, escaparParaScript } from './empaquetar.js';
 
 /** Cada archivo va dos veces en el paquete (en bruto y en base64 dentro de juego.html): el peso se estima al doble. */
@@ -78,3 +81,35 @@ export function pesos(proyecto, archivos) {
   const total = elementos.reduce((suma, e) => suma + e.bytes, 0);
   return { elementos, total, estimado: total * FACTOR_PAQUETE };
 }
+
+/** entrega-<estudiante>-<juego>.zip (spec 14). */
+export function nombreDeEntrega(proyecto) {
+  return `entrega-${nombreDeArchivo(proyecto.estudiante)}-${nombreDeArchivo(proyecto.juego?.titulo)}.zip`;
+}
+
+/**
+ * El paquete de entrega completo (spec 14): juego.html, informe-juridico.html,
+ * proyecto.json y archivos/. proyecto.json va en el mismo formato que «Guardar copia»,
+ * así «Abrir copia» acepta el paquete. No muta el proyecto: la fecha de publicación la
+ * escribe el editor antes de llamar; si no la hay, el informe usa `ahora`.
+ * @param {object} proyecto
+ * @param {Map<string, { tipo, datos }>} archivos
+ * @param {{ JSZip: any, contenido: object, motor: object, nombreProducto?: string, ahora?: Date }} opciones
+ * @returns {Promise<{ blob: Blob, huella: string, nombre: string }>} huella: SHA-256 del proyecto.json del zip
+ */
+export async function generarEntrega(proyecto, archivos, { JSZip, contenido, motor, nombreProducto = contenido?.nombre, ahora = new Date() }) {
+  const problemas = validarEstructura(proyecto);
+  if (problemas.length) throw Object.assign(new Error(`El proyecto no tiene la forma esperada: ${problemas.join('; ')}.`), { codigo: 'forma', problemas });
+  const juego = generarJuegoHtml(proyecto, archivos, motor); // primero: falla pronto si falta un archivo
+  const texto = JSON.stringify(proyecto, null, 2);
+  const huella = await huellaSha256(new TextEncoder().encode(texto));
+  const fecha = proyecto.publicado ?? ahora.toISOString();
+  const informe = generarInforme(proyecto, { contenido, huella, fecha, nombreProducto });
+  const zip = new JSZip();
+  zip.file('juego.html', juego);
+  zip.file('informe-juridico.html', informe);
+  zip.file('proyecto.json', texto);
+  for (const elemento of proyecto.juego.elementos) zip.file(`archivos/${elemento.archivo}`, archivos.get(elemento.id).datos);
+  const bytes = await zip.generateAsync({ type: 'uint8array' });
+  return { blob: new Blob([bytes], { type: 'application/zip' }), huella, nombre: nombreDeEntrega(proyecto) };
+}
```

- [ ] **Step 4: Correr las pruebas y ver que pasan**

Run: `node --test tests/exportar.test.js tests/copias.test.js`
Expected: PASS. La suite: 326.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Exportar: paquete de entrega con juego, informe, proyecto.json con huella y archivos; copias valida registro y publicación"
```


### Task 5: La capa de publicación: decisión de registro y resumen del paquete

**Files:**
- Create: `plataforma/js/editor/publicar.js`
- Modify: `plataforma/css/editor.css`
- Test: `tests/publicar.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

`tests/publicar.test.js`:

```js
// tests/publicar.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { instalarDom, clic, teclear, escribir, textos } from './ayudas/dom.js';
import { sesionDePrueba } from './ayudas/sesion.js';
import { proyectoPublicable } from './ayudas/proyecto.js';
import { crearPublicar, MAXIMO_REGISTRO } from '../plataforma/js/editor/publicar.js';

instalarDom();
const contenido = JSON.parse(readFileSync(new URL('../plataforma/contenido/juridico.json', import.meta.url), 'utf8'));
const tic = () => new Promise((r) => setTimeout(r, 0));

function armar({ limiteBytes = undefined, generar = async () => {} } = {}) {
  const todo = proyectoPublicable();
  const { sesion, eventos } = sesionDePrueba(todo.p);
  for (const [id, a] of todo.archivos) sesion.archivos.set(id, a);
  const llamadas = [];
  const contenedor = document.createElement('div');
  contenedor.hidden = true;
  document.body.append(contenedor);
  const publicar = crearPublicar(contenedor, sesion, {
    contenido,
    limiteBytes,
    alGenerar: async () => { llamadas.push(['generar']); return generar(); },
    alCerrar: () => llamadas.push(['cerrar']),
  });
  const q = (selector) => contenedor.querySelector(selector);
  const qa = (selector) => [...contenedor.querySelectorAll(selector)];
  const casilla = (id) => q(`input[type="checkbox"][data-candidato="${id}"]`);
  const marcar = (id, valor = true) => { casilla(id).checked = valor; casilla(id).dispatchEvent(new window.Event('change', { bubbles: true })); };
  return { ...todo, sesion, eventos, publicar, contenedor, llamadas, q, qa, casilla, marcar };
}

test('abrir muestra el paso 1 con la explicación de la prueba, un candidato por activo (sin el título) y ninguno elegido', () => {
  const { p, contenedor, publicar, q, qa } = armar();
  publicar.abrir();
  assert.equal(contenedor.hidden, false);
  assert.ok(publicar.abierto);
  assert.equal(q('#publicar-titulo').textContent, 'Publicar: decisión de registro');
  assert.ok(q('.publicar-explicacion').textContent.includes(contenido.campos.prueba.breve));
  assert.ok(q('.publicar-explicacion .por-verificar'), 'campos.prueba está pendiente y se marca');
  const candidatos = qa('input[type="checkbox"][data-candidato]');
  assert.equal(candidatos.length, 1 + p.juego.personajes.length + p.juego.elementos.length);
  assert.ok(!candidatos.some((c) => c.dataset.candidato === 'titulo'));
  assert.ok(candidatos.every((c) => !c.checked && !c.disabled));
  assert.deepEqual(textos(contenedor, '.publicar-candidato .candidato-nombre').slice(0, 3), ['Historia', 'Ana', 'El farero']);
  assert.equal(qa('.publicar-decision').length, 0);
  assert.equal(document.activeElement, q('button[data-accion="cerrar-publicar"]'));
  publicar.cerrar();
  contenedor.remove();
});

test('elegir un activo crea su decisión precargada; a los tres se deshabilitan los demás; desmarcar la quita', () => {
  const { sesion, ana, tema, olas, publicar, q, qa, casilla, marcar, contenedor } = armar();
  publicar.abrir();
  marcar(ana.id);
  assert.deepEqual(sesion.proyecto.registro, [{ id: ana.id, registraria: 'si', aNombreDe: 'Camila R.', prueba: 'Ninguna', porque: '' }]);
  const decision = q(`.publicar-decision[data-decision="${ana.id}"]`);
  assert.ok(decision);
  assert.equal(decision.querySelector('h3').firstChild.textContent, 'Ana');
  assert.equal(decision.querySelector('input[type="radio"][value="si"]').checked, true);
  assert.equal(decision.querySelector('input[data-campo="aNombreDe"]').value, 'Camila R.');
  assert.equal(decision.querySelector('input[data-campo="prueba"]').value, 'Ninguna');
  marcar(tema.id);
  marcar(olas.id);
  const registro = sesion.proyecto.registro;
  assert.equal(registro.length, MAXIMO_REGISTRO);
  assert.equal(registro[1].aNombreDe, 'Autora Ejemplo', 'una pieza ajena se precarga con su autora');
  assert.equal(registro[2].prueba, 'Sello de la plataforma', 'lo creado dentro se precarga con el sello');
  assert.ok(casilla('historia').disabled, 'con tres elegidos los demás se deshabilitan');
  assert.ok(!casilla(ana.id).disabled);
  assert.equal(qa('.publicar-decision').length, 3);
  marcar(tema.id, false);
  assert.equal(sesion.proyecto.registro.length, 2);
  assert.ok(!casilla('historia').disabled);
  assert.equal(q(`.publicar-decision[data-decision="${tema.id}"]`), null);
  publicar.cerrar();
  contenedor.remove();
});

test('responder cambia la decisión en el proyecto con origen publicar y sin perder el foco', () => {
  const { sesion, eventos, ana, publicar, q, marcar, contenedor } = armar();
  publicar.abrir();
  marcar(ana.id);
  const decision = q(`.publicar-decision[data-decision="${ana.id}"]`);
  const nombre = decision.querySelector('input[data-campo="aNombreDe"]');
  nombre.focus();
  escribir(nombre, 'Camila Rojas');
  assert.equal(document.activeElement, nombre, 'escribir no redibuja');
  escribir(decision.querySelector('input[data-campo="prueba"]'), 'El archivo original');
  escribir(decision.querySelector('textarea[data-campo="porque"]'), 'Es mi personaje.');
  const no = decision.querySelector('input[type="radio"][value="no"]');
  no.checked = true;
  no.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.deepEqual(sesion.proyecto.registro[0], { id: ana.id, registraria: 'no', aNombreDe: 'Camila Rojas', prueba: 'El archivo original', porque: 'Es mi personaje.' });
  assert.ok(eventos.filter((e) => e.tipo === 'cambio').every((e) => e.origen === 'publicar'));
  publicar.cerrar();
  contenedor.remove();
});

test('Siguiente exige al menos una decisión; el paso 2 resume el paquete, el nombre y el peso; Volver conserva lo elegido', () => {
  const { p, ana, publicar, q, qa, marcar, contenedor } = armar();
  publicar.abrir();
  clic(q('button[data-accion="siguiente"]'));
  assert.match(q('.publicar-error').textContent, /al menos un activo/);
  assert.equal(q('#publicar-titulo').textContent, 'Publicar: decisión de registro');
  marcar(ana.id);
  clic(q('button[data-accion="siguiente"]'));
  assert.equal(q('#publicar-titulo').textContent, 'Publicar: el paquete de entrega');
  const resumen = q('.publicar-resumen').textContent;
  assert.ok(resumen.includes('entrega-camila-r-la-llave-del-faro.zip'));
  assert.ok(resumen.includes(`${p.juego.elementos.length} archivos`));
  assert.ok(resumen.includes('juego.html') && resumen.includes('informe-juridico.html') && resumen.includes('proyecto.json'));
  assert.ok(q('.publicar-peso-ok'), 'con archivos pequeños no hay aviso de peso');
  assert.equal(q('.publicar-peso'), null);
  assert.equal(document.activeElement, q('button[data-accion="generar"]'));
  clic(q('button[data-accion="volver"]'));
  assert.equal(q('#publicar-titulo').textContent, 'Publicar: decisión de registro');
  assert.equal(qa('.publicar-decision').length, 1);
  publicar.cerrar();
  contenedor.remove();
});

test('con un paquete pesado el paso 2 lista los elementos que más pesan y deja seguir', () => {
  const { sesion, ana, tema, olas, publicar, q, qa, marcar, contenedor } = armar({ limiteBytes: 10_000 });
  sesion.archivos.set(tema.id, { tipo: 'audio/ogg', datos: new ArrayBuffer(9_000) });
  sesion.archivos.set(olas.id, { tipo: 'audio/wav', datos: new ArrayBuffer(4_000) });
  publicar.abrir();
  marcar(ana.id);
  clic(q('button[data-accion="siguiente"]'));
  const aviso = q('.publicar-peso');
  assert.ok(aviso);
  assert.match(aviso.textContent, /más de 0,0 MB|supera/);
  assert.deepEqual(textos(contenedor, '.publicar-peso tbody tr td:first-child').slice(0, 2), ['Tema', 'Olas']);
  assert.ok(!q('button[data-accion="generar"]').disabled, 'no se bloquea: el estudiante decide');
  assert.ok(qa);
  publicar.cerrar();
  contenedor.remove();
});

test('Generar llama a alGenerar, deshabilita el botón mientras tanto y cierra al terminar; si falla, lo dice y sigue abierta', async () => {
  let resolver;
  const { ana, publicar, q, marcar, llamadas, contenedor } = armar({ generar: () => new Promise((r) => { resolver = r; }) });
  publicar.abrir();
  marcar(ana.id);
  clic(q('button[data-accion="siguiente"]'));
  clic(q('button[data-accion="generar"]'));
  assert.deepEqual(llamadas, [['generar']]);
  assert.ok(q('button[data-accion="generar"]').disabled);
  assert.match(q('button[data-accion="generar"]').textContent, /Generando/);
  resolver();
  await tic();
  assert.equal(contenedor.hidden, true);
  assert.deepEqual(llamadas, [['generar'], ['cerrar']]);

  const roto = armar({ generar: async () => { throw new Error('No se pudo leer el motor.'); } });
  roto.publicar.abrir();
  roto.marcar(roto.ana.id);
  clic(roto.q('button[data-accion="siguiente"]'));
  clic(roto.q('button[data-accion="generar"]'));
  await tic();
  assert.equal(roto.contenedor.hidden, false);
  assert.match(roto.q('.publicar-error').textContent, /No se pudo leer el motor/);
  assert.ok(!roto.q('button[data-accion="generar"]').disabled);
  roto.publicar.cerrar();
  contenedor.remove();
  roto.contenedor.remove();
});

test('Escape y Cerrar cierran y avisan; al reabrir se descartan las decisiones de activos que ya no existen', () => {
  const { sesion, ana, publicar, q, llamadas, contenedor } = armar();
  publicar.abrir();
  teclear(q('.publicar'), 'Escape');
  assert.equal(contenedor.hidden, true);
  assert.deepEqual(llamadas, [['cerrar']]);
  publicar.abrir();
  clic(q('button[data-accion="cerrar-publicar"]'));
  assert.deepEqual(llamadas, [['cerrar'], ['cerrar']]);
  sesion.proyecto.registro = [{ id: 'per_fantasma', registraria: 'si', aNombreDe: '', prueba: '', porque: '' }, { id: ana.id, registraria: 'no', aNombreDe: 'Camila R.', prueba: 'x', porque: '' }];
  publicar.abrir();
  assert.deepEqual(sesion.proyecto.registro.map((d) => d.id), [ana.id]);
  assert.ok(q(`.publicar-decision[data-decision="${ana.id}"] input[type="radio"][value="no"]`).checked);
  publicar.cerrar();
  contenedor.remove();
});
```

- [ ] **Step 2: Correr las pruebas y ver que fallan**

Run: `node --test tests/publicar.test.js`
Expected: FAIL: `Cannot find module .../plataforma/js/editor/publicar.js`.

- [ ] **Step 3: Implementar**

`plataforma/js/editor/publicar.js`:

```js
// plataforma/js/editor/publicar.js
// La capa de publicación sobre el editor (spec, sección 3 paso 5, 12.7 y 14), en dos
// pasos: la decisión de registro (hasta tres activos, con tres respuestas cada uno,
// guardadas en proyecto.registro al escribirlas) y el resumen del paquete con su peso
// (aviso si pasa el límite, sin bloquear). Generar y descargar lo hace el editor
// (alGenerar); aquí solo se decide y se muestra.
import { h, vaciar, conservarFoco } from '../ui/dom.js';
import { ETIQUETAS, ETIQUETAS_REGISTRO } from '../juridico/formulario.js';
import { LIMITES } from '../estado/archivos.js';
import { pesos, nombreDeEntrega } from '../exportar/paquete.js';
import { marcaPorVerificar } from './panel-ficha.js';
import { NOMBRES_TIPO } from './inventario.js';

export const MAXIMO_REGISTRO = 3;
const MOSTRAR_PESADOS = 5;

const mb = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;

/**
 * @param {HTMLElement} contenedor capa oculta hasta abrir()
 * @param {object} sesion de crearSesion
 * @param {{ contenido: object, alGenerar: () => Promise<void>, alCerrar?: () => void, limiteBytes?: number }} opciones
 */
export function crearPublicar(contenedor, sesion, { contenido, alGenerar, alCerrar = () => {}, limiteBytes = LIMITES.avisoPaqueteBytes }) {
  let abierto = false;
  let paso = 1;
  let error = '';
  let generando = false;

  // ---- candidatos y decisiones ----
  function candidatos() {
    const { juego } = sesion.proyecto;
    return [
      { id: 'historia', nombre: 'Historia', tipo: 'Historia' },
      ...juego.personajes.map((p) => ({ id: p.id, nombre: p.nombre?.trim() || 'Sin nombre', tipo: 'Personaje' })),
      ...juego.elementos.map((e) => ({ id: e.id, nombre: e.nombre?.trim() || 'Sin nombre', tipo: NOMBRES_TIPO[e.tipo] ?? e.tipo })),
    ];
  }

  function nuevaDecision(id) {
    const ficha = sesion.proyecto.fichas[id];
    const estudiante = sesion.proyecto.estudiante?.trim() || '';
    const aNombreDe = ficha?.titular === 'otra_persona' ? (ficha.autorNombre?.trim() || '') : estudiante;
    return { id, registraria: 'si', aNombreDe, prueba: ETIQUETAS.prueba[ficha?.prueba] ?? '', porque: '' };
  }

  const cambiar = (fn) => sesion.cambiar(fn, { origen: 'publicar' });

  /** Quita las decisiones de activos que ya no existen (sin avisar si no cambia nada). */
  function depurar() {
    const ids = new Set(candidatos().map((c) => c.id));
    const vivas = sesion.proyecto.registro.filter((d) => ids.has(d.id));
    if (vivas.length !== sesion.proyecto.registro.length) cambiar((p) => { p.registro = vivas; });
  }

  function alternar(id, marcado) {
    cambiar((p) => {
      p.registro = p.registro.filter((d) => d.id !== id);
      if (marcado && p.registro.length < MAXIMO_REGISTRO) p.registro.push(nuevaDecision(id));
    });
    error = '';
    dibujar();
  }

  function responder(id, campo, valor) {
    cambiar((p) => {
      const decision = p.registro.find((d) => d.id === id);
      if (decision) decision[campo] = valor;
    });
  }

  // ---- dibujo ----
  const cabecera = (titulo, resumen) => h('div', { class: 'mapa-cabecera' },
    h('div', {}, h('h2', { id: 'publicar-titulo' }, titulo), h('p', { class: 'mapa-resumen' }, resumen)),
    h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'cerrar-publicar', foco: 'cerrar' }, onclick: cerrar }, 'Cerrar'));
  const mensajeError = () => h('p', { class: 'publicar-error inicio-error', role: 'alert', hidden: !error }, error);

  function explicacion() {
    const prueba = contenido?.campos?.prueba;
    const sello = contenido?.notas?.N_SELLO;
    return h('section', { class: 'publicar-explicacion' },
      prueba ? h('p', {}, prueba.breve, ' ', marcaPorVerificar(prueba)) : null,
      prueba ? h('details', { class: 'ficha-mas' }, h('summary', {}, 'Ver más'), h('p', {}, prueba.completo), h('p', { class: 'ficha-fuente' }, 'Fuente: ', prueba.fuente)) : null,
      sello ? h('p', { class: 'ayuda' }, sello.breve, ' ', marcaPorVerificar(sello)) : null,
      h('p', {}, 'Elige hasta tres activos de tu juego y responde por cada uno. No hay respuesta correcta: lo que escribas va al informe para que el docente lo lea.'));
  }

  function decisionNodo(decision, candidato) {
    const id = decision.id;
    const campoTexto = (campo, etiqueta, { area = false } = {}) => {
      const idControl = `registro-${id}-${campo}`;
      const control = area
        ? h('textarea', { id: idControl, rows: 2, value: decision[campo] ?? '', dataset: { campo, foco: `registro:${id}:${campo}` }, oninput: (e) => responder(id, campo, e.target.value) })
        : h('input', { type: 'text', id: idControl, value: decision[campo] ?? '', dataset: { campo, foco: `registro:${id}:${campo}` }, oninput: (e) => responder(id, campo, e.target.value) });
      return h('div', { class: 'campo' }, h('label', { for: idControl, class: 'campo-etiqueta' }, etiqueta), control);
    };
    return h('article', { class: 'publicar-decision', dataset: { decision: id } },
      h('h3', {}, candidato.nombre, ' ', h('span', { class: 'entrada-detalle' }, candidato.tipo)),
      h('div', { class: 'ficha-radios', role: 'radiogroup', 'aria-label': '¿Lo registrarías ante la DNDA?' },
        h('p', { class: 'campo-etiqueta' }, '¿Lo registrarías ante la DNDA?'),
        Object.entries(ETIQUETAS_REGISTRO).map(([valor, texto]) => h('label', { class: 'ficha-radio' },
          h('input', { type: 'radio', name: `registraria-${id}`, value: valor, checked: decision.registraria === valor, dataset: { foco: `registro:${id}:registraria:${valor}` }, onchange: () => responder(id, 'registraria', valor) }), ' ', texto))),
      campoTexto('aNombreDe', '¿A nombre de quién?'),
      campoTexto('prueba', '¿Con qué prueba?'),
      campoTexto('porque', '¿Por qué? (opcional)', { area: true }));
  }

  function paso1() {
    const lista = candidatos();
    const registro = sesion.proyecto.registro;
    const elegidos = new Set(registro.map((d) => d.id));
    const lleno = elegidos.size >= MAXIMO_REGISTRO;
    return [
      cabecera('Publicar: decisión de registro', `Paso 1 de 2. Antes de generar el paquete, una pausa corta: ¿registrarías algo de tu juego ante la DNDA? Llevas ${elegidos.size} de ${MAXIMO_REGISTRO}.`),
      explicacion(),
      h('fieldset', { class: 'publicar-candidatos' },
        h('legend', {}, 'Activos'),
        lista.map((c) => h('label', { class: 'publicar-candidato' },
          h('input', { type: 'checkbox', checked: elegidos.has(c.id), disabled: lleno && !elegidos.has(c.id), dataset: { candidato: c.id, foco: `candidato:${c.id}` }, onchange: (e) => alternar(c.id, e.target.checked) }),
          ' ', h('span', { class: 'candidato-nombre' }, c.nombre), ' ', h('span', { class: 'entrada-detalle' }, c.tipo)))),
      h('div', { class: 'publicar-decisiones' }, registro.map((d) => decisionNodo(d, lista.find((c) => c.id === d.id)))),
      mensajeError(),
      h('div', { class: 'acciones' },
        h('button', { type: 'button', class: 'btn btn-primary', dataset: { accion: 'siguiente', foco: 'siguiente' }, onclick: siguiente }, 'Siguiente: el paquete'),
        h('button', { type: 'button', class: 'btn btn-ghost', dataset: { accion: 'cancelar' }, onclick: cerrar }, 'Cancelar')),
    ];
  }

  function paso2() {
    const proyecto = sesion.proyecto;
    const peso = pesos(proyecto, sesion.archivos);
    const pesado = peso.estimado > limiteBytes;
    return [
      cabecera('Publicar: el paquete de entrega', 'Paso 2 de 2. Se genera un archivo comprimido que subes al formulario del curso.'),
      h('section', { class: 'publicar-resumen' },
        h('p', {}, 'Nombre: ', h('code', {}, nombreDeEntrega(proyecto))),
        h('ul', {},
          h('li', {}, h('code', {}, 'juego.html'), ': el juego completo en un solo archivo; se abre en cualquier navegador sin internet.'),
          h('li', {}, h('code', {}, 'informe-juridico.html'), ': el informe para el docente; desde el navegador se guarda como PDF.'),
          h('li', {}, h('code', {}, 'proyecto.json'), ' y ', h('code', {}, 'archivos/'), `: el proyecto en bruto (${peso.elementos.length} archivos), el mismo formato de «Guardar copia».`))),
      pesado
        ? h('div', { class: 'publicar-peso', role: 'alert' },
          h('p', {}, h('strong', {}, `El paquete pesará unos ${mb(peso.estimado)}`), `, y supera los ${mb(limiteBytes)} que acepta el formulario con holgura. Estos son los elementos que más pesan; puedes reemplazar alguno o seguir igual.`),
          h('table', { class: 'mapa-tabla' },
            h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Elemento'), h('th', { scope: 'col' }, 'Tipo'), h('th', { scope: 'col' }, 'Peso'))),
            h('tbody', {}, peso.elementos.slice(0, MOSTRAR_PESADOS).map((e) => h('tr', {}, h('td', {}, e.nombre), h('td', {}, NOMBRES_TIPO[e.tipo] ?? e.tipo), h('td', {}, mb(e.bytes)))))))
        : h('p', { class: 'publicar-peso-ok ayuda' }, `Peso estimado: ${mb(peso.estimado)} (cada archivo va en bruto y dentro de juego.html).`),
      mensajeError(),
      h('div', { class: 'acciones' },
        h('button', { type: 'button', class: 'btn btn-primary', dataset: { accion: 'generar', foco: 'generar' }, disabled: generando, onclick: generar }, generando ? 'Generando…' : 'Generar y descargar'),
        h('button', { type: 'button', class: 'btn btn-ghost', dataset: { accion: 'volver' }, disabled: generando, onclick: () => { paso = 1; error = ''; dibujar(); } }, 'Volver'),
        h('button', { type: 'button', class: 'btn btn-ghost', dataset: { accion: 'cancelar' }, disabled: generando, onclick: cerrar }, 'Cancelar')),
    ];
  }

  function dibujar({ enfocar = null } = {}) {
    conservarFoco(contenedor, () => {
      vaciar(contenedor).append(h('div', { class: 'publicar', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'publicar-titulo', onkeydown: (e) => { if (e.key === 'Escape' && !generando) cerrar(); } },
        paso === 1 ? paso1() : paso2()));
    });
    if (enfocar) contenedor.querySelector(`[data-foco="${enfocar}"]`)?.focus();
  }

  // ---- acciones ----
  function siguiente() {
    if (sesion.proyecto.registro.length === 0) {
      error = 'Elige al menos un activo y responde por él antes de seguir.';
      dibujar();
      return;
    }
    paso = 2;
    error = '';
    dibujar({ enfocar: 'generar' });
  }

  async function generar() {
    if (generando) return;
    generando = true;
    error = '';
    dibujar();
    try {
      await alGenerar();
      generando = false;
      cerrar();
    } catch (fallo) {
      generando = false;
      error = fallo?.message ? String(fallo.message) : String(fallo);
      dibujar({ enfocar: 'generar' });
    }
  }

  function abrir() {
    abierto = true;
    paso = 1;
    error = '';
    generando = false;
    depurar();
    contenedor.hidden = false;
    dibujar({ enfocar: 'cerrar' });
  }

  function cerrar() {
    if (!abierto) return;
    abierto = false;
    vaciar(contenedor);
    contenedor.hidden = true;
    alCerrar();
  }

  return {
    abrir,
    cerrar,
    get abierto() { return abierto; },
  };
}
```

Cambio en `plataforma/css/editor.css`:

```diff
diff --git a/plataforma/css/editor.css b/plataforma/css/editor.css
index c4cdaf1..bbe0502 100644
--- a/plataforma/css/editor.css
+++ b/plataforma/css/editor.css
@@ -281,6 +281,28 @@ body.con-biblioteca { overflow: hidden; }
 .campo-rango input[type="range"] { flex: 1; }
 body.con-herramienta { overflow: hidden; }
 
+/* ---------- Publicación ---------- */
+.capa-publicar { position: fixed; inset: 0; z-index: 67; overflow: auto; padding: 24px; background: rgba(26, 29, 34, .55); }
+.publicar { width: min(860px, 100%); margin: 0 auto; padding: 20px 24px; background: var(--claro-panel); border-radius: var(--radius); box-shadow: var(--shadow); display: grid; gap: 14px; }
+.publicar .mapa-cabecera { margin-bottom: 0; }
+.publicar-explicacion { padding: 10px 14px; background: var(--claro-panel-2); border-radius: 10px; font-size: 14px; }
+.publicar-explicacion p { margin: 0 0 6px; }
+.publicar-candidatos { margin: 0; padding: 10px 14px; border: 1px solid var(--claro-line); border-radius: 10px; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 4px 12px; }
+.publicar-candidatos legend { padding: 0 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--claro-muted); }
+.publicar-candidato { display: flex; align-items: center; gap: 6px; font-size: 14px; cursor: pointer; }
+.publicar-candidato input:disabled ~ .candidato-nombre { color: var(--claro-muted); }
+.publicar-decisiones { display: grid; gap: 10px; }
+.publicar-decision { padding: 12px 14px; border: 1px solid var(--claro-line); border-left: 4px solid var(--claro-accent); border-radius: 10px; }
+.publicar-decision h3 { font-size: 15px; margin-bottom: 8px; }
+.publicar-decision .campo-etiqueta { margin: 0 0 4px; }
+.publicar-resumen ul { margin: 6px 0 0; padding-left: 18px; }
+.publicar-resumen li { margin-bottom: 4px; }
+.publicar-peso { padding: 10px 14px; background: var(--claro-accent-fondo); border-left: 4px solid var(--amarillo); border-radius: 6px; font-size: 14px; }
+.publicar-peso p { margin: 0 0 8px; }
+.publicar-peso .mapa-tabla { min-width: 0; }
+.publicar-error { margin: 0; }
+body.con-publicar { overflow: hidden; }
+
 /* ---------- Pantallas angostas: solo se juega ---------- */
 .aviso-angosto { display: none; margin: 0; padding: 12px 16px; background: var(--amber); color: var(--accent-ink); font-weight: 700; }
 @media (max-width: 899px) {
```

- [ ] **Step 4: Correr las pruebas y ver que pasan**

Run: `node --test tests/publicar.test.js`
Expected: PASS: 7 pruebas. La suite: 333.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Editor: capa de publicación con la decisión de registro (hasta tres activos) y el resumen del paquete con su peso"
```


### Task 6: Publicar desde el editor y el arranque

**Files:**
- Modify: `plataforma/js/app.js`
- Modify: `plataforma/js/editor/editor.js`
- Test: `tests/editor.test.js` (cambia)

- [ ] **Step 1: Escribir las pruebas que fallan**

Cambio en `tests/editor.test.js`:

```diff
diff --git a/tests/editor.test.js b/tests/editor.test.js
index ceca0a6..0f6172c 100644
--- a/tests/editor.test.js
+++ b/tests/editor.test.js
@@ -1,36 +1,51 @@
 // tests/editor.test.js
 import { test } from 'node:test';
 import assert from 'node:assert/strict';
+import { readFileSync } from 'node:fs';
 import JSZip from 'jszip';
 import { instalarDom, clic, escribir, textos } from './ayudas/dom.js';
+import { motorDesdeDisco } from './ayudas/motor.js';
 import { sesionDePrueba } from './ayudas/sesion.js';
 import { proyectoPublicable } from './ayudas/proyecto.js';
 import { catalogoCargado } from './ayudas/catalogo.js';
 import { crearProyecto, agregarEscena, agregarLinea } from '../plataforma/js/estado/modelo.js';
-import { exportarCopia } from '../plataforma/js/estado/copias.js';
+import { exportarCopia, importarCopia } from '../plataforma/js/estado/copias.js';
 import { crearEditor } from '../plataforma/js/editor/editor.js';
 
 instalarDom();
+const contenidoReal = JSON.parse(readFileSync(new URL('../plataforma/contenido/juridico.json', import.meta.url), 'utf8'));
 
-function armar({ proyecto, confirmar = () => true, archivoElegido = null, catalogo = null, avisoInicial = null, herramientas = null } = {}) {
+/** Espera a que se cumpla una condición (las acciones del editor encadenan promesas; un tiempo fijo es frágil bajo carga). */
+async function esperar(condicion, maximoMs = 3000) {
+  const inicio = Date.now();
+  while (!condicion()) {
+    if (Date.now() - inicio > maximoMs) throw new Error('La condición esperada no se cumplió a tiempo.');
+    await new Promise((r) => setTimeout(r, 5));
+  }
+}
+
+function armar({ proyecto, confirmar = () => true, archivoElegido = null, catalogo = null, avisoInicial = null, herramientas = null, contenido = { campos: { destino: { breve: 'Ayuda del destino.' } } }, cargarMotor = null } = {}) {
   const { sesion, eventos } = sesionDePrueba(proyecto);
   const llamadas = [];
+  const descargas = [];
   const contenedor = document.createElement('div');
   document.body.append(contenedor);
   const editor = crearEditor(contenedor, sesion, {
-    contenido: { campos: { destino: { breve: 'Ayuda del destino.' } } },
+    contenido,
     JSZip,
-    descargarArchivo: (blob, nombre) => llamadas.push(['descargar', nombre, blob.type]),
+    descargarArchivo: (blob, nombre) => { llamadas.push(['descargar', nombre, blob.type]); descargas.push(blob); },
     confirmar: (mensaje) => { llamadas.push(['confirmar', mensaje]); return confirmar(mensaje); },
     elegirArchivo: async () => archivoElegido,
     alNuevoJuego: async () => llamadas.push(['nuevo-juego']),
     catalogo,
     avisoInicial,
     crearHerramientas: herramientas ? () => herramientas : null,
+    cargarMotor,
+    ahora: () => new Date('2026-11-06T15:30:00.000Z'),
   });
   const q = (selector) => contenedor.querySelector(selector);
   const qa = (selector) => [...contenedor.querySelectorAll(selector)];
-  return { sesion, eventos, editor, contenedor, llamadas, q, qa };
+  return { sesion, eventos, editor, contenedor, llamadas, descargas, q, qa };
 }
 
 function proyectoConLineas() {
@@ -248,7 +263,7 @@ test('Biblioteca abre el selector; «Usar esta pieza» mete la pieza con su fich
   assert.ok(document.body.classList.contains('con-biblioteca'));
   clic(q('.capa-biblioteca [data-filtro="musica"]'));
   clic(q('.capa-biblioteca .biblioteca-pieza[data-pieza="bib_m3"] button[data-accion="usar"]'));
-  await new Promise((r) => setTimeout(r, 20));
+  await esperar(() => sesion.proyecto.juego.elementos.length === 1);
   assert.equal(q('.capa-biblioteca').hidden, true);
   assert.ok(!document.body.classList.contains('con-biblioteca'));
   const elemento = sesion.proyecto.juego.elementos[0];
@@ -295,7 +310,7 @@ test('Pixel art pregunta qué dibujar, abre la herramienta y mete el resultado c
   assert.equal(q('.dialogo h2').textContent, '¿Qué vas a dibujar?');
   assert.deepEqual(textos(contenedor, '.dialogo button'), ['Fondo', 'Retrato', 'Cancelar']);
   clic(q('.dialogo button[data-tipo="retrato"]'));
-  await new Promise((r) => setTimeout(r, 20));
+  await esperar(() => sesion.proyecto.juego.elementos.length === 1);
   assert.deepEqual(herramientas.llamadas, [['pixelart', { tipo: 'retrato' }]]);
   const elemento = sesion.proyecto.juego.elementos[0];
   assert.equal(elemento.origen, 'creado');
@@ -320,13 +335,13 @@ test('Grabar pregunta voz o efecto y ofrece subir en su lugar; el secuenciador n
   assert.equal(q('.dialogo h2').textContent, '¿Qué vas a grabar?');
   assert.deepEqual(textos(contenedor, '.dialogo button'), ['Voz', 'Efecto', 'Cancelar']);
   clic(q('.dialogo button[data-tipo="voz"]'));
-  await new Promise((r) => setTimeout(r, 20));
+  await esperar(() => sesion.proyecto.juego.elementos.length === 1);
   assert.deepEqual(herramientas.llamadas.at(-1), ['grabador', ['alSubirEnSuLugar']]);
   assert.equal(sesion.proyecto.juego.elementos[0].tipo, 'voz');
   assert.equal(sesion.proyecto.juego.elementos[0].nombre, 'Grabación 1');
   assert.equal(sesion.proyecto.juego.elementos[0].archivo, `${sesion.proyecto.juego.elementos[0].id}.webm`);
   clic(q('.inventario button[data-accion="crear-secuencia"]'));
-  await new Promise((r) => setTimeout(r, 20));
+  await esperar(() => herramientas.llamadas.at(-1)?.[0] === 'secuenciador' && !document.body.classList.contains('con-herramienta'));
   assert.equal(q('.dialogo'), null, 'el secuenciador no pregunta el tipo');
   assert.deepEqual(herramientas.llamadas.at(-1), ['secuenciador']);
   assert.equal(sesion.proyecto.juego.elementos.length, 1, 'cancelar no crea nada');
@@ -344,12 +359,12 @@ test('«Editar en pixel art» reabre el fondo creado con su archivo y, al guarda
   clic(q('.inventario button[data-accion="crear-pixel"]'));
   await new Promise((r) => setTimeout(r, 0));
   clic(q('.dialogo button[data-tipo="fondo"]'));
-  await new Promise((r) => setTimeout(r, 20));
+  await esperar(() => sesion.proyecto.juego.elementos.some((e) => e.tipo === 'fondo'));
   const fondo = sesion.proyecto.juego.elementos.find((e) => e.tipo === 'fondo');
   const huellaAntes = fondo.sello.huella;
   herramientas.pixelart.abrir = async (opciones) => { herramientas.llamadas.push(['pixelart', opciones.tipo, new TextDecoder().decode(opciones.archivo.datos)]); return new Blob(['png editado'], { type: 'image/png' }); };
   clic(q('.propiedades button[data-accion="editar-pixel"]'));
-  await new Promise((r) => setTimeout(r, 20));
+  await esperar(() => fondo.sello.huella !== huellaAntes);
   assert.deepEqual(herramientas.llamadas.at(-1), ['pixelart', 'fondo', 'png nuevo']);
   assert.notEqual(fondo.sello.huella, huellaAntes);
   assert.equal(new TextDecoder().decode(sesion.archivos.get(fondo.id).datos), 'png editado');
@@ -369,3 +384,69 @@ test('cambiar el destino recalcula los semáforos y anuncia los que cambian de c
   assert.ok(q('section.ficha[data-ficha="titulo"]'), 'El juego muestra sus fichas');
   contenedor.remove();
 });
+
+test('Publicar abre la capa; Generar descarga el paquete, escribe la fecha y la decisión, reinicia el contador y recuerda la copia', async () => {
+  const { p, archivos, ana } = proyectoPublicable();
+  const { sesion, contenedor, llamadas, descargas, q, qa } = armar({ proyecto: p, contenido: contenidoReal, cargarMotor: async () => motorDesdeDisco() });
+  for (const [id, a] of archivos) sesion.archivos.set(id, a);
+  sesion.cambiar(() => {});
+  assert.equal(sesion.cambiosSinCopia, 1);
+  clic(q('button[data-accion="publicar"]'));
+  assert.equal(q('.capa-publicar').hidden, false);
+  assert.ok(document.body.classList.contains('con-publicar'));
+  assert.equal(q('.capa-publicar #publicar-titulo').textContent, 'Publicar: decisión de registro');
+  const casilla = q(`.capa-publicar input[data-candidato="${ana.id}"]`);
+  casilla.checked = true;
+  casilla.dispatchEvent(new window.Event('change', { bubbles: true }));
+  clic(q('.capa-publicar button[data-accion="siguiente"]'));
+  clic(q('.capa-publicar button[data-accion="generar"]'));
+  await esperar(() => descargas.length === 1);
+  assert.deepEqual(llamadas.at(-1), ['descargar', 'entrega-camila-r-la-llave-del-faro.zip', 'application/zip']);
+  assert.equal(sesion.proyecto.publicado, '2026-11-06T15:30:00.000Z');
+  assert.deepEqual(sesion.proyecto.registro.map((d) => d.id), [ana.id]);
+  assert.equal(sesion.cambiosSinCopia, 0, 'el paquete también es una copia');
+  await esperar(() => q('.capa-publicar').hidden);
+  assert.ok(!document.body.classList.contains('con-publicar'));
+  assert.equal(document.activeElement, q('button[data-accion="publicar"]'));
+  const aviso = qa('.aviso').find((a) => /Paquete descargado/.test(a.textContent));
+  assert.ok(aviso && aviso.querySelector('button[data-accion="guardar-copia"]'), 'recuerda guardar copia después de publicar');
+  const importado = await importarCopia(descargas[0], { JSZip });
+  assert.deepEqual(importado.proyecto, sesion.proyecto, 'el paquete trae el proyecto tal como quedó');
+  assert.equal(importado.proyecto.publicado, '2026-11-06T15:30:00.000Z');
+  contenedor.remove();
+});
+
+test('si el motor no carga, la capa muestra el error, la fecha de publicación no queda escrita y nada se descarga', async () => {
+  const { p, archivos, ana } = proyectoPublicable();
+  const { sesion, contenedor, descargas, q } = armar({ proyecto: p, contenido: contenidoReal, cargarMotor: async () => { throw new Error('No se pudo leer js/motor/pantalla.js (404).'); } });
+  for (const [id, a] of archivos) sesion.archivos.set(id, a);
+  clic(q('button[data-accion="publicar"]'));
+  const casilla = q(`.capa-publicar input[data-candidato="${ana.id}"]`);
+  casilla.checked = true;
+  casilla.dispatchEvent(new window.Event('change', { bubbles: true }));
+  clic(q('.capa-publicar button[data-accion="siguiente"]'));
+  clic(q('.capa-publicar button[data-accion="generar"]'));
+  await esperar(() => /No se pudo leer/.test(q('.capa-publicar .publicar-error')?.textContent ?? ''));
+  assert.equal(q('.capa-publicar').hidden, false);
+  assert.equal(sesion.proyecto.publicado, null);
+  assert.equal(descargas.length, 0);
+  const sinMotor = armar({ proyecto: proyectoPublicable().p, contenido: contenidoReal });
+  clic(sinMotor.q('button[data-accion="publicar"]'));
+  const c = sinMotor.q('.capa-publicar input[data-candidato="historia"]');
+  c.checked = true;
+  c.dispatchEvent(new window.Event('change', { bubbles: true }));
+  clic(sinMotor.q('.capa-publicar button[data-accion="siguiente"]'));
+  clic(sinMotor.q('.capa-publicar button[data-accion="generar"]'));
+  await esperar(() => /motor del juego no está disponible/.test(sinMotor.q('.capa-publicar .publicar-error')?.textContent ?? ''));
+  contenedor.remove();
+  sinMotor.contenedor.remove();
+});
+
+test('con el candado puesto, Publicar no abre la capa', () => {
+  const { p } = proyectoConLineas();
+  const { contenedor, q } = armar({ proyecto: p, contenido: contenidoReal });
+  assert.equal(q('button[data-accion="publicar"]').getAttribute('aria-disabled'), 'true');
+  clic(q('button[data-accion="publicar"]'));
+  assert.equal(q('.capa-publicar').hidden, true);
+  contenedor.remove();
+});
```

- [ ] **Step 2: Correr las pruebas y ver que fallan**

Run: `node --test tests/editor.test.js`
Expected: FAIL: las tres pruebas nuevas no encuentran `.capa-publicar` ni descargan nada.

- [ ] **Step 3: Implementar**

Cambio en `plataforma/js/app.js`:

```diff
diff --git a/plataforma/js/app.js b/plataforma/js/app.js
index d5a2bfd..7b1cbc0 100644
--- a/plataforma/js/app.js
+++ b/plataforma/js/app.js
@@ -15,6 +15,7 @@ import { crearCatalogo } from './biblioteca/catalogo.js';
 import { crearPixelArt } from './herramientas/pixelart.js';
 import { crearGrabador } from './herramientas/grabador.js';
 import { crearSecuenciador } from './herramientas/secuenciador.js';
+import { cargarMotor } from './exportar/empaquetar.js';
 
 const raiz = document.getElementById('app');
 let sesionActual = null;
@@ -22,6 +23,7 @@ let editorActual = null;
 let catalogoActual = null; // el catálogo de la biblioteca ya cargado, o null si no está disponible
 let avisoBiblioteca = null;
 let paletaActual = null; // colores de contenido/paleta.json, o null si no cargó (sin paleta no hay herramientas)
+let motorCargado = null; // el motor leído de la propia plataforma para juego.html; se lee una vez, al publicar
 
 function pantallaDeError(titulo, detalle, lista = []) {
   vaciar(raiz).append(h('main', { class: 'inicio', id: 'contenido' },
@@ -53,6 +55,11 @@ function mostrarEditor(almacen, contenido, proyecto, archivos) {
       grabador: crearGrabador(zona),
       secuenciador: crearSecuenciador(zona),
     }) : null,
+    cargarMotor: async () => {
+      motorCargado ??= await cargarMotor();
+      return motorCargado;
+    },
+    nombreProducto: contenido.nombre,
     alNuevoJuego: async () => {
       await almacen.borrarTodo();
       mostrarInicio(almacen, contenido);
```

Cambio en `plataforma/js/editor/editor.js`:

```diff
diff --git a/plataforma/js/editor/editor.js b/plataforma/js/editor/editor.js
index c68024b..5b0d96e 100644
--- a/plataforma/js/editor/editor.js
+++ b/plataforma/js/editor/editor.js
@@ -18,6 +18,8 @@ import { crearMapaActivos } from './mapa-activos.js';
 import { crearBiblioteca, tomarPieza } from './biblioteca.js';
 import { crearElementoCreado, reemplazarArchivoCreado } from './creados.js';
 import { nombreDeArchivo } from '../estado/archivos.js';
+import { crearPublicar } from './publicar.js';
+import { generarEntrega } from '../exportar/paquete.js';
 
 const AVISO_MS = 6000;
 
@@ -41,7 +43,9 @@ export function elegirArchivoDelNavegador(accept) {
  * @param {object} opciones contenido (juridico.json), JSZip, descargarArchivo(blob, nombre),
  *   confirmar(mensaje) → boolean, elegirArchivo(accept) → Promise<File|null>, alNuevoJuego() → Promise,
  *   catalogo (de crearCatalogo, ya cargado; null si la biblioteca no está disponible), avisoInicial (texto que se muestra al abrir),
- *   crearHerramientas(contenedor) → { pixelart, grabador, secuenciador } (cada una con abrir(); null si no hay herramientas).
+ *   crearHerramientas(contenedor) → { pixelart, grabador, secuenciador } (cada una con abrir(); null si no hay herramientas),
+ *   cargarMotor() → Promise<{ modulos, estilos }> (el motor que se incrusta en juego.html; null si no se puede publicar),
+ *   nombreProducto (para el informe), ahora() → Date.
  */
 export function crearEditor(contenedor, sesion, {
   contenido = null,
@@ -53,6 +57,9 @@ export function crearEditor(contenedor, sesion, {
   catalogo = null,
   avisoInicial = null,
   crearHerramientas = null,
+  cargarMotor = null,
+  nombreProducto = contenido?.nombre ?? 'Mi primer videojuego',
+  ahora = () => new Date(),
 } = {}) {
   let seleccion = null;
   let escenaActivaId = null;
@@ -70,6 +77,7 @@ export function crearEditor(contenedor, sesion, {
   const zonaMapa = h('div', { class: 'capa-mapa', hidden: true });
   const zonaBiblioteca = h('div', { class: 'capa-biblioteca', hidden: true });
   const zonaHerramienta = h('div', { class: 'capa-herramienta', hidden: true });
+  const zonaPublicar = h('div', { class: 'capa-publicar', hidden: true });
   const estadoGuardado = h('span', { class: 'estado-guardado', 'aria-live': 'polite' });
   const botonJugarAqui = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'jugar-aqui' }, onclick: () => jugarDesde(escenaActivaId) }, '▶ Jugar desde esta escena');
   vaciar(contenedor).append(
@@ -82,6 +90,7 @@ export function crearEditor(contenedor, sesion, {
     zonaDialogo,
     zonaBiblioteca,
     zonaHerramienta,
+    zonaPublicar,
     zonaMapa,
     zonaReproductor,
   );
@@ -94,7 +103,7 @@ export function crearEditor(contenedor, sesion, {
     alGuardarCopia: guardarCopia,
     alAbrirCopia: abrirCopia,
     alNuevoJuego: nuevoJuego,
-    alPublicar: () => avisar('La publicación llega en una versión siguiente. Por ahora el candado te dice qué falta.'),
+    alPublicar: () => abrirPublicar(),
   });
   const inventario = crearInventario(zonaInventario, sesion, {
     alSeleccionar: (s) => seleccionar(s),
@@ -152,6 +161,40 @@ export function crearEditor(contenedor, sesion, {
     mapa.abrir();
   }
 
+  // ---- publicación (spec, sección 3 paso 5, 12.7, 13 y 14) ----
+  const publicar = crearPublicar(zonaPublicar, sesion, {
+    contenido: contenido ?? {},
+    alGenerar: generarPaquete,
+    alCerrar: () => {
+      document.body.classList.remove('con-publicar');
+      zonaBarra.querySelector('[data-accion="publicar"]')?.focus();
+    },
+  });
+
+  function abrirPublicar() {
+    document.body.classList.add('con-publicar');
+    publicar.abrir();
+  }
+
+  /** Escribe la fecha de publicación, genera el paquete y lo descarga. Si algo falla, la fecha vuelve atrás y el error sube a la capa. */
+  async function generarPaquete() {
+    if (!cargarMotor) throw new Error('No se puede generar el paquete: el motor del juego no está disponible.');
+    const motor = await cargarMotor();
+    const anterior = sesion.proyecto.publicado;
+    sesion.cambiar((p) => { p.publicado = ahora().toISOString(); }, { origen: 'publicar' });
+    let paquete;
+    try {
+      paquete = await generarEntrega(sesion.proyecto, sesion.archivos, { JSZip, contenido: contenido ?? {}, motor, nombreProducto, ahora: ahora() });
+    } catch (error) {
+      sesion.cambiar((p) => { p.publicado = anterior; }, { origen: 'publicar' });
+      throw error;
+    }
+    await sesion.guardarAhora();
+    descargarArchivo(paquete.blob, paquete.nombre);
+    sesion.marcarCopiaGuardada();
+    avisar(`Paquete descargado: ${paquete.nombre}. Súbelo al formulario del curso. También sirve como copia del proyecto («Abrir copia» lo acepta): guárdalo bien.`, { accion: ['Guardar copia', guardarCopia] });
+  }
+
   // ---- selección y redibujado ----
   const escenaActiva = () => sesion.proyecto.juego.escenas.find((e) => e.id === escenaActivaId) ?? null;
   const escenaDe = (s) => (s?.tipo === 'escena' ? s.id : s?.tipo === 'linea' ? s.escena : null);
@@ -195,8 +238,8 @@ export function crearEditor(contenedor, sesion, {
     barra.dibujar();
     inventario.dibujar(seleccion);
     vistaPrevia.dibujar(escenaActiva(), indice);
-    if (estructura || origen !== 'propiedades') propiedades.dibujar(seleccion);
-    if (estructura || origen !== 'guion') guion.dibujar(escenaActiva(), indice);
+    if (estructura || (origen !== 'propiedades' && origen !== 'publicar')) propiedades.dibujar(seleccion);
+    if (estructura || (origen !== 'guion' && origen !== 'publicar')) guion.dibujar(escenaActiva(), indice);
     mapa.dibujar();
     anunciarSemaforos();
   }
@@ -291,6 +334,7 @@ export function crearEditor(contenedor, sesion, {
     try {
       biblioteca?.cerrar();
       mapa.cerrar();
+      publicar.cerrar();
       cerrarReproductor();
       await sesion.reemplazar(copia.proyecto, copia.archivos);
       avisar('Copia abierta.');
@@ -307,6 +351,7 @@ export function crearEditor(contenedor, sesion, {
     }
     biblioteca?.cerrar();
     mapa.cerrar();
+    publicar.cerrar();
     cerrarReproductor();
     await alNuevoJuego();
   }
@@ -423,10 +468,12 @@ export function crearEditor(contenedor, sesion, {
     crearConHerramienta,
     editarPixel,
     jugarDesde,
+    publicar: abrirPublicar,
     mostrarError,
     destruir() {
       biblioteca?.cerrar();
       mapa.cerrar();
+      publicar.cerrar();
       cerrarReproductor();
       vaciar(contenedor);
     },
```

- [ ] **Step 4: Correr las pruebas y ver que pasan**

Run: `node --test tests/editor.test.js`
Expected: PASS: 20 pruebas del editor. La suite: 336. Las esperas de las pruebas de herramientas pasan de tiempos fijos a esperar una condición, porque bajo carga 20 ms no bastaban.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Editor y arranque: Publicar abre la decisión de registro, genera el paquete con el motor de la propia plataforma y lo descarga"
```


### Task 7: El recorrido completo con Playwright

**Files:**
- Create: `playwright.config.js`
- Modify: `package-lock.json`
- Modify: `package.json`
- Test: `tests/e2e/recorrido.spec.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

`tests/e2e/recorrido.spec.js`:

```js
// tests/e2e/recorrido.spec.js
// El recorrido completo del estudiante en Chromium (spec, sección 18): arranque, armar
// el juego mínimo con pixel art, una subida, una pieza de biblioteca y una grabación con
// micrófono falso, llenar fichas, ver el semáforo cambiar con el destino, publicar, y
// abrir el juego.html exportado para jugarlo hasta los créditos.
import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import JSZip from 'jszip';
import { png, lienzo } from '../../scripts/png-wav.js';

const ESTUDIANTE = 'Camila Rojas';
const TITULO = 'La llave del faro';

function pngDePrueba() {
  const l = lienzo(192, 108);
  l.rect(0, 0, 192, 108, [40, 60, 90]);
  l.rect(20, 70, 150, 30, [200, 180, 90]);
  return png(192, 108, l.rgba);
}

/** Dibuja un retrato con la herramienta de pixel art y lo guarda. */
async function crearRetratoConPixelArt(page) {
  await page.locator('[data-accion="crear-pixel"]').click();
  await page.locator('.dialogo button[data-tipo="retrato"]').click();
  const lienzoPixel = page.locator('.pixelart .pixel-lienzo');
  await expect(lienzoPixel).toBeVisible();
  await page.locator('.pixelart .pixel-color[data-color="3"]').click();
  const caja = await lienzoPixel.boundingBox();
  for (const [fx, fy] of [[0.3, 0.3], [0.5, 0.5], [0.7, 0.4], [0.5, 0.8]]) {
    await page.mouse.click(caja.x + caja.width * fx, caja.y + caja.height * fy);
  }
  await page.locator('.pixelart [data-accion="guardar"]').click();
  await expect(page.locator('.pixelart')).toHaveCount(0);
}

/** Asigna un valor a un control del panel de propiedades (o del guion) por su data-foco. */
async function elegir(page, foco, etiqueta) {
  await page.locator(`[data-foco="${foco}"]`).selectOption({ label: etiqueta });
}

test('recorrido completo: del arranque al juego exportado y jugado', async ({ page }) => {
  const carpeta = mkdtempSync(join(tmpdir(), 'entrega-e2e-'));
  const errores = [];
  page.on('pageerror', (error) => errores.push(error.message));

  // ---- Arranque (spec 3, paso 1) ----
  await page.goto('/plataforma/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mi primer videojuego');
  await expect(page.locator('.privacidad')).toContainText('Nada sale de tu navegador');
  await page.fill('#inicio-estudiante', ESTUDIANTE);
  await page.fill('#inicio-titulo', TITULO);
  await page.getByRole('button', { name: 'Empezar' }).click();
  await expect(page.locator('.barra-juego')).toHaveText(TITULO);
  const publicar = page.locator('button[data-accion="publicar"]');
  await expect(publicar).toHaveAttribute('aria-disabled', 'true');

  // ---- Escenas y personajes ----
  await page.getByRole('button', { name: 'Nueva escena' }).click();
  await page.getByRole('button', { name: 'Nueva escena' }).click();
  const escenas = page.locator('.inventario-seccion').nth(0).locator('button.entrada');
  await expect(escenas).toHaveCount(3);
  await page.getByRole('button', { name: 'Nuevo personaje' }).click();
  await page.locator('.propiedades [data-foco="nombre"]').fill('Ana');
  await page.getByRole('button', { name: 'Nuevo personaje' }).click();
  await page.locator('.propiedades [data-foco="nombre"]').fill('El farero');
  const personajes = page.locator('.inventario-seccion').nth(1).locator('button.entrada');
  await expect(personajes).toHaveCount(2);

  // ---- Pixel art: dos retratos creados dentro, con ficha en verde ----
  await crearRetratoConPixelArt(page);
  await expect(page.locator('.propiedades h2')).toHaveText('Retrato');
  await expect(page.locator('.propiedades .ficha-color')).toContainText('verde');
  await crearRetratoConPixelArt(page);
  await personajes.nth(0).click();
  await elegir(page, 'retrato', 'Retrato creado 1');
  await personajes.nth(1).click();
  await elegir(page, 'retrato', 'Retrato creado 2');

  // ---- Subir un archivo: el fondo, con ficha amarilla hasta elegir la prueba ----
  const [selector] = await Promise.all([page.waitForEvent('filechooser'), page.locator('[data-accion="subir"]').click()]);
  await selector.setFiles({ name: 'muelle.png', mimeType: 'image/png', buffer: pngDePrueba() });
  await page.locator('.dialogo button[data-tipo="fondo"]').click();
  await expect(page.locator('.propiedades h2')).toHaveText('Fondo');
  await expect(page.locator('.propiedades .ficha-color')).toContainText('amarillo');
  await page.locator('.propiedades section.ficha select[id$="-prueba"]').selectOption('original');
  await expect(page.locator('.propiedades .ficha-color')).toContainText('verde');

  // ---- Biblioteca: una pieza no comercial, con ficha precargada ----
  await page.locator('[data-accion="biblioteca"]').click();
  await page.locator('.capa-biblioteca [data-filtro="musica"]').click();
  await page.locator('.biblioteca-pieza[data-pieza="bib_m03"] [data-accion="usar"]').click();
  await expect(page.locator('.propiedades h2')).toHaveText('Música');
  await expect(page.locator('.propiedades .ficha-color')).toContainText('amarillo');
  await page.locator('.propiedades section.ficha').getByLabel('Leí la licencia').check();
  await expect(page.locator('.propiedades .ficha-color')).toContainText('verde');

  // ---- Grabador con micrófono falso: un efecto ----
  await page.locator('[data-accion="crear-grabar"]').click();
  await page.locator('.dialogo button[data-tipo="efecto"]').click();
  await expect(page.locator('.grabador')).toBeVisible();
  await page.locator('.grabador [data-accion="grabar"]').click();
  await page.waitForTimeout(1200);
  await page.locator('.grabador [data-accion="detener"]').click();
  await expect(page.locator('.grabador [data-accion="guardar"]')).toBeEnabled();
  await page.locator('.grabador [data-accion="guardar"]').click();
  await expect(page.locator('.grabador')).toHaveCount(0);
  await expect(page.locator('.propiedades h2')).toHaveText('Efecto');
  await expect(page.locator('.propiedades .ficha-color')).toContainText('verde');

  // ---- Escena 1: fondo, música, un diálogo con efecto y una decisión ----
  await escenas.nth(0).click();
  await elegir(page, 'fondo', 'muelle');
  await elegir(page, 'musica', 'Persecución');
  await page.locator('button[data-agregar="dialogo"]').click();
  await elegir(page, 'personaje:0', 'Ana');
  await page.locator('[data-foco="texto:0"]').fill('¿Quién dejó la puerta abierta?');
  await elegir(page, 'efecto', 'Efecto grabado 1');
  await page.locator('button[data-agregar="decision"]').click();
  await page.locator('[data-foco="texto:1"]').fill('¿Subes a la torre?');
  await page.locator('[data-foco="opcion:1:0"]').fill('Sí');
  await elegir(page, 'destino:1:0', 'Escena 2');
  await page.locator('[data-foco="opcion:1:1"]').fill('No');
  await elegir(page, 'destino:1:1', 'Escena 3');
  await escenas.nth(1).click();
  await page.locator('button[data-agregar="fin"]').click();
  await page.locator('[data-foco="texto:0"]').fill('Alguien apagó el faro a propósito. Fin.');
  await escenas.nth(2).click();
  await page.locator('button[data-agregar="fin"]').click();
  await page.locator('[data-foco="texto:0"]').fill('Amanece sin respuestas. Fin.');

  // ---- El destino cambia el semáforo (spec 12.4): venta pone en rojo la pieza no comercial ----
  await page.locator('.inventario button.entrada').first().click();
  await expect(page.locator('.propiedades h2')).toHaveText('El juego');
  await expect(page.locator('.inventario .punto-semaforo.semaforo-rojo')).toHaveCount(0);
  await elegir(page, 'destino', 'Venderlo');
  await expect(page.locator('.inventario .punto-semaforo.semaforo-rojo')).toHaveCount(1);
  await expect(publicar).toHaveAttribute('aria-disabled', 'true');
  await elegir(page, 'destino', 'Publicarlo gratis');
  await expect(page.locator('.inventario .punto-semaforo.semaforo-rojo')).toHaveCount(0);

  // ---- Mapa de activos y Publicar habilitado ----
  await page.locator('[data-accion="mapa"]').click();
  await expect(page.locator('.mapa-tabla tbody tr')).toHaveCount(2 + 2 + 5);
  await page.locator('[data-accion="cerrar-mapa"]').click();
  await expect(publicar).not.toHaveAttribute('aria-disabled', 'true');

  // ---- Jugar dentro del editor ----
  await page.locator('[data-accion="jugar"]').click();
  await expect(page.locator('.capa-reproductor .escenario-texto')).toHaveText('¿Quién dejó la puerta abierta?');
  await page.locator('.capa-reproductor [data-accion="cerrar"]').click();

  // ---- Publicar: decisión de registro y paquete (spec 12.7 y 14) ----
  await publicar.click();
  await expect(page.locator('#publicar-titulo')).toHaveText('Publicar: decisión de registro');
  await page.locator('.capa-publicar input[data-candidato="historia"]').check();
  await page.locator('.capa-publicar [data-decision="historia"] input[data-campo="prueba"]').fill('El guion guardado en la plataforma y en la copia descargada');
  await page.locator('.capa-publicar [data-decision="historia"] textarea[data-campo="porque"]').fill('Es lo más mío del juego.');
  await page.locator('.capa-publicar [data-accion="siguiente"]').click();
  await expect(page.locator('#publicar-titulo')).toHaveText('Publicar: el paquete de entrega');
  await expect(page.locator('.publicar-resumen')).toContainText('entrega-camila-rojas-la-llave-del-faro.zip');
  const [descarga] = await Promise.all([page.waitForEvent('download'), page.locator('.capa-publicar [data-accion="generar"]').click()]);
  expect(descarga.suggestedFilename()).toBe('entrega-camila-rojas-la-llave-del-faro.zip');
  const rutaZip = join(carpeta, descarga.suggestedFilename());
  await descarga.saveAs(rutaZip);
  await expect(page.locator('.capa-publicar')).toBeHidden();
  await expect(page.locator('.aviso').filter({ hasText: 'Paquete descargado' })).toBeVisible();

  // ---- El paquete trae las piezas; el proyecto se puede volver a abrir ----
  const zip = await JSZip.loadAsync(await import('node:fs/promises').then((fs) => fs.readFile(rutaZip)));
  const nombres = Object.keys(zip.files).filter((n) => !zip.files[n].dir).sort();
  expect(nombres).toContain('juego.html');
  expect(nombres).toContain('informe-juridico.html');
  expect(nombres).toContain('proyecto.json');
  expect(nombres.filter((n) => n.startsWith('archivos/'))).toHaveLength(5);
  const proyecto = JSON.parse(await zip.file('proyecto.json').async('string'));
  expect(proyecto.estudiante).toBe(ESTUDIANTE);
  expect(proyecto.publicado).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(proyecto.registro).toHaveLength(1);
  writeFileSync(join(carpeta, 'juego.html'), await zip.file('juego.html').async('nodebuffer'));
  writeFileSync(join(carpeta, 'informe-juridico.html'), await zip.file('informe-juridico.html').async('nodebuffer'));

  // ---- El juego exportado se abre sin servidor y se juega hasta los créditos ----
  await page.goto(pathToFileURL(join(carpeta, 'juego.html')).href);
  await expect(page).toHaveTitle(TITULO);
  await expect(page.locator('.escenario-nombre')).toHaveText('Ana');
  await expect(page.locator('.escenario-texto')).toHaveText('¿Quién dejó la puerta abierta?');
  await expect(page.locator('.escenario-fondo img')).toHaveAttribute('src', /^data:image\/png;base64,/);
  await expect(page.locator('.escenario-retrato img')).toHaveClass(/pixel/);
  await page.locator('.reproductor-escena').click();
  await expect(page.locator('.escenario-texto')).toHaveText('¿Subes a la torre?');
  await page.locator('.opcion[data-opcion="0"]').click();
  await expect(page.locator('.escenario-texto')).toHaveText('Alguien apagó el faro a propósito. Fin.');
  await page.locator('.reproductor-escena').click();
  await expect(page.locator('.escenario-creditos')).toContainText(`${ESTUDIANTE}: autor(a) del juego`);
  await expect(page.locator('.escenario-creditos')).toContainText('Persecución');

  // ---- El informe se abre y trae lo esencial ----
  await page.goto(pathToFileURL(join(carpeta, 'informe-juridico.html')).href);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITULO);
  await expect(page.locator('.portada')).toContainText(ESTUDIANTE);
  await expect(page.locator('#mapa tbody tr')).toHaveCount(9);
  await expect(page.locator('#registro')).toContainText('Es lo más mío del juego.');
  await expect(page.locator('#fichas article.ficha')).toHaveCount(9);

  expect(errores, `errores de página: ${errores.join(' | ')}`).toEqual([]);
});
```

- [ ] **Step 2: Correr las pruebas y ver que fallan**

Run: `npm run test:e2e`
Expected: FAIL hasta que existan la configuración y el recorrido (Playwright no encuentra pruebas).

- [ ] **Step 3: Implementar**

`playwright.config.js`:

```js
// playwright.config.js
// El recorrido completo en un navegador real (spec, sección 18). Corre aparte de
// `npm test`: `npm run test:e2e`. Levanta el servidor estático de tests/manual/servir.js
// en el puerto 8089 y usa Chromium con micrófono falso para probar el grabador.
import { defineConfig, devices } from '@playwright/test';

const PUERTO = 8089;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 180_000,
  expect: { timeout: 10_000 },
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    locale: 'es-CO',
    permissions: ['microphone'],
    launchOptions: {
      args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
    },
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1400, height: 900 } } }],
  webServer: {
    command: `node tests/manual/servir.js ${PUERTO}`,
    url: `http://localhost:${PUERTO}/plataforma/`,
    reuseExistingServer: true,
    timeout: 20_000,
  },
});
```

Cambio en `package-lock.json`:

```diff
diff --git a/package-lock.json b/package-lock.json
index d04d900..26dfbad 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -8,6 +8,7 @@
       "name": "plataforma-primer-videojuego",
       "version": "0.1.0",
       "devDependencies": {
+        "@playwright/test": "^1.65.0",
         "fake-indexeddb": "^6.0.0",
         "jsdom": "^29.1.1",
         "jszip": "^3.10.1"
@@ -238,6 +239,22 @@
         }
       }
     },
+    "node_modules/@playwright/test": {
+      "version": "1.65.0",
+      "resolved": "https://registry.npmjs.org/@playwright/test/-/test-1.65.0.tgz",
+      "integrity": "sha512-iGURLGuKDLakSEl7Pgfv8h7f+XLT+V861Wfhz0zlEl5nyFuKUopdkFBPKqTllTUp06aOwPuH8iuUEb3yp3MpbQ==",
+      "dev": true,
+      "license": "Apache-2.0",
+      "dependencies": {
+        "playwright": "1.65.0"
+      },
+      "bin": {
+        "playwright": "cli.js"
+      },
+      "engines": {
+        "node": ">=20"
+      }
+    },
     "node_modules/bidi-js": {
       "version": "1.1.0",
       "resolved": "https://registry.npmjs.org/bidi-js/-/bidi-js-1.1.0.tgz",
@@ -455,6 +472,35 @@
         "url": "https://github.com/inikulin/parse5?sponsor=1"
       }
     },
+    "node_modules/playwright": {
+      "version": "1.65.0",
+      "resolved": "https://registry.npmjs.org/playwright/-/playwright-1.65.0.tgz",
+      "integrity": "sha512-F3AMWcR44qMBt4kq+6Kb6mX7bjGXshktKFOPULd7reED6ZJWevjbNRqysP7q+AATE9kdPEZBibex1BYsvpVoeA==",
+      "dev": true,
+      "license": "Apache-2.0",
+      "dependencies": {
+        "playwright-core": "1.65.0"
+      },
+      "bin": {
+        "playwright": "cli.js"
+      },
+      "engines": {
+        "node": ">=20"
+      }
+    },
+    "node_modules/playwright-core": {
+      "version": "1.65.0",
+      "resolved": "https://registry.npmjs.org/playwright-core/-/playwright-core-1.65.0.tgz",
+      "integrity": "sha512-vNSKgH6YqtN7cdT/L334zo0a+YwkrpicyrHJlWWPIm/Q+Nn2SWInil01oT0mbu96U4GgoRtCYQD9CzJQgju+lA==",
+      "dev": true,
+      "license": "Apache-2.0",
+      "bin": {
+        "playwright-core": "cli.js"
+      },
+      "engines": {
+        "node": ">=20"
+      }
+    },
     "node_modules/process-nextick-args": {
       "version": "2.0.1",
       "resolved": "https://registry.npmjs.org/process-nextick-args/-/process-nextick-args-2.0.1.tgz",
```

Cambio en `package.json`:

```diff
diff --git a/package.json b/package.json
index 1a075fc..fb4e6eb 100644
--- a/package.json
+++ b/package.json
@@ -5,12 +5,14 @@
   "description": "Plataforma de práctica: primer videojuego y derecho de autor",
   "type": "module",
   "scripts": {
-    "test": "node --test"
+    "test": "node --test",
+    "test:e2e": "playwright test"
   },
   "engines": {
     "node": ">=20"
   },
   "devDependencies": {
+    "@playwright/test": "^1.65.0",
     "fake-indexeddb": "^6.0.0",
     "jsdom": "^29.1.1",
     "jszip": "^3.10.1"
```

- [ ] **Step 4: Correr las pruebas y ver que pasan**

Run: `npm run test:e2e`
Expected: PASS: 1 prueba en Chromium, del arranque al juego exportado. Antes: `npm install -D @playwright/test` y `npx playwright install chromium`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Pruebas: recorrido completo con Playwright, del arranque al juego exportado, con micrófono falso"
```


### Task 8: Cierre del plan: suite, comprobación manual y README

**Files:**
- Modify: `plataforma/README.md`
- Create: `docs/superpowers/plans/2026-11-06-plan-6-publicacion.md` (este documento)

- [ ] **Step 1: Correr toda la suite y el recorrido**

Run: `npm test && npm run test:e2e`
Expected: PASS: 336 en Node y el recorrido en Chromium.

- [ ] **Step 2: Comprobación visual**

Generar un informe y un juego de muestra (por ejemplo con `proyectoPublicable()` y `motorDesdeDisco()`), servirlos con `node tests/manual/servir.js` y abrirlos: portada, tabla del mapa, árbol de la cadena, decisión de registro y fichas con marcas «Por verificar»; el juego avanza y muestra la decisión. Borrar los archivos de muestra después. Lo que queda para la lista manual está al final de este plan.

- [ ] **Step 3: README**

Actualizar `plataforma/README.md`: estado (los seis planes), qué entrega el estudiante, cómo correr Playwright, `js/exportar/` e `informe.js` en la estructura, lo que queda fuera del código (GitHub Pages sin remoto, biblioteca provisional, verificación jurídica, lista manual).

- [ ] **Step 4: Commit**

```bash
git add plataforma/README.md docs/superpowers/plans/2026-11-06-plan-6-publicacion.md
git commit -m "Plan 6 de 6: publicación, y README"
```


## Lista manual (spec, sección 18)

Lo que ninguna prueba automática cubre y conviene hacer antes de entregar a estudiantes:

- [ ] Grabar con un micrófono real en Chrome, Edge, Firefox y Safari (el recorrido usa el micrófono falso de Chromium).
- [ ] Abrir `informe-juridico.html` y guardarlo como PDF desde el navegador: una sección por página, nada cortado, marcas «Por verificar» visibles.
- [ ] Abrir `juego.html` en un celular (compartirlo por mensaje o copiarlo): se juega con toque, el audio suena al primer toque.
- [ ] Publicar la carpeta `plataforma/` en GitHub Pages (spec 15.5): hace falta crear el repositorio remoto; hoy no hay ninguno.

## Autorrevisión del plan contra el spec

**1. Cobertura del spec.**

| Requisito | Dónde |
|---|---|
| 3, paso 5: Publicar → decisión de registro → paquete → formulario del curso | Tareas 5 y 6 |
| 12.6: la pantalla de créditos va dentro del juego publicado | Tarea 2 (`juego.html` incrusta `creditos(proyecto)`); el árbol de titularidad, tarea 3 |
| 12.7: hasta tres elementos, si lo registraría, a nombre de quién, con qué prueba, explicación de qué prueba el registro; va al informe | Tareas 5 (capa) y 3 (informe); explicación con `campos.prueba` y `notas.N_SELLO` |
| 13: recordatorio de copia después de publicar | Tarea 6 (`generarPaquete`: aviso con «Guardar copia» y contador en cero) |
| 14: `juego.html` en un solo archivo sin internet | Tarea 2 (motor concatenado, recursos en base64, probado en jsdom y en Chromium) |
| 14: `informe-juridico.html` con portada (estudiante, juego, destino, fecha, huella SHA-256 de `proyecto.json`), mapa, cadena, decisión, fichas completas con notas, leyenda educativa; se guarda como PDF | Tarea 3 (`@media print`), huella en tarea 4 |
| 14: `proyecto.json` y `archivos/` en el formato de «Guardar copia» | Tarea 4 (`importarCopia` acepta el paquete; prueba de ida y vuelta) |
| 14 y 17: paquete de más de 50 MB → lista de los más pesados sin bloquear | Tareas 2 (`pesos`) y 5 (paso 2 de la capa) |
| 15.3: `exportar/paquete.js` (`generarEntrega`, `generarJuegoHtml`), `juridico/informe.js` (`generar`) | Tareas 2, 3 y 4. `generarEntrega` devuelve `{ blob, huella, nombre }` en vez de solo el Blob, porque el editor necesita el nombre y la huella es del texto exacto del zip |
| 18: `exportar.test.js` con las tres piezas, `proyecto.json` idéntico, `juego.html` con motor, documento y créditos | Tarea 4 |
| 18: recorrido Playwright de principio a fin, con pixel art, subida, biblioteca, fichas, cambio de destino, publicar, abrir el `juego.html` exportado y jugarlo; grabador con micrófono simulado | Tarea 7 |
| 19.13: el informe marca o no muestra los textos pendientes | Tarea 3: marca «Por verificar» donde se citan y lista al final |

Fuera de este plan, y anotado en el README: GitHub Pages (15.5) depende de crear el repositorio remoto; la lista manual queda arriba.

**2. Marcadores de posición.** Ninguno: cada tarea trae el archivo completo o el diff real del commit, el comando y el resultado esperado.

**3. Consistencia de nombres.** `cargarMotor()` devuelve `{ modulos, estilos }` y así lo reciben `generarJuegoHtml(proyecto, archivos, motor)` y `generarEntrega(..., { motor })`; `motorDesdeDisco()` devuelve la misma forma. `proyecto.registro` guarda `{ id, registraria: 'si'|'no', aNombreDe, prueba, porque }` en la capa (tarea 5), en la validación (tarea 4) y en el informe (tarea 3). `proyecto.publicado` es la fecha ISO o `null` en el modelo, la validación, el editor y el informe. `ETIQUETAS_REGISTRO` vive en `juridico/formulario.js` y lo usan la capa y el informe; `NOMBRES_DESTINO` también se mudó ahí (propiedades.js lo reexporta para inicio.js).
