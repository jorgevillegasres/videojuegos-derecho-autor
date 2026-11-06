# Plan 3 de 6: Fichas en pantalla — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poner la capa jurídica en pantalla: el panel de ficha con sus seis campos, explicaciones y semáforo; los puntos de semáforo en el inventario; el mapa de activos sobre el editor; los créditos reales en el reproductor; la pregunta de autoría al subir; y el recálculo visible al cambiar el destino.

**Architecture:** Las reglas del formulario (qué campos se ven y qué se limpia al cambiar una respuesta) viven en `juridico/formulario.js`, puro y probado en Node; `editor/panel-ficha.js` solo dibuja. La cadena de titularidad y los créditos (`juridico/cadena.js`) y las filas del mapa de activos (`juridico/mapa.js`) también son puros: el plan 6 los reutiliza en el informe. El editor del plan 2 no cambia de forma: el panel de ficha entra en `propiedades.js`, los puntos del inventario se colorean con `evaluarTodo`, y el mapa es una capa sobre el editor como el reproductor.

**Tech Stack:** El del plan 2 (módulos ES, Node 24, `node --test`, jsdom para las vistas). Spec: `docs/superpowers/specs/2026-11-04-plataforma-primer-videojuego-design.md`, secciones 10 (segundo párrafo), 12.1 a 12.6, 12.8, 12.9, 16 (anuncios) y 19 (punto 13).

---

## Mapa de planes

| Plan | Qué construye | Sección del spec |
|---|---|---|
| 1. Núcleo (hecho) | Modelo, fichas, licencias, semáforo, contenido jurídico, almacén, copias | 6, 12.2–12.5, 12.9, 13 |
| 2. Motor y editor (hecho) | Reproductor, `index.html`, arranque, inventario, guion, vista previa, propiedades, subida, copias | 3, 7, 8, 10, 13, 15.4, 16, 17 |
| **3. Fichas en pantalla (este)** | Panel de ficha, semáforos en el inventario, mapa de activos, créditos reales, pregunta de autoría al subir, cambio de destino | 10 (2.º párrafo), 12.1–12.6, 12.8, 12.9, 19.13 |
| 4. Biblioteca | Catálogo con piezas y licencias reales, créditos, carga en el editor, «ver más» con la licencia real de las piezas simuladas | 11 |
| 5. Herramientas | Pixel art, grabador, secuenciador | 9 |
| 6. Publicación | Decisión de registro, informe con cadena de titularidad, paquete de entrega, recorrido Playwright | 12.7, 14, 18 |

**Decisiones que este plan fija y el spec no decía:**

- **Reglas de limpieza del formulario.** Al cambiar la autoría se borran el nombre, la herramienta, el aporte y la casilla de reconocimiento que ya no aplican. Cuando autoría y titular quedan en «yo», el respaldo se oculta y vuelve a «ninguno» con los campos de licencia limpios. Al cambiar el respaldo a algo distinto de «licencia», o al cambiar de licencia, se limpian «leí la licencia», «acepto compartir igual» y, si ya no es «otra», su texto y condiciones. Desmarcar «basado en obra ajena» desmarca la autorización.
- **Fichas de biblioteca.** Autoría, nombre del autor, titular, respaldo y licencia vienen del catálogo y se muestran como texto, no se editan. Lo editable: «leí la licencia», «acepto compartir igual», «lo modifiqué», crédito, prueba y «basado en obra ajena».
- **Textos pendientes de verificación** (spec 19.13): se muestran con la marca visible «Por verificar» junto al texto, en el panel y en el mapa. El docente decide después si se ocultan.
- **A01 y A02 juntas** se presentan como una sola razón: la de A01, con su acción.
- **Créditos.** `cadena.creditos(proyecto)` reemplaza los créditos provisionales del plan 2: el estudiante como autor del juego y de la historia; cada persona nombrada en una ficha con su aporte; el crédito escrito de cada pieza (precargado si es de biblioteca); cada elemento con IA declarado con su herramienta.
- **Mapa de activos.** Botón en la barra; capa sobre el editor; una fila por ficha con «Ver ficha», que cierra el mapa y abre la ficha en el panel derecho.
- **Anuncios.** Cada vez que el color de una ficha cambia tras un cambio, se anuncia a lectores de pantalla («Semáforo de «Tema»: rojo»).
- **Al subir** un archivo, la ficha del elemento nuevo se abre con el foco en «¿Quién lo hizo?».

## Convenciones de este plan

- Las del plan 2: vistas que leen `sesion.proyecto` cada vez; cambios con `sesion.cambiar(fn, { origen, estructura })`; pruebas de vistas con `instalarDom()` y `sesionDePrueba()`.
- Origen de los cambios de la ficha: los de texto (nombre del autor, herramienta, aporte, texto de la licencia, crédito) van con `origen: 'propiedades'` para no perder el foco, y el panel repinta solo su cuadro de semáforo; los de opciones y casillas van con `origen: 'ficha'`, que redibuja el panel (muestra u oculta campos) conservando el foco por `data-foco`.
- Todo texto que ve el estudiante sobre derecho sale de `contenido/juridico.json` (`breve`, `completo`, `fuente`, `accion`, `verificacion`). Las etiquetas de los controles (nombres de las respuestas) viven en `juridico/formulario.js` y no afirman nada jurídico.
- Conteo de pruebas: el plan 2 dejó 207. Cada tarea dice cuántas agrega; el cierre espera 235.

## Estructura de archivos que deja este plan

```
plataforma/
  css/editor.css                    + ficha, semáforo, mapa de activos
  js/
    juridico/
      formulario.js                 visibles(ficha), aplicarCambio(ficha, campo, valor), ETIQUETAS, PREGUNTAS
      cadena.js                     construir(proyecto, semaforos) → árbol; creditos(proyecto) → textos
      mapa.js                       filas(proyecto, contenido) → filas del mapa de activos
    editor/
      panel-ficha.js                panelFicha(sesion, idFicha, { contenido, alSeleccionar }) → nodo
      mapa-activos.js               crearMapaActivos(contenedor, sesion, { contenido, alSeleccionar, alCerrar }) → { abrir, cerrar }
      inventario.js                 (cambia) puntos de semáforo con color y nombre accesible
      propiedades.js                (cambia) fichas en El juego, personaje y elemento; enfocar
      barra.js                      (cambia) botón «Mapa de activos»
      editor.js                     (cambia) mapa, créditos reales, anuncios de semáforo, foco al subir
tests/
  formulario.test.js  cadena.test.js  mapa.test.js  panel-ficha.test.js  mapa-activos.test.js
  inventario.test.js  propiedades.test.js  barra.test.js  editor.test.js   (cambian)
```

---

### Task 1: Reglas del formulario de la ficha

**Files:**
- Create: `plataforma/js/juridico/formulario.js`
- Create: `tests/formulario.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/formulario.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearFicha } from '../plataforma/js/juridico/ficha.js';
import { visibles, aplicarCambio, ETIQUETAS, PREGUNTAS, LICENCIAS_ELEGIBLES } from '../plataforma/js/juridico/formulario.js';

const ocultos = (v) => Object.entries(v).filter(([k, valor]) => k !== 'soloLectura' && valor === false).map(([k]) => k);
const mostrados = (v) => Object.entries(v).filter(([k, valor]) => k !== 'soloLectura' && valor === true).map(([k]) => k);

test('la ficha del título no muestra ningún campo editable', () => {
  const v = visibles(crearFicha('titulo'));
  assert.deepEqual(mostrados(v), []);
  assert.deepEqual(v.soloLectura, []);
});

test('una ficha nueva hecha por mí muestra autoría, titular, obra ajena, crédito y prueba, y oculta el respaldo', () => {
  const v = visibles(crearFicha('fondo', { origen: 'creado' }));
  assert.deepEqual(mostrados(v), ['autoria', 'basadoEnObraAjena', 'titular', 'credito', 'prueba']);
  assert.ok(ocultos(v).includes('respaldo'));
});

test('otra persona con licencia «otra» y compartir igual abre nombre, respaldo, licencia, texto, condiciones y casillas', () => {
  const ficha = { ...crearFicha('retrato', { origen: 'subido' }), autoria: 'otra_persona', titular: 'otra_persona', respaldo: 'licencia', licencia: 'OTRA', condicionesOtra: ['BY', 'SA'] };
  const v = visibles(ficha);
  assert.deepEqual(mostrados(v), ['autoria', 'autorNombre', 'basadoEnObraAjena', 'titular', 'respaldo', 'licencia', 'licenciaTexto', 'condicionesOtra', 'licenciaLeida', 'aceptaCompartirIgual', 'modificado', 'credito', 'prueba']);
  ficha.licencia = 'CC-BY-4.0';
  assert.ok(!visibles(ficha).aceptaCompartirIgual, 'sin SA no se pide compartir igual');
  assert.ok(!visibles(ficha).licenciaTexto);
  ficha.basadoEnObraAjena = true;
  assert.ok(visibles(ficha).autorizacionDerivada);
  const ia = { ...crearFicha('musica', { origen: 'subido' }), autoria: 'ia' };
  assert.ok(visibles(ia).herramientaIA);
  assert.ok(visibles(ia).reconoceSinDerechos);
  assert.ok(!visibles(ia).aporteHumano);
  assert.ok(visibles(ia).respaldo, 'con IA el titular sigue siendo yo pero la autoría no: el respaldo se muestra');
  const conAporte = { ...ia, autoria: 'ia_con_aporte' };
  assert.ok(visibles(conAporte).aporteHumano);
  assert.ok(!visibles(conAporte).reconoceSinDerechos);
});

test('una ficha de biblioteca deja de solo lectura lo que viene del catálogo y ofrece «lo modifiqué»', () => {
  const ficha = crearFicha('musica', { origen: 'biblioteca', biblioteca: { id: 'bib_m1', autor: 'Autora Ejemplo', licencia: 'CC-BY-ND-4.0', creditoSugerido: 'Tema, CC BY-ND' } });
  const v = visibles(ficha);
  assert.deepEqual(v.soloLectura, ['autoria', 'autorNombre', 'titular', 'respaldo', 'licencia']);
  assert.ok(v.modificado);
  assert.ok(v.licenciaLeida);
  assert.ok(!v.aceptaCompartirIgual);
  assert.equal(aplicarCambio(ficha, 'autoria', 'yo').autoria, 'otra_persona', 'no se cambia lo que viene del catálogo');
  assert.equal(aplicarCambio(ficha, 'modificado', true).modificado, true);
});

test('aplicarCambio limpia lo que deja de aplicar', () => {
  const ficha = { ...crearFicha('retrato', { origen: 'subido' }), autoria: 'otra_persona', autorNombre: 'Camila', titular: 'otra_persona', respaldo: 'licencia', licencia: 'CC-BY-SA-4.0', licenciaLeida: true, aceptaCompartirIgual: true, modificado: true };
  aplicarCambio(ficha, 'licencia', 'OTRA');
  assert.equal(ficha.licenciaLeida, false, 'otra licencia: hay que volver a leerla');
  assert.equal(ficha.aceptaCompartirIgual, false);
  aplicarCambio(ficha, 'licenciaTexto', 'Permiso del colectivo');
  aplicarCambio(ficha, 'condicionesOtra', ['BY', 'XX']);
  assert.deepEqual(ficha.condicionesOtra, ['BY'], 'solo condiciones conocidas');
  aplicarCambio(ficha, 'licencia', 'CC-BY-4.0');
  assert.equal(ficha.licenciaTexto, '');
  assert.deepEqual(ficha.condicionesOtra, []);
  aplicarCambio(ficha, 'respaldo', 'cesion');
  assert.equal(ficha.licencia, null);
  assert.equal(ficha.modificado, false);
  aplicarCambio(ficha, 'autoria', 'ia');
  assert.equal(ficha.autorNombre, '', 'ya no es otra persona');
  aplicarCambio(ficha, 'herramientaIA', 'Generador X');
  aplicarCambio(ficha, 'reconoceSinDerechos', true);
  aplicarCambio(ficha, 'autoria', 'yo');
  assert.equal(ficha.herramientaIA, '');
  assert.equal(ficha.reconoceSinDerechos, false);
  assert.equal(ficha.respaldo, 'cesion', 'el titular sigue siendo otra persona: el respaldo se conserva');
  aplicarCambio(ficha, 'titular', 'yo');
  assert.equal(ficha.respaldo, 'ninguno', 'yo y yo: el respaldo se oculta y se limpia');
  aplicarCambio(ficha, 'basadoEnObraAjena', true);
  aplicarCambio(ficha, 'autorizacionDerivada', true);
  aplicarCambio(ficha, 'basadoEnObraAjena', false);
  assert.equal(ficha.autorizacionDerivada, false);
});

test('aplicarCambio ignora valores inválidos, campos fijos y la ficha del título', () => {
  const ficha = crearFicha('fondo', { origen: 'creado' });
  aplicarCambio(ficha, 'autoria', 'nadie');
  assert.equal(ficha.autoria, 'yo');
  aplicarCambio(ficha, 'prueba', 'sello_falso');
  assert.equal(ficha.prueba, 'sello');
  aplicarCambio(ficha, 'tipoObra', 'literaria');
  assert.equal(ficha.tipoObra, 'artistica');
  aplicarCambio(ficha, 'licenciaLeida', 'sí');
  assert.equal(ficha.licenciaLeida, false, 'una casilla solo acepta sí o no');
  aplicarCambio(ficha, 'credito', 7);
  assert.equal(ficha.credito, '', 'un texto solo acepta texto');
  const titulo = crearFicha('titulo');
  aplicarCambio(titulo, 'credito', 'x');
  assert.equal(titulo.credito, '');
  assert.deepEqual(Object.keys(ETIQUETAS), ['autoria', 'titular', 'respaldo', 'prueba', 'condiciones']);
  assert.deepEqual(Object.keys(PREGUNTAS), ['tipoObra', 'autoria', 'titular', 'respaldo', 'credito', 'prueba']);
  assert.ok(LICENCIAS_ELEGIBLES.includes('OTRA'));
  assert.ok(LICENCIAS_ELEGIBLES.includes('DESCONOCIDO'), '«encontrado en internet» es una respuesta honesta');
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/formulario.test.js`
Expected: falla al importar `formulario.js`.

- [ ] **Step 3: Escribir `plataforma/js/juridico/formulario.js`**

```js
// plataforma/js/juridico/formulario.js
// Reglas del formulario de la ficha (spec, secciones 12.2 y 12.4): qué campos se
// muestran según las respuestas, y qué se limpia cuando una respuesta cambia. Es puro:
// el dibujo está en editor/panel-ficha.js. Las etiquetas nombran respuestas; no
// afirman nada jurídico (eso está en contenido/juridico.json).
import { AUTORIAS, TITULARES, RESPALDOS, PRUEBAS } from './ficha.js';
import { LICENCIAS, CONDICIONES, condicionesDe } from './licencias.js';

export const PREGUNTAS = {
  tipoObra: 'Qué obra es',
  autoria: '¿Quién lo hizo?',
  titular: '¿Quién es titular de los derechos patrimoniales?',
  respaldo: '¿Qué lo respalda?',
  credito: '¿Cómo se acredita?',
  prueba: '¿Qué prueba la fecha?',
};

export const ETIQUETAS = {
  autoria: { yo: 'Yo', otra_persona: 'Otra persona', ia: 'Una herramienta de IA', ia_con_aporte: 'IA con mi aporte creativo' },
  titular: { yo: 'Yo', otra_persona: 'Otra persona' },
  respaldo: { ninguno: 'Nada escrito', cesion: 'Cesión por escrito', licencia: 'Licencia', autorizacion: 'Autorización informal (mensaje, correo, de palabra)' },
  prueba: { ninguna: 'Ninguna', sello: 'Sello de la plataforma', original: 'Archivo original con fecha', repositorio: 'Repositorio con historial', registro_dnda: 'Registro ante la DNDA' },
  condiciones: { BY: 'Exige atribución (BY)', NC: 'No comercial (NC)', SA: 'Compartir igual (SA)', ND: 'Sin derivadas (ND)' },
};

/** Códigos que el estudiante puede elegir cuando el respaldo es una licencia. */
export const LICENCIAS_ELEGIBLES = Object.keys(LICENCIAS);

const SOLO_LECTURA_BIBLIOTECA = ['autoria', 'autorNombre', 'titular', 'respaldo', 'licencia'];
const BOOLEANOS = ['reconoceSinDerechos', 'basadoEnObraAjena', 'autorizacionDerivada', 'licenciaLeida', 'aceptaCompartirIgual', 'modificado'];
const TEXTOS = ['autorNombre', 'herramientaIA', 'aporteHumano', 'licenciaTexto', 'credito'];
const LISTAS = { autoria: AUTORIAS, titular: TITULARES, respaldo: RESPALDOS, prueba: PRUEBAS };

/** Qué campos se muestran. soloLectura: los que se muestran como texto fijo. */
export function visibles(ficha) {
  const esTitulo = ficha.tipo === 'titulo';
  const editable = !esTitulo;
  const conIA = ficha.autoria === 'ia' || ficha.autoria === 'ia_con_aporte';
  const conLicencia = ficha.respaldo === 'licencia';
  const subidoOBiblioteca = ficha.origen === 'biblioteca' || ficha.origen === 'subido';
  return {
    autoria: editable,
    autorNombre: editable && ficha.autoria === 'otra_persona',
    herramientaIA: editable && conIA,
    aporteHumano: editable && ficha.autoria === 'ia_con_aporte',
    reconoceSinDerechos: editable && ficha.autoria === 'ia',
    basadoEnObraAjena: editable,
    autorizacionDerivada: editable && ficha.basadoEnObraAjena === true,
    titular: editable,
    respaldo: editable && !(ficha.autoria === 'yo' && ficha.titular === 'yo'),
    licencia: editable && conLicencia,
    licenciaTexto: editable && conLicencia && ficha.licencia === 'OTRA',
    condicionesOtra: editable && conLicencia && ficha.licencia === 'OTRA',
    licenciaLeida: editable && conLicencia && Boolean(ficha.licencia),
    aceptaCompartirIgual: editable && conLicencia && condicionesDe(ficha).includes('SA'),
    modificado: editable && conLicencia && subidoOBiblioteca,
    credito: editable,
    prueba: editable,
    soloLectura: ficha.origen === 'biblioteca' ? [...SOLO_LECTURA_BIBLIOTECA] : [],
  };
}

function limpiarLicencia(ficha) {
  Object.assign(ficha, { licencia: null, licenciaTexto: '', condicionesOtra: [], licenciaLeida: false, aceptaCompartirIgual: false, modificado: false });
}

function valorValido(campo, valor) {
  if (campo in LISTAS) return LISTAS[campo].includes(valor);
  if (campo === 'licencia') return valor === null || Object.hasOwn(LICENCIAS, valor);
  if (campo === 'condicionesOtra') return Array.isArray(valor);
  if (BOOLEANOS.includes(campo)) return typeof valor === 'boolean';
  if (TEXTOS.includes(campo)) return typeof valor === 'string';
  return false;
}

/** Cambia un campo y limpia lo que deja de aplicar. Devuelve la ficha (mutada). Ignora lo inválido. */
export function aplicarCambio(ficha, campo, valor) {
  if (ficha.tipo === 'titulo') return ficha;
  if (visibles(ficha).soloLectura.includes(campo)) return ficha;
  if (!valorValido(campo, valor)) return ficha;
  ficha[campo] = campo === 'condicionesOtra' ? valor.filter((c) => CONDICIONES.includes(c)) : valor;

  if (campo === 'autoria') {
    if (valor !== 'otra_persona') ficha.autorNombre = '';
    if (valor !== 'ia' && valor !== 'ia_con_aporte') ficha.herramientaIA = '';
    if (valor !== 'ia_con_aporte') ficha.aporteHumano = '';
    if (valor !== 'ia') ficha.reconoceSinDerechos = false;
  }
  if ((campo === 'autoria' || campo === 'titular') && ficha.autoria === 'yo' && ficha.titular === 'yo') {
    ficha.respaldo = 'ninguno';
    limpiarLicencia(ficha);
  }
  if (campo === 'respaldo' && valor !== 'licencia') limpiarLicencia(ficha);
  if (campo === 'licencia') {
    ficha.licenciaLeida = false;
    ficha.aceptaCompartirIgual = false;
    if (valor !== 'OTRA') {
      ficha.licenciaTexto = '';
      ficha.condicionesOtra = [];
    }
  }
  if (campo === 'basadoEnObraAjena' && valor === false) ficha.autorizacionDerivada = false;
  return ficha;
}
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/formulario.test.js`
Expected: `# pass 6`.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/juridico/formulario.js tests/formulario.test.js
git commit -m "Ficha: reglas del formulario, campos visibles y limpieza al cambiar respuestas" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Cadena de titularidad y créditos

**Files:**
- Create: `plataforma/js/juridico/cadena.js`
- Create: `tests/cadena.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/cadena.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proyectoPublicable } from './ayudas/proyecto.js';
import { agregarPersonaje, agregarElemento } from '../plataforma/js/estado/modelo.js';
import { construir, creditos } from '../plataforma/js/juridico/cadena.js';

test('los créditos nombran al estudiante y copian el crédito escrito de cada pieza; lo hecho por mí no se repite', () => {
  const { p } = proyectoPublicable();
  assert.deepEqual(creditos(p), ['Camila R.: autor(a) del juego y de la historia', '«Tema» de Autora Ejemplo, CC BY-NC 4.0']);
});

test('los créditos nombran a cada persona con su aporte y declaran lo hecho con IA', () => {
  const { p, ana, olas, farero } = proyectoPublicable();
  Object.assign(p.fichas.historia, { autoria: 'otra_persona', autorNombre: 'Luis P.', titular: 'otra_persona', respaldo: 'cesion' });
  Object.assign(p.fichas[ana.id], { autoria: 'otra_persona', autorNombre: 'Luis P.', titular: 'yo', respaldo: 'cesion' });
  Object.assign(p.fichas[farero.retrato], { autoria: 'ia', herramientaIA: 'Generador X', reconoceSinDerechos: true });
  Object.assign(p.fichas[olas.id], { autoria: 'ia_con_aporte', herramientaIA: 'Sintetizador Y', aporteHumano: 'Mezcla y recorte' });
  const sinNombre = agregarElemento(p, { tipo: 'voz', nombre: '', archivo: 'v.ogg', origen: 'subido' });
  Object.assign(p.fichas[sinNombre.id], { autoria: 'otra_persona', autorNombre: '', titular: 'otra_persona' });
  assert.deepEqual(creditos(p), [
    'Camila R.: autor(a) del juego',
    'Historia: Luis P.',
    'Personaje «Ana»: Luis P.',
    'Retrato «Farero»: generado con IA (Generador X)',
    '«Tema» de Autora Ejemplo, CC BY-NC 4.0',
    'Efecto de sonido «Olas»: hecho con IA (Sintetizador Y) con aporte creativo de Camila R.',
    'Voz «sin nombre»: otra persona',
  ]);
  p.estudiante = ' ';
  assert.equal(creditos(p)[0], 'Sin nombre: autor(a) del juego');
});

test('construir arma el árbol: juego del estudiante, título, historia, personajes con su retrato y el resto de elementos, con el color de cada ficha', () => {
  const { p, ana, farero, tema, olas, muelle } = proyectoPublicable();
  const sinRetrato = agregarPersonaje(p, { nombre: 'Sombra' });
  p.juego.destino = 'venta';
  const arbol = construir(p);
  assert.equal(arbol.nombre, 'La llave del faro');
  assert.equal(arbol.estudiante, 'Camila R.');
  assert.deepEqual(arbol.hijos.map((n) => n.nombre), [
    'título', 'historia y escenas', 'personaje «Ana»', 'personaje «El farero»', 'personaje «Sombra»',
    'fondo «Muelle»', 'música «Tema»', 'efecto de sonido «Olas»',
  ]);
  const nodoAna = arbol.hijos[2];
  assert.equal(nodoAna.id, ana.id);
  assert.deepEqual(nodoAna.hijos.map((n) => n.id), [ana.retrato]);
  assert.equal(nodoAna.hijos[0].nombre, 'retrato «Ana»');
  assert.deepEqual(arbol.hijos[4].hijos, [], 'sin retrato no cuelga nada');
  assert.ok(sinRetrato);
  const nodoTema = arbol.hijos.find((n) => n.id === tema.id);
  assert.equal(nodoTema.color, 'rojo', 'destino venta con NC');
  assert.deepEqual([nodoTema.autoria, nodoTema.autorNombre, nodoTema.titular, nodoTema.respaldo, nodoTema.licencia], ['otra_persona', 'Autora Ejemplo', 'otra_persona', 'licencia', 'CC-BY-NC-4.0']);
  assert.equal(arbol.hijos[0].color, 'verde');
  assert.equal(arbol.hijos.find((n) => n.id === olas.id).color, 'verde');
  assert.equal(arbol.hijos.find((n) => n.id === farero.id).hijos.length, 1);
  assert.ok(muelle.fondo);
  const conMapa = construir(p, new Map([[tema.id, { color: 'amarillo' }]]));
  assert.equal(conMapa.hijos.find((n) => n.id === tema.id).color, 'amarillo', 'acepta semáforos ya calculados');
  assert.equal(conMapa.hijos[0].color, null, 'sin resultado, sin color');
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/cadena.test.js`
Expected: falla al importar `cadena.js`.

- [ ] **Step 3: Escribir `plataforma/js/juridico/cadena.js`**

```js
// plataforma/js/juridico/cadena.js
// Cadena de titularidad y pantalla de créditos (spec, sección 12.6). Las dos salen
// de las fichas; nada se escribe a mano. El árbol lo dibuja el informe (plan 6); los
// créditos los muestra el reproductor desde este plan.
import { evaluarTodo } from './semaforo.js';

export const NOMBRES_TIPO_CREDITO = { fondo: 'fondo', retrato: 'retrato', musica: 'música', efecto: 'efecto de sonido', voz: 'voz' };

const nombreDe = (cosa, alternativa) => cosa?.nombre?.trim() || alternativa;
const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

function nodoDe(id, nombre, ficha, color, hijos = []) {
  return {
    id,
    nombre,
    autoria: ficha?.autoria ?? 'yo',
    autorNombre: ficha?.autorNombre?.trim() ?? '',
    titular: ficha?.titular ?? 'yo',
    respaldo: ficha?.respaldo ?? 'ninguno',
    licencia: ficha?.licencia ?? null,
    color: color ?? null,
    hijos,
  };
}

/**
 * Árbol de titularidad: el juego es del estudiante; de él cuelgan el título, la historia
 * (con las escenas), cada personaje con su retrato y los demás elementos.
 * @param {object} proyecto
 * @param {Map} semaforos resultado de evaluarTodo (se calcula si no se pasa)
 */
export function construir(proyecto, semaforos = evaluarTodo(proyecto)) {
  const { juego, fichas } = proyecto;
  const color = (id) => semaforos.get(id)?.color ?? null;
  const elementoNodo = (e) => nodoDe(e.id, `${NOMBRES_TIPO_CREDITO[e.tipo]} «${nombreDe(e, 'sin nombre')}»`, fichas[e.id], color(e.id));
  const retratos = new Set(juego.personajes.map((p) => p.retrato).filter(Boolean));
  const personajes = juego.personajes.map((p) => {
    const retrato = juego.elementos.find((e) => e.id === p.retrato);
    return nodoDe(p.id, `personaje «${nombreDe(p, 'sin nombre')}»`, fichas[p.id], color(p.id), retrato ? [elementoNodo(retrato)] : []);
  });
  const sueltos = juego.elementos.filter((e) => !retratos.has(e.id)).map(elementoNodo);
  return {
    id: 'juego',
    nombre: juego.titulo?.trim() || 'Sin título',
    estudiante: proyecto.estudiante?.trim() || 'Sin nombre',
    hijos: [
      nodoDe('titulo', 'título', fichas.titulo, color('titulo')),
      nodoDe('historia', 'historia y escenas', fichas.historia, color('historia')),
      ...personajes,
      ...sueltos,
    ],
  };
}

/** Línea de crédito de una ficha, o null si la pieza es del estudiante y no tiene crédito escrito. */
function creditoDe(ficha, etiqueta, estudiante) {
  if (!ficha) return null;
  const escrito = ficha.credito?.trim();
  if (escrito) return escrito;
  const herramienta = ficha.herramientaIA?.trim() || 'herramienta no indicada';
  if (ficha.autoria === 'otra_persona') return `${etiqueta}: ${ficha.autorNombre?.trim() || 'otra persona'}`;
  if (ficha.autoria === 'ia') return `${etiqueta}: generado con IA (${herramienta})`;
  if (ficha.autoria === 'ia_con_aporte') return `${etiqueta}: hecho con IA (${herramienta}) con aporte creativo de ${estudiante}`;
  return null;
}

/** Pantalla de créditos: el estudiante, cada persona nombrada con su aporte, cada crédito escrito y cada pieza con IA. */
export function creditos(proyecto) {
  const { juego, fichas } = proyecto;
  const estudiante = proyecto.estudiante?.trim() || 'Sin nombre';
  const lineas = [];
  const agregar = (texto) => {
    if (texto && !lineas.includes(texto)) lineas.push(texto);
  };
  const historia = creditoDe(fichas.historia, 'Historia', estudiante);
  if (historia) {
    agregar(`${estudiante}: autor(a) del juego`);
    agregar(historia);
  } else {
    agregar(`${estudiante}: autor(a) del juego y de la historia`);
  }
  for (const personaje of juego.personajes) agregar(creditoDe(fichas[personaje.id], `Personaje «${nombreDe(personaje, 'sin nombre')}»`, estudiante));
  for (const elemento of juego.elementos) agregar(creditoDe(fichas[elemento.id], `${capitalizar(NOMBRES_TIPO_CREDITO[elemento.tipo])} «${nombreDe(elemento, 'sin nombre')}»`, estudiante));
  return lineas;
}
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/cadena.test.js`
Expected: `# pass 3`.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/juridico/cadena.js tests/cadena.test.js
git commit -m "Jurídico: cadena de titularidad y créditos generados desde las fichas" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Filas del mapa de activos

**Files:**
- Create: `plataforma/js/juridico/mapa.js`
- Create: `tests/mapa.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/mapa.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { proyectoPublicable } from './ayudas/proyecto.js';
import { crearFicha } from '../plataforma/js/juridico/ficha.js';
import { evaluar } from '../plataforma/js/juridico/semaforo.js';
import { describir } from '../plataforma/js/juridico/textos.js';
import { filas, creadorDe, contratoDe, accionesDe, TIPOS_ACTIVO } from '../plataforma/js/juridico/mapa.js';

const contenido = JSON.parse(readFileSync(new URL('../plataforma/contenido/juridico.json', import.meta.url), 'utf8'));

test('filas: una por ficha, en el orden del inventario, con creador, contrato, prueba, color y acciones', () => {
  const { p, tema, ana } = proyectoPublicable();
  const lista = filas(p, contenido);
  assert.deepEqual(lista.map((f) => f.tipo), ['Título', 'Historia', 'Personaje', 'Personaje', 'Retrato', 'Retrato', 'Fondo', 'Música', 'Efecto']);
  assert.deepEqual(lista[0], { id: 'titulo', activo: 'La llave del faro', tipo: 'Título', creador: '—', contrato: '—', prueba: '—', color: 'verde', acciones: [], porVerificar: true });
  assert.deepEqual(lista[1], { id: 'historia', activo: 'Historia', tipo: 'Historia', creador: 'Yo', contrato: 'No hace falta', prueba: 'Ninguna', color: 'verde', acciones: [], porVerificar: false });
  const filaAna = lista.find((f) => f.id === ana.id);
  assert.equal(filaAna.activo, 'Ana');
  const filaTema = lista.find((f) => f.id === tema.id);
  assert.deepEqual(filaTema, { id: tema.id, activo: 'Tema', tipo: 'Música', creador: 'Autora Ejemplo', contrato: 'Creative Commons Atribución y no comercial 4.0', prueba: 'Ninguna', color: 'verde', acciones: [], porVerificar: false });
  const filaFondo = lista.find((f) => f.tipo === 'Fondo');
  assert.equal(filaFondo.prueba, 'Sello de la plataforma');
  assert.equal(filaFondo.porVerificar, true, 'la nota del sello está pendiente de verificación');
  assert.equal(TIPOS_ACTIVO.voz, 'Voz');
});

test('cambiar el destino a venta pone la pieza no comercial en rojo con su acción', () => {
  const { p, tema } = proyectoPublicable();
  p.juego.destino = 'venta';
  const filaTema = filas(p, contenido).find((f) => f.id === tema.id);
  assert.equal(filaTema.color, 'rojo');
  assert.deepEqual(filaTema.acciones, [contenido.reglas.R03.accion]);
});

test('creadorDe, contratoDe y accionesDe cubren IA, otra licencia, licencia sin elegir y la fusión de A01 con A02', () => {
  const base = crearFicha('retrato', { origen: 'subido' });
  assert.equal(creadorDe({ ...base, autoria: 'ia', herramientaIA: 'Gen' }), 'IA (Gen)');
  assert.equal(creadorDe({ ...base, autoria: 'ia_con_aporte', herramientaIA: '' }), 'IA (herramienta sin indicar) con mi aporte');
  assert.equal(creadorDe({ ...base, autoria: 'otra_persona', autorNombre: ' ' }), 'Otra persona (sin nombre)');
  assert.equal(creadorDe(crearFicha('titulo')), '—');
  assert.equal(contratoDe({ ...base, autoria: 'otra_persona', titular: 'otra_persona' }), 'Nada escrito');
  assert.equal(contratoDe({ ...base, respaldo: 'cesion' }), 'Cesión por escrito');
  assert.equal(contratoDe({ ...base, respaldo: 'autorizacion' }), 'Autorización informal');
  assert.equal(contratoDe({ ...base, respaldo: 'licencia' }), 'Licencia sin elegir');
  assert.equal(contratoDe({ ...base, respaldo: 'licencia', licencia: 'OTRA', licenciaTexto: 'Permiso del colectivo' }), 'Otra licencia: Permiso del colectivo');
  assert.equal(contratoDe({ ...base, respaldo: 'licencia', licencia: 'OTRA' }), 'Otra licencia');
  assert.equal(contratoDe({ ...base, respaldo: 'licencia', licencia: 'CC0' }), 'Creative Commons Zero (CC0 1.0)');
  const dosRazones = { ...base, autoria: 'otra_persona', autorNombre: 'Luis', titular: 'otra_persona', respaldo: 'licencia', licencia: 'CC-BY-4.0', licenciaLeida: true };
  const descrito = describir(evaluar(dosRazones, { destino: 'gratis' }), dosRazones, contenido);
  assert.deepEqual(descrito.razones.map((r) => r.codigo), ['A01', 'A02']);
  assert.deepEqual(accionesDe(descrito), [contenido.reglas.A01.accion], 'A02 se funde con A01');
  const repetidas = describir({ color: 'rojo', razones: ['R02', 'A10'], notas: [] }, dosRazones, contenido);
  assert.deepEqual(accionesDe(repetidas), ['Pide a Luis una cesión o una licencia por escrito.'], 'la misma acción no se repite');
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/mapa.test.js`
Expected: falla al importar `mapa.js`.

- [ ] **Step 3: Escribir `plataforma/js/juridico/mapa.js`**

```js
// plataforma/js/juridico/mapa.js
// Filas del mapa de activos (spec, sección 12.8): la tabla del taller, llena sola.
// Activo, quién lo creó, contrato o licencia, prueba, riesgo (color) y acción.
// Puro: lo dibuja editor/mapa-activos.js y lo reutiliza el informe (plan 6).
import { evaluarTodo } from './semaforo.js';
import { describir } from './textos.js';
import { ETIQUETAS } from './formulario.js';
import { LICENCIAS } from './licencias.js';

export const TIPOS_ACTIVO = { titulo: 'Título', historia: 'Historia', personaje: 'Personaje', fondo: 'Fondo', retrato: 'Retrato', musica: 'Música', efecto: 'Efecto', voz: 'Voz' };

const nombreDe = (cosa, alternativa) => cosa?.nombre?.trim() || alternativa;

export function creadorDe(ficha) {
  if (!ficha || ficha.tipo === 'titulo') return '—';
  const herramienta = ficha.herramientaIA?.trim() || 'herramienta sin indicar';
  switch (ficha.autoria) {
    case 'otra_persona': return ficha.autorNombre?.trim() || 'Otra persona (sin nombre)';
    case 'ia': return `IA (${herramienta})`;
    case 'ia_con_aporte': return `IA (${herramienta}) con mi aporte`;
    default: return 'Yo';
  }
}

export function contratoDe(ficha) {
  if (!ficha || ficha.tipo === 'titulo') return '—';
  switch (ficha.respaldo) {
    case 'cesion': return 'Cesión por escrito';
    case 'autorizacion': return 'Autorización informal';
    case 'licencia': {
      if (!ficha.licencia) return 'Licencia sin elegir';
      if (ficha.licencia === 'OTRA') {
        const texto = ficha.licenciaTexto?.trim();
        return texto ? `Otra licencia: ${texto}` : 'Otra licencia';
      }
      return LICENCIAS[ficha.licencia]?.nombre ?? ficha.licencia;
    }
    default: return ficha.autoria === 'yo' && ficha.titular === 'yo' ? 'No hace falta' : 'Nada escrito';
  }
}

/** Acciones del semáforo sin repetir; A02 se funde con A01 (spec 12.4). */
export function accionesDe(descrito) {
  const hayA01 = descrito.razones.some((r) => r.codigo === 'A01');
  const razones = hayA01 ? descrito.razones.filter((r) => r.codigo !== 'A02') : descrito.razones;
  const acciones = [];
  for (const razon of razones) {
    if (razon.accion && !acciones.includes(razon.accion)) acciones.push(razon.accion);
  }
  return acciones;
}

/**
 * @param {object} proyecto
 * @param {object} contenido el JSON de contenido/juridico.json
 * @returns {Array<{ id, activo, tipo, creador, contrato, prueba, color, acciones: string[], porVerificar: boolean }>}
 */
export function filas(proyecto, contenido) {
  const semaforos = evaluarTodo(proyecto);
  const { juego, fichas } = proyecto;
  const fila = (id, activo, tipo) => {
    const ficha = fichas[id];
    const descrito = describir(semaforos.get(id), ficha, contenido);
    return {
      id,
      activo,
      tipo,
      creador: creadorDe(ficha),
      contrato: contratoDe(ficha),
      prueba: ficha?.tipo === 'titulo' ? '—' : (ETIQUETAS.prueba[ficha?.prueba] ?? '—'),
      color: descrito.color,
      acciones: accionesDe(descrito),
      porVerificar: [...descrito.razones, ...descrito.notas].some((r) => r.verificacion === 'pendiente'),
    };
  };
  return [
    fila('titulo', juego.titulo?.trim() || 'Sin título', TIPOS_ACTIVO.titulo),
    fila('historia', 'Historia', TIPOS_ACTIVO.historia),
    ...juego.personajes.map((p) => fila(p.id, nombreDe(p, 'Sin nombre'), TIPOS_ACTIVO.personaje)),
    ...juego.elementos.map((e) => fila(e.id, nombreDe(e, 'Sin nombre'), TIPOS_ACTIVO[e.tipo])),
  ];
}
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/mapa.test.js`
Expected: `# pass 3`.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/juridico/mapa.js tests/mapa.test.js
git commit -m "Jurídico: filas del mapa de activos con creador, contrato, prueba, color y acciones" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Panel de ficha

**Files:**
- Create: `plataforma/js/editor/panel-ficha.js`
- Create: `tests/panel-ficha.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// tests/panel-ficha.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { instalarDom, clic, escribir, textos } from './ayudas/dom.js';
import { sesionDePrueba } from './ayudas/sesion.js';
import { agregarPersonaje, agregarElemento } from '../plataforma/js/estado/modelo.js';
import { aplicarCambio } from '../plataforma/js/juridico/formulario.js';
import { vaciar } from '../plataforma/js/ui/dom.js';
import { panelFicha } from '../plataforma/js/editor/panel-ficha.js';

instalarDom();
const contenido = JSON.parse(readFileSync(new URL('../plataforma/contenido/juridico.json', import.meta.url), 'utf8'));

function armar() {
  const { sesion, eventos } = sesionDePrueba();
  const p = sesion.proyecto;
  const ana = agregarPersonaje(p, { nombre: 'Ana' });
  const retrato = agregarElemento(p, { tipo: 'retrato', nombre: 'Ana', archivo: 'a.png', origen: 'subido' });
  ana.retrato = retrato.id;
  const fondo = agregarElemento(p, { tipo: 'fondo', nombre: 'Muelle', archivo: 'm.png', origen: 'creado' });
  const olas = agregarElemento(p, { tipo: 'efecto', nombre: 'Olas', archivo: 'o.wav', origen: 'subido' });
  const tema = agregarElemento(p, { tipo: 'musica', nombre: 'Tema', archivo: 't.ogg', origen: 'biblioteca', biblioteca: { id: 'bib_m1', autor: 'Autora Ejemplo', licencia: 'CC-BY-ND-4.0', creditoSugerido: '«Tema» de Autora Ejemplo, CC BY-ND 4.0' } });
  const selecciones = [];
  const contenedor = document.createElement('div');
  document.body.append(contenedor);
  const dibujar = (id) => { vaciar(contenedor).append(panelFicha(sesion, id, { contenido, alSeleccionar: (s) => selecciones.push(s) })); return contenedor; };
  const q = (s) => contenedor.querySelector(s);
  const qa = (s) => [...contenedor.querySelectorAll(s)];
  const control = (id, campo, extra = '') => q(`[data-foco="ficha:${id}:${campo}${extra ? `:${extra}` : ''}"]`);
  const marcar = (nodo) => { nodo.checked = true; nodo.dispatchEvent(new window.Event('change', { bubbles: true })); };
  const color = () => q('.ficha-color strong').textContent;
  const codigos = () => qa('.ficha-razones li').map((li) => li.dataset.codigo);
  return { sesion, eventos, p, ana, retrato, fondo, olas, tema, contenedor, dibujar, q, qa, control, marcar, color, codigos, selecciones };
}

test('la ficha del título es informativa: tipo de obra, verde, nota de marca marcada «por verificar» y ningún control', () => {
  const { dibujar, q, qa, color } = armar();
  dibujar('titulo');
  assert.equal(qa('fieldset').length, 1);
  assert.equal(q('fieldset[data-campo="tipoObra"] .ficha-fijo').textContent, 'Título: no es obra; puede ser marca');
  assert.equal(color(), 'Semáforo: verde');
  assert.ok(q('.nota[data-codigo="N_TITULO"] .por-verificar'));
  assert.equal(qa('input, select, textarea').length, 0);
  assert.equal(q('.ficha-ok').textContent, 'Ninguna regla aplica.');
});

test('una ficha creada dentro muestra las preguntas en orden con sus explicaciones, «ver más» con fuente, prueba sello y nota del sello', () => {
  const { dibujar, q, qa, control, fondo, olas, color } = armar();
  dibujar(fondo.id);
  assert.deepEqual(textos(q('.ficha'), 'legend'), ['Qué obra es', '¿Quién lo hizo?', '¿Quién es titular de los derechos patrimoniales?', '¿Cómo se acredita?', '¿Qué prueba la fecha?']);
  assert.equal(q('fieldset[data-campo="tipoObra"] .ficha-breve').textContent.trim(), contenido.tiposObra.artistica.breve);
  assert.equal(q('fieldset[data-campo="autoria"] .ficha-breve').textContent.trim(), contenido.campos.autoria.breve);
  assert.equal(q('fieldset[data-campo="tipoObra"] details summary').textContent, 'Ver más');
  assert.match(q('fieldset[data-campo="tipoObra"] .ficha-fuente').textContent, /^Fuente: /);
  assert.equal(control(fondo.id, 'autoria', 'yo').checked, true);
  assert.equal(control(fondo.id, 'prueba').value, 'sello');
  assert.equal(color(), 'Semáforo: verde');
  assert.ok(q('.nota[data-codigo="N_SELLO"] .por-verificar'), 'la nota del sello está pendiente');
  assert.equal(qa('fieldset[data-campo="prueba"] .por-verificar').length, 1, 'el campo prueba también');
  dibujar(olas.id);
  assert.ok(q('fieldset[data-campo="tipoObra"] .ficha-breve .por-verificar'), 'fonograma: texto por verificar');
});

test('elegir «otra persona» abre el nombre y el respaldo; el semáforo pasa a rojo; escribir el nombre no redibuja y actualiza la acción', () => {
  const { dibujar, q, control, marcar, eventos, olas, color, codigos } = armar();
  dibujar(olas.id);
  assert.equal(q('fieldset[data-campo="respaldo"]'), null, 'yo y yo: sin respaldo');
  marcar(control(olas.id, 'autoria', 'otra_persona'));
  assert.deepEqual(eventos.at(-1), { tipo: 'cambio', origen: 'ficha' });
  dibujar(olas.id);
  assert.ok(q('fieldset[data-campo="respaldo"]'));
  const nombre = control(olas.id, 'autorNombre');
  assert.ok(nombre);
  assert.equal(color(), 'Semáforo: rojo');
  assert.deepEqual(codigos(), ['R02', 'A08']);
  escribir(nombre, 'Luis');
  assert.deepEqual(eventos.at(-1), { tipo: 'cambio', origen: 'propiedades' });
  assert.equal(control(olas.id, 'autorNombre'), nombre, 'el campo sigue siendo el mismo nodo');
  assert.deepEqual(codigos(), ['R02'], 'A08 desaparece en el lugar');
  assert.equal(q('.razon[data-codigo="R02"] .accion').textContent, 'Qué hacer: Pide a Luis una cesión o una licencia por escrito.');
});

test('con respaldo «licencia» aparece la lista; cada licencia abre sus casillas; «otra» pide texto y condiciones; cambiar el respaldo limpia', () => {
  const { dibujar, q, qa, control, marcar, olas, p, codigos } = armar();
  aplicarCambio(p.fichas[olas.id], 'autoria', 'otra_persona');
  aplicarCambio(p.fichas[olas.id], 'autorNombre', 'Luis');
  dibujar(olas.id);
  marcar(control(olas.id, 'respaldo', 'licencia'));
  dibujar(olas.id);
  const lista = control(olas.id, 'licencia');
  assert.ok(lista);
  assert.equal(lista.querySelectorAll('option').length, 10, 'elige + nueve códigos');
  assert.ok(codigos().includes('A12'));
  escribir(lista, 'CC-BY-SA-4.0');
  dibujar(olas.id);
  assert.ok(control(olas.id, 'licenciaLeida'));
  assert.ok(control(olas.id, 'aceptaCompartirIgual'));
  assert.ok(control(olas.id, 'modificado'), 'subido: se ofrece «lo modifiqué»');
  assert.deepEqual(codigos(), ['A01', 'A03', 'A07']);
  escribir(control(olas.id, 'licencia'), 'OTRA');
  dibujar(olas.id);
  assert.ok(control(olas.id, 'licenciaTexto'));
  assert.equal(qa('.ficha-condiciones input').length, 4);
  assert.ok(codigos().includes('A11'));
  marcar(control(olas.id, 'condicionesOtra', 'NC'));
  assert.deepEqual(p.fichas[olas.id].condicionesOtra, ['NC']);
  marcar(control(olas.id, 'respaldo', 'cesion'));
  dibujar(olas.id);
  assert.equal(control(olas.id, 'licencia'), null);
  assert.equal(p.fichas[olas.id].licencia, null);
  assert.equal(q('fieldset[data-campo="respaldo"] .ficha-breve').textContent.trim(), contenido.campos.respaldo.breve);
});

test('una ficha de biblioteca muestra como texto lo que viene del catálogo; «leí la licencia» la pone en verde y «lo modifiqué» en rojo por ND', () => {
  const { dibujar, q, qa, control, marcar, tema, color, codigos } = armar();
  dibujar(tema.id);
  const fijos = textos(q('.ficha'), '.ficha-fijo');
  assert.ok(fijos.includes('Otra persona'));
  assert.ok(fijos.includes('Autora Ejemplo'));
  assert.ok(fijos.includes('Licencia'));
  assert.ok(fijos.includes('Creative Commons Atribución y sin derivadas 4.0'));
  assert.equal(qa(`input[name="${tema.id}-autoria"]`).length, 0, 'la autoría no se edita');
  assert.equal(control(tema.id, 'credito').value, '«Tema» de Autora Ejemplo, CC BY-ND 4.0');
  assert.equal(color(), 'Semáforo: amarillo');
  assert.deepEqual(codigos(), ['A07']);
  marcar(control(tema.id, 'licenciaLeida'));
  dibujar(tema.id);
  assert.equal(color(), 'Semáforo: verde');
  marcar(control(tema.id, 'modificado'));
  dibujar(tema.id);
  assert.equal(color(), 'Semáforo: rojo');
  assert.deepEqual(codigos(), ['R04']);
});

test('con IA pide la herramienta y la casilla de reconocimiento; al completarlas queda verde con la nota de IA', () => {
  const { dibujar, q, control, marcar, fondo, color, codigos } = armar();
  dibujar(fondo.id);
  marcar(control(fondo.id, 'autoria', 'ia'));
  dibujar(fondo.id);
  assert.ok(control(fondo.id, 'herramientaIA'));
  assert.ok(control(fondo.id, 'reconoceSinDerechos'));
  assert.equal(control(fondo.id, 'aporteHumano'), null);
  assert.equal(color(), 'Semáforo: amarillo');
  assert.deepEqual(codigos(), ['A04', 'A13']);
  escribir(control(fondo.id, 'herramientaIA'), 'Generador X');
  assert.deepEqual(codigos(), ['A04']);
  marcar(control(fondo.id, 'reconoceSinDerechos'));
  dibujar(fondo.id);
  assert.equal(color(), 'Semáforo: verde');
  assert.ok(q('.nota[data-codigo="N_IA"]'));
  marcar(control(fondo.id, 'autoria', 'ia_con_aporte'));
  dibujar(fondo.id);
  assert.ok(control(fondo.id, 'aporteHumano'));
  assert.deepEqual(codigos(), ['A05'], 'la herramienta se conserva entre los dos modos de IA; falta describir el aporte');
  assert.equal(control(fondo.id, 'reconoceSinDerechos'), null, 'la casilla de reconocimiento solo aplica a IA sin aporte');
});

test('A01 y A02 juntas se presentan como una sola razón', () => {
  const { dibujar, olas, p, codigos, color } = armar();
  const ficha = p.fichas[olas.id];
  for (const [campo, valor] of [['autoria', 'otra_persona'], ['autorNombre', 'Luis'], ['titular', 'otra_persona'], ['respaldo', 'licencia'], ['licencia', 'CC-BY-4.0'], ['licenciaLeida', true]]) aplicarCambio(ficha, campo, valor);
  dibujar(olas.id);
  assert.equal(color(), 'Semáforo: amarillo');
  assert.deepEqual(codigos(), ['A01']);
});

test('la ficha de un personaje enlaza a la de su retrato; «basado en obra ajena» pide la autorización (R06, por verificar)', () => {
  const { dibujar, q, control, marcar, ana, retrato, p, selecciones, color, codigos } = armar();
  dibujar(ana.id);
  assert.equal(q('fieldset[data-campo="tipoObra"] .ficha-fijo').textContent, 'Obra literaria');
  clic(q('button[data-accion="ver-retrato"]'));
  assert.deepEqual(selecciones, [{ tipo: 'elemento', id: retrato.id }]);
  assert.equal(control(ana.id, 'autorizacionDerivada'), null);
  marcar(control(ana.id, 'basadoEnObraAjena'));
  dibujar(ana.id);
  assert.ok(control(ana.id, 'autorizacionDerivada'));
  assert.equal(color(), 'Semáforo: rojo');
  assert.deepEqual(codigos(), ['R06']);
  assert.ok(q('.razon[data-codigo="R06"] .por-verificar'));
  marcar(control(ana.id, 'autorizacionDerivada'));
  dibujar(ana.id);
  assert.equal(color(), 'Semáforo: verde');
  const sombra = agregarPersonaje(p, { nombre: 'Sombra' });
  dibujar(sombra.id);
  assert.equal(q('button[data-accion="ver-retrato"]'), null);
  assert.match(q('fieldset[data-campo="tipoObra"] .ayuda').textContent, /retrato/);
  dibujar('no_existe');
  assert.match(q('.vacio').textContent, /ya no existe/);
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/panel-ficha.test.js`
Expected: falla al importar `panel-ficha.js`.

- [ ] **Step 3: Escribir `plataforma/js/editor/panel-ficha.js`**

```js
// plataforma/js/editor/panel-ficha.js
// La ficha jurídica en pantalla (spec, secciones 12.2, 12.3, 12.4 y 12.9): seis
// campos con su explicación breve y «ver más» (texto completo y fuente), y el
// resultado del semáforo con razones, acciones y notas. Qué se muestra y qué se
// limpia lo decide juridico/formulario.js; aquí solo se dibuja.
// Los textos pendientes de verificación llevan la marca «Por verificar» (spec 19.13).
import { h, vaciar } from '../ui/dom.js';
import { evaluar } from '../juridico/semaforo.js';
import { describir } from '../juridico/textos.js';
import { visibles, aplicarCambio, ETIQUETAS, PREGUNTAS, LICENCIAS_ELEGIBLES } from '../juridico/formulario.js';
import { LICENCIAS, CONDICIONES } from '../juridico/licencias.js';
import { TIPOS_OBRA } from '../juridico/ficha.js';

export const NOMBRES_COLOR = { verde: 'verde', amarillo: 'amarillo', rojo: 'rojo' };

export function marcaPorVerificar(entrada) {
  if (entrada?.verificacion !== 'pendiente') return null;
  return h('span', { class: 'por-verificar', title: 'Texto pendiente de verificación jurídica' }, 'Por verificar');
}

/** Punto de color con nombre accesible. */
export function puntoSemaforo(color, etiqueta = 'Semáforo') {
  return h('span', { class: `punto-semaforo semaforo-${color}`, role: 'img', 'aria-label': `${etiqueta}: ${NOMBRES_COLOR[color] ?? color}` });
}

function verMas(entrada) {
  return h('details', { class: 'ficha-mas' }, h('summary', {}, 'Ver más'), h('p', {}, entrada.completo), h('p', { class: 'ficha-fuente' }, 'Fuente: ', entrada.fuente));
}

/** Explicación de un campo o tipo de obra: breve, marca de verificación y «ver más». */
export function explicacion(entrada) {
  if (!entrada) return null;
  return h('div', { class: 'ficha-explicacion' }, h('p', { class: 'ficha-breve' }, entrada.breve, ' ', marcaPorVerificar(entrada)), verMas(entrada));
}

/**
 * @param {object} sesion de crearSesion
 * @param {string} idFicha 'titulo' | 'historia' | id de personaje | id de elemento
 * @param {{ contenido: object, alSeleccionar?: (seleccion: object) => void, titulo?: string }} opciones
 * @returns {HTMLElement}
 */
export function panelFicha(sesion, idFicha, { contenido, alSeleccionar = () => {}, titulo = 'Ficha jurídica' }) {
  const ficha = sesion.proyecto.fichas[idFicha];
  if (!ficha) return h('section', { class: 'ficha' }, h('h3', {}, titulo), h('p', { class: 'vacio' }, 'Esta ficha ya no existe.'));
  const { juego } = sesion.proyecto;
  const v = visibles(ficha);
  const fijo = (campo) => v.soloLectura.includes(campo);
  const clave = (campo, extra = '') => `ficha:${idFicha}:${campo}${extra ? `:${extra}` : ''}`;
  const cambiarOpcion = (campo, valor) => sesion.cambiar(() => aplicarCambio(ficha, campo, valor), { origen: 'ficha' });
  const cambiarTexto = (campo) => (e) => {
    sesion.cambiar(() => aplicarCambio(ficha, campo, e.target.value), { origen: 'propiedades' });
    pintarResultado();
  };
  const resultado = h('div', { class: 'ficha-resultado', 'aria-live': 'polite' });

  function razonNodo(r, clase) {
    return h('li', { class: clase, dataset: { codigo: r.codigo } },
      h('p', {}, r.breve, ' ', marcaPorVerificar(r)),
      r.accion ? h('p', { class: 'accion' }, h('strong', {}, 'Qué hacer: '), r.accion) : null,
      verMas(r));
  }

  function pintarResultado() {
    const descrito = describir(evaluar(ficha, { destino: sesion.proyecto.juego.destino }), ficha, contenido);
    const hayA01 = descrito.razones.some((r) => r.codigo === 'A01');
    const razones = hayA01 ? descrito.razones.filter((r) => r.codigo !== 'A02') : descrito.razones;
    vaciar(resultado).append(
      h('p', { class: 'ficha-color' }, puntoSemaforo(descrito.color), ' ', h('strong', {}, `Semáforo: ${NOMBRES_COLOR[descrito.color]}`)),
      razones.length ? h('ul', { class: 'ficha-razones' }, razones.map((r) => razonNodo(r, 'razon'))) : h('p', { class: 'ficha-ok' }, 'Ninguna regla aplica.'),
      descrito.notas.length ? h('ul', { class: 'ficha-notas' }, descrito.notas.map((n) => razonNodo(n, 'nota'))) : null,
    );
  }

  // ---- controles ----
  const grupo = (campo, hijos) => h('fieldset', { class: 'ficha-campo', dataset: { campo } }, h('legend', {}, PREGUNTAS[campo]), explicacion(contenido.campos?.[campo]), hijos);

  function radios(campo) {
    if (fijo(campo)) return h('p', { class: 'ficha-fijo' }, ETIQUETAS[campo][ficha[campo]] ?? ficha[campo]);
    return h('div', { class: 'ficha-radios', role: 'radiogroup', 'aria-label': PREGUNTAS[campo] }, Object.entries(ETIQUETAS[campo]).map(([valor, texto]) =>
      h('label', { class: 'ficha-radio' }, h('input', { type: 'radio', name: `${idFicha}-${campo}`, value: valor, checked: ficha[campo] === valor, dataset: { foco: clave(campo, valor) }, onchange: () => cambiarOpcion(campo, valor) }), ' ', texto)));
  }

  function casilla(campo, texto) {
    return h('label', { class: 'ficha-casilla' }, h('input', { type: 'checkbox', checked: ficha[campo] === true, dataset: { foco: clave(campo) }, onchange: (e) => cambiarOpcion(campo, e.target.checked) }), ' ', texto);
  }

  function campoTexto(campo, etiqueta, { area = false, placeholder = '' } = {}) {
    if (fijo(campo)) return h('p', { class: 'ficha-fijo' }, ficha[campo]?.trim() || '—');
    const id = `${idFicha}-${campo}`;
    const control = area
      ? h('textarea', { id, rows: 2, value: ficha[campo] ?? '', placeholder, dataset: { foco: clave(campo) }, oninput: cambiarTexto(campo) })
      : h('input', { type: 'text', id, value: ficha[campo] ?? '', placeholder, dataset: { foco: clave(campo) }, oninput: cambiarTexto(campo) });
    return h('div', { class: 'campo' }, h('label', { for: id, class: 'campo-etiqueta' }, etiqueta), control);
  }

  function selectorLicencia() {
    if (fijo('licencia')) return h('p', { class: 'ficha-fijo' }, LICENCIAS[ficha.licencia]?.nombre ?? ficha.licencia ?? '—');
    const id = `${idFicha}-licencia`;
    const select = h('select', { id, dataset: { foco: clave('licencia') }, onchange: (e) => cambiarOpcion('licencia', e.target.value || null) },
      h('option', { value: '' }, 'Elige la licencia'),
      LICENCIAS_ELEGIBLES.map((codigo) => h('option', { value: codigo }, LICENCIAS[codigo].nombre)));
    select.value = ficha.licencia ?? '';
    return h('div', { class: 'campo' }, h('label', { for: id, class: 'campo-etiqueta' }, 'Cuál'), select);
  }

  function condiciones() {
    return h('div', { class: 'ficha-condiciones', role: 'group', 'aria-label': 'Condiciones de la licencia' }, CONDICIONES.map((c) =>
      h('label', { class: 'ficha-casilla' }, h('input', { type: 'checkbox', checked: ficha.condicionesOtra.includes(c), dataset: { foco: clave('condicionesOtra', c) }, onchange: (e) => {
        const nuevas = e.target.checked ? [...ficha.condicionesOtra, c] : ficha.condicionesOtra.filter((x) => x !== c);
        cambiarOpcion('condicionesOtra', nuevas);
      } }), ' ', ETIQUETAS.condiciones[c])));
  }

  function selectorPrueba() {
    const id = `${idFicha}-prueba`;
    const select = h('select', { id, dataset: { foco: clave('prueba') }, onchange: (e) => cambiarOpcion('prueba', e.target.value) },
      Object.entries(ETIQUETAS.prueba).map(([valor, texto]) => h('option', { value: valor }, texto)));
    select.value = ficha.prueba;
    return h('div', { class: 'campo' }, h('label', { for: id, class: 'campo-etiqueta' }, 'Prueba'), select);
  }

  function enlaceRetrato() {
    if (ficha.tipo !== 'personaje') return null;
    const personaje = juego.personajes.find((p) => p.id === idFicha);
    if (!personaje?.retrato) return h('p', { class: 'ayuda' }, 'Su retrato tendrá su propia ficha cuando se lo asignes.');
    return h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'ver-retrato' }, onclick: () => alSeleccionar({ tipo: 'elemento', id: personaje.retrato }) }, 'Ver la ficha del retrato');
  }

  // ---- secciones ----
  const secciones = [
    h('fieldset', { class: 'ficha-campo', dataset: { campo: 'tipoObra' } },
      h('legend', {}, PREGUNTAS.tipoObra),
      h('p', { class: 'ficha-fijo' }, TIPOS_OBRA[ficha.tipoObra]?.nombre ?? ficha.tipoObra),
      explicacion(contenido.tiposObra?.[ficha.tipoObra]),
      enlaceRetrato()),
  ];
  if (v.autoria) {
    secciones.push(grupo('autoria', [
      radios('autoria'),
      v.autorNombre ? campoTexto('autorNombre', 'Nombre de la persona') : null,
      v.herramientaIA ? campoTexto('herramientaIA', 'Herramienta de IA') : null,
      v.aporteHumano ? campoTexto('aporteHumano', 'Describe tu aporte creativo', { area: true }) : null,
      v.reconoceSinDerechos ? casilla('reconoceSinDerechos', 'Entiendo que no puedo reclamar derechos sobre este elemento y lo declaro en los créditos') : null,
      v.basadoEnObraAjena ? casilla('basadoEnObraAjena', '¿Está basado en una obra ajena? (adaptación, versión de una canción, fan art)') : null,
      v.autorizacionDerivada ? casilla('autorizacionDerivada', 'Tengo autorización por escrito del autor de la obra original') : null,
    ]));
  }
  if (v.titular) secciones.push(grupo('titular', [radios('titular')]));
  if (v.respaldo) {
    secciones.push(grupo('respaldo', [
      radios('respaldo'),
      v.licencia ? selectorLicencia() : null,
      v.licenciaTexto ? campoTexto('licenciaTexto', 'Describe la licencia', { area: true }) : null,
      v.condicionesOtra ? condiciones() : null,
      v.licenciaLeida ? casilla('licenciaLeida', 'Leí la licencia') : null,
      v.aceptaCompartirIgual ? casilla('aceptaCompartirIgual', 'Acepto licenciar mi juego igual') : null,
      v.modificado ? casilla('modificado', 'Lo modifiqué') : null,
    ]));
  }
  if (v.credito) secciones.push(grupo('credito', [campoTexto('credito', 'Crédito tal como saldrá en la pantalla de créditos')]));
  if (v.prueba) secciones.push(grupo('prueba', [selectorPrueba()]));

  pintarResultado();
  // La sección es enfocable (tabIndex -1) para que «Ver ficha» del mapa y la subida puedan llevar el foco a ella.
  return h('section', { class: `ficha ficha-${ficha.tipo}`, tabIndex: -1, dataset: { ficha: idFicha, foco: `ficha:${idFicha}` }, 'aria-label': titulo }, h('h3', {}, titulo), resultado, secciones);
}
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/panel-ficha.test.js`
Expected: `# pass 8`.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/editor/panel-ficha.js tests/panel-ficha.test.js
git commit -m "Editor: panel de ficha con seis campos, explicaciones, ver más, semáforo con razones y notas" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Puntos de semáforo en el inventario

**Files:**
- Modify: `plataforma/js/editor/inventario.js`
- Modify: `tests/inventario.test.js`

- [ ] **Step 1: Escribir la prueba que falla**

Al final de `tests/inventario.test.js`:

```js
test('los puntos de semáforo de personajes y elementos llevan el color y un nombre accesible', () => {
  const { contenedor, inventario, ana, fondo } = armar();
  inventario.dibujar(null);
  const puntoAna = contenedor.querySelector(`.punto-semaforo[data-ficha="${ana.id}"]`);
  assert.ok(puntoAna.classList.contains('semaforo-verde'));
  assert.equal(puntoAna.getAttribute('aria-label'), 'Semáforo de Ana: verde');
  const puntoFondo = contenedor.querySelector(`.punto-semaforo[data-ficha="${fondo.id}"]`);
  assert.ok(puntoFondo.classList.contains('semaforo-amarillo'), 'subido, hecho por mí y sin prueba: A06');
  assert.equal(puntoFondo.getAttribute('aria-label'), 'Semáforo de Muelle: amarillo');
  assert.equal(contenedor.querySelectorAll('.punto-semaforo').length, 4, 'dos personajes y dos elementos');
});
```

- [ ] **Step 2: Correr la prueba para ver que falla**

Run: `node --test tests/inventario.test.js`
Expected: 1 falla (`semaforo-verde` no está).

- [ ] **Step 3: Cambiar `inventario.js`**

Agregar a las importaciones:

```js
import { evaluarTodo } from '../juridico/semaforo.js';
import { puntoSemaforo } from './panel-ficha.js';
```

En `dibujar`, después de `const avisos = validar(juego);`:

```js
    const semaforos = evaluarTodo(sesion.proyecto);
    const punto = (id, nombre) => {
      const nodo = puntoSemaforo(semaforos.get(id)?.color ?? 'verde', `Semáforo de ${nombre}`);
      nodo.dataset.ficha = id;
      return nodo;
    };
```

Y reemplazar las dos marcas `h('span', { class: 'punto-semaforo', dataset: { ficha: personaje.id } })` y `h('span', { class: 'punto-semaforo', dataset: { ficha: elemento.id } })` por `punto(personaje.id, personaje.nombre?.trim() || 'Sin nombre')` y `punto(elemento.id, elemento.nombre?.trim() || 'Sin nombre')`.

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/inventario.test.js`
Expected: `# pass 6`.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/editor/inventario.js tests/inventario.test.js
git commit -m "Inventario: puntos de semáforo con color y nombre accesible" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Fichas en el panel de propiedades y foco en una ficha

**Files:**
- Modify: `plataforma/js/editor/propiedades.js`
- Modify: `tests/propiedades.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

Al final de `tests/propiedades.test.js`:

```js
test('El juego muestra las fichas del título y de la historia debajo de sus propiedades', async () => {
  const { contenedor, propiedades } = await armar();
  propiedades.dibujar({ tipo: 'juego' });
  const fichas = [...contenedor.querySelectorAll('section.ficha')];
  assert.deepEqual(fichas.map((f) => f.dataset.ficha), ['titulo', 'historia']);
  assert.deepEqual(fichas.map((f) => f.querySelector('h3').textContent), ['Ficha del título', 'Ficha de la historia']);
  assert.equal(fichas[0].querySelector('.ficha-color strong').textContent, 'Semáforo: verde');
  assert.ok(fichas[1].querySelector('fieldset[data-campo="autoria"]'), 'la historia sí tiene campos');
});

test('personaje y elemento muestran su ficha; enfocar lleva el foco a «¿Quién lo hizo?»', async () => {
  const { contenedor, propiedades, sesion, ana, fondo } = await armar();
  propiedades.dibujar({ tipo: 'personaje', id: ana.id });
  assert.equal(contenedor.querySelector('section.ficha').dataset.ficha, ana.id);
  assert.equal(contenedor.querySelector('section.ficha h3').textContent, 'Ficha jurídica del personaje');
  propiedades.dibujar({ tipo: 'elemento', id: fondo.id }, { enfocar: `ficha:${fondo.id}:autoria` });
  assert.equal(contenedor.querySelector('section.ficha h3').textContent, 'Ficha jurídica del elemento');
  assert.equal(document.activeElement, contenedor.querySelector(`[data-foco="ficha:${fondo.id}:autoria:yo"]`));
  propiedades.dibujar({ tipo: 'elemento', id: fondo.id }, { enfocar: `ficha:${fondo.id}` });
  assert.equal(document.activeElement, contenedor.querySelector('section.ficha'), 'sin campo, el foco va a la ficha entera');
  propiedades.dibujar({ tipo: 'escena', id: sesion.proyecto.juego.escenas[0].id });
  assert.equal(contenedor.querySelector('section.ficha'), null, 'una escena no tiene ficha');
  contenedor.remove();
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/propiedades.test.js`
Expected: 2 fallan (no hay `section.ficha`).

- [ ] **Step 3: Cambiar `propiedades.js`**

Agregar la importación:

```js
import { panelFicha } from './panel-ficha.js';
```

En `crearPropiedades`, justo después de `const cambiar = ...`:

```js
  const ficha = (id, titulo) => panelFicha(sesion, id, { contenido: contenido ?? {}, alSeleccionar, titulo });
```

En `deJuego`, agregar al final de los hijos de `panel('El juego', ...)` (después del `areaTexto` de la sinopsis):

```js
      ficha('titulo', 'Ficha del título'),
      ficha('historia', 'Ficha de la historia'),
```

En `dePersonaje`, después del `h('div', { class: 'acciones' }, ...)`:

```js
      ficha(personaje.id, 'Ficha jurídica del personaje'),
```

En `deElemento`, después del `h('div', { class: 'acciones' }, ...)`:

```js
      ficha(elemento.id, 'Ficha jurídica del elemento'),
```

Y cambiar la firma de `dibujar` para aceptar el foco:

```js
  function dibujar(seleccion, { enfocar = null } = {}) {
    conservarFoco(contenedor, () => {
      // (el cuerpo queda igual)
    });
    if (enfocar) contenedor.querySelector(`[data-foco^="${enfocar}"]`)?.focus();
  }
```

- [ ] **Step 4: Correr las pruebas para ver que pasan**

Run: `node --test tests/propiedades.test.js`
Expected: `# pass 8`.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/editor/propiedades.js tests/propiedades.test.js
git commit -m "Propiedades: fichas del título, la historia, personajes y elementos; foco en una ficha" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Mapa de activos y su botón en la barra

**Files:**
- Modify: `plataforma/js/editor/barra.js`
- Modify: `tests/barra.test.js`
- Create: `plataforma/js/editor/mapa-activos.js`
- Create: `tests/mapa-activos.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

En `tests/barra.test.js`, en `armar`, agregar `alMapa: () => llamadas.push('mapa'),` a las opciones de `crearBarra`, y en la primera prueba cambiar el recorrido y lo esperado a:

```js
  for (const accion of ['jugar', 'mapa', 'guardar-copia', 'abrir-copia', 'nuevo-juego']) clic(boton(accion));
  assert.deepEqual(llamadas, ['jugar', 'mapa', 'guardar-copia', 'abrir-copia', 'nuevo-juego']);
```

Crear `tests/mapa-activos.test.js`:

```js
// tests/mapa-activos.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { instalarDom, clic, teclear, textos } from './ayudas/dom.js';
import { sesionDePrueba } from './ayudas/sesion.js';
import { proyectoPublicable } from './ayudas/proyecto.js';
import { crearMapaActivos } from '../plataforma/js/editor/mapa-activos.js';

instalarDom();
const contenido = JSON.parse(readFileSync(new URL('../plataforma/contenido/juridico.json', import.meta.url), 'utf8'));

function armar() {
  const { p, tema } = proyectoPublicable();
  const { sesion } = sesionDePrueba(p);
  const llamadas = [];
  const contenedor = document.createElement('div');
  contenedor.hidden = true;
  document.body.append(contenedor);
  const mapa = crearMapaActivos(contenedor, sesion, {
    contenido,
    alSeleccionar: (seleccion, enfocar) => llamadas.push(['seleccionar', seleccion, enfocar]),
    alCerrar: () => llamadas.push(['cerrar']),
  });
  return { sesion, p, tema, contenedor, mapa, llamadas };
}

test('abrir dibuja la tabla con una fila por ficha, el resumen y el foco en Cerrar', () => {
  const { contenedor, mapa, p } = armar();
  mapa.abrir();
  assert.equal(contenedor.hidden, false);
  assert.ok(mapa.abierto);
  assert.deepEqual(textos(contenedor, 'thead th'), ['Activo', '¿Quién lo creó?', 'Contrato o licencia', 'Prueba', 'Riesgo', 'Acción', '']);
  assert.equal(contenedor.querySelectorAll('tbody tr').length, 9);
  assert.equal(contenedor.querySelector('.mapa-resumen').textContent, '9 activos: 9 en verde, 0 en amarillo, 0 en rojo.');
  const filaTema = contenedor.querySelector('tbody tr:nth-child(8)');
  assert.deepEqual(textos(filaTema, 'td').slice(0, 4), ['TemaMúsica', 'Autora Ejemplo', 'Creative Commons Atribución y no comercial 4.0', 'Ninguna']);
  assert.equal(filaTema.querySelector('.punto-semaforo').getAttribute('aria-label'), 'Riesgo de Tema: verde');
  assert.equal(filaTema.querySelectorAll('td')[5].textContent, 'Nada por hacer');
  assert.ok(contenedor.querySelector('tbody tr:first-child .por-verificar'), 'el título tiene un texto por verificar');
  assert.equal(document.activeElement, contenedor.querySelector('button[data-accion="cerrar-mapa"]'));
  p.juego.destino = 'venta';
  mapa.dibujar();
  assert.equal(contenedor.querySelector('.mapa-resumen').textContent, '9 activos: 8 en verde, 0 en amarillo, 1 en rojo.');
  assert.deepEqual(textos(contenedor.querySelector('tbody tr:nth-child(8)'), '.mapa-acciones li'), [contenido.reglas.R03.accion]);
  contenedor.remove();
});

test('«Ver ficha» cierra el mapa y pide la selección con el foco en la ficha', () => {
  const { contenedor, mapa, llamadas, tema, p } = armar();
  mapa.abrir();
  clic(contenedor.querySelector('tbody tr:first-child button[data-accion="ver-ficha"]'));
  assert.equal(contenedor.hidden, true);
  assert.deepEqual(llamadas, [['cerrar'], ['seleccionar', { tipo: 'juego' }, 'ficha:titulo']]);
  mapa.abrir();
  clic(contenedor.querySelector('tbody tr:nth-child(8) button[data-accion="ver-ficha"]'));
  assert.deepEqual(llamadas.at(-1), ['seleccionar', { tipo: 'elemento', id: tema.id }, `ficha:${tema.id}`]);
  mapa.abrir();
  clic(contenedor.querySelector('tbody tr:nth-child(3) button[data-accion="ver-ficha"]'));
  assert.deepEqual(llamadas.at(-1), ['seleccionar', { tipo: 'personaje', id: p.juego.personajes[0].id }, `ficha:${p.juego.personajes[0].id}`]);
  contenedor.remove();
});

test('Cerrar y Escape cierran y avisan; cerrado, dibujar no hace nada', () => {
  const { contenedor, mapa, llamadas } = armar();
  mapa.dibujar();
  assert.equal(contenedor.childNodes.length, 0);
  mapa.abrir();
  clic(contenedor.querySelector('button[data-accion="cerrar-mapa"]'));
  assert.equal(contenedor.hidden, true);
  assert.equal(contenedor.childNodes.length, 0);
  assert.deepEqual(llamadas, [['cerrar']]);
  mapa.cerrar();
  assert.deepEqual(llamadas, [['cerrar']], 'cerrar dos veces no avisa dos veces');
  mapa.abrir();
  teclear(contenedor.querySelector('.mapa'), 'Escape');
  assert.equal(contenedor.hidden, true);
  assert.deepEqual(llamadas, [['cerrar'], ['cerrar']]);
  contenedor.remove();
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/barra.test.js tests/mapa-activos.test.js`
Expected: barra falla (no hay botón `mapa`); mapa-activos falla al importar.

- [ ] **Step 3: Cambiar `barra.js`**

La firma pasa a `crearBarra(contenedor, sesion, { alJugar, alMapa, alGuardarCopia, alAbrirCopia, alNuevoJuego, alPublicar })` y, en `barra-acciones`, después de `boton('jugar', 'Jugar', alJugar, 'btn-primary'),` agregar:

```js
          boton('mapa', 'Mapa de activos', alMapa),
```

Y en el comentario de cabecera quitar la frase ««Mapa de activos» llega con el plan 3.».

- [ ] **Step 4: Escribir `plataforma/js/editor/mapa-activos.js`**

```js
// plataforma/js/editor/mapa-activos.js
// El mapa de activos (spec, sección 12.8) sobre el editor: la tabla del taller, llena
// sola, con enlace a cada ficha. Las filas salen de juridico/mapa.js.
import { h, vaciar } from '../ui/dom.js';
import { filas } from '../juridico/mapa.js';
import { puntoSemaforo, NOMBRES_COLOR } from './panel-ficha.js';

const COLUMNAS = ['Activo', '¿Quién lo creó?', 'Contrato o licencia', 'Prueba', 'Riesgo', 'Acción', ''];

/**
 * @param {HTMLElement} contenedor capa oculta hasta abrir()
 * @param {object} sesion de crearSesion
 * @param {{ contenido: object, alSeleccionar: (seleccion: object, enfocar: string) => void, alCerrar?: () => void }} opciones
 */
export function crearMapaActivos(contenedor, sesion, { contenido, alSeleccionar, alCerrar = () => {} }) {
  let abierto = false;

  function seleccionDe(fila) {
    if (fila.id === 'titulo' || fila.id === 'historia') return { seleccion: { tipo: 'juego' }, enfocar: `ficha:${fila.id}` };
    const esPersonaje = sesion.proyecto.juego.personajes.some((p) => p.id === fila.id);
    return { seleccion: { tipo: esPersonaje ? 'personaje' : 'elemento', id: fila.id }, enfocar: `ficha:${fila.id}` };
  }

  function verFicha(fila) {
    cerrar();
    const { seleccion, enfocar } = seleccionDe(fila);
    alSeleccionar(seleccion, enfocar);
  }

  function dibujar() {
    const lista = filas(sesion.proyecto, contenido);
    const cuenta = { verde: 0, amarillo: 0, rojo: 0 };
    for (const fila of lista) cuenta[fila.color] += 1;
    vaciar(contenedor).append(h('div', { class: 'mapa', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mapa-titulo', onkeydown: (e) => { if (e.key === 'Escape') cerrar(); } },
      h('div', { class: 'mapa-cabecera' },
        h('div', {},
          h('h2', { id: 'mapa-titulo' }, 'Mapa de activos'),
          h('p', { class: 'mapa-resumen' }, `${lista.length} activos: ${cuenta.verde} en verde, ${cuenta.amarillo} en amarillo, ${cuenta.rojo} en rojo.`)),
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'cerrar-mapa' }, onclick: cerrar }, 'Cerrar')),
      h('div', { class: 'table-wrap' }, h('table', { class: 'mapa-tabla' },
        h('thead', {}, h('tr', {}, COLUMNAS.map((texto) => h('th', { scope: 'col' }, texto)))),
        h('tbody', {}, lista.map((fila) => h('tr', { dataset: { ficha: fila.id }, class: `riesgo-${fila.color}` },
          h('td', {}, h('strong', {}, fila.activo), h('span', { class: 'mapa-tipo' }, fila.tipo)),
          h('td', {}, fila.creador),
          h('td', {}, fila.contrato),
          h('td', {}, fila.prueba),
          h('td', {}, puntoSemaforo(fila.color, `Riesgo de ${fila.activo}`), ' ', NOMBRES_COLOR[fila.color], ' ',
            fila.porVerificar ? h('span', { class: 'por-verificar', title: 'Algún texto de esta fila está pendiente de verificación jurídica' }, 'Por verificar') : null),
          h('td', {}, fila.acciones.length ? h('ul', { class: 'mapa-acciones' }, fila.acciones.map((a) => h('li', {}, a))) : 'Nada por hacer'),
          h('td', {}, h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'ver-ficha' }, onclick: () => verFicha(fila) }, 'Ver ficha'))))))));
    contenedor.querySelector('button[data-accion="cerrar-mapa"]')?.focus();
  }

  function abrir() {
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

  return {
    abrir,
    cerrar,
    dibujar: () => { if (abierto) dibujar(); },
    get abierto() { return abierto; },
  };
}
```

- [ ] **Step 5: Correr las pruebas para ver que pasan**

Run: `node --test tests/barra.test.js tests/mapa-activos.test.js`
Expected: `# pass 6` (3 + 3).

- [ ] **Step 6: Commit**

```bash
git add plataforma/js/editor/barra.js tests/barra.test.js plataforma/js/editor/mapa-activos.js tests/mapa-activos.test.js
git commit -m "Mapa de activos sobre el editor, con botón en la barra y enlace a cada ficha" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: El editor: mapa, créditos reales, anuncios de semáforo, foco al subir y estilos

**Files:**
- Modify: `plataforma/js/editor/editor.js`
- Modify: `tests/editor.test.js`
- Modify: `plataforma/css/editor.css`

- [ ] **Step 1: Cambiar las pruebas de `tests/editor.test.js`**

Quitar `creditosProvisionales` de la importación de `editor.js` y borrar la prueba `creditosProvisionales nombra al estudiante...`. Agregar al final:

```js
test('el reproductor muestra los créditos que salen de las fichas', () => {
  const { p } = proyectoPublicable();
  const { contenedor, q } = armar({ proyecto: p });
  clic(q('button[data-accion="jugar"]'));
  clic(q('.capa-reproductor button[data-accion="creditos"]'));
  assert.deepEqual(textos(contenedor, '.escenario-creditos li'), ['Camila R.: autor(a) del juego y de la historia', '«Tema» de Autora Ejemplo, CC BY-NC 4.0']);
  clic(q('.capa-reproductor button[data-accion="cerrar"]'));
  contenedor.remove();
});

test('Mapa de activos abre la capa; «Ver ficha» la cierra y abre la ficha con el foco en ella', () => {
  const { p, tema } = proyectoPublicable();
  const { contenedor, q } = armar({ proyecto: p });
  clic(q('button[data-accion="mapa"]'));
  assert.equal(q('.capa-mapa').hidden, false);
  assert.ok(document.body.classList.contains('con-mapa'));
  assert.equal(q('.capa-mapa tbody').children.length, 9);
  clic(q(`.capa-mapa tr[data-ficha="${tema.id}"] button[data-accion="ver-ficha"]`));
  assert.equal(q('.capa-mapa').hidden, true);
  assert.ok(!document.body.classList.contains('con-mapa'));
  assert.equal(q('.propiedades h2').textContent, 'Música');
  assert.equal(document.activeElement, q(`section.ficha[data-ficha="${tema.id}"]`), 'el foco queda en la ficha');
  clic(q('button[data-accion="mapa"]'));
  clic(q('.capa-mapa button[data-accion="cerrar-mapa"]'));
  assert.equal(document.activeElement, q('button[data-accion="mapa"]'), 'cerrar devuelve el foco al botón');
  contenedor.remove();
});

test('al subir un archivo la ficha se abre con el foco en «¿Quién lo hizo?»', async () => {
  const png = { name: 'ana.png', type: 'image/png', size: 10, arrayBuffer: async () => new TextEncoder().encode('png').buffer };
  const { p } = proyectoConLineas();
  const { sesion, contenedor, editor, q } = armar({ proyecto: p, archivoElegido: png });
  const pendiente = editor.subirArchivo();
  await new Promise((r) => setTimeout(r, 0));
  clic(q('.dialogo button[data-tipo="retrato"]'));
  await pendiente;
  const elemento = sesion.proyecto.juego.elementos[0];
  assert.equal(document.activeElement, q(`[data-foco="ficha:${elemento.id}:autoria:yo"]`));
  contenedor.remove();
});

test('cambiar el destino recalcula los semáforos y anuncia los que cambian de color', () => {
  const { p, tema } = proyectoPublicable();
  const { contenedor, q, qa } = armar({ proyecto: p });
  clic(qa('.inventario button.entrada')[0]);
  escribir(q('[data-foco="destino"]'), 'venta');
  assert.ok(q(`.punto-semaforo[data-ficha="${tema.id}"]`).classList.contains('semaforo-rojo'));
  assert.equal(document.getElementById('anuncios').textContent, 'Semáforo de «Tema»: rojo');
  escribir(q('[data-foco="destino"]'), 'gratis');
  assert.equal(document.getElementById('anuncios').textContent, 'Semáforo de «Tema»: verde');
  assert.ok(q('section.ficha[data-ficha="titulo"]'), 'El juego muestra sus fichas');
  contenedor.remove();
});
```

- [ ] **Step 2: Correr las pruebas para ver que fallan**

Run: `node --test tests/editor.test.js`
Expected: las cuatro nuevas fallan.

- [ ] **Step 3: Cambiar `editor.js`**

Importaciones: quitar nada; agregar:

```js
import { evaluarTodo } from '../juridico/semaforo.js';
import { creditos } from '../juridico/cadena.js';
import { nombreDe } from '../estado/validacion.js';
import { crearMapaActivos } from './mapa-activos.js';
```

Borrar la función `creditosProvisionales` entera (y su comentario).

En la estructura de la página, después de `const zonaReproductor = ...`:

```js
  const zonaMapa = h('div', { class: 'capa-mapa', hidden: true });
```

y agregar `zonaMapa,` a la lista de `vaciar(contenedor).append(...)`, antes de `zonaReproductor`.

En las vistas, la barra recibe `alMapa`:

```js
  const barra = crearBarra(zonaBarra, sesion, {
    alJugar: () => jugarDesde(sesion.proyecto.juego.escenaInicial),
    alMapa: () => abrirMapa(),
    alGuardarCopia: guardarCopia,
    alAbrirCopia: abrirCopia,
    alNuevoJuego: nuevoJuego,
    alPublicar: () => avisar('La publicación llega en una versión siguiente. Por ahora el candado te dice qué falta.'),
  });
```

Y después de `const propiedades = ...`:

```js
  const mapa = crearMapaActivos(zonaMapa, sesion, {
    contenido: contenido ?? {},
    alSeleccionar: (s, enfocar) => seleccionar(s, { enfocar }),
    alCerrar: () => {
      document.body.classList.remove('con-mapa');
      zonaBarra.querySelector('[data-accion="mapa"]')?.focus();
    },
  });

  function abrirMapa() {
    document.body.classList.add('con-mapa');
    mapa.abrir();
  }
```

`seleccionar` acepta el foco y se lo pasa a propiedades:

```js
  function seleccionar(nueva, { redibujarGuion = true, enfocar = null } = {}) {
    seleccion = normalizar(nueva);
    const { juego } = sesion.proyecto;
    const escenaId = escenaDe(seleccion);
    const cambioEscena = escenaId !== null && escenaId !== escenaActivaId;
    if (escenaId !== null) escenaActivaId = escenaId;
    if (!juego.escenas.some((e) => e.id === escenaActivaId)) escenaActivaId = juego.escenas[0]?.id ?? null;
    const indice = seleccion.tipo === 'linea' ? seleccion.indice : null;
    inventario.dibujar(seleccion);
    vistaPrevia.dibujar(escenaActiva(), indice);
    propiedades.dibujar(seleccion, { enfocar });
    if (cambioEscena || redibujarGuion) guion.dibujar(escenaActiva(), indice);
    else guion.marcarSeleccion(indice);
    botonJugarAqui.disabled = !escenaActiva();
  }
```

`refrescar` redibuja también el mapa (si está abierto) y anuncia los semáforos que cambiaron de color:

```js
  const coloresDe = () => new Map([...evaluarTodo(sesion.proyecto)].map(([id, r]) => [id, r.color]));
  let colores = coloresDe();

  function anunciarSemaforos() {
    const nuevos = coloresDe();
    const cambios = [...nuevos].filter(([id, color]) => colores.has(id) && colores.get(id) !== color);
    colores = nuevos;
    if (cambios.length) anunciar(cambios.map(([id, color]) => `Semáforo de «${nombreDe(sesion.proyecto, id)}»: ${color}`).join('. '));
  }

  function refrescar({ origen, estructura }) {
    const indice = seleccion?.tipo === 'linea' ? seleccion.indice : null;
    barra.dibujar();
    inventario.dibujar(seleccion);
    vistaPrevia.dibujar(escenaActiva(), indice);
    if (estructura || origen !== 'propiedades') propiedades.dibujar(seleccion);
    if (estructura || origen !== 'guion') guion.dibujar(escenaActiva(), indice);
    mapa.dibujar();
    anunciarSemaforos();
  }
```

En el suscriptor, en el caso `'reemplazo'`, antes de `seleccionar(null);` agregar `colores = coloresDe();`.

En `jugarDesde`, reemplazar `creditos: creditosProvisionales(sesion.proyecto),` por `creditos: creditos(sesion.proyecto),`. En `cerrarReproductor` no cambia nada; en `abrirCopia` y `nuevoJuego`, antes de `cerrarReproductor();` agregar `mapa.cerrar();`.

En `subirArchivo`, reemplazar `seleccionar({ tipo: 'elemento', id: elemento.id });` por:

```js
      seleccionar({ tipo: 'elemento', id: elemento.id }, { enfocar: `ficha:${elemento.id}:autoria` });
```

Y en `destruir()`, antes de `cerrarReproductor();`, agregar `mapa.cerrar();`.

- [ ] **Step 4: Agregar los estilos a `plataforma/css/editor.css`**

Al final del archivo, antes del bloque de pantallas angostas:

```css
/* ---------- Semáforo ---------- */
.semaforo-verde { background: var(--verde) !important; border-color: var(--verde) !important; }
.semaforo-amarillo { background: var(--amarillo) !important; border-color: var(--amarillo) !important; }
.semaforo-rojo { background: var(--rojo) !important; border-color: var(--rojo) !important; }
.por-verificar {
  display: inline-block; margin-left: 6px; padding: 1px 6px; border-radius: 99px;
  background: var(--amber); color: var(--accent-ink);
  font-family: var(--mono); font-size: 9px; letter-spacing: .06em; text-transform: uppercase; vertical-align: middle;
}

/* ---------- Ficha jurídica ---------- */
.ficha { margin-top: 18px; padding-top: 14px; border-top: 2px solid var(--claro-line); display: grid; gap: 12px; }
.ficha h3 { font-size: 14px; }
.ficha-resultado { padding: 10px 12px; background: var(--claro-panel-2); border-radius: 10px; }
.ficha-color { margin: 0 0 6px; display: flex; align-items: center; gap: 6px; }
.ficha-color .punto-semaforo { width: 12px; height: 12px; }
.ficha-razones, .ficha-notas { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
.ficha-razones li, .ficha-notas li { padding: 8px 10px; background: var(--claro-panel); border-left: 3px solid var(--rojo); border-radius: 6px; font-size: 13px; }
.ficha-notas li { border-left-color: var(--gris); }
.ficha-razones p, .ficha-notas p { margin: 0 0 4px; }
.ficha-ok { margin: 0; font-size: 13px; color: var(--claro-muted); }
.ficha-campo { margin: 0; padding: 10px 12px; border: 1px solid var(--claro-line); border-radius: 10px; }
.ficha-campo legend { padding: 0 6px; font-weight: 700; font-size: 13px; }
.ficha-breve { margin: 0 0 6px; font-size: 13px; }
.ficha-mas { font-size: 12px; color: var(--claro-muted); margin-bottom: 8px; }
.ficha-mas summary { cursor: pointer; color: var(--claro-accent); }
.ficha-mas p { margin: 6px 0; }
.ficha-fuente { font-style: italic; }
.ficha-fijo { margin: 4px 0 8px; font-weight: 700; }
.ficha-radios { display: grid; gap: 4px; margin-bottom: 8px; }
.ficha-radio, .ficha-casilla { display: flex; gap: 8px; align-items: flex-start; font-size: 14px; cursor: pointer; }
.ficha-casilla { margin: 6px 0; }
.ficha-condiciones { display: grid; gap: 2px; margin-bottom: 8px; }
.ficha .campo { margin-bottom: 8px; }

/* ---------- Mapa de activos ---------- */
.capa-mapa { position: fixed; inset: 0; z-index: 65; overflow: auto; padding: 24px; background: rgba(26, 29, 34, .55); }
.mapa { width: min(1100px, 100%); margin: 0 auto; padding: 20px 24px; background: var(--claro-panel); border-radius: var(--radius); box-shadow: var(--shadow); }
.mapa-cabecera { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.mapa-cabecera h2 { color: var(--claro-ink); font-size: 18px; text-transform: none; letter-spacing: 0; }
.mapa-resumen { margin: 4px 0 0; font-size: 13px; color: var(--claro-muted); }
.table-wrap { overflow-x: auto; }
.mapa-tabla { width: 100%; border-collapse: collapse; min-width: 760px; font-size: 13px; }
.mapa-tabla th { text-align: left; padding: 8px 6px; border-bottom: 1px solid var(--claro-line); font-family: var(--mono); font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: var(--claro-muted); }
.mapa-tabla td { padding: 8px 6px; border-bottom: 1px solid var(--claro-line-soft); vertical-align: top; }
.mapa-tabla td strong { display: block; }
.mapa-tipo { font-family: var(--mono); font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: var(--claro-muted); }
.mapa-acciones { margin: 0; padding-left: 16px; }
.riesgo-rojo td:first-child { box-shadow: inset 3px 0 0 var(--rojo); }
.riesgo-amarillo td:first-child { box-shadow: inset 3px 0 0 var(--amarillo); }
body.con-mapa { overflow: hidden; }
```

- [ ] **Step 5: Correr las pruebas para ver que pasan**

Run: `node --test tests/editor.test.js`
Expected: `# pass 12`.

- [ ] **Step 6: Commit**

```bash
git add plataforma/js/editor/editor.js tests/editor.test.js plataforma/css/editor.css
git commit -m "Editor: mapa de activos, créditos desde las fichas, anuncio de semáforos y foco en la ficha al subir" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Cierre del plan: suite completa, comprobación manual y README

**Files:**
- Modify: `plataforma/README.md`

- [ ] **Step 1: Correr toda la suite**

Run: `npm test`
Expected: 235 pruebas, `# fail 0` (207 del plan 2 + 6 formulario + 3 cadena + 3 mapa + 8 panel + 1 inventario + 2 propiedades + 3 mapa de activos + 3 netas del editor). Si el total difiere, buscar la prueba que falta o sobra; lo que importa es `# fail 0`.

- [ ] **Step 2: Comprobación manual en el navegador**

Run en segundo plano: `node tests/manual/servir.js`. Abrir `http://localhost:8080/plataforma/`, empezar un juego y recorrer:

1. **El juego.** En propiedades aparecen la ficha del título (verde, con la nota de marca y su «Por verificar») y la de la historia (verde, con los campos). Los «ver más» abren el texto completo y la fuente.
2. **Subir archivo.** Al subir un PNG como retrato, el panel derecho queda en su ficha con el foco en «¿Quién lo hizo?». Elegir «Otra persona» abre el nombre y el respaldo; el punto del inventario se pone rojo y el lector de pantalla recibe «Semáforo de «…»: rojo» (ver con la zona `#anuncios` en el inspector o con un lector).
3. **Licencia.** Respaldo «Licencia» → elegir «Creative Commons Atribución y compartir igual» → aparecen «Leí la licencia» y «Acepto licenciar mi juego igual»; marcar las dos y escribir el crédito deja la ficha en verde.
4. **Destino.** En «El juego», pasar de gratis a venta: las fichas con licencia no comercial (si hay) pasan a rojo en el inventario y en el panel.
5. **Mapa de activos.** El botón de la barra abre la tabla sobre el editor con el resumen; «Ver ficha» cierra y abre la ficha correspondiente con el foco; Escape cierra; el foco vuelve al botón.
6. **Créditos.** «Jugar» → «Créditos» muestra al estudiante y los créditos escritos.
7. **Teclado.** Los campos de la ficha se recorren con Tab; los radios con flechas; los «ver más» se abren con Enter.

Detener el servidor al terminar. Si algo falla, corregirlo en el módulo que corresponde, con su prueba.

- [ ] **Step 3: Actualizar `plataforma/README.md`**

Reemplazar la sección `## Estado` por:

```markdown
## Estado

Planes 1 (núcleo), 2 (motor y editor) y 3 (fichas en pantalla) terminados: cada elemento,
personaje, el título y la historia tienen su ficha jurídica con semáforo en el panel
derecho; el inventario muestra los colores; el mapa de activos se abre desde la barra; los
créditos del reproductor salen de las fichas. Faltan la biblioteca (plan 4), las
herramientas de creación (plan 5) y la publicación (plan 6).
```

En la sección «Cómo está armado el código», reemplazar la línea de `js/juridico/` por:

```markdown
- `js/juridico/`: fichas, licencias, semáforo, textos, reglas del formulario (`formulario.js`), cadena de titularidad y créditos (`cadena.js`) y filas del mapa de activos (`mapa.js`).
```

- [ ] **Step 4: Commit**

```bash
git add plataforma/README.md
git commit -m "Cierre del plan 3: README con el estado" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Autorrevisión del plan contra el spec

**Cobertura.** Sección 10, segundo párrafo (al subir, la ficha con la pregunta de autoría primero): tarea 8 (foco en «¿Quién lo hizo?»; las cuatro respuestas abren sus campos por `visibles()`, tarea 1). Sección 12.1 (qué tiene ficha): título e historia en «El juego», personajes y elementos (tarea 6). Sección 12.2 (seis campos con explicación y «ver más», nombre de la persona, herramienta, aporte, basado en obra ajena con autorización, titular, respaldo con licencia, «leí la licencia», «acepto compartir igual», «lo modifiqué», crédito precargado, prueba precargada, casilla de IA): tareas 1 y 4. Sección 12.3 (tipo de obra por elemento, enlace del personaje a su retrato, título informativo): tarea 4. Sección 12.4, último párrafo (limpieza de licencia, respaldo oculto con yo y yo, campos que no aplican al título, A01 y A02 como una sola, obra ajena en todas salvo el título): tareas 1, 3 y 4. Sección 12.5 (cambiar el destino recalcula todo): ya era `estructura: true` en el plan 2; la tarea 8 agrega el anuncio y la prueba. Sección 12.6 (cadena y créditos): tarea 2; el árbol lo dibuja el plan 6, los créditos entran al reproductor en la tarea 8. Sección 12.8 (mapa de activos con enlace a cada ficha): tareas 3 y 7. Sección 12.9 (textos desde el JSON con breve, completo y fuente): tarea 4 lee `contenido.campos`, `contenido.tiposObra` y, a través de `describir`, `reglas` y `notas`. Sección 16 (cambios de semáforo anunciados): tarea 8. Sección 19.13 (textos pendientes marcados visiblemente): marca «Por verificar» en el panel (tarea 4) y en el mapa (tarea 7).

**Lo que queda fuera y dónde va.** El «ver más» con la licencia real de las piezas simuladas (`simulado` del catálogo): plan 4. El árbol de titularidad dibujado y el informe: plan 6. La decisión de registro: plan 6.

**Placeholders.** Ninguno: cada paso trae código o comando. Los cambios a archivos del plan 2 se describen con el texto exacto a buscar y a poner.

**Consistencia de nombres.** `visibles(ficha) → { ...campos: boolean, soloLectura: string[] }`, `aplicarCambio(ficha, campo, valor) → ficha`, `ETIQUETAS`, `PREGUNTAS`, `LICENCIAS_ELEGIBLES`. `construir(proyecto, semaforos) → { id, nombre, estudiante, hijos }`, `creditos(proyecto) → string[]`. `filas(proyecto, contenido) → [{ id, activo, tipo, creador, contrato, prueba, color, acciones, porVerificar }]`, `creadorDe`, `contratoDe`, `accionesDe(descrito)`, `TIPOS_ACTIVO`. `panelFicha(sesion, idFicha, { contenido, alSeleccionar, titulo }) → nodo`, `puntoSemaforo(color, etiqueta)`, `marcaPorVerificar(entrada)`, `explicacion(entrada)`, `NOMBRES_COLOR`. `crearMapaActivos(contenedor, sesion, { contenido, alSeleccionar(seleccion, enfocar), alCerrar }) → { abrir, cerrar, dibujar, abierto }`. `propiedades.dibujar(seleccion, { enfocar })`, `seleccionar(nueva, { redibujarGuion, enfocar })`, `crearBarra(..., { alMapa })`. Claves de foco: `ficha:<id>:<campo>[:<valor>]`.

**Nota para el plan 4.** `crearFicha` ya precarga autoría, titular, respaldo, licencia y crédito desde la entrada de biblioteca; el panel las muestra como texto fijo. El catálogo solo tiene que dar `{ id, autor, licencia, creditoSugerido }` al llamar `agregarElemento` con `origen: 'biblioteca'`, y el botón «Biblioteca» entra junto a «Subir archivo» en el inventario. Para el «ver más» de las piezas simuladas, `panelFicha` puede recibir la entrada del catálogo y añadir un párrafo con `simulado`.
