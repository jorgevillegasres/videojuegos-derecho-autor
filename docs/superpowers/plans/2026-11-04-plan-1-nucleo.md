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
      modelo.js                    crear proyecto, escenas, personajes, elementos, líneas; validar; mínimo; puede publicar
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
- Modify: `plataforma/js/estado/modelo.js` (agregar al final)
- Test: `tests/modelo.test.js` (agregar al final)

Regla del motor que fija este diseño: **una escena termina en su primera línea de decisión o de fin**. Si se acaban las líneas sin ninguna de las dos, el juego sigue con la siguiente escena de la lista; si no hay siguiente, termina y muestra los créditos. Las líneas que quedan después de una decisión o un fin nunca se ven.

- [ ] **Step 1: Agregar las pruebas que fallan**

```js
// tests/modelo.test.js (agregar al final)
import { validar, escenasAlcanzables } from '../plataforma/js/estado/modelo.js';

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
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/modelo.test.js`
Expected: FAIL con `validar is not a function` o `does not provide an export named 'validar'`.

- [ ] **Step 3: Agregar `validar` y `escenasAlcanzables` al final de `modelo.js`**

```js
// plataforma/js/estado/modelo.js (agregar al final)

// ---- Validación (no jurídica) ----

/**
 * Escenas a las que se llega desde la inicial. Una escena termina en su primera
 * decisión o fin; sin ninguna de las dos, sigue la siguiente escena de la lista.
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
    const corte = porId.get(id).lineas.find((l) => l.tipo === 'decision' || l.tipo === 'fin');
    if (!corte) {
      const siguiente = orden[orden.indexOf(id) + 1];
      if (siguiente) pendientes.push(siguiente);
    } else if (corte.tipo === 'decision') {
      for (const opcion of corte.opciones) pendientes.push(opcion.escena);
    }
  }
  return visitadas;
}

/**
 * Avisos del editor. nivel: 'bloqueante' impide publicar; 'informativo' solo se muestra.
 * Devuelve [{ nivel, codigo, mensaje, escena?, linea?, personaje? }].
 */
export function validar(juego) {
  const avisos = [];
  const idsEscenas = new Set(juego.escenas.map((e) => e.id));
  const idsPersonajes = new Set(juego.personajes.map((p) => p.id));

  if (!idsEscenas.has(juego.escenaInicial)) {
    avisos.push({ nivel: 'bloqueante', codigo: 'B01', mensaje: 'El juego no tiene escena inicial.' });
  }

  for (const escena of juego.escenas) {
    if (escena.lineas.length === 0) {
      avisos.push({ nivel: 'informativo', codigo: 'I03', mensaje: `La escena «${escena.nombre}» no tiene líneas.`, escena: escena.id });
    }
    const indiceCorte = escena.lineas.findIndex((l) => l.tipo === 'decision' || l.tipo === 'fin');
    if (indiceCorte !== -1 && indiceCorte < escena.lineas.length - 1) {
      avisos.push({ nivel: 'informativo', codigo: 'I05', mensaje: `En «${escena.nombre}» hay líneas después de la decisión o el fin que nunca se verán.`, escena: escena.id, linea: indiceCorte + 1 });
    }
    escena.lineas.forEach((linea, i) => {
      if (linea.tipo === 'decision') {
        linea.opciones.forEach((opcion, j) => {
          if (!idsEscenas.has(opcion.escena)) {
            avisos.push({ nivel: 'bloqueante', codigo: 'B02', mensaje: `La opción ${j + 1} de la decisión en «${escena.nombre}» no lleva a ninguna escena.`, escena: escena.id, linea: i });
          }
        });
      }
      if (linea.tipo === 'dialogo' && !idsPersonajes.has(linea.personaje)) {
        avisos.push({ nivel: 'bloqueante', codigo: 'B03', mensaje: `Un diálogo en «${escena.nombre}» no tiene personaje.`, escena: escena.id, linea: i });
      }
    });
  }

  const alcanzables = escenasAlcanzables(juego);
  for (const escena of juego.escenas) {
    if (!alcanzables.has(escena.id)) {
      avisos.push({ nivel: 'informativo', codigo: 'I01', mensaje: `A la escena «${escena.nombre}» no se llega desde el inicio.`, escena: escena.id });
    }
  }
  for (const personaje of juego.personajes) {
    if (!personaje.retrato) {
      avisos.push({ nivel: 'informativo', codigo: 'I02', mensaje: `El personaje «${personaje.nombre}» no tiene retrato.`, personaje: personaje.id });
    }
  }
  const hayFin = juego.escenas.some((e) => alcanzables.has(e.id) && e.lineas.some((l) => l.tipo === 'fin'));
  if (!hayFin) {
    avisos.push({ nivel: 'informativo', codigo: 'I04', mensaje: 'Ninguna escena alcanzable termina con una línea de fin.' });
  }
  return avisos;
}
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/modelo.test.js`
Expected: `# pass 18`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/estado/modelo.js tests/modelo.test.js
git commit -m "Validación del juego: avisos bloqueantes e informativos y escenas alcanzables" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Juego mínimo publicable

**Files:**
- Modify: `plataforma/js/estado/modelo.js` (agregar al final)
- Test: `tests/modelo.test.js` (agregar al final)

- [ ] **Step 1: Agregar las pruebas que fallan**

```js
// tests/modelo.test.js (agregar al final)
import { cumpleMinimo, MINIMO } from '../plataforma/js/estado/modelo.js';

function juegoMinimoCompleto() {
  const { p, muelle, torre, amanecer } = juegoConTresEscenas();
  const ana = p.juego.personajes[0];
  const far = agregarPersonaje(p, { nombre: 'El farero' });
  ana.retrato = agregarElemento(p, { tipo: 'retrato', nombre: 'Ana', archivo: 'a.png', origen: 'creado' }).id;
  far.retrato = agregarElemento(p, { tipo: 'retrato', nombre: 'Farero', archivo: 'f.png', origen: 'creado' }).id;
  muelle.fondo = agregarElemento(p, { tipo: 'fondo', nombre: 'Muelle', archivo: 'm.png', origen: 'creado' }).id;
  const bib = { id: 'bib_m1', autor: 'Autora Ejemplo', licencia: 'CC-BY-4.0', creditoSugerido: 'crédito' };
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
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/modelo.test.js`
Expected: FAIL con `does not provide an export named 'cumpleMinimo'`.

- [ ] **Step 3: Agregar `MINIMO` y `cumpleMinimo` al final de `modelo.js`**

```js
// plataforma/js/estado/modelo.js (agregar al final)

// ---- Mínimo publicable (spec, sección 4) ----

export const MINIMO = { escenas: 3, personajesConRetrato: 2, decisiones: 1, fondos: 1, musica: 1, efectos: 1, ajenos: 1 };

export function cumpleMinimo(proyecto) {
  const { juego, fichas } = proyecto;
  const faltantes = [];
  const exige = (codigo, mensaje, actual, requerido) => {
    if (actual < requerido) faltantes.push({ codigo, mensaje, actual, requerido });
  };
  const cuenta = (tipo) => juego.elementos.filter((e) => e.tipo === tipo).length;

  exige('M_TITULO', 'El juego necesita un título.', juego.titulo.trim() ? 1 : 0, 1);
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

Run: `node --test tests/modelo.test.js`
Expected: `# pass 23`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/estado/modelo.js tests/modelo.test.js
git commit -m "Juego mínimo publicable" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Semáforo, reglas rojas

**Files:**
- Create: `plataforma/js/juridico/semaforo.js`
- Create: `tests/semaforo.casos.json`
- Test: `tests/semaforo.test.js`

La prueba lee una tabla de casos. Cada caso tiene `base` (con qué `crearFicha` se construye), `ficha` (campos que se sobreescriben), `contexto` y `esperado` (color, razones exactas en orden, notas exactas). El orden de las razones es siempre R01…R06 y luego A01…A10.

- [ ] **Step 1: Escribir el ejecutor de casos**

```js
// tests/semaforo.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crearFicha } from '../plataforma/js/juridico/ficha.js';
import { evaluar, CODIGOS_ROJO, CODIGOS_AMARILLO } from '../plataforma/js/juridico/semaforo.js';

const casos = JSON.parse(readFileSync(new URL('./semaforo.casos.json', import.meta.url), 'utf8'));

for (const caso of casos) {
  test(`semáforo: ${caso.nombre}`, () => {
    const ficha = { ...crearFicha(caso.base.tipo, { origen: caso.base.origen ?? 'escrito', biblioteca: caso.base.biblioteca ?? null }), ...caso.ficha };
    const resultado = evaluar(ficha, caso.contexto ?? { destino: 'gratis' });
    assert.equal(resultado.color, caso.esperado.color, `color de «${caso.nombre}»`);
    assert.deepEqual(resultado.razones, caso.esperado.razones, `razones de «${caso.nombre}»`);
    assert.deepEqual(resultado.notas, caso.esperado.notas ?? [], `notas de «${caso.nombre}»`);
  });
}

test('la tabla de casos cubre todas las reglas rojas y amarillas', () => {
  const vistos = new Set(casos.flatMap((c) => c.esperado.razones));
  for (const codigo of [...CODIGOS_ROJO, ...CODIGOS_AMARILLO]) assert.ok(vistos.has(codigo), `ningún caso dispara ${codigo}`);
});
```

- [ ] **Step 2: Escribir los casos de las reglas rojas y el caso verde base**

```json
[
  {
    "nombre": "C01 creado dentro, destino gratis: verde con nota del sello",
    "base": { "tipo": "fondo", "origen": "creado" },
    "ficha": {},
    "contexto": { "destino": "gratis" },
    "esperado": { "color": "verde", "razones": [], "notas": ["N_SELLO"] }
  },
  {
    "nombre": "C02 R01 pieza de biblioteca de autor desconocido",
    "base": { "tipo": "retrato", "origen": "biblioteca", "biblioteca": { "id": "bib_r9", "autor": "Desconocido", "licencia": "DESCONOCIDO", "creditoSugerido": "" } },
    "ficha": { "licenciaLeida": true },
    "contexto": { "destino": "personal" },
    "esperado": { "color": "rojo", "razones": ["R01"] }
  },
  {
    "nombre": "C03 R02 otra persona sin ningún respaldo",
    "base": { "tipo": "retrato", "origen": "subido" },
    "ficha": { "autoria": "otra_persona", "autorNombre": "Camila", "titular": "otra_persona" },
    "contexto": { "destino": "gratis" },
    "esperado": { "color": "rojo", "razones": ["R02"] }
  },
  {
    "nombre": "C08 biblioteca BY-NC, destino gratis, leída: verde",
    "base": { "tipo": "musica", "origen": "biblioteca", "biblioteca": { "id": "bib_m1", "autor": "Autora Ejemplo", "licencia": "CC-BY-NC-4.0", "creditoSugerido": "«Tema» de Autora Ejemplo, CC BY-NC 4.0" } },
    "ficha": { "licenciaLeida": true },
    "contexto": { "destino": "gratis" },
    "esperado": { "color": "verde", "razones": [] }
  },
  {
    "nombre": "C09 R03 biblioteca BY-NC con destino venta",
    "base": { "tipo": "musica", "origen": "biblioteca", "biblioteca": { "id": "bib_m1", "autor": "Autora Ejemplo", "licencia": "CC-BY-NC-4.0", "creditoSugerido": "«Tema» de Autora Ejemplo, CC BY-NC 4.0" } },
    "ficha": { "licenciaLeida": true },
    "contexto": { "destino": "venta" },
    "esperado": { "color": "rojo", "razones": ["R03"] }
  },
  {
    "nombre": "C12 R04 biblioteca BY-ND modificada",
    "base": { "tipo": "fondo", "origen": "biblioteca", "biblioteca": { "id": "bib_f3", "autor": "Autor Ejemplo", "licencia": "CC-BY-ND-4.0", "creditoSugerido": "«Faro» de Autor Ejemplo, CC BY-ND 4.0" } },
    "ficha": { "licenciaLeida": true, "modificado": true },
    "contexto": { "destino": "gratis" },
    "esperado": { "color": "rojo", "razones": ["R04"] }
  },
  {
    "nombre": "C13 biblioteca BY-ND sin modificar: verde",
    "base": { "tipo": "fondo", "origen": "biblioteca", "biblioteca": { "id": "bib_f3", "autor": "Autor Ejemplo", "licencia": "CC-BY-ND-4.0", "creditoSugerido": "«Faro» de Autor Ejemplo, CC BY-ND 4.0" } },
    "ficha": { "licenciaLeida": true },
    "contexto": { "destino": "gratis" },
    "esperado": { "color": "verde", "razones": [] }
  },
  {
    "nombre": "C16 biblioteca CURSO con destino personal: verde",
    "base": { "tipo": "efecto", "origen": "biblioteca", "biblioteca": { "id": "bib_e2", "autor": "La Casa", "licencia": "CURSO", "creditoSugerido": "«Campana» de La Casa, solo para el curso" } },
    "ficha": { "licenciaLeida": true },
    "contexto": { "destino": "personal" },
    "esperado": { "color": "verde", "razones": [] }
  },
  {
    "nombre": "C17 R05 biblioteca CURSO con destino gratis",
    "base": { "tipo": "efecto", "origen": "biblioteca", "biblioteca": { "id": "bib_e2", "autor": "La Casa", "licencia": "CURSO", "creditoSugerido": "«Campana» de La Casa, solo para el curso" } },
    "ficha": { "licenciaLeida": true },
    "contexto": { "destino": "gratis" },
    "esperado": { "color": "rojo", "razones": ["R05"] }
  },
  {
    "nombre": "C25 R06 historia basada en obra ajena sin autorización",
    "base": { "tipo": "historia" },
    "ficha": { "basadoEnObraAjena": true },
    "contexto": { "destino": "gratis" },
    "esperado": { "color": "rojo", "razones": ["R06"] }
  },
  {
    "nombre": "C26 historia basada en obra ajena con autorización: verde",
    "base": { "tipo": "historia" },
    "ficha": { "basadoEnObraAjena": true, "autorizacionDerivada": true },
    "contexto": { "destino": "gratis" },
    "esperado": { "color": "verde", "razones": [] }
  },
  {
    "nombre": "C27 personaje propio: verde",
    "base": { "tipo": "personaje" },
    "ficha": {},
    "contexto": { "destino": "venta" },
    "esperado": { "color": "verde", "razones": [] }
  },
  {
    "nombre": "C30 el título siempre es verde con nota de marca",
    "base": { "tipo": "titulo" },
    "ficha": { "autoria": "otra_persona", "respaldo": "ninguno" },
    "contexto": { "destino": "venta" },
    "esperado": { "color": "verde", "razones": [], "notas": ["N_TITULO"] }
  }
]
```

- [ ] **Step 3: Correr las pruebas para ver que fallan**

Run: `node --test tests/semaforo.test.js`
Expected: FAIL con `Cannot find module` para `semaforo.js`.

- [ ] **Step 4: Escribir `semaforo.js` con las reglas rojas**

```js
// plataforma/js/juridico/semaforo.js
// Reglas del semáforo (spec, sección 12.4). Función pura: entra una ficha y el
// contexto { destino }, sale { color, razones, notas } con códigos. Los textos
// se agregan aparte con describir() de textos.js.
import { condicionesDe } from './licencias.js';

export const CODIGOS_ROJO = ['R01', 'R02', 'R03', 'R04', 'R05', 'R06'];
export const CODIGOS_AMARILLO = ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11'];
export const CODIGOS_NOTAS = ['N_TITULO', 'N_IA', 'N_IA_APORTE', 'N_SELLO'];

const vacio = (texto) => !(texto ?? '').trim();

export function evaluar(ficha, contexto) {
  const destino = contexto?.destino ?? 'gratis';
  const notas = [];

  if (ficha.tipo === 'titulo') {
    return { color: 'verde', razones: [], notas: ['N_TITULO'] };
  }
  // Sin autor ni licencia no hay nada que corregir: solo reemplazar.
  if (ficha.licencia === 'DESCONOCIDO') {
    return { color: 'rojo', razones: ['R01'], notas };
  }

  const condiciones = condicionesDe(ficha);
  const tieneLicencia = ficha.respaldo === 'licencia' && Boolean(ficha.licencia);
  const esDerivable = ficha.tipo === 'historia' || ficha.tipo === 'personaje';
  const razones = [];

  // ---- Rojo ----
  if (ficha.autoria === 'otra_persona' && ficha.respaldo === 'ninguno') razones.push('R02');
  if (tieneLicencia && condiciones.includes('NC') && destino === 'venta') razones.push('R03');
  if (tieneLicencia && condiciones.includes('ND') && ficha.modificado) razones.push('R04');
  if (ficha.licencia === 'CURSO' && destino !== 'personal') razones.push('R05');
  if (esDerivable && ficha.basadoEnObraAjena && !ficha.autorizacionDerivada) razones.push('R06');

  // ---- Amarillo ---- (Task 7)

  // ---- Notas ----
  if (ficha.origen === 'creado' && ficha.prueba === 'sello') notas.push('N_SELLO');

  const color = razones.some((c) => CODIGOS_ROJO.includes(c)) ? 'rojo'
    : razones.length ? 'amarillo'
    : 'verde';
  return { color, razones, notas };
}
```

- [ ] **Step 5: Correr las pruebas**

Run: `node --test tests/semaforo.test.js`
Expected: los 13 casos pasan; la prueba de cobertura FALLA con `ningún caso dispara A01` (se completa en la tarea 7). Es el único fallo esperado.

- [ ] **Step 6: Commit**

```bash
git add plataforma/js/juridico/semaforo.js tests/semaforo.test.js tests/semaforo.casos.json
git commit -m "Semáforo: reglas rojas y tabla de casos" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Semáforo, reglas amarillas y notas

**Files:**
- Modify: `plataforma/js/juridico/semaforo.js`
- Modify: `tests/semaforo.casos.json` (agregar casos)

- [ ] **Step 1: Agregar los casos amarillos a `semaforo.casos.json`**

Insertar estos objetos dentro del arreglo, antes del corchete final (con la coma que corresponda):

```json
  {
    "nombre": "C04 otra persona con cesión y crédito: verde",
    "base": { "tipo": "retrato", "origen": "subido" },
    "ficha": { "autoria": "otra_persona", "autorNombre": "Camila", "titular": "yo", "respaldo": "cesion", "credito": "Retrato de Ana: Camila" },
    "contexto": { "destino": "venta" },
    "esperado": { "color": "verde", "razones": [] }
  },
  {
    "nombre": "C05 A02 otra persona con cesión y sin crédito",
    "base": { "tipo": "retrato", "origen": "subido" },
    "ficha": { "autoria": "otra_persona", "autorNombre": "Camila", "titular": "yo", "respaldo": "cesion" },
    "contexto": { "destino": "gratis" },
    "esperado": { "color": "amarillo", "razones": ["A02"] }
  },
  {
    "nombre": "C06 A09 cesión pero el titular sigue siendo la otra persona",
    "base": { "tipo": "retrato", "origen": "subido" },
    "ficha": { "autoria": "otra_persona", "autorNombre": "Camila", "titular": "otra_persona", "respaldo": "cesion", "credito": "Retrato: Camila" },
    "contexto": { "destino": "gratis" },
    "esperado": { "color": "amarillo", "razones": ["A09"] }
  },
  {
    "nombre": "C07 A08 otra persona sin nombre",
    "base": { "tipo": "retrato", "origen": "subido" },
    "ficha": { "autoria": "otra_persona", "autorNombre": "", "titular": "yo", "respaldo": "cesion", "credito": "Retrato: una amiga" },
    "contexto": { "destino": "gratis" },
    "esperado": { "color": "amarillo", "razones": ["A08"] }
  },
  {
    "nombre": "C10 A07 biblioteca sin leer la licencia",
    "base": { "tipo": "musica", "origen": "biblioteca", "biblioteca": { "id": "bib_m1", "autor": "Autora Ejemplo", "licencia": "CC-BY-NC-4.0", "creditoSugerido": "«Tema» de Autora Ejemplo, CC BY-NC 4.0" } },
    "ficha": {},
    "contexto": { "destino": "gratis" },
    "esperado": { "color": "amarillo", "razones": ["A07"] }
  },
  {
    "nombre": "C11 A01 y A02 biblioteca BY con el crédito borrado",
    "base": { "tipo": "fondo", "origen": "biblioteca", "biblioteca": { "id": "bib_f1", "autor": "Autora Ejemplo", "licencia": "CC-BY-4.0", "creditoSugerido": "«Muelle» de Autora Ejemplo, CC BY 4.0" } },
    "ficha": { "licenciaLeida": true, "credito": "" },
    "contexto": { "destino": "gratis" },
    "esperado": { "color": "amarillo", "razones": ["A01", "A02"] }
  },
  {
    "nombre": "C14 A03 biblioteca BY-SA sin aceptar compartir igual",
    "base": { "tipo": "fondo", "origen": "biblioteca", "biblioteca": { "id": "bib_f2", "autor": "Autor Ejemplo", "licencia": "CC-BY-SA-4.0", "creditoSugerido": "«Torre» de Autor Ejemplo, CC BY-SA 4.0" } },
    "ficha": { "licenciaLeida": true },
    "contexto": { "destino": "gratis" },
    "esperado": { "color": "amarillo", "razones": ["A03"] }
  },
  {
    "nombre": "C15 biblioteca BY-SA aceptando compartir igual: verde",
    "base": { "tipo": "fondo", "origen": "biblioteca", "biblioteca": { "id": "bib_f2", "autor": "Autor Ejemplo", "licencia": "CC-BY-SA-4.0", "creditoSugerido": "«Torre» de Autor Ejemplo, CC BY-SA 4.0" } },
    "ficha": { "licenciaLeida": true, "aceptaCompartirIgual": true },
    "contexto": { "destino": "venta" },
    "esperado": { "color": "verde", "razones": [] }
  },
  {
    "nombre": "C18 biblioteca CC0 leída: verde (el crédito sugerido viene precargado)",
    "base": { "tipo": "efecto", "origen": "biblioteca", "biblioteca": { "id": "bib_e1", "autor": "Autor Ejemplo", "licencia": "CC0", "creditoSugerido": "«Olas» de Autor Ejemplo, CC0" } },
    "ficha": { "licenciaLeida": true },
    "contexto": { "destino": "venta" },
    "esperado": { "color": "verde", "razones": [] }
  },
  {
    "nombre": "C19 A04 generado con IA sin reconocer",
    "base": { "tipo": "fondo", "origen": "subido" },
    "ficha": { "autoria": "ia", "herramientaIA": "Generador X" },
    "contexto": { "destino": "gratis" },
    "esperado": { "color": "amarillo", "razones": ["A04"] }
  },
  {
    "nombre": "C20 generado con IA reconocido y declarado: verde con nota",
    "base": { "tipo": "fondo", "origen": "subido" },
    "ficha": { "autoria": "ia", "herramientaIA": "Generador X", "reconoceSinDerechos": true, "credito": "Generado con IA (Generador X)" },
    "contexto": { "destino": "venta" },
    "esperado": { "color": "verde", "razones": [], "notas": ["N_IA"] }
  },
  {
    "nombre": "C21 A05 IA con aporte sin describir",
    "base": { "tipo": "retrato", "origen": "subido" },
    "ficha": { "autoria": "ia_con_aporte", "herramientaIA": "Generador X" },
    "contexto": { "destino": "gratis" },
    "esperado": { "color": "amarillo", "razones": ["A05"] }
  },
  {
    "nombre": "C22 IA con aporte descrito: verde con nota",
    "base": { "tipo": "retrato", "origen": "subido" },
    "ficha": { "autoria": "ia_con_aporte", "herramientaIA": "Generador X", "aporteHumano": "Redibujé la cara y cambié la paleta" },
    "contexto": { "destino": "gratis" },
    "esperado": { "color": "verde", "razones": [], "notas": ["N_IA_APORTE"] }
  },
  {
    "nombre": "C23 A06 subido por mí sin prueba",
    "base": { "tipo": "musica", "origen": "subido" },
    "ficha": {},
    "contexto": { "destino": "gratis" },
    "esperado": { "color": "amarillo", "razones": ["A06"] }
  },
  {
    "nombre": "C24 subido por mí con el archivo original: verde",
    "base": { "tipo": "musica", "origen": "subido" },
    "ficha": { "prueba": "original" },
    "contexto": { "destino": "venta" },
    "esperado": { "color": "verde", "razones": [] }
  },
  {
    "nombre": "C28 A10 autorización informal con destino venta",
    "base": { "tipo": "voz", "origen": "subido" },
    "ficha": { "autoria": "otra_persona", "autorNombre": "Luis", "titular": "otra_persona", "respaldo": "autorizacion", "credito": "Voz del farero: Luis" },
    "contexto": { "destino": "venta" },
    "esperado": { "color": "amarillo", "razones": ["A10"] }
  },
  {
    "nombre": "C29 autorización informal con destino gratis: verde",
    "base": { "tipo": "voz", "origen": "subido" },
    "ficha": { "autoria": "otra_persona", "autorNombre": "Luis", "titular": "otra_persona", "respaldo": "autorizacion", "credito": "Voz del farero: Luis" },
    "contexto": { "destino": "gratis" },
    "esperado": { "color": "verde", "razones": [] }
  },
  {
    "nombre": "C31 subido con otra licencia que exige atribución y sin crédito",
    "base": { "tipo": "fondo", "origen": "subido" },
    "ficha": { "autoria": "otra_persona", "autorNombre": "Ana", "titular": "otra_persona", "respaldo": "licencia", "licencia": "OTRA", "licenciaTexto": "Uso libre con crédito", "condicionesOtra": ["BY"], "licenciaLeida": true },
    "contexto": { "destino": "gratis" },
    "esperado": { "color": "amarillo", "razones": ["A01", "A02"] }
  },
  {
    "nombre": "C32 A11 otra licencia sin describir",
    "base": { "tipo": "efecto", "origen": "subido" },
    "ficha": { "autoria": "otra_persona", "autorNombre": "Ana", "titular": "otra_persona", "respaldo": "licencia", "licencia": "OTRA", "licenciaLeida": true, "credito": "«Viento» de Ana" },
    "contexto": { "destino": "gratis" },
    "esperado": { "color": "amarillo", "razones": ["A11"] }
  },
  {
    "nombre": "C33 otra licencia descrita sin condiciones marcadas: verde",
    "base": { "tipo": "efecto", "origen": "subido" },
    "ficha": { "autoria": "otra_persona", "autorNombre": "Ana", "titular": "otra_persona", "respaldo": "licencia", "licencia": "OTRA", "licenciaTexto": "Ana me autorizó por correo a usarlo en cualquier juego mío, sin condiciones", "licenciaLeida": true, "credito": "«Viento» de Ana" },
    "contexto": { "destino": "venta" },
    "esperado": { "color": "verde", "razones": [] }
  }
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/semaforo.test.js`
Expected: FAIL en los casos amarillos (por ejemplo `razones de «C05 …»` esperaba `['A02']` y obtuvo `[]`).

- [ ] **Step 3: Completar `semaforo.js` con las reglas amarillas y las notas de IA**

Reemplazar la línea `// ---- Amarillo ---- (Task 7)` por:

```js
  // ---- Amarillo ----
  if (tieneLicencia && condiciones.includes('BY') && vacio(ficha.credito)) razones.push('A01');
  if (ficha.autoria === 'otra_persona' && ficha.respaldo !== 'ninguno' && vacio(ficha.credito)) razones.push('A02');
  if (tieneLicencia && condiciones.includes('SA') && !ficha.aceptaCompartirIgual) razones.push('A03');
  if (ficha.autoria === 'ia' && !ficha.reconoceSinDerechos) razones.push('A04');
  if (ficha.autoria === 'ia_con_aporte' && vacio(ficha.aporteHumano)) razones.push('A05');
  if (ficha.origen === 'subido' && ficha.autoria === 'yo' && ficha.prueba === 'ninguna') razones.push('A06');
  if (tieneLicencia && !ficha.licenciaLeida) razones.push('A07');
  if (ficha.autoria === 'otra_persona' && vacio(ficha.autorNombre)) razones.push('A08');
  if (ficha.respaldo === 'cesion' && ficha.titular === 'otra_persona') razones.push('A09');
  if (ficha.respaldo === 'autorizacion' && destino === 'venta') razones.push('A10');
  if (tieneLicencia && ficha.licencia === 'OTRA' && vacio(ficha.licenciaTexto)) razones.push('A11');
```

Y reemplazar el bloque `// ---- Notas ----` por:

```js
  // ---- Notas (solo informan; no cambian el color) ----
  if (ficha.origen === 'creado' && ficha.prueba === 'sello') notas.push('N_SELLO');
  if (ficha.autoria === 'ia' && ficha.reconoceSinDerechos) notas.push('N_IA');
  if (ficha.autoria === 'ia_con_aporte' && !vacio(ficha.aporteHumano)) notas.push('N_IA_APORTE');
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/semaforo.test.js`
Expected: `# pass 34`, `# fail 0` (33 casos más la prueba de cobertura).

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/juridico/semaforo.js tests/semaforo.casos.json
git commit -m "Semáforo: reglas amarillas y notas informativas" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Evaluar todo el proyecto y decidir si se puede publicar

**Files:**
- Modify: `plataforma/js/juridico/semaforo.js` (agregar `evaluarTodo`)
- Modify: `plataforma/js/estado/modelo.js` (agregar `nombreDe` y `puedePublicar`)
- Test: `tests/modelo.test.js` (agregar al final)

- [ ] **Step 1: Agregar las pruebas que fallan**

```js
// tests/modelo.test.js (agregar al final)
import { puedePublicar, nombreDe } from '../plataforma/js/estado/modelo.js';
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
  let decision = puedePublicar(p, evaluarTodo(p), validar(p.juego));
  assert.equal(decision.ok, false);
  assert.ok(decision.motivos.some((m) => m.codigo === 'P_SEMAFORO' && /Tema/.test(m.mensaje)));

  dejarTodoEnVerde(p);
  decision = puedePublicar(p, evaluarTodo(p), validar(p.juego));
  assert.deepEqual(decision, { ok: true, motivos: [] });

  muelle.lineas[1].opciones[0].escena = null;
  decision = puedePublicar(p, evaluarTodo(p), validar(p.juego));
  assert.ok(decision.motivos.some((m) => m.codigo === 'P_BLOQUEANTE'));

  p.juego.titulo = '';
  decision = puedePublicar(p, evaluarTodo(p), validar(p.juego));
  assert.ok(decision.motivos.some((m) => m.codigo === 'P_MINIMO' && m.faltante === 'M_TITULO'));
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/modelo.test.js`
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

- [ ] **Step 4: Agregar `nombreDe` y `puedePublicar` al final de `modelo.js`**

```js
// plataforma/js/estado/modelo.js (agregar al final)

// ---- Publicación ----

export function nombreDe(proyecto, idFicha) {
  if (idFicha === 'titulo') return 'Título del juego';
  if (idFicha === 'historia') return 'Historia';
  const personaje = proyecto.juego.personajes.find((p) => p.id === idFicha);
  if (personaje) return personaje.nombre;
  const elemento = proyecto.juego.elementos.find((e) => e.id === idFicha);
  if (elemento) return elemento.nombre;
  return idFicha;
}

/**
 * Decide si se puede publicar. semaforos: Map de evaluarTodo; avisos: lista de validar.
 * Devuelve { ok, motivos: [{ codigo, mensaje, ... }] }.
 */
export function puedePublicar(proyecto, semaforos, avisos) {
  const motivos = [];
  for (const [id, resultado] of semaforos) {
    if (resultado.color !== 'verde') {
      motivos.push({ codigo: 'P_SEMAFORO', id, color: resultado.color, mensaje: `«${nombreDe(proyecto, id)}» está en ${resultado.color}.` });
    }
  }
  for (const faltante of cumpleMinimo(proyecto).faltantes) {
    motivos.push({ codigo: 'P_MINIMO', faltante: faltante.codigo, mensaje: `${faltante.mensaje}: ${faltante.actual} de ${faltante.requerido}.` });
  }
  for (const aviso of avisos) {
    if (aviso.nivel === 'bloqueante') motivos.push({ codigo: 'P_BLOQUEANTE', aviso: aviso.codigo, mensaje: aviso.mensaje });
  }
  return { ok: motivos.length === 0, motivos };
}
```

- [ ] **Step 5: Correr todas las pruebas**

Run: `npm test`
Expected: `# fail 0`. Total de pruebas: 10 (ficha) + 26 (modelo) + 34 (semáforo) = 70.

- [ ] **Step 6: Commit**

```bash
git add plataforma/js/juridico/semaforo.js plataforma/js/estado/modelo.js tests/modelo.test.js
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

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/almacen.test.js
import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirAlmacen } from '../plataforma/js/estado/almacen.js';
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

export function abrirAlmacen({ nombre = NOMBRE_BD_DEFECTO, indexedDB = globalThis.indexedDB } = {}) {
  if (!indexedDB) throw new Error('Este navegador no permite guardar el proyecto (IndexedDB no disponible).');

  const bd = new Promise((resolve, reject) => {
    const solicitud = indexedDB.open(nombre, VERSION_BD);
    solicitud.onupgradeneeded = () => {
      const db = solicitud.result;
      if (!db.objectStoreNames.contains('proyecto')) db.createObjectStore('proyecto');
      if (!db.objectStoreNames.contains('archivos')) db.createObjectStore('archivos');
    };
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => reject(solicitud.error);
  });

  async function correr(almacen, modo, accion) {
    const db = await bd;
    return new Promise((resolve, reject) => {
      const transaccion = db.transaction(almacen, modo);
      const solicitud = accion(transaccion.objectStore(almacen));
      transaccion.oncomplete = () => resolve(solicitud.result);
      transaccion.onerror = () => reject(transaccion.error);
      transaccion.onabort = () => reject(transaccion.error ?? new Error('Transacción cancelada'));
    });
  }

  return {
    cargar: () => correr('proyecto', 'readonly', (s) => s.get(CLAVE_PROYECTO)).then((v) => v ?? null),
    guardar: (proyecto) => correr('proyecto', 'readwrite', (s) => s.put(proyecto, CLAVE_PROYECTO)),
    guardarArchivo: (id, archivo) => correr('archivos', 'readwrite', (s) => s.put(archivo, id)),
    leerArchivo: (id) => correr('archivos', 'readonly', (s) => s.get(id)).then((v) => v ?? null),
    borrarArchivo: (id) => correr('archivos', 'readwrite', (s) => s.delete(id)),
    listarArchivos: () => correr('archivos', 'readonly', (s) => s.getAllKeys()),
    borrarTodo: async () => {
      await correr('proyecto', 'readwrite', (s) => s.clear());
      await correr('archivos', 'readwrite', (s) => s.clear());
    },
    cerrar: async () => (await bd).close(),
  };
}
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/almacen.test.js`
Expected: `# pass 5`, `# fail 0`.

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

El formato de copia es el mismo que llevará el paquete de entrega (plan 6): `proyecto.json` más `archivos/<nombre de archivo del elemento>`.

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
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/copias.test.js`
Expected: FAIL con `Cannot find module` para `copias.js`.

- [ ] **Step 3: Escribir `copias.js`**

```js
// plataforma/js/estado/copias.js
// Copia completa del proyecto en un archivo comprimido: proyecto.json + archivos/.
// JSZip se recibe como parámetro: en el navegador es window.JSZip (vendor/jszip.min.js),
// en las pruebas es el paquete de npm.
import { mimePorExtension } from './archivos.js';
import { VERSION_PROYECTO } from './modelo.js';

/**
 * @param {object} proyecto
 * @param {Map<string, {tipo: string, datos: ArrayBuffer}>} archivos por id de elemento
 * @returns {Promise<Blob>}
 */
export async function exportarCopia(proyecto, archivos, { JSZip }) {
  const zip = new JSZip();
  zip.file('proyecto.json', JSON.stringify(proyecto, null, 2));
  for (const elemento of proyecto.juego.elementos) {
    const archivo = archivos.get(elemento.id);
    if (!archivo) throw new Error(`Falta el archivo del elemento «${elemento.nombre}».`);
    zip.file(`archivos/${elemento.archivo}`, archivo.datos);
  }
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
    throw new Error('El archivo no es una copia válida (no se pudo abrir).');
  }
  const entradaProyecto = zip.file('proyecto.json');
  if (!entradaProyecto) throw new Error('El archivo no contiene proyecto.json.');
  let proyecto;
  try {
    proyecto = JSON.parse(await entradaProyecto.async('string'));
  } catch {
    throw new Error('proyecto.json está dañado.');
  }
  const problemas = validarEstructura(proyecto);
  if (problemas.length) throw new Error(`El proyecto no tiene la forma esperada: ${problemas.join('; ')}.`);

  const archivos = new Map();
  for (const elemento of proyecto.juego.elementos) {
    const entradaArchivo = zip.file(`archivos/${elemento.archivo}`);
    if (!entradaArchivo) throw new Error(`Falta el archivo del elemento «${elemento.nombre}» (archivos/${elemento.archivo}).`);
    archivos.set(elemento.id, { tipo: mimePorExtension(elemento.archivo), datos: await entradaArchivo.async('arraybuffer') });
  }
  return { proyecto, archivos };
}

/** Comprueba la forma mínima de un proyecto. Devuelve una lista de problemas (vacía si está bien). */
export function validarEstructura(proyecto) {
  if (!proyecto || typeof proyecto !== 'object') return ['no es un objeto'];
  const problemas = [];
  if (proyecto.version !== VERSION_PROYECTO) problemas.push(`versión ${proyecto.version} no soportada`);
  const juego = proyecto.juego;
  if (!juego || typeof juego !== 'object') {
    problemas.push('falta el juego');
    return problemas;
  }
  if (!Array.isArray(juego.escenas)) problemas.push('faltan las escenas');
  if (!Array.isArray(juego.personajes)) problemas.push('faltan los personajes');
  if (!Array.isArray(juego.elementos)) problemas.push('faltan los elementos');
  if (!proyecto.fichas || typeof proyecto.fichas !== 'object') {
    problemas.push('faltan las fichas');
  } else if (Array.isArray(juego.elementos)) {
    for (const elemento of juego.elementos) {
      if (!proyecto.fichas[elemento.id]) problemas.push(`el elemento «${elemento.nombre}» no tiene ficha`);
    }
  }
  return problemas;
}
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/copias.test.js`
Expected: `# pass 7`, `# fail 0`.

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
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/contenido.test.js`
Expected: FAIL con `ENOENT` para `juridico.json`.

- [ ] **Step 3: Escribir `juridico.json`**

```json
{
  "nombre": "Mi primer videojuego",
  "aviso": "Material educativo. No constituye asesoría legal personalizada. Cada contrato debe revisarse con un abogado.",
  "fuentePrincipal": "Memo de verificación legal (Bonasera, 4 de noviembre de 2026), en 07-memo-verificacion-bonasera.md. Toda cita de norma sale de ahí.",

  "campos": {
    "tipoObra": {
      "breve": "La ley protege la forma concreta en que expresas una idea, no la idea. Cada pieza de tu juego es una obra distinta, con su propio autor y su propio titular.",
      "completo": "Las ideas no se protegen; la expresión sí (Ley 23 de 1982, art. 6; Decisión 351 de 1993, art. 7). Un videojuego contiene varias obras y en Colombia se registra por partes: el código como software, la música como obra musical, las ilustraciones como obras artísticas, el guion como obra literaria y los videos como obras audiovisuales (guía oficial de la DNDA). Por eso cada elemento tiene su ficha.",
      "fuente": "Memo, sección 2: Ley 23 de 1982, art. 6; Decisión 351, art. 7; DNDA, preguntas frecuentes sobre registro de videojuegos.",
      "verificacion": "verificada"
    },
    "autoria": {
      "breve": "Autor es quien crea la obra, y nace con derechos sin registrar nada. Solo las personas son autoras: una herramienta de IA no lo es.",
      "completo": "El derecho nace con la creación, sin ninguna formalidad (Ley 23 de 1982, art. 9; Decisión 351, art. 52). La ley presume autor a quien aparece como tal en la obra divulgada, salvo prueba en contrario (Ley 23, art. 10, parágrafo, texto de la Ley 1915 de 2018). La DNDA no registra resultados generados por inteligencia artificial sin aporte humano: solo reconoce como autoras a las personas físicas (pronunciamientos y resoluciones de 2023 a 2025).",
      "fuente": "Memo, sección 2: Ley 23 de 1982, arts. 9 y 10; Decisión 351, arts. 8 y 52; DNDA, pronunciamientos sobre IA.",
      "verificacion": "verificada"
    },
    "titular": {
      "breve": "El autor siempre es quien creó. El titular de los derechos patrimoniales puede ser otra persona, si hubo una cesión escrita.",
      "completo": "Los derechos patrimoniales (reproducir, comunicar al público, transformar, distribuir) se pueden ceder o licenciar. Los morales no: son perpetuos, inalienables e irrenunciables (Ley 23 de 1982, art. 30; Decisión 351, art. 11), y la transmisión de los patrimoniales no los comprende (Ley 23, art. 182, parágrafo). Si alguien te cedió los derechos sobre su obra, tú eres el titular patrimonial y ella sigue siendo la autora.",
      "fuente": "Memo, sección 2: Ley 23 de 1982, arts. 30 y 182; Decisión 351, art. 11.",
      "verificacion": "verificada"
    },
    "respaldo": {
      "breve": "Lo que no está escrito, se pelea. Una cesión o una licencia de derechos patrimoniales debe constar por escrito.",
      "completo": "Desde 2019 los contratos sobre derechos patrimoniales deben constar por escrito como condición de validez; si no dicen plazo ni territorio, se entienden por cinco años y para el país; y para oponerlos a terceros deben inscribirse en el registro (Ley 1955 de 2019, art. 181, que modificó el art. 183 de la Ley 23 de 1982; Ley 44 de 1993, art. 6). Una licencia abierta, como Creative Commons, es un permiso de uso escrito con condiciones: léelas.",
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
      "fuente": "Memo, secciones 2, 3 y 6: Decisión 351, art. 53; Ley 2294 de 2023, art. 169; DNDA, guía de registro. Tarifa vigente: laguna 8 del memo.",
      "verificacion": "pendiente"
    },
    "destino": {
      "breve": "Las licencias delimitan usos. Lo que sirve para un juego gratis puede no servir para uno que se vende.",
      "completo": "Un contrato o una licencia solo autoriza los usos que dice, en el territorio y por el plazo que dice (Ley 1955 de 2019, art. 181). Una licencia no comercial no cubre un juego que se vende; una licencia limitada a este curso no cubre publicar fuera de él. Si cambias el destino del juego, la plataforma revisa cada elemento otra vez.",
      "fuente": "Memo, sección 5: Ley 1955 de 2019, art. 181.",
      "verificacion": "verificada"
    }
  },

  "tiposObra": {
    "literaria": {
      "breve": "Historia, narración y diálogos son obra literaria. La lógica de las decisiones también está escrita en texto.",
      "completo": "La ley protege toda creación original expresada en forma literaria, y protege los programas de ordenador en los mismos términos que las obras literarias (Decisión 351, arts. 4 y 23). Tu guion con decisiones no es software, pero muestra por qué el código de un juego también es obra: es texto creativo. La DNDA registra el guion de un videojuego como obra literaria.",
      "fuente": "Memo, sección 2: Decisión 351, arts. 4 y 23; Ley 23 de 1982, art. 2; DNDA, registro por partes.",
      "verificacion": "verificada"
    },
    "artistica": {
      "breve": "Fondos y retratos son obras artísticas: dibujo, pintura o ilustración, con o sin píxeles.",
      "completo": "La DNDA registra las ilustraciones y animaciones de un videojuego como obras artísticas. La protección no depende de la técnica ni de la calidad: depende de que sea tu expresión original y no una copia.",
      "fuente": "Memo, sección 2: DNDA, preguntas frecuentes sobre registro de videojuegos; Ley 23 de 1982, art. 2.",
      "verificacion": "verificada"
    },
    "musical_fonograma": {
      "breve": "Una pista tiene dos capas: la composición (obra musical) y la grabación (fonograma). Pueden tener titulares distintos.",
      "completo": "La DNDA registra la música de un videojuego como obra musical. La grabación, además, tiene derechos propios de quien la produce. Esta ficha trata el archivo como una sola pieza: si compusiste y grabaste tú, las dos capas son tuyas; si la grabación es de otra persona, necesitas su autorización aunque la composición sea tuya.",
      "fuente": "Memo, sección 2: DNDA, registro por partes (obra musical). Derechos del productor de fonogramas: por verificar en la Ley 23 de 1982 y la Decisión 351 (spec, sección 19, punto 1).",
      "verificacion": "pendiente"
    },
    "fonograma": {
      "breve": "Un efecto de sonido es, al menos, una grabación (fonograma). Si tiene creación propia, también es obra.",
      "completo": "Grabar el mar con el celular produce un fonograma con derechos de quien lo grabó. Diseñar un sonido desde cero puede ser, además, una obra. En los dos casos, si no lo hiciste tú necesitas permiso de quien lo hizo.",
      "fuente": "Derechos del productor de fonogramas: por verificar en la Ley 23 de 1982 y la Decisión 351 (spec, sección 19, punto 1).",
      "verificacion": "pendiente"
    },
    "interpretacion": {
      "breve": "Una voz grabada trae los derechos de quien interpreta, además de los de la grabación. Si la voz es de otra persona, necesitas su autorización escrita.",
      "completo": "Quien presta su voz a un personaje es intérprete y tiene derechos sobre esa interpretación, distintos de los del guion y de los de la grabación. Si grabaste tu propia voz, todo es tuyo. Si grabó un amigo, pídele autorización por escrito y dale crédito.",
      "fuente": "Derechos de los intérpretes: por verificar en la Ley 23 de 1982 y la Decisión 351 (spec, sección 19, punto 1).",
      "verificacion": "pendiente"
    },
    "titulo": {
      "breve": "El título no es una obra en sí mismo. Si quieres exclusividad sobre el nombre, el camino es la marca, ante la Superintendencia de Industria y Comercio.",
      "completo": "El derecho de autor protege la obra, no su nombre aislado. Para que nadie más use el nombre de tu juego en el mercado hay que registrarlo como marca, que es otro trámite y otra oficina. Esta ficha no bloquea nada; solo te lo recuerda.",
      "fuente": "Protección del título y relación con la marca: por verificar (spec, sección 19, punto 3).",
      "verificacion": "pendiente"
    }
  },

  "reglas": {
    "R01": {
      "breve": "No se sabe quién hizo esta pieza ni con qué permiso. Sin autor ni licencia, se presume que todos los derechos están reservados.",
      "completo": "Que algo esté en internet no significa que sea libre. La protección nace con la creación, sin registro ni aviso (Ley 23 de 1982, art. 9; Decisión 351, art. 52). Sin saber quién es el autor no hay a quién pedirle permiso, y sin permiso no hay forma de usar la pieza. La única salida es reemplazarla.",
      "fuente": "Memo, sección 2: Ley 23 de 1982, art. 9; Decisión 351, art. 52.",
      "accion": "Reemplaza esta pieza por una con autor y licencia conocidos.",
      "verificacion": "verificada"
    },
    "R02": {
      "breve": "Otra persona hizo esto y no tienes nada escrito que te autorice a usarlo.",
      "completo": "Una cesión o una licencia de derechos patrimoniales debe constar por escrito (Ley 1955 de 2019, art. 181). Un «me dijo que sí» no basta para publicar. Pídele una cesión o una licencia por escrito, con usos, territorio, plazo y contraprestación.",
      "fuente": "Memo, sección 5: Ley 1955 de 2019, art. 181.",
      "accion": "Pide a {autor} una cesión o una licencia por escrito.",
      "verificacion": "verificada"
    },
    "R03": {
      "breve": "Esta licencia prohíbe el uso comercial y tu juego se va a vender.",
      "completo": "Las licencias Creative Commons con la condición NC (no comercial) permiten usar la obra solo sin fines comerciales. Vender el juego, o monetizarlo, es un uso comercial. Los contratos autorizan solo los usos pactados (Ley 1955 de 2019, art. 181). Cambia el destino del juego o reemplaza la pieza.",
      "fuente": "Texto de las licencias Creative Commons (creativecommons.org/licenses). Memo, sección 5: Ley 1955 de 2019, art. 181.",
      "accion": "Cambia el destino del juego o reemplaza esta pieza.",
      "verificacion": "verificada"
    },
    "R04": {
      "breve": "Esta licencia no permite obras derivadas y marcaste que la modificaste.",
      "completo": "La condición ND (sin derivadas) permite copiar y distribuir la obra tal cual, pero no transformarla. Usa el original sin cambios o reemplázala por una pieza que sí permita modificaciones.",
      "fuente": "Texto de las licencias Creative Commons ND (creativecommons.org/licenses).",
      "accion": "Vuelve a la versión original de la pieza o reemplázala.",
      "verificacion": "verificada"
    },
    "R05": {
      "breve": "Esta pieza solo se puede usar dentro de la plataforma y del curso. Tu juego va a salir de ahí.",
      "completo": "Una licencia limitada autoriza únicamente los usos que nombra. Esta cubre el ejercicio del curso; no cubre publicar el juego, ni gratis ni vendido. Es el mismo principio del art. 181 de la Ley 1955 de 2019: los usos no pactados no están autorizados.",
      "fuente": "Memo, sección 5: Ley 1955 de 2019, art. 181.",
      "accion": "Reemplaza la pieza o cambia el destino del juego a uso personal.",
      "verificacion": "verificada"
    },
    "R06": {
      "breve": "Tu historia o tu personaje se basa en una obra ajena y no tienes autorización.",
      "completo": "Transformar una obra (adaptarla, continuarla, hacer una secuela) es un derecho patrimonial de su titular; la obra derivada necesita su autorización. Si la obra original está en dominio público no la necesitas: dilo en la ficha y da el crédito.",
      "fuente": "Derecho de transformación y obra derivada: por verificar en la Ley 23 de 1982 y la Decisión 351 (spec, sección 19, punto 2).",
      "accion": "Consigue la autorización por escrito o cambia la historia.",
      "verificacion": "pendiente"
    },
    "A01": {
      "breve": "Esta licencia exige dar crédito y todavía no lo escribiste.",
      "completo": "La condición BY (atribución) obliga a nombrar al autor, la obra y la licencia, y a indicar si hubo cambios. Usa el crédito sugerido o escríbelo con esos datos.",
      "fuente": "Texto de las licencias Creative Commons BY (creativecommons.org/licenses).",
      "accion": "Escribe el crédito con autor, obra y licencia.",
      "verificacion": "verificada"
    },
    "A02": {
      "breve": "Otra persona es la autora: nombrarla es su derecho moral, aunque te haya cedido los derechos patrimoniales.",
      "completo": "La paternidad es un derecho moral perpetuo, inalienable e irrenunciable (Ley 23 de 1982, art. 30; Decisión 351, art. 11). Una cesión de derechos patrimoniales no la toca. Incluso con licencias que no exigen crédito, como CC0, en Colombia el autor conserva el derecho a ser nombrado.",
      "fuente": "Memo, sección 2: Ley 23 de 1982, art. 30; Decisión 351, art. 11.",
      "accion": "Escribe el crédito de {autor}.",
      "verificacion": "verificada"
    },
    "A03": {
      "breve": "Esta licencia exige compartir igual: tu juego tendría que llevar la misma licencia.",
      "completo": "La condición SA (compartir igual) obliga a licenciar la obra derivada, es decir tu juego, bajo la misma licencia. Es una decisión sobre todo el juego, no solo sobre esta pieza. Si la aceptas, marca la casilla; si no, reemplaza la pieza.",
      "fuente": "Texto de las licencias Creative Commons SA (creativecommons.org/licenses).",
      "accion": "Acepta licenciar tu juego igual o reemplaza la pieza.",
      "verificacion": "verificada"
    },
    "A04": {
      "breve": "Esto lo generó una herramienta de IA sin aporte tuyo. No tendrás derechos sobre ello y debes declararlo.",
      "completo": "La DNDA niega el registro de resultados generados por inteligencia artificial sin aporte humano: solo las personas físicas son autoras (resoluciones de 2023 a 2025). Puedes usarlo en tu juego, pero cualquiera podrá usar lo mismo, y conviene revisar los términos de la herramienta. Reconócelo en la ficha y decláralo en los créditos.",
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
      "breve": "Subiste algo que hiciste tú, pero no tienes nada que pruebe cuándo.",
      "completo": "El derecho nace con la creación (Ley 23 de 1982, art. 9), pero si alguien discute la autoría tendrás que probarla. Sirven el archivo original con sus datos, un repositorio con historial, o el registro ante la DNDA, que es la prueba fuerte y presume ciertos los hechos inscritos (Decisión 351, art. 53).",
      "fuente": "Memo, sección 2: Ley 23 de 1982, art. 9; Decisión 351, art. 53.",
      "accion": "Indica qué prueba tienes: archivo original, repositorio o registro.",
      "verificacion": "verificada"
    },
    "A07": {
      "breve": "Hay una licencia y no la has leído.",
      "completo": "Una licencia es un contrato: autoriza lo que dice y nada más (Ley 1955 de 2019, art. 181). Léela antes de marcar la casilla; las condiciones de esta pieza están en su ficha.",
      "fuente": "Memo, sección 5: Ley 1955 de 2019, art. 181.",
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
      "completo": "Para explotar comercialmente una obra ajena necesitas un contrato escrito de cesión o de licencia, con usos, plazo y contraprestación (Ley 1955 de 2019, art. 181). Un mensaje de «úsalo tranquilo» sirve para un ejercicio, no para vender.",
      "fuente": "Memo, sección 5: Ley 1955 de 2019, art. 181.",
      "accion": "Pide a {autor} una cesión o una licencia por escrito.",
      "verificacion": "verificada"
    },
    "A11": {
      "breve": "Dices que hay otra licencia, pero no la describiste.",
      "completo": "Una licencia que la plataforma no conoce solo se puede evaluar si dices qué permite y qué no. Escribe de dónde sale (un correo, un contrato, un aviso en la página de descarga), qué usos autoriza y marca las condiciones que impone: crédito, no comercial, compartir igual, sin derivadas. Si no marcas ninguna, la plataforma confía en tu lectura.",
      "fuente": "Memo, sección 5: Ley 1955 de 2019, art. 181 (los contratos autorizan solo los usos pactados).",
      "accion": "Describe la licencia y marca sus condiciones.",
      "verificacion": "verificada"
    }
  },

  "notas": {
    "N_TITULO": {
      "breve": "El título no es una obra. Si quieres que nadie más lo use, es un asunto de marca, ante la Superintendencia de Industria y Comercio.",
      "completo": "El derecho de autor protege la obra, no su nombre aislado. El registro de marca es otro trámite, en otra oficina, y da exclusividad sobre el nombre en el mercado.",
      "fuente": "Protección del título y relación con la marca: por verificar (spec, sección 19, punto 3).",
      "verificacion": "pendiente"
    },
    "N_IA": {
      "breve": "Este elemento fue generado con IA y está declarado. No tienes derechos sobre él.",
      "completo": "La DNDA no lo registraría: no hay autor humano. Cualquiera puede usar el mismo resultado. Queda declarado en los créditos y en el informe.",
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
      "completo": "El sello se calcula en tu navegador y queda en el proyecto y en el informe. Puede ayudarte a mostrar que el archivo existía en esa fecha, pero no presume nada ante nadie. La prueba fuerte es el registro ante la DNDA (Decisión 351, art. 53).",
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
  const autor = (ficha.autorNombre ?? '').trim() || 'esa persona';
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
Expected: `# pass 7`, `# fail 0`, y en la salida la línea `Entradas pendientes de verificación jurídica (10): campos.prueba, tiposObra.musical_fonograma, tiposObra.fonograma, tiposObra.interpretacion, tiposObra.titulo, reglas.R06, reglas.A05, notas.N_TITULO, notas.N_IA_APORTE, notas.N_SELLO`.

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
Expected: `# fail 0`. Total: 10 (ficha) + 26 (modelo) + 34 (semáforo) + 5 (archivos) + 5 (almacén) + 7 (copias) + 7 (contenido) = 94 pruebas.

- [ ] **Step 1b: Ajuste menor de la revisión de la tarea 2**

En `plataforma/js/juridico/ficha.js`, cambiar `if (!(biblioteca.licencia in LICENCIAS))` por `if (!Object.hasOwn(LICENCIAS, biblioteca.licencia))`, para que un código como `constructor` no pase por la cadena de prototipos. Correr `node --test tests/ficha.test.js` y confirmar `# pass 10`.

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

Plan 1 (núcleo) terminado: modelo del juego, fichas, licencias, semáforo, contenido
jurídico, almacén en IndexedDB y copias comprimidas. Todavía no hay interfaz: llega
con el plan 2.

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
publicarse sin cotejo. `npm test` imprime la lista.
````

- [ ] **Step 4: Confirmar que el repositorio queda limpio salvo lo nuevo**

Run: `git status --short`
Expected: solo `D` para los cinco `.gitkeep` y `??` para `plataforma/README.md` y `plataforma/js/vendor/LICENSE-jszip.md`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Cierre del plan 1: README de la plataforma y limpieza" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Autorrevisión del plan contra el spec

**Cobertura.** Sección 6 (modelo): tareas 3 a 5 y 8. Sección 12.2 (campos de la ficha): tarea 2. Sección 12.3 (tipo de obra): tarea 2 y textos en la 12. Sección 12.4 (reglas): tareas 6 y 7; `evaluarTodo` en la 8. Sección 12.5 (destino recalcula): `evaluarTodo` toma el destino del proyecto; la interfaz que lo dispara llega en el plan 3. Sección 12.9 (contenido aparte del código): tarea 12. Sección 13 (persistencia y copias): tareas 10 y 11. Sección 15.3 (interfaces): los nombres de este plan son los del spec salvo dos ajustes deliberados: `evaluar` devuelve códigos y los textos los agrega `describir` (así la tabla de casos es estable), y `ficha.js` queda puro (el formulario irá en `editor/panel-ficha.js`, plan 3). Secciones 7, 8, 9, 10, 11, 14, 16, 17, 18 (e2e): planes 2 a 6.

**Decisión de diseño que este plan fija y el spec no decía:** el avance natural entre escenas (una escena sin decisión ni fin sigue con la siguiente de la lista) y el aviso I05. Conviene añadirlo a la sección 8 del spec cuando se escriba el plan 2.

**Consistencia de nombres.** `crearFicha(tipo, { origen, biblioteca })`, `evaluar(ficha, contexto)`, `evaluarTodo(proyecto)`, `describir(resultado, ficha, contenido)`, `validar(juego)`, `cumpleMinimo(proyecto)`, `puedePublicar(proyecto, semaforos, avisos)`, `abrirAlmacen({ nombre, indexedDB })`, `exportarCopia(proyecto, archivos, { JSZip })`, `importarCopia(entrada, { JSZip })`. Los archivos binarios son siempre `{ tipo, datos }`.
