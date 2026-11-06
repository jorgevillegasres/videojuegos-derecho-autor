# Plan 1 de 6: Núcleo (modelo, semáforo, almacén y copias) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir y probar sin navegador el corazón de la plataforma: el modelo del juego, las fichas jurídicas, las reglas del semáforo, el contenido jurídico, el almacén en IndexedDB y las copias comprimidas.

**Architecture:** Módulos ES puros en `plataforma/js/`, sin DOM, cada uno con una responsabilidad y probado con el ejecutor de pruebas de Node. El semáforo es una función pura que devuelve códigos; los textos jurídicos viven en `contenido/juridico.json`. JSZip se inyecta como parámetro para que el mismo código corra en Node (pruebas) y en el navegador (vendorizado).

**Tech Stack:** JavaScript con módulos ES (sin framework, sin compilación), Node 24 con `node --test` y `node:assert/strict`, `jszip` 3.10, `fake-indexeddb` 6 solo para pruebas. Spec: `docs/superpowers/specs/2026-11-04-plataforma-primer-videojuego-design.md`.

---

## Mapa de planes

La especificación cubre seis bloques que se construyen en orden; cada plan deja software que funciona y se prueba solo. Este documento es el plan 1. Los demás se escriben cuando el anterior esté hecho, porque dependen del código real que produzca.

| Plan | Qué construye | Sección del spec |
|---|---|---|
| **1. Núcleo (este)** | Modelo del juego, fichas, licencias, semáforo, contenido jurídico, almacén, copias | 6, 12.2–12.5, 12.9, 13 |
| 2. Motor y editor | Reproductor, página `index.html`, inventario, guion, vista previa, propiedades, arranque | 3, 7, 8, 15.4, 16 |
| 3. Fichas en pantalla | Panel de ficha, semáforos en el inventario, mapa de activos, cambio de destino | 12.1, 12.6, 12.8 |
| 4. Biblioteca | Catálogo con piezas y licencias reales, créditos, carga en el editor | 11 |
| 5. Herramientas | Pixel art, grabador, secuenciador, subida de archivos | 9, 10 |
| 6. Publicación | Decisión de registro, créditos, informe, paquete de entrega, recorrido Playwright | 12.7, 14, 18 |

## Convenciones de este plan

- Todo el código y los nombres están en español. Las funciones de `modelo.js` **mutan** el proyecto que reciben y devuelven lo que crean; el editor guardará después de cada cambio.
- Las pruebas usan `test` de `node:test` y `assert` de `node:assert/strict`. Se ejecutan con `npm test` (que corre `node --test`, el cual busca solo los archivos `*.test.js`).
- Cada tarea termina con un commit. Los mensajes van en español, en infinitivo o sustantivo, y terminan con la línea `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Un archivo binario en memoria es siempre `{ tipo, datos }`: `tipo` es el MIME y `datos` un `ArrayBuffer`. Nunca se guardan `Blob` en IndexedDB.
- El resultado del semáforo es `{ color, razones, notas }` donde `razones` y `notas` son **listas de códigos** (`'R01'`, `'A04'`, `'N_IA'`). Los textos se agregan aparte con `describir()`.

## Estructura de archivos que deja este plan

```
package.json                       type module, script test, devDependencies
package-lock.json
plataforma/
  js/
    estado/
      modelo.js                    crear proyecto, escenas, personajes, elementos, líneas; regla de corte (indiceCorte)
      validacion.js                escenas alcanzables, validar, mínimo publicable, puede publicar (lectura pura)
      archivos.js                  MIME por extensión, huella SHA-256, sello de creación
      almacen.js                   IndexedDB: proyecto y archivos
      copias.js                    exportar e importar copia comprimida
    juridico/
      licencias.js                 catálogo de códigos de licencia y sus condiciones
      ficha.js                     tipo de obra por ficha y ficha inicial con precargas
      semaforo.js                  evaluar(ficha, contexto) y evaluarTodo(proyecto)
      textos.js                    describir(resultado, ficha, contenido)
    vendor/
      jszip.min.js                 copia de node_modules/jszip/dist/jszip.min.js
  contenido/
    juridico.json                  textos: campos, tipos de obra, reglas, notas
tests/
  ficha.test.js
  modelo.test.js
  validacion.test.js
  semaforo.test.js
  semaforo.casos.json              tabla de casos legible
  archivos.test.js
  almacen.test.js
  copias.test.js
  contenido.test.js
```

---

### Task 1: Andamiaje del proyecto

**Files:**
- Create: `package.json`
- Create: `plataforma/js/vendor/jszip.min.js` (copiado)
- Create: `plataforma/js/estado/.gitkeep`, `plataforma/js/juridico/.gitkeep`, `plataforma/contenido/.gitkeep`, `tests/.gitkeep`

- [ ] **Step 1: Crear `package.json` en la raíz del repositorio**

```json
{
  "name": "plataforma-primer-videojuego",
  "private": true,
  "version": "0.1.0",
  "description": "Plataforma de práctica: primer videojuego y derecho de autor",
  "type": "module",
  "scripts": {
    "test": "node --test"
  },
  "engines": {
    "node": ">=20"
  },
  "devDependencies": {
    "fake-indexeddb": "^6.0.0",
    "jszip": "^3.10.1"
  }
}
```

- [ ] **Step 2: Instalar dependencias**

Run: `npm install`
Expected: crea `node_modules/` y `package-lock.json`; termina con `added N packages` y sin errores. `node_modules/` ya está en `.gitignore`.

- [ ] **Step 3: Crear las carpetas y vendorizar JSZip**

Run:
```bash
node -e "const fs=require('fs');for(const d of ['plataforma/js/estado','plataforma/js/juridico','plataforma/js/vendor','plataforma/contenido','tests']){fs.mkdirSync(d,{recursive:true});fs.writeFileSync(d+'/.gitkeep','')};fs.copyFileSync('node_modules/jszip/dist/jszip.min.js','plataforma/js/vendor/jszip.min.js');console.log('listo')"
```
Expected: imprime `listo`. Verificar: `node -e "console.log(require('fs').statSync('plataforma/js/vendor/jszip.min.js').size)"` imprime un número mayor que 90000.

- [ ] **Step 4: Comprobar que el ejecutor de pruebas arranca sin pruebas**

Run: `npm test`
Expected: termina con `# tests 0` y `# fail 0` (o un mensaje de que no encontró archivos). Sin errores de sintaxis.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json plataforma tests
git commit -m "Andamiaje de la plataforma: paquete, carpetas y JSZip vendorizado" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Licencias y ficha inicial

**Files:**
- Create: `plataforma/js/juridico/licencias.js`
- Create: `plataforma/js/juridico/ficha.js`
- Test: `tests/ficha.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/ficha.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LICENCIAS, CONDICIONES, condicionesDe } from '../plataforma/js/juridico/licencias.js';
import {
  TIPOS_FICHA, TIPOS_OBRA, ORIGENES_FICHA, AUTORIAS, TITULARES, RESPALDOS, PRUEBAS, tipoObraPara, crearFicha,
} from '../plataforma/js/juridico/ficha.js';

test('el catálogo de licencias tiene los ocho códigos del spec más OTRA', () => {
  assert.deepEqual(Object.keys(LICENCIAS).sort(), [
    'CC-BY-4.0', 'CC-BY-NC-4.0', 'CC-BY-ND-4.0', 'CC-BY-SA-4.0', 'CC0', 'CURSO', 'DESCONOCIDO', 'DP', 'OTRA',
  ]);
  assert.deepEqual(LICENCIAS['CC-BY-NC-4.0'].condiciones, ['BY', 'NC']);
  assert.deepEqual(LICENCIAS.CC0.condiciones, []);
});

test('condicionesDe lee el código o, con OTRA, las condiciones escritas en la ficha', () => {
  assert.deepEqual(condicionesDe({ licencia: 'CC-BY-SA-4.0' }), ['BY', 'SA']);
  assert.deepEqual(condicionesDe({ licencia: 'OTRA', condicionesOtra: ['BY', 'ND'] }), ['BY', 'ND']);
  assert.deepEqual(condicionesDe({ licencia: 'OTRA' }), []);
  assert.deepEqual(condicionesDe({ licencia: null }), []);
  assert.deepEqual(condicionesDe({ licencia: 'INVENTADA' }), []);
});

test('cada tipo de ficha tiene un tipo de obra conocido', () => {
  assert.deepEqual(TIPOS_FICHA, ['titulo', 'historia', 'personaje', 'fondo', 'retrato', 'musica', 'efecto', 'voz']);
  for (const tipo of TIPOS_FICHA) {
    const codigo = tipoObraPara(tipo);
    assert.ok(TIPOS_OBRA[codigo], `${tipo} → ${codigo} debe existir en TIPOS_OBRA`);
  }
  assert.equal(tipoObraPara('historia'), 'literaria');
  assert.equal(tipoObraPara('retrato'), 'artistica');
  assert.equal(tipoObraPara('musica'), 'musical_fonograma');
  assert.equal(tipoObraPara('voz'), 'interpretacion');
  assert.equal(tipoObraPara('titulo'), 'titulo');
  assert.throws(() => tipoObraPara('mapa'), /Tipo de ficha inválido/);
});

test('una ficha creada dentro de la plataforma precarga autoría propia y sello', () => {
  const f = crearFicha('fondo', { origen: 'creado' });
  assert.equal(f.tipo, 'fondo');
  assert.equal(f.tipoObra, 'artistica');
  assert.equal(f.origen, 'creado');
  assert.equal(f.autoria, 'yo');
  assert.equal(f.titular, 'yo');
  assert.equal(f.respaldo, 'ninguno');
  assert.equal(f.licencia, null);
  assert.equal(f.prueba, 'sello');
  assert.equal(f.credito, '');
  assert.equal(f.licenciaLeida, false);
  assert.equal(f.reconoceSinDerechos, false);
});

test('una ficha subida no precarga prueba', () => {
  const f = crearFicha('musica', { origen: 'subido' });
  assert.equal(f.prueba, 'ninguna');
  assert.equal(f.autoria, 'yo');
});

test('una ficha de biblioteca precarga autor, licencia y crédito sugerido', () => {
  const entrada = { id: 'bib_f1', autor: 'Autora Ejemplo', licencia: 'CC-BY-4.0', creditoSugerido: '«Muelle» de Autora Ejemplo, CC BY 4.0' };
  const f = crearFicha('fondo', { origen: 'biblioteca', biblioteca: entrada });
  assert.equal(f.autoria, 'otra_persona');
  assert.equal(f.autorNombre, 'Autora Ejemplo');
  assert.equal(f.titular, 'otra_persona');
  assert.equal(f.respaldo, 'licencia');
  assert.equal(f.licencia, 'CC-BY-4.0');
  assert.equal(f.credito, '«Muelle» de Autora Ejemplo, CC BY 4.0');
  assert.equal(f.licenciaLeida, false);
  assert.equal(f.prueba, 'ninguna');
});

test('las fichas escritas (título, historia, personaje) tienen origen escrito', () => {
  assert.equal(crearFicha('titulo').origen, 'escrito');
  assert.equal(crearFicha('historia').origen, 'escrito');
  assert.equal(crearFicha('personaje').basadoEnObraAjena, false);
  assert.throws(() => crearFicha('fondo', { origen: 'robado' }), /Origen inválido/);
});

test('crearFicha exige la entrada de biblioteca y una licencia conocida', () => {
  assert.throws(() => crearFicha('fondo', { origen: 'biblioteca' }), /requiere la entrada de biblioteca/);
  assert.throws(() => crearFicha('fondo', { origen: 'biblioteca', biblioteca: { autor: 'X', licencia: 'INVENTADA' } }), /Licencia desconocida/);
});

test('condicionesDe devuelve copias: mutarlas no toca el catálogo ni la ficha', () => {
  const copia = condicionesDe({ licencia: 'CC-BY-4.0' });
  copia.push('NC');
  assert.deepEqual(LICENCIAS['CC-BY-4.0'].condiciones, ['BY']);
  const otra = { licencia: 'OTRA', condicionesOtra: ['BY'] };
  condicionesDe(otra).push('SA');
  assert.deepEqual(otra.condicionesOtra, ['BY']);
});

test('los valores por defecto de la ficha pertenecen a sus enumeraciones', () => {
  const f = crearFicha('voz', { origen: 'subido' });
  assert.ok(ORIGENES_FICHA.includes(f.origen));
  assert.ok(AUTORIAS.includes(f.autoria));
  assert.ok(TITULARES.includes(f.titular));
  assert.ok(RESPALDOS.includes(f.respaldo));
  assert.ok(PRUEBAS.includes(f.prueba));
  for (const entrada of Object.values(LICENCIAS)) {
    for (const condicion of entrada.condiciones ?? []) assert.ok(CONDICIONES.includes(condicion), `${condicion} no está en CONDICIONES`);
  }
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/ficha.test.js`
Expected: FAIL con `Cannot find module` para `licencias.js`.

- [ ] **Step 3: Escribir `licencias.js`**

```js
// plataforma/js/juridico/licencias.js
// Códigos de licencia que entiende la plataforma y las condiciones que imponen.
// Las condiciones son las de Creative Commons: BY (atribución), NC (no comercial),
// SA (compartir igual), ND (sin derivadas). CURSO y DESCONOCIDO no llevan
// condiciones: el semáforo las trata por su código.

export const LICENCIAS = {
  DP: { nombre: 'Dominio público', condiciones: [] },
  CC0: { nombre: 'Creative Commons Zero (CC0 1.0)', condiciones: [] },
  'CC-BY-4.0': { nombre: 'Creative Commons Atribución 4.0', condiciones: ['BY'] },
  'CC-BY-SA-4.0': { nombre: 'Creative Commons Atribución y compartir igual 4.0', condiciones: ['BY', 'SA'] },
  'CC-BY-NC-4.0': { nombre: 'Creative Commons Atribución y no comercial 4.0', condiciones: ['BY', 'NC'] },
  'CC-BY-ND-4.0': { nombre: 'Creative Commons Atribución y sin derivadas 4.0', condiciones: ['BY', 'ND'] },
  CURSO: { nombre: 'Licencia limitada al curso', condiciones: [] },
  DESCONOCIDO: { nombre: 'Autor desconocido (encontrado en internet)', condiciones: [] },
  OTRA: { nombre: 'Otra licencia (descríbela)', condiciones: null },
};

export const CONDICIONES = ['BY', 'NC', 'SA', 'ND'];

/** Condiciones que impone la licencia de una ficha. Con OTRA, las que marcó el estudiante. Devuelve una copia. */
export function condicionesDe(ficha) {
  if (!ficha.licencia) return [];
  if (ficha.licencia === 'OTRA') return Array.isArray(ficha.condicionesOtra) ? [...ficha.condicionesOtra] : [];
  return [...(LICENCIAS[ficha.licencia]?.condiciones ?? [])];
}
```

- [ ] **Step 4: Escribir `ficha.js`**

```js
// plataforma/js/juridico/ficha.js
// Qué es una ficha jurídica y cómo nace, con sus precargas según el origen.
import { LICENCIAS } from './licencias.js';

export const TIPOS_FICHA = ['titulo', 'historia', 'personaje', 'fondo', 'retrato', 'musica', 'efecto', 'voz'];
export const ORIGENES_FICHA = ['escrito', 'creado', 'subido', 'biblioteca'];
export const AUTORIAS = ['yo', 'otra_persona', 'ia', 'ia_con_aporte'];
export const TITULARES = ['yo', 'otra_persona'];
export const RESPALDOS = ['ninguno', 'cesion', 'licencia', 'autorizacion'];
export const PRUEBAS = ['ninguna', 'sello', 'original', 'repositorio', 'registro_dnda'];

export const TIPOS_OBRA = {
  literaria: { nombre: 'Obra literaria' },
  artistica: { nombre: 'Obra artística' },
  musical_fonograma: { nombre: 'Obra musical y grabación (fonograma)' },
  fonograma: { nombre: 'Grabación (fonograma)' },
  interpretacion: { nombre: 'Interpretación y grabación' },
  titulo: { nombre: 'Título: no es obra; puede ser marca' },
};

const OBRA_POR_FICHA = {
  titulo: 'titulo',
  historia: 'literaria',
  personaje: 'literaria',
  fondo: 'artistica',
  retrato: 'artistica',
  musica: 'musical_fonograma',
  efecto: 'fonograma',
  voz: 'interpretacion',
};

export function tipoObraPara(tipoFicha) {
  const codigo = OBRA_POR_FICHA[tipoFicha];
  if (!codigo) throw new Error(`Tipo de ficha inválido: ${tipoFicha}`);
  return codigo;
}

/**
 * Crea la ficha inicial de un elemento, personaje, historia o título.
 * @param {string} tipoFicha uno de TIPOS_FICHA
 * @param {{origen?: string, biblioteca?: object|null}} opciones
 */
export function crearFicha(tipoFicha, { origen = 'escrito', biblioteca = null } = {}) {
  const tipoObra = tipoObraPara(tipoFicha);
  if (!ORIGENES_FICHA.includes(origen)) throw new Error(`Origen inválido: ${origen}`);
  if (origen === 'biblioteca') {
    if (!biblioteca) throw new Error('El origen biblioteca requiere la entrada de biblioteca.');
    if (!(biblioteca.licencia in LICENCIAS)) throw new Error(`Licencia desconocida en la biblioteca: ${biblioteca.licencia}`);
  }
  const ficha = {
    tipo: tipoFicha,
    tipoObra,
    origen,
    autoria: 'yo',
    autorNombre: '',
    herramientaIA: '',
    aporteHumano: '',
    reconoceSinDerechos: false,
    basadoEnObraAjena: false,
    autorizacionDerivada: false,
    titular: 'yo',
    respaldo: 'ninguno',
    licencia: null,
    licenciaTexto: '',
    condicionesOtra: [],
    licenciaLeida: false,
    aceptaCompartirIgual: false,
    modificado: false,
    credito: '',
    prueba: 'ninguna',
  };
  if (origen === 'creado') ficha.prueba = 'sello';
  if (origen === 'biblioteca') {
    ficha.autoria = 'otra_persona';
    ficha.autorNombre = biblioteca.autor ?? '';
    ficha.titular = 'otra_persona';
    ficha.respaldo = 'licencia';
    ficha.licencia = biblioteca.licencia;
    ficha.credito = biblioteca.creditoSugerido ?? '';
  }
  return ficha;
}
```

- [ ] **Step 5: Correr las pruebas para ver que pasan**

Run: `node --test tests/ficha.test.js`
Expected: `# pass 10`, `# fail 0`.

- [ ] **Step 6: Commit**

```bash
git add plataforma/js/juridico/licencias.js plataforma/js/juridico/ficha.js tests/ficha.test.js
git commit -m "Licencias y ficha jurídica inicial con precargas por origen" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Modelo del juego: crear, agregar y eliminar

**Files:**
- Create: `plataforma/js/estado/modelo.js`
- Test: `tests/modelo.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/modelo.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  crearProyecto, agregarEscena, eliminarEscena, agregarPersonaje, eliminarPersonaje,
  agregarElemento, eliminarElemento, crearLinea, agregarLinea, moverLinea,
} from '../plataforma/js/estado/modelo.js';

function proyectoBase() {
  return crearProyecto({ estudiante: 'Camila R.', titulo: 'La llave del faro', destino: 'gratis' }, new Date('2026-11-04T20:00:00Z'));
}

test('crearProyecto deja una escena inicial y las fichas de título e historia', () => {
  const p = proyectoBase();
  assert.equal(p.version, 1);
  assert.equal(p.estudiante, 'Camila R.');
  assert.equal(p.creado, '2026-11-04T20:00:00.000Z');
  assert.equal(p.juego.titulo, 'La llave del faro');
  assert.equal(p.juego.destino, 'gratis');
  assert.equal(p.juego.escenas.length, 1);
  assert.equal(p.juego.escenaInicial, p.juego.escenas[0].id);
  assert.deepEqual(p.juego.personajes, []);
  assert.deepEqual(p.juego.elementos, []);
  assert.equal(p.fichas.titulo.tipo, 'titulo');
  assert.equal(p.fichas.historia.tipo, 'historia');
  assert.deepEqual(p.registro, []);
  assert.equal(p.publicado, null);
  assert.throws(() => crearProyecto({ destino: 'alquiler' }), /Destino inválido/);
});

test('agregarEscena y eliminarEscena mantienen las referencias coherentes', () => {
  const p = proyectoBase();
  const inicial = p.juego.escenas[0];
  const torre = agregarEscena(p, 'La torre');
  assert.equal(p.juego.escenas.length, 2);
  assert.match(torre.id, /^esc_[a-f0-9]{8}$/);
  const decision = agregarLinea(inicial, 'decision', { texto: '¿Subes?', opciones: [{ texto: 'Sí', escena: torre.id }, { texto: 'No', escena: null }] });
  eliminarEscena(p, torre.id);
  assert.equal(p.juego.escenas.length, 1);
  assert.equal(decision.opciones[0].escena, null, 'la opción que apuntaba a la escena borrada queda sin destino');
  eliminarEscena(p, inicial.id);
  assert.equal(p.juego.escenaInicial, null);
});

test('eliminar la escena inicial pasa el inicio a la siguiente', () => {
  const p = proyectoBase();
  const segunda = agregarEscena(p, 'Segunda');
  eliminarEscena(p, p.juego.escenaInicial);
  assert.equal(p.juego.escenaInicial, segunda.id);
});

test('agregarPersonaje crea su ficha y eliminarPersonaje la borra y limpia los diálogos', () => {
  const p = proyectoBase();
  const ana = agregarPersonaje(p, { nombre: 'Ana', descripcion: 'Farera' });
  assert.equal(p.fichas[ana.id].tipo, 'personaje');
  assert.equal(ana.retrato, null);
  const linea = agregarLinea(p.juego.escenas[0], 'dialogo', { personaje: ana.id, texto: 'Hola' });
  eliminarPersonaje(p, ana.id);
  assert.equal(p.juego.personajes.length, 0);
  assert.equal(p.fichas[ana.id], undefined);
  assert.equal(linea.personaje, null);
});

test('agregarElemento valida tipo y origen y crea la ficha con precargas', () => {
  const p = proyectoBase();
  const fondo = agregarElemento(p, { tipo: 'fondo', nombre: 'Muelle', archivo: 'el_1.png', origen: 'creado', sello: { fecha: 'x', huella: 'sha256:abc' } });
  assert.equal(p.fichas[fondo.id].origen, 'creado');
  assert.equal(p.fichas[fondo.id].prueba, 'sello');
  const bib = { id: 'bib_m1', autor: 'Autora Ejemplo', licencia: 'CC-BY-NC-4.0', creditoSugerido: 'crédito' };
  const tema = agregarElemento(p, { tipo: 'musica', nombre: 'Tema', archivo: 'el_2.ogg', origen: 'biblioteca', biblioteca: bib });
  assert.equal(p.fichas[tema.id].licencia, 'CC-BY-NC-4.0');
  assert.equal(tema.biblioteca.id, 'bib_m1');
  assert.throws(() => agregarElemento(p, { tipo: 'video', nombre: 'x', archivo: 'x', origen: 'creado' }), /Tipo de elemento inválido/);
  assert.throws(() => agregarElemento(p, { tipo: 'fondo', nombre: 'x', archivo: 'x', origen: 'prestado' }), /Origen inválido/);
});

test('eliminarElemento limpia todas las referencias y la ficha', () => {
  const p = proyectoBase();
  const escena = p.juego.escenas[0];
  const ana = agregarPersonaje(p, { nombre: 'Ana' });
  const retrato = agregarElemento(p, { tipo: 'retrato', nombre: 'Ana', archivo: 'r.png', origen: 'creado' });
  const fondo = agregarElemento(p, { tipo: 'fondo', nombre: 'Muelle', archivo: 'f.png', origen: 'creado' });
  const musica = agregarElemento(p, { tipo: 'musica', nombre: 'Tema', archivo: 'm.wav', origen: 'creado' });
  const olas = agregarElemento(p, { tipo: 'efecto', nombre: 'Olas', archivo: 'o.wav', origen: 'creado' });
  ana.retrato = retrato.id;
  escena.fondo = fondo.id;
  escena.musica = musica.id;
  const linea = agregarLinea(escena, 'dialogo', { personaje: ana.id, texto: '…', efecto: olas.id, voz: olas.id });
  for (const el of [retrato, fondo, musica, olas]) eliminarElemento(p, el.id);
  assert.equal(p.juego.elementos.length, 0);
  assert.equal(ana.retrato, null);
  assert.equal(escena.fondo, null);
  assert.equal(escena.musica, null);
  assert.equal(linea.efecto, null);
  assert.equal(linea.voz, null);
  assert.equal(p.fichas[fondo.id], undefined);
});

test('crearLinea pone valores por defecto según el tipo', () => {
  assert.deepEqual(crearLinea('narracion'), { tipo: 'narracion', texto: '' });
  assert.deepEqual(crearLinea('dialogo'), { tipo: 'dialogo', personaje: null, texto: '', efecto: null, voz: null });
  assert.deepEqual(crearLinea('decision'), { tipo: 'decision', texto: '', opciones: [{ texto: '', escena: null }, { texto: '', escena: null }] });
  assert.deepEqual(crearLinea('fin', { texto: 'Fin' }), { tipo: 'fin', texto: 'Fin' });
  assert.throws(() => crearLinea('salto'), /Tipo de línea inválido/);
});

test('moverLinea reordena dentro de los límites', () => {
  const p = proyectoBase();
  const escena = p.juego.escenas[0];
  agregarLinea(escena, 'narracion', { texto: 'a' });
  agregarLinea(escena, 'narracion', { texto: 'b' });
  agregarLinea(escena, 'narracion', { texto: 'c' });
  moverLinea(escena, 0, 1);
  assert.deepEqual(escena.lineas.map((l) => l.texto), ['b', 'a', 'c']);
  moverLinea(escena, 2, 1);
  assert.deepEqual(escena.lineas.map((l) => l.texto), ['b', 'a', 'c'], 'no se sale del final');
  moverLinea(escena, 0, -1);
  assert.deepEqual(escena.lineas.map((l) => l.texto), ['b', 'a', 'c'], 'no se sale del inicio');
});

test('agregarElemento no deja un elemento huérfano si la ficha falla', () => {
  const p = proyectoBase();
  assert.throws(() => agregarElemento(p, { tipo: 'fondo', nombre: 'x', archivo: 'x.png', origen: 'biblioteca' }), /requiere la entrada de biblioteca/);
  assert.equal(p.juego.elementos.length, 0);
  assert.deepEqual(Object.keys(p.fichas), ['titulo', 'historia']);
});

test('eliminar un id inexistente no hace nada ni falla', () => {
  const p = proyectoBase();
  const ana = agregarPersonaje(p, { nombre: 'Ana' });
  const fondo = agregarElemento(p, { tipo: 'fondo', nombre: 'Muelle', archivo: 'f.png', origen: 'creado' });
  eliminarElemento(p, 'el_noexiste');
  eliminarPersonaje(p, 'per_noexiste');
  eliminarEscena(p, 'esc_noexiste');
  assert.equal(p.juego.elementos.length, 1);
  assert.equal(p.juego.personajes.length, 1);
  assert.equal(p.juego.escenas.length, 1);
  assert.ok(p.fichas[ana.id] && p.fichas[fondo.id]);
});

test('eliminar un personaje deja intactas las demás fichas; nombres vacíos por defecto', () => {
  const p = proyectoBase();
  const ana = agregarPersonaje(p, { nombre: 'Ana' });
  const luis = agregarPersonaje(p);
  assert.equal(luis.nombre, '');
  assert.equal(agregarEscena(p).nombre, '');
  eliminarPersonaje(p, ana.id);
  assert.equal(p.fichas[luis.id].tipo, 'personaje');
  assert.equal(p.fichas.titulo.tipo, 'titulo');
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/modelo.test.js`
Expected: FAIL con `Cannot find module` para `modelo.js`.

- [ ] **Step 3: Escribir `modelo.js` (primera parte)**

```js
// plataforma/js/estado/modelo.js
// El documento del juego: cómo se crea y cómo cambia. Las funciones mutan el
// proyecto que reciben y devuelven lo que crean. No tocan el DOM ni el almacén.
// Convenciones: se valida antes de mutar; un id o índice inexistente se ignora
// sin error; la validez estructural (nombres vacíos, opciones de más o de menos,
// referencias rotas) la informa validar(), no los mutadores.
import { crearFicha } from '../juridico/ficha.js';

export const VERSION_PROYECTO = 1;
export const DESTINOS = ['personal', 'gratis', 'venta'];
export const TIPOS_ELEMENTO = ['fondo', 'retrato', 'musica', 'efecto', 'voz'];
export const ORIGENES = ['creado', 'subido', 'biblioteca'];
export const TIPOS_LINEA = ['narracion', 'dialogo', 'decision', 'fin'];

export function nuevoId(prefijo) {
  return `${prefijo}_${crypto.randomUUID().replaceAll('-', '').slice(0, 8)}`;
}

export function crearProyecto({ estudiante = '', titulo = '', destino = 'gratis' } = {}, ahora = new Date()) {
  if (!DESTINOS.includes(destino)) throw new Error(`Destino inválido: ${destino}`);
  const escena = crearEscena('Escena 1');
  return {
    version: VERSION_PROYECTO,
    estudiante,
    creado: ahora.toISOString(),
    juego: { titulo, destino, escenaInicial: escena.id, escenas: [escena], personajes: [], elementos: [] },
    fichas: { titulo: crearFicha('titulo'), historia: crearFicha('historia') },
    registro: [],
    publicado: null,
  };
}

// ---- Escenas ----

export function crearEscena(nombre = '') {
  return { id: nuevoId('esc'), nombre, fondo: null, musica: null, lineas: [] };
}

export function agregarEscena(proyecto, nombre = '') {
  const escena = crearEscena(nombre);
  proyecto.juego.escenas.push(escena);
  return escena;
}

export function eliminarEscena(proyecto, id) {
  const { juego } = proyecto;
  juego.escenas = juego.escenas.filter((e) => e.id !== id);
  for (const escena of juego.escenas) {
    for (const linea of escena.lineas) {
      if (linea.tipo !== 'decision') continue;
      for (const opcion of linea.opciones) if (opcion.escena === id) opcion.escena = null;
    }
  }
  if (juego.escenaInicial === id) juego.escenaInicial = juego.escenas[0]?.id ?? null;
}

// ---- Personajes ----

export function agregarPersonaje(proyecto, { nombre = '', descripcion = '' } = {}) {
  const personaje = { id: nuevoId('per'), nombre, descripcion, retrato: null };
  proyecto.juego.personajes.push(personaje);
  proyecto.fichas[personaje.id] = crearFicha('personaje');
  return personaje;
}

export function eliminarPersonaje(proyecto, id) {
  const { juego } = proyecto;
  juego.personajes = juego.personajes.filter((p) => p.id !== id);
  for (const escena of juego.escenas) {
    for (const linea of escena.lineas) if (linea.tipo === 'dialogo' && linea.personaje === id) linea.personaje = null;
  }
  delete proyecto.fichas[id];
}

// ---- Elementos ----

export function agregarElemento(proyecto, { tipo, nombre, archivo, origen, sello = null, biblioteca = null }) {
  if (!TIPOS_ELEMENTO.includes(tipo)) throw new Error(`Tipo de elemento inválido: ${tipo}`);
  if (!ORIGENES.includes(origen)) throw new Error(`Origen inválido: ${origen}`);
  const ficha = crearFicha(tipo, { origen, biblioteca });
  const elemento = { id: nuevoId('el'), tipo, nombre, archivo, origen, sello, biblioteca };
  proyecto.juego.elementos.push(elemento);
  proyecto.fichas[elemento.id] = ficha;
  return elemento;
}

export function eliminarElemento(proyecto, id) {
  const { juego } = proyecto;
  juego.elementos = juego.elementos.filter((e) => e.id !== id);
  for (const personaje of juego.personajes) if (personaje.retrato === id) personaje.retrato = null;
  for (const escena of juego.escenas) {
    if (escena.fondo === id) escena.fondo = null;
    if (escena.musica === id) escena.musica = null;
    for (const linea of escena.lineas) {
      if (linea.tipo !== 'dialogo') continue;
      if (linea.efecto === id) linea.efecto = null;
      if (linea.voz === id) linea.voz = null;
    }
  }
  delete proyecto.fichas[id];
}

// ---- Líneas ----

export function crearLinea(tipo, datos = {}) {
  switch (tipo) {
    case 'narracion':
      return { tipo, texto: datos.texto ?? '' };
    case 'dialogo':
      return { tipo, personaje: datos.personaje ?? null, texto: datos.texto ?? '', efecto: datos.efecto ?? null, voz: datos.voz ?? null };
    case 'decision':
      return { tipo, texto: datos.texto ?? '', opciones: datos.opciones ?? [{ texto: '', escena: null }, { texto: '', escena: null }] };
    case 'fin':
      return { tipo, texto: datos.texto ?? '' };
    default:
      throw new Error(`Tipo de línea inválido: ${tipo}`);
  }
}

export function agregarLinea(escena, tipo, datos) {
  const linea = crearLinea(tipo, datos);
  escena.lineas.push(linea);
  return linea;
}

export function moverLinea(escena, indice, desplazamiento) {
  const destino = indice + desplazamiento;
  if (indice < 0 || indice >= escena.lineas.length) return;
  if (destino < 0 || destino >= escena.lineas.length) return;
  const [linea] = escena.lineas.splice(indice, 1);
  escena.lineas.splice(destino, 0, linea);
}
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/modelo.test.js`
Expected: `# pass 11`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/estado/modelo.js tests/modelo.test.js
git commit -m "Modelo del juego: crear proyecto, escenas, personajes, elementos y líneas" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Validación del juego y escenas alcanzables

**Files:**
- Create: `plataforma/js/estado/validacion.js`
- Modify: `plataforma/js/estado/modelo.js` (agregar `indiceCorte` al final)
- Create: `tests/validacion.test.js`
- Modify: `tests/modelo.test.js` (agregar una prueba al final)

Regla del motor que fija este diseño: **una escena termina en su primera línea de decisión o de fin** (`indiceCorte`). Si se acaban las líneas sin ninguna de las dos, el juego sigue con la siguiente escena de la lista; si no hay siguiente, termina y muestra los créditos. Las líneas que quedan después de una decisión o un fin nunca se ven. La regla vive en `modelo.js` para que el reproductor (plan 2) y la validación la compartan.

La validación va en un módulo aparte porque es lectura pura y `modelo.js` es mutación; así cada archivo tiene un solo contrato. Las tareas 5 y 8 agregan a `validacion.js`.

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `tests/validacion.test.js`:

```js
// tests/validacion.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearProyecto, agregarEscena, agregarPersonaje, agregarLinea } from '../plataforma/js/estado/modelo.js';
import { validar, escenasAlcanzables } from '../plataforma/js/estado/validacion.js';

function proyectoBase() {
  return crearProyecto({ estudiante: 'Camila R.', titulo: 'La llave del faro', destino: 'gratis' }, new Date('2026-11-04T20:00:00Z'));
}

function juegoConTresEscenas() {
  const p = proyectoBase();
  const muelle = p.juego.escenas[0];
  muelle.nombre = 'El muelle';
  const torre = agregarEscena(p, 'La torre');
  const amanecer = agregarEscena(p, 'Amanecer');
  const ana = agregarPersonaje(p, { nombre: 'Ana' });
  agregarLinea(muelle, 'dialogo', { personaje: ana.id, texto: 'Hola' });
  agregarLinea(muelle, 'decision', { texto: '¿Subes?', opciones: [{ texto: 'Sí', escena: torre.id }, { texto: 'No', escena: amanecer.id }] });
  agregarLinea(torre, 'fin', { texto: 'Fin' });
  agregarLinea(amanecer, 'narracion', { texto: 'Amanece.' });
  return { p, muelle, torre, amanecer, ana };
}

test('un juego bien armado no tiene avisos bloqueantes', () => {
  const { p } = juegoConTresEscenas();
  const avisos = validar(p.juego);
  assert.deepEqual(avisos.filter((a) => a.nivel === 'bloqueante'), []);
});

test('escenasAlcanzables sigue decisiones y el avance natural a la siguiente escena', () => {
  const { p, muelle, torre, amanecer } = juegoConTresEscenas();
  const extra = agregarEscena(p, 'Extra');
  agregarLinea(amanecer, 'narracion', { texto: 'sin decisión ni fin: sigue a la siguiente' });
  assert.deepEqual([...escenasAlcanzables(p.juego)].sort(), [muelle.id, torre.id, amanecer.id, extra.id].sort());
  agregarLinea(amanecer, 'fin', { texto: 'Fin' });
  assert.equal(escenasAlcanzables(p.juego).has(extra.id), false, 'con fin en Amanecer, Extra ya no se alcanza');
});

test('B01: sin escena inicial válida', () => {
  const { p } = juegoConTresEscenas();
  p.juego.escenaInicial = 'esc_noexiste';
  assert.ok(validar(p.juego).some((a) => a.codigo === 'B01' && a.nivel === 'bloqueante'));
});

test('B02: opción de decisión sin escena destino', () => {
  const { p, muelle } = juegoConTresEscenas();
  muelle.lineas[1].opciones[1].escena = null;
  const aviso = validar(p.juego).find((a) => a.codigo === 'B02');
  assert.equal(aviso.nivel, 'bloqueante');
  assert.equal(aviso.escena, muelle.id);
  assert.equal(aviso.linea, 1);
  assert.match(aviso.mensaje, /opción 2/);
});

test('B03: diálogo sin personaje', () => {
  const { p, muelle } = juegoConTresEscenas();
  muelle.lineas[0].personaje = null;
  assert.ok(validar(p.juego).some((a) => a.codigo === 'B03' && a.nivel === 'bloqueante'));
});

test('I01: escena inalcanzable', () => {
  const { p, amanecer } = juegoConTresEscenas();
  agregarLinea(amanecer, 'fin', { texto: 'Fin' });
  const perdida = agregarEscena(p, 'Perdida');
  const aviso = validar(p.juego).find((a) => a.codigo === 'I01');
  assert.equal(aviso.nivel, 'informativo');
  assert.equal(aviso.escena, perdida.id);
});

test('I02: personaje sin retrato; I03: escena sin líneas; I04: sin fin alcanzable; I05: líneas tras el corte', () => {
  const { p, torre, ana } = juegoConTresEscenas();
  const vacia = agregarEscena(p, 'Vacía');
  torre.lineas = [{ tipo: 'narracion', texto: 'Nunca termina' }];
  agregarLinea(p.juego.escenas[0], 'narracion', { texto: 'después de la decisión' });
  const codigos = validar(p.juego).map((a) => a.codigo);
  assert.ok(codigos.includes('I02'), 'Ana no tiene retrato');
  assert.ok(codigos.includes('I03'), `Vacía (${vacia.id}) no tiene líneas`);
  assert.ok(codigos.includes('I04'), 'ninguna escena alcanzable termina en fin');
  assert.ok(codigos.includes('I05'), 'hay una línea después de la decisión del muelle');
  assert.ok(!codigos.includes('B03'), `${ana.nombre} sigue existiendo`);
});

test('B04: una decisión necesita entre dos y cuatro opciones', () => {
  const { p, muelle, torre } = juegoConTresEscenas();
  muelle.lineas[1].opciones = [{ texto: 'Única', escena: torre.id }];
  let aviso = validar(p.juego).find((a) => a.codigo === 'B04');
  assert.equal(aviso.nivel, 'bloqueante');
  assert.equal(aviso.escena, muelle.id);
  assert.equal(aviso.linea, 1);
  muelle.lineas[1].opciones = Array.from({ length: 5 }, (_, i) => ({ texto: `Opción ${i + 1}`, escena: torre.id }));
  aviso = validar(p.juego).find((a) => a.codigo === 'B04');
  assert.ok(aviso, 'cinco opciones también se bloquean');
  muelle.lineas[1].opciones = Array.from({ length: 4 }, (_, i) => ({ texto: `Opción ${i + 1}`, escena: torre.id }));
  assert.ok(!validar(p.juego).some((a) => a.codigo === 'B04'), 'cuatro opciones están bien');
});

test('con B01 no se agregan I01 ni I04 de rebote', () => {
  const { p } = juegoConTresEscenas();
  p.juego.escenaInicial = null;
  const codigos = validar(p.juego).map((a) => a.codigo);
  assert.ok(codigos.includes('B01'));
  assert.ok(!codigos.includes('I01'));
  assert.ok(!codigos.includes('I04'));
  assert.equal(escenasAlcanzables(p.juego).size, 0);
});

test('escenasAlcanzables termina con ciclos y validar no muta el juego', () => {
  const { p, muelle, torre } = juegoConTresEscenas();
  torre.lineas = [];
  agregarLinea(torre, 'decision', { texto: '¿Volver?', opciones: [{ texto: 'Sí', escena: muelle.id }, { texto: 'No', escena: muelle.id }] });
  const antes = structuredClone(p.juego);
  const alcanzables = escenasAlcanzables(p.juego);
  assert.ok(alcanzables.has(muelle.id) && alcanzables.has(torre.id));
  validar(p.juego);
  assert.deepEqual(p.juego, antes);
});

test('I05 señala la primera línea que no se verá y las escenas sin nombre se describen por posición', () => {
  const { p, muelle } = juegoConTresEscenas();
  agregarLinea(muelle, 'narracion', { texto: 'después' });
  const i05 = validar(p.juego).find((a) => a.codigo === 'I05');
  assert.equal(i05.linea, 2);
  const sinNombre = agregarEscena(p);
  const i03 = validar(p.juego).find((a) => a.codigo === 'I03' && a.escena === sinNombre.id);
  assert.match(i03.mensaje, /sin nombre \(n\.º 4\)/);
});
```

Y en `tests/modelo.test.js`, agregar `indiceCorte` a la lista de importación de `modelo.js` y esta prueba al final:

```js
test('indiceCorte encuentra la primera decisión o fin', () => {
  const p = proyectoBase();
  const escena = p.juego.escenas[0];
  assert.equal(indiceCorte(escena), -1);
  agregarLinea(escena, 'narracion', { texto: 'a' });
  agregarLinea(escena, 'fin', { texto: 'b' });
  agregarLinea(escena, 'decision');
  assert.equal(indiceCorte(escena), 1);
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/validacion.test.js`
Expected: FAIL con `Cannot find module` para `validacion.js`. Y `node --test tests/modelo.test.js` falla con `does not provide an export named 'indiceCorte'`.

- [ ] **Step 3: Agregar `indiceCorte` al final de `modelo.js`**

```js

/** Índice de la primera línea de decisión o fin de la escena, o -1 si no hay. El reproductor y la validación comparten esta regla. */
export function indiceCorte(escena) {
  return escena.lineas.findIndex((l) => l.tipo === 'decision' || l.tipo === 'fin');
}
```

- [ ] **Step 4: Escribir `validacion.js`**

```js
// plataforma/js/estado/validacion.js
// Lectura pura del documento del juego: qué escenas se alcanzan y qué avisos
// (no jurídicos) tiene el editor. No muta nada. Los avisos 'bloqueante' impiden
// publicar; los 'informativo' solo se muestran.
import { indiceCorte } from './modelo.js';

export const OPCIONES_MIN = 2;
export const OPCIONES_MAX = 4;

const etiqueta = (nombre, alternativa) => (nombre?.trim() ? `«${nombre}»` : alternativa);
const etiquetaEscena = (escena, indice) => etiqueta(escena.nombre, `sin nombre (n.º ${indice + 1})`);

/**
 * Escenas a las que se llega desde la inicial. Una escena termina en su primera
 * decisión o fin (indiceCorte); sin ninguna de las dos, sigue la siguiente escena
 * de la lista. Ids inexistentes se ignoran.
 */
export function escenasAlcanzables(juego) {
  const porId = new Map(juego.escenas.map((e) => [e.id, e]));
  const orden = juego.escenas.map((e) => e.id);
  const visitadas = new Set();
  const pendientes = [juego.escenaInicial];
  while (pendientes.length) {
    const id = pendientes.pop();
    if (!porId.has(id) || visitadas.has(id)) continue;
    visitadas.add(id);
    const escena = porId.get(id);
    const corte = indiceCorte(escena);
    if (corte === -1) {
      const siguiente = orden[orden.indexOf(id) + 1];
      if (siguiente) pendientes.push(siguiente);
    } else if (escena.lineas[corte].tipo === 'decision') {
      for (const opcion of escena.lineas[corte].opciones) pendientes.push(opcion.escena);
    }
  }
  return visitadas;
}

/**
 * Avisos del editor. Devuelve [{ nivel, codigo, mensaje, escena?, linea?, personaje? }].
 * Bloqueantes: B01 sin escena inicial, B02 opción sin destino, B03 diálogo sin
 * personaje, B04 decisión con menos de dos o más de cuatro opciones.
 * Informativos: I01 escena inalcanzable, I02 personaje sin retrato, I03 escena sin
 * líneas, I04 sin fin alcanzable, I05 líneas después del corte.
 * Con B01 no se calculan I01 ni I04, porque serían ruido de rebote.
 */
export function validar(juego) {
  const avisos = [];
  const idsEscenas = new Set(juego.escenas.map((e) => e.id));
  const idsPersonajes = new Set(juego.personajes.map((p) => p.id));
  const hayInicial = idsEscenas.has(juego.escenaInicial);

  if (!hayInicial) {
    avisos.push({ nivel: 'bloqueante', codigo: 'B01', mensaje: 'El juego no tiene escena inicial.' });
  }

  juego.escenas.forEach((escena, indiceEscena) => {
    const nombre = etiquetaEscena(escena, indiceEscena);
    if (escena.lineas.length === 0) {
      avisos.push({ nivel: 'informativo', codigo: 'I03', mensaje: `La escena ${nombre} no tiene líneas.`, escena: escena.id });
    }
    const corte = indiceCorte(escena);
    if (corte !== -1 && corte < escena.lineas.length - 1) {
      avisos.push({ nivel: 'informativo', codigo: 'I05', mensaje: `En ${nombre} hay líneas después de la decisión o el fin que nunca se verán.`, escena: escena.id, linea: corte + 1 });
    }
    escena.lineas.forEach((linea, i) => {
      if (linea.tipo === 'decision') {
        if (linea.opciones.length < OPCIONES_MIN || linea.opciones.length > OPCIONES_MAX) {
          avisos.push({ nivel: 'bloqueante', codigo: 'B04', mensaje: `La decisión en ${nombre} debe tener entre ${OPCIONES_MIN} y ${OPCIONES_MAX} opciones.`, escena: escena.id, linea: i });
        }
        linea.opciones.forEach((opcion, j) => {
          if (!idsEscenas.has(opcion.escena)) {
            avisos.push({ nivel: 'bloqueante', codigo: 'B02', mensaje: `La opción ${j + 1} de la decisión en ${nombre} no lleva a ninguna escena.`, escena: escena.id, linea: i });
          }
        });
      }
      if (linea.tipo === 'dialogo' && !idsPersonajes.has(linea.personaje)) {
        avisos.push({ nivel: 'bloqueante', codigo: 'B03', mensaje: `Un diálogo en ${nombre} no tiene personaje.`, escena: escena.id, linea: i });
      }
    });
  });

  for (const personaje of juego.personajes) {
    if (!personaje.retrato) {
      avisos.push({ nivel: 'informativo', codigo: 'I02', mensaje: `El personaje ${etiqueta(personaje.nombre, 'sin nombre')} no tiene retrato.`, personaje: personaje.id });
    }
  }

  if (hayInicial) {
    const alcanzables = escenasAlcanzables(juego);
    juego.escenas.forEach((escena, indiceEscena) => {
      if (!alcanzables.has(escena.id)) {
        avisos.push({ nivel: 'informativo', codigo: 'I01', mensaje: `A la escena ${etiquetaEscena(escena, indiceEscena)} no se llega desde el inicio.`, escena: escena.id });
      }
    });
    const hayFin = juego.escenas.some((e) => alcanzables.has(e.id) && e.lineas.some((l) => l.tipo === 'fin'));
    if (!hayFin) {
      avisos.push({ nivel: 'informativo', codigo: 'I04', mensaje: 'Ninguna escena alcanzable termina con una línea de fin; el juego terminará al acabar la última escena.' });
    }
  }
  return avisos;
}
```

- [ ] **Step 5: Correr las pruebas para ver que pasan**

Run: `node --test tests/modelo.test.js` → `# pass 12`; `node --test tests/validacion.test.js` → `# pass 11`; `npm test` → 33 pruebas, `# fail 0`.

- [ ] **Step 6: Commit**

```bash
git add plataforma/js/estado/modelo.js plataforma/js/estado/validacion.js tests/modelo.test.js tests/validacion.test.js
git commit -m "Validación del juego en módulo propio: avisos bloqueantes e informativos y escenas alcanzables" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Juego mínimo publicable

**Files:**
- Modify: `plataforma/js/estado/validacion.js` (agregar al final)
- Test: `tests/validacion.test.js` (agregar al final)

- [ ] **Step 1: Agregar las pruebas que fallan**

```js
// tests/validacion.test.js (agregar al final)
import { agregarElemento } from '../plataforma/js/estado/modelo.js';
import { cumpleMinimo, MINIMO } from '../plataforma/js/estado/validacion.js';

function juegoMinimoCompleto() {
  const { p, muelle, torre, amanecer } = juegoConTresEscenas();
  const ana = p.juego.personajes[0];
  const far = agregarPersonaje(p, { nombre: 'El farero' });
  ana.retrato = agregarElemento(p, { tipo: 'retrato', nombre: 'Ana', archivo: 'a.png', origen: 'creado' }).id;
  far.retrato = agregarElemento(p, { tipo: 'retrato', nombre: 'Farero', archivo: 'f.png', origen: 'creado' }).id;
  muelle.fondo = agregarElemento(p, { tipo: 'fondo', nombre: 'Muelle', archivo: 'm.png', origen: 'creado' }).id;
  const bib = { id: 'bib_m1', autor: 'Autora Ejemplo', licencia: 'CC-BY-NC-4.0', creditoSugerido: 'crédito' };
  muelle.musica = agregarElemento(p, { tipo: 'musica', nombre: 'Tema', archivo: 't.ogg', origen: 'biblioteca', biblioteca: bib }).id;
  agregarElemento(p, { tipo: 'efecto', nombre: 'Olas', archivo: 'o.wav', origen: 'creado' });
  return { p, muelle, torre, amanecer };
}

test('MINIMO refleja la tabla del spec', () => {
  assert.deepEqual(MINIMO, { escenas: 3, personajesConRetrato: 2, decisiones: 1, fondos: 1, musica: 1, efectos: 1, ajenos: 1 });
});

test('un juego que cumple el mínimo pasa', () => {
  const { p } = juegoMinimoCompleto();
  assert.deepEqual(cumpleMinimo(p), { ok: true, faltantes: [] });
});

test('cumpleMinimo lista cada carencia con actual y requerido', () => {
  const p = proyectoBase();
  p.juego.titulo = '  ';
  const { ok, faltantes } = cumpleMinimo(p);
  assert.equal(ok, false);
  const porCodigo = Object.fromEntries(faltantes.map((f) => [f.codigo, f]));
  assert.deepEqual(Object.keys(porCodigo).sort(), ['M_AJENOS', 'M_DECISIONES', 'M_EFECTOS', 'M_ESCENAS', 'M_FONDOS', 'M_MUSICA', 'M_PERSONAJES', 'M_TITULO']);
  assert.equal(porCodigo.M_ESCENAS.actual, 1);
  assert.equal(porCodigo.M_ESCENAS.requerido, 3);
  assert.equal(porCodigo.M_TITULO.actual, 0);
});

test('un elemento de otra persona cuenta como ajeno aunque no sea de biblioteca', () => {
  const { p } = juegoMinimoCompleto();
  const tema = p.juego.elementos.find((e) => e.tipo === 'musica');
  tema.origen = 'subido';
  p.fichas[tema.id].autoria = 'yo';
  assert.ok(cumpleMinimo(p).faltantes.some((f) => f.codigo === 'M_AJENOS'));
  p.fichas[tema.id].autoria = 'otra_persona';
  assert.equal(cumpleMinimo(p).ok, true);
});

test('un personaje sin retrato no cuenta', () => {
  const { p } = juegoMinimoCompleto();
  p.juego.personajes[1].retrato = null;
  assert.ok(cumpleMinimo(p).faltantes.some((f) => f.codigo === 'M_PERSONAJES' && f.actual === 1));
});

test('una decisión con una sola opción no cuenta para el mínimo', () => {
  const { p, muelle } = juegoMinimoCompleto();
  muelle.lineas[1].opciones = [{ texto: 'Única', escena: p.juego.escenas[1].id }];
  assert.ok(cumpleMinimo(p).faltantes.some((f) => f.codigo === 'M_DECISIONES' && f.actual === 0));
  p.juego.titulo = null;
  assert.ok(cumpleMinimo(p).faltantes.some((f) => f.codigo === 'M_TITULO' && f.mensaje === 'Título del juego'));
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/validacion.test.js`
Expected: FAIL con `does not provide an export named 'cumpleMinimo'`.

- [ ] **Step 3: Agregar `MINIMO` y `cumpleMinimo` al final de `validacion.js`**

```js
// plataforma/js/estado/validacion.js (agregar al final)

// ---- Mínimo publicable (spec, sección 4) ----

// M_DECISIONES cuenta decisiones con dos o más opciones; el tope de cuatro lo bloquea validar() con B04. M_AJENOS mira solo elementos: son los únicos con origen y ficha de activo.
export const MINIMO = { escenas: 3, personajesConRetrato: 2, decisiones: 1, fondos: 1, musica: 1, efectos: 1, ajenos: 1 };

export function cumpleMinimo(proyecto) {
  const { juego, fichas } = proyecto;
  const faltantes = [];
  const exige = (codigo, mensaje, actual, requerido) => {
    if (actual < requerido) faltantes.push({ codigo, mensaje, actual, requerido });
  };
  const cuenta = (tipo) => juego.elementos.filter((e) => e.tipo === tipo).length;

  exige('M_TITULO', 'Título del juego', juego.titulo?.trim() ? 1 : 0, 1);
  exige('M_ESCENAS', 'Escenas', juego.escenas.length, MINIMO.escenas);
  exige('M_PERSONAJES', 'Personajes con retrato', juego.personajes.filter((p) => p.retrato).length, MINIMO.personajesConRetrato);
  const decisiones = juego.escenas.flatMap((e) => e.lineas).filter((l) => l.tipo === 'decision' && l.opciones.length >= 2).length;
  exige('M_DECISIONES', 'Decisiones con al menos dos opciones', decisiones, MINIMO.decisiones);
  exige('M_FONDOS', 'Fondos', cuenta('fondo'), MINIMO.fondos);
  exige('M_MUSICA', 'Pistas musicales', cuenta('musica'), MINIMO.musica);
  exige('M_EFECTOS', 'Efectos de sonido', cuenta('efecto'), MINIMO.efectos);
  const ajenos = juego.elementos.filter((e) => e.origen === 'biblioteca' || fichas[e.id]?.autoria === 'otra_persona').length;
  exige('M_AJENOS', 'Elementos que no hizo el estudiante (biblioteca u otra persona)', ajenos, MINIMO.ajenos);

  return { ok: faltantes.length === 0, faltantes };
}
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/validacion.test.js`
Expected: `# pass 17`, `# fail 0`. `npm test` → 39.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/estado/validacion.js tests/validacion.test.js
git commit -m "Juego mínimo publicable" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Semáforo, reglas rojas

### Task 7: Semáforo, reglas amarillas y notas

> Las tareas 6 y 7 se ejecutaron y se revisaron juntas, porque forman un solo módulo. Esta sección describe el estado final después de la revisión de diseño de reglas, que agregó A12 y A13, amplió R02 (titular ajeno), R06 (cualquier tipo de ficha) y A06 (IA con aporte), condicionó R05 a que el respaldo sea una licencia, y exigió un destino válido. La tabla de casos creció de 33 a 43.

**Files:**
- Create: `plataforma/js/juridico/semaforo.js`
- Create: `tests/semaforo.casos.json`
- Test: `tests/semaforo.test.js`

La prueba lee una tabla de casos. Cada caso tiene `base` (con qué `crearFicha` se construye), `ficha` (campos que se sobreescriben), `contexto` y `esperado` (color, razones exactas en orden, notas exactas). El orden de las razones es siempre R01…R06 y luego A01…A13. Tres pruebas adicionales comprueban que la tabla cubre todas las reglas y notas, que los códigos de cada caso existen y que el nombre del caso no menciona un código que no esté en lo esperado, y que un destino desconocido lanza error.

- [ ] **Step 1: Escribir el ejecutor de casos**

```js
// tests/semaforo.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crearFicha } from '../plataforma/js/juridico/ficha.js';
import { evaluar, CODIGOS_ROJO, CODIGOS_AMARILLO, CODIGOS_NOTAS } from '../plataforma/js/juridico/semaforo.js';

const casos = JSON.parse(readFileSync(new URL('./semaforo.casos.json', import.meta.url), 'utf8'));

for (const caso of casos) {
  test(`semáforo: ${caso.nombre}`, () => {
    const ficha = Object.freeze({ ...crearFicha(caso.base.tipo, { origen: caso.base.origen ?? 'escrito', biblioteca: caso.base.biblioteca ?? null }), ...caso.ficha });
    const resultado = evaluar(ficha, caso.contexto ?? { destino: 'gratis' });
    assert.equal(resultado.color, caso.esperado.color, `color de «${caso.nombre}»`);
    assert.deepEqual(resultado.razones, caso.esperado.razones, `razones de «${caso.nombre}»`);
    assert.deepEqual(resultado.notas, caso.esperado.notas ?? [], `notas de «${caso.nombre}»`);
  });
}

test('la tabla de casos cubre todas las reglas y todas las notas', () => {
  const vistos = new Set(casos.flatMap((c) => c.esperado.razones));
  for (const codigo of [...CODIGOS_ROJO, ...CODIGOS_AMARILLO]) assert.ok(vistos.has(codigo), `ningún caso dispara ${codigo}`);
  const notasVistas = new Set(casos.flatMap((c) => c.esperado.notas ?? []));
  for (const codigo of CODIGOS_NOTAS) assert.ok(notasVistas.has(codigo), `ningún caso produce la nota ${codigo}`);
});

test('los códigos esperados existen y los nombres de los casos son honestos', () => {
  const conocidos = new Set([...CODIGOS_ROJO, ...CODIGOS_AMARILLO]);
  for (const caso of casos) {
    for (const codigo of caso.esperado.razones) assert.ok(conocidos.has(codigo), `${caso.nombre}: código desconocido ${codigo}`);
    for (const codigo of caso.nombre.match(/\b[RA]\d\d\b/g) ?? []) {
      assert.ok(caso.esperado.razones.includes(codigo), `${caso.nombre}: el nombre menciona ${codigo} pero no está en lo esperado`);
    }
  }
});

test('un destino desconocido es un error, no un verde silencioso', () => {
  assert.throws(() => evaluar(crearFicha('fondo', { origen: 'creado' }), { destino: 'ventas' }), /Destino inválido/);
  assert.throws(() => evaluar(crearFicha('fondo', { origen: 'creado' }), {}), /Destino inválido/);
});
```

- [ ] **Step 2: Escribir la tabla de casos**

`tests/semaforo.casos.json` es la fuente de verdad de los 43 casos (C01 a C43, ordenados por número, con sangría de dos espacios). Cada caso parte de `crearFicha(base.tipo, { origen, biblioteca })` y sobreescribe solo los campos que importan. Resumen de lo que cubre:

| Casos | Qué prueban |
|---|---|
| C01 | Creado dentro, destino gratis: verde con nota N_SELLO |
| C02, C42 | R01: pieza de biblioteca de autor desconocido, con y sin leer la licencia; solo R01 |
| C03, C35, C41 | R02: otra persona sin respaldo; titular ajeno sin respaldo aunque lo hice yo; R02 junto con A08 |
| C04–C07 | Cesión: verde con crédito; A02 sin crédito; A09 si el titular sigue siendo la otra persona; A08 sin nombre |
| C08–C11 | Biblioteca BY-NC: verde en gratis (C08), R03 en venta (C09), A07 sin leer (C10); BY con crédito borrado: A01 y A02 (C11) |
| C12, C13, C40 | ND: R04 si se modificó; verde sin modificar; R03 y R04 juntas con «otra» licencia NC+ND |
| C14, C15 | SA: A03 sin aceptar compartir igual; verde aceptando |
| C16, C17, C39 | CURSO: verde en personal; R05 en gratis y en venta |
| C18 | CC0 leída: verde |
| C19–C22, C37, C43 | IA: A04 sin reconocer; verde con nota N_IA al reconocer; A05 sin describir el aporte; verde con N_IA_APORTE al describirlo; A13 sin herramienta; A06 sin prueba del aporte |
| C23, C24 | Subido por mí: A06 sin prueba; verde con el original |
| C25, C26, C36 | R06: historia basada en obra ajena sin autorización; verde con autorización; música basada en una canción ajena |
| C27 | Personaje propio: verde |
| C28, C29 | Autorización informal: A10 en venta; verde en gratis |
| C30 | Título: siempre verde con nota N_TITULO |
| C31–C34, C38 | «Otra» licencia: A01 y A02 con BY sin crédito; A11 sin describirla; verde descrita sin condiciones; A12 respaldo de licencia sin elegir cuál; R03 con NC en venta |

- [ ] **Step 3: Correr las pruebas para ver que fallan**

Run: `node --test tests/semaforo.test.js`
Expected: FAIL con `Cannot find module` para `semaforo.js`.

- [ ] **Step 4: Escribir `semaforo.js`**

```js
// plataforma/js/juridico/semaforo.js
// Reglas del semáforo (spec, sección 12.4). Función pura: entra una ficha y el
// contexto { destino }, sale { color, razones, notas } con códigos. Los textos
// se agregan aparte con describir() de textos.js.
import { condicionesDe } from './licencias.js';

export const CODIGOS_ROJO = ['R01', 'R02', 'R03', 'R04', 'R05', 'R06'];
export const CODIGOS_AMARILLO = ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11', 'A12', 'A13'];
export const CODIGOS_NOTAS = ['N_TITULO', 'N_IA', 'N_IA_APORTE', 'N_SELLO'];
const DESTINOS = ['personal', 'gratis', 'venta']; // los mismos valores que estado/modelo.js

const vacio = (texto) => !(texto ?? '').trim();

export function evaluar(ficha, contexto) {
  const destino = contexto?.destino;
  if (!DESTINOS.includes(destino)) throw new Error(`Destino inválido: ${destino}`);

  if (ficha.tipo === 'titulo') {
    return { color: 'verde', razones: [], notas: ['N_TITULO'] };
  }
  // Sin autor ni licencia no hay nada que corregir: solo reemplazar.
  if (ficha.licencia === 'DESCONOCIDO') {
    return { color: 'rojo', razones: ['R01'], notas: [] };
  }

  const condiciones = condicionesDe(ficha);
  const tieneLicencia = ficha.respaldo === 'licencia' && Boolean(ficha.licencia);
  const ajeno = ficha.autoria === 'otra_persona' || ficha.titular === 'otra_persona';
  const conIA = ficha.autoria === 'ia' || ficha.autoria === 'ia_con_aporte';
  const razones = [];
  const notas = [];

  // ---- Rojo ----
  if (ajeno && ficha.respaldo === 'ninguno') razones.push('R02');
  if (tieneLicencia && condiciones.includes('NC') && destino === 'venta') razones.push('R03');
  if (tieneLicencia && condiciones.includes('ND') && ficha.modificado) razones.push('R04');
  if (tieneLicencia && ficha.licencia === 'CURSO' && destino !== 'personal') razones.push('R05');
  if (ficha.basadoEnObraAjena && !ficha.autorizacionDerivada) razones.push('R06');

  // ---- Amarillo ----
  if (tieneLicencia && condiciones.includes('BY') && vacio(ficha.credito)) razones.push('A01');
  if (ficha.autoria === 'otra_persona' && ficha.respaldo !== 'ninguno' && vacio(ficha.credito)) razones.push('A02');
  if (tieneLicencia && condiciones.includes('SA') && !ficha.aceptaCompartirIgual) razones.push('A03');
  if (ficha.autoria === 'ia' && !ficha.reconoceSinDerechos) razones.push('A04');
  if (ficha.autoria === 'ia_con_aporte' && vacio(ficha.aporteHumano)) razones.push('A05');
  if (ficha.origen === 'subido' && (ficha.autoria === 'yo' || ficha.autoria === 'ia_con_aporte') && ficha.prueba === 'ninguna') razones.push('A06');
  if (tieneLicencia && !ficha.licenciaLeida) razones.push('A07');
  if (ficha.autoria === 'otra_persona' && vacio(ficha.autorNombre)) razones.push('A08');
  if (ficha.respaldo === 'cesion' && ficha.titular === 'otra_persona') razones.push('A09');
  if (ficha.respaldo === 'autorizacion' && destino === 'venta') razones.push('A10');
  if (tieneLicencia && ficha.licencia === 'OTRA' && vacio(ficha.licenciaTexto)) razones.push('A11');
  if (ficha.respaldo === 'licencia' && !ficha.licencia) razones.push('A12');
  if (conIA && vacio(ficha.herramientaIA)) razones.push('A13');

  // ---- Notas (solo informan; no cambian el color) ----
  if (ficha.origen === 'creado' && ficha.prueba === 'sello') notas.push('N_SELLO');
  if (ficha.autoria === 'ia' && ficha.reconoceSinDerechos) notas.push('N_IA');
  if (ficha.autoria === 'ia_con_aporte' && !vacio(ficha.aporteHumano)) notas.push('N_IA_APORTE');

  const color = razones.some((c) => CODIGOS_ROJO.includes(c)) ? 'rojo'
    : razones.length ? 'amarillo'
    : 'verde';
  return { color, razones, notas };
}
```

- [ ] **Step 5: Correr las pruebas para ver que pasan**

Run: `node --test tests/semaforo.test.js`
Expected: `# pass 46`, `# fail 0` (43 casos más tres pruebas de la tabla). `npm test` → 85.

- [ ] **Step 6: Commit**

```bash
git add plataforma/js/juridico/semaforo.js tests/semaforo.test.js tests/semaforo.casos.json
git commit -m "Semáforo: reglas, notas y tabla de casos" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Evaluar todo el proyecto y decidir si se puede publicar

**Files:**
- Modify: `plataforma/js/juridico/semaforo.js` (agregar `evaluarTodo`)
- Modify: `plataforma/js/estado/validacion.js` (agregar `nombreDe` y `puedePublicar`)
- Test: `tests/validacion.test.js` (agregar al final)

- [ ] **Step 1: Agregar las pruebas que fallan**

```js
// tests/validacion.test.js (agregar al final)
import { puedePublicar, nombreDe } from '../plataforma/js/estado/validacion.js';
import { evaluarTodo } from '../plataforma/js/juridico/semaforo.js';

function dejarTodoEnVerde(p) {
  for (const ficha of Object.values(p.fichas)) {
    if (ficha.origen === 'biblioteca') ficha.licenciaLeida = true;
    if (ficha.origen === 'subido' && ficha.autoria === 'yo') ficha.prueba = 'original';
  }
}

test('evaluarTodo devuelve un resultado por ficha con el destino del juego', () => {
  const { p } = juegoMinimoCompleto();
  const semaforos = evaluarTodo(p);
  assert.equal(semaforos.size, Object.keys(p.fichas).length);
  const tema = p.juego.elementos.find((e) => e.tipo === 'musica');
  assert.equal(semaforos.get(tema.id).color, 'amarillo', 'la licencia de biblioteca no se ha leído');
  assert.equal(semaforos.get('titulo').color, 'verde');
});

test('nombreDe da un nombre legible para cualquier ficha', () => {
  const { p } = juegoMinimoCompleto();
  assert.equal(nombreDe(p, 'titulo'), 'Título del juego');
  assert.equal(nombreDe(p, 'historia'), 'Historia');
  assert.equal(nombreDe(p, p.juego.personajes[0].id), 'Ana');
  const tema = p.juego.elementos.find((e) => e.tipo === 'musica');
  assert.equal(nombreDe(p, tema.id), 'Tema');
  assert.equal(nombreDe(p, 'el_noexiste'), 'el_noexiste');
});

test('puedePublicar exige semáforos en verde, mínimo cumplido y sin bloqueantes', () => {
  const { p, muelle } = juegoMinimoCompleto();
  let decision = puedePublicar(p);
  assert.equal(decision.ok, false);
  assert.ok(decision.motivos.some((m) => m.codigo === 'P_SEMAFORO' && /Tema/.test(m.mensaje)));

  dejarTodoEnVerde(p);
  decision = puedePublicar(p);
  assert.deepEqual(decision, { ok: true, motivos: [], resumen: { semaforo: 0, minimo: 0, bloqueantes: 0 } });

  muelle.lineas[1].opciones[0].escena = null;
  decision = puedePublicar(p);
  assert.ok(decision.motivos.some((m) => m.codigo === 'P_BLOQUEANTE'));

  p.juego.titulo = '';
  decision = puedePublicar(p);
  assert.ok(decision.motivos.some((m) => m.codigo === 'P_MINIMO' && m.faltante === 'M_TITULO'));
});

test('cambiar el destino a venta pone en rojo la pieza no comercial y bloquea la publicación', () => {
  const { p } = juegoMinimoCompleto();
  dejarTodoEnVerde(p);
  assert.equal(puedePublicar(p).ok, true);
  p.juego.destino = 'venta';
  const tema = p.juego.elementos.find((e) => e.tipo === 'musica');
  const semaforos = evaluarTodo(p);
  assert.equal(semaforos.get(tema.id).color, 'rojo');
  assert.deepEqual(semaforos.get(tema.id).razones, ['R03']);
  const decision = puedePublicar(p);
  assert.equal(decision.ok, false);
  assert.ok(decision.motivos.some((m) => m.codigo === 'P_SEMAFORO' && m.id === tema.id && m.color === 'rojo'));
  assert.deepEqual(decision.resumen, { semaforo: 1, minimo: 0, bloqueantes: 0 });
});

test('nombreDe no devuelve nombres vacíos', () => {
  const { p } = juegoMinimoCompleto();
  const luis = agregarPersonaje(p);
  const fondo = agregarElemento(p, { tipo: 'fondo', nombre: '  ', archivo: 'x.png', origen: 'creado' });
  assert.equal(nombreDe(p, luis.id), 'Personaje sin nombre');
  assert.equal(nombreDe(p, fondo.id), 'Elemento sin nombre');
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/validacion.test.js`
Expected: FAIL con `does not provide an export named 'puedePublicar'`.

- [ ] **Step 3: Agregar `evaluarTodo` al final de `semaforo.js`**

```js
// plataforma/js/juridico/semaforo.js (agregar al final)

/** Evalúa todas las fichas del proyecto. Devuelve Map<idFicha, resultado>. */
export function evaluarTodo(proyecto) {
  const contexto = { destino: proyecto.juego.destino };
  return new Map(Object.entries(proyecto.fichas).map(([id, ficha]) => [id, evaluar(ficha, contexto)]));
}
```

- [ ] **Step 4: Agregar `nombreDe` y `puedePublicar` al final de `validacion.js`**

```js
// plataforma/js/estado/validacion.js (agregar al final)

// ---- Publicación ----

const nombreOAlternativa = (nombre, alternativa) => (nombre?.trim() ? nombre : alternativa);

export function nombreDe(proyecto, idFicha) {
  if (idFicha === 'titulo') return 'Título del juego';
  if (idFicha === 'historia') return 'Historia';
  const personaje = proyecto.juego.personajes.find((p) => p.id === idFicha);
  if (personaje) return nombreOAlternativa(personaje.nombre, 'Personaje sin nombre');
  const elemento = proyecto.juego.elementos.find((e) => e.id === idFicha);
  if (elemento) return nombreOAlternativa(elemento.nombre, 'Elemento sin nombre');
  return idFicha;
}

/**
 * Decide si se puede publicar: todas las fichas en verde, mínimo cumplido y sin
 * avisos bloqueantes. Calcula los tres a partir del proyecto, para que ninguna
 * llamada pueda usar datos viejos.
 * Devuelve { ok, motivos: [{ codigo, mensaje, ... }], resumen: { semaforo, minimo, bloqueantes } }.
 */
export function puedePublicar(proyecto) {
  const motivos = [];
  for (const [id, resultado] of evaluarTodo(proyecto)) {
    if (resultado.color !== 'verde') {
      motivos.push({ codigo: 'P_SEMAFORO', id, color: resultado.color, mensaje: `«${nombreDe(proyecto, id)}» está en ${resultado.color}.` });
    }
  }
  for (const faltante of cumpleMinimo(proyecto).faltantes) {
    motivos.push({ codigo: 'P_MINIMO', faltante: faltante.codigo, mensaje: `${faltante.mensaje}: ${faltante.actual} de ${faltante.requerido}.` });
  }
  for (const aviso of validar(proyecto.juego)) {
    if (aviso.nivel === 'bloqueante') motivos.push({ codigo: 'P_BLOQUEANTE', aviso: aviso.codigo, mensaje: aviso.mensaje });
  }
  const cuenta = (codigo) => motivos.filter((m) => m.codigo === codigo).length;
  return {
    ok: motivos.length === 0,
    motivos,
    resumen: { semaforo: cuenta('P_SEMAFORO'), minimo: cuenta('P_MINIMO'), bloqueantes: cuenta('P_BLOQUEANTE') },
  };
}
```

`validacion.js` importa `evaluarTodo` de `../juridico/semaforo.js` (agregar la línea de importación junto a la de `indiceCorte`). La dependencia va de `estado` hacia `juridico`, que es hoja; no hay ciclo.

- [ ] **Step 5: Correr todas las pruebas**

Run: `npm test`
Expected: `# fail 0`. Total de pruebas: 10 (ficha) + 12 (modelo) + 22 (validación) + 46 (semáforo) = 90.

- [ ] **Step 6: Commit**

```bash
git add plataforma/js/juridico/semaforo.js plataforma/js/estado/validacion.js tests/validacion.test.js
git commit -m "Evaluar todas las fichas y decidir si el juego se puede publicar" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Archivos: MIME, huella y sello

**Files:**
- Create: `plataforma/js/estado/archivos.js`
- Test: `tests/archivos.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/archivos.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mimePorExtension, extensionPorMime, huellaSha256, crearSello, LIMITES } from '../plataforma/js/estado/archivos.js';

test('mimePorExtension reconoce los formatos del spec, sin importar mayúsculas', () => {
  assert.equal(mimePorExtension('fondo.png'), 'image/png');
  assert.equal(mimePorExtension('FOTO.JPG'), 'image/jpeg');
  assert.equal(mimePorExtension('a.jpeg'), 'image/jpeg');
  assert.equal(mimePorExtension('a.webp'), 'image/webp');
  assert.equal(mimePorExtension('tema.mp3'), 'audio/mpeg');
  assert.equal(mimePorExtension('tema.ogg'), 'audio/ogg');
  assert.equal(mimePorExtension('tema.wav'), 'audio/wav');
  assert.equal(mimePorExtension('voz.webm'), 'audio/webm');
  assert.equal(mimePorExtension('voz.m4a'), 'audio/mp4');
  assert.equal(mimePorExtension('raro.xyz'), 'application/octet-stream');
});

test('extensionPorMime ignora parámetros y devuelve una extensión por MIME', () => {
  assert.equal(extensionPorMime('audio/webm;codecs=opus'), 'webm');
  assert.equal(extensionPorMime('image/jpeg'), 'jpg');
  assert.equal(extensionPorMime('audio/mp4'), 'm4a');
  assert.equal(extensionPorMime('texto/raro'), 'bin');
});

test('huellaSha256 da el hash conocido de «hola»', async () => {
  const datos = new TextEncoder().encode('hola');
  assert.equal(await huellaSha256(datos), 'sha256:b221d9dbb083a7f33428d7c2a3c3198ae925614d70210e28716ccaa7cd4ddb79');
  assert.equal(await huellaSha256(datos.buffer), 'sha256:b221d9dbb083a7f33428d7c2a3c3198ae925614d70210e28716ccaa7cd4ddb79');
});

test('crearSello guarda fecha ISO y huella', async () => {
  const sello = await crearSello(new TextEncoder().encode('hola'), new Date('2026-11-04T20:10:00Z'));
  assert.deepEqual(sello, { fecha: '2026-11-04T20:10:00.000Z', huella: 'sha256:b221d9dbb083a7f33428d7c2a3c3198ae925614d70210e28716ccaa7cd4ddb79' });
});

test('los límites de tamaño son los del spec', () => {
  assert.equal(LIMITES.imagenBytes, 2 * 1024 * 1024);
  assert.equal(LIMITES.audioBytes, 5 * 1024 * 1024);
  assert.equal(LIMITES.avisoPaqueteBytes, 50 * 1024 * 1024);
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/archivos.test.js`
Expected: FAIL con `Cannot find module` para `archivos.js`.

- [ ] **Step 3: Escribir `archivos.js`**

```js
// plataforma/js/estado/archivos.js
// Utilidades para archivos binarios: tipo MIME, huella SHA-256 y sello de creación.

const MIME_POR_EXTENSION = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  webm: 'audio/webm',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
};

const EXTENSION_POR_MIME = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
};

export const LIMITES = {
  imagenBytes: 2 * 1024 * 1024,
  audioBytes: 5 * 1024 * 1024,
  avisoPaqueteBytes: 50 * 1024 * 1024,
};

export function mimePorExtension(nombre) {
  const extension = String(nombre).split('.').pop().toLowerCase();
  return MIME_POR_EXTENSION[extension] ?? 'application/octet-stream';
}

export function extensionPorMime(mime) {
  const base = String(mime).split(';')[0].trim().toLowerCase();
  return EXTENSION_POR_MIME[base] ?? 'bin';
}

/** @param {ArrayBuffer|Uint8Array} datos */
export async function huellaSha256(datos) {
  const resumen = await crypto.subtle.digest('SHA-256', datos);
  const hex = [...new Uint8Array(resumen)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `sha256:${hex}`;
}

/** Sello de creación para lo que se hace dentro de la plataforma. */
export async function crearSello(datos, ahora = new Date()) {
  return { fecha: ahora.toISOString(), huella: await huellaSha256(datos) };
}
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/archivos.test.js`
Expected: `# pass 5`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/estado/archivos.js tests/archivos.test.js
git commit -m "Utilidades de archivos: MIME, huella SHA-256 y sello de creación" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Almacén en IndexedDB

**Files:**
- Create: `plataforma/js/estado/almacen.js`
- Test: `tests/almacen.test.js`

El almacén traduce la falta de espacio a un error con código estable (`sin_espacio`) para que la interfaz ofrezca «Guardar copia» (spec, sección 17), evita un rechazo sin manejar si la base no abre, cierra la conexión cuando otra pestaña pide una versión nueva, borra todo en una sola transacción y solo acepta `ArrayBuffer` como datos.

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/almacen.test.js
import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirAlmacen, traducirError } from '../plataforma/js/estado/almacen.js';
import { crearProyecto } from '../plataforma/js/estado/modelo.js';

let contador = 0;
const abrir = () => abrirAlmacen({ nombre: `prueba-${Date.now()}-${contador++}` });

test('cargar devuelve null cuando no hay proyecto', async () => {
  const almacen = abrir();
  assert.equal(await almacen.cargar(), null);
  await almacen.cerrar();
});

test('guardar y cargar devuelven el mismo proyecto', async () => {
  const almacen = abrir();
  const proyecto = crearProyecto({ estudiante: 'Camila', titulo: 'Faro' });
  await almacen.guardar(proyecto);
  assert.deepEqual(await almacen.cargar(), proyecto);
  proyecto.juego.titulo = 'Faro 2';
  await almacen.guardar(proyecto);
  assert.equal((await almacen.cargar()).juego.titulo, 'Faro 2', 'guardar reemplaza, no duplica');
  await almacen.cerrar();
});

test('los archivos se guardan, leen, listan y borran por id', async () => {
  const almacen = abrir();
  const datos = new TextEncoder().encode('png falso').buffer;
  await almacen.guardarArchivo('el_1', { tipo: 'image/png', datos });
  const leido = await almacen.leerArchivo('el_1');
  assert.equal(leido.tipo, 'image/png');
  assert.equal(new TextDecoder().decode(leido.datos), 'png falso');
  assert.deepEqual(await almacen.listarArchivos(), ['el_1']);
  await almacen.borrarArchivo('el_1');
  assert.equal(await almacen.leerArchivo('el_1'), null);
  assert.deepEqual(await almacen.listarArchivos(), []);
  await almacen.cerrar();
});

test('borrarTodo vacía proyecto y archivos', async () => {
  const almacen = abrir();
  await almacen.guardar(crearProyecto({ titulo: 'x' }));
  await almacen.guardarArchivo('el_1', { tipo: 'audio/wav', datos: new ArrayBuffer(4) });
  await almacen.borrarTodo();
  assert.equal(await almacen.cargar(), null);
  assert.deepEqual(await almacen.listarArchivos(), []);
  await almacen.cerrar();
});

test('sin IndexedDB, abrirAlmacen explica el problema', () => {
  assert.throws(() => abrirAlmacen({ nombre: 'x', indexedDB: null }), /IndexedDB no disponible/);
});

test('guardar un archivo con el mismo id lo reemplaza y la lista sale ordenada', async () => {
  const almacen = abrir();
  const datos = (texto) => new TextEncoder().encode(texto).buffer;
  await almacen.guardarArchivo('c', { tipo: 'image/png', datos: datos('c') });
  await almacen.guardarArchivo('a', { tipo: 'image/png', datos: datos('a') });
  await almacen.guardarArchivo('b', { tipo: 'image/png', datos: datos('b') });
  await almacen.guardarArchivo('a', { tipo: 'image/webp', datos: datos('a2') });
  assert.deepEqual(await almacen.listarArchivos(), ['a', 'b', 'c']);
  const a = await almacen.leerArchivo('a');
  assert.equal(a.tipo, 'image/webp');
  assert.equal(new TextDecoder().decode(a.datos), 'a2');
  await almacen.cerrar();
});

test('guardarArchivo rechaza lo que no sea ArrayBuffer y las llamadas tras cerrar fallan', async () => {
  const almacen = abrir();
  await assert.rejects(almacen.guardarArchivo('x', { tipo: 'image/png', datos: 'texto' }), /ArrayBuffer/);
  await almacen.cerrar();
  await assert.rejects(almacen.cargar());
});

test('traducirError convierte la falta de espacio en un mensaje con código', () => {
  const e = traducirError({ name: 'QuotaExceededError' });
  assert.equal(e.codigo, 'sin_espacio');
  assert.match(e.message, /Guarda una copia/);
  assert.equal(traducirError(null).message, 'Transacción cancelada');
  const otro = new Error('x');
  assert.equal(traducirError(otro), otro);
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/almacen.test.js`
Expected: FAIL con `Cannot find module` para `almacen.js`.

- [ ] **Step 3: Escribir `almacen.js`**

```js
// plataforma/js/estado/almacen.js
// Guardado en el navegador con IndexedDB. Dos almacenes: 'proyecto' (una sola
// clave, 'actual') y 'archivos' (clave = id de elemento, valor = { tipo, datos }).
// Los datos son ArrayBuffer, nunca Blob, para que la copia estructurada funcione igual
// en todos los navegadores y en las pruebas.

export const NOMBRE_BD_DEFECTO = 'mi-primer-videojuego';
const VERSION_BD = 1;
const CLAVE_PROYECTO = 'actual';

/** Traduce los errores del navegador a mensajes para el estudiante, con un código estable para la interfaz. */
export function traducirError(error) {
  if (error?.name === 'QuotaExceededError') {
    return Object.assign(
      new Error('No hay espacio en el navegador para guardar. Guarda una copia y libera espacio.'),
      { codigo: 'sin_espacio', cause: error },
    );
  }
  return error ?? new Error('Transacción cancelada');
}

const esArrayBuffer = (valor) => Object.prototype.toString.call(valor) === '[object ArrayBuffer]';

export function abrirAlmacen({ nombre = NOMBRE_BD_DEFECTO, indexedDB = globalThis.indexedDB } = {}) {
  if (!indexedDB) throw new Error('Este navegador no permite guardar el proyecto (IndexedDB no disponible).');

  const bd = new Promise((resolve, reject) => {
    const solicitud = indexedDB.open(nombre, VERSION_BD);
    solicitud.onupgradeneeded = () => {
      const db = solicitud.result;
      if (!db.objectStoreNames.contains('proyecto')) db.createObjectStore('proyecto');
      if (!db.objectStoreNames.contains('archivos')) db.createObjectStore('archivos');
    };
    solicitud.onblocked = () => reject(new Error('Cierra las otras pestañas de la plataforma y vuelve a intentar.'));
    solicitud.onsuccess = () => {
      const db = solicitud.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    solicitud.onerror = () => reject(traducirError(solicitud.error));
  });
  bd.catch(() => {}); // la falla se reporta en cada uso; esto solo evita un rechazo sin manejar

  function transaccionCompleta(db, almacenes, modo, accion) {
    return new Promise((resolve, reject) => {
      const transaccion = db.transaction(almacenes, modo);
      const resultado = accion(transaccion);
      transaccion.oncomplete = () => resolve(resultado?.result);
      transaccion.onerror = () => reject(traducirError(transaccion.error));
      transaccion.onabort = () => reject(traducirError(transaccion.error));
    });
  }

  async function correr(almacen, modo, accion) {
    const db = await bd;
    return transaccionCompleta(db, almacen, modo, (transaccion) => accion(transaccion.objectStore(almacen)));
  }

  return {
    cargar: () => correr('proyecto', 'readonly', (s) => s.get(CLAVE_PROYECTO)).then((v) => v ?? null),
    guardar: (proyecto) => correr('proyecto', 'readwrite', (s) => s.put(proyecto, CLAVE_PROYECTO)),
    guardarArchivo: async (id, archivo) => {
      if (!esArrayBuffer(archivo?.datos)) throw new Error('Los archivos se guardan como { tipo, datos: ArrayBuffer }.');
      return correr('archivos', 'readwrite', (s) => s.put(archivo, id));
    },
    leerArchivo: (id) => correr('archivos', 'readonly', (s) => s.get(id)).then((v) => v ?? null),
    borrarArchivo: (id) => correr('archivos', 'readwrite', (s) => s.delete(id)),
    listarArchivos: () => correr('archivos', 'readonly', (s) => s.getAllKeys()),
    borrarTodo: async () => {
      const db = await bd;
      await transaccionCompleta(db, ['proyecto', 'archivos'], 'readwrite', (transaccion) => {
        transaccion.objectStore('proyecto').clear();
        transaccion.objectStore('archivos').clear();
        return null;
      });
    },
    cerrar: async () => {
      try {
        (await bd).close();
      } catch {
        // si la base nunca abrió, no hay nada que cerrar
      }
    },
  };
}
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/almacen.test.js`
Expected: `# pass 8`, `# fail 0`. `npm test` → 103.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/estado/almacen.js tests/almacen.test.js
git commit -m "Almacén en IndexedDB para el proyecto y sus archivos" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Copias comprimidas

**Files:**
- Create: `plataforma/js/estado/copias.js`
- Test: `tests/copias.test.js`

El formato de copia es el mismo que llevará el paquete de entrega (plan 6): `proyecto.json` más `archivos/<nombre de archivo del elemento>`; el paquete agrega otros archivos que la importación ignora. La importación valida todo antes de devolver nada, nunca lanza errores crudos por datos malformados, y sus errores llevan un código estable para la interfaz (`no_es_zip`, `sin_proyecto`, `json_danado`, `forma` con la lista `problemas`, `archivo_faltante`). Aquí se cierran las comprobaciones que las tareas anteriores dejaron para la importación: ids repetidos o ausentes, fichas huérfanas, nombres de archivo inseguros o repetidos, destino inválido. La exportación valida también, para que la plataforma nunca escriba una copia que no pueda reabrir.

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/copias.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { exportarCopia, importarCopia, validarEstructura } from '../plataforma/js/estado/copias.js';
import { crearProyecto, agregarElemento } from '../plataforma/js/estado/modelo.js';

function proyectoConArchivos() {
  const proyecto = crearProyecto({ estudiante: 'Camila', titulo: 'Faro' });
  const fondo = agregarElemento(proyecto, { tipo: 'fondo', nombre: 'Muelle', archivo: 'el_1.png', origen: 'creado' });
  const tema = agregarElemento(proyecto, { tipo: 'musica', nombre: 'Tema', archivo: 'el_2.wav', origen: 'subido' });
  const archivos = new Map([
    [fondo.id, { tipo: 'image/png', datos: new TextEncoder().encode('PNG').buffer }],
    [tema.id, { tipo: 'audio/wav', datos: new TextEncoder().encode('WAV').buffer }],
  ]);
  return { proyecto, archivos, fondo, tema };
}

test('exportar e importar devuelven el mismo proyecto y los mismos archivos', async () => {
  const { proyecto, archivos, fondo, tema } = proyectoConArchivos();
  const blob = await exportarCopia(proyecto, archivos, { JSZip });
  assert.equal(blob.type, 'application/zip');
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  assert.deepEqual(Object.keys(zip.files).filter((n) => !zip.files[n].dir).sort(), ['archivos/el_1.png', 'archivos/el_2.wav', 'proyecto.json']);

  const importado = await importarCopia(await blob.arrayBuffer(), { JSZip });
  assert.deepEqual(importado.proyecto, proyecto);
  assert.equal(importado.archivos.get(fondo.id).tipo, 'image/png');
  assert.equal(new TextDecoder().decode(importado.archivos.get(fondo.id).datos), 'PNG');
  assert.equal(importado.archivos.get(tema.id).tipo, 'audio/wav');
});

test('importarCopia acepta un Blob', async () => {
  const { proyecto, archivos } = proyectoConArchivos();
  const blob = await exportarCopia(proyecto, archivos, { JSZip });
  const importado = await importarCopia(blob, { JSZip });
  assert.equal(importado.proyecto.juego.titulo, 'Faro');
});

test('exportar falla si falta el archivo de un elemento', async () => {
  const { proyecto, archivos, tema } = proyectoConArchivos();
  archivos.delete(tema.id);
  await assert.rejects(exportarCopia(proyecto, archivos, { JSZip }), /Falta el archivo del elemento «Tema»/);
});

test('importar rechaza lo que no es un zip', async () => {
  await assert.rejects(importarCopia(new TextEncoder().encode('no soy un zip').buffer, { JSZip }), /no es una copia válida/);
});

test('importar rechaza un zip sin proyecto.json o con JSON dañado', async () => {
  const sinProyecto = await new JSZip().file('otra.txt', 'x').generateAsync({ type: 'uint8array' });
  await assert.rejects(importarCopia(sinProyecto, { JSZip }), /no contiene proyecto.json/);
  const roto = await new JSZip().file('proyecto.json', '{ esto no es json').generateAsync({ type: 'uint8array' });
  await assert.rejects(importarCopia(roto, { JSZip }), /está dañado/);
});

test('importar rechaza un proyecto con la forma equivocada o con archivos faltantes', async () => {
  const otraVersion = await new JSZip().file('proyecto.json', JSON.stringify({ version: 2 })).generateAsync({ type: 'uint8array' });
  await assert.rejects(importarCopia(otraVersion, { JSZip }), /versión 2 no soportada/);

  const { proyecto } = proyectoConArchivos();
  const sinArchivos = await new JSZip().file('proyecto.json', JSON.stringify(proyecto)).generateAsync({ type: 'uint8array' });
  await assert.rejects(importarCopia(sinArchivos, { JSZip }), /Falta el archivo del elemento «Muelle»/);
});

test('validarEstructura enumera los problemas', () => {
  assert.deepEqual(validarEstructura(null), ['no es un objeto']);
  const p = crearProyecto({ titulo: 'x' });
  assert.deepEqual(validarEstructura(p), []);
  const el = agregarElemento(p, { tipo: 'fondo', nombre: 'Muelle', archivo: 'a.png', origen: 'creado' });
  delete p.fichas[el.id];
  assert.deepEqual(validarEstructura(p), ['el elemento «Muelle» no tiene ficha']);
});

test('un paquete de entrega con archivos extra se importa igual', async () => {
  const { proyecto, archivos } = proyectoConArchivos();
  const blob = await exportarCopia(proyecto, archivos, { JSZip });
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  zip.file('juego.html', '<!doctype html>');
  zip.file('informe-juridico.html', '<!doctype html>');
  const paquete = await zip.generateAsync({ type: 'uint8array' });
  const importado = await importarCopia(paquete, { JSZip });
  assert.deepEqual(importado.proyecto, proyecto);
});

test('los errores llevan código estable', async () => {
  const codigo = async (promesa) => promesa.then(() => null, (e) => e.codigo);
  assert.equal(await codigo(importarCopia(new TextEncoder().encode('x').buffer, { JSZip })), 'no_es_zip');
  assert.equal(await codigo(importarCopia(await new JSZip().file('a.txt', 'x').generateAsync({ type: 'uint8array' }), { JSZip })), 'sin_proyecto');
  assert.equal(await codigo(importarCopia(await new JSZip().file('proyecto.json', '{').generateAsync({ type: 'uint8array' }), { JSZip })), 'json_danado');
  const { proyecto, archivos, fondo } = proyectoConArchivos();
  delete proyecto.fichas[fondo.id];
  const sinFicha = await new JSZip().file('proyecto.json', JSON.stringify(proyecto)).generateAsync({ type: 'uint8array' });
  const error = await importarCopia(sinFicha, { JSZip }).catch((e) => e);
  assert.equal(error.codigo, 'forma');
  assert.deepEqual(error.problemas, ['el elemento «Muelle» no tiene ficha']);
  assert.equal(await codigo(exportarCopia(proyecto, archivos, { JSZip })), 'forma', 'exportar también valida');
  proyecto.fichas[fondo.id] = { tipo: 'fondo' };
  archivos.delete(fondo.id);
  assert.equal(await codigo(exportarCopia(proyecto, archivos, { JSZip })), 'archivo_faltante');
});

test('validarEstructura detecta lo que una copia editada a mano puede traer, sin lanzar', () => {
  const base = () => proyectoConArchivos().proyecto;

  let p = base();
  p.juego.elementos[1].id = p.juego.elementos[0].id;
  assert.ok(validarEstructura(p).some((m) => /está repetido/.test(m)), 'id repetido');

  p = base();
  p.juego.elementos[0].archivo = '../x';
  assert.ok(validarEstructura(p).some((m) => /nombre de archivo no permitido/.test(m)), 'ruta relativa');
  p.juego.elementos[0].archivo = '';
  assert.ok(validarEstructura(p).some((m) => /nombre de archivo no permitido/.test(m)), 'nombre vacío');

  p = base();
  p.juego.elementos[1].archivo = p.juego.elementos[0].archivo;
  assert.ok(validarEstructura(p).some((m) => /archivo «el_1.png» está repetido/.test(m)), 'archivo repetido');

  p = base();
  p.juego.destino = 'alquiler';
  assert.ok(validarEstructura(p).some((m) => /destino «alquiler» no es válido/.test(m)), 'destino');

  p = base();
  p.fichas.el_fantasma = { tipo: 'fondo' };
  assert.ok(validarEstructura(p).some((m) => /ficha «el_fantasma» no corresponde/.test(m)), 'ficha huérfana');

  p = base();
  p.juego.elementos.push(null);
  assert.ok(validarEstructura(p).some((m) => /sin identificador/.test(m)), 'entrada nula');

  p = base();
  p.fichas = [];
  assert.ok(validarEstructura(p).includes('faltan las fichas'), 'fichas como lista');

  assert.equal(validarEstructura({ juego: {} })[0], 'no indica su versión');
  assert.deepEqual(validarEstructura(base()), [], 'un proyecto sano no tiene problemas');
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/copias.test.js`
Expected: FAIL con `Cannot find module` para `copias.js`.

- [ ] **Step 3: Escribir `copias.js`**

```js
// plataforma/js/estado/copias.js
// Copia completa del proyecto en un archivo comprimido: proyecto.json + archivos/.
// JSZip se recibe como parámetro: en el navegador es window.JSZip (vendor/jszip.min.js),
// en las pruebas es el paquete de npm. Los errores llevan un código estable para la
// interfaz: no_es_zip, sin_proyecto, json_danado, forma (con la lista `problemas`),
// archivo_faltante. El paquete de entrega (plan 6) usa el mismo formato más otros archivos.
import { mimePorExtension } from './archivos.js';
import { VERSION_PROYECTO, DESTINOS, TIPOS_ELEMENTO, ORIGENES } from './modelo.js';

const FICHAS_FIJAS = ['titulo', 'historia'];
const NOMBRE_ARCHIVO = /^(?!\.+$)[\w.-]+$/;
const esObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);
const falla = (codigo, mensaje, extra = {}) => Object.assign(new Error(mensaje), { codigo, ...extra });
const fallaDeForma = (problemas) => falla('forma', `El proyecto no tiene la forma esperada: ${problemas.join('; ')}.`, { problemas });

/**
 * @param {object} proyecto
 * @param {Map<string, {tipo: string, datos: ArrayBuffer}>} archivos por id de elemento
 * @returns {Promise<Blob>}
 */
export async function exportarCopia(proyecto, archivos, { JSZip }) {
  const problemas = validarEstructura(proyecto);
  if (problemas.length) throw fallaDeForma(problemas);
  const zip = new JSZip();
  zip.file('proyecto.json', JSON.stringify(proyecto, null, 2));
  for (const elemento of proyecto.juego.elementos) {
    const archivo = archivos.get(elemento.id);
    if (!archivo) throw falla('archivo_faltante', `Falta el archivo del elemento «${elemento.nombre}».`);
    zip.file(`archivos/${elemento.archivo}`, archivo.datos);
  }
  // En Node no existe el tipo 'blob'; pasar por Uint8Array duplica la memoria un instante, aceptable bajo el aviso de 50 MB.
  const bytes = await zip.generateAsync({ type: 'uint8array' });
  return new Blob([bytes], { type: 'application/zip' });
}

/**
 * @param {Blob|ArrayBuffer|Uint8Array} entrada
 * @returns {Promise<{proyecto: object, archivos: Map}>}
 */
export async function importarCopia(entrada, { JSZip }) {
  const datos = typeof Blob !== 'undefined' && entrada instanceof Blob ? await entrada.arrayBuffer() : entrada;
  let zip;
  try {
    zip = await JSZip.loadAsync(datos);
  } catch {
    throw falla('no_es_zip', 'El archivo no es una copia válida (no se pudo abrir).');
  }
  const entradaProyecto = zip.file('proyecto.json');
  if (!entradaProyecto) throw falla('sin_proyecto', 'El archivo no contiene proyecto.json.');
  let proyecto;
  try {
    proyecto = JSON.parse(await entradaProyecto.async('string'));
  } catch {
    throw falla('json_danado', 'proyecto.json está dañado.');
  }
  const problemas = validarEstructura(proyecto);
  if (problemas.length) throw fallaDeForma(problemas);

  const archivos = new Map();
  for (const elemento of proyecto.juego.elementos) {
    const entradaArchivo = zip.file(`archivos/${elemento.archivo}`);
    if (!entradaArchivo) throw falla('archivo_faltante', `Falta el archivo del elemento «${elemento.nombre}» (archivos/${elemento.archivo}).`);
    // El tipo sale de la extensión; archivos.js mapea en los dos sentidos y la plataforma nunca escribe .mp4 (usa .m4a).
    archivos.set(elemento.id, { tipo: mimePorExtension(elemento.archivo), datos: await entradaArchivo.async('arraybuffer') });
  }
  return { proyecto, archivos };
}

/**
 * Comprueba la forma de un proyecto sin lanzar nunca: devuelve una lista de problemas
 * (vacía si está bien). Atrapa lo que una copia editada a mano puede traer: versión,
 * destino, ids repetidos o ausentes, nombres de archivo inseguros o repetidos, fichas
 * faltantes o huérfanas. La validez del juego (escenas, líneas) la informa validar().
 */
export function validarEstructura(proyecto) {
  if (!esObjeto(proyecto)) return ['no es un objeto'];
  const problemas = [];
  if (proyecto.version === undefined) problemas.push('no indica su versión');
  else if (proyecto.version !== VERSION_PROYECTO) problemas.push(`versión ${proyecto.version} no soportada`);

  const juego = proyecto.juego;
  if (!esObjeto(juego)) {
    problemas.push('falta el juego');
    return problemas;
  }
  if (typeof juego.titulo !== 'string') problemas.push('el título del juego no es texto');
  if (!DESTINOS.includes(juego.destino)) problemas.push(`el destino «${juego.destino}» no es válido`);
  if (juego.escenaInicial !== null && typeof juego.escenaInicial !== 'string') problemas.push('la escena inicial no es válida');

  const ids = new Set();
  const etiquetas = { escenas: 'las escenas', personajes: 'los personajes', elementos: 'los elementos' };
  for (const [lista, etiqueta] of Object.entries(etiquetas)) {
    if (!Array.isArray(juego[lista])) {
      problemas.push(`faltan ${etiqueta}`);
      continue;
    }
    for (const item of juego[lista]) {
      if (!esObjeto(item) || typeof item.id !== 'string' || !item.id) {
        problemas.push(`hay entradas sin identificador en ${etiqueta}`);
        continue;
      }
      if (ids.has(item.id)) problemas.push(`el identificador «${item.id}» está repetido`);
      ids.add(item.id);
    }
  }

  if (!esObjeto(proyecto.fichas)) {
    problemas.push('faltan las fichas');
    return problemas;
  }
  if (Array.isArray(juego.elementos)) {
    const usados = new Set();
    for (const elemento of juego.elementos) {
      if (!esObjeto(elemento) || typeof elemento.id !== 'string') continue;
      const nombre = typeof elemento.nombre === 'string' && elemento.nombre ? elemento.nombre : elemento.id;
      if (!TIPOS_ELEMENTO.includes(elemento.tipo)) problemas.push(`el elemento «${nombre}» tiene un tipo desconocido`);
      if (!ORIGENES.includes(elemento.origen)) problemas.push(`el elemento «${nombre}» tiene un origen desconocido`);
      if (typeof elemento.archivo !== 'string' || !NOMBRE_ARCHIVO.test(elemento.archivo)) {
        problemas.push(`el elemento «${nombre}» tiene un nombre de archivo no permitido`);
      } else if (usados.has(elemento.archivo)) {
        problemas.push(`el archivo «${elemento.archivo}» está repetido`);
      } else {
        usados.add(elemento.archivo);
      }
      if (!Object.hasOwn(proyecto.fichas, elemento.id)) problemas.push(`el elemento «${nombre}» no tiene ficha`);
    }
  }
  for (const id of Object.keys(proyecto.fichas)) {
    if (!FICHAS_FIJAS.includes(id) && !ids.has(id)) problemas.push(`la ficha «${id}» no corresponde a ningún elemento ni personaje`);
  }
  return problemas;
}
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/copias.test.js`
Expected: `# pass 10`, `# fail 0`. `npm test` → 113.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/estado/copias.js tests/copias.test.js
git commit -m "Copias del proyecto: exportar e importar archivo comprimido" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: Contenido jurídico y textos del semáforo

**Files:**
- Create: `plataforma/contenido/juridico.json`
- Create: `plataforma/js/juridico/textos.js`
- Test: `tests/contenido.test.js`

Los textos salen del memo de verificación (`07-memo-verificacion-bonasera.md`). Las entradas marcadas `"verificacion": "pendiente"` corresponden a la sección 19 del spec y no se publican sin cotejo; la prueba las cuenta y las imprime para que el docente las vea.

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/contenido.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CODIGOS_ROJO, CODIGOS_AMARILLO, CODIGOS_NOTAS, evaluar } from '../plataforma/js/juridico/semaforo.js';
import { TIPOS_OBRA, crearFicha } from '../plataforma/js/juridico/ficha.js';
import { describir } from '../plataforma/js/juridico/textos.js';

const contenido = JSON.parse(readFileSync(new URL('../plataforma/contenido/juridico.json', import.meta.url), 'utf8'));
const CAMPOS = ['tipoObra', 'autoria', 'titular', 'respaldo', 'credito', 'prueba', 'destino'];

const completa = (entrada, clave, conAccion = false) => {
  assert.ok(entrada, `falta la entrada ${clave}`);
  for (const campo of ['breve', 'completo', 'fuente']) assert.ok(entrada[campo]?.trim(), `${clave}.${campo} está vacío`);
  if (conAccion) assert.ok(entrada.accion?.trim(), `${clave}.accion está vacío`);
};

test('el contenido tiene nombre y aviso', () => {
  assert.ok(contenido.nombre.trim());
  assert.match(contenido.aviso, /educativo/i);
});

test('hay texto para cada campo de la ficha', () => {
  for (const campo of CAMPOS) completa(contenido.campos[campo], `campos.${campo}`);
});

test('hay texto para cada tipo de obra', () => {
  for (const codigo of Object.keys(TIPOS_OBRA)) completa(contenido.tiposObra[codigo], `tiposObra.${codigo}`);
});

test('hay texto y acción para cada regla, y texto para cada nota', () => {
  for (const codigo of [...CODIGOS_ROJO, ...CODIGOS_AMARILLO]) completa(contenido.reglas[codigo], `reglas.${codigo}`, true);
  for (const codigo of CODIGOS_NOTAS) completa(contenido.notas[codigo], `notas.${codigo}`);
});

test('las entradas pendientes de verificación están marcadas y se listan', () => {
  const pendientes = [];
  for (const [grupo, entradas] of Object.entries({ campos: contenido.campos, tiposObra: contenido.tiposObra, reglas: contenido.reglas, notas: contenido.notas })) {
    for (const [clave, entrada] of Object.entries(entradas)) {
      assert.ok(['verificada', 'pendiente'].includes(entrada.verificacion), `${grupo}.${clave}.verificacion debe ser verificada o pendiente`);
      if (entrada.verificacion === 'pendiente') pendientes.push(`${grupo}.${clave}`);
    }
  }
  console.log(`Entradas pendientes de verificación jurídica (${pendientes.length}): ${pendientes.join(', ')}`);
  assert.ok(pendientes.length > 0, 'el spec (sección 19) deja pendientes; si ya no hay, actualiza el spec');
});

test('describir agrega textos, fuente y acción con el nombre del autor', () => {
  const ficha = { ...crearFicha('retrato', { origen: 'subido' }), autoria: 'otra_persona', autorNombre: 'Camila', titular: 'otra_persona' };
  const resultado = evaluar(ficha, { destino: 'gratis' });
  const descrito = describir(resultado, ficha, contenido);
  assert.equal(descrito.color, 'rojo');
  assert.equal(descrito.razones[0].codigo, 'R02');
  assert.equal(descrito.razones[0].breve, contenido.reglas.R02.breve);
  assert.equal(descrito.razones[0].accion, 'Pide a Camila una cesión o una licencia por escrito.');
  assert.equal(descrito.razones[0].verificacion, 'verificada');
});

test('describir usa «esa persona» sin nombre y conserva las notas', () => {
  const ficha = { ...crearFicha('retrato', { origen: 'subido' }), autoria: 'otra_persona', autorNombre: '', titular: 'otra_persona' };
  const descrito = describir(evaluar(ficha, { destino: 'gratis' }), ficha, contenido);
  assert.equal(descrito.razones[0].accion, 'Pide a esa persona una cesión o una licencia por escrito.');
  const titulo = describir(evaluar(crearFicha('titulo'), { destino: 'gratis' }), crearFicha('titulo'), contenido);
  assert.equal(titulo.notas[0].codigo, 'N_TITULO');
  assert.equal(titulo.notas[0].breve, contenido.notas.N_TITULO.breve);
});

test('las fuentes dicen «por verificar» solo en las entradas pendientes', () => {
  for (const grupo of [contenido.campos, contenido.tiposObra, contenido.reglas, contenido.notas]) {
    for (const [clave, entrada] of Object.entries(grupo)) {
      const dice = /por verificar/i.test(entrada.fuente);
      assert.equal(dice, entrada.verificacion === 'pendiente', `${clave}: la fuente y la marca de verificación no coinciden`);
    }
  }
});

test('ningún texto hace las afirmaciones que el memo prohíbe', () => {
  const prohibido = /\bnula\b|gratuit|una sola obra|categoría autónoma|titular originario|se pueden ceder los morales/i;
  const textos = JSON.stringify(contenido);
  assert.ok(!prohibido.test(textos), `encontrado: ${textos.match(prohibido)?.[0]}`);
});

test('describir no falla con un código desconocido ni con una ficha ausente', () => {
  const d = describir({ color: 'amarillo', razones: ['A99'], notas: ['N_X'] }, null, contenido);
  assert.equal(d.razones[0].breve, 'A99');
  assert.equal(d.razones[0].verificacion, 'pendiente');
  assert.equal(d.notas[0].codigo, 'N_X');
});
```

Las dos pruebas de vigilancia hacen mecánica la regla de la casa: lo que el memo no cubre va marcado como pendiente, y lo que el memo prohíbe no aparece.

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/contenido.test.js`
Expected: FAIL con `ENOENT` para `juridico.json`.

- [ ] **Step 3: Escribir `juridico.json`**

```json
{
  "nombre": "Mi primer videojuego",
  "aviso": "Material educativo. No constituye asesoría legal personalizada. Cada contrato debe revisarse con un abogado.",
  "fuentePrincipal": "Memo de verificación legal (Bonasera, 4 de noviembre de 2026), en 07-memo-verificacion-bonasera.md. Toda cita de norma sale de ahí. Lo que describe licencias Creative Commons sale del texto de esas licencias, no del derecho colombiano.",

  "campos": {
    "tipoObra": {
      "breve": "La ley protege la forma concreta en que expresas una idea, no la idea. Cada pieza de tu juego es una obra distinta, con su propio autor y su propio titular.",
      "completo": "Las ideas no se protegen; la expresión sí (Ley 23 de 1982, art. 6; Decisión 351 de 1993, art. 7). Un videojuego contiene varias obras y en Colombia se registra por partes: el código como software, la música como obra musical, las ilustraciones como obras artísticas, el guion como obra literaria y los videos como obras audiovisuales (guía oficial de la DNDA). Por eso cada elemento tiene su ficha.",
      "fuente": "Memo, sección 2: Ley 23 de 1982, art. 6; Decisión 351, art. 7; DNDA, preguntas frecuentes sobre registro de videojuegos.",
      "verificacion": "verificada"
    },
    "autoria": {
      "breve": "Autor es quien crea la obra, y nace con derechos sin registrar nada. Solo las personas son autoras: una herramienta de IA no lo es.",
      "completo": "El derecho nace con la creación, sin ninguna formalidad (Ley 23 de 1982, art. 9; Decisión 351, art. 52). La ley presume, salvo prueba en contrario, que es titular quien divulgó la obra con su nombre o seudónimo (Ley 23, art. 10, parágrafo, texto de la Ley 1915 de 2018). La DNDA no registra resultados generados por inteligencia artificial sin aporte humano: solo reconoce como autoras a las personas físicas (pronunciamientos y resoluciones de 2023 a 2025).",
      "fuente": "Memo, sección 2: Ley 23 de 1982, arts. 9 y 10; Decisión 351, arts. 8 y 52; DNDA, pronunciamientos sobre IA.",
      "verificacion": "verificada"
    },
    "titular": {
      "breve": "El autor siempre es quien creó. El titular de los derechos patrimoniales puede ser otra persona, si hubo una cesión escrita o un encargo con contrato escrito.",
      "completo": "Los derechos patrimoniales, los que permiten explotar la obra, se pueden ceder o licenciar. Los morales no: son perpetuos, inalienables e irrenunciables (Ley 23 de 1982, art. 30; Decisión 351, art. 11), y la transmisión de los patrimoniales no los comprende (Ley 23, art. 182, parágrafo). Si alguien te cedió los derechos sobre su obra, tú eres el titular patrimonial y ella sigue siendo la autora. Si la obra se hizo por encargo o dentro de un trabajo, la ley presume que los patrimoniales pasan a quien la encargó o al empleador, siempre con contrato escrito y solo en la medida de sus actividades habituales (Ley 23, art. 20).",
      "fuente": "Memo, sección 2: Ley 23 de 1982, arts. 20, 30 y 182; Decisión 351, art. 11.",
      "verificacion": "verificada"
    },
    "respaldo": {
      "breve": "Lo que no está escrito, se pelea. Un contrato sobre derechos patrimoniales debe constar por escrito.",
      "completo": "Desde 2019 los contratos sobre derechos patrimoniales deben constar por escrito como condición de validez; si no dicen plazo ni territorio, la ley les pone límites por defecto (cinco años); y para oponerlos a terceros deben inscribirse en el registro (Ley 1955 de 2019, art. 181, que modificó el art. 183 de la Ley 23 de 1982; Ley 44 de 1993, art. 6). Una licencia abierta, como Creative Commons, tiene condiciones escritas: léelas.",
      "fuente": "Memo, secciones 2 y 5: Ley 1955 de 2019, art. 181; Ley 23 de 1982, art. 183; Ley 44 de 1993, art. 6.",
      "verificacion": "verificada"
    },
    "credito": {
      "breve": "Nombrar al autor es un derecho moral: no se cede ni se renuncia, aunque se hayan cedido los derechos patrimoniales.",
      "completo": "La paternidad (que se reconozca al autor como tal) y la integridad de la obra son derechos morales perpetuos, inalienables e irrenunciables; no pueden ser renunciados ni cedidos (Ley 23 de 1982, art. 30 y su parágrafo 1; Decisión 351, art. 11). Una cláusula que dice ceder los morales no produce efecto sobre ellos, sin que deje de valer la cesión patrimonial. La pantalla de créditos del juego se arma sola con lo que escribas aquí.",
      "fuente": "Memo, secciones 2 y 3: Ley 23 de 1982, art. 30; Decisión 351, art. 11.",
      "verificacion": "verificada"
    },
    "prueba": {
      "breve": "El registro no crea derechos: los prueba. Mientras tanto, guarda lo que demuestre cuándo y cómo creaste.",
      "completo": "El registro ante la Dirección Nacional de Derecho de Autor es declarativo: presume ciertos los hechos inscritos salvo prueba en contrario y deja a salvo los derechos de terceros (Decisión 351, art. 53). Se hace en línea en registroenlinea.gov.co, por partes: software, obra musical, obra artística, obra literaria, obra audiovisual. Desde 2023 tiene una tasa con tope de 2 UVT (Ley 2294 de 2023, art. 169); confirma la tarifa vigente en el portal. El sello de esta plataforma solo guarda fecha y huella del archivo: es un indicio, no un registro.",
      "fuente": "Memo, secciones 2, 3 y 6: Decisión 351, art. 53; Ley 2294 de 2023, art. 169; DNDA, guía de registro. Tarifa vigente: por verificar (laguna 8 del memo).",
      "verificacion": "pendiente"
    },
    "destino": {
      "breve": "Las licencias delimitan usos. Lo que sirve para un juego gratis puede no servir para uno que se vende.",
      "completo": "Cada licencia o contrato describe los usos que permite: una licencia no comercial no cubre un juego que se vende, y una licencia limitada a este curso no cubre publicar fuera de él. Para los contratos sobre derechos patrimoniales, además, la ley exige que consten por escrito y pone plazo y territorio por defecto cuando no se pactan (Ley 1955 de 2019, art. 181). Si cambias el destino del juego, la plataforma revisa cada elemento otra vez.",
      "fuente": "Memo, sección 5: Ley 1955 de 2019, art. 181. Texto de las licencias Creative Commons (creativecommons.org/licenses).",
      "verificacion": "verificada"
    }
  },

  "tiposObra": {
    "literaria": {
      "breve": "Historia, narración y diálogos son obra literaria. La lógica de las decisiones también está escrita en texto.",
      "completo": "La ley protege los programas de ordenador en los mismos términos que las obras literarias (Decisión 351, art. 23), y la DNDA registra el guion de un videojuego como obra literaria. Tu guion con decisiones no es software, pero sirve para entender por qué la ley protege el código de un juego como obra literaria.",
      "fuente": "Memo, sección 2: Decisión 351, art. 23; DNDA, registro por partes.",
      "verificacion": "verificada"
    },
    "artistica": {
      "breve": "Fondos y retratos son obras artísticas: dibujo, pintura o ilustración, con o sin píxeles.",
      "completo": "La DNDA registra las ilustraciones y animaciones de un videojuego como obras artísticas. El derecho sobre lo que dibujaste nace cuando lo creas, sin registro (Ley 23 de 1982, art. 9).",
      "fuente": "Memo, sección 2: DNDA, preguntas frecuentes sobre registro de videojuegos; Ley 23 de 1982, art. 9.",
      "verificacion": "verificada"
    },
    "musical_fonograma": {
      "breve": "Una pista tiene dos capas: la composición (obra musical) y la grabación (fonograma). Pueden tener titulares distintos.",
      "completo": "La DNDA registra la música de un videojuego como obra musical. La grabación, además, puede tener derechos propios de quien la produce; el régimen exacto está por verificar. Esta ficha trata el archivo como una sola pieza: si compusiste y grabaste tú, las dos capas son tuyas; si la grabación es de otra persona, pídele autorización aunque la composición sea tuya.",
      "fuente": "Memo, sección 2: DNDA, registro por partes (obra musical). Derechos del productor de fonogramas: por verificar en la Ley 23 de 1982 y la Decisión 351 (spec, sección 19, punto 1).",
      "verificacion": "pendiente"
    },
    "fonograma": {
      "breve": "Un efecto de sonido es, al menos, una grabación (fonograma). Si tiene creación propia, también puede ser obra.",
      "completo": "Grabar el mar con el celular produce una grabación que puede tener derechos de quien la hizo. Diseñar un sonido desde cero puede ser, además, una obra. En los dos casos, si no lo hiciste tú, pide permiso a quien lo hizo. El régimen exacto de las grabaciones está por verificar.",
      "fuente": "Derechos del productor de fonogramas: por verificar en la Ley 23 de 1982 y la Decisión 351 (spec, sección 19, punto 1).",
      "verificacion": "pendiente"
    },
    "interpretacion": {
      "breve": "Una voz grabada puede traer derechos de quien interpreta, además de los de la grabación. Si la voz es de otra persona, pídele autorización por escrito y dale crédito.",
      "completo": "Quien presta su voz a un personaje puede tener derechos propios sobre esa interpretación, distintos de los del guion y de los de la grabación; el régimen exacto está por verificar. Si grabaste tu propia voz, todo es tuyo. Si grabó un amigo, pídele autorización por escrito y dale crédito.",
      "fuente": "Derechos de los intérpretes: por verificar en la Ley 23 de 1982 y la Decisión 351 (spec, sección 19, punto 1).",
      "verificacion": "pendiente"
    },
    "titulo": {
      "breve": "El título, por sí solo, probablemente no es una obra. Si quieres exclusividad sobre el nombre, el camino suele ser la marca, ante la Superintendencia de Industria y Comercio.",
      "completo": "El derecho de autor protege la obra; qué protección tiene el título por sí mismo, y cómo se relaciona con el registro de marca, está por verificar. Esta ficha no bloquea nada; solo te lo recuerda.",
      "fuente": "Protección del título y relación con la marca: por verificar (spec, sección 19, punto 3).",
      "verificacion": "pendiente"
    }
  },

  "reglas": {
    "R01": {
      "breve": "No se sabe quién hizo esta pieza ni con qué permiso. Sin autor ni licencia, debes suponer que todos los derechos están reservados.",
      "completo": "Que algo esté en internet no significa que sea libre. La protección nace con la creación, sin registro ni aviso (Ley 23 de 1982, art. 9; Decisión 351, art. 52). Sin autor ni licencia debes suponer que todos los derechos están reservados, y sin saber quién es el autor no hay a quién pedirle permiso: no hay forma segura de usar la pieza. La única salida es reemplazarla.",
      "fuente": "Memo, sección 2: Ley 23 de 1982, art. 9; Decisión 351, art. 52.",
      "accion": "Reemplaza esta pieza por una con autor y licencia conocidos.",
      "verificacion": "verificada"
    },
    "R02": {
      "breve": "Otra persona hizo esto, o es la titular de sus derechos, y no tienes nada escrito que te autorice a usarlo.",
      "completo": "Si otra persona creó la obra, o si tú la creaste pero los derechos patrimoniales son de otra persona (por ejemplo, la hiciste por encargo con contrato escrito, o ya le cediste los derechos), necesitas su permiso. Un contrato sobre derechos patrimoniales debe constar por escrito (Ley 1955 de 2019, art. 181). Un «me dijo que sí» no basta para vender. Pídele una cesión o una licencia por escrito, con usos, territorio y plazo, y acuerden la contraprestación.",
      "fuente": "Memo, secciones 2 y 5: Ley 23 de 1982, art. 20; Ley 1955 de 2019, art. 181.",
      "accion": "Pide a {autor} una cesión o una licencia por escrito.",
      "verificacion": "verificada"
    },
    "R03": {
      "breve": "Esta licencia prohíbe el uso comercial y tu juego se va a vender.",
      "completo": "Las licencias Creative Commons con la condición NC (no comercial) permiten usar la obra solo sin fines comerciales. Vender el juego, o monetizarlo, es un uso comercial. Cambia el destino del juego o reemplaza la pieza.",
      "fuente": "Texto de las licencias Creative Commons (creativecommons.org/licenses).",
      "accion": "Cambia el destino del juego o reemplaza esta pieza.",
      "verificacion": "verificada"
    },
    "R04": {
      "breve": "Esta licencia no permite obras derivadas y marcaste que la modificaste.",
      "completo": "La condición ND (sin derivadas) permite copiar y distribuir la obra tal cual, pero no permite compartir versiones modificadas. Usa el original sin cambios o reemplázala por una pieza que sí permita modificaciones.",
      "fuente": "Texto de las licencias Creative Commons ND (creativecommons.org/licenses).",
      "accion": "Vuelve a la versión original de la pieza o reemplázala.",
      "verificacion": "verificada"
    },
    "R05": {
      "breve": "Esta pieza solo se puede usar dentro de la plataforma y del curso. Tu juego va a salir de ahí.",
      "completo": "Una licencia limitada describe los únicos usos que permite. Esta cubre el ejercicio del curso; no cubre publicar el juego, ni gratis ni vendido.",
      "fuente": "Texto de la licencia CURSO de la biblioteca de la plataforma.",
      "accion": "Reemplaza la pieza o cambia el destino del juego a uso personal.",
      "verificacion": "verificada"
    },
    "R06": {
      "breve": "Esta pieza se basa en una obra ajena y no tienes autorización.",
      "completo": "Transformar una obra (adaptarla, continuarla, versionarla, hacer una secuela) requiere la autorización de su titular; la obra derivada no se puede usar sin ella. El fundamento exacto está por verificar. Si la obra original ya está en dominio público no hace falta pedirla: marca la casilla de autorización y dilo en el crédito.",
      "fuente": "Derecho de transformación y obra derivada: por verificar en la Ley 23 de 1982 y la Decisión 351 (spec, sección 19, punto 2).",
      "accion": "Consigue la autorización por escrito o cambia la obra.",
      "verificacion": "pendiente"
    },
    "A01": {
      "breve": "Esta licencia exige dar crédito y todavía no lo escribiste.",
      "completo": "La condición BY (atribución) obliga a nombrar al autor y la licencia, y a indicar si hubo cambios. Usa el crédito sugerido o escríbelo con esos datos.",
      "fuente": "Texto de las licencias Creative Commons BY (creativecommons.org/licenses).",
      "accion": "Escribe el crédito con autor y licencia.",
      "verificacion": "verificada"
    },
    "A02": {
      "breve": "Otra persona es la autora: nombrarla es su derecho moral, aunque te haya cedido los derechos patrimoniales.",
      "completo": "La paternidad es un derecho moral perpetuo, inalienable e irrenunciable (Ley 23 de 1982, art. 30; Decisión 351, art. 11). Una cesión de derechos patrimoniales no la toca. Incluso con licencias que no exigen crédito, como CC0, en Colombia el autor no puede renunciar a su paternidad (Ley 23, art. 30, parágrafo 1).",
      "fuente": "Memo, sección 2: Ley 23 de 1982, art. 30; Decisión 351, art. 11.",
      "accion": "Escribe el crédito de {autor}.",
      "verificacion": "verificada"
    },
    "A03": {
      "breve": "Esta licencia exige compartir igual: tu juego tendría que llevar la misma licencia.",
      "completo": "La condición SA (compartir igual) puede obligarte a licenciar tu juego bajo la misma licencia, porque incorpora la obra. Es una decisión sobre todo el juego, no solo sobre esta pieza. Si la aceptas, marca la casilla; si no, reemplaza la pieza.",
      "fuente": "Texto de las licencias Creative Commons SA (creativecommons.org/licenses).",
      "accion": "Acepta licenciar tu juego igual o reemplaza la pieza.",
      "verificacion": "verificada"
    },
    "A04": {
      "breve": "Esto lo generó una herramienta de IA sin aporte tuyo. No podrás reclamarlo como obra tuya, y la plataforma te pide declararlo.",
      "completo": "La DNDA niega el registro de resultados generados por inteligencia artificial sin aporte humano: solo las personas físicas son autoras (resoluciones de 2023 a 2025). Puedes usarlo en tu juego si los términos de la herramienta lo permiten; revísalos. Reconócelo en la ficha y la plataforma lo declarará en los créditos.",
      "fuente": "Memo, sección 2: DNDA, pronunciamientos sobre IA y resoluciones 2023-2025.",
      "accion": "Marca que lo entiendes y escribe el crédito como «generado con IA (nombre de la herramienta)».",
      "verificacion": "verificada"
    },
    "A05": {
      "breve": "Dices que hubo aporte creativo tuyo sobre lo que hizo la IA. Descríbelo.",
      "completo": "La DNDA solo reconoce autoría humana: tu aporte creativo es lo único que puede estar protegido. Describe qué hiciste tú (qué dibujaste, editaste o compusiste) para que conste en la ficha y en el informe.",
      "fuente": "Memo, sección 2: DNDA, pronunciamientos sobre IA. Grado de aporte exigido: por verificar (spec, sección 19, punto 6).",
      "accion": "Describe tu aporte creativo.",
      "verificacion": "pendiente"
    },
    "A06": {
      "breve": "Subiste algo hecho por ti, o con tu aporte, y no tienes nada que pruebe cuándo.",
      "completo": "El derecho nace con la creación (Ley 23 de 1982, art. 9), pero si alguien discute la autoría tendrás que probarla; si hubo IA de por medio, lo que tendrás que mostrar es tu aporte. Sirven el archivo original con sus datos o un repositorio con historial; para una obra tuya, también el registro ante la DNDA, que presume ciertos los hechos inscritos (Decisión 351, art. 53).",
      "fuente": "Memo, sección 2: Ley 23 de 1982, art. 9; Decisión 351, art. 53.",
      "accion": "Indica qué prueba tienes: archivo original, repositorio o registro.",
      "verificacion": "verificada"
    },
    "A07": {
      "breve": "Hay una licencia y no la has leído.",
      "completo": "Una licencia autoriza lo que dice: léela antes de marcar la casilla. Las condiciones de esta pieza están en su ficha.",
      "fuente": "Texto de las licencias Creative Commons (creativecommons.org/licenses).",
      "accion": "Lee la licencia y marca la casilla.",
      "verificacion": "verificada"
    },
    "A08": {
      "breve": "Otra persona hizo esto y no escribiste su nombre.",
      "completo": "Sin nombre no hay crédito posible ni contrato identificable. La paternidad es un derecho moral del autor (Ley 23 de 1982, art. 30). Escribe quién es.",
      "fuente": "Memo, sección 2: Ley 23 de 1982, art. 30.",
      "accion": "Escribe el nombre de la autora o del autor.",
      "verificacion": "verificada"
    },
    "A09": {
      "breve": "Dices que te cedieron los derechos, pero marcaste que el titular es otra persona.",
      "completo": "Con una cesión de derechos patrimoniales el titular pasas a ser tú; la otra persona sigue siendo la autora (Ley 23 de 1982, art. 182, parágrafo). Si lo que tienes es una licencia, el titular sigue siendo ella: corrige el respaldo.",
      "fuente": "Memo, sección 2: Ley 23 de 1982, art. 182; Ley 1955 de 2019, art. 181.",
      "accion": "Revisa: si hay cesión, el titular eres tú; si es una licencia, cambia el respaldo.",
      "verificacion": "verificada"
    },
    "A10": {
      "breve": "Tienes una autorización informal y tu juego se va a vender.",
      "completo": "Para explotar comercialmente una obra ajena necesitas un contrato escrito de cesión o de licencia (Ley 1955 de 2019, art. 181); conviene que diga usos, territorio y plazo. Un mensaje de «úsalo tranquilo» sirve para un ejercicio, no para vender.",
      "fuente": "Memo, sección 5: Ley 1955 de 2019, art. 181.",
      "accion": "Pide a {autor} una cesión o una licencia por escrito.",
      "verificacion": "verificada"
    },
    "A11": {
      "breve": "Dices que hay otra licencia, pero no la describiste.",
      "completo": "Una licencia que la plataforma no conoce solo se puede evaluar si dices qué permite y qué no. Escribe de dónde sale (un correo, un contrato, un aviso en la página de descarga), qué usos autoriza y marca las condiciones que impone: crédito, no comercial, compartir igual, sin derivadas. Si no marcas ninguna, la plataforma confía en tu lectura.",
      "fuente": "Regla de la plataforma, sin afirmación legal: una licencia que no se describe no se puede evaluar.",
      "accion": "Describe la licencia y marca sus condiciones.",
      "verificacion": "verificada"
    },
    "A12": {
      "breve": "Dices que te respalda una licencia, pero no elegiste cuál.",
      "completo": "Sin saber qué licencia es, la plataforma no puede decir qué usos permite. Elige una de la lista o marca «otra» y descríbela.",
      "fuente": "Regla de la plataforma, sin afirmación legal.",
      "accion": "Elige la licencia que te dieron.",
      "verificacion": "verificada"
    },
    "A13": {
      "breve": "Este elemento se hizo con IA y no dijiste con qué herramienta.",
      "completo": "La plataforma arma el crédito con el nombre de la herramienta y necesita saber cuál es. Además, cada herramienta tiene sus propios términos de uso, y algunos no permiten uso comercial. Sin el nombre, ni el crédito ni la revisión de términos se pueden hacer.",
      "fuente": "Memo, sección 2: DNDA, pronunciamientos sobre IA (solo las personas físicas son autoras). Regla de la plataforma para el crédito.",
      "accion": "Escribe el nombre de la herramienta de IA.",
      "verificacion": "verificada"
    }
  },

  "notas": {
    "N_TITULO": {
      "breve": "El título, por sí solo, probablemente no es una obra. Si quieres que nadie más lo use, el camino suele ser la marca, ante la Superintendencia de Industria y Comercio.",
      "completo": "El derecho de autor protege la obra; qué protección tiene el título por sí mismo está por verificar. El registro de marca es otro trámite, en otra oficina, y da exclusividad sobre el nombre en el mercado.",
      "fuente": "Protección del título y relación con la marca: por verificar (spec, sección 19, punto 3).",
      "verificacion": "pendiente"
    },
    "N_IA": {
      "breve": "Este elemento fue generado con IA y está declarado. No podrás reclamarlo como obra tuya.",
      "completo": "La DNDA no lo registraría como obra: solo reconoce como autoras a las personas. Queda declarado en los créditos y en el informe.",
      "fuente": "Memo, sección 2: DNDA, pronunciamientos sobre IA y resoluciones 2023-2025.",
      "verificacion": "verificada"
    },
    "N_IA_APORTE": {
      "breve": "La protección cubre solo tu aporte creativo sobre lo generado con IA.",
      "completo": "Lo que agregaste tú puede ser obra; lo que produjo la herramienta, no. El informe deja constancia de tu descripción del aporte.",
      "fuente": "Memo, sección 2: DNDA, pronunciamientos sobre IA. Grado de aporte exigido: por verificar (spec, sección 19, punto 6).",
      "verificacion": "pendiente"
    },
    "N_SELLO": {
      "breve": "El sello de la plataforma guarda fecha, hora y huella del archivo. Es un indicio de cuándo existía; no es un registro.",
      "completo": "El sello se calcula en tu navegador, con la hora de tu propio equipo, y queda en el proyecto y en el informe. Es un indicio débil de cuándo existía el archivo; no presume nada ante nadie. La prueba fuerte es el registro ante la DNDA (Decisión 351, art. 53).",
      "fuente": "Memo, sección 2: Decisión 351, art. 53. Fórmula exacta para describir el sello: por verificar (spec, sección 19, punto 8).",
      "verificacion": "pendiente"
    }
  }
}
```

- [ ] **Step 4: Escribir `textos.js`**

```js
// plataforma/js/juridico/textos.js
// Une el resultado del semáforo (códigos) con los textos de contenido/juridico.json.

/**
 * @param {{color: string, razones: string[], notas: string[]}} resultado de evaluar()
 * @param {object} ficha la ficha evaluada (para el nombre del autor)
 * @param {object} contenido el JSON de contenido/juridico.json ya cargado
 */
export function describir(resultado, ficha, contenido) {
  const autor = (ficha?.autorNombre ?? '').trim() || 'esa persona';
  const razones = resultado.razones.map((codigo) => {
    const texto = contenido.reglas?.[codigo] ?? {};
    return {
      codigo,
      breve: texto.breve ?? codigo,
      completo: texto.completo ?? '',
      fuente: texto.fuente ?? '',
      accion: (texto.accion ?? '').replaceAll('{autor}', autor),
      verificacion: texto.verificacion ?? 'pendiente',
    };
  });
  const notas = resultado.notas.map((codigo) => {
    const texto = contenido.notas?.[codigo] ?? {};
    return {
      codigo,
      breve: texto.breve ?? codigo,
      completo: texto.completo ?? '',
      fuente: texto.fuente ?? '',
      verificacion: texto.verificacion ?? 'pendiente',
    };
  });
  return { color: resultado.color, razones, notas };
}

/** Carga el contenido en el navegador. En las pruebas se lee el JSON directamente. */
export async function cargarContenido(url = new URL('../../contenido/juridico.json', import.meta.url)) {
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error(`No se pudo cargar el contenido jurídico (${respuesta.status}).`);
  return respuesta.json();
}
```

- [ ] **Step 5: Correr las pruebas para ver que pasan**

Run: `node --test tests/contenido.test.js`
Expected: `# pass 10`, `# fail 0`, y en la salida la línea `Entradas pendientes de verificación jurídica (10): campos.prueba, tiposObra.musical_fonograma, tiposObra.fonograma, tiposObra.interpretacion, tiposObra.titulo, reglas.R06, reglas.A05, notas.N_TITULO, notas.N_IA_APORTE, notas.N_SELLO`.

- [ ] **Step 6: Commit**

```bash
git add plataforma/contenido/juridico.json plataforma/js/juridico/textos.js tests/contenido.test.js
git commit -m "Contenido jurídico con fuentes del memo y textos del semáforo" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 13: Cierre del plan: pruebas completas, limpieza y nota de uso

**Files:**
- Delete: `plataforma/js/estado/.gitkeep`, `plataforma/js/juridico/.gitkeep`, `plataforma/contenido/.gitkeep`, `tests/.gitkeep` (ya no hacen falta)
- Create: `plataforma/README.md`

- [ ] **Step 1: Correr toda la suite**

Run: `npm test`
Expected: `# fail 0`. Total antes de los ajustes: 123 (10 ficha + 12 modelo + 22 validación + 46 semáforo + 5 archivos + 8 almacén + 10 copias + 10 contenido). Después del paso 1b: 124. Con la tarea 14: 132.

- [ ] **Step 1b: Ajustes menores acumulados de las revisiones**

En `plataforma/js/juridico/ficha.js`, cambiar `if (!(biblioteca.licencia in LICENCIAS))` por `if (!Object.hasOwn(LICENCIAS, biblioteca.licencia))`, para que un código como `constructor` no pase por la cadena de prototipos. Correr `node --test tests/ficha.test.js` y confirmar `# pass 10`.

En `plataforma/js/estado/archivos.js`: agregar `'image/jpg': 'jpg'` a `EXTENSION_POR_MIME` (algunos navegadores lo emiten) y `.trim()` a la extensión en `mimePorExtension` (`String(nombre).trim().split('.').pop().toLowerCase()`); en `huellaSha256`, lanzar `new Error('Este navegador no permite calcular huellas (se necesita HTTPS o localhost).')` si `globalThis.crypto?.subtle` no existe. Agregar a `tests/archivos.test.js` una prueba con `extensionPorMime('image/jpg')` → `'jpg'` y `mimePorExtension('a.PNG ')` → `'image/png'`; conteo de archivos pasa a 6.

Volver a extraer `plataforma/contenido/juridico.json` del bloque JSON de la tarea 12 con el mismo comando de esa tarea (el bloque recibió cuatro retoques de redacción tras la revisión: A10, titular, acción de A01 y fuente de literaria). Confirmar con `git diff --stat` que cambian unas pocas líneas y que `node --test tests/contenido.test.js` sigue en 10.

En `plataforma/js/estado/copias.js`, dentro de `validarEstructura`, cambiar `if (!Object.hasOwn(proyecto.fichas, elemento.id))` por `if (!esObjeto(proyecto.fichas[elemento.id]))` para que una ficha que no sea un objeto (por ejemplo un número) cuente como faltante; `Object.hasOwn` solo prueba que la clave existe. Las pruebas de copias deben seguir en 10.

En `tests/validacion.test.js` (y en cualquier otro archivo de pruebas donde haya quedado), borrar los comentarios marcadores del plan (`// tests/validacion.test.js (agregar al final)` y similares) y subir las sentencias `import` que quedaron a mitad del archivo hasta el bloque de importaciones del inicio, sin cambiar las pruebas. Correr `npm test` y confirmar que el total no cambia.

- [ ] **Step 2: Borrar los `.gitkeep` y copiar la licencia de JSZip**

Run: `node -e "const fs=require('fs');for(const f of ['plataforma/js/estado/.gitkeep','plataforma/js/juridico/.gitkeep','plataforma/js/vendor/.gitkeep','plataforma/contenido/.gitkeep','tests/.gitkeep']){fs.rmSync(f,{force:true})};fs.copyFileSync('node_modules/jszip/LICENSE.markdown','plataforma/js/vendor/LICENSE-jszip.md');console.log('listo')"`
Expected: `listo`. La licencia acompaña al archivo vendorizado porque la plataforma se publica en GitHub Pages.

- [ ] **Step 3: Escribir `plataforma/README.md`**

````markdown
# Plataforma de práctica: primer videojuego y derecho de autor

Aplicación web estática. Los estudiantes arman una aventura narrativa y, por cada
elemento que incorporan, resuelven una ficha jurídica con semáforo. Diseño completo
en `docs/superpowers/specs/2026-11-04-plataforma-primer-videojuego-design.md`.

## Estado

Plan 1 (núcleo) terminado: modelo del juego, validación, fichas, licencias, semáforo,
contenido jurídico, almacén en IndexedDB y copias comprimidas. Todavía no hay
interfaz: llega con el plan 2.

## Pruebas

```bash
npm install
npm test
```

Las reglas del semáforo se prueban con la tabla `tests/semaforo.casos.json`, que se
puede leer sin saber programar: cada caso dice qué ficha entra y qué color y razones
salen.

## Contenido jurídico

Todos los textos que ve el estudiante están en `contenido/juridico.json`. Las entradas
con `"verificacion": "pendiente"` corresponden a la sección 19 del diseño y no deben
publicarse sin cotejo. `npm test` imprime la lista. Dos pruebas vigilan que las fuentes
digan «por verificar» solo en las entradas pendientes y que ningún texto haga las
afirmaciones que el memo de verificación prohíbe.

## Requisitos del navegador

La plataforma usa IndexedDB y Web Crypto. Web Crypto exige un contexto seguro: HTTPS
(GitHub Pages) o `localhost`. Para probar en local, sirva la carpeta con un servidor
estático en `localhost`; abrir `index.html` directamente desde el disco no funciona con
módulos ES.

## Dependencias

`js/vendor/jszip.min.js` es la copia de JSZip 3.10.2 (licencia en
`js/vendor/LICENSE-jszip.md`). Es la única dependencia en tiempo de ejecución.
````

- [ ] **Step 4: Confirmar que el repositorio queda limpio salvo lo nuevo**

Run: `git status --short`
Expected: `M` en los archivos tocados en el paso 1b, `D` para los cinco `.gitkeep` y `??` para `plataforma/README.md` y `plataforma/js/vendor/LICENSE-jszip.md`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Cierre del plan 1: ajustes de las revisiones, README de la plataforma y limpieza" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 14: Importación estricta, reemplazo atómico, DESTINOS único y prueba de ida y vuelta

> Tarea agregada tras la revisión final del plan. Cierra lo que esa revisión pidió antes de construir el editor: la importación de copias debe rechazar cualquier ficha o escena que el semáforo no sabría evaluar (el semáforo es permisivo ante datos inesperados, así que solo debe ver fichas validadas), y reemplazar el proyecto al abrir una copia debe ser atómico.

**Files:**
- Modify: `plataforma/js/juridico/ficha.js` (exportar `DESTINOS`), `plataforma/js/juridico/semaforo.js` y `plataforma/js/estado/modelo.js` (importarlo; en modelo, reexportarlo)
- Modify: `plataforma/js/estado/copias.js` (validación estricta de fichas y escenas)
- Modify: `plataforma/js/estado/almacen.js` (`reemplazarTodo`, `leerArchivos`, códigos `sin_indexeddb` y `bloqueado`, abortar ante fallo síncrono)
- Test: `tests/ficha.test.js`, `tests/modelo.test.js`, `tests/copias.test.js`, `tests/almacen.test.js` (agregar), `tests/integracion.test.js` (crear)

- [ ] **Step 1: `DESTINOS` una sola vez**

En `ficha.js`, después de `PRUEBAS`: `export const DESTINOS = ['personal', 'gratis', 'venta'];`. En `semaforo.js`, importar `DESTINOS` de `./ficha.js` y borrar la constante local. En `modelo.js`, `import { crearFicha, DESTINOS } from '../juridico/ficha.js'; export { DESTINOS };` y borrar la constante local. Pruebas: en `ficha.test.js`, `DESTINOS` es la lista del spec; en `modelo.test.js`, `DESTINOS` es el mismo arreglo que el de la ficha, todo `TIPOS_ELEMENTO` está en `TIPOS_FICHA` y todo `ORIGENES` en `ORIGENES_FICHA`.

- [ ] **Step 2: `copias.js` final**

```js
// plataforma/js/estado/copias.js
// Copia completa del proyecto en un archivo comprimido: proyecto.json + archivos/.
// JSZip se recibe como parámetro: en el navegador es window.JSZip (vendor/jszip.min.js),
// en las pruebas es el paquete de npm. Los errores llevan un código estable para la
// interfaz: no_es_zip, sin_proyecto, json_danado, forma (con la lista `problemas`),
// archivo_faltante. El paquete de entrega (plan 6) usa el mismo formato más otros archivos.
// Regla: el semáforo es permisivo ante datos inesperados, así que solo debe ver fichas
// que pasaron por validarEstructura.
import { mimePorExtension } from './archivos.js';
import { VERSION_PROYECTO, DESTINOS, TIPOS_ELEMENTO, ORIGENES, TIPOS_LINEA } from './modelo.js';
import { AUTORIAS, TITULARES, RESPALDOS, PRUEBAS, tipoObraPara } from '../juridico/ficha.js';
import { LICENCIAS, CONDICIONES } from '../juridico/licencias.js';

const FICHAS_FIJAS = { titulo: 'el título', historia: 'la historia' };
const NOMBRE_ARCHIVO = /^(?!\.+$)[\w.-]+$/;
const BOOLEANOS = ['reconoceSinDerechos', 'basadoEnObraAjena', 'autorizacionDerivada', 'licenciaLeida', 'aceptaCompartirIgual', 'modificado'];
const TEXTOS = ['autorNombre', 'herramientaIA', 'aporteHumano', 'licenciaTexto', 'credito'];

const esObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);
const falla = (codigo, mensaje, extra = {}) => Object.assign(new Error(mensaje), { codigo, ...extra });
const fallaDeForma = (problemas) => falla('forma', `El proyecto no tiene la forma esperada: ${problemas.join('; ')}.`, { problemas });
const etiquetaDe = (item) => `«${typeof item.nombre === 'string' && item.nombre ? item.nombre : item.id}»`;

/**
 * @param {object} proyecto
 * @param {Map<string, {tipo: string, datos: ArrayBuffer}>} archivos por id de elemento
 * @returns {Promise<Blob>}
 */
export async function exportarCopia(proyecto, archivos, { JSZip }) {
  const problemas = validarEstructura(proyecto);
  if (problemas.length) throw fallaDeForma(problemas);
  const zip = new JSZip();
  zip.file('proyecto.json', JSON.stringify(proyecto, null, 2));
  for (const elemento of proyecto.juego.elementos) {
    const archivo = archivos.get(elemento.id);
    if (!archivo) throw falla('archivo_faltante', `Falta el archivo del elemento «${elemento.nombre}».`);
    zip.file(`archivos/${elemento.archivo}`, archivo.datos);
  }
  // En Node no existe el tipo 'blob'; pasar por Uint8Array duplica la memoria un instante, aceptable bajo el aviso de 50 MB.
  const bytes = await zip.generateAsync({ type: 'uint8array' });
  return new Blob([bytes], { type: 'application/zip' });
}

/**
 * @param {Blob|ArrayBuffer|Uint8Array} entrada
 * @returns {Promise<{proyecto: object, archivos: Map}>}
 */
export async function importarCopia(entrada, { JSZip }) {
  const datos = typeof Blob !== 'undefined' && entrada instanceof Blob ? await entrada.arrayBuffer() : entrada;
  let zip;
  try {
    zip = await JSZip.loadAsync(datos);
  } catch {
    throw falla('no_es_zip', 'El archivo no es una copia válida (no se pudo abrir).');
  }
  const entradaProyecto = zip.file('proyecto.json');
  if (!entradaProyecto) throw falla('sin_proyecto', 'El archivo no contiene proyecto.json.');
  let proyecto;
  try {
    proyecto = JSON.parse(await entradaProyecto.async('string'));
  } catch {
    throw falla('json_danado', 'proyecto.json está dañado.');
  }
  const problemas = validarEstructura(proyecto);
  if (problemas.length) throw fallaDeForma(problemas);

  const archivos = new Map();
  for (const elemento of proyecto.juego.elementos) {
    const entradaArchivo = zip.file(`archivos/${elemento.archivo}`);
    if (!entradaArchivo) throw falla('archivo_faltante', `Falta el archivo del elemento «${elemento.nombre}» (archivos/${elemento.archivo}).`);
    // El tipo sale de la extensión; archivos.js mapea en los dos sentidos y la plataforma nunca escribe .mp4 (usa .m4a).
    archivos.set(elemento.id, { tipo: mimePorExtension(elemento.archivo), datos: await entradaArchivo.async('arraybuffer') });
  }
  return { proyecto, archivos };
}

/** Problemas de una ficha frente a lo que su dueño exige. */
function problemasDeFicha(ficha, etiqueta, { tipo, origen }) {
  if (!esObjeto(ficha)) return [`${etiqueta} no tiene ficha`];
  const problemas = [];
  if (ficha.tipo !== tipo) problemas.push(`la ficha de ${etiqueta} es de tipo «${ficha.tipo}» y debería ser «${tipo}»`);
  else if (ficha.tipoObra !== tipoObraPara(tipo)) problemas.push(`la ficha de ${etiqueta} tiene un tipo de obra que no corresponde`);
  if (ficha.origen !== origen) problemas.push(`la ficha de ${etiqueta} dice origen «${ficha.origen}» y debería decir «${origen}»`);
  if (!AUTORIAS.includes(ficha.autoria)) problemas.push(`la ficha de ${etiqueta} tiene una autoría desconocida`);
  if (!TITULARES.includes(ficha.titular)) problemas.push(`la ficha de ${etiqueta} tiene un titular desconocido`);
  if (!RESPALDOS.includes(ficha.respaldo)) problemas.push(`la ficha de ${etiqueta} tiene un respaldo desconocido`);
  if (!PRUEBAS.includes(ficha.prueba)) problemas.push(`la ficha de ${etiqueta} tiene una prueba desconocida`);
  if (ficha.licencia !== null && !Object.hasOwn(LICENCIAS, ficha.licencia)) problemas.push(`la ficha de ${etiqueta} tiene una licencia desconocida`);
  if (!Array.isArray(ficha.condicionesOtra) || !ficha.condicionesOtra.every((c) => CONDICIONES.includes(c))) problemas.push(`la ficha de ${etiqueta} tiene condiciones de licencia desconocidas`);
  for (const campo of BOOLEANOS) if (typeof ficha[campo] !== 'boolean') problemas.push(`la ficha de ${etiqueta} tiene «${campo}» que no es sí o no`);
  for (const campo of TEXTOS) if (typeof ficha[campo] !== 'string') problemas.push(`la ficha de ${etiqueta} tiene «${campo}» que no es texto`);
  return problemas;
}

/**
 * Comprueba la forma de un proyecto sin lanzar nunca: devuelve una lista de problemas
 * (vacía si está bien). Atrapa lo que una copia editada a mano puede traer: versión,
 * destino, ids repetidos o ausentes, escenas y líneas malformadas, nombres de archivo
 * inseguros o repetidos, fichas faltantes, huérfanas o incoherentes con su dueño.
 * La validez del juego (alcance de escenas, decisiones sin destino) la informa validar().
 */
export function validarEstructura(proyecto) {
  if (!esObjeto(proyecto)) return ['no es un objeto'];
  const problemas = [];
  if (proyecto.version === undefined) problemas.push('no indica su versión');
  else if (proyecto.version !== VERSION_PROYECTO) problemas.push(`versión ${proyecto.version} no soportada`);

  const juego = proyecto.juego;
  if (!esObjeto(juego)) {
    problemas.push('falta el juego');
    return problemas;
  }
  if (typeof juego.titulo !== 'string') problemas.push('el título del juego no es texto');
  if (!DESTINOS.includes(juego.destino)) problemas.push(`el destino «${juego.destino}» no es válido`);
  if (juego.escenaInicial !== null && typeof juego.escenaInicial !== 'string') problemas.push('la escena inicial no es válida');

  const ids = new Set();
  const etiquetas = { escenas: 'las escenas', personajes: 'los personajes', elementos: 'los elementos' };
  for (const [lista, etiqueta] of Object.entries(etiquetas)) {
    if (!Array.isArray(juego[lista])) {
      problemas.push(`faltan ${etiqueta}`);
      continue;
    }
    for (const item of juego[lista]) {
      if (!esObjeto(item) || typeof item.id !== 'string' || !item.id) {
        problemas.push(`hay entradas sin identificador en ${etiqueta}`);
        continue;
      }
      if (ids.has(item.id)) problemas.push(`el identificador «${item.id}» está repetido`);
      ids.add(item.id);
    }
  }

  if (Array.isArray(juego.escenas)) {
    for (const escena of juego.escenas) {
      if (!esObjeto(escena) || typeof escena.id !== 'string') continue;
      const nombre = etiquetaDe(escena);
      if (!Array.isArray(escena.lineas)) {
        problemas.push(`la escena ${nombre} no tiene lista de líneas`);
        continue;
      }
      escena.lineas.forEach((linea, i) => {
        if (!esObjeto(linea) || !TIPOS_LINEA.includes(linea.tipo)) {
          problemas.push(`la línea ${i + 1} de la escena ${nombre} no tiene un tipo conocido`);
        } else if (linea.tipo === 'decision' && (!Array.isArray(linea.opciones) || !linea.opciones.every(esObjeto))) {
          problemas.push(`la decisión ${i + 1} de la escena ${nombre} no tiene lista de opciones`);
        }
      });
    }
  }

  if (!esObjeto(proyecto.fichas)) {
    problemas.push('faltan las fichas');
    return problemas;
  }
  const fichas = proyecto.fichas;
  const duenos = new Set();
  for (const [id, etiqueta] of Object.entries(FICHAS_FIJAS)) {
    duenos.add(id);
    problemas.push(...problemasDeFicha(fichas[id], etiqueta, { tipo: id, origen: 'escrito' }));
  }
  if (Array.isArray(juego.personajes)) {
    for (const personaje of juego.personajes) {
      if (!esObjeto(personaje) || typeof personaje.id !== 'string') continue;
      duenos.add(personaje.id);
      problemas.push(...problemasDeFicha(fichas[personaje.id], `el personaje ${etiquetaDe(personaje)}`, { tipo: 'personaje', origen: 'escrito' }));
    }
  }
  if (Array.isArray(juego.elementos)) {
    const usados = new Set();
    for (const elemento of juego.elementos) {
      if (!esObjeto(elemento) || typeof elemento.id !== 'string') continue;
      duenos.add(elemento.id);
      const nombre = etiquetaDe(elemento);
      if (!TIPOS_ELEMENTO.includes(elemento.tipo)) problemas.push(`el elemento ${nombre} tiene un tipo desconocido`);
      if (!ORIGENES.includes(elemento.origen)) problemas.push(`el elemento ${nombre} tiene un origen desconocido`);
      if (typeof elemento.archivo !== 'string' || !NOMBRE_ARCHIVO.test(elemento.archivo)) {
        problemas.push(`el elemento ${nombre} tiene un nombre de archivo no permitido`);
      } else if (usados.has(elemento.archivo)) {
        problemas.push(`el archivo «${elemento.archivo}» está repetido`);
      } else {
        usados.add(elemento.archivo);
      }
      if (TIPOS_ELEMENTO.includes(elemento.tipo) && ORIGENES.includes(elemento.origen)) {
        problemas.push(...problemasDeFicha(fichas[elemento.id], `el elemento ${nombre}`, { tipo: elemento.tipo, origen: elemento.origen }));
      }
    }
  }
  for (const id of Object.keys(fichas)) {
    if (!duenos.has(id)) problemas.push(`la ficha «${id}» no corresponde a ningún elemento ni personaje`);
  }
  return problemas;
}
```

Pruebas en `tests/copias.test.js`: importar `agregarPersonaje` y `crearFicha`; en la prueba de códigos usar `crearFicha('fondo', { origen: 'creado' })` como ficha de reemplazo; agregar la prueba «validarEstructura rechaza fichas faltantes, cambiadas o incoherentes y escenas malformadas» con quince manipulaciones (historia, título o personaje sin ficha; tipo, tipoObra, licencia, autoría, origen, booleano, texto y condiciones cambiados; escena sin lista de líneas; decisión sin opciones; línea de tipo desconocido; ficha con id de escena) y la comprobación de que un proyecto sano no tiene problemas. Total: 11.

- [ ] **Step 3: `almacen.js`**

El error síncrono de IndexedDB ausente lleva `codigo: 'sin_indexeddb'`; el de `onblocked`, `codigo: 'bloqueado'`. `transaccionCompleta` envuelve la acción en `try`: ante un fallo síncrono (un valor que no se puede clonar) aborta la transacción y rechaza, para que lo ya encolado no se confirme a medias. Métodos nuevos:

```js
    /** Reemplaza proyecto y archivos en una sola transacción. El proyecto debe haber pasado por validarEstructura (importarCopia lo garantiza). */
    reemplazarTodo: async (proyecto, archivos) => {
      for (const [id, archivo] of archivos) {
        if (!esArrayBuffer(archivo?.datos)) throw new Error(`El archivo «${id}» no es { tipo, datos: ArrayBuffer }.`);
      }
      const db = await bd;
      await transaccionCompleta(db, ['proyecto', 'archivos'], 'readwrite', (transaccion) => {
        const proyectos = transaccion.objectStore('proyecto');
        proyectos.clear();
        proyectos.put(proyecto, CLAVE_PROYECTO);
        const binarios = transaccion.objectStore('archivos');
        binarios.clear();
        for (const [id, archivo] of archivos) binarios.put(archivo, id);
        return null;
      });
    },
    leerArchivos: async () => {
      const db = await bd;
      return new Promise((resolve, reject) => {
        const transaccion = db.transaction('archivos', 'readonly');
        const almacen = transaccion.objectStore('archivos');
        const claves = almacen.getAllKeys();
        const valores = almacen.getAll();
        transaccion.oncomplete = () => resolve(new Map(claves.result.map((clave, i) => [clave, valores.result[i]])));
        transaccion.onerror = () => reject(traducirError(transaccion.error));
        transaccion.onabort = () => reject(traducirError(transaccion.error));
      });
    },
```

Pruebas en `tests/almacen.test.js`: `reemplazarTodo` deja exactamente el proyecto y los archivos nuevos y `leerArchivos` los devuelve como Map; rechaza datos que no sean ArrayBuffer sin tocar lo guardado y el error de arranque lleva código; si algo falla a mitad del reemplazo (un proyecto con una función dentro), lo guardado queda intacto. Total: 11.

- [ ] **Step 4: prueba de ida y vuelta**

```js
// tests/integracion.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { crearProyecto, agregarEscena, agregarPersonaje, agregarElemento, agregarLinea } from '../plataforma/js/estado/modelo.js';
import { puedePublicar } from '../plataforma/js/estado/validacion.js';
import { evaluarTodo } from '../plataforma/js/juridico/semaforo.js';
import { exportarCopia, importarCopia } from '../plataforma/js/estado/copias.js';

function proyectoPublicable() {
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
  return { p, archivos, tema };
}

test('un proyecto publicable sobrevive a exportar e importar con los mismos semáforos', async () => {
  const { p, archivos } = proyectoPublicable();
  assert.equal(puedePublicar(p).ok, true);
  const blob = await exportarCopia(p, archivos, { JSZip });
  const { proyecto, archivos: importados } = await importarCopia(blob, { JSZip });
  assert.deepEqual(proyecto, p);
  assert.deepEqual([...importados.keys()].sort(), [...archivos.keys()].sort());
  assert.deepEqual(evaluarTodo(proyecto), evaluarTodo(p));
  assert.equal(puedePublicar(proyecto).ok, true);
});

test('cambiar el destino a venta tras importar pone en rojo la pieza no comercial', async () => {
  const { p, archivos, tema } = proyectoPublicable();
  const { proyecto } = await importarCopia(await exportarCopia(p, archivos, { JSZip }), { JSZip });
  proyecto.juego.destino = 'venta';
  const decision = puedePublicar(proyecto);
  assert.equal(decision.ok, false);
  assert.equal(evaluarTodo(proyecto).get(tema.id).color, 'rojo');
  assert.deepEqual(decision.resumen, { semaforo: 1, minimo: 0, bloqueantes: 0 });
});
```

- [ ] **Step 5: Correr todo y commit**

Run: `npm test` → 132 pruebas, `# fail 0`.

```bash
git add plataforma/js/juridico/ficha.js plataforma/js/juridico/semaforo.js plataforma/js/estado/modelo.js plataforma/js/estado/copias.js plataforma/js/estado/almacen.js tests/ficha.test.js tests/modelo.test.js tests/copias.test.js tests/almacen.test.js tests/integracion.test.js
git commit -m "Importación estricta de fichas y escenas, reemplazo atómico en el almacén, DESTINOS único y prueba de ida y vuelta" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Autorrevisión del plan contra el spec

**Cobertura.** Sección 6 (modelo): tareas 3 a 5 y 8. Sección 12.2 (campos de la ficha): tarea 2. Sección 12.3 (tipo de obra): tarea 2 y textos en la 12. Sección 12.4 (reglas): tareas 6 y 7; `evaluarTodo` en la 8. Sección 12.5 (destino recalcula): `evaluarTodo` toma el destino del proyecto; la interfaz que lo dispara llega en el plan 3. Sección 12.9 (contenido aparte del código): tarea 12. Sección 13 (persistencia y copias): tareas 10 y 11. Sección 15.3 (interfaces): los nombres de este plan son los del spec salvo tres ajustes deliberados: `evaluar` devuelve códigos y los textos los agrega `describir` (así la tabla de casos es estable); `ficha.js` queda puro (el formulario irá en `editor/panel-ficha.js`, plan 3); y la lectura pura del juego (`validar`, `escenasAlcanzables`, `cumpleMinimo`, `puedePublicar`) vive en `estado/validacion.js`, separada de los mutadores de `modelo.js`, con la regla de corte `indiceCorte` en `modelo.js` para que el reproductor la comparta. Secciones 7, 8, 9, 10, 11, 14, 16, 17, 18 (e2e): planes 2 a 6.

**Decisión de diseño que este plan fija y el spec no decía:** el avance natural entre escenas (una escena sin decisión ni fin sigue con la siguiente de la lista) y el aviso I05. Conviene añadirlo a la sección 8 del spec cuando se escriba el plan 2.

**Consistencia de nombres.** `crearFicha(tipo, { origen, biblioteca })`, `evaluar(ficha, contexto)`, `evaluarTodo(proyecto)`, `describir(resultado, ficha, contenido)`, `validar(juego)`, `cumpleMinimo(proyecto)`, `puedePublicar(proyecto)`, `abrirAlmacen({ nombre, indexedDB })`, `exportarCopia(proyecto, archivos, { JSZip })`, `importarCopia(entrada, { JSZip })`. Los archivos binarios son siempre `{ tipo, datos }`.
