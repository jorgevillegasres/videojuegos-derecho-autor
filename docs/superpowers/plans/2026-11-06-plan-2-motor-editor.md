# Plan 2 de 6: Motor y editor — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar la plataforma usable en el navegador: pantalla de arranque, editor de tres columnas (inventario, escena activa con vista previa y guion, propiedades), reproductor con el que se juega el proyecto, subida de archivos, guardado automático y copias desde la interfaz.

**Architecture:** El motor se parte en dos: `motor/partida.js` es el estado puro de una partida (sin DOM, probado en Node) y `motor/pantalla.js` dibuja una vista; `motor/reproductor.js` une ambos con la entrada y el audio. El editor sigue la misma idea: `editor/sesion.js` es el estado (proyecto, archivos, guardado con espera, URLs de objetos) y cada columna es un módulo que dibuja a partir de la sesión y le pide los cambios con `sesion.cambiar()`. Las vistas se prueban con jsdom; lo que no cabe en jsdom (arrastrar, audio real, micrófono) se prueba a mano con una página de prueba y, en el plan 6, con Playwright.

**Tech Stack:** Igual que el plan 1 (módulos ES, sin framework, Node 24 con `node --test`), más `jsdom` 29 solo para pruebas. Spec: `docs/superpowers/specs/2026-11-04-plataforma-primer-videojuego-design.md`, secciones 3, 6 (sinopsis), 7, 8, 10 (primer párrafo), 13 (interfaz), 15.4, 16 y 17.

---

## Mapa de planes

| Plan | Qué construye | Sección del spec |
|---|---|---|
| 1. Núcleo (hecho) | Modelo del juego, fichas, licencias, semáforo, contenido jurídico, almacén, copias | 6, 12.2–12.5, 12.9, 13 |
| **2. Motor y editor (este)** | Reproductor, `index.html`, arranque, inventario, guion, vista previa, propiedades, subida de archivos, copias desde la interfaz | 3, 7, 8, 10 (formatos y límites), 13 (interfaz), 15.4, 16, 17 |
| 3. Fichas en pantalla | Panel de ficha, semáforos en el inventario, mapa de activos, cambio de destino, pregunta de autoría al subir | 12.1, 12.6, 12.8, 10 (segundo párrafo) |
| 4. Biblioteca | Catálogo con piezas y licencias reales, créditos, carga en el editor | 11 |
| 5. Herramientas | Pixel art, grabador, secuenciador | 9 |
| 6. Publicación | Decisión de registro, créditos, informe, paquete de entrega, recorrido Playwright | 12.7, 14, 18 |

**Ajuste respecto del mapa del plan 1:** la subida de archivos (sección 10, formatos y límites) pasa del plan 5 a este, porque sin ella el editor no tiene manera de meter un fondo, un retrato o una pista y nada se puede probar de punta a punta. La pregunta de autoría que abre la ficha al subir (segundo párrafo de la sección 10) sigue en el plan 3, con el panel de ficha.

**Decisiones que este plan fija y el spec no decía:**

- La voz de un diálogo no se corta al avanzar a una línea sin voz («se reproduce completa»); sí se corta cuando llega otra voz, al abrir los créditos, al reiniciar y al cerrar.
- Una opción de decisión cuyo destino no existe (B02) termina el juego y muestra los créditos: jugar nunca se bloquea, pero no hay a dónde ir.
- Los créditos que muestra el reproductor en este plan son provisionales (estudiante como autor del juego y de la historia, más el campo `credito` de cada ficha que lo tenga). El plan 6 los reemplaza por `juridico/cadena.js`.
- El botón «Mapa de activos» de la barra llega con el plan 3; «Publicar» muestra el candado y lo que falta, y cuando no falta nada avisa que la publicación llega en una versión siguiente (plan 6).
- El modelo gana `juego.sinopsis` (sección 7 la pide y la sección 6 no la tenía) y `eliminarLinea(escena, indice)`.
- La escena inicial se cambia desde las propiedades de la escena («Hacer inicial»); el spec no decía dónde.

## Convenciones de este plan

- Todo en español. Las vistas reciben el contenedor y la sesión, exponen `dibujar()` y nunca guardan copias del proyecto: lo leen de `sesion.proyecto` cada vez, porque «Abrir copia» lo reemplaza entero.
- Todo cambio al proyecto pasa por `sesion.cambiar((proyecto) => { ... }, detalle)`. `detalle.origen` dice qué vista lo hizo y `detalle.estructura` si cambió la forma (líneas, listas) o solo un texto. El editor redibuja las demás vistas y, si no hubo cambio de estructura, no redibuja la que originó el cambio, para no perder el foco mientras se escribe.
- Lo que el navegador hace y Node no (crear URLs de objetos, reproducir audio, confirmar, descargar) se recibe como parámetro con un valor por defecto que usa el navegador; las pruebas pasan dobles.
- Pruebas con DOM: cada archivo empieza con `instalarDom()` de `tests/ayudas/dom.js`, que crea una ventana jsdom y copia a `globalThis` lo que las vistas usan (`document`, `window`, eventos). `node --test` corre cada archivo en su propio proceso, así que no se contaminan.
- Cada tarea termina con un commit en español que cierra con `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Conteo de pruebas: el plan 1 dejó 132. Cada tarea dice cuántas agrega; el cierre espera 207.

## Estructura de archivos que deja este plan

```
package.json                        + devDependency jsdom
plataforma/
  index.html                        inicio y editor en una sola página
  css/
    tokens.css                      tokens del portal (colores, tipografías) y paleta clara del editor
    editor.css                      barra, tres columnas, inventario, guion, propiedades, avisos
    reproductor.css                 escenario oscuro; también irá dentro de juego.html (plan 6)
  js/
    app.js                          arranque: capacidades, contenido, almacén, inicio o editor, errores
    ui/
      dom.js                        h(), vaciar(), conservarFoco(), anunciar(), descargar()
      capacidades.js                comprobar(ventana) → { ok, faltantes }
    motor/
      partida.js                    estado puro: crearPartida, vistaActual, vistaDeLinea, avanzar, elegir, reiniciar
      pantalla.js                   crearPantalla(contenedor, { juego, resolverRecurso }) → { mostrar, mostrarCreditos }
      reproductor.js                jugar(contenedor, juego, resolverRecurso, opciones) → { cerrar }
    editor/
      sesion.js                     crearSesion({ proyecto, archivos, almacen, ... })
      subida.js                     validarSubida, subirElemento
      controles.js                  selector(), campoTexto(), areaTexto() para guion y propiedades
      inventario.js                 El juego, escenas (con avisos grises), personajes, elementos
      guion.js                      bloques de línea editables, mover, eliminar, agregar
      vista-previa.js               vista fija de la línea seleccionada, con el código del motor
      propiedades.js                panel derecho: juego, escena, línea, personaje, elemento
      barra.js                      título, Jugar, Guardar copia, Abrir copia, Nuevo juego, Publicar con candado
      inicio.js                     pantalla de arranque
      editor.js                     arma las columnas, coordina selección y redibujado, abre el reproductor
tests/
  ayudas/dom.js                     instalarDom(), clic(), teclear(), escribir(), textos()
  ayudas/sesion.js                  sesionDePrueba() con almacén mudo y temporizador quieto
  ayudas/proyecto.js                proyectoPublicable()
  manual/servir.js                  servidor estático mínimo para probar a mano en localhost
  manual/motor.html                 juego escrito a mano para el reproductor (spec 15.6, paso 3)
  dom.test.js      partida.test.js   pantalla.test.js   reproductor.test.js   servir.test.js
  sesion.test.js   subida.test.js    capacidades.test.js
  inventario.test.js  guion.test.js  vista-previa.test.js  propiedades.test.js
  barra.test.js    inicio.test.js    editor.test.js
```

---

### Task 1: Modelo: sinopsis y eliminarLinea

**Files:**
- Modify: `plataforma/js/estado/modelo.js`
- Modify: `plataforma/js/estado/copias.js`
- Modify: `tests/modelo.test.js`, `tests/copias.test.js`
- Modify: `docs/superpowers/specs/2026-11-04-plataforma-primer-videojuego-design.md` (secciones 6 y 8)

- [ ] **Step 1: Escribir las pruebas que fallan**

Al final de `tests/modelo.test.js`:

```js
test('crearProyecto deja la sinopsis vacía y eliminarLinea quita la línea indicada', () => {
  const p = proyectoBase();
  assert.equal(p.juego.sinopsis, '');
  const escena = p.juego.escenas[0];
  agregarLinea(escena, 'narracion', { texto: 'uno' });
  agregarLinea(escena, 'narracion', { texto: 'dos' });
  agregarLinea(escena, 'narracion', { texto: 'tres' });
  eliminarLinea(escena, 1);
  assert.deepEqual(escena.lineas.map((l) => l.texto), ['uno', 'tres']);
  eliminarLinea(escena, 7);
  eliminarLinea(escena, -1);
  assert.equal(escena.lineas.length, 2, 'un índice fuera de rango se ignora');
});
```

Y agregar `eliminarLinea` a la importación de `modelo.js` al inicio del archivo (la lista que ya tiene `agregarLinea, moverLinea, indiceCorte`).

En `tests/copias.test.js`, dentro de la prueba `validarEstructura detecta lo que una copia editada a mano puede traer, sin lanzar`, antes de la línea `assert.deepEqual(validarEstructura(base()), [], 'un proyecto sano no tiene problemas');`:

```js
  p = base(); p.juego.sinopsis = 7;
  assert.ok(validarEstructura(p).some((m) => /la sinopsis no es texto/.test(m)), 'sinopsis');
```

(Si en esa prueba `p` no se declara con `let`, cambiar la declaración a `let p = base();` en su primera aparición.)

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/modelo.test.js tests/copias.test.js`
Expected: 2 fallan (`eliminarLinea is not a function` o `undefined !== ''`, y la sinopsis).

- [ ] **Step 3: Cambiar `modelo.js`**

En `crearProyecto`, el objeto `juego` pasa a ser:

```js
    juego: { titulo, sinopsis: '', destino, escenaInicial: escena.id, escenas: [escena], personajes: [], elementos: [] },
```

Después de `moverLinea`:

```js
export function eliminarLinea(escena, indice) {
  if (indice < 0 || indice >= escena.lineas.length) return;
  escena.lineas.splice(indice, 1);
}
```

- [ ] **Step 4: Cambiar `copias.js`**

En `validarEstructura`, después de la línea que comprueba el título:

```js
  if (typeof juego.sinopsis !== 'string') problemas.push('la sinopsis no es texto');
```

- [ ] **Step 5: Anotar el spec**

En la sección 6, en el esquema orientativo, después de `"titulo": "La llave del faro",` agregar `"sinopsis": "Una farera descubre quién abrió la puerta.",`. Al final de la sección 8 (antes de `## 9.`) agregar el párrafo:

```markdown
**Avance natural.** Una escena sin decisión ni fin sigue con la siguiente escena de la lista; la última termina y muestra los créditos (regla de corte, sección 6). Una escena sin líneas se salta. El editor avisa (I05) de las líneas que quedan después de una decisión o un fin, porque nunca se verán. Una opción cuyo destino no existe termina el juego con los créditos: jugar no se bloquea, pero publicar sí (B02).
```

- [ ] **Step 6: Correr toda la suite y commit**

Run: `npm test`
Expected: 133 pruebas, `# fail 0` (la prueba nueva de modelo; la de copias es una aserción más dentro de una prueba que ya existía).

```bash
git add plataforma/js/estado/modelo.js plataforma/js/estado/copias.js tests/modelo.test.js tests/copias.test.js docs/superpowers/specs/2026-11-04-plataforma-primer-videojuego-design.md
git commit -m "Modelo: sinopsis del juego y eliminarLinea; spec con el avance natural" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: jsdom, ayudas de DOM y utilidades de interfaz

**Files:**
- Modify: `package.json`
- Create: `tests/ayudas/dom.js`
- Create: `plataforma/js/ui/dom.js`
- Create: `tests/dom.test.js`

- [ ] **Step 1: Instalar jsdom**

Run: `npm install --save-dev jsdom@^29`
Expected: `package.json` queda con `"jsdom": "^29.1.1"` en `devDependencies` (la 30 y la 31 exigen Node 24.15 y la máquina tiene 24.12).

- [ ] **Step 2: Escribir `tests/ayudas/dom.js`**

```js
// tests/ayudas/dom.js
// Ventana jsdom para probar las vistas sin navegador. Copia a globalThis lo que
// las vistas usan. Cada archivo de pruebas corre en su propio proceso.
import { JSDOM } from 'jsdom';

const GLOBALES = [
  'window', 'document', 'Node', 'HTMLElement', 'HTMLInputElement', 'HTMLSelectElement',
  'HTMLTextAreaElement', 'HTMLButtonElement', 'Event', 'KeyboardEvent', 'MouseEvent',
  'CustomEvent', 'FocusEvent', 'DragEvent', 'DataTransfer', 'getComputedStyle',
  'requestAnimationFrame', 'cancelAnimationFrame', 'HTMLMediaElement', 'Audio',
];

export function instalarDom(html = '<!DOCTYPE html><html lang="es"><head><title>prueba</title></head><body></body></html>') {
  const dom = new JSDOM(html, { pretendToBeVisual: true, url: 'http://localhost/' });
  for (const clave of GLOBALES) {
    if (clave in dom.window) globalThis[clave] = dom.window[clave];
  }
  return dom;
}

export function clic(nodo) {
  nodo.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
}

export function teclear(nodo, key) {
  return nodo.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

export function escribir(control, valor) {
  control.value = valor;
  control.dispatchEvent(new window.Event('input', { bubbles: true }));
  control.dispatchEvent(new window.Event('change', { bubbles: true }));
}

export function textos(raiz, selector) {
  return [...raiz.querySelectorAll(selector)].map((n) => n.textContent.trim());
}
```

- [ ] **Step 3: Escribir las pruebas que fallan de `dom.js`**

```js
// tests/dom.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instalarDom, clic } from './ayudas/dom.js';
import { h, vaciar, conservarFoco, anunciar, descargar } from '../plataforma/js/ui/dom.js';

instalarDom();

test('h crea nodos con atributos, propiedades, eventos e hijos anidados', () => {
  let clics = 0;
  const nodo = h('button', { type: 'button', class: 'btn', disabled: true, dataset: { id: 'x' }, 'aria-label': 'Probar', onclick: () => { clics += 1; } },
    'Hola ', h('b', {}, 'mundo'), null, false, [' ', ['!']], 3);
  assert.equal(nodo.outerHTML, '<button type="button" class="btn" data-id="x" aria-label="Probar" disabled="">Hola <b>mundo</b> !3</button>');
  nodo.disabled = false;
  clic(nodo);
  assert.equal(clics, 1);
});

test('h fija value de un select después de sus opciones', () => {
  const select = h('select', { value: 'b' }, h('option', { value: 'a' }, 'A'), h('option', { value: 'b' }, 'B'));
  assert.equal(select.value, 'b');
});

test('vaciar quita todos los hijos y devuelve el nodo', () => {
  const nodo = h('div', {}, h('p'), 'texto');
  assert.equal(vaciar(nodo), nodo);
  assert.equal(nodo.childNodes.length, 0);
});

test('conservarFoco devuelve el foco al nodo con el mismo data-foco tras redibujar', () => {
  const contenedor = h('div', {}, h('button', { type: 'button', dataset: { foco: 'uno' } }, 'Uno'));
  document.body.append(contenedor);
  contenedor.querySelector('button').focus();
  conservarFoco(contenedor, () => {
    vaciar(contenedor).append(h('button', { type: 'button', dataset: { foco: 'cero' } }, 'Cero'), h('button', { type: 'button', dataset: { foco: 'uno' } }, 'Uno bis'));
  });
  assert.equal(document.activeElement.textContent, 'Uno bis');
  contenedor.remove();
});

test('anunciar escribe en una zona aria-live única', () => {
  anunciar('Guardado');
  anunciar('Listo');
  const zonas = document.querySelectorAll('#anuncios');
  assert.equal(zonas.length, 1);
  assert.equal(zonas[0].getAttribute('aria-live'), 'polite');
  assert.equal(zonas[0].textContent, 'Listo');
});

test('descargar crea un enlace con el nombre, lo pulsa y libera la URL', () => {
  const llamadas = [];
  const blob = new Blob(['hola'], { type: 'text/plain' });
  descargar(blob, 'copia.zip', {
    crearUrl: (b) => { llamadas.push(['crear', b.type]); return 'blob:x'; },
    liberarUrl: (url) => llamadas.push(['liberar', url]),
    pulsar: (enlace) => llamadas.push(['pulsar', enlace.download, enlace.href]),
  });
  assert.deepEqual(llamadas, [['crear', 'text/plain'], ['pulsar', 'copia.zip', 'blob:x'], ['liberar', 'blob:x']]);
  assert.equal(document.querySelector('a[download]'), null, 'el enlace no queda en el documento');
});
```

- [ ] **Step 4: Correr las pruebas para ver que fallan**

Run: `node --test tests/dom.test.js`
Expected: falla al importar (`Cannot find module .../ui/dom.js`).

- [ ] **Step 5: Escribir `plataforma/js/ui/dom.js`**

```js
// plataforma/js/ui/dom.js
// Utilidades mínimas de interfaz. h() crea un nodo con atributos, propiedades,
// manejadores (on<evento>) e hijos; lo demás son ayudas que las vistas comparten.

const PROPIEDADES = new Set(['value', 'checked', 'disabled', 'hidden', 'selected', 'draggable', 'tabIndex', 'indeterminate']);

export function h(etiqueta, atributos = {}, ...hijos) {
  const nodo = document.createElement(etiqueta);
  const despues = [];
  for (const [clave, valor] of Object.entries(atributos ?? {})) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (clave === 'class') nodo.className = valor;
    else if (clave === 'dataset') Object.assign(nodo.dataset, valor);
    else if (clave.startsWith('on') && typeof valor === 'function') nodo.addEventListener(clave.slice(2), valor);
    else if (PROPIEDADES.has(clave)) despues.push([clave, valor]);
    else nodo.setAttribute(clave, valor === true ? '' : String(valor));
  }
  agregar(nodo, hijos);
  for (const [clave, valor] of despues) nodo[clave] = valor;
  return nodo;
}

function agregar(nodo, hijos) {
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    nodo.append(typeof hijo === 'object' ? hijo : document.createTextNode(String(hijo)));
  }
}

export function vaciar(nodo) {
  while (nodo.firstChild) nodo.removeChild(nodo.firstChild);
  return nodo;
}

/** Redibuja con fn() y devuelve el foco al nodo que tenga el mismo data-foco que el que lo tenía. */
export function conservarFoco(contenedor, fn) {
  const activo = document.activeElement;
  const clave = contenedor.contains(activo) ? activo.dataset?.foco : undefined;
  fn();
  if (clave === undefined) return;
  const candidato = [...contenedor.querySelectorAll('[data-foco]')].find((n) => n.dataset.foco === clave);
  candidato?.focus();
}

/** Mensaje para lectores de pantalla. Una sola zona aria-live en el documento. */
export function anunciar(texto) {
  let zona = document.getElementById('anuncios');
  if (!zona) {
    zona = h('div', { id: 'anuncios', class: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' });
    document.body.append(zona);
  }
  zona.textContent = texto;
}

/** Descarga un Blob con el nombre dado. Las funciones del navegador se reciben para poder probar. */
export function descargar(blob, nombre, {
  crearUrl = (b) => URL.createObjectURL(b),
  liberarUrl = (url) => URL.revokeObjectURL(url),
  pulsar = (enlace) => enlace.click(),
} = {}) {
  const url = crearUrl(blob);
  const enlace = h('a', { href: url, download: nombre, hidden: true });
  document.body.append(enlace);
  try {
    pulsar(enlace);
  } finally {
    enlace.remove();
    liberarUrl(url);
  }
}
```

- [ ] **Step 6: Correr las pruebas para ver que pasan**

Run: `node --test tests/dom.test.js`
Expected: `# pass 6`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tests/ayudas/dom.js tests/dom.test.js plataforma/js/ui/dom.js
git commit -m "Pruebas con jsdom y utilidades de interfaz (h, vaciar, conservarFoco, anunciar, descargar)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Partida: el estado puro del reproductor

**Files:**
- Create: `plataforma/js/motor/partida.js`
- Create: `tests/partida.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/partida.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearProyecto, agregarEscena, agregarPersonaje, agregarElemento, agregarLinea } from '../plataforma/js/estado/modelo.js';
import { crearPartida, vistaActual, vistaDeLinea, avanzar, elegir, reiniciar } from '../plataforma/js/motor/partida.js';

// Muelle: narración, diálogo (Ana, efecto, voz), decisión → Torre | Amanecer, narración oculta tras el corte.
// Torre: fin. Amanecer: narración sin corte (sigue con Vacía). Vacía: sin líneas (se salta). Final: narración, última de la lista.
function juegoDePrueba() {
  const p = crearProyecto({ estudiante: 'Camila R.', titulo: 'La llave del faro', destino: 'gratis' });
  const muelle = p.juego.escenas[0];
  muelle.nombre = 'El muelle';
  const torre = agregarEscena(p, 'La torre');
  const amanecer = agregarEscena(p, 'Amanecer');
  const vacia = agregarEscena(p, 'Vacía');
  const final = agregarEscena(p, 'Final');
  const ana = agregarPersonaje(p, { nombre: 'Ana' });
  const retrato = agregarElemento(p, { tipo: 'retrato', nombre: 'Ana', archivo: 'ana.png', origen: 'creado' });
  ana.retrato = retrato.id;
  const fondo = agregarElemento(p, { tipo: 'fondo', nombre: 'Muelle', archivo: 'muelle.png', origen: 'creado' });
  const musica = agregarElemento(p, { tipo: 'musica', nombre: 'Tema', archivo: 'tema.ogg', origen: 'subido' });
  const olas = agregarElemento(p, { tipo: 'efecto', nombre: 'Olas', archivo: 'olas.wav', origen: 'subido' });
  const voz = agregarElemento(p, { tipo: 'voz', nombre: 'Voz de Ana', archivo: 'ana.webm', origen: 'creado' });
  muelle.fondo = fondo.id;
  muelle.musica = musica.id;
  agregarLinea(muelle, 'narracion', { texto: 'La niebla cubre el muelle.' });
  agregarLinea(muelle, 'dialogo', { personaje: ana.id, texto: '¿Quién dejó la puerta abierta?', efecto: olas.id, voz: voz.id });
  agregarLinea(muelle, 'decision', { texto: '¿Subes a la torre?', opciones: [{ texto: 'Sí', escena: torre.id }, { texto: '', escena: amanecer.id }] });
  agregarLinea(muelle, 'narracion', { texto: 'Nunca se ve.' });
  agregarLinea(torre, 'fin', { texto: 'Fin en la torre.' });
  agregarLinea(amanecer, 'narracion', { texto: 'Amanece.' });
  agregarLinea(final, 'narracion', { texto: 'Última escena de la lista.' });
  return { p, juego: p.juego, muelle, torre, amanecer, vacia, final, ana, retrato, fondo, musica, olas, voz };
}

test('la partida empieza en la primera línea de la escena inicial con su fondo y su música', () => {
  const { juego, muelle, fondo, musica } = juegoDePrueba();
  const partida = crearPartida(juego);
  const vista = vistaActual(partida);
  assert.equal(vista.tipo, 'linea');
  assert.equal(vista.escena, muelle);
  assert.equal(vista.indice, 0);
  assert.equal(vista.texto, 'La niebla cubre el muelle.');
  assert.equal(vista.personaje, null);
  assert.equal(vista.retrato, null);
  assert.equal(vista.fondo, fondo.id);
  assert.equal(vista.musica, musica.id);
  assert.equal(vista.efecto, null);
  assert.equal(vista.voz, null);
});

test('un diálogo resuelve el personaje, su retrato, el efecto y la voz', () => {
  const { juego, ana, retrato, olas, voz } = juegoDePrueba();
  const partida = avanzar(crearPartida(juego));
  const vista = vistaActual(partida);
  assert.equal(vista.tipo, 'linea');
  assert.equal(vista.personaje, ana);
  assert.equal(vista.retrato, retrato.id);
  assert.equal(vista.efecto, olas.id);
  assert.equal(vista.voz, voz.id);
  assert.equal(vista.texto, '¿Quién dejó la puerta abierta?');
});

test('una decisión detiene el avance; elegir lleva a la escena de la opción y lo que sigue al corte nunca se ve', () => {
  const { juego, torre } = juegoDePrueba();
  const partida = crearPartida(juego);
  avanzar(partida);
  avanzar(partida);
  const decision = vistaActual(partida);
  assert.equal(decision.tipo, 'decision');
  assert.deepEqual(decision.opciones.map((o) => o.texto), ['Sí', '']);
  avanzar(partida);
  assert.equal(vistaActual(partida).tipo, 'decision', 'avanzar no mueve una decisión');
  elegir(partida, 5);
  assert.equal(vistaActual(partida).tipo, 'decision', 'una opción inexistente se ignora');
  elegir(partida, 0);
  const vista = vistaActual(partida);
  assert.equal(vista.tipo, 'fin');
  assert.equal(vista.escena, torre);
  assert.equal(vista.texto, 'Fin en la torre.');
});

test('fin pasa a los créditos y los créditos no avanzan más', () => {
  const { juego } = juegoDePrueba();
  const partida = crearPartida(juego);
  avanzar(partida); avanzar(partida); elegir(partida, 0);
  avanzar(partida);
  assert.deepEqual(vistaActual(partida), { tipo: 'creditos' });
  avanzar(partida);
  elegir(partida, 0);
  assert.deepEqual(vistaActual(partida), { tipo: 'creditos' });
});

test('una escena sin corte sigue con la siguiente de la lista, salta las vacías y la última termina en créditos', () => {
  const { juego, amanecer, final } = juegoDePrueba();
  const partida = crearPartida(juego);
  avanzar(partida); avanzar(partida); elegir(partida, 1);
  assert.equal(vistaActual(partida).escena, amanecer);
  avanzar(partida);
  assert.equal(vistaActual(partida).escena, final, 'la escena vacía se salta');
  assert.equal(vistaActual(partida).texto, 'Última escena de la lista.');
  avanzar(partida);
  assert.equal(vistaActual(partida).tipo, 'creditos');
});

test('una opción con destino inexistente termina el juego con los créditos', () => {
  const { juego, muelle } = juegoDePrueba();
  muelle.lineas[2].opciones[0].escena = 'esc_fantasma';
  const partida = crearPartida(juego);
  avanzar(partida); avanzar(partida); elegir(partida, 0);
  assert.equal(vistaActual(partida).tipo, 'creditos');
});

test('sin escena inicial válida la partida va directo a los créditos; reiniciar vuelve al inicio elegido', () => {
  const { juego, torre } = juegoDePrueba();
  const rota = crearPartida({ ...juego, escenaInicial: null });
  assert.equal(vistaActual(rota).tipo, 'creditos');
  const desdeTorre = crearPartida(juego, { escenaInicial: torre.id });
  assert.equal(vistaActual(desdeTorre).tipo, 'fin');
  avanzar(desdeTorre);
  assert.equal(vistaActual(desdeTorre).tipo, 'creditos');
  reiniciar(desdeTorre);
  assert.equal(vistaActual(desdeTorre).escena, torre, 'reiniciar respeta la escena inicial pedida');
  const normal = crearPartida(juego);
  avanzar(normal); avanzar(normal); elegir(normal, 0);
  reiniciar(normal);
  assert.equal(vistaActual(normal).indice, 0);
  assert.equal(vistaActual(normal).escena.nombre, 'El muelle');
});

test('vistaDeLinea sirve para la vista previa: línea concreta o escena vacía', () => {
  const { juego, muelle, vacia, fondo } = juegoDePrueba();
  const decision = vistaDeLinea(juego, muelle, 2);
  assert.equal(decision.tipo, 'decision');
  assert.equal(decision.fondo, fondo.id);
  assert.equal(vistaDeLinea(juego, muelle, 1).personaje.nombre, 'Ana');
  const sinLineas = vistaDeLinea(juego, vacia, 0);
  assert.equal(sinLineas.tipo, 'vacia');
  assert.equal(sinLineas.escena, vacia);
  assert.equal(vistaDeLinea(juego, muelle, 99).tipo, 'vacia', 'un índice fuera de rango también es vacía');
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/partida.test.js`
Expected: falla al importar `partida.js`.

- [ ] **Step 3: Escribir `plataforma/js/motor/partida.js`**

```js
// plataforma/js/motor/partida.js
// Estado puro de una partida: en qué escena y en qué línea va el jugador, sin DOM
// ni audio. Comparte la regla de corte con la validación (indiceCorte): una escena
// termina en su primera decisión o fin; sin ninguna de las dos, sigue la siguiente
// escena de la lista; sin siguiente, créditos. Una escena sin líneas se salta.
import { indiceCorte } from '../estado/modelo.js';

const escenaPorId = (juego, id) => juego.escenas.find((e) => e.id === id) ?? null;

function siguienteEscena(juego, id) {
  const i = juego.escenas.findIndex((e) => e.id === id);
  return i === -1 ? null : (juego.escenas[i + 1]?.id ?? null);
}

function terminar(partida) {
  partida.escenaId = null;
  partida.indice = 0;
  partida.creditos = true;
}

/** Entra a la primera línea de la escena; si no existe o está vacía, sigue la lista; sin más escenas, créditos. */
function irAEscena(partida, id) {
  let actual = id;
  while (actual !== null) {
    const escena = escenaPorId(partida.juego, actual);
    if (!escena) break;
    if (escena.lineas.length > 0) {
      partida.escenaId = actual;
      partida.indice = 0;
      partida.creditos = false;
      return;
    }
    actual = siguienteEscena(partida.juego, actual);
  }
  terminar(partida);
}

export function crearPartida(juego, { escenaInicial = juego.escenaInicial } = {}) {
  const partida = { juego, inicial: escenaInicial, escenaId: null, indice: 0, creditos: false };
  irAEscena(partida, escenaInicial);
  return partida;
}

export function escenaActual(partida) {
  return partida.escenaId === null ? null : escenaPorId(partida.juego, partida.escenaId);
}

/**
 * Vista de una línea concreta de una escena. También la usa la vista previa del editor.
 * Tipos: 'linea' (narración o diálogo), 'decision', 'fin', 'vacia' (sin línea en ese índice).
 */
export function vistaDeLinea(juego, escena, indice) {
  const linea = escena.lineas[indice] ?? null;
  const base = { escena, indice, linea, fondo: escena.fondo ?? null, musica: escena.musica ?? null, personaje: null, retrato: null, efecto: null, voz: null };
  if (!linea) return { ...base, tipo: 'vacia', texto: '' };
  if (linea.tipo === 'dialogo') {
    const personaje = juego.personajes.find((p) => p.id === linea.personaje) ?? null;
    return { ...base, tipo: 'linea', texto: linea.texto, personaje, retrato: personaje?.retrato ?? null, efecto: linea.efecto ?? null, voz: linea.voz ?? null };
  }
  if (linea.tipo === 'decision') {
    return { ...base, tipo: 'decision', texto: linea.texto, opciones: linea.opciones.map((o) => ({ texto: o.texto, escena: o.escena })) };
  }
  return { ...base, tipo: linea.tipo === 'fin' ? 'fin' : 'linea', texto: linea.texto };
}

export function vistaActual(partida) {
  if (partida.creditos) return { tipo: 'creditos' };
  return vistaDeLinea(partida.juego, escenaActual(partida), partida.indice);
}

export function avanzar(partida) {
  if (partida.creditos) return partida;
  const escena = escenaActual(partida);
  const linea = escena.lineas[partida.indice];
  if (linea.tipo === 'decision') return partida;
  if (linea.tipo === 'fin') {
    terminar(partida);
    return partida;
  }
  const corte = indiceCorte(escena);
  const siguiente = partida.indice + 1;
  if (siguiente < escena.lineas.length && (corte === -1 || siguiente <= corte)) {
    partida.indice = siguiente;
    return partida;
  }
  irAEscena(partida, siguienteEscena(partida.juego, escena.id));
  return partida;
}

export function elegir(partida, numero) {
  const vista = vistaActual(partida);
  if (vista.tipo !== 'decision') return partida;
  const opcion = vista.opciones[numero];
  if (!opcion) return partida;
  if (!escenaPorId(partida.juego, opcion.escena)) {
    terminar(partida);
    return partida;
  }
  irAEscena(partida, opcion.escena);
  return partida;
}

export function reiniciar(partida) {
  irAEscena(partida, partida.inicial);
  return partida;
}
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/partida.test.js`
Expected: `# pass 8`.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/motor/partida.js tests/partida.test.js
git commit -m "Motor: estado puro de la partida con avance natural, decisiones, fin y créditos" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Pantalla: dibujar una vista del juego

**Files:**
- Create: `plataforma/js/motor/pantalla.js`
- Create: `tests/pantalla.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/pantalla.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instalarDom, clic, textos } from './ayudas/dom.js';
import { crearProyecto, agregarEscena, agregarPersonaje, agregarElemento, agregarLinea } from '../plataforma/js/estado/modelo.js';
import { vistaDeLinea } from '../plataforma/js/motor/partida.js';
import { crearPantalla } from '../plataforma/js/motor/pantalla.js';

instalarDom();

function armar() {
  const p = crearProyecto({ titulo: 'Faro', destino: 'gratis' });
  const muelle = p.juego.escenas[0];
  const vacia = agregarEscena(p, 'Vacía');
  const ana = agregarPersonaje(p, { nombre: 'Ana' });
  const retrato = agregarElemento(p, { tipo: 'retrato', nombre: 'Ana', archivo: 'ana.png', origen: 'subido' });
  const fondo = agregarElemento(p, { tipo: 'fondo', nombre: 'Muelle', archivo: 'muelle.png', origen: 'creado' });
  ana.retrato = retrato.id;
  muelle.fondo = fondo.id;
  agregarLinea(muelle, 'narracion', { texto: 'Niebla.' });
  agregarLinea(muelle, 'dialogo', { personaje: ana.id, texto: '¿Quién?' });
  agregarLinea(muelle, 'decision', { texto: '¿Subes?', opciones: [{ texto: 'Sí', escena: vacia.id }, { texto: '  ', escena: null }] });
  agregarLinea(vacia, 'fin', { texto: 'Se acabó.' });
  const urls = new Map([[retrato.id, 'blob:retrato'], [fondo.id, 'blob:fondo']]);
  const contenedor = document.createElement('div');
  const pantalla = crearPantalla(contenedor, { juego: p.juego, resolverRecurso: (id) => urls.get(id) ?? null });
  return { p, muelle, vacia, contenedor, pantalla, urls, retrato, fondo };
}

test('un diálogo muestra fondo, retrato, nombre y texto; el fondo creado dentro se marca como pixel', () => {
  const { p, muelle, contenedor, pantalla } = armar();
  pantalla.mostrar(vistaDeLinea(p.juego, muelle, 1));
  const fondo = contenedor.querySelector('.escenario-fondo img');
  assert.equal(fondo.getAttribute('src'), 'blob:fondo');
  assert.ok(fondo.classList.contains('pixel'));
  const retrato = contenedor.querySelector('.escenario-retrato img');
  assert.equal(retrato.getAttribute('src'), 'blob:retrato');
  assert.ok(!retrato.classList.contains('pixel'), 'un retrato subido no se pixela');
  const nombre = contenedor.querySelector('.escenario-nombre');
  assert.equal(nombre.hidden, false);
  assert.equal(nombre.textContent, 'Ana');
  assert.equal(contenedor.querySelector('.escenario-texto').textContent, '¿Quién?');
});

test('una narración no muestra nombre ni retrato', () => {
  const { p, muelle, contenedor, pantalla } = armar();
  pantalla.mostrar(vistaDeLinea(p.juego, muelle, 0));
  assert.equal(contenedor.querySelector('.escenario-nombre').hidden, true);
  assert.equal(contenedor.querySelector('.escenario-retrato img'), null);
  assert.equal(contenedor.querySelector('.escenario-texto').textContent, 'Niebla.');
});

test('una decisión dibuja un botón por opción con su número y avisa cuál se eligió', () => {
  const { p, muelle, contenedor, pantalla } = armar();
  const elegidas = [];
  pantalla.mostrar(vistaDeLinea(p.juego, muelle, 2), { alElegir: (i) => elegidas.push(i) });
  const botones = contenedor.querySelectorAll('.escenario-opciones button');
  assert.equal(botones.length, 2);
  assert.deepEqual(textos(contenedor, '.escenario-opciones kbd'), ['1', '2']);
  assert.equal(botones[1].textContent.trim(), '2 Opción 2', 'una opción sin texto muestra su número');
  clic(botones[1]);
  clic(botones[0]);
  assert.deepEqual(elegidas, [1, 0]);
});

test('sin URL para el recurso no se dibuja la imagen; sin alElegir los botones no fallan', () => {
  const { p, muelle, contenedor } = armar();
  const pantalla = crearPantalla(contenedor, { juego: p.juego, resolverRecurso: () => null });
  pantalla.mostrar(vistaDeLinea(p.juego, muelle, 1));
  assert.equal(contenedor.querySelector('img'), null);
  pantalla.mostrar(vistaDeLinea(p.juego, muelle, 2));
  clic(contenedor.querySelector('.escenario-opciones button'));
});

test('los créditos muestran el título y una línea por entrada; volver a mostrar una vista los oculta', () => {
  const { p, vacia, contenedor, pantalla } = armar();
  pantalla.mostrarCreditos('Faro', ['Camila R.: autora del juego', 'Tema: CC BY']);
  const creditos = contenedor.querySelector('.escenario-creditos');
  assert.equal(creditos.hidden, false);
  assert.equal(creditos.querySelector('.creditos-titulo').textContent, 'Faro');
  assert.deepEqual(textos(creditos, 'li'), ['Camila R.: autora del juego', 'Tema: CC BY']);
  assert.ok(contenedor.querySelector('.escenario').classList.contains('en-creditos'));
  pantalla.mostrar(vistaDeLinea(p.juego, vacia, 0));
  assert.equal(creditos.hidden, true);
  assert.ok(!contenedor.querySelector('.escenario').classList.contains('en-creditos'));
  assert.ok(contenedor.querySelector('.escenario').classList.contains('es-fin'));
  assert.equal(contenedor.querySelector('.escenario-texto').textContent, 'Se acabó.');
});

test('una vista vacía explica que la escena no tiene líneas', () => {
  const { p, contenedor, pantalla } = armar();
  const sinLineas = { ...p.juego.escenas[0], lineas: [] };
  pantalla.mostrar(vistaDeLinea(p.juego, sinLineas, 0));
  assert.equal(contenedor.querySelector('.escenario-texto').textContent, 'Esta escena no tiene líneas todavía.');
  assert.ok(contenedor.querySelector('.escenario').classList.contains('vacia'));
  assert.equal(contenedor.querySelector('.escenario-fondo img').getAttribute('src'), 'blob:fondo', 'el fondo de la escena sí se ve');
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/pantalla.test.js`
Expected: falla al importar `pantalla.js`.

- [ ] **Step 3: Escribir `plataforma/js/motor/pantalla.js`**

```js
// plataforma/js/motor/pantalla.js
// Dibuja una vista del juego (fondo, retrato, nombre, texto, opciones, créditos) en
// un contenedor. No maneja entrada ni audio: eso lo hace reproductor.js. La vista
// previa del editor usa esta misma pantalla, así lo que se prueba es lo que se ve.
import { h, vaciar } from '../ui/dom.js';

/**
 * @param {HTMLElement} contenedor
 * @param {{ juego: object, resolverRecurso: (id: string) => string|null }} opciones
 */
export function crearPantalla(contenedor, { juego, resolverRecurso }) {
  const fondo = h('div', { class: 'escenario-fondo', 'aria-hidden': 'true' });
  const retrato = h('div', { class: 'escenario-retrato', 'aria-hidden': 'true' });
  const nombre = h('div', { class: 'escenario-nombre', hidden: true });
  const texto = h('div', { class: 'escenario-texto' });
  const opciones = h('div', { class: 'escenario-opciones', role: 'group', 'aria-label': 'Opciones' });
  const creditos = h('div', { class: 'escenario-creditos', hidden: true });
  const caja = h('div', { class: 'escenario-caja' }, nombre, texto, opciones, creditos);
  const escenario = h('div', { class: 'escenario' }, fondo, retrato, caja);
  vaciar(contenedor).append(escenario);

  // Las imágenes hechas con la herramienta de pixel art se escalan sin suavizado.
  const esPixel = (id) => juego.elementos.find((e) => e.id === id)?.origen === 'creado';

  function imagen(id, clase) {
    const url = id ? resolverRecurso(id) : null;
    if (!url) return null;
    return h('img', { src: url, alt: '', class: esPixel(id) ? `${clase} pixel` : clase });
  }

  function limpiar() {
    vaciar(fondo);
    vaciar(retrato);
    vaciar(opciones);
    vaciar(creditos);
    creditos.hidden = true;
    nombre.hidden = true;
    nombre.textContent = '';
    texto.textContent = '';
    escenario.classList.remove('en-creditos', 'es-fin', 'vacia');
  }

  /** @param {object} vista de partida.vistaDeLinea / vistaActual (no 'creditos') */
  function mostrar(vista, { alElegir } = {}) {
    limpiar();
    const imgFondo = imagen(vista.fondo, 'fondo');
    if (imgFondo) fondo.append(imgFondo);
    if (vista.tipo === 'vacia') {
      escenario.classList.add('vacia');
      texto.textContent = 'Esta escena no tiene líneas todavía.';
      return;
    }
    const imgRetrato = imagen(vista.retrato, 'retrato');
    if (imgRetrato) retrato.append(imgRetrato);
    if (vista.personaje) {
      nombre.hidden = false;
      nombre.textContent = vista.personaje.nombre?.trim() || 'Sin nombre';
    }
    texto.textContent = vista.texto ?? '';
    if (vista.tipo === 'decision') {
      vista.opciones.forEach((opcion, i) => {
        opciones.append(h('button', { type: 'button', class: 'opcion', dataset: { opcion: String(i) }, onclick: () => alElegir?.(i) },
          h('kbd', {}, String(i + 1)), ' ', opcion.texto?.trim() || `Opción ${i + 1}`));
      });
    }
    if (vista.tipo === 'fin') escenario.classList.add('es-fin');
  }

  function mostrarCreditos(titulo, lineas) {
    limpiar();
    escenario.classList.add('en-creditos');
    creditos.hidden = false;
    creditos.append(
      h('p', { class: 'creditos-titulo' }, titulo?.trim() || 'Sin título'),
      h('p', { class: 'creditos-encabezado' }, 'Créditos'),
      h('ul', {}, lineas.map((linea) => h('li', {}, linea))),
    );
  }

  return { escenario, mostrar, mostrarCreditos, destruir: () => vaciar(contenedor) };
}
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/pantalla.test.js`
Expected: `# pass 6`.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/motor/pantalla.js tests/pantalla.test.js
git commit -m "Motor: pantalla que dibuja fondo, retrato, texto, opciones y créditos" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Reproductor: entrada, audio y botones

**Files:**
- Create: `plataforma/js/motor/reproductor.js`
- Create: `tests/reproductor.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/reproductor.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instalarDom, clic, teclear, textos } from './ayudas/dom.js';
import { crearProyecto, agregarEscena, agregarPersonaje, agregarElemento, agregarLinea } from '../plataforma/js/estado/modelo.js';
import { jugar } from '../plataforma/js/motor/reproductor.js';

instalarDom();

// Muelle: narración, diálogo (efecto + voz), decisión → Torre | Playa. Torre: fin. Playa: diálogo con otra voz, narración.
function armar(opciones = {}) {
  const p = crearProyecto({ estudiante: 'Camila R.', titulo: 'La llave del faro', destino: 'gratis' });
  const muelle = p.juego.escenas[0];
  const torre = agregarEscena(p, 'La torre');
  const playa = agregarEscena(p, 'La playa');
  const ana = agregarPersonaje(p, { nombre: 'Ana' });
  const el = (tipo, nombre) => agregarElemento(p, { tipo, nombre, archivo: `${nombre}.bin`, origen: 'subido' });
  const tema = el('musica', 'tema');
  const olas = el('efecto', 'olas');
  const voz1 = el('voz', 'voz1');
  const voz2 = el('voz', 'voz2');
  muelle.musica = tema.id;
  playa.musica = tema.id;
  agregarLinea(muelle, 'narracion', { texto: 'Niebla.' });
  agregarLinea(muelle, 'dialogo', { personaje: ana.id, texto: '¿Quién?', efecto: olas.id, voz: voz1.id });
  agregarLinea(muelle, 'decision', { texto: '¿Subes?', opciones: [{ texto: 'Sí', escena: torre.id }, { texto: 'No', escena: playa.id }] });
  agregarLinea(torre, 'fin', { texto: 'Fin.' });
  agregarLinea(playa, 'dialogo', { personaje: ana.id, texto: 'Arena.', voz: voz2.id });
  agregarLinea(playa, 'narracion', { texto: 'Sin voz.' });
  const registro = [];
  const crearAudio = (url) => ({
    url, loop: false,
    play() { registro.push(['play', url, this.loop]); return Promise.resolve(); },
    pause() { registro.push(['pause', url]); },
  });
  const contenedor = document.createElement('div');
  document.body.append(contenedor);
  const juego = jugar(contenedor, p.juego, (id) => `blob:${p.juego.elementos.find((e) => e.id === id)?.nombre ?? id}`, { crearAudio, creditos: ['Camila R.: autora', 'Tema: alguien'], ...opciones });
  const texto = () => contenedor.querySelector('.escenario-texto').textContent;
  const escena = () => contenedor.querySelector('.reproductor-escena');
  const raiz = () => contenedor.querySelector('.reproductor');
  return { p, contenedor, juego, registro, texto, escena, raiz };
}

test('jugar dibuja la primera línea, pone la música en bucle y deja el foco en el reproductor', () => {
  const { contenedor, registro, texto, raiz } = armar();
  assert.equal(texto(), 'Niebla.');
  assert.equal(contenedor.querySelector('.reproductor-titulo').textContent, 'La llave del faro');
  assert.deepEqual(registro, [['play', 'blob:tema', true]]);
  assert.equal(document.activeElement, raiz());
  assert.equal(contenedor.querySelector('button[data-accion="cerrar"]'), null, 'sin alCerrar no hay botón Cerrar');
  contenedor.remove();
});

test('clic, Espacio y Enter avanzan; el efecto y la voz suenan al llegar; las teclas 1 a 4 eligen', () => {
  const { contenedor, registro, texto, escena, raiz } = armar();
  clic(escena());
  assert.equal(texto(), '¿Quién?');
  assert.deepEqual(registro.slice(1), [['play', 'blob:olas', false], ['play', 'blob:voz1', false]]);
  teclear(raiz(), ' ');
  assert.equal(contenedor.querySelectorAll('.escenario-opciones button').length, 2, 'Espacio llega a la decisión');
  teclear(raiz(), 'Enter');
  assert.equal(contenedor.querySelectorAll('.escenario-opciones button').length, 2, 'en una decisión Enter no avanza');
  clic(escena());
  assert.equal(contenedor.querySelectorAll('.escenario-opciones button').length, 2, 'ni el clic');
  teclear(raiz(), '2');
  assert.equal(texto(), 'Arena.');
  assert.deepEqual(registro.at(-1), ['play', 'blob:voz2', false], 'la voz nueva corta la anterior y suena');
  assert.ok(registro.some((r) => r[0] === 'pause' && r[1] === 'blob:voz1'), 'la voz anterior se pausó');
  assert.equal(registro.filter((r) => r[1] === 'blob:tema').length, 1, 'la misma música no se reinicia al cambiar de escena');
  contenedor.remove();
});

test('la voz sigue sonando al pasar a una línea sin voz', () => {
  const { contenedor, registro, texto, raiz } = armar();
  teclear(raiz(), ' '); teclear(raiz(), ' '); teclear(raiz(), '2');
  const antes = registro.length;
  teclear(raiz(), ' ');
  assert.equal(texto(), 'Sin voz.');
  assert.deepEqual(registro.slice(antes), [], 'ni se pausa la voz ni suena nada nuevo');
  contenedor.remove();
});

test('al terminar se muestran los créditos, se apaga la música y Reiniciar vuelve al inicio', () => {
  const { contenedor, registro, texto, raiz } = armar();
  teclear(raiz(), ' '); teclear(raiz(), ' '); teclear(raiz(), '1');
  assert.equal(texto(), 'Fin.');
  teclear(raiz(), 'Enter');
  assert.deepEqual(textos(contenedor, '.escenario-creditos li'), ['Camila R.: autora', 'Tema: alguien']);
  assert.equal(registro.filter((r) => r[0] === 'pause' && r[1] === 'blob:tema').length, 1, 'la música se apagó al entrar a la torre, que no tiene música');
  assert.deepEqual(registro.at(-1), ['pause', 'blob:voz1'], 'la voz que seguía sonando se corta en los créditos');
  assert.equal(contenedor.querySelector('button[data-accion="creditos"]').hidden, true);
  assert.equal(contenedor.querySelector('button[data-accion="volver"]').hidden, true, 'terminado el juego no hay a dónde volver');
  clic(contenedor.querySelector('button[data-accion="reiniciar"]'));
  assert.equal(texto(), 'Niebla.');
  assert.deepEqual(registro.at(-1), ['play', 'blob:tema', true]);
  contenedor.remove();
});

test('el botón Créditos abre los créditos en cualquier momento y Volver regresa a la misma línea sin repetir el efecto', () => {
  const { contenedor, registro, texto, raiz } = armar();
  teclear(raiz(), ' ');
  const antes = registro.length;
  clic(contenedor.querySelector('button[data-accion="creditos"]'));
  assert.ok(contenedor.querySelector('.escenario').classList.contains('en-creditos'));
  assert.equal(contenedor.querySelector('button[data-accion="volver"]').hidden, false);
  teclear(raiz(), ' ');
  assert.ok(contenedor.querySelector('.escenario').classList.contains('en-creditos'), 'en los créditos Espacio no hace nada');
  clic(contenedor.querySelector('button[data-accion="volver"]'));
  assert.equal(texto(), '¿Quién?');
  const despues = registro.slice(antes).filter((r) => r[0] === 'play').map((r) => r[1]);
  assert.deepEqual(despues, ['blob:tema'], 'vuelve la música; el efecto y la voz no se repiten');
  contenedor.remove();
});

test('con alCerrar hay botón Cerrar y Escape; cerrar detiene el audio y vacía el contenedor; los botones no avanzan', () => {
  let cerrado = 0;
  const { contenedor, registro, texto, raiz } = armar({ alCerrar: () => { cerrado += 1; } });
  clic(contenedor.querySelector('button[data-accion="creditos"]'));
  clic(contenedor.querySelector('button[data-accion="volver"]'));
  assert.equal(texto(), 'Niebla.', 'pulsar botones de la barra no avanza la partida');
  teclear(raiz(), 'Escape');
  assert.equal(cerrado, 1);
  assert.equal(contenedor.childNodes.length, 0);
  assert.deepEqual(registro.at(-1), ['pause', 'blob:tema']);
  contenedor.remove();
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/reproductor.test.js`
Expected: falla al importar `reproductor.js`.

- [ ] **Step 3: Escribir `plataforma/js/motor/reproductor.js`**

```js
// plataforma/js/motor/reproductor.js
// El reproductor: une la partida (estado), la pantalla (dibujo), la entrada (clic,
// toque, teclado) y el audio. Es el mismo código que usa la vista previa del editor
// (a través de pantalla.js) y el que irá dentro de juego.html (plan 6).
//
// jugar(contenedor, juego, resolverRecurso, opciones) → { cerrar, partida, raiz }
//   resolverRecurso(id) → URL del archivo del elemento, o null.
//   opciones: escenaInicial, creditos (lista de textos), titulo, alCerrar, crearAudio.
import { crearPartida, vistaActual, avanzar, elegir, reiniciar } from './partida.js';
import { crearPantalla } from './pantalla.js';
import { h, vaciar } from '../ui/dom.js';

/** Música en bucle (una), efectos sueltos y una voz a la vez. crearAudio(url) devuelve algo con play(), pause() y loop. */
function crearMezclador(crearAudio, resolverRecurso) {
  let musica = { id: null, nodo: null };
  let voz = null;

  function crear(id, bucle) {
    const url = resolverRecurso(id);
    if (!url) return null;
    const nodo = crearAudio(url);
    nodo.loop = bucle;
    return nodo;
  }
  function reproducir(nodo) {
    const promesa = nodo.play();
    // Los navegadores rechazan play() sin gesto del usuario; aquí siempre hay uno, pero no debe reventar.
    if (promesa && typeof promesa.catch === 'function') promesa.catch(() => {});
  }
  function ponerMusica(id) {
    if (id === musica.id) return;
    musica.nodo?.pause();
    musica = { id, nodo: id ? crear(id, true) : null };
    if (musica.nodo) reproducir(musica.nodo);
  }
  function sonarEfecto(id) {
    if (!id) return;
    const nodo = crear(id, false);
    if (nodo) reproducir(nodo);
  }
  function detenerVoz() {
    voz?.pause();
    voz = null;
  }
  function ponerVoz(id) {
    detenerVoz();
    if (!id) return;
    voz = crear(id, false);
    if (voz) reproducir(voz);
  }
  return {
    musica: ponerMusica,
    efecto: sonarEfecto,
    voz: ponerVoz,
    detenerVoz,
    detenerTodo() {
      ponerMusica(null);
      detenerVoz();
    },
  };
}

export function jugar(contenedor, juego, resolverRecurso, opciones = {}) {
  const {
    escenaInicial = juego.escenaInicial,
    creditos = [],
    titulo = juego.titulo,
    alCerrar = null,
    crearAudio = (url) => new Audio(url),
  } = opciones;
  const nombreJuego = titulo?.trim() || 'Sin título';
  const partida = crearPartida(juego, { escenaInicial });
  const audio = crearMezclador(crearAudio, resolverRecurso);
  let enCreditos = false; // abiertos con el botón, sobre cualquier punto de la partida
  let ultimaLinea = null; // "escena:índice" de la última línea dibujada, para no repetir efecto ni voz

  const boton = (accion, texto, alPulsar, extra = {}) =>
    h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion }, onclick: alPulsar, ...extra }, texto);
  const botonCreditos = boton('creditos', 'Créditos', () => { enCreditos = true; dibujar(); });
  const botonVolver = boton('volver', 'Volver al juego', () => { enCreditos = false; dibujar(); }, { hidden: true });
  const botonReiniciar = boton('reiniciar', 'Reiniciar', () => { reiniciar(partida); enCreditos = false; ultimaLinea = null; dibujar(); });
  const botonCerrar = alCerrar ? boton('cerrar', 'Cerrar', () => cerrar()) : null;

  const zonaEscena = h('div', { class: 'reproductor-escena', onclick: alClic });
  const barra = h('div', { class: 'reproductor-barra' },
    h('span', { class: 'reproductor-titulo' }, nombreJuego),
    h('span', { class: 'reproductor-acciones' }, botonCreditos, botonVolver, botonReiniciar, botonCerrar));
  const pista = h('p', { class: 'reproductor-pista' }, 'Clic, Espacio o Enter para seguir. Teclas 1 a 4 para elegir.');
  const raiz = h('div', { class: 'reproductor', tabIndex: 0, role: 'application', 'aria-label': `Juego: ${nombreJuego}`, onkeydown: alTeclear }, barra, zonaEscena, pista);
  vaciar(contenedor).append(raiz);
  const pantalla = crearPantalla(zonaEscena, { juego, resolverRecurso });

  function dibujar() {
    const vista = vistaActual(partida);
    const terminada = vista.tipo === 'creditos';
    if (terminada || enCreditos) {
      audio.musica(null);
      audio.detenerVoz();
      pantalla.mostrarCreditos(nombreJuego, creditos);
      botonCreditos.hidden = true;
      botonVolver.hidden = terminada;
      return;
    }
    botonCreditos.hidden = false;
    botonVolver.hidden = true;
    audio.musica(vista.musica);
    pantalla.mostrar(vista, { alElegir: (i) => { elegir(partida, i); dibujar(); } });
    const clave = `${vista.escena.id}:${vista.indice}`;
    if (clave !== ultimaLinea) {
      ultimaLinea = clave;
      audio.efecto(vista.efecto);
      if (vista.voz) audio.voz(vista.voz);
    }
  }

  function seguir() {
    if (enCreditos) return;
    const vista = vistaActual(partida);
    if (vista.tipo === 'decision' || vista.tipo === 'creditos') return;
    avanzar(partida);
    dibujar();
  }

  function alClic(evento) {
    if (evento.target.closest('button')) return;
    seguir();
  }

  function alTeclear(evento) {
    const enBoton = Boolean(evento.target.closest('button'));
    if (evento.key === ' ' || evento.key === 'Enter') {
      if (enBoton) return; // el botón se activa solo
      evento.preventDefault();
      seguir();
      return;
    }
    if (/^[1-4]$/.test(evento.key)) {
      if (enCreditos || vistaActual(partida).tipo !== 'decision') return;
      evento.preventDefault();
      elegir(partida, Number(evento.key) - 1);
      dibujar();
      return;
    }
    if (evento.key === 'Escape' && alCerrar) cerrar();
  }

  function cerrar() {
    audio.detenerTodo();
    vaciar(contenedor);
    alCerrar?.();
  }

  dibujar();
  raiz.focus();
  return { cerrar, partida, raiz };
}
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/reproductor.test.js`
Expected: `# pass 6`.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/motor/reproductor.js tests/reproductor.test.js
git commit -m "Motor: reproductor con clic, teclado, música en bucle, efectos, voces, créditos y reinicio" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Estilos del reproductor, servidor local y juego de prueba escrito a mano

**Files:**
- Create: `plataforma/css/tokens.css`
- Create: `plataforma/css/reproductor.css`
- Create: `tests/manual/servir.js`
- Create: `tests/manual/motor.html`
- Create: `tests/servir.test.js`

- [ ] **Step 1: Escribir `plataforma/css/tokens.css`**

Los tokens oscuros son los del portal (`portal/styles.css`, bloque `:root`), copiados tal cual para heredar la identidad. Se agregan la paleta clara del editor, los colores del semáforo y los grises de aviso. Las fuentes son las del sistema, como en el portal: no se descarga ninguna.

```css
/* plataforma/css/tokens.css — identidad visual heredada del portal del creador (La Casa · Programa PI) */
:root {
  --bg: #0a0d12;
  --bg-2: #0d1219;
  --panel: #111721;
  --panel-2: #161f2b;
  --ink: #f2efe6;
  --muted: #9aa4b2;
  --accent: #b6ff3b;
  --accent-ink: #101408;
  --alert: #ff5c7a;
  --amber: #ffb648;
  --line: #26303c;
  --line-soft: #1c2530;
  --paper: #f4f0e6;
  --paper-2: #ebe5d7;
  --paper-ink: #1a1d22;
  --paper-muted: #5d5a52;

  --display: "Arial Black", "Segoe UI Black", "Helvetica Neue", Arial, sans-serif;
  --body: "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
  --mono: "Consolas", "SFMono-Regular", ui-monospace, monospace;
  --serif: Georgia, "Times New Roman", serif;

  --radius: 16px;
  --shadow: 0 24px 60px rgba(0, 0, 0, .35);

  /* Tema claro del editor (se usa durante horas) */
  --claro-fondo: var(--paper);
  --claro-panel: #ffffff;
  --claro-panel-2: var(--paper-2);
  --claro-ink: var(--paper-ink);
  --claro-muted: var(--paper-muted);
  --claro-line: #d9d2c3;
  --claro-line-soft: #e8e2d4;
  --claro-accent: #2f5d00;        /* verde oscuro: contraste AA sobre blanco */
  --claro-accent-fondo: #e9ffc2;

  /* Semáforo jurídico (plan 3) y avisos del editor */
  --verde: #2b8a3e;
  --amarillo: #d9930d;
  --rojo: #c92a2a;
  --gris: #868e96;
}

* { box-sizing: border-box; }

button, input, select, textarea { font: inherit; }

:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
  border-radius: 4px;
}

.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 18px;
  border-radius: 99px;
  border: 1px solid transparent;
  font-weight: 700;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  text-decoration: none;
  transition: transform .16s ease, background .16s ease, border-color .16s ease, color .16s ease;
}
.btn-primary { background: var(--accent); color: var(--accent-ink); }
.btn-primary:hover { background: #c8ff6a; }
.btn-ghost { background: transparent; color: inherit; border-color: currentColor; }
.btn-ghost:hover { background: rgba(127, 127, 127, .12); }
.btn-sm { padding: 8px 12px; font-size: 12px; }
.btn:disabled { opacity: .45; cursor: not-allowed; transform: none; }
```

- [ ] **Step 2: Escribir `plataforma/css/reproductor.css`**

Tema oscuro, como un juego. El escenario es un cuadro 16:9 que se ajusta al ancho disponible; el fondo se muestra entero sin recortar y el retrato ajustado a su recuadro (spec, sección 10). También se jugará en celular: los botones son grandes y la barra se apila.

```css
/* plataforma/css/reproductor.css — el reproductor y el escenario (tema oscuro) */
.reproductor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  min-height: 100%;
  padding: 12px;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--body);
  outline: none;
}
.reproductor:focus-visible { box-shadow: inset 0 0 0 2px var(--accent); }

.reproductor-barra {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.reproductor-titulo { font-family: var(--display); font-size: 16px; letter-spacing: .02em; }
.reproductor-acciones { display: flex; flex-wrap: wrap; gap: 6px; }
.reproductor-acciones .btn-ghost { color: var(--ink); border-color: var(--line); }
.reproductor-pista { margin: 0; color: var(--muted); font-size: 12px; text-align: center; }

.reproductor-escena { cursor: pointer; user-select: none; }

.escenario {
  position: relative;
  width: min(100%, 960px);
  aspect-ratio: 16 / 9;
  margin: 0 auto;
  background: #000;
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  font-family: var(--serif);
}
.escenario-fondo { position: absolute; inset: 0; display: grid; place-items: center; }
.escenario-fondo img { width: 100%; height: 100%; object-fit: contain; }

.escenario-retrato {
  position: absolute;
  left: 3%;
  bottom: 24%;
  width: 22%;
  aspect-ratio: 1;
  display: grid;
  place-items: end center;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, .6));
}
.escenario-retrato img { max-width: 100%; max-height: 100%; object-fit: contain; }

.pixel { image-rendering: pixelated; image-rendering: crisp-edges; }

.escenario-caja {
  position: absolute;
  left: 2%;
  right: 2%;
  bottom: 2%;
  min-height: 22%;
  padding: 12px 16px;
  background: rgba(10, 13, 18, .86);
  border: 1px solid var(--line);
  border-radius: 10px;
  backdrop-filter: blur(6px);
}
.escenario-nombre {
  margin-bottom: 4px;
  font-family: var(--mono);
  font-size: clamp(11px, 1.6vw, 14px);
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--accent);
}
.escenario-texto { font-size: clamp(14px, 2.2vw, 20px); line-height: 1.4; white-space: pre-wrap; }
.es-fin .escenario-texto { text-align: center; font-size: clamp(16px, 2.8vw, 26px); }
.vacia .escenario-texto { color: var(--muted); font-style: italic; }

.escenario-opciones { display: grid; gap: 8px; margin-top: 10px; }
.escenario-opciones:empty { display: none; }
.opcion {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 14px;
  text-align: left;
  background: var(--panel-2);
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: 8px;
  font-family: var(--body);
  font-size: clamp(14px, 2vw, 17px);
  cursor: pointer;
}
.opcion:hover, .opcion:focus-visible { border-color: var(--accent); }
.opcion kbd {
  flex: 0 0 auto;
  min-width: 26px;
  padding: 2px 6px;
  border: 1px solid var(--line);
  border-radius: 6px;
  font-family: var(--mono);
  font-size: 12px;
  text-align: center;
  color: var(--muted);
}

.en-creditos .escenario-caja { inset: 6% 8%; min-height: 0; overflow: auto; text-align: center; }
.escenario-creditos { font-family: var(--body); }
.creditos-titulo { margin: 0 0 6px; font-family: var(--display); font-size: clamp(18px, 3vw, 28px); }
.creditos-encabezado { margin: 0 0 12px; font-family: var(--mono); font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); }
.escenario-creditos ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; font-size: clamp(13px, 1.8vw, 16px); }

@media (max-width: 600px) {
  .reproductor { padding: 6px; }
  .escenario { border-radius: 6px; }
  .escenario-retrato { width: 26%; bottom: 30%; }
}
```

- [ ] **Step 3: Escribir `tests/manual/servir.js`**

Web Crypto e IndexedDB exigen `localhost` o HTTPS, y los módulos ES no cargan desde `file://`. Este servidor sirve la raíz del repositorio sin dependencias.

```js
// tests/manual/servir.js
// Servidor estático mínimo para probar a mano en localhost. Sirve la raíz del
// repositorio. Uso: node tests/manual/servir.js [puerto]   (por defecto 8080)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = resolve(fileURLToPath(new URL('../../', import.meta.url)));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.webm': 'audio/webm',
  '.m4a': 'audio/mp4',
  '.woff2': 'font/woff2',
};

export function crearServidor(raiz = RAIZ) {
  return createServer(async (solicitud, respuesta) => {
    try {
      const url = new URL(solicitud.url, 'http://localhost');
      let ruta = decodeURIComponent(url.pathname);
      if (ruta.endsWith('/')) ruta += 'index.html';
      const archivo = resolve(raiz, `.${normalize(ruta)}`);
      if (archivo !== raiz && !archivo.startsWith(raiz + sep)) {
        respuesta.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        respuesta.end('Fuera de la raíz');
        return;
      }
      const info = await stat(archivo).catch(() => null);
      if (!info) {
        respuesta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        respuesta.end(`No existe: ${ruta}`);
        return;
      }
      if (info.isDirectory()) {
        respuesta.writeHead(302, { Location: `${url.pathname}/` });
        respuesta.end();
        return;
      }
      const datos = await readFile(archivo);
      respuesta.writeHead(200, { 'Content-Type': MIME[extname(archivo).toLowerCase()] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
      respuesta.end(datos);
    } catch (error) {
      respuesta.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      respuesta.end(String(error));
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const puerto = Number(process.argv[2] ?? 8080);
  crearServidor().listen(puerto, '127.0.0.1', () => {
    console.log(`Sirviendo ${RAIZ}`);
    console.log(`  plataforma:        http://localhost:${puerto}/plataforma/`);
    console.log(`  prueba del motor:  http://localhost:${puerto}/tests/manual/motor.html`);
  });
}
```

- [ ] **Step 4: Escribir `tests/servir.test.js`**

```js
// tests/servir.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearServidor } from './manual/servir.js';

async function conServidor(fn) {
  const servidor = crearServidor();
  await new Promise((listo) => servidor.listen(0, '127.0.0.1', listo));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  try {
    await fn(base);
  } finally {
    await new Promise((listo) => servidor.close(listo));
  }
}

test('el servidor manual sirve archivos con su tipo, redirige carpetas y responde 404 a lo que no existe', async () => {
  await conServidor(async (base) => {
    const css = await fetch(`${base}/plataforma/css/tokens.css`);
    assert.equal(css.status, 200);
    assert.match(css.headers.get('content-type'), /text\/css/);
    const js = await fetch(`${base}/plataforma/js/motor/partida.js`);
    assert.match(js.headers.get('content-type'), /text\/javascript/);
    const carpeta = await fetch(`${base}/plataforma`, { redirect: 'manual' });
    assert.equal(carpeta.status, 302);
    assert.equal(carpeta.headers.get('location'), '/plataforma/');
    assert.equal((await fetch(`${base}/no-existe.txt`)).status, 404);
    const paquete = await (await fetch(`${base}/..%2F..%2Fpackage.json`)).json();
    assert.equal(paquete.name, 'plataforma-primer-videojuego', 'subir con .. no sale de la raíz');
  });
});
```

- [ ] **Step 5: Escribir `tests/manual/motor.html`**

Juego escrito a mano (spec 15.6, paso 3): imágenes SVG incrustadas como `data:`, sin audio. El fondo del muelle es «creado» para ver el escalado pixelado; el de la torre es «subido».

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prueba manual del motor</title>
  <link rel="stylesheet" href="../../plataforma/css/tokens.css">
  <link rel="stylesheet" href="../../plataforma/css/reproductor.css">
  <style>
    body { margin: 0; background: #06080b; color: #9aa4b2; font-family: system-ui, sans-serif; }
    .nota { margin: 0; padding: 8px 16px; font-size: 13px; }
    #juego { min-height: calc(100vh - 36px); }
  </style>
</head>
<body>
  <p class="nota">Juego escrito a mano para probar el reproductor. Imágenes SVG incrustadas; sin audio.</p>
  <div id="juego"></div>
  <script type="module">
    import { crearProyecto, agregarEscena, agregarPersonaje, agregarElemento, agregarLinea } from '../../plataforma/js/estado/modelo.js';
    import { jugar } from '../../plataforma/js/motor/reproductor.js';

    const svg = (ancho, alto, color, texto) => 'data:image/svg+xml,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}">` +
      `<rect width="100%" height="100%" fill="${color}"/>` +
      `<text x="6" y="${Math.round(alto * 0.55)}" fill="#fff" font-family="monospace" font-size="${Math.round(alto / 7)}">${texto}</text></svg>`);

    const p = crearProyecto({ estudiante: 'Camila R.', titulo: 'La llave del faro', destino: 'gratis' });
    const muelle = p.juego.escenas[0];
    muelle.nombre = 'El muelle';
    const torre = agregarEscena(p, 'La torre');
    const playa = agregarEscena(p, 'La playa');
    const ana = agregarPersonaje(p, { nombre: 'Ana', descripcion: 'Farera en su primer turno.' });
    const farero = agregarPersonaje(p, { nombre: 'El farero' });
    const fondoMuelle = agregarElemento(p, { tipo: 'fondo', nombre: 'Muelle', archivo: 'muelle.png', origen: 'creado' });
    const fondoTorre = agregarElemento(p, { tipo: 'fondo', nombre: 'Torre', archivo: 'torre.png', origen: 'subido' });
    const retratoAna = agregarElemento(p, { tipo: 'retrato', nombre: 'Ana', archivo: 'ana.png', origen: 'creado' });
    const retratoFarero = agregarElemento(p, { tipo: 'retrato', nombre: 'Farero', archivo: 'farero.png', origen: 'subido' });
    ana.retrato = retratoAna.id;
    farero.retrato = retratoFarero.id;
    muelle.fondo = fondoMuelle.id;
    torre.fondo = fondoTorre.id;
    agregarLinea(muelle, 'narracion', { texto: 'La niebla cubre el muelle. El faro lleva dos noches apagado.' });
    agregarLinea(muelle, 'dialogo', { personaje: ana.id, texto: '¿Quién dejó la puerta abierta?' });
    agregarLinea(muelle, 'dialogo', { personaje: farero.id, texto: 'Yo no fui. Llevo tres días en cama.' });
    agregarLinea(muelle, 'decision', { texto: '¿Subes a la torre?', opciones: [{ texto: 'Sí, ahora mismo', escena: torre.id }, { texto: 'No, voy a la playa', escena: playa.id }] });
    agregarLinea(torre, 'narracion', { texto: 'La escalera cruje. Arriba, la lámpara está intacta.' });
    agregarLinea(torre, 'fin', { texto: 'Alguien apagó el faro a propósito. Fin del primer capítulo.' });
    agregarLinea(playa, 'dialogo', { personaje: ana.id, texto: 'Huellas. Van hacia el pueblo.' });
    agregarLinea(playa, 'narracion', { texto: 'Esta escena no tiene fin: sigue con la siguiente de la lista (no hay) y termina.' });

    const urls = {
      [fondoMuelle.id]: svg(192, 108, '#223344', 'Muelle (pixel)'),
      [fondoTorre.id]: svg(1920, 1080, '#443322', 'Torre (subido)'),
      [retratoAna.id]: svg(64, 64, '#227755', 'Ana'),
      [retratoFarero.id]: svg(256, 256, '#775522', 'Farero'),
    };
    jugar(document.getElementById('juego'), p.juego, (id) => urls[id] ?? null, {
      creditos: ['Camila R.: autora del juego y de la historia', 'Fondos y retratos: hechos a mano para esta prueba'],
      alCerrar: () => { document.getElementById('juego').textContent = 'Reproductor cerrado. Recarga para volver a jugar.'; },
    });
  </script>
</body>
</html>
```

- [ ] **Step 6: Correr la prueba del servidor y la comprobación manual**

Run: `node --test tests/servir.test.js`
Expected: `# pass 1`.

Run en segundo plano: `node tests/manual/servir.js` y abrir `http://localhost:8080/tests/manual/motor.html`. Comprobar:

1. Se ve el fondo «Muelle (pixel)» escalado con bordes duros y la primera narración en la caja.
2. Clic sobre el escenario, Espacio y Enter avanzan; con Ana y el farero aparece el nombre y el retrato (Ana pixelada, el farero suavizado).
3. La decisión muestra dos botones con `1` y `2`; la tecla `2` lleva a la playa; la playa termina en créditos tras su segunda línea.
4. «Créditos» y «Volver al juego» funcionan en medio de la partida; «Reiniciar» vuelve al muelle; «Cerrar» vacía el contenedor.
5. Con la ventana angosta (menos de 600 px) todo sigue legible y los botones se pulsan con el dedo.

Detener el servidor al terminar.

- [ ] **Step 7: Commit**

```bash
git add plataforma/css/tokens.css plataforma/css/reproductor.css tests/manual/servir.js tests/manual/motor.html tests/servir.test.js
git commit -m "Estilos del reproductor, tokens del portal, servidor local y juego de prueba escrito a mano" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Sesión del editor: estado, guardado con espera, URLs y recordatorio

**Files:**
- Create: `plataforma/js/editor/sesion.js`
- Create: `tests/sesion.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/sesion.test.js
import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirAlmacen } from '../plataforma/js/estado/almacen.js';
import { crearProyecto, agregarEscena } from '../plataforma/js/estado/modelo.js';
import { crearSesion, CAMBIOS_PARA_RECORDAR } from '../plataforma/js/editor/sesion.js';

let contador = 0;
const abrir = () => abrirAlmacen({ nombre: `sesion-${Date.now()}-${contador++}` });

/** Temporizador controlado: correr() ejecuta lo pendiente. */
function reloj() {
  const pendientes = new Map();
  let n = 0;
  return {
    pendientes,
    planificar: (fn, ms) => { n += 1; pendientes.set(n, { fn, ms }); return n; },
    cancelar: (id) => pendientes.delete(id),
    correr() { const lista = [...pendientes.values()]; pendientes.clear(); for (const { fn } of lista) fn(); },
  };
}

const bytes = (texto) => new TextEncoder().encode(texto).buffer;

function armar(extra = {}) {
  const almacen = extra.almacen ?? abrir();
  const tiempo = reloj();
  const eventos = [];
  const liberadas = [];
  const sesion = crearSesion({
    proyecto: crearProyecto({ estudiante: 'Camila', titulo: 'Faro' }),
    almacen,
    planificar: tiempo.planificar,
    cancelar: tiempo.cancelar,
    crearUrl: (archivo) => `blob:${archivo.tipo}:${new TextDecoder().decode(archivo.datos)}`,
    liberarUrl: (url) => liberadas.push(url),
  });
  sesion.suscribir((evento) => eventos.push(evento));
  const tipos = () => eventos.map((e) => e.tipo);
  return { almacen, tiempo, sesion, eventos, tipos, liberadas };
}

test('cambiar aplica la mutación, devuelve lo creado, avisa con el detalle y guarda una sola vez tras la espera', async () => {
  const { almacen, tiempo, sesion, eventos, tipos } = armar();
  const escena = sesion.cambiar((p) => agregarEscena(p, 'Torre'), { origen: 'inventario', estructura: true });
  assert.equal(escena.nombre, 'Torre');
  sesion.cambiar((p) => { p.juego.titulo = 'Faro 2'; }, { origen: 'propiedades' });
  sesion.cambiar((p) => agregarEscena(p, 'Playa'));
  assert.deepEqual(eventos[0], { tipo: 'cambio', origen: 'inventario', estructura: true });
  assert.deepEqual(tipos(), ['cambio', 'cambio', 'cambio']);
  assert.equal(tiempo.pendientes.size, 1, 'tres cambios seguidos programan un solo guardado');
  assert.equal(await almacen.cargar(), null, 'todavía no se guardó');
  tiempo.correr();
  await sesion.esperarGuardado();
  const guardado = await almacen.cargar();
  assert.equal(guardado.juego.titulo, 'Faro 2');
  assert.equal(guardado.juego.escenas.length, 3);
  assert.deepEqual(tipos().filter((t) => t === 'guardado'), ['guardado']);
  assert.equal(sesion.cambiosSinCopia, 3);
  await almacen.cerrar();
});

test('guardarAhora cancela la espera y guarda de inmediato; marcarCopiaGuardada reinicia el contador', async () => {
  const { almacen, tiempo, sesion, tipos } = armar();
  sesion.cambiar((p) => { p.juego.titulo = 'Ya'; });
  await sesion.guardarAhora();
  assert.equal(tiempo.pendientes.size, 0);
  assert.equal((await almacen.cargar()).juego.titulo, 'Ya');
  assert.deepEqual(tipos(), ['cambio', 'guardado']);
  sesion.marcarCopiaGuardada();
  assert.equal(sesion.cambiosSinCopia, 0);
  await almacen.cerrar();
});

test('a los 50 cambios sin copia avisa una sola vez', () => {
  const { sesion, tipos } = armar({ almacen: { guardar: async () => {} } });
  for (let i = 0; i < CAMBIOS_PARA_RECORDAR + 5; i += 1) sesion.cambiar(() => {});
  const recordatorios = tipos().map((t, i) => [t, i]).filter(([t]) => t === 'recordatorio');
  assert.equal(recordatorios.length, 1);
  assert.equal(recordatorios[0][1], CAMBIOS_PARA_RECORDAR, 'justo después del evento del cambio 50');
});

test('agregarArchivo guarda en el almacén; resolverRecurso crea la URL una vez; quitar y reemplazar liberan', async () => {
  const { almacen, sesion, liberadas } = armar();
  await sesion.agregarArchivo('el_1', { tipo: 'image/png', datos: bytes('uno') });
  assert.equal((await almacen.leerArchivo('el_1')).tipo, 'image/png');
  assert.equal(sesion.resolverRecurso('el_1'), 'blob:image/png:uno');
  assert.equal(sesion.resolverRecurso('el_1'), 'blob:image/png:uno', 'misma URL la segunda vez');
  assert.equal(sesion.resolverRecurso('no_existe'), null);
  await sesion.agregarArchivo('el_1', { tipo: 'image/png', datos: bytes('dos') });
  assert.deepEqual(liberadas, ['blob:image/png:uno'], 'reemplazar el archivo libera la URL vieja');
  assert.equal(sesion.resolverRecurso('el_1'), 'blob:image/png:dos');
  await sesion.quitarArchivo('el_1');
  assert.equal(await almacen.leerArchivo('el_1'), null);
  assert.equal(sesion.archivos.has('el_1'), false);
  assert.deepEqual(liberadas, ['blob:image/png:uno', 'blob:image/png:dos']);
  assert.equal(sesion.resolverRecurso('el_1'), null);
  await almacen.cerrar();
});

test('si el almacén falla al guardar, la sesión avisa con el error y sigue viva', async () => {
  const fallo = Object.assign(new Error('No hay espacio'), { codigo: 'sin_espacio' });
  const almacen = { guardar: async () => { throw fallo; } };
  const { sesion, eventos } = armar({ almacen });
  sesion.cambiar((p) => { p.juego.titulo = 'x'; });
  await sesion.guardarAhora();
  assert.equal(eventos.at(-1).tipo, 'error');
  assert.equal(eventos.at(-1).error, fallo);
  sesion.cambiar((p) => { p.juego.titulo = 'y'; });
  assert.equal(sesion.proyecto.juego.titulo, 'y');
});

test('reemplazar cambia proyecto y archivos en el almacén, libera las URLs, reinicia el contador y avisa', async () => {
  const { almacen, sesion, tipos, liberadas } = armar();
  await sesion.agregarArchivo('el_1', { tipo: 'image/png', datos: bytes('uno') });
  sesion.resolverRecurso('el_1');
  sesion.cambiar((p) => { p.juego.titulo = 'Viejo'; });
  const nuevo = crearProyecto({ estudiante: 'Otra', titulo: 'Nuevo' });
  await sesion.reemplazar(nuevo, new Map([['el_9', { tipo: 'audio/ogg', datos: bytes('nueve') }]]));
  assert.equal(sesion.proyecto, nuevo);
  assert.equal((await almacen.cargar()).juego.titulo, 'Nuevo');
  assert.deepEqual(await almacen.listarArchivos(), ['el_9']);
  assert.deepEqual(liberadas, ['blob:image/png:uno']);
  assert.equal(sesion.resolverRecurso('el_1'), null);
  assert.equal(sesion.resolverRecurso('el_9'), 'blob:audio/ogg:nueve');
  assert.equal(sesion.cambiosSinCopia, 0);
  assert.equal(tipos().at(-1), 'reemplazo');
  await almacen.cerrar();
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/sesion.test.js`
Expected: falla al importar `sesion.js`.

- [ ] **Step 3: Escribir `plataforma/js/editor/sesion.js`**

```js
// plataforma/js/editor/sesion.js
// Estado del editor: el proyecto, sus archivos binarios, el guardado automático con
// espera, el contador de cambios para recordar la copia y las URLs de objetos con las
// que se muestran imágenes y sonidos. Las vistas leen sesion.proyecto cada vez (Abrir
// copia lo reemplaza entero) y cambian el proyecto solo con sesion.cambiar().
// Eventos a los suscriptores: { tipo: 'cambio', ...detalle } | 'guardado' | 'error' | 'recordatorio' | 'reemplazo'.

export const ESPERA_GUARDADO_MS = 400;
export const CAMBIOS_PARA_RECORDAR = 50;

export function crearSesion({
  proyecto,
  archivos = new Map(),
  almacen,
  esperaMs = ESPERA_GUARDADO_MS,
  planificar = (fn, ms) => setTimeout(fn, ms),
  cancelar = (temporizador) => clearTimeout(temporizador),
  crearUrl = (archivo) => URL.createObjectURL(new Blob([archivo.datos], { type: archivo.tipo })),
  liberarUrl = (url) => URL.revokeObjectURL(url),
}) {
  const oyentes = new Set();
  const urls = new Map();
  let temporizador = null;
  let cola = Promise.resolve();
  let cambiosSinCopia = 0;

  function avisar(evento) {
    for (const oyente of oyentes) oyente(evento);
  }

  function cancelarEspera() {
    if (temporizador === null) return;
    cancelar(temporizador);
    temporizador = null;
  }

  // Los guardados se encadenan para que nunca corran dos a la vez.
  function guardar() {
    cola = cola
      .then(() => almacen.guardar(sesion.proyecto))
      .then(() => avisar({ tipo: 'guardado' }), (error) => avisar({ tipo: 'error', error }));
    return cola;
  }

  function programar() {
    cancelarEspera();
    temporizador = planificar(() => {
      temporizador = null;
      guardar();
    }, esperaMs);
  }

  function liberar(id) {
    const url = urls.get(id);
    if (url === undefined) return;
    liberarUrl(url);
    urls.delete(id);
  }

  const sesion = {
    proyecto,
    archivos,
    almacen,
    get cambiosSinCopia() {
      return cambiosSinCopia;
    },
    suscribir(oyente) {
      oyentes.add(oyente);
      return () => oyentes.delete(oyente);
    },
    /** Aplica fn(proyecto), programa el guardado y avisa { tipo: 'cambio', ...detalle }. Devuelve lo que fn devuelva. */
    cambiar(fn, detalle = {}) {
      const resultado = fn(sesion.proyecto);
      cambiosSinCopia += 1;
      programar();
      avisar({ tipo: 'cambio', ...detalle });
      if (cambiosSinCopia === CAMBIOS_PARA_RECORDAR) avisar({ tipo: 'recordatorio' });
      return resultado;
    },
    async agregarArchivo(id, archivo) {
      await almacen.guardarArchivo(id, archivo);
      liberar(id);
      sesion.archivos.set(id, archivo);
    },
    async quitarArchivo(id) {
      liberar(id);
      sesion.archivos.delete(id);
      await almacen.borrarArchivo(id);
    },
    /** URL con la que el navegador muestra el archivo del elemento, o null si no hay archivo. */
    resolverRecurso(id) {
      if (urls.has(id)) return urls.get(id);
      const archivo = sesion.archivos.get(id);
      if (!archivo) return null;
      const url = crearUrl(archivo);
      urls.set(id, url);
      return url;
    },
    guardarAhora() {
      cancelarEspera();
      return guardar();
    },
    esperarGuardado() {
      return cola;
    },
    marcarCopiaGuardada() {
      cambiosSinCopia = 0;
    },
    /** Abrir copia: proyecto y archivos nuevos, en una sola transacción del almacén. */
    async reemplazar(nuevoProyecto, nuevosArchivos) {
      cancelarEspera();
      await cola;
      await almacen.reemplazarTodo(nuevoProyecto, nuevosArchivos);
      for (const id of [...urls.keys()]) liberar(id);
      sesion.proyecto = nuevoProyecto;
      sesion.archivos = nuevosArchivos;
      cambiosSinCopia = 0;
      avisar({ tipo: 'reemplazo' });
    },
    cerrar() {
      cancelarEspera();
      for (const id of [...urls.keys()]) liberar(id);
    },
  };
  return sesion;
}
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/sesion.test.js`
Expected: `# pass 6`.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/editor/sesion.js tests/sesion.test.js
git commit -m "Editor: sesión con guardado automático con espera, URLs de objetos, recordatorio y reemplazo" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Subida de archivos

**Files:**
- Create: `plataforma/js/editor/subida.js`
- Create: `tests/subida.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/subida.test.js
import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirAlmacen } from '../plataforma/js/estado/almacen.js';
import { crearProyecto } from '../plataforma/js/estado/modelo.js';
import { crearSesion } from '../plataforma/js/editor/sesion.js';
import { mimeDe, validarSubida, nombreSugerido, subirElemento, TIPOS_POR_MEDIO, medioDeTipo } from '../plataforma/js/editor/subida.js';

const MB = 1024 * 1024;
let contador = 0;
const abrir = () => abrirAlmacen({ nombre: `subida-${Date.now()}-${contador++}` });

/** Un File falso: solo lo que subida.js usa. */
const archivo = (name, type, size = 10) => ({
  name, type, size,
  arrayBuffer: async () => new TextEncoder().encode(`contenido de ${name}`).buffer,
});

function sesionDePrueba(almacen = abrir()) {
  return crearSesion({
    proyecto: crearProyecto({ titulo: 'Faro' }),
    almacen,
    planificar: () => 1,
    cancelar: () => {},
    crearUrl: (a) => `blob:${a.tipo}`,
    liberarUrl: () => {},
  });
}

test('mimeDe usa el tipo del navegador, normaliza sinónimos y cae a la extensión si no hay tipo', () => {
  assert.equal(mimeDe(archivo('a.png', 'image/png')), 'image/png');
  assert.equal(mimeDe(archivo('a.jpg', 'image/jpg')), 'image/jpeg');
  assert.equal(mimeDe(archivo('a.wav', 'audio/x-wav')), 'audio/wav');
  assert.equal(mimeDe(archivo('a.mp3', 'audio/mp3')), 'audio/mpeg');
  assert.equal(mimeDe(archivo('a.WEBP', '')), 'image/webp');
  assert.equal(mimeDe(archivo('a.ogg', 'audio/ogg; codecs=opus')), 'audio/ogg');
  assert.equal(mimeDe(archivo('raro', '')), 'application/octet-stream');
});

test('validarSubida acepta los formatos del spec y rechaza los demás y los que pasan el límite', () => {
  assert.deepEqual(validarSubida(archivo('f.png', 'image/png', 2 * MB)), { ok: true, mime: 'image/png', medio: 'imagen' });
  assert.deepEqual(validarSubida(archivo('m.mp3', 'audio/mpeg', 5 * MB)), { ok: true, mime: 'audio/mpeg', medio: 'audio' });
  assert.equal(validarSubida(archivo('w.webp', 'image/webp')).ok, true);
  const gif = validarSubida(archivo('a.gif', 'image/gif'));
  assert.equal(gif.ok, false);
  assert.match(gif.mensaje, /PNG, JPG o WebP/);
  assert.match(gif.mensaje, /MP3, OGG o WAV/);
  const grande = validarSubida(archivo('f.png', 'image/png', 2 * MB + 1));
  assert.equal(grande.ok, false);
  assert.match(grande.mensaje, /máximo para imágenes es 2 MB/);
  const audioGrande = validarSubida(archivo('m.ogg', 'audio/ogg', 7.5 * MB));
  assert.match(audioGrande.mensaje, /pesa 7\.5 MB y el máximo para audio es 5 MB/);
});

test('nombreSugerido limpia el nombre del archivo; medioDeTipo dice qué medio pide cada tipo de elemento', () => {
  assert.equal(nombreSugerido('fondo_muelle-noche.png'), 'fondo muelle noche');
  assert.equal(nombreSugerido('  .png'), 'Sin nombre');
  assert.equal(nombreSugerido(undefined), 'Sin nombre');
  assert.deepEqual(TIPOS_POR_MEDIO, { imagen: ['fondo', 'retrato'], audio: ['musica', 'efecto', 'voz'] });
  assert.equal(medioDeTipo('retrato'), 'imagen');
  assert.equal(medioDeTipo('voz'), 'audio');
  assert.equal(medioDeTipo('otro'), null);
});

test('subirElemento da de alta el elemento con origen subido, su ficha y su archivo', async () => {
  const almacen = abrir();
  const sesion = sesionDePrueba(almacen);
  const eventos = [];
  sesion.suscribir((e) => eventos.push(e));
  const elemento = await subirElemento(sesion, archivo('muelle_noche.PNG', 'image/png'), { tipo: 'fondo' });
  assert.equal(elemento.tipo, 'fondo');
  assert.equal(elemento.origen, 'subido');
  assert.equal(elemento.nombre, 'muelle noche');
  assert.equal(elemento.archivo, `${elemento.id}.png`);
  assert.equal(elemento.sello, null);
  assert.equal(sesion.proyecto.juego.elementos[0], elemento);
  assert.equal(sesion.proyecto.fichas[elemento.id].origen, 'subido');
  const guardado = await almacen.leerArchivo(elemento.id);
  assert.equal(guardado.tipo, 'image/png');
  assert.equal(new TextDecoder().decode(guardado.datos), 'contenido de muelle_noche.PNG');
  assert.equal(sesion.resolverRecurso(elemento.id), 'blob:image/png');
  assert.deepEqual(eventos[0], { tipo: 'cambio', origen: 'subida', estructura: true });
  const conNombre = await subirElemento(sesion, archivo('v.ogg', 'audio/ogg'), { tipo: 'voz', nombre: 'Voz de Ana' });
  assert.equal(conNombre.nombre, 'Voz de Ana');
  assert.equal(conNombre.archivo, `${conNombre.id}.ogg`);
  await assert.rejects(subirElemento(sesion, archivo('f.png', 'image/png'), { tipo: 'musica' }), (e) => e.codigo === 'subida' && /imagen no puede ser musica/.test(e.message));
  await assert.rejects(subirElemento(sesion, archivo('x.gif', 'image/gif'), { tipo: 'fondo' }), (e) => e.codigo === 'subida');
  assert.equal(sesion.proyecto.juego.elementos.length, 2, 'los rechazos no agregan nada');
  await almacen.cerrar();
});

test('si el almacén no puede guardar el archivo, el elemento se retira y el error se propaga', async () => {
  const fallo = Object.assign(new Error('No hay espacio'), { codigo: 'sin_espacio' });
  const almacen = { guardar: async () => {}, guardarArchivo: async () => { throw fallo; }, borrarArchivo: async () => {} };
  const sesion = sesionDePrueba(almacen);
  await assert.rejects(subirElemento(sesion, archivo('f.png', 'image/png'), { tipo: 'fondo' }), (e) => e === fallo);
  assert.deepEqual(sesion.proyecto.juego.elementos, []);
  assert.deepEqual(Object.keys(sesion.proyecto.fichas), ['titulo', 'historia']);
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/subida.test.js`
Expected: falla al importar `subida.js`.

- [ ] **Step 3: Escribir `plataforma/js/editor/subida.js`**

```js
// plataforma/js/editor/subida.js
// Subida de archivos (spec, sección 10): formatos y límites por archivo, lectura y
// alta como elemento con origen 'subido'. La pregunta de autoría que abre la ficha
// al subir llega con el panel de ficha (plan 3).
import { LIMITES, mimePorExtension, extensionPorMime } from '../estado/archivos.js';
import { agregarElemento, eliminarElemento } from '../estado/modelo.js';

export const FORMATOS = {
  imagen: ['image/png', 'image/jpeg', 'image/webp'],
  audio: ['audio/mpeg', 'audio/ogg', 'audio/wav'],
};
export const TIPOS_POR_MEDIO = { imagen: ['fondo', 'retrato'], audio: ['musica', 'efecto', 'voz'] };
/** Valor del atributo accept del <input type="file"> por medio. */
export const ACEPTA = {
  imagen: '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp',
  audio: '.mp3,.ogg,.wav,audio/mpeg,audio/ogg,audio/wav',
};
const SINONIMOS = {
  'image/jpg': 'image/jpeg',
  'audio/x-wav': 'audio/wav',
  'audio/wave': 'audio/wav',
  'audio/mp3': 'audio/mpeg',
  'audio/x-mpeg': 'audio/mpeg',
};
const MB = 1024 * 1024;

export function medioDe(mime) {
  if (FORMATOS.imagen.includes(mime)) return 'imagen';
  if (FORMATOS.audio.includes(mime)) return 'audio';
  return null;
}

export function medioDeTipo(tipo) {
  if (TIPOS_POR_MEDIO.imagen.includes(tipo)) return 'imagen';
  if (TIPOS_POR_MEDIO.audio.includes(tipo)) return 'audio';
  return null;
}

/** MIME normalizado: lo que dice el navegador o, si no dice nada, la extensión. */
export function mimeDe(archivo) {
  const base = String(archivo.type ?? '').split(';')[0].trim().toLowerCase();
  const mime = SINONIMOS[base] ?? base;
  return mime || mimePorExtension(archivo.name ?? '');
}

const enMB = (bytes) => `${String(Math.round((bytes / MB) * 10) / 10)} MB`;

/** @returns {{ ok: true, mime: string, medio: string } | { ok: false, mensaje: string }} */
export function validarSubida(archivo) {
  const mime = mimeDe(archivo);
  const medio = medioDe(mime);
  if (!medio) return { ok: false, mensaje: 'Formato no aceptado. Imágenes: PNG, JPG o WebP. Audio: MP3, OGG o WAV.' };
  const limite = medio === 'imagen' ? LIMITES.imagenBytes : LIMITES.audioBytes;
  if (archivo.size > limite) {
    return { ok: false, mensaje: `El archivo pesa ${enMB(archivo.size)} y el máximo para ${medio === 'imagen' ? 'imágenes' : 'audio'} es ${enMB(limite)}.` };
  }
  return { ok: true, mime, medio };
}

export function nombreSugerido(nombreArchivo) {
  const sinExtension = String(nombreArchivo ?? '').replace(/\.[^.]+$/, '');
  const limpio = sinExtension.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return limpio || 'Sin nombre';
}

const rechazo = (mensaje) => Object.assign(new Error(mensaje), { codigo: 'subida' });

/**
 * Lee el archivo, lo da de alta como elemento con origen 'subido' y lo guarda.
 * Si el almacén falla, retira el elemento y propaga el error. Lanza con codigo 'subida' si no se acepta.
 * @param {object} sesion de crearSesion
 * @param {File} archivo
 * @param {{ tipo: string, nombre?: string }} datos tipo de elemento (fondo, retrato, musica, efecto, voz)
 */
export async function subirElemento(sesion, archivo, { tipo, nombre = nombreSugerido(archivo.name) }) {
  const resultado = validarSubida(archivo);
  if (!resultado.ok) throw rechazo(resultado.mensaje);
  if (!TIPOS_POR_MEDIO[resultado.medio].includes(tipo)) throw rechazo(`Un archivo de ${resultado.medio} no puede ser ${tipo}.`);
  const datos = await archivo.arrayBuffer();
  const elemento = sesion.cambiar((proyecto) => {
    const nuevo = agregarElemento(proyecto, { tipo, nombre, archivo: 'pendiente', origen: 'subido' });
    nuevo.archivo = `${nuevo.id}.${extensionPorMime(resultado.mime)}`;
    return nuevo;
  }, { origen: 'subida', estructura: true });
  try {
    await sesion.agregarArchivo(elemento.id, { tipo: resultado.mime, datos });
  } catch (error) {
    sesion.cambiar((proyecto) => eliminarElemento(proyecto, elemento.id), { origen: 'subida', estructura: true });
    throw error;
  }
  return elemento;
}
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/subida.test.js`
Expected: `# pass 5`.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/editor/subida.js tests/subida.test.js
git commit -m "Editor: subida de archivos con formatos, límites y alta del elemento" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Inventario (columna izquierda)

**Files:**
- Create: `plataforma/js/editor/inventario.js`
- Create: `tests/ayudas/sesion.js`
- Create: `tests/inventario.test.js`

- [ ] **Step 1: Escribir la ayuda `tests/ayudas/sesion.js`**

Las vistas se prueban con una sesión real sobre un almacén que no guarda y un temporizador que no corre, para que las pruebas sean síncronas salvo donde se indique.

```js
// tests/ayudas/sesion.js
// Sesión de prueba para las vistas: almacén mudo, temporizador que no corre, URLs predecibles.
import { crearProyecto } from '../../plataforma/js/estado/modelo.js';
import { crearSesion } from '../../plataforma/js/editor/sesion.js';

export function almacenMudo() {
  const archivos = new Map();
  return {
    guardar: async () => {},
    guardarArchivo: async (id, archivo) => { archivos.set(id, archivo); },
    borrarArchivo: async (id) => { archivos.delete(id); },
    reemplazarTodo: async (proyecto, nuevos) => { archivos.clear(); for (const [id, a] of nuevos) archivos.set(id, a); },
    archivos,
  };
}

export function sesionDePrueba(proyecto = crearProyecto({ estudiante: 'Camila R.', titulo: 'La llave del faro', destino: 'gratis' }), extra = {}) {
  const eventos = [];
  const sesion = crearSesion({
    proyecto,
    almacen: almacenMudo(),
    planificar: () => 1,
    cancelar: () => {},
    crearUrl: (archivo) => `blob:${archivo.tipo}`,
    liberarUrl: () => {},
    ...extra,
  });
  sesion.suscribir((evento) => eventos.push(evento));
  return { sesion, eventos };
}
```

- [ ] **Step 2: Escribir las pruebas que fallan**

```js
// tests/inventario.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instalarDom, clic, textos } from './ayudas/dom.js';
import { sesionDePrueba } from './ayudas/sesion.js';
import { agregarEscena, agregarPersonaje, agregarElemento, agregarLinea } from '../plataforma/js/estado/modelo.js';
import { crearInventario } from '../plataforma/js/editor/inventario.js';

instalarDom();

function armar() {
  const { sesion, eventos } = sesionDePrueba();
  const p = sesion.proyecto;
  const muelle = p.juego.escenas[0];
  muelle.nombre = 'El muelle';
  const torre = agregarEscena(p, '');
  const ana = agregarPersonaje(p, { nombre: 'Ana' });
  const sinNombre = agregarPersonaje(p, { nombre: '' });
  const fondo = agregarElemento(p, { tipo: 'fondo', nombre: 'Muelle', archivo: 'm.png', origen: 'subido' });
  ana.retrato = agregarElemento(p, { tipo: 'retrato', nombre: 'Ana', archivo: 'a.png', origen: 'subido' }).id;
  agregarLinea(torre, 'dialogo', { personaje: null, texto: 'Sin quién.' });
  const selecciones = [];
  let subidas = 0;
  const contenedor = document.createElement('div');
  const inventario = crearInventario(contenedor, sesion, { alSeleccionar: (s) => selecciones.push(s), alSubir: () => { subidas += 1; } });
  return { sesion, eventos, p, muelle, torre, ana, sinNombre, fondo, contenedor, inventario, selecciones, subidas: () => subidas };
}

test('dibuja El juego, escenas, personajes y elementos con sus nombres y detalles, y marca la selección', () => {
  const { contenedor, inventario, muelle, fondo } = armar();
  inventario.dibujar({ tipo: 'escena', id: muelle.id });
  assert.deepEqual(textos(contenedor, 'h2'), ['Escenas', 'Personajes', 'Elementos']);
  assert.deepEqual(textos(contenedor, '.entrada-texto'), ['La llave del faro', 'El muelle', 'Escena 2', 'Ana', 'Sin nombre', 'Muelle', 'Ana']);
  assert.deepEqual(textos(contenedor, '.entrada-detalle'), ['El juego', 'inicial', 'sin retrato', 'Fondo', 'Retrato']);
  const activas = [...contenedor.querySelectorAll('[aria-current="true"]')];
  assert.equal(activas.length, 1);
  assert.equal(activas[0].querySelector('.entrada-texto').textContent, 'El muelle');
  inventario.dibujar({ tipo: 'elemento', id: fondo.id });
  assert.equal(contenedor.querySelector('[aria-current="true"] .entrada-texto').textContent, 'Muelle');
  inventario.dibujar({ tipo: 'linea', escena: muelle.id, indice: 0 });
  assert.equal(contenedor.querySelector('[aria-current="true"] .entrada-texto').textContent, 'El muelle', 'una línea seleccionada marca su escena');
  inventario.dibujar({ tipo: 'juego' });
  assert.equal(contenedor.querySelector('[aria-current="true"] .entrada-detalle').textContent, 'El juego');
});

test('las escenas con avisos llevan la marca gris con los mensajes; las limpias no', () => {
  const { contenedor, inventario, muelle } = armar();
  inventario.dibujar(null);
  let marcas = [...contenedor.querySelectorAll('.aviso-gris')];
  assert.equal(marcas.length, 2, 'el muelle no tiene líneas; la torre tiene un diálogo sin personaje');
  assert.match(marcas[0].title, /no tiene líneas/);
  assert.match(marcas[1].title, /no tiene personaje/);
  assert.match(marcas[1].getAttribute('aria-label'), /^1 aviso/);
  assert.equal(marcas[1].closest('li').querySelector('.entrada-texto').textContent, 'Escena 2');
  agregarLinea(muelle, 'narracion', { texto: 'Niebla.' });
  inventario.dibujar(null);
  marcas = [...contenedor.querySelectorAll('.aviso-gris')];
  assert.equal(marcas.length, 1, 'con una línea, el muelle queda limpio');
  assert.equal(marcas[0].closest('li').querySelector('.entrada-texto').textContent, 'Escena 2');
});

test('Nueva escena y Nuevo personaje crean con nombre numerado, avisan con estructura y seleccionan lo nuevo', () => {
  const { contenedor, inventario, sesion, eventos, selecciones, p } = armar();
  inventario.dibujar(null);
  clic([...contenedor.querySelectorAll('button')].find((b) => b.textContent === 'Nueva escena'));
  assert.equal(p.juego.escenas.length, 3);
  assert.equal(p.juego.escenas[2].nombre, 'Escena 3');
  assert.deepEqual(eventos.at(-1), { tipo: 'cambio', origen: 'inventario', estructura: true });
  assert.deepEqual(selecciones.at(-1), { tipo: 'escena', id: p.juego.escenas[2].id });
  clic([...contenedor.querySelectorAll('button')].find((b) => b.textContent === 'Nuevo personaje'));
  assert.equal(p.juego.personajes.length, 3);
  assert.equal(p.juego.personajes[2].nombre, 'Personaje 3');
  assert.ok(sesion.proyecto.fichas[p.juego.personajes[2].id], 'el personaje nuevo tiene ficha');
  assert.deepEqual(selecciones.at(-1), { tipo: 'personaje', id: p.juego.personajes[2].id });
});

test('pulsar una entrada selecciona lo correcto y Subir archivo avisa', () => {
  const { contenedor, inventario, selecciones, subidas, muelle, ana, fondo } = armar();
  inventario.dibujar(null);
  const botones = [...contenedor.querySelectorAll('button.entrada')];
  clic(botones[0]);
  clic(botones[1]);
  clic(botones[3]);
  clic(botones[5]);
  assert.deepEqual(selecciones, [{ tipo: 'juego' }, { tipo: 'escena', id: muelle.id }, { tipo: 'personaje', id: ana.id }, { tipo: 'elemento', id: fondo.id }]);
  clic([...contenedor.querySelectorAll('button')].find((b) => b.textContent === 'Subir archivo'));
  assert.equal(subidas(), 1);
});

test('sin título, sin personajes ni elementos muestra textos de vacío', () => {
  const { sesion } = sesionDePrueba();
  sesion.proyecto.juego.titulo = '  ';
  const contenedor = document.createElement('div');
  crearInventario(contenedor, sesion, { alSeleccionar: () => {}, alSubir: () => {} }).dibujar(null);
  assert.equal(contenedor.querySelector('.entrada-texto').textContent, 'Sin título');
  assert.deepEqual(textos(contenedor, '.vacio'), ['Nada todavía.', 'Nada todavía.']);
  assert.equal(contenedor.querySelectorAll('.aviso-gris').length, 1, 'la escena inicial vacía avisa (sin líneas, sin fin)');
});
```

- [ ] **Step 3: Correr las pruebas para ver que fallan**

Run: `node --test tests/inventario.test.js`
Expected: falla al importar `inventario.js`.

- [ ] **Step 4: Escribir `plataforma/js/editor/inventario.js`**

```js
// plataforma/js/editor/inventario.js
// Columna izquierda: la entrada fija «El juego», y las listas de escenas (con su
// aviso gris), personajes y elementos, cada una con su botón de crear. El punto de
// semáforo de personajes y elementos queda como marcador vacío (data-ficha) y lo
// colorea el plan 3.
//
// Selección: { tipo: 'juego' } | { tipo: 'escena', id } | { tipo: 'linea', escena, indice }
//          | { tipo: 'personaje', id } | { tipo: 'elemento', id }
import { h, vaciar, conservarFoco } from '../ui/dom.js';
import { validar } from '../estado/validacion.js';
import { agregarEscena, agregarPersonaje } from '../estado/modelo.js';

export const NOMBRES_TIPO = { fondo: 'Fondo', retrato: 'Retrato', musica: 'Música', efecto: 'Efecto', voz: 'Voz' };

export function crearInventario(contenedor, sesion, { alSeleccionar, alSubir }) {
  function entrada({ clave, texto, detalle = null, activa = false, marca = null, alPulsar }) {
    return h('li', {},
      h('button', { type: 'button', class: `entrada${activa ? ' activa' : ''}`, dataset: { foco: clave }, 'aria-current': activa ? 'true' : null, onclick: alPulsar },
        marca,
        h('span', { class: 'entrada-texto' }, texto),
        detalle ? h('span', { class: 'entrada-detalle' }, detalle) : null));
  }

  function seccion(titulo, textoBoton, alCrear, entradas) {
    return h('section', { class: 'inventario-seccion' },
      h('div', { class: 'inventario-cabecera' }, h('h2', {}, titulo), h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: alCrear }, textoBoton)),
      entradas.length ? h('ul', { class: 'lista' }, entradas) : h('p', { class: 'vacio' }, 'Nada todavía.'));
  }

  function marcaAvisos(propios) {
    if (!propios.length) return h('span', { class: 'marca-vacia', 'aria-hidden': 'true' });
    return h('span', { class: 'aviso-gris', title: propios.map((a) => a.mensaje).join('\n'), 'aria-label': `${propios.length} aviso(s)`, role: 'img' }, '!');
  }

  function nuevaEscena() {
    const escena = sesion.cambiar((p) => agregarEscena(p, `Escena ${p.juego.escenas.length + 1}`), { origen: 'inventario', estructura: true });
    alSeleccionar({ tipo: 'escena', id: escena.id });
  }

  function nuevoPersonaje() {
    const personaje = sesion.cambiar((p) => agregarPersonaje(p, { nombre: `Personaje ${p.juego.personajes.length + 1}` }), { origen: 'inventario', estructura: true });
    alSeleccionar({ tipo: 'personaje', id: personaje.id });
  }

  function dibujar(seleccion) {
    const { juego } = sesion.proyecto;
    const avisos = validar(juego);
    const esActiva = (tipo, id) => seleccion?.tipo === tipo && seleccion.id === id;
    const escenaActiva = seleccion?.tipo === 'escena' ? seleccion.id : seleccion?.tipo === 'linea' ? seleccion.escena : null;
    conservarFoco(contenedor, () => {
      vaciar(contenedor).append(h('nav', { class: 'inventario', 'aria-label': 'Inventario' },
        h('ul', { class: 'lista' }, entrada({ clave: 'juego', texto: juego.titulo?.trim() || 'Sin título', detalle: 'El juego', activa: seleccion?.tipo === 'juego', alPulsar: () => alSeleccionar({ tipo: 'juego' }) })),
        seccion('Escenas', 'Nueva escena', nuevaEscena, juego.escenas.map((escena, i) => entrada({
          clave: `escena:${escena.id}`,
          texto: escena.nombre?.trim() || `Escena ${i + 1}`,
          detalle: escena.id === juego.escenaInicial ? 'inicial' : null,
          activa: escenaActiva === escena.id,
          marca: marcaAvisos(avisos.filter((a) => a.escena === escena.id)),
          alPulsar: () => alSeleccionar({ tipo: 'escena', id: escena.id }),
        }))),
        seccion('Personajes', 'Nuevo personaje', nuevoPersonaje, juego.personajes.map((personaje) => entrada({
          clave: `personaje:${personaje.id}`,
          texto: personaje.nombre?.trim() || 'Sin nombre',
          detalle: personaje.retrato ? null : 'sin retrato',
          activa: esActiva('personaje', personaje.id),
          marca: h('span', { class: 'punto-semaforo', dataset: { ficha: personaje.id } }),
          alPulsar: () => alSeleccionar({ tipo: 'personaje', id: personaje.id }),
        }))),
        seccion('Elementos', 'Subir archivo', alSubir, juego.elementos.map((elemento) => entrada({
          clave: `elemento:${elemento.id}`,
          texto: elemento.nombre?.trim() || 'Sin nombre',
          detalle: NOMBRES_TIPO[elemento.tipo],
          activa: esActiva('elemento', elemento.id),
          marca: h('span', { class: 'punto-semaforo', dataset: { ficha: elemento.id } }),
          alPulsar: () => alSeleccionar({ tipo: 'elemento', id: elemento.id }),
        }))),
      ));
    });
  }

  return { dibujar };
}
```

- [ ] **Step 5: Correr las pruebas para ver que pasan**

Run: `node --test tests/inventario.test.js`
Expected: `# pass 5`.

- [ ] **Step 6: Commit**

```bash
git add plataforma/js/editor/inventario.js tests/ayudas/sesion.js tests/inventario.test.js
git commit -m "Editor: inventario con El juego, escenas con avisos grises, personajes y elementos" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Guion de la escena activa y controles compartidos

**Files:**
- Create: `plataforma/js/editor/controles.js`
- Create: `plataforma/js/editor/guion.js`
- Create: `tests/guion.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/guion.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instalarDom, clic, escribir, textos } from './ayudas/dom.js';
import { sesionDePrueba } from './ayudas/sesion.js';
import { agregarEscena, agregarPersonaje, agregarLinea } from '../plataforma/js/estado/modelo.js';
import { crearGuion } from '../plataforma/js/editor/guion.js';

instalarDom();

function armar({ confirmar = () => true } = {}) {
  const { sesion, eventos } = sesionDePrueba();
  const p = sesion.proyecto;
  const muelle = p.juego.escenas[0];
  muelle.nombre = 'El muelle';
  const torre = agregarEscena(p, 'La torre');
  const ana = agregarPersonaje(p, { nombre: 'Ana' });
  const farero = agregarPersonaje(p, { nombre: 'El farero' });
  agregarLinea(muelle, 'narracion', { texto: 'Niebla.' });
  agregarLinea(muelle, 'dialogo', { personaje: ana.id, texto: '¿Quién?' });
  agregarLinea(muelle, 'decision', { texto: '¿Subes?', opciones: [{ texto: 'Sí', escena: torre.id }, { texto: 'No', escena: null }] });
  agregarLinea(muelle, 'narracion', { texto: 'Oculta.' });
  const selecciones = [];
  const contenedor = document.createElement('div');
  document.body.append(contenedor);
  const guion = crearGuion(contenedor, sesion, { alSeleccionar: (i) => selecciones.push(i), confirmar });
  const bloques = () => [...contenedor.querySelectorAll('li.linea')];
  const boton = (li, accion) => li.querySelector(`button[data-accion="${accion}"]`);
  return { sesion, eventos, p, muelle, torre, ana, farero, contenedor, guion, selecciones, bloques, boton };
}

test('dibuja un bloque por línea con su tipo y su texto, avisa de las líneas tras el corte y marca la seleccionada', () => {
  const { contenedor, guion, muelle, bloques } = armar();
  guion.dibujar(muelle, 1);
  assert.equal(contenedor.querySelector('h2').textContent, 'El muelle');
  assert.equal(contenedor.querySelector('.guion-cuenta').textContent, '4 línea(s)');
  assert.deepEqual(textos(contenedor, '.linea-tipo'), ['Narración', 'Diálogo', 'Decisión', 'Narración']);
  assert.deepEqual([...contenedor.querySelectorAll('textarea')].map((t) => t.value), ['Niebla.', '¿Quién?', '¿Subes?', 'Oculta.']);
  const lista = bloques();
  assert.equal(lista[1].getAttribute('aria-current'), 'true');
  assert.ok(lista[1].classList.contains('seleccionada'));
  assert.ok(lista[3].classList.contains('tras-corte'));
  assert.equal(lista[3].querySelector('.aviso-gris').textContent, 'no se verá');
  assert.equal(contenedor.querySelectorAll('.aviso-gris').length, 1);
  guion.dibujar(null);
  assert.equal(contenedor.querySelector('.vacio').textContent, 'Selecciona una escena para editar su guion.');
  contenedor.remove();
});

test('los botones «Línea» agregan cada tipo al final, el diálogo nuevo toma el primer personaje y se selecciona lo nuevo', () => {
  const { contenedor, guion, muelle, ana, eventos, selecciones } = armar();
  guion.dibujar(muelle);
  clic(contenedor.querySelector('button[data-agregar="dialogo"]'));
  assert.equal(muelle.lineas.length, 5);
  assert.equal(muelle.lineas[4].tipo, 'dialogo');
  assert.equal(muelle.lineas[4].personaje, ana.id);
  assert.deepEqual(eventos.at(-1), { tipo: 'cambio', origen: 'guion', estructura: true });
  assert.equal(selecciones.at(-1), 4);
  clic(contenedor.querySelector('button[data-agregar="fin"]'));
  assert.equal(muelle.lineas[5].tipo, 'fin');
  clic(contenedor.querySelector('button[data-agregar="decision"]'));
  assert.equal(muelle.lineas[6].opciones.length, 2);
  contenedor.remove();
});

test('escribir cambia el texto sin redibujar y avisa sin estructura; enfocar un bloque lo selecciona', () => {
  const { contenedor, guion, muelle, eventos, selecciones } = armar();
  guion.dibujar(muelle);
  const area = contenedor.querySelector('textarea');
  escribir(area, 'Niebla espesa.');
  assert.equal(muelle.lineas[0].texto, 'Niebla espesa.');
  assert.deepEqual(eventos.at(-1), { tipo: 'cambio', origen: 'guion', estructura: false });
  assert.equal(contenedor.querySelector('textarea'), area, 'el nodo sigue siendo el mismo');
  contenedor.querySelectorAll('textarea')[2].focus();
  assert.equal(selecciones.at(-1), 2);
  contenedor.remove();
});

test('subir y bajar mueven y seleccionan; los extremos se deshabilitan; eliminar pide confirmación', () => {
  const { contenedor, guion, muelle, bloques, boton, selecciones } = armar();
  guion.dibujar(muelle);
  assert.equal(boton(bloques()[0], 'subir').disabled, true);
  assert.equal(boton(bloques()[3], 'bajar').disabled, true);
  clic(boton(bloques()[0], 'bajar'));
  assert.deepEqual(muelle.lineas.map((l) => l.texto), ['¿Quién?', 'Niebla.', '¿Subes?', 'Oculta.']);
  assert.equal(selecciones.at(-1), 1);
  guion.dibujar(muelle, 1);
  clic(boton(bloques()[3], 'eliminar'));
  assert.equal(muelle.lineas.length, 3);
  assert.equal(selecciones.at(-1), 2, 'queda seleccionada la última');
  const { contenedor: otro, guion: guion2, muelle: muelle2, boton: boton2, bloques: bloques2 } = armar({ confirmar: () => false });
  guion2.dibujar(muelle2);
  clic(boton2(bloques2()[0], 'eliminar'));
  assert.equal(muelle2.lineas.length, 4, 'con «no» no se elimina');
  contenedor.remove();
  otro.remove();
});

test('el diálogo elige personaje; la decisión edita opciones y destinos y respeta el mínimo y el máximo', () => {
  const { contenedor, guion, muelle, torre, ana, farero, bloques } = armar();
  guion.dibujar(muelle);
  const personaje = bloques()[1].querySelector('select');
  assert.deepEqual(textos(personaje, 'option'), ['Elige un personaje', 'Ana', 'El farero']);
  assert.equal(personaje.value, ana.id);
  escribir(personaje, farero.id);
  assert.equal(muelle.lineas[1].personaje, farero.id);
  const decision = bloques()[2];
  assert.deepEqual([...decision.querySelectorAll('input.opcion-texto')].map((i) => i.value), ['Sí', 'No']);
  const destinos = [...decision.querySelectorAll('select')];
  assert.deepEqual(destinos.map((s) => s.value), [torre.id, '']);
  assert.deepEqual(textos(destinos[1], 'option'), ['Elige una escena', 'El muelle', 'La torre']);
  escribir(destinos[1], muelle.id);
  assert.equal(muelle.lineas[2].opciones[1].escena, muelle.id);
  escribir(decision.querySelector('input.opcion-texto'), 'Sí, ahora');
  assert.equal(muelle.lineas[2].opciones[0].texto, 'Sí, ahora');
  assert.equal(decision.querySelector('button[data-accion="quitar-opcion"]').disabled, true, 'con dos opciones no se puede quitar');
  clic(decision.querySelector('button[data-accion="agregar-opcion"]'));
  clic(decision.querySelector('button[data-accion="agregar-opcion"]'));
  assert.equal(muelle.lineas[2].opciones.length, 4);
  guion.dibujar(muelle);
  const decision2 = bloques()[2];
  assert.equal(decision2.querySelector('button[data-accion="agregar-opcion"]').disabled, true, 'con cuatro no se agrega');
  clic(decision2.querySelectorAll('button[data-accion="quitar-opcion"]')[3]);
  assert.equal(muelle.lineas[2].opciones.length, 3);
  contenedor.remove();
});

test('marcarSeleccion cambia la línea marcada sin redibujar', () => {
  const { contenedor, guion, muelle, bloques } = armar();
  guion.dibujar(muelle, 0);
  const antes = bloques();
  guion.marcarSeleccion(2);
  const despues = bloques();
  assert.equal(antes[2], despues[2], 'mismos nodos');
  assert.equal(despues[0].getAttribute('aria-current'), null);
  assert.equal(despues[2].getAttribute('aria-current'), 'true');
  assert.ok(despues[2].classList.contains('seleccionada'));
  contenedor.remove();
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/guion.test.js`
Expected: falla al importar `guion.js`.

- [ ] **Step 3: Escribir `plataforma/js/editor/controles.js`**

```js
// plataforma/js/editor/controles.js
// Controles de formulario que comparten el guion y el panel de propiedades.
// Cada uno devuelve un .campo con su etiqueta; data-foco permite conservar el foco al redibujar.
import { h } from '../ui/dom.js';

let contador = 0;
function idUnico(prefijo) {
  contador += 1;
  return `${prefijo}-${contador}`;
}

function campo(etiqueta, control, id) {
  return h('div', { class: 'campo' }, h('label', { for: id, class: 'campo-etiqueta' }, etiqueta), control);
}

/**
 * Lista desplegable. pares: [[valor, texto], ...]. Con sinOpcion (texto) hay una primera
 * opción vacía que vale null; con sinOpcion: null no la hay (el valor es obligatorio).
 */
export function selector(etiqueta, clave, pares, valor, alCambiar, { sinOpcion = 'Ninguno' } = {}) {
  const id = idUnico('sel');
  const select = h('select', { id, dataset: { foco: clave }, onchange: (e) => alCambiar(e.target.value || null) },
    sinOpcion === null ? null : h('option', { value: '' }, sinOpcion),
    pares.map(([v, texto]) => h('option', { value: v }, texto)));
  select.value = valor ?? ''; // un valor que ya no existe queda en ''
  return campo(etiqueta, select, id);
}

export function campoTexto(etiqueta, clave, valor, alCambiar, { placeholder = '' } = {}) {
  const id = idUnico('txt');
  return campo(etiqueta, h('input', { type: 'text', id, dataset: { foco: clave }, value: valor ?? '', placeholder, oninput: (e) => alCambiar(e.target.value) }), id);
}

export function areaTexto(etiqueta, clave, valor, alCambiar, { filas = 3, placeholder = '' } = {}) {
  const id = idUnico('area');
  return campo(etiqueta, h('textarea', { id, rows: filas, dataset: { foco: clave }, value: valor ?? '', placeholder, oninput: (e) => alCambiar(e.target.value) }), id);
}
```

- [ ] **Step 4: Escribir `plataforma/js/editor/guion.js`**

```js
// plataforma/js/editor/guion.js
// Columna central, abajo: el guion de la escena activa como bloques que se editan en
// el lugar. Se reordena con los botones de subir y bajar (teclado) y arrastrando.
// Escribir cambia el texto sin redibujar (origen 'guion', sin estructura); agregar,
// mover, quitar y cambiar el número de opciones redibujan (estructura).
import { h, vaciar, conservarFoco } from '../ui/dom.js';
import { agregarLinea, moverLinea, eliminarLinea, indiceCorte } from '../estado/modelo.js';
import { OPCIONES_MIN, OPCIONES_MAX } from '../estado/validacion.js';
import { selector } from './controles.js';

export const NOMBRES_LINEA = { narracion: 'Narración', dialogo: 'Diálogo', decision: 'Decisión', fin: 'Fin' };
const MARCADORES = {
  narracion: 'Lo que cuenta el narrador…',
  dialogo: 'Lo que dice el personaje…',
  decision: 'La pregunta que se le hace al jugador…',
  fin: 'El texto de cierre…',
};

/**
 * @param {HTMLElement} contenedor
 * @param {object} sesion de crearSesion
 * @param {{ alSeleccionar: (indice: number|null) => void, confirmar?: (mensaje: string) => boolean }} opciones
 */
export function crearGuion(contenedor, sesion, { alSeleccionar, confirmar = (mensaje) => window.confirm(mensaje) }) {
  let escenaId = null;

  const escenaActual = () => sesion.proyecto.juego.escenas.find((e) => e.id === escenaId) ?? null;
  const cambiar = (fn, estructura = false) => sesion.cambiar((proyecto) => fn(escenaActual(), proyecto), { origen: 'guion', estructura });

  function agregar(tipo) {
    const indice = cambiar((escena, proyecto) => {
      const datos = tipo === 'dialogo' ? { personaje: proyecto.juego.personajes[0]?.id ?? null } : {};
      agregarLinea(escena, tipo, datos);
      return escena.lineas.length - 1;
    }, true);
    alSeleccionar(indice);
  }

  function mover(indice, desplazamiento) {
    const destino = indice + desplazamiento;
    const largo = escenaActual()?.lineas.length ?? 0;
    if (destino < 0 || destino >= largo) return;
    cambiar((escena) => moverLinea(escena, indice, desplazamiento), true);
    alSeleccionar(destino);
  }

  function eliminar(indice) {
    if (!confirmar('¿Eliminar esta línea? No se puede deshacer.')) return;
    const restantes = cambiar((escena) => {
      eliminarLinea(escena, indice);
      return escena.lineas.length;
    }, true);
    alSeleccionar(restantes ? Math.min(indice, restantes - 1) : null);
  }

  function opciones(linea, i) {
    const destinos = sesion.proyecto.juego.escenas.map((e, k) => [e.id, e.nombre?.trim() || `Escena ${k + 1}`]);
    return h('div', { class: 'opciones' },
      linea.opciones.map((opcion, j) => h('div', { class: 'opcion-fila' },
        h('span', { class: 'opcion-numero', 'aria-hidden': 'true' }, String(j + 1)),
        h('input', { type: 'text', class: 'opcion-texto', dataset: { foco: `opcion:${i}:${j}` }, placeholder: `Opción ${j + 1}`, value: opcion.texto, 'aria-label': `Texto de la opción ${j + 1}`, oninput: (e) => cambiar(() => { opcion.texto = e.target.value; }) }),
        selector('Lleva a', `destino:${i}:${j}`, destinos, opcion.escena, (valor) => cambiar(() => { opcion.escena = valor; }), { sinOpcion: 'Elige una escena' }),
        h('button', { type: 'button', class: 'icono', dataset: { accion: 'quitar-opcion' }, 'aria-label': `Quitar la opción ${j + 1}`, disabled: linea.opciones.length <= OPCIONES_MIN, onclick: () => cambiar(() => { linea.opciones.splice(j, 1); }, true) }, '✕'))),
      h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'agregar-opcion' }, disabled: linea.opciones.length >= OPCIONES_MAX, onclick: () => cambiar(() => { linea.opciones.push({ texto: '', escena: null }); }, true) }, 'Agregar opción'));
  }

  function bloque(linea, i, { escena, juego, corte, seleccionada }) {
    const trasCorte = corte !== -1 && i > corte;
    const seleccionar = () => alSeleccionar(i);
    const accion = (nombre, texto, etiqueta, deshabilitado, alPulsar) =>
      h('button', { type: 'button', class: 'icono', dataset: { foco: `${nombre}:${i}`, accion: nombre }, 'aria-label': etiqueta, disabled: deshabilitado, onclick: (e) => { e.stopPropagation(); alPulsar(); } }, texto);
    const cabecera = h('div', { class: 'linea-cabecera' },
      h('span', { class: 'linea-asa', draggable: true, title: 'Arrastra para reordenar', 'aria-hidden': 'true', ondragstart: (e) => { e.dataTransfer?.setData('text/plain', String(i)); } }, '⋮⋮'),
      h('span', { class: `linea-tipo tipo-${linea.tipo}` }, NOMBRES_LINEA[linea.tipo]),
      trasCorte ? h('span', { class: 'aviso-gris', title: 'Está después de la decisión o el fin: nunca se verá.' }, 'no se verá') : null,
      h('span', { class: 'linea-acciones' },
        accion('subir', '▲', `Subir la línea ${i + 1}`, i === 0, () => mover(i, -1)),
        accion('bajar', '▼', `Bajar la línea ${i + 1}`, i === escena.lineas.length - 1, () => mover(i, 1)),
        accion('eliminar', '✕', `Eliminar la línea ${i + 1}`, false, () => eliminar(i))));
    const cuerpo = [];
    if (linea.tipo === 'dialogo') {
      cuerpo.push(selector('Personaje', `personaje:${i}`, juego.personajes.map((p) => [p.id, p.nombre?.trim() || 'Sin nombre']), linea.personaje, (valor) => cambiar(() => { linea.personaje = valor; }), { sinOpcion: 'Elige un personaje' }));
    }
    cuerpo.push(h('textarea', { class: 'linea-texto', rows: 2, dataset: { foco: `texto:${i}` }, placeholder: MARCADORES[linea.tipo], value: linea.texto, 'aria-label': `Texto de la línea ${i + 1}`, oninput: (e) => cambiar(() => { linea.texto = e.target.value; }), onfocus: seleccionar }));
    if (linea.tipo === 'decision') cuerpo.push(opciones(linea, i));
    return h('li', {
      class: `linea linea-${linea.tipo}${seleccionada ? ' seleccionada' : ''}${trasCorte ? ' tras-corte' : ''}`,
      dataset: { indice: String(i) },
      'aria-current': seleccionada ? 'true' : null,
      onclick: seleccionar,
      ondragover: (e) => e.preventDefault(),
      ondrop: (e) => {
        e.preventDefault();
        const origen = Number(e.dataTransfer?.getData('text/plain'));
        if (Number.isInteger(origen) && origen !== i) mover(origen, i - origen);
      },
    }, cabecera, cuerpo);
  }

  function dibujar(escena, indiceSeleccionado = null) {
    escenaId = escena?.id ?? null;
    conservarFoco(contenedor, () => {
      vaciar(contenedor);
      if (!escena) {
        contenedor.append(h('p', { class: 'vacio' }, 'Selecciona una escena para editar su guion.'));
        return;
      }
      const corte = indiceCorte(escena);
      const { juego } = sesion.proyecto;
      contenedor.append(h('section', { class: 'guion', 'aria-label': 'Guion de la escena' },
        h('div', { class: 'guion-cabecera' }, h('h2', {}, escena.nombre?.trim() || 'Escena sin nombre'), h('span', { class: 'guion-cuenta' }, `${escena.lineas.length} línea(s)`)),
        escena.lineas.length
          ? h('ol', { class: 'lineas' }, escena.lineas.map((linea, i) => bloque(linea, i, { escena, juego, corte, seleccionada: i === indiceSeleccionado })))
          : h('p', { class: 'vacio' }, 'Esta escena no tiene líneas. Agrega la primera con los botones de abajo.'),
        h('div', { class: 'guion-agregar', role: 'group', 'aria-label': 'Agregar línea' },
          h('span', { class: 'guion-etiqueta' }, 'Línea:'),
          Object.keys(NOMBRES_LINEA).map((tipo) => h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { agregar: tipo }, onclick: () => agregar(tipo) }, NOMBRES_LINEA[tipo])))));
    });
  }

  /** Cambia la línea marcada sin redibujar, para no perder el foco ni el cursor. */
  function marcarSeleccion(indice) {
    for (const nodo of contenedor.querySelectorAll('li.linea')) {
      const activa = Number(nodo.dataset.indice) === indice;
      nodo.classList.toggle('seleccionada', activa);
      if (activa) nodo.setAttribute('aria-current', 'true');
      else nodo.removeAttribute('aria-current');
    }
  }

  return { dibujar, marcarSeleccion };
}
```

- [ ] **Step 5: Correr las pruebas para ver que pasan**

Run: `node --test tests/guion.test.js`
Expected: `# pass 6`.

- [ ] **Step 6: Commit**

```bash
git add plataforma/js/editor/controles.js plataforma/js/editor/guion.js tests/guion.test.js
git commit -m "Editor: guion de la escena con bloques editables, reordenar, eliminar, opciones y controles compartidos" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Vista previa de la línea seleccionada

**Files:**
- Create: `plataforma/js/editor/vista-previa.js`
- Create: `tests/vista-previa.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/vista-previa.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instalarDom, textos } from './ayudas/dom.js';
import { sesionDePrueba } from './ayudas/sesion.js';
import { agregarEscena, agregarPersonaje, agregarElemento, agregarLinea } from '../plataforma/js/estado/modelo.js';
import { crearVistaPrevia } from '../plataforma/js/editor/vista-previa.js';

instalarDom();

async function armar() {
  const { sesion } = sesionDePrueba();
  const p = sesion.proyecto;
  const muelle = p.juego.escenas[0];
  const vacia = agregarEscena(p, 'Vacía');
  const ana = agregarPersonaje(p, { nombre: 'Ana' });
  const fondo = agregarElemento(p, { tipo: 'fondo', nombre: 'Muelle', archivo: 'm.png', origen: 'creado' });
  const retrato = agregarElemento(p, { tipo: 'retrato', nombre: 'Ana', archivo: 'a.png', origen: 'subido' });
  const bytes = new TextEncoder().encode('png').buffer;
  await sesion.agregarArchivo(fondo.id, { tipo: 'image/png', datos: bytes });
  await sesion.agregarArchivo(retrato.id, { tipo: 'image/webp', datos: bytes });
  ana.retrato = retrato.id;
  muelle.fondo = fondo.id;
  agregarLinea(muelle, 'narracion', { texto: 'Niebla.' });
  agregarLinea(muelle, 'dialogo', { personaje: ana.id, texto: '¿Quién?' });
  agregarLinea(muelle, 'decision', { texto: '¿Subes?', opciones: [{ texto: 'Sí', escena: vacia.id }, { texto: 'No', escena: null }] });
  const contenedor = document.createElement('div');
  const vista = crearVistaPrevia(contenedor, sesion);
  return { sesion, muelle, vacia, contenedor, vista };
}

test('dibuja la línea seleccionada con el fondo y el retrato que resuelve la sesión', async () => {
  const { contenedor, vista, muelle } = await armar();
  vista.dibujar(muelle, 1);
  assert.equal(contenedor.querySelector('.escenario-texto').textContent, '¿Quién?');
  assert.equal(contenedor.querySelector('.escenario-nombre').textContent, 'Ana');
  assert.equal(contenedor.querySelector('.escenario-fondo img').getAttribute('src'), 'blob:image/png');
  assert.ok(contenedor.querySelector('.escenario-fondo img').classList.contains('pixel'));
  assert.equal(contenedor.querySelector('.escenario-retrato img').getAttribute('src'), 'blob:image/webp');
  vista.dibujar(muelle, 2);
  assert.deepEqual(textos(contenedor, '.escenario-opciones button'), ['1 Sí', '2 No']);
});

test('sin índice muestra la primera línea; una escena vacía lo dice; sin escena hay un texto de ayuda', async () => {
  const { contenedor, vista, muelle, vacia } = await armar();
  vista.dibujar(muelle, null);
  assert.equal(contenedor.querySelector('.escenario-texto').textContent, 'Niebla.');
  vista.dibujar(vacia, 0);
  assert.equal(contenedor.querySelector('.escenario-texto').textContent, 'Esta escena no tiene líneas todavía.');
  vista.dibujar(null, null);
  assert.equal(contenedor.querySelector('.escenario'), null);
  assert.equal(contenedor.querySelector('.vacio').textContent, 'Selecciona una escena para ver cómo se verá.');
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/vista-previa.test.js`
Expected: falla al importar `vista-previa.js`.

- [ ] **Step 3: Escribir `plataforma/js/editor/vista-previa.js`**

```js
// plataforma/js/editor/vista-previa.js
// Columna central, arriba: la línea seleccionada tal como se verá en el juego, con la
// misma pantalla del reproductor (spec, sección 8: lo que se prueba es lo que se entrega).
import { crearPantalla } from '../motor/pantalla.js';
import { vistaDeLinea } from '../motor/partida.js';
import { h, vaciar } from '../ui/dom.js';

export function crearVistaPrevia(contenedor, sesion) {
  function dibujar(escena, indice) {
    vaciar(contenedor);
    if (!escena) {
      contenedor.append(h('p', { class: 'vacio' }, 'Selecciona una escena para ver cómo se verá.'));
      return;
    }
    const { juego } = sesion.proyecto;
    const zona = h('div', { class: 'vista-previa', role: 'img', 'aria-label': 'Vista previa de la línea seleccionada' });
    contenedor.append(zona);
    const pantalla = crearPantalla(zona, { juego, resolverRecurso: (id) => sesion.resolverRecurso(id) });
    pantalla.mostrar(vistaDeLinea(juego, escena, indice ?? 0));
  }
  return { dibujar };
}
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/vista-previa.test.js`
Expected: `# pass 2`.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/editor/vista-previa.js tests/vista-previa.test.js
git commit -m "Editor: vista previa de la línea seleccionada con la pantalla del reproductor" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: Panel de propiedades (columna derecha)

**Files:**
- Create: `plataforma/js/editor/propiedades.js`
- Create: `tests/propiedades.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/propiedades.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instalarDom, clic, escribir, textos } from './ayudas/dom.js';
import { sesionDePrueba } from './ayudas/sesion.js';
import { agregarEscena, agregarPersonaje, agregarElemento, agregarLinea } from '../plataforma/js/estado/modelo.js';
import { crearPropiedades } from '../plataforma/js/editor/propiedades.js';

instalarDom();

async function armar({ confirmar = () => true } = {}) {
  const { sesion, eventos } = sesionDePrueba();
  const p = sesion.proyecto;
  const muelle = p.juego.escenas[0];
  muelle.nombre = 'El muelle';
  const torre = agregarEscena(p, 'La torre');
  const ana = agregarPersonaje(p, { nombre: 'Ana', descripcion: 'Farera.' });
  const fondo = agregarElemento(p, { tipo: 'fondo', nombre: 'Muelle', archivo: 'm.png', origen: 'creado' });
  const retrato = agregarElemento(p, { tipo: 'retrato', nombre: 'Ana', archivo: 'a.png', origen: 'subido' });
  const tema = agregarElemento(p, { tipo: 'musica', nombre: 'Tema', archivo: 't.ogg', origen: 'subido' });
  const olas = agregarElemento(p, { tipo: 'efecto', nombre: 'Olas', archivo: 'o.wav', origen: 'subido' });
  const bytes = new TextEncoder().encode('x').buffer;
  await sesion.agregarArchivo(fondo.id, { tipo: 'image/png', datos: bytes });
  await sesion.agregarArchivo(tema.id, { tipo: 'audio/ogg', datos: bytes });
  agregarLinea(muelle, 'narracion', { texto: 'Niebla.' });
  agregarLinea(muelle, 'dialogo', { personaje: ana.id, texto: '¿Quién?' });
  const selecciones = [];
  const contenedor = document.createElement('div');
  document.body.append(contenedor);
  const propiedades = crearPropiedades(contenedor, sesion, {
    contenido: { campos: { destino: { breve: 'El destino delimita qué licencias sirven.' } } },
    alSeleccionar: (s) => selecciones.push(s),
    confirmar,
  });
  const etiquetas = () => textos(contenedor, '.campo-etiqueta');
  const control = (clave) => contenedor.querySelector(`[data-foco="${clave}"]`);
  return { sesion, eventos, p, muelle, torre, ana, fondo, retrato, tema, olas, contenedor, propiedades, selecciones, etiquetas, control };
}

test('El juego: título, estudiante, destino con ayuda del contenido y sinopsis', async () => {
  const { contenedor, propiedades, p, eventos, etiquetas, control } = await armar();
  propiedades.dibujar({ tipo: 'juego' });
  assert.equal(contenedor.querySelector('h2').textContent, 'El juego');
  assert.deepEqual(etiquetas(), ['Título', 'Nombre del estudiante', 'Destino del juego', 'Sinopsis']);
  assert.deepEqual(textos(control('destino'), 'option'), ['Uso personal', 'Publicarlo gratis', 'Venderlo']);
  assert.equal(control('destino').value, 'gratis');
  assert.equal(contenedor.querySelector('.ayuda').textContent, 'El destino delimita qué licencias sirven.');
  escribir(control('titulo'), 'El faro');
  assert.equal(p.juego.titulo, 'El faro');
  assert.deepEqual(eventos.at(-1), { tipo: 'cambio', origen: 'propiedades', estructura: false });
  escribir(control('sinopsis'), 'Una farera.');
  assert.equal(p.juego.sinopsis, 'Una farera.');
  escribir(control('estudiante'), 'Camila');
  assert.equal(p.estudiante, 'Camila');
  escribir(control('destino'), 'venta');
  assert.equal(p.juego.destino, 'venta');
  assert.deepEqual(eventos.at(-1), { tipo: 'cambio', origen: 'propiedades', estructura: true }, 'cambiar el destino recalcula todo');
  contenedor.remove();
});

test('Escena: nombre, fondo y música solo de su tipo, hacer inicial y eliminar con confirmación', async () => {
  const { contenedor, propiedades, p, muelle, torre, fondo, tema, selecciones, control } = await armar();
  propiedades.dibujar({ tipo: 'escena', id: torre.id });
  assert.deepEqual(textos(control('fondo'), 'option'), ['Ninguno', 'Muelle']);
  assert.deepEqual(textos(control('musica'), 'option'), ['Ninguno', 'Tema']);
  escribir(control('fondo'), fondo.id);
  escribir(control('musica'), tema.id);
  assert.equal(torre.fondo, fondo.id);
  assert.equal(torre.musica, tema.id);
  escribir(control('nombre'), 'La torre alta');
  assert.equal(torre.nombre, 'La torre alta');
  clic(contenedor.querySelector('button[data-accion="hacer-inicial"]'));
  assert.equal(p.juego.escenaInicial, torre.id);
  propiedades.dibujar({ tipo: 'escena', id: torre.id });
  assert.equal(contenedor.querySelector('button[data-accion="hacer-inicial"]', null), null, 'la inicial no ofrece hacerse inicial');
  assert.match(contenedor.querySelector('.ayuda').textContent, /escena inicial/);
  clic(contenedor.querySelector('button[data-accion="eliminar"]'));
  assert.deepEqual(p.juego.escenas.map((e) => e.id), [muelle.id]);
  assert.equal(p.juego.escenaInicial, muelle.id, 'eliminar la inicial pasa el inicio a la primera que queda');
  assert.deepEqual(selecciones.at(-1), null);
  contenedor.remove();
});

test('Línea: un diálogo elige personaje, efecto y voz; una narración solo informa', async () => {
  const { contenedor, propiedades, muelle, ana, olas, eventos, etiquetas, control } = await armar();
  propiedades.dibujar({ tipo: 'linea', escena: muelle.id, indice: 1 });
  assert.deepEqual(etiquetas(), ['Personaje', 'Efecto de sonido', 'Voz grabada']);
  assert.equal(control('personaje').value, ana.id);
  assert.deepEqual(textos(control('efecto'), 'option'), ['Ninguno', 'Olas']);
  assert.deepEqual(textos(control('voz'), 'option'), ['Ninguno']);
  escribir(control('efecto'), olas.id);
  assert.equal(muelle.lineas[1].efecto, olas.id);
  escribir(control('personaje'), '');
  assert.equal(muelle.lineas[1].personaje, null);
  assert.deepEqual(eventos.at(-1), { tipo: 'cambio', origen: 'propiedades', estructura: true }, 'el personaje se ve en el guion: redibuja');
  propiedades.dibujar({ tipo: 'linea', escena: muelle.id, indice: 0 });
  assert.deepEqual(etiquetas(), []);
  assert.match(contenedor.querySelector('.ayuda').textContent, /^Narración, línea 1 de 2/);
  contenedor.remove();
});

test('Personaje: nombre, descripción, retrato y eliminar', async () => {
  const { contenedor, propiedades, p, muelle, ana, retrato, selecciones, control } = await armar();
  propiedades.dibujar({ tipo: 'personaje', id: ana.id });
  assert.equal(control('nombre').value, 'Ana');
  assert.equal(control('descripcion').value, 'Farera.');
  assert.deepEqual(textos(control('retrato'), 'option'), ['Ninguno', 'Ana']);
  escribir(control('retrato'), retrato.id);
  assert.equal(ana.retrato, retrato.id);
  escribir(control('descripcion'), 'Farera en su primer turno.');
  assert.equal(ana.descripcion, 'Farera en su primer turno.');
  clic(contenedor.querySelector('button[data-accion="eliminar"]'));
  assert.deepEqual(p.juego.personajes, []);
  assert.equal(muelle.lineas[1].personaje, null, 'sus diálogos quedan sin personaje');
  assert.equal(p.fichas[ana.id], undefined);
  assert.deepEqual(selecciones.at(-1), null);
  contenedor.remove();
});

test('Elemento: muestra la imagen (pixelada si es creada) o el audio, el origen, y eliminar quita también el archivo', async () => {
  const { contenedor, propiedades, p, sesion, fondo, tema, retrato, control } = await armar();
  propiedades.dibujar({ tipo: 'elemento', id: fondo.id });
  assert.equal(contenedor.querySelector('h2').textContent, 'Fondo');
  const imagen = contenedor.querySelector('img.muestra');
  assert.equal(imagen.getAttribute('src'), 'blob:image/png');
  assert.ok(imagen.classList.contains('pixel'));
  assert.match(contenedor.querySelector('.ayuda').textContent, /Creado en la plataforma · m\.png/);
  escribir(control('nombre'), 'Muelle de noche');
  assert.equal(fondo.nombre, 'Muelle de noche');
  propiedades.dibujar({ tipo: 'elemento', id: tema.id });
  const audio = contenedor.querySelector('audio.muestra');
  assert.equal(audio.getAttribute('src'), 'blob:audio/ogg');
  assert.ok(audio.hasAttribute('controls'));
  propiedades.dibujar({ tipo: 'elemento', id: retrato.id });
  assert.equal(contenedor.querySelector('.muestra'), null);
  assert.match(contenedor.querySelector('.vacio').textContent, /No se encontró el archivo/);
  propiedades.dibujar({ tipo: 'elemento', id: fondo.id });
  clic(contenedor.querySelector('button[data-accion="eliminar"]'));
  await sesion.esperarGuardado();
  assert.equal(p.juego.elementos.find((e) => e.id === fondo.id), undefined);
  assert.equal(p.fichas[fondo.id], undefined);
  assert.equal(sesion.archivos.has(fondo.id), false);
  contenedor.remove();
});

test('sin selección, o con algo que ya no existe, muestra textos de vacío', async () => {
  const { contenedor, propiedades } = await armar();
  propiedades.dibujar(null);
  assert.match(contenedor.querySelector('.vacio').textContent, /Selecciona algo/);
  propiedades.dibujar({ tipo: 'escena', id: 'esc_fantasma' });
  assert.match(contenedor.querySelector('.vacio').textContent, /ya no existe/);
  propiedades.dibujar({ tipo: 'linea', escena: 'esc_fantasma', indice: 0 });
  assert.match(contenedor.querySelector('.vacio').textContent, /ya no existe/);
  propiedades.dibujar({ tipo: 'personaje', id: 'per_x' });
  assert.match(contenedor.querySelector('.vacio').textContent, /ya no existe/);
  propiedades.dibujar({ tipo: 'elemento', id: 'el_x' });
  assert.match(contenedor.querySelector('.vacio').textContent, /ya no existe/);
  contenedor.remove();
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/propiedades.test.js`
Expected: falla al importar `propiedades.js`.

- [ ] **Step 3: Escribir `plataforma/js/editor/propiedades.js`**

```js
// plataforma/js/editor/propiedades.js
// Columna derecha: propiedades de lo seleccionado (el juego, una escena, una línea, un
// personaje o un elemento). El plan 3 agrega aquí la ficha jurídica de elementos,
// personajes, título e historia. Los textos cambian sin redibujar (origen 'propiedades');
// lo que se ve en otras columnas (destino, personaje de la línea, escena inicial,
// eliminar) redibuja (estructura).
import { h, vaciar, conservarFoco } from '../ui/dom.js';
import { DESTINOS, eliminarEscena, eliminarPersonaje, eliminarElemento } from '../estado/modelo.js';
import { selector, campoTexto, areaTexto } from './controles.js';
import { NOMBRES_TIPO } from './inventario.js';
import { NOMBRES_LINEA } from './guion.js';

export const NOMBRES_DESTINO = { personal: 'Uso personal', gratis: 'Publicarlo gratis', venta: 'Venderlo' };
const NOMBRES_ORIGEN = { creado: 'Creado en la plataforma', subido: 'Subido', biblioteca: 'De la biblioteca' };

/**
 * @param {HTMLElement} contenedor
 * @param {object} sesion de crearSesion
 * @param {{ contenido?: object|null, alSeleccionar: (seleccion: object|null) => void, confirmar?: (mensaje: string) => boolean }} opciones
 *   contenido es el JSON de contenido/juridico.json (para la ayuda del destino); puede faltar.
 */
export function crearPropiedades(contenedor, sesion, { contenido = null, alSeleccionar, confirmar = (mensaje) => window.confirm(mensaje) }) {
  const cambiar = (fn, estructura = false) => sesion.cambiar(fn, { origen: 'propiedades', estructura });
  const nombreDe = (cosa, alternativa) => cosa.nombre?.trim() || alternativa;
  const elementosDe = (tipo) => sesion.proyecto.juego.elementos.filter((e) => e.tipo === tipo).map((e) => [e.id, nombreDe(e, 'Sin nombre')]);
  const panel = (titulo, ...hijos) => h('section', { class: 'propiedades', 'aria-label': `Propiedades: ${titulo}` }, h('h2', {}, titulo), hijos);
  const noExiste = (titulo, que) => panel(titulo, h('p', { class: 'vacio' }, `${que} ya no existe.`));
  const botonEliminar = (texto, mensaje, fn) => h('button', { type: 'button', class: 'btn btn-ghost btn-sm peligro', dataset: { accion: 'eliminar' }, onclick: () => {
    if (!confirmar(mensaje)) return;
    fn();
    alSeleccionar(null);
  } }, texto);

  function deJuego() {
    const proyecto = sesion.proyecto;
    const { juego } = proyecto;
    const ayudaDestino = contenido?.campos?.destino?.breve ?? '';
    return panel('El juego',
      campoTexto('Título', 'titulo', juego.titulo, (v) => cambiar((p) => { p.juego.titulo = v; })),
      campoTexto('Nombre del estudiante', 'estudiante', proyecto.estudiante, (v) => cambiar((p) => { p.estudiante = v; })),
      selector('Destino del juego', 'destino', DESTINOS.map((d) => [d, NOMBRES_DESTINO[d]]), juego.destino, (v) => cambiar((p) => { p.juego.destino = v; }, true), { sinOpcion: null }),
      ayudaDestino ? h('p', { class: 'ayuda' }, ayudaDestino) : null,
      areaTexto('Sinopsis', 'sinopsis', juego.sinopsis, (v) => cambiar((p) => { p.juego.sinopsis = v; }), { filas: 4, placeholder: 'De qué trata el juego, en dos o tres líneas.' }));
  }

  function deEscena(id) {
    const { juego } = sesion.proyecto;
    const k = juego.escenas.findIndex((e) => e.id === id);
    const escena = juego.escenas[k];
    if (!escena) return noExiste('Escena', 'Esta escena');
    const esInicial = juego.escenaInicial === escena.id;
    return panel('Escena',
      campoTexto('Nombre', 'nombre', escena.nombre, (v) => cambiar(() => { escena.nombre = v; })),
      selector('Fondo', 'fondo', elementosDe('fondo'), escena.fondo, (v) => cambiar(() => { escena.fondo = v; })),
      selector('Música', 'musica', elementosDe('musica'), escena.musica, (v) => cambiar(() => { escena.musica = v; })),
      h('p', { class: 'ayuda' }, esInicial ? 'Es la escena inicial: el juego empieza aquí.' : 'El juego no empieza aquí.'),
      h('div', { class: 'acciones' },
        esInicial ? null : h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'hacer-inicial' }, onclick: () => cambiar((p) => { p.juego.escenaInicial = escena.id; }, true) }, 'Hacer inicial'),
        botonEliminar('Eliminar escena', `¿Eliminar la escena «${nombreDe(escena, `Escena ${k + 1}`)}» con todas sus líneas?`, () => cambiar((p) => eliminarEscena(p, escena.id), true))));
  }

  function deLinea(escenaId, indice) {
    const { juego } = sesion.proyecto;
    const escena = juego.escenas.find((e) => e.id === escenaId);
    const linea = escena?.lineas[indice];
    if (!linea) return noExiste('Línea', 'Esta línea');
    const hijos = [h('p', { class: 'ayuda' }, `${NOMBRES_LINEA[linea.tipo]}, línea ${indice + 1} de ${escena.lineas.length}. El texto se edita en el guion.`)];
    if (linea.tipo === 'dialogo') {
      hijos.push(
        selector('Personaje', 'personaje', juego.personajes.map((p) => [p.id, nombreDe(p, 'Sin nombre')]), linea.personaje, (v) => cambiar(() => { linea.personaje = v; }, true), { sinOpcion: 'Elige un personaje' }),
        selector('Efecto de sonido', 'efecto', elementosDe('efecto'), linea.efecto, (v) => cambiar(() => { linea.efecto = v; })),
        selector('Voz grabada', 'voz', elementosDe('voz'), linea.voz, (v) => cambiar(() => { linea.voz = v; })));
    }
    return panel('Línea', hijos);
  }

  function dePersonaje(id) {
    const { juego } = sesion.proyecto;
    const personaje = juego.personajes.find((p) => p.id === id);
    if (!personaje) return noExiste('Personaje', 'Este personaje');
    return panel('Personaje',
      campoTexto('Nombre', 'nombre', personaje.nombre, (v) => cambiar(() => { personaje.nombre = v; })),
      areaTexto('Descripción corta', 'descripcion', personaje.descripcion, (v) => cambiar(() => { personaje.descripcion = v; }), { filas: 2 }),
      selector('Retrato', 'retrato', elementosDe('retrato'), personaje.retrato, (v) => cambiar(() => { personaje.retrato = v; })),
      h('div', { class: 'acciones' },
        botonEliminar('Eliminar personaje', `¿Eliminar a «${nombreDe(personaje, 'Sin nombre')}»? Sus diálogos quedarán sin personaje.`, () => cambiar((p) => eliminarPersonaje(p, personaje.id), true))));
  }

  function deElemento(id) {
    const { juego } = sesion.proyecto;
    const elemento = juego.elementos.find((e) => e.id === id);
    if (!elemento) return noExiste('Elemento', 'Este elemento');
    const url = sesion.resolverRecurso(elemento.id);
    const esImagen = elemento.tipo === 'fondo' || elemento.tipo === 'retrato';
    let muestra;
    if (!url) muestra = h('p', { class: 'vacio' }, 'No se encontró el archivo de este elemento.');
    else if (esImagen) muestra = h('img', { class: `muestra${elemento.origen === 'creado' ? ' pixel' : ''}`, src: url, alt: `Vista de ${nombreDe(elemento, 'el elemento')}` });
    else muestra = h('audio', { class: 'muestra', controls: true, preload: 'none', src: url });
    return panel(NOMBRES_TIPO[elemento.tipo],
      campoTexto('Nombre', 'nombre', elemento.nombre, (v) => cambiar(() => { elemento.nombre = v; })),
      h('p', { class: 'ayuda' }, `${NOMBRES_ORIGEN[elemento.origen]} · ${elemento.archivo}`),
      muestra,
      h('div', { class: 'acciones' },
        botonEliminar('Eliminar elemento', `¿Eliminar «${nombreDe(elemento, 'Sin nombre')}»? Las escenas, personajes y líneas que lo usan quedarán sin él.`, () => {
          cambiar((p) => eliminarElemento(p, elemento.id), true);
          sesion.quitarArchivo(elemento.id).catch(() => {});
        })));
  }

  function dibujar(seleccion) {
    conservarFoco(contenedor, () => {
      vaciar(contenedor);
      if (!seleccion) {
        contenedor.append(h('p', { class: 'vacio' }, 'Selecciona algo del inventario o del guion para ver sus propiedades.'));
        return;
      }
      const vistas = {
        juego: () => deJuego(),
        escena: () => deEscena(seleccion.id),
        linea: () => deLinea(seleccion.escena, seleccion.indice),
        personaje: () => dePersonaje(seleccion.id),
        elemento: () => deElemento(seleccion.id),
      };
      contenedor.append(vistas[seleccion.tipo]());
    });
  }

  return { dibujar };
}
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/propiedades.test.js`
Expected: `# pass 6`.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/editor/propiedades.js tests/propiedades.test.js
git commit -m "Editor: panel de propiedades del juego, escenas, líneas, personajes y elementos" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 13: Barra superior con Publicar y candado

**Files:**
- Create: `tests/ayudas/proyecto.js`
- Create: `plataforma/js/editor/barra.js`
- Create: `tests/barra.test.js`

- [ ] **Step 1: Escribir la ayuda `tests/ayudas/proyecto.js`**

Es el mismo proyecto publicable de `tests/integracion.test.js`, sacado a una ayuda para reutilizarlo (la prueba de integración puede seguir con su copia).

```js
// tests/ayudas/proyecto.js
// Un proyecto que cumple el mínimo, con todas las fichas en verde y sin avisos bloqueantes.
import { crearProyecto, agregarEscena, agregarPersonaje, agregarElemento, agregarLinea } from '../../plataforma/js/estado/modelo.js';

export function proyectoPublicable() {
  const p = crearProyecto({ estudiante: 'Camila R.', titulo: 'La llave del faro', destino: 'gratis' });
  const muelle = p.juego.escenas[0];
  muelle.nombre = 'El muelle';
  const torre = agregarEscena(p, 'La torre');
  const amanecer = agregarEscena(p, 'Amanecer');
  const ana = agregarPersonaje(p, { nombre: 'Ana' });
  const farero = agregarPersonaje(p, { nombre: 'El farero' });
  const bytes = (texto) => new TextEncoder().encode(texto).buffer;
  const archivos = new Map();
  const elemento = (datos) => {
    const e = agregarElemento(p, datos);
    archivos.set(e.id, { tipo: 'application/octet-stream', datos: bytes(e.nombre) });
    return e;
  };
  ana.retrato = elemento({ tipo: 'retrato', nombre: 'Ana', archivo: 'ana.png', origen: 'creado' }).id;
  farero.retrato = elemento({ tipo: 'retrato', nombre: 'Farero', archivo: 'farero.png', origen: 'creado' }).id;
  muelle.fondo = elemento({ tipo: 'fondo', nombre: 'Muelle', archivo: 'muelle.png', origen: 'creado' }).id;
  const tema = elemento({ tipo: 'musica', nombre: 'Tema', archivo: 'tema.ogg', origen: 'biblioteca', biblioteca: { id: 'bib_m1', autor: 'Autora Ejemplo', licencia: 'CC-BY-NC-4.0', creditoSugerido: '«Tema» de Autora Ejemplo, CC BY-NC 4.0' } });
  muelle.musica = tema.id;
  p.fichas[tema.id].licenciaLeida = true;
  const olas = elemento({ tipo: 'efecto', nombre: 'Olas', archivo: 'olas.wav', origen: 'creado' });
  agregarLinea(muelle, 'dialogo', { personaje: ana.id, texto: '¿Quién dejó la puerta abierta?', efecto: olas.id });
  agregarLinea(muelle, 'decision', { texto: '¿Subes a la torre?', opciones: [{ texto: 'Sí', escena: torre.id }, { texto: 'No', escena: amanecer.id }] });
  agregarLinea(torre, 'fin', { texto: 'Fin' });
  agregarLinea(amanecer, 'fin', { texto: 'Amanece.' });
  return { p, archivos, tema, muelle, torre, amanecer, ana, farero, olas };
}
```

- [ ] **Step 2: Escribir las pruebas que fallan**

```js
// tests/barra.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instalarDom, clic, textos } from './ayudas/dom.js';
import { sesionDePrueba } from './ayudas/sesion.js';
import { proyectoPublicable } from './ayudas/proyecto.js';
import { agregarLinea } from '../plataforma/js/estado/modelo.js';
import { crearBarra } from '../plataforma/js/editor/barra.js';

instalarDom();

function armar(proyecto) {
  const { sesion } = sesionDePrueba(proyecto);
  const llamadas = [];
  const contenedor = document.createElement('div');
  document.body.append(contenedor);
  const barra = crearBarra(contenedor, sesion, {
    alJugar: () => llamadas.push('jugar'),
    alGuardarCopia: () => llamadas.push('guardar-copia'),
    alAbrirCopia: () => llamadas.push('abrir-copia'),
    alNuevoJuego: () => llamadas.push('nuevo-juego'),
    alPublicar: () => llamadas.push('publicar'),
  });
  const boton = (accion) => contenedor.querySelector(`button[data-accion="${accion}"]`);
  return { sesion, contenedor, barra, llamadas, boton };
}

test('muestra título y estudiante (o sus alternativas) y cada botón llama a su manejador', () => {
  const { sesion, contenedor, barra, llamadas, boton } = armar();
  barra.dibujar();
  assert.equal(contenedor.querySelector('.barra-juego').textContent, 'La llave del faro');
  assert.equal(contenedor.querySelector('.barra-estudiante').textContent, 'Camila R.');
  for (const accion of ['jugar', 'guardar-copia', 'abrir-copia', 'nuevo-juego']) clic(boton(accion));
  assert.deepEqual(llamadas, ['jugar', 'guardar-copia', 'abrir-copia', 'nuevo-juego']);
  sesion.proyecto.juego.titulo = ' ';
  sesion.proyecto.estudiante = '';
  barra.dibujar();
  assert.equal(contenedor.querySelector('.barra-juego').textContent, 'Sin título');
  assert.equal(contenedor.querySelector('.barra-estudiante').textContent, 'Sin nombre');
  contenedor.remove();
});

test('Publicar lleva candado y dice qué falta mientras no se cumplan las condiciones; no publica', () => {
  const { contenedor, barra, llamadas, boton } = armar();
  barra.dibujar();
  const publicar = boton('publicar');
  assert.equal(publicar.getAttribute('aria-disabled'), 'true');
  assert.ok(publicar.querySelector('.candado'));
  assert.equal(publicar.getAttribute('aria-describedby'), 'publicar-falta');
  const falta = contenedor.querySelector('#publicar-falta');
  assert.match(falta.querySelector('p').textContent, /^Falta para publicar \(7\)/);
  const motivos = textos(falta, 'li');
  assert.ok(motivos.includes('Escenas: 1 de 3.'));
  assert.ok(motivos.includes('Personajes con retrato: 0 de 2.'));
  clic(publicar);
  assert.deepEqual(llamadas, []);
  contenedor.remove();
});

test('con más de ocho motivos resume el resto; con un proyecto publicable se abre y publica', () => {
  const { sesion, contenedor, barra } = armar();
  sesion.proyecto.juego.titulo = '';
  agregarLinea(sesion.proyecto.juego.escenas[0], 'dialogo', { personaje: null, texto: 'x' });
  barra.dibujar();
  assert.equal(contenedor.querySelectorAll('#publicar-falta li').length, 8);
  assert.equal(contenedor.querySelector('#publicar-falta p:last-child').textContent, 'y 1 más.');
  contenedor.remove();

  const { p } = proyectoPublicable();
  const listo = armar(p);
  listo.barra.dibujar();
  const publicar = listo.boton('publicar');
  assert.equal(publicar.getAttribute('aria-disabled'), null);
  assert.equal(publicar.querySelector('.candado'), null);
  assert.equal(listo.contenedor.querySelector('#publicar-falta').textContent, 'Todo listo para publicar.');
  clic(publicar);
  assert.deepEqual(listo.llamadas, ['publicar']);
  listo.contenedor.remove();
});
```

- [ ] **Step 3: Correr las pruebas para ver que fallan**

Run: `node --test tests/barra.test.js`
Expected: falla al importar `barra.js`.

- [ ] **Step 4: Escribir `plataforma/js/editor/barra.js`**

```js
// plataforma/js/editor/barra.js
// Barra superior: título del juego y nombre del estudiante; Jugar, Guardar copia,
// Abrir copia, Nuevo juego y Publicar. Publicar lleva candado hasta que puedePublicar
// diga que sí; al pasar el cursor o enfocarlo, dice qué falta (la lista se muestra con
// CSS en :hover y :focus-within). «Mapa de activos» llega con el plan 3.
import { h, vaciar, conservarFoco } from '../ui/dom.js';
import { puedePublicar } from '../estado/validacion.js';

const MAXIMO_MOTIVOS = 8;

export function crearBarra(contenedor, sesion, { alJugar, alGuardarCopia, alAbrirCopia, alNuevoJuego, alPublicar }) {
  const boton = (accion, texto, alPulsar, clase = 'btn-ghost') =>
    h('button', { type: 'button', class: `btn ${clase} btn-sm`, dataset: { foco: accion, accion }, onclick: alPulsar }, texto);

  function queFalta(decision) {
    if (decision.ok) return 'Todo listo para publicar.';
    const motivos = decision.motivos.map((m) => m.mensaje);
    const visibles = motivos.slice(0, MAXIMO_MOTIVOS);
    const resto = motivos.length - visibles.length;
    return [
      h('p', {}, `Falta para publicar (${motivos.length}):`),
      h('ul', {}, visibles.map((m) => h('li', {}, m))),
      resto > 0 ? h('p', {}, `y ${resto} más.`) : null,
    ];
  }

  function dibujar() {
    const proyecto = sesion.proyecto;
    const decision = puedePublicar(proyecto);
    conservarFoco(contenedor, () => {
      vaciar(contenedor).append(h('header', { class: 'barra' },
        h('div', { class: 'barra-titulo' },
          h('span', { class: 'barra-juego' }, proyecto.juego.titulo?.trim() || 'Sin título'),
          h('span', { class: 'barra-estudiante' }, proyecto.estudiante?.trim() || 'Sin nombre')),
        h('div', { class: 'barra-acciones' },
          boton('jugar', 'Jugar', alJugar, 'btn-primary'),
          boton('guardar-copia', 'Guardar copia', alGuardarCopia),
          boton('abrir-copia', 'Abrir copia', alAbrirCopia),
          boton('nuevo-juego', 'Nuevo juego', alNuevoJuego),
          h('span', { class: 'publicar' },
            h('button', {
              type: 'button',
              class: `btn btn-sm ${decision.ok ? 'btn-primary' : 'btn-ghost con-candado'}`,
              dataset: { foco: 'publicar', accion: 'publicar' },
              'aria-describedby': 'publicar-falta',
              'aria-disabled': decision.ok ? null : 'true',
              onclick: () => { if (decision.ok) alPublicar(); },
            }, decision.ok ? null : h('span', { class: 'candado', 'aria-hidden': 'true' }, '🔒'), 'Publicar'),
            h('div', { id: 'publicar-falta', class: 'publicar-falta', role: 'tooltip' }, queFalta(decision))))));
    });
  }

  return { dibujar };
}
```

- [ ] **Step 5: Correr las pruebas para ver que pasan**

Run: `node --test tests/barra.test.js`
Expected: `# pass 3`.

- [ ] **Step 6: Commit**

```bash
git add tests/ayudas/proyecto.js plataforma/js/editor/barra.js tests/barra.test.js
git commit -m "Editor: barra superior con Jugar, copias, Nuevo juego y Publicar con candado" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 14: Capacidades del navegador y pantalla de arranque

**Files:**
- Create: `plataforma/js/ui/capacidades.js`
- Create: `plataforma/js/editor/inicio.js`
- Create: `tests/capacidades.test.js`
- Create: `tests/inicio.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/capacidades.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comprobar, NAVEGADORES } from '../plataforma/js/ui/capacidades.js';

const completa = () => ({ indexedDB: {}, crypto: { subtle: {} }, URL: { createObjectURL: () => 'blob:' }, Blob: class {}, JSZip: class {} });

test('con todo lo necesario la comprobación pasa', () => {
  assert.deepEqual(comprobar(completa()), { ok: true, faltantes: [] });
  assert.match(NAVEGADORES, /Chrome/);
});

test('enumera lo que falta con un texto para el estudiante', () => {
  const ventana = completa();
  delete ventana.indexedDB;
  delete ventana.JSZip;
  ventana.crypto = {};
  const resultado = comprobar(ventana);
  assert.equal(resultado.ok, false);
  assert.deepEqual(resultado.faltantes, [
    'guardar en el navegador (IndexedDB)',
    'calcular huellas (Web Crypto; hace falta HTTPS o localhost)',
    'comprimir copias (JSZip no cargó)',
  ]);
});
```

```js
// tests/inicio.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instalarDom, clic, escribir, textos } from './ayudas/dom.js';
import { crearInicio } from '../plataforma/js/editor/inicio.js';

instalarDom();

function armar() {
  const llamadas = [];
  const contenedor = document.createElement('div');
  document.body.append(contenedor);
  const inicio = crearInicio(contenedor, {
    nombreProducto: 'Mi primer videojuego',
    contenido: { aviso: 'Material educativo.', campos: { destino: { breve: 'El destino delimita qué licencias sirven.' } } },
    alEmpezar: (datos) => llamadas.push(['empezar', datos]),
    alAbrirCopia: () => llamadas.push(['abrir-copia']),
  });
  return { contenedor, inicio, llamadas };
}

test('explica qué se hace, qué se entrega y que nada sale del navegador; pide nombre, título y destino', () => {
  const { contenedor, inicio } = armar();
  inicio.dibujar();
  assert.equal(contenedor.querySelector('h1').textContent, 'Mi primer videojuego');
  const parrafos = textos(contenedor, '.inicio-explicacion p');
  assert.equal(parrafos.length, 3);
  assert.match(parrafos[0], /aventura narrativa/);
  assert.match(parrafos[1], /paquete/);
  assert.match(parrafos[2], /^Nada sale de tu navegador/);
  assert.equal(contenedor.querySelector('.aviso-legal').textContent, 'Material educativo.');
  assert.deepEqual(textos(contenedor, 'label.campo-etiqueta'), ['Tu nombre', 'Título del juego']);
  assert.equal(contenedor.querySelector('legend').textContent, 'Destino del juego');
  assert.deepEqual(textos(contenedor, '.opcion-nombre'), ['Uso personal', 'Publicarlo gratis', 'Venderlo']);
  assert.equal(contenedor.querySelector('input[name="destino"]:checked').value, 'gratis');
  assert.equal(contenedor.querySelector('.ayuda').textContent, 'El destino delimita qué licencias sirven.');
  assert.equal(document.activeElement, contenedor.querySelector('#inicio-estudiante'), 'el foco arranca en el nombre');
  contenedor.remove();
});

test('Empezar exige el nombre; con nombre llama a alEmpezar con los datos recortados y el destino elegido', () => {
  const { contenedor, inicio, llamadas } = armar();
  inicio.dibujar();
  const formulario = contenedor.querySelector('form');
  formulario.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  assert.deepEqual(llamadas, []);
  const error = contenedor.querySelector('.inicio-error');
  assert.equal(error.hidden, false);
  assert.equal(error.textContent, 'Escribe tu nombre para empezar.');
  escribir(contenedor.querySelector('#inicio-estudiante'), '  Camila R. ');
  escribir(contenedor.querySelector('#inicio-titulo'), ' La llave del faro ');
  contenedor.querySelector('input[name="destino"][value="venta"]').checked = true;
  formulario.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  assert.deepEqual(llamadas, [['empezar', { estudiante: 'Camila R.', titulo: 'La llave del faro', destino: 'venta' }]]);
  assert.equal(error.hidden, true);
  contenedor.remove();
});

test('Abrir una copia avisa; mostrarError muestra un mensaje', () => {
  const { contenedor, inicio, llamadas } = armar();
  inicio.dibujar();
  clic(contenedor.querySelector('button[data-accion="abrir-copia"]'));
  assert.deepEqual(llamadas, [['abrir-copia']]);
  inicio.mostrarError('La copia está dañada.');
  assert.equal(contenedor.querySelector('.inicio-error').textContent, 'La copia está dañada.');
  contenedor.remove();
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/capacidades.test.js tests/inicio.test.js`
Expected: fallan al importar.

- [ ] **Step 3: Escribir `plataforma/js/ui/capacidades.js`**

```js
// plataforma/js/ui/capacidades.js
// Lo que la plataforma necesita del navegador (spec, secciones 16 y 17). Se comprueba
// al arrancar; si falta algo, la pantalla de inicio lo dice y lista los navegadores.
export const NAVEGADORES = 'Chrome, Edge o Firefox de escritorio actualizados en el último año; Safari de escritorio o iPad. En celular solo se juega.';

export function comprobar(ventana = globalThis) {
  const faltantes = [];
  if (!ventana.indexedDB) faltantes.push('guardar en el navegador (IndexedDB)');
  if (!ventana.crypto?.subtle) faltantes.push('calcular huellas (Web Crypto; hace falta HTTPS o localhost)');
  if (typeof ventana.URL?.createObjectURL !== 'function') faltantes.push('mostrar archivos (URL.createObjectURL)');
  if (typeof ventana.Blob !== 'function') faltantes.push('manejar archivos (Blob)');
  if (!ventana.JSZip) faltantes.push('comprimir copias (JSZip no cargó)');
  return { ok: faltantes.length === 0, faltantes };
}
```

- [ ] **Step 4: Escribir `plataforma/js/editor/inicio.js`**

```js
// plataforma/js/editor/inicio.js
// Pantalla de arranque (spec, sección 3, paso 1): qué va a hacer el estudiante, qué va
// a entregar y que nada sale del navegador. Pide nombre, título y destino, o abre una copia.
import { h, vaciar } from '../ui/dom.js';
import { DESTINOS } from '../estado/modelo.js';
import { NOMBRES_DESTINO } from './propiedades.js';

const EXPLICACION_DESTINO = {
  personal: 'Solo tú lo juegas.',
  gratis: 'Lo publicas sin cobrar.',
  venta: 'Lo vendes o lo monetizas.',
};

export function crearInicio(contenedor, { nombreProducto, contenido = null, alEmpezar, alAbrirCopia }) {
  let error = null;

  function mostrarError(mensaje) {
    if (!error) return;
    error.textContent = mensaje;
    error.hidden = !mensaje;
  }

  function dibujar() {
    const estudiante = h('input', { type: 'text', id: 'inicio-estudiante', name: 'estudiante', autocomplete: 'name', maxlength: '80' });
    const titulo = h('input', { type: 'text', id: 'inicio-titulo', name: 'titulo', maxlength: '120', placeholder: 'Puedes cambiarlo después' });
    const radios = DESTINOS.map((destino) => h('input', { type: 'radio', name: 'destino', value: destino, checked: destino === 'gratis' }));
    error = h('p', { class: 'inicio-error', role: 'alert', hidden: true });
    const ayudaDestino = contenido?.campos?.destino?.breve ?? '';

    const formulario = h('form', { class: 'inicio-formulario', novalidate: true, onsubmit: (evento) => {
      evento.preventDefault();
      const nombre = estudiante.value.trim();
      if (!nombre) {
        mostrarError('Escribe tu nombre para empezar.');
        estudiante.focus();
        return;
      }
      mostrarError('');
      alEmpezar({ estudiante: nombre, titulo: titulo.value.trim(), destino: radios.find((r) => r.checked)?.value ?? 'gratis' });
    } },
      h('div', { class: 'campo' }, h('label', { for: 'inicio-estudiante', class: 'campo-etiqueta' }, 'Tu nombre'), estudiante),
      h('div', { class: 'campo' }, h('label', { for: 'inicio-titulo', class: 'campo-etiqueta' }, 'Título del juego'), titulo),
      h('fieldset', { class: 'destinos' },
        h('legend', {}, 'Destino del juego'),
        DESTINOS.map((destino, i) => h('label', { class: 'opcion-destino' }, radios[i], h('span', { class: 'opcion-nombre' }, NOMBRES_DESTINO[destino]), h('span', { class: 'opcion-explicacion' }, EXPLICACION_DESTINO[destino]))),
        ayudaDestino ? h('p', { class: 'ayuda' }, ayudaDestino) : null),
      error,
      h('div', { class: 'acciones' },
        h('button', { type: 'submit', class: 'btn btn-primary' }, 'Empezar'),
        h('button', { type: 'button', class: 'btn btn-ghost', dataset: { accion: 'abrir-copia' }, onclick: alAbrirCopia }, 'Abrir una copia')));

    vaciar(contenedor).append(h('main', { class: 'inicio', id: 'contenido' },
      h('p', { class: 'eyebrow' }, 'Plataforma de práctica'),
      h('h1', {}, nombreProducto),
      h('div', { class: 'inicio-explicacion' },
        h('p', {}, 'Vas a armar una aventura narrativa corta: escenas, personajes, diálogos con decisiones, fondos, música, efectos y voces. Cada elemento que entre al juego abre una ficha jurídica con semáforo que tú resuelves.'),
        h('p', {}, 'Puedes jugar tu juego cuantas veces quieras. Cuando todas las fichas estén en verde, lo publicas y descargas un paquete con el juego, su informe jurídico y el proyecto en bruto, que subes al formulario del curso.'),
        h('p', { class: 'privacidad' }, 'Nada sale de tu navegador: tu nombre, tus archivos y tus grabaciones se guardan aquí y en las copias que tú mismo descargues.')),
      formulario,
      contenido?.aviso ? h('p', { class: 'aviso-legal' }, contenido.aviso) : null));
    estudiante.focus();
  }

  return { dibujar, mostrarError };
}
```

- [ ] **Step 5: Correr las pruebas para ver que pasan**

Run: `node --test tests/capacidades.test.js tests/inicio.test.js`
Expected: `# pass 5` (2 + 3).

- [ ] **Step 6: Commit**

```bash
git add plataforma/js/ui/capacidades.js plataforma/js/editor/inicio.js tests/capacidades.test.js tests/inicio.test.js
git commit -m "Arranque: comprobación de capacidades del navegador y pantalla de inicio" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 15: El editor: columnas, selección, redibujado, reproductor, copias y subida

**Files:**
- Create: `plataforma/js/editor/editor.js`
- Create: `tests/editor.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/editor.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { instalarDom, clic, escribir, textos } from './ayudas/dom.js';
import { sesionDePrueba } from './ayudas/sesion.js';
import { proyectoPublicable } from './ayudas/proyecto.js';
import { crearProyecto, agregarEscena, agregarLinea } from '../plataforma/js/estado/modelo.js';
import { exportarCopia } from '../plataforma/js/estado/copias.js';
import { crearEditor, creditosProvisionales } from '../plataforma/js/editor/editor.js';

instalarDom();

function armar({ proyecto, confirmar = () => true, archivoElegido = null } = {}) {
  const { sesion, eventos } = sesionDePrueba(proyecto);
  const llamadas = [];
  const contenedor = document.createElement('div');
  document.body.append(contenedor);
  const editor = crearEditor(contenedor, sesion, {
    contenido: { campos: { destino: { breve: 'Ayuda del destino.' } } },
    JSZip,
    descargarArchivo: (blob, nombre) => llamadas.push(['descargar', nombre, blob.type]),
    confirmar: (mensaje) => { llamadas.push(['confirmar', mensaje]); return confirmar(mensaje); },
    elegirArchivo: async () => archivoElegido,
    alNuevoJuego: async () => llamadas.push(['nuevo-juego']),
  });
  const q = (selector) => contenedor.querySelector(selector);
  const qa = (selector) => [...contenedor.querySelectorAll(selector)];
  return { sesion, eventos, editor, contenedor, llamadas, q, qa };
}

function proyectoConLineas() {
  const p = crearProyecto({ estudiante: 'Camila R.', titulo: 'La llave del faro', destino: 'gratis' });
  const muelle = p.juego.escenas[0];
  muelle.nombre = 'El muelle';
  const torre = agregarEscena(p, 'La torre');
  agregarLinea(muelle, 'narracion', { texto: 'Niebla.' });
  agregarLinea(muelle, 'narracion', { texto: 'Más niebla.' });
  agregarLinea(torre, 'fin', { texto: 'Fin.' });
  return { p, muelle, torre };
}

test('arma la barra y las tres columnas y arranca con la escena inicial seleccionada', () => {
  const { p } = proyectoConLineas();
  const { contenedor, q, qa } = armar({ proyecto: p });
  assert.ok(q('.barra'));
  assert.ok(q('.columna-inventario .inventario'));
  assert.ok(q('.columna-centro .vista-previa'));
  assert.ok(q('.columna-centro .guion'));
  assert.ok(q('.columna-propiedades .propiedades'));
  assert.equal(q('.inventario [aria-current="true"] .entrada-texto').textContent, 'El muelle');
  assert.equal(q('.escenario-texto').textContent, 'Niebla.');
  assert.equal(q('.propiedades h2').textContent, 'Escena');
  assert.equal(qa('li.linea').length, 2);
  assert.equal(q('.capa-reproductor').hidden, true);
  contenedor.remove();
});

test('seleccionar desde el inventario cambia la escena activa; enfocar un bloque del guion no lo redibuja', () => {
  const { p, torre } = proyectoConLineas();
  const { contenedor, q, qa } = armar({ proyecto: p });
  clic(qa('.inventario button.entrada')[2]);
  assert.equal(q('.guion h2').textContent, 'La torre');
  assert.equal(q('.escenario-texto').textContent, 'Fin.');
  assert.equal(q('.propiedades h2').textContent, 'Escena');
  clic(qa('.inventario button.entrada')[1]);
  const guionAntes = q('.guion');
  const area = q('li.linea textarea');
  area.focus();
  assert.equal(q('.guion'), guionAntes, 'el guion no se redibuja al seleccionar una línea');
  assert.equal(q('li.linea[aria-current="true"] textarea'), area);
  assert.equal(q('.propiedades h2').textContent, 'Línea');
  assert.equal(q('.inventario [aria-current="true"] .entrada-texto').textContent, 'El muelle');
  assert.ok(torre);
  contenedor.remove();
});

test('escribir en el guion refresca la vista previa y la barra sin redibujar el guion; agregar una línea sí lo redibuja', () => {
  const { p } = proyectoConLineas();
  const { contenedor, q, qa } = armar({ proyecto: p });
  const area = q('li.linea textarea');
  area.focus();
  escribir(area, 'Niebla espesa.');
  assert.equal(q('.escenario-texto').textContent, 'Niebla espesa.');
  assert.equal(q('li.linea textarea'), area);
  const guionAntes = q('.guion');
  clic(q('button[data-agregar="dialogo"]'));
  assert.notEqual(q('.guion'), guionAntes, 'cambio de estructura: el guion se redibuja');
  assert.equal(qa('li.linea').length, 3);
  assert.equal(q('li.linea[aria-current="true"]').dataset.indice, '2');
  assert.equal(q('.propiedades h2').textContent, 'Línea');
  contenedor.remove();
});

test('Jugar abre el reproductor desde la escena inicial; «Jugar desde esta escena» desde la activa; cerrar devuelve el foco', () => {
  const { p } = proyectoConLineas();
  const { contenedor, q, qa } = armar({ proyecto: p });
  clic(q('button[data-accion="jugar"]'));
  assert.equal(q('.capa-reproductor').hidden, false);
  assert.ok(document.body.classList.contains('jugando'));
  assert.equal(q('.capa-reproductor .escenario-texto').textContent, 'Niebla.');
  clic(q('.capa-reproductor button[data-accion="cerrar"]'));
  assert.equal(q('.capa-reproductor').hidden, true);
  assert.equal(q('.capa-reproductor').childNodes.length, 0);
  assert.ok(!document.body.classList.contains('jugando'));
  assert.equal(document.activeElement, q('button[data-accion="jugar"]'));
  clic(qa('.inventario button.entrada')[2]);
  clic(q('button[data-accion="jugar-aqui"]'));
  assert.equal(q('.capa-reproductor .escenario-texto').textContent, 'Fin.');
  assert.deepEqual(textos(contenedor, '.reproductor-titulo'), ['La llave del faro']);
  clic(q('.capa-reproductor button[data-accion="cerrar"]'));
  contenedor.remove();
});

test('Guardar copia descarga el zip con el nombre del juego y reinicia el contador; con un error muestra el aviso', async () => {
  const { p } = proyectoPublicable();
  const { sesion, contenedor, editor, llamadas, q } = armar({ proyecto: p });
  sesion.cambiar(() => {});
  assert.equal(sesion.cambiosSinCopia, 1);
  assert.equal(await editor.guardarCopia(), false, 'faltan los archivos binarios: exportar falla');
  assert.match(q('.aviso-error').textContent, /Falta el archivo/);
  assert.ok(q('.aviso-error button[data-accion="guardar-copia"]'));
  const { archivos } = proyectoPublicable();
  for (const [id, a] of archivos) sesion.archivos.set(id, a);
  assert.equal(await editor.guardarCopia(), true);
  assert.deepEqual(llamadas.at(-1), ['descargar', 'copia-la-llave-del-faro.zip', 'application/zip']);
  assert.equal(sesion.cambiosSinCopia, 0);
  contenedor.remove();
});

test('Abrir copia importa, pide confirmación y reemplaza el proyecto; sin confirmación no toca nada', async () => {
  const { p: otro, archivos } = proyectoPublicable();
  otro.juego.titulo = 'Otro juego';
  const blob = await exportarCopia(otro, archivos, { JSZip });
  const { p } = proyectoConLineas();
  const noConfirma = armar({ proyecto: p, confirmar: () => false, archivoElegido: blob });
  await noConfirma.editor.abrirCopia();
  assert.equal(noConfirma.sesion.proyecto, p);
  assert.match(noConfirma.llamadas.at(-1)[1], /Reemplazar el proyecto actual por «Otro juego»/);
  noConfirma.contenedor.remove();
  const confirma = armar({ proyecto: proyectoConLineas().p, archivoElegido: blob });
  await confirma.editor.abrirCopia();
  assert.equal(confirma.sesion.proyecto.juego.titulo, 'Otro juego');
  assert.equal(confirma.q('.barra-juego').textContent, 'Otro juego');
  assert.equal(confirma.q('.guion h2').textContent, 'El muelle');
  assert.equal(confirma.sesion.archivos.size, 5);
  confirma.contenedor.remove();
  const danada = armar({ proyecto: proyectoConLineas().p, archivoElegido: new Blob(['no es zip']) });
  await danada.editor.abrirCopia();
  assert.match(danada.q('.aviso-error').textContent, /no es una copia válida/);
  danada.contenedor.remove();
});

test('Subir archivo pregunta qué es, da de alta el elemento y lo selecciona; un formato malo muestra el error', async () => {
  const png = { name: 'ana_retrato.png', type: 'image/png', size: 10, arrayBuffer: async () => new TextEncoder().encode('png').buffer };
  const { p } = proyectoConLineas();
  const { sesion, contenedor, editor, q, qa } = armar({ proyecto: p, archivoElegido: png });
  const pendiente = editor.subirArchivo();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(q('.dialogo h2').textContent, '¿Qué es «ana retrato»?');
  assert.deepEqual(textos(contenedor, '.dialogo button'), ['Fondo', 'Retrato', 'Cancelar']);
  clic(q('.dialogo button[data-tipo="retrato"]'));
  await pendiente;
  assert.equal(q('.dialogo'), null);
  const elemento = sesion.proyecto.juego.elementos[0];
  assert.equal(elemento.tipo, 'retrato');
  assert.equal(q('.propiedades h2').textContent, 'Retrato');
  assert.equal(q('.inventario [aria-current="true"] .entrada-texto').textContent, 'ana retrato');
  const cancelado = editor.subirArchivo();
  await new Promise((r) => setTimeout(r, 0));
  clic(q('.dialogo button[data-tipo="cancelar"]'));
  await cancelado;
  assert.equal(sesion.proyecto.juego.elementos.length, 1);
  const malo = armar({ proyecto: proyectoConLineas().p, archivoElegido: { name: 'x.gif', type: 'image/gif', size: 1 } });
  await malo.editor.subirArchivo();
  assert.match(malo.q('.aviso-error').textContent, /Formato no aceptado/);
  assert.ok(qa);
  contenedor.remove();
  malo.contenedor.remove();
});

test('los errores y el recordatorio de la sesión se muestran con botón de Guardar copia; Nuevo juego confirma y ofrece copia', async () => {
  const { p } = proyectoConLineas();
  const respuestas = ['sí', 'no'];
  const { sesion, contenedor, editor, llamadas, q, qa } = armar({ proyecto: p, confirmar: () => respuestas.shift() === 'sí' });
  sesion.suscribir(() => {});
  const falloInterno = Object.assign(new Error('No hay espacio en el navegador para guardar.'), { codigo: 'sin_espacio' });
  editor.mostrarError(falloInterno);
  assert.match(q('.aviso-error').textContent, /No hay espacio/);
  assert.ok(q('.aviso-error button[data-accion="guardar-copia"]'));
  for (let i = 0; i < 50; i += 1) sesion.cambiar(() => {});
  assert.ok(qa('.aviso').some((a) => /50 cambios/.test(a.textContent)));
  await editor.nuevoJuego();
  assert.deepEqual(llamadas.filter((l) => l[0] === 'nuevo-juego'), [['nuevo-juego']]);
  assert.equal(llamadas.filter((l) => l[0] === 'confirmar').length, 2, 'confirmó el nuevo juego y preguntó por la copia');
  contenedor.remove();
});

test('creditosProvisionales nombra al estudiante y copia los créditos escritos en las fichas', () => {
  const { p, tema } = proyectoPublicable();
  p.fichas[tema.id].credito = '«Tema» de Autora Ejemplo, CC BY-NC 4.0';
  assert.deepEqual(creditosProvisionales(p), ['Camila R.: autor(a) del juego y de la historia', '«Tema» de Autora Ejemplo, CC BY-NC 4.0']);
  assert.deepEqual(creditosProvisionales(crearProyecto({ estudiante: ' ' })), ['Sin nombre: autor(a) del juego y de la historia']);
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/editor.test.js`
Expected: falla al importar `editor.js`.

- [ ] **Step 3: Escribir `plataforma/js/editor/editor.js`**

```js
// plataforma/js/editor/editor.js
// Arma el editor (spec, sección 7): barra, inventario, escena activa (vista previa y
// guion), propiedades, avisos, y el reproductor sobre el editor. Coordina la selección
// y decide qué redibujar con cada cambio según su origen y si cambió la estructura.
import { h, vaciar, anunciar, descargar } from '../ui/dom.js';
import { exportarCopia, importarCopia } from '../estado/copias.js';
import { jugar } from '../motor/reproductor.js';
import { crearBarra } from './barra.js';
import { crearInventario, NOMBRES_TIPO } from './inventario.js';
import { crearGuion } from './guion.js';
import { crearVistaPrevia } from './vista-previa.js';
import { crearPropiedades } from './propiedades.js';
import { subirElemento, validarSubida, nombreSugerido, TIPOS_POR_MEDIO, ACEPTA } from './subida.js';

const AVISO_MS = 6000;

/** Créditos provisionales del reproductor hasta que el plan 6 traiga juridico/cadena.js. */
export function creditosProvisionales(proyecto) {
  const lineas = [`${proyecto.estudiante?.trim() || 'Sin nombre'}: autor(a) del juego y de la historia`];
  for (const elemento of proyecto.juego.elementos) {
    const credito = proyecto.fichas[elemento.id]?.credito?.trim();
    if (credito) lineas.push(credito);
  }
  return lineas;
}

/** «La llave del faro» → la-llave-del-faro, para nombrar descargas. */
export function nombreDeArchivo(texto) {
  const limpio = String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return limpio || 'sin-nombre';
}

/** Abre el selector de archivos del navegador. Resuelve con el File o con null si se cancela. */
export function elegirArchivoDelNavegador(accept) {
  return new Promise((resolver) => {
    const entrada = h('input', { type: 'file', accept, hidden: true });
    const terminar = (archivo) => { entrada.remove(); resolver(archivo); };
    entrada.addEventListener('change', () => terminar(entrada.files?.[0] ?? null));
    entrada.addEventListener('cancel', () => terminar(null));
    document.body.append(entrada);
    entrada.click();
  });
}

/**
 * @param {HTMLElement} contenedor
 * @param {object} sesion de crearSesion
 * @param {object} opciones contenido (juridico.json), JSZip, descargarArchivo(blob, nombre),
 *   confirmar(mensaje) → boolean, elegirArchivo(accept) → Promise<File|null>, alNuevoJuego() → Promise
 */
export function crearEditor(contenedor, sesion, {
  contenido = null,
  JSZip = globalThis.JSZip,
  descargarArchivo = descargar,
  confirmar = (mensaje) => window.confirm(mensaje),
  elegirArchivo = elegirArchivoDelNavegador,
  alNuevoJuego = async () => {},
} = {}) {
  let seleccion = null;
  let escenaActivaId = null;
  let reproductor = null;

  // ---- estructura de la página ----
  const zonaBarra = h('div', { class: 'zona-barra' });
  const zonaInventario = h('aside', { class: 'columna columna-inventario', 'aria-label': 'Inventario' });
  const zonaVistaPrevia = h('div', { class: 'zona-vista-previa' });
  const zonaGuion = h('div', { class: 'zona-guion' });
  const zonaPropiedades = h('aside', { class: 'columna columna-propiedades', 'aria-label': 'Propiedades' });
  const zonaAvisos = h('div', { class: 'avisos' });
  const zonaDialogo = h('div', { class: 'capa-dialogo', hidden: true });
  const zonaReproductor = h('div', { class: 'capa-reproductor', hidden: true });
  const estadoGuardado = h('span', { class: 'estado-guardado', 'aria-live': 'polite' });
  const botonJugarAqui = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'jugar-aqui' }, onclick: () => jugarDesde(escenaActivaId) }, '▶ Jugar desde esta escena');
  vaciar(contenedor).append(
    zonaBarra,
    h('div', { class: 'editor', id: 'contenido' },
      zonaInventario,
      h('main', { class: 'columna columna-centro' }, zonaVistaPrevia, h('div', { class: 'centro-acciones' }, botonJugarAqui, estadoGuardado), zonaGuion),
      zonaPropiedades),
    zonaAvisos,
    zonaDialogo,
    zonaReproductor,
  );

  // ---- vistas ----
  const barra = crearBarra(zonaBarra, sesion, {
    alJugar: () => jugarDesde(sesion.proyecto.juego.escenaInicial),
    alGuardarCopia: guardarCopia,
    alAbrirCopia: abrirCopia,
    alNuevoJuego: nuevoJuego,
    alPublicar: () => avisar('La publicación llega en una versión siguiente. Por ahora el candado te dice qué falta.'),
  });
  const inventario = crearInventario(zonaInventario, sesion, { alSeleccionar: (s) => seleccionar(s), alSubir: subirArchivo });
  const vistaPrevia = crearVistaPrevia(zonaVistaPrevia, sesion);
  const guion = crearGuion(zonaGuion, sesion, {
    alSeleccionar: (indice) => seleccionar(indice === null ? { tipo: 'escena', id: escenaActivaId } : { tipo: 'linea', escena: escenaActivaId, indice }, { redibujarGuion: false }),
    confirmar,
  });
  const propiedades = crearPropiedades(zonaPropiedades, sesion, { contenido, alSeleccionar: (s) => seleccionar(s), confirmar });

  // ---- selección y redibujado ----
  const escenaActiva = () => sesion.proyecto.juego.escenas.find((e) => e.id === escenaActivaId) ?? null;
  const escenaDe = (s) => (s?.tipo === 'escena' ? s.id : s?.tipo === 'linea' ? s.escena : null);

  function normalizar(s) {
    const { juego } = sesion.proyecto;
    if (s) return s;
    if (juego.escenas.some((e) => e.id === escenaActivaId)) return { tipo: 'escena', id: escenaActivaId };
    return juego.escenas[0] ? { tipo: 'escena', id: juego.escenas[0].id } : { tipo: 'juego' };
  }

  function seleccionar(nueva, { redibujarGuion = true } = {}) {
    seleccion = normalizar(nueva);
    const { juego } = sesion.proyecto;
    const escenaId = escenaDe(seleccion);
    const cambioEscena = escenaId !== null && escenaId !== escenaActivaId;
    if (escenaId !== null) escenaActivaId = escenaId;
    if (!juego.escenas.some((e) => e.id === escenaActivaId)) escenaActivaId = juego.escenas[0]?.id ?? null;
    const indice = seleccion.tipo === 'linea' ? seleccion.indice : null;
    inventario.dibujar(seleccion);
    vistaPrevia.dibujar(escenaActiva(), indice);
    propiedades.dibujar(seleccion);
    if (cambioEscena || redibujarGuion) guion.dibujar(escenaActiva(), indice);
    else guion.marcarSeleccion(indice);
    botonJugarAqui.disabled = !escenaActiva();
  }

  function refrescar({ origen, estructura }) {
    const indice = seleccion?.tipo === 'linea' ? seleccion.indice : null;
    barra.dibujar();
    inventario.dibujar(seleccion);
    vistaPrevia.dibujar(escenaActiva(), indice);
    if (estructura || origen !== 'propiedades') propiedades.dibujar(seleccion);
    if (estructura || origen !== 'guion') guion.dibujar(escenaActiva(), indice);
  }

  sesion.suscribir((evento) => {
    if (evento.tipo === 'cambio') {
      estadoGuardado.textContent = 'Guardando…';
      refrescar(evento);
    } else if (evento.tipo === 'guardado') {
      estadoGuardado.textContent = 'Guardado';
    } else if (evento.tipo === 'error') {
      mostrarError(evento.error);
    } else if (evento.tipo === 'recordatorio') {
      avisar('Llevas 50 cambios sin guardar una copia. Descarga una por si acaso.', { accion: ['Guardar copia', guardarCopia] });
    } else if (evento.tipo === 'reemplazo') {
      escenaActivaId = null;
      barra.dibujar();
      seleccionar(null);
    }
  });

  // ---- avisos y errores (spec, sección 17) ----
  function avisar(texto, { accion = null, error = false } = {}) {
    const aviso = h('div', { class: `aviso${error ? ' aviso-error' : ''}`, role: error ? 'alert' : 'status' },
      h('span', { class: 'aviso-texto' }, texto),
      accion ? h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'guardar-copia' }, onclick: () => { aviso.remove(); accion[1](); } }, accion[0]) : null,
      h('button', { type: 'button', class: 'icono', 'aria-label': 'Cerrar aviso', onclick: () => aviso.remove() }, '✕'));
    zonaAvisos.append(aviso);
    anunciar(texto);
    if (!accion) {
      const temporizador = setTimeout(() => aviso.remove(), AVISO_MS);
      temporizador.unref?.();
    }
    return aviso;
  }

  function mostrarError(error) {
    const texto = error?.message ? String(error.message) : String(error);
    return avisar(texto, { error: true, accion: ['Guardar copia', guardarCopia] });
  }

  // ---- reproductor sobre el editor ----
  function cerrarReproductor() {
    reproductor?.cerrar();
    reproductor = null;
  }

  function jugarDesde(escenaInicial) {
    cerrarReproductor();
    zonaReproductor.hidden = false;
    document.body.classList.add('jugando');
    reproductor = jugar(zonaReproductor, sesion.proyecto.juego, (id) => sesion.resolverRecurso(id), {
      escenaInicial,
      creditos: creditosProvisionales(sesion.proyecto),
      alCerrar: () => {
        reproductor = null;
        zonaReproductor.hidden = true;
        document.body.classList.remove('jugando');
        zonaBarra.querySelector('[data-accion="jugar"]')?.focus();
      },
    });
  }

  // ---- copias y nuevo juego (spec, sección 13) ----
  async function guardarCopia() {
    try {
      await sesion.guardarAhora();
      const blob = await exportarCopia(sesion.proyecto, sesion.archivos, { JSZip });
      descargarArchivo(blob, `copia-${nombreDeArchivo(sesion.proyecto.juego.titulo)}.zip`);
      sesion.marcarCopiaGuardada();
      avisar('Copia descargada.');
      return true;
    } catch (error) {
      mostrarError(error);
      return false;
    }
  }

  async function abrirCopia() {
    const archivo = await elegirArchivo('.zip,application/zip');
    if (!archivo) return;
    let copia;
    try {
      copia = await importarCopia(archivo, { JSZip });
    } catch (error) {
      mostrarError(error);
      return;
    }
    const titulo = copia.proyecto.juego.titulo?.trim() || 'Sin título';
    if (!confirmar(`¿Reemplazar el proyecto actual por «${titulo}»? Lo que tienes ahora se perderá si no guardaste una copia.`)) return;
    try {
      cerrarReproductor();
      await sesion.reemplazar(copia.proyecto, copia.archivos);
      avisar('Copia abierta.');
    } catch (error) {
      mostrarError(error);
    }
  }

  async function nuevoJuego() {
    if (!confirmar('¿Empezar un juego nuevo? El proyecto actual se borrará de este navegador.')) return;
    if (confirmar('¿Quieres guardar una copia del proyecto actual antes?')) {
      const descargada = await guardarCopia();
      if (!descargada) return;
    }
    cerrarReproductor();
    await alNuevoJuego();
  }

  // ---- subida de archivos (spec, sección 10) ----
  function elegirTipo(tipos, nombre) {
    return new Promise((resolver) => {
      const cerrar = (valor) => {
        vaciar(zonaDialogo);
        zonaDialogo.hidden = true;
        resolver(valor);
      };
      zonaDialogo.hidden = false;
      vaciar(zonaDialogo).append(h('div', { class: 'dialogo', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dialogo-titulo' },
        h('h2', { id: 'dialogo-titulo' }, `¿Qué es «${nombre}»?`),
        h('div', { class: 'acciones' },
          tipos.map((tipo) => h('button', { type: 'button', class: 'btn btn-primary btn-sm', dataset: { tipo }, onclick: () => cerrar(tipo) }, NOMBRES_TIPO[tipo])),
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { tipo: 'cancelar' }, onclick: () => cerrar(null) }, 'Cancelar'))));
      zonaDialogo.querySelector('button')?.focus();
    });
  }

  async function subirArchivo() {
    const archivo = await elegirArchivo(`${ACEPTA.imagen},${ACEPTA.audio}`);
    if (!archivo) return;
    const resultado = validarSubida(archivo);
    if (!resultado.ok) {
      mostrarError(new Error(resultado.mensaje));
      return;
    }
    const tipo = await elegirTipo(TIPOS_POR_MEDIO[resultado.medio], nombreSugerido(archivo.name));
    if (!tipo) return;
    try {
      const elemento = await subirElemento(sesion, archivo, { tipo });
      seleccionar({ tipo: 'elemento', id: elemento.id });
      avisar(`«${elemento.nombre}» entró al juego como ${NOMBRES_TIPO[tipo].toLowerCase()}.`);
    } catch (error) {
      mostrarError(error);
    }
  }

  // ---- arranque ----
  barra.dibujar();
  seleccionar({ tipo: 'escena', id: sesion.proyecto.juego.escenaInicial });

  return {
    seleccionar,
    guardarCopia,
    abrirCopia,
    nuevoJuego,
    subirArchivo,
    jugarDesde,
    mostrarError,
    destruir() {
      cerrarReproductor();
      vaciar(contenedor);
    },
  };
}
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/editor.test.js`
Expected: `# pass 9`.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/editor/editor.js tests/editor.test.js
git commit -m "Editor: columnas, selección y redibujado, reproductor sobre el editor, copias, nuevo juego y subida" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 16: Arranque, página y estilos del editor

**Files:**
- Create: `plataforma/js/app.js`
- Create: `plataforma/index.html`
- Create: `plataforma/css/editor.css`

No hay prueba automática de `app.js` (es el pegamento con `fetch`, `window` y el almacén real); se comprueba a mano en el paso 4 y el plan 6 lo recorre con Playwright.

- [ ] **Step 1: Escribir `plataforma/js/app.js`**

```js
// plataforma/js/app.js
// Arranque: comprueba el navegador, carga el contenido, abre el almacén y muestra la
// pantalla de inicio o el editor. Atrapa los errores inesperados para que nunca quede
// una pantalla en blanco (spec, sección 17).
import { comprobar, NAVEGADORES } from './ui/capacidades.js';
import { h, vaciar } from './ui/dom.js';
import { cargarContenido } from './juridico/textos.js';
import { abrirAlmacen } from './estado/almacen.js';
import { crearProyecto } from './estado/modelo.js';
import { importarCopia } from './estado/copias.js';
import { crearSesion } from './editor/sesion.js';
import { crearInicio } from './editor/inicio.js';
import { crearEditor, elegirArchivoDelNavegador } from './editor/editor.js';

const raiz = document.getElementById('app');
let sesionActual = null;
let editorActual = null;

function pantallaDeError(titulo, detalle, lista = []) {
  vaciar(raiz).append(h('main', { class: 'inicio', id: 'contenido' },
    h('h1', {}, titulo),
    h('p', {}, detalle),
    lista.length ? h('ul', {}, lista.map((texto) => h('li', {}, texto))) : null,
    h('p', { class: 'ayuda' }, `Navegadores con los que funciona: ${NAVEGADORES}`)));
}

function cerrarEditor() {
  editorActual?.destruir();
  editorActual = null;
  sesionActual?.cerrar();
  sesionActual = null;
  document.body.classList.remove('en-editor', 'jugando');
}

function mostrarEditor(almacen, contenido, proyecto, archivos) {
  cerrarEditor();
  document.body.classList.add('en-editor');
  sesionActual = crearSesion({ proyecto, archivos, almacen });
  editorActual = crearEditor(raiz, sesionActual, {
    contenido,
    JSZip: window.JSZip,
    alNuevoJuego: async () => {
      await almacen.borrarTodo();
      mostrarInicio(almacen, contenido);
    },
  });
}

function mostrarInicio(almacen, contenido) {
  cerrarEditor();
  const inicio = crearInicio(raiz, {
    nombreProducto: contenido.nombre,
    contenido,
    alEmpezar: async (datos) => {
      const proyecto = crearProyecto(datos);
      try {
        await almacen.guardar(proyecto);
      } catch (error) {
        inicio.mostrarError(error.message);
        return;
      }
      mostrarEditor(almacen, contenido, proyecto, new Map());
    },
    alAbrirCopia: async () => {
      const archivo = await elegirArchivoDelNavegador('.zip,application/zip');
      if (!archivo) return;
      try {
        const copia = await importarCopia(archivo, { JSZip: window.JSZip });
        await almacen.reemplazarTodo(copia.proyecto, copia.archivos);
        mostrarEditor(almacen, contenido, copia.proyecto, copia.archivos);
      } catch (error) {
        inicio.mostrarError(error.message);
      }
    },
  });
  inicio.dibujar();
}

async function arrancar() {
  const capacidades = comprobar(window);
  if (!capacidades.ok) {
    pantallaDeError('Este navegador no puede ejecutar la plataforma', 'Le falta:', capacidades.faltantes);
    return;
  }
  let contenido;
  try {
    contenido = await cargarContenido();
  } catch (error) {
    pantallaDeError('No se pudo cargar el contenido jurídico', error.message);
    return;
  }
  document.title = contenido.nombre;
  const almacen = abrirAlmacen();
  try {
    const proyecto = await almacen.cargar();
    if (proyecto) {
      mostrarEditor(almacen, contenido, proyecto, await almacen.leerArchivos());
    } else {
      mostrarInicio(almacen, contenido);
    }
  } catch (error) {
    pantallaDeError('No se pudo abrir lo guardado en el navegador', error.message);
  }
}

const aError = (valor) => (valor instanceof Error ? valor : new Error(String(valor?.message ?? valor ?? 'Error desconocido')));
window.addEventListener('error', (evento) => {
  if (editorActual) editorActual.mostrarError(aError(evento.error ?? evento.message));
  else pantallaDeError('Algo salió mal', aError(evento.error ?? evento.message).message);
});
window.addEventListener('unhandledrejection', (evento) => {
  if (editorActual) editorActual.mostrarError(aError(evento.reason));
  else pantallaDeError('Algo salió mal', aError(evento.reason).message);
});

arrancar();
```

- [ ] **Step 2: Escribir `plataforma/index.html`**

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mi primer videojuego</title>
  <meta name="description" content="Plataforma de práctica: arma tu primer videojuego y resuelve la ficha jurídica de cada elemento.">
  <link rel="stylesheet" href="css/tokens.css">
  <link rel="stylesheet" href="css/reproductor.css">
  <link rel="stylesheet" href="css/editor.css">
</head>
<body>
  <a class="skip" href="#contenido">Saltar al contenido</a>
  <div id="app"><p class="cargando" role="status">Cargando…</p></div>
  <p class="aviso-angosto" role="note">Para editar necesitas una pantalla más ancha: usa un computador o una tableta. En el celular se juega el juego ya publicado.</p>
  <script src="js/vendor/jszip.min.js"></script>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 3: Escribir `plataforma/css/editor.css`**

Tema claro (se usa durante horas), tres columnas, foco visible, contraste AA. El reproductor sobre el editor es una capa fija oscura.

```css
/* plataforma/css/editor.css — inicio y editor (tema claro) */
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--claro-fondo);
  color: var(--claro-ink);
  font-family: var(--body);
  font-size: 15px;
  line-height: 1.5;
  min-height: 100vh;
}
body.jugando { overflow: hidden; }
a { color: var(--claro-accent); }
h1, h2, h3 { margin: 0; font-family: var(--display); letter-spacing: .01em; }
h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: var(--claro-muted); }
.cargando { padding: 40px; text-align: center; color: var(--claro-muted); }

.skip {
  position: absolute; top: -100px; left: 16px; z-index: 100;
  background: var(--accent); color: var(--accent-ink);
  padding: 10px 16px; border-radius: 8px; font-weight: 700;
}
.skip:focus { top: 12px; }

.btn-ghost { color: var(--claro-ink); border-color: var(--claro-line); }
.btn-ghost:hover { background: var(--claro-panel-2); }
.btn.peligro { color: var(--rojo); border-color: var(--rojo); }
.icono {
  width: 28px; height: 28px; padding: 0;
  display: inline-grid; place-items: center;
  background: transparent; border: 1px solid transparent; border-radius: 6px;
  color: var(--claro-muted); cursor: pointer; font-size: 12px;
}
.icono:hover { border-color: var(--claro-line); color: var(--claro-ink); }
.icono:disabled { opacity: .35; cursor: not-allowed; }

.vacio { margin: 8px 0; color: var(--claro-muted); font-style: italic; font-size: 13px; }
.ayuda { margin: 4px 0 10px; color: var(--claro-muted); font-size: 13px; }
.eyebrow { margin: 0 0 8px; font-family: var(--mono); font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--claro-accent); }

/* ---------- Campos ---------- */
.campo { display: grid; gap: 4px; margin: 0 0 12px; }
.campo-etiqueta { font-size: 12px; font-weight: 700; color: var(--claro-muted); text-transform: uppercase; letter-spacing: .06em; }
input[type="text"], select, textarea {
  width: 100%;
  padding: 8px 10px;
  background: var(--claro-panel);
  color: var(--claro-ink);
  border: 1px solid var(--claro-line);
  border-radius: 8px;
}
input[type="text"]:focus, select:focus, textarea:focus { outline: 2px solid var(--claro-accent); outline-offset: 1px; }
textarea { resize: vertical; font-family: var(--body); }

/* ---------- Inicio ---------- */
.inicio { width: min(720px, 100% - 32px); margin: 0 auto; padding: 48px 0 80px; }
.inicio h1 { font-size: clamp(26px, 4vw, 38px); margin-bottom: 18px; }
.inicio-explicacion p { margin: 0 0 10px; }
.inicio-explicacion .privacidad { padding: 10px 14px; background: var(--claro-accent-fondo); border-left: 4px solid var(--claro-accent); border-radius: 6px; }
.inicio-formulario { margin-top: 28px; padding: 24px; background: var(--claro-panel); border: 1px solid var(--claro-line); border-radius: var(--radius); }
.destinos { margin: 0 0 12px; padding: 12px 14px; border: 1px solid var(--claro-line); border-radius: 10px; }
.destinos legend { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--claro-muted); padding: 0 6px; }
.opcion-destino { display: grid; grid-template-columns: auto auto 1fr; gap: 10px; align-items: baseline; padding: 6px 0; cursor: pointer; }
.opcion-nombre { font-weight: 700; }
.opcion-explicacion { color: var(--claro-muted); font-size: 13px; }
.inicio-error { margin: 0 0 12px; color: var(--rojo); font-weight: 700; }
.acciones { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.aviso-legal { margin-top: 24px; font-size: 12px; color: var(--claro-muted); }

/* ---------- Barra ---------- */
.zona-barra { position: sticky; top: 0; z-index: 30; }
.barra {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;
  min-height: 56px; padding: 8px 16px;
  background: var(--claro-panel); border-bottom: 1px solid var(--claro-line);
}
.barra-titulo { display: flex; flex-direction: column; min-width: 0; }
.barra-juego { font-family: var(--display); font-size: 15px; }
.barra-estudiante { font-size: 12px; color: var(--claro-muted); }
.barra-acciones { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.publicar { position: relative; display: inline-block; }
.con-candado { color: var(--claro-muted); }
.publicar-falta {
  display: none; position: absolute; right: 0; top: calc(100% + 6px); z-index: 40;
  width: min(360px, 80vw); padding: 10px 12px;
  background: var(--claro-panel); color: var(--claro-ink);
  border: 1px solid var(--claro-line); border-radius: 10px; box-shadow: 0 12px 30px rgba(0, 0, 0, .15);
  font-size: 13px;
}
.publicar:hover .publicar-falta, .publicar:focus-within .publicar-falta { display: block; }
.publicar-falta p { margin: 0 0 6px; }
.publicar-falta ul { margin: 0; padding-left: 18px; }

/* ---------- Editor: tres columnas ---------- */
.editor {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr) 320px;
  height: calc(100vh - 56px);
}
.columna { min-width: 0; overflow: auto; padding: 14px; }
.columna-inventario { border-right: 1px solid var(--claro-line); background: var(--claro-panel-2); }
.columna-propiedades { border-left: 1px solid var(--claro-line); background: var(--claro-panel); }
.columna-centro { display: flex; flex-direction: column; gap: 12px; }
.centro-acciones { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.estado-guardado { font-size: 12px; color: var(--claro-muted); }

/* ---------- Inventario ---------- */
.inventario { display: grid; gap: 16px; }
.inventario-seccion { display: grid; gap: 6px; }
.inventario-cabecera { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.lista { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.entrada {
  display: grid; grid-template-columns: 16px 1fr auto; align-items: center; gap: 8px;
  width: 100%; padding: 7px 8px; text-align: left;
  background: transparent; border: 1px solid transparent; border-radius: 8px; cursor: pointer;
}
.entrada:hover { background: var(--claro-panel); border-color: var(--claro-line); }
.entrada.activa { background: var(--claro-panel); border-color: var(--claro-accent); }
.entrada-texto { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.entrada-detalle { font-family: var(--mono); font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: var(--claro-muted); }
.marca-vacia, .punto-semaforo { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.punto-semaforo { border: 1px solid var(--claro-line); background: var(--claro-panel); }
.aviso-gris {
  display: inline-grid; place-items: center; min-width: 16px; height: 16px; padding: 0 5px;
  border-radius: 99px; background: var(--gris); color: #fff;
  font-family: var(--mono); font-size: 10px; font-weight: 700; cursor: help;
}

/* ---------- Vista previa y guion ---------- */
.vista-previa .escenario { width: 100%; }
.guion { display: grid; gap: 10px; }
.guion-cabecera { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.guion-cabecera h2 { color: var(--claro-ink); font-size: 15px; text-transform: none; letter-spacing: 0; }
.guion-cuenta { font-size: 12px; color: var(--claro-muted); }
.lineas { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.linea { padding: 10px 12px; background: var(--claro-panel); border: 1px solid var(--claro-line); border-radius: 10px; }
.linea.seleccionada { border-color: var(--claro-accent); box-shadow: 0 0 0 2px var(--claro-accent-fondo); }
.linea.tras-corte { opacity: .6; }
.linea-cabecera { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.linea-asa { cursor: grab; color: var(--claro-muted); user-select: none; }
.linea-tipo { font-family: var(--mono); font-size: 10px; text-transform: uppercase; letter-spacing: .08em; padding: 2px 6px; border-radius: 99px; border: 1px solid var(--claro-line); }
.tipo-decision { border-color: var(--claro-accent); color: var(--claro-accent); }
.tipo-fin { border-color: var(--claro-ink); }
.linea-acciones { margin-left: auto; display: flex; gap: 2px; }
.linea-cabecera .aviso-gris { height: auto; padding: 2px 8px; text-transform: none; font-family: var(--body); font-weight: 400; }
.linea .campo { margin-bottom: 8px; }
.linea-texto { margin: 0; }
.opciones { display: grid; gap: 6px; margin-top: 8px; }
.opcion-fila { display: grid; grid-template-columns: 20px minmax(0, 1fr) minmax(0, 1fr) 28px; gap: 6px; align-items: end; }
.opcion-fila .campo { margin: 0; }
.opcion-numero { align-self: center; font-family: var(--mono); font-size: 12px; color: var(--claro-muted); }
.guion-agregar { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding-top: 4px; }
.guion-etiqueta { font-size: 12px; font-weight: 700; color: var(--claro-muted); }

/* ---------- Propiedades ---------- */
.propiedades { display: grid; gap: 4px; }
.propiedades h2 { margin-bottom: 10px; }
.muestra { display: block; max-width: 100%; margin: 6px 0 12px; border: 1px solid var(--claro-line); border-radius: 8px; background: #000; }
img.muestra { max-height: 180px; object-fit: contain; }
audio.muestra { width: 100%; background: transparent; border: 0; }

/* ---------- Avisos y diálogos ---------- */
.avisos { position: fixed; right: 16px; bottom: 16px; z-index: 50; display: grid; gap: 8px; width: min(420px, calc(100vw - 32px)); }
.aviso {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  background: var(--claro-panel); border: 1px solid var(--claro-line); border-left: 4px solid var(--claro-accent);
  border-radius: 10px; box-shadow: 0 12px 30px rgba(0, 0, 0, .15); font-size: 13px;
}
.aviso-error { border-left-color: var(--rojo); }
.aviso-texto { flex: 1; }
.capa-dialogo { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; background: rgba(0, 0, 0, .45); }
.capa-dialogo[hidden] { display: none; }
.dialogo { width: min(440px, calc(100vw - 32px)); padding: 20px; background: var(--claro-panel); border-radius: var(--radius); box-shadow: var(--shadow); }
.dialogo h2 { color: var(--claro-ink); font-size: 16px; text-transform: none; letter-spacing: 0; margin-bottom: 12px; }
.capa-reproductor { position: fixed; inset: 0; z-index: 70; overflow: auto; background: var(--bg); }
.capa-reproductor[hidden] { display: none; }

/* ---------- Pantallas angostas: solo se juega ---------- */
.aviso-angosto { display: none; margin: 0; padding: 12px 16px; background: var(--amber); color: var(--accent-ink); font-weight: 700; }
@media (max-width: 899px) {
  body.en-editor .aviso-angosto { display: block; position: sticky; bottom: 0; z-index: 20; }
  .editor { grid-template-columns: 1fr; height: auto; }
  .columna-inventario, .columna-propiedades { border: 0; border-top: 1px solid var(--claro-line); }
}
```

- [ ] **Step 4: Comprobación manual en el navegador**

Run en segundo plano: `node tests/manual/servir.js`. Abrir `http://localhost:8080/plataforma/` y recorrer:

1. **Inicio.** Se ve el nombre del producto (clave `nombre` de `juridico.json`), las tres explicaciones, la línea de privacidad y el aviso legal. «Empezar» sin nombre marca el error; con nombre, título y destino abre el editor.
2. **Editor.** Barra con título y estudiante; inventario con «El juego», la escena 1 con su aviso gris (sin líneas); vista previa «Esta escena no tiene líneas todavía»; guion vacío con los cuatro botones «Línea»; propiedades de la escena.
3. **Guion.** Agregar narración, escribir texto y ver que la vista previa cambia al escribir y que el foco no se pierde. Crear un personaje, agregar diálogo (toma el personaje), decisión con dos opciones y destinos, y fin. Mover con ▲ ▼ y arrastrando. Eliminar con confirmación.
4. **Subir archivo.** Botón «Subir archivo» → elegir un PNG → diálogo «¿Qué es…?» → Retrato. Queda en el inventario, seleccionado, con su imagen en propiedades. Asignarlo al personaje desde propiedades; la vista previa lo muestra en el diálogo. Subir un fondo y asignarlo a la escena. Probar un archivo de más de 2 MB o un .gif: aviso de error con «Guardar copia».
5. **Jugar.** «Jugar» abre el reproductor oscuro sobre el editor desde la escena inicial; «Cerrar» vuelve al mismo punto; «▶ Jugar desde esta escena» arranca en la activa.
6. **Publicar.** Candado; al pasar el cursor o enfocar con Tab se lista lo que falta.
7. **Copias.** «Guardar copia» descarga `copia-<titulo>.zip`. «Nuevo juego» confirma, ofrece la copia y vuelve al inicio. «Abrir una copia» desde el inicio y desde la barra restaura el proyecto (con confirmación en la barra).
8. **Recarga.** Al recargar la página el proyecto sigue ahí (IndexedDB).
9. **Angosto.** Con la ventana a menos de 900 px aparece la franja ámbar y las columnas se apilan.
10. **Teclado.** Tab recorre barra, inventario, guion y propiedades con foco visible; el enlace «Saltar al contenido» aparece al primer Tab.

Detener el servidor al terminar. Si algo falla, corregirlo en el módulo que corresponde (con su prueba si es lógica) antes de seguir.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/app.js plataforma/index.html plataforma/css/editor.css
git commit -m "Plataforma: arranque, página index.html y estilos del editor" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 17: Cierre del plan: suite completa, README y nota para el plan 3

**Files:**
- Modify: `plataforma/README.md`

- [ ] **Step 1: Correr toda la suite**

Run: `npm test`
Expected: 207 pruebas, `# fail 0` (132 del plan 1 + 1 modelo + 6 dom + 8 partida + 6 pantalla + 6 reproductor + 1 servidor + 6 sesión + 5 subida + 5 inventario + 6 guion + 2 vista previa + 6 propiedades + 3 barra + 2 capacidades + 3 inicio + 9 editor). Si el total difiere, buscar la prueba que falta o sobra antes de seguir; el número exacto importa menos que `# fail 0`.

- [ ] **Step 2: Actualizar `plataforma/README.md`**

Reemplazar la sección `## Estado` por:

```markdown
## Estado

Plan 1 (núcleo) y plan 2 (motor y editor) terminados: se puede arrancar, armar escenas,
personajes y líneas, subir fondos, retratos, música, efectos y voces, jugar el proyecto en
el reproductor, guardar y abrir copias. Faltan las fichas jurídicas en pantalla (plan 3),
la biblioteca (plan 4), las herramientas de creación (plan 5) y la publicación (plan 6).
```

Reemplazar la sección `## Requisitos del navegador` por:

````markdown
## Probar en local

```bash
node tests/manual/servir.js
```

Abre `http://localhost:8080/plataforma/` (el editor) o
`http://localhost:8080/tests/manual/motor.html` (el reproductor con un juego escrito a mano).
La plataforma usa IndexedDB y Web Crypto; Web Crypto exige un contexto seguro (HTTPS o
`localhost`) y los módulos ES no cargan desde `file://`, por eso hace falta el servidor.

## Cómo está armado el código

- `js/estado/`: el documento del juego y su validación, el almacén y las copias.
- `js/juridico/`: fichas, licencias, semáforo y textos.
- `js/motor/`: `partida.js` (estado puro), `pantalla.js` (dibujo) y `reproductor.js` (entrada y audio).
- `js/editor/`: `sesion.js` (estado del editor) y una vista por columna; `editor.js` las coordina.
- `js/ui/`: utilidades de DOM y comprobación de capacidades.
- `js/app.js`: arranque.

Las vistas se prueban con jsdom; lo que jsdom no cubre (arrastrar, audio, micrófono) se
comprueba a mano y, desde el plan 6, con Playwright.
````

- [ ] **Step 3: Commit**

```bash
git add plataforma/README.md
git commit -m "Cierre del plan 2: README de la plataforma con el estado y cómo probar en local" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Autorrevisión del plan contra el spec

**Cobertura.** Sección 3 (recorrido): paso 1 en la tarea 14 (inicio), paso 2 en las tareas 9 a 12 y 15 (editor), paso 4 en las tareas 3 a 5 y 15 (jugar nunca está bloqueado: el reproductor se abre siempre), paso 3 y 5 en los planes 3 y 6. Sección 6: `sinopsis` (tarea 1). Sección 7: barra (tarea 13, sin «Mapa de activos», que es del plan 3), inventario (9), escena activa con vista previa (11) y guion con reordenar por botones y arrastrando (10), columna derecha con propiedades (12; la ficha es del plan 3), Jugar desde la inicial o la activa (15), «El juego» con título, estudiante, destino y sinopsis (12). Sección 8: reproductor completo (3 a 5), mismo código en la vista previa (11) y, en el plan 6, dentro de `juego.html`; escalado sin suavizado por `origen === 'creado'` (4). Sección 10, primer párrafo: formatos, límites y ajuste de imágenes (8 y CSS de la 6); segundo párrafo: plan 3. Sección 13: guardado automático con espera (7), un proyecto por navegador y «Nuevo juego» con confirmación y copia (15), guardar y abrir copia con validación y confirmación (15), recordatorio cada 50 cambios y tras publicar (7 y 15; «tras publicar» lo dispara el plan 6 con `marcarCopiaGuardada` al revés, es decir, un aviso directo). Sección 15.4: tokens del portal (6), tema claro del editor y oscuro del reproductor (6 y 16). Sección 16: navegadores y aviso en pantallas angostas (16), teclado y foco visible (todas las vistas usan botones y controles nativos; `conservarFoco` evita perder el foco al redibujar), anuncios a lectores de pantalla (`anunciar`, zona `aria-live`); los cambios de semáforo se anuncian en el plan 3. Sección 17: micrófono (plan 5), archivo muy grande o formato no aceptado (8 y 15), espacio lleno (7 y 15: aviso con «Guardar copia»), paquete pesado (plan 6), copia dañada (15: se rechaza sin tocar nada), navegador sin capacidades (14 y 16), error inesperado (16: nunca una pantalla en blanco).

**Lo que queda fuera y dónde va.** Semáforos de colores en el inventario y panel de ficha: plan 3 (el inventario deja `data-ficha` en cada punto). Mapa de activos: plan 3. Biblioteca y «crear» desde herramientas en el botón de elementos: planes 4 y 5 (hoy solo «Subir archivo»). Créditos reales: plan 6 (`creditosProvisionales` se reemplaza). Playwright: plan 6.

**Placeholders.** Ninguna tarea dice «TBD», «similar a» ni «agregar validación»; cada paso trae el código o el comando. Los únicos textos provisionales están en el producto (créditos provisionales, aviso de «Publicar») y el plan dice qué plan los reemplaza.

**Consistencia de nombres.** `crearSesion({ proyecto, archivos, almacen, esperaMs, planificar, cancelar, crearUrl, liberarUrl })` con `cambiar(fn, { origen, estructura })`, `agregarArchivo`, `quitarArchivo`, `resolverRecurso`, `guardarAhora`, `esperarGuardado`, `marcarCopiaGuardada`, `reemplazar`, `cerrar`, `cambiosSinCopia`. Selección: `{ tipo: 'juego' | 'escena' | 'linea' | 'personaje' | 'elemento', id?, escena?, indice? }`. Vistas: `crearInventario(contenedor, sesion, { alSeleccionar, alSubir }).dibujar(seleccion)`, `crearGuion(contenedor, sesion, { alSeleccionar, confirmar })` con `dibujar(escena, indice)` y `marcarSeleccion(indice)`, `crearVistaPrevia(contenedor, sesion).dibujar(escena, indice)`, `crearPropiedades(contenedor, sesion, { contenido, alSeleccionar, confirmar }).dibujar(seleccion)`, `crearBarra(contenedor, sesion, { alJugar, alGuardarCopia, alAbrirCopia, alNuevoJuego, alPublicar }).dibujar()`, `crearInicio(contenedor, { nombreProducto, contenido, alEmpezar, alAbrirCopia })` con `dibujar()` y `mostrarError(mensaje)`. Motor: `crearPartida(juego, { escenaInicial })`, `vistaActual`, `vistaDeLinea(juego, escena, indice)`, `avanzar`, `elegir(partida, numero)`, `reiniciar`; `crearPantalla(contenedor, { juego, resolverRecurso })` con `mostrar(vista, { alElegir })` y `mostrarCreditos(titulo, lineas)`; `jugar(contenedor, juego, resolverRecurso, { escenaInicial, creditos, titulo, alCerrar, crearAudio })` → `{ cerrar, partida, raiz }`. Subida: `validarSubida(archivo)`, `mimeDe`, `nombreSugerido`, `subirElemento(sesion, archivo, { tipo, nombre })`, `TIPOS_POR_MEDIO`, `ACEPTA`, `medioDeTipo`. Los archivos binarios siguen siendo `{ tipo, datos: ArrayBuffer }`.

**Nota para el plan 3.** El panel de ficha entra en `propiedades.js` (una sección más arriba de las propiedades para elementos, personajes, título e historia); los puntos `data-ficha` del inventario se colorean con `evaluarTodo`; el cambio de destino ya avisa con `estructura: true`, así que recalcular semáforos es solo dibujar. La pregunta de autoría al subir se engancha en `editor.js`, después de `subirElemento`, abriendo la ficha del elemento nuevo.
