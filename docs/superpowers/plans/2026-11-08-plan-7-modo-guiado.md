# Plan 7: Modo guiado — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el estudiante reciba un juego terminado, «La llave del faro», y lo haga suyo en nueve fases guiadas por una banda sobre el editor, resolviendo la ficha jurídica de cada pieza que reemplaza o conserva (spec `docs/superpowers/specs/2026-11-06-modo-guiado-design.md`).

**Architecture:** Todo lo nuevo vive en `plataforma/js/guia/`: `muestra.js` (constantes del ejemplo y conteo puro de piezas de muestra), `ejemplo.js` (arma el proyecto de ejemplo con las funciones del modelo), `fases.js` (las nueve fases y su estado, puro) y `banda.js` (la vista de la banda y la retirada automática de retratos de muestra sin uso). El modelo gana el origen `muestra` y `proyecto.guia`; la validación cuenta `M_MUESTRA`; el semáforo y el mapa saltan o marcan los elementos de muestra. El editor aloja la banda en una zona superior junto a la barra y marca su raíz con `data-fase`, que el CSS usa para resaltar y atenuar sin esconder nada. El arranque deja de pedir el título y arma el ejemplo al pulsar «Empezar».

**Tech Stack:** El de los planes anteriores: módulos ES sin compilación, `node:test` con jsdom para las vistas, Playwright con Chromium para el recorrido. Sin dependencias nuevas.

---

## Mapa de planes

| Plan | Qué construye | Diseño |
|---|---|---|
| 1 a 6 (hechos) | Núcleo, motor y editor, fichas, biblioteca, herramientas, publicación | `2026-11-04-plataforma-primer-videojuego-design.md` |
| **7. Modo guiado (este)** | Juego de ejemplo, piezas de muestra, nueve fases, banda de guía, arranque nuevo | `2026-11-06-modo-guiado-design.md` |

## Decisiones que este plan fija y el diseño no decía

- **La ficha de un elemento de muestra.** `crearFicha` rechaza orígenes que no conoce y `validarEstructura` exige que la ficha diga el mismo origen que su elemento. Por eso `muestra` entra también en `ORIGENES_FICHA` (`juridico/ficha.js`), no solo en `ORIGENES` del modelo. La ficha nace con los valores por defecto y nunca se evalúa ni se muestra.
- **`guia` es opcional en una copia y se normaliza.** `validarEstructura` solo rechaza un `guia` presente que no sea objeto. `asegurarGuia(proyecto)` (en `estado/modelo.js`) completa lo que falte: sin `guia`, fase `conocer` y `jugado: false`; fase desconocida, vuelve a `conocer`; `jugado` que no es booleano, `false`. Devuelve `true` si tuvo que corregir una fase que sí venía escrita. La llaman `importarCopia` (que devuelve ese dato como `guiaCorregida`) y el editor al arrancar y al reemplazar el proyecto, así un proyecto guardado por la primera versión en el navegador también se normaliza. Los nueve ids viven en `FASES_GUIA` del modelo, para que copias y validación no importen la guía.
- **Los retratos de muestra cuentan como faltante de `M_PERSONAJES`.** El diseño dice que el ejemplo «cumple el mínimo salvo `M_MUESTRA`» y también que un retrato de muestra no cuenta como «personaje con retrato». Las dos cosas a la vez dan que el ejemplo recién armado falla `M_PERSONAJES` y `M_MUESTRA`; la prueba lo afirma así.
- **`PIEZAS_BIBLIOTECA` lleva id y título.** El mensaje de error del diseño nombra la pieza («falta la pieza «Muelle de noche»…») cuando el catálogo no la tiene, así que la constante es `{ fondo: { id: 'bib_f01', titulo: 'Muelle de noche' }, … }`.
- **Qué enseñan las tres piezas de biblioteca.** El catálogo precarga el crédito sugerido, así que A01 no salta: el fondo queda amarillo por A07 (leer la licencia), la música por A07 y A03 (compartir igual) y el efecto por A07. La lección de la fase 4 cita `campos.credito` para que el estudiante revise el crédito precargado.
- **La retirada automática corre en el editor, antes de redibujar.** `retirarMuestrasSinUso(sesion, alError)` vive en `guia/banda.js` como pide el diseño, pero la llama el oyente de cambios del editor antes de `refrescar`: si retira algo, ese segundo `sesion.cambiar` (origen `guia`, estructural) ya redibuja todo y el primero no redibuja de nuevo. Así la banda nunca dibuja un estado que está a punto de cambiar.
- **Un solo anuncio por cambio.** La banda no llama a `anunciar` dentro del editor: `dibujar()` devuelve su mensaje («Tarea cumplida: …», «Fase completa: …», «Fase 3 de 8: …») y el editor lo junta con el de los semáforos en un solo `anunciar`, porque la zona `aria-live` es una y el segundo mensaje borraría el primero. Fuera del editor (las pruebas de la banda) anuncia ella misma.
- **`alTerminar` en el reproductor.** El diseño pone fuera de alcance los cambios al motor, pero pide que el editor sepa cuándo el juego llega a los créditos. Se agrega una opción `alTerminar` a `jugar()`, que se llama una vez por partida terminada (se rearma con «Reiniciar»). `juego.html` no la pasa, así que el juego exportado no cambia de comportamiento.
- **Botones de acción en la banda.** Además de resaltar el botón de la barra, la banda ofrece en su centro «Jugar el ejemplo» (fase 0), «Abrir el mapa de activos» (fase 7) y «Publicar» (fase 8), que llaman lo mismo que la barra. Publicar sigue con su candado: el de la banda está deshabilitado mientras `puedePublicar` diga que no.
- **Qué se atenúa.** Las secciones del inventario (`data-seccion`: `juego`, `escenas`, `personajes`, `elementos`) y la zona del guion (`data-seccion="guion"`). La columna de propiedades nunca se atenúa, porque las fichas se resuelven ahí en todas las fases. Lo atenuado vuelve a opacidad completa al pasar el cursor o al tener el foco dentro.
- **El inicio sabe si el ejemplo se puede armar.** `crearInicio` recibe `ejemploDisponible`; si es falso (el catálogo no cargó), «Empezar» queda deshabilitado y un párrafo lo explica y ofrece «Abrir una copia». `alEmpezar` pasa a ser asíncrona: el inicio pone «Preparando el ejemplo…», espera y, si falla, muestra el mensaje y rehabilita el botón.
- **Los datos de prueba cambian de nombres.** `tests/ayudas/proyecto.js` y otras pruebas usan «La llave del faro», «Ana», «El farero» y «¿Quién dejó la puerta abierta?», que ahora son piezas de muestra y bloquean la publicación. La tarea 1 los cambia por «El faro de Camila», «Lucía», «El guardián» y «¿Quién abrió la reja?».

## Convenciones de este plan

- Las de los planes anteriores: TDD, un commit por tarea, mensajes en español, el pie `Co-Authored-By` que indique el sistema al hacer el commit.
- Textos jurídicos: solo los que ya existen en `plataforma/contenido/juridico.json`, citados con `explicacion()` de `editor/panel-ficha.js`. Las instrucciones de las fases no afirman nada jurídico.
- Conteo de pruebas en Node: hoy hay 338. Cada tarea dice cuántas agrega; el cierre espera 376. Las pruebas que solo se modifican no cuentan.
- Comandos desde la raíz del repositorio. Una prueba suelta se corre con `node --test tests/<archivo>.test.js`.

## Estructura de archivos que deja este plan

```
plataforma/
  ejemplo/
    retrato-ana.png                 64×64, generado, CC0
    retrato-farero.png              64×64, generado, CC0
  css/editor.css                    (cambia) zona superior, banda, resaltado por data-fase, marca «de muestra»
  js/
    guia/
      muestra.js                    TEXTOS_MUESTRA, PERSONAJES_MUESTRA, PIEZAS_BIBLIOTECA, RETRATOS_MUESTRA, esTextoDeMuestra, piezasDeMuestra
      ejemplo.js                    crearEjemplo({ estudiante, destino }, { catalogo, cargar })
      fases.js                      FASES, estadoDeGuia(proyecto)
      banda.js                      crearBanda, retirarMuestrasSinUso
    estado/
      biblioteca.js                 agregarPieza(proyecto, pieza, archivo) (extraída de editor/biblioteca.js)
      modelo.js                     (cambia) ORIGENES con muestra, FASES_GUIA, guia en crearProyecto, asegurarGuia
      validacion.js                 (cambia) M_MUESTRA; retratos de muestra no cuentan
      copias.js                     (cambia) guia opcional; importarCopia normaliza y avisa
    juridico/
      ficha.js                      (cambia) ORIGENES_FICHA con muestra
      semaforo.js                   (cambia) evaluarTodo salta elementos de muestra
      mapa.js                       (cambia) filas de muestra con muestra: true y sin color
    motor/reproductor.js            (cambia) opción alTerminar
    editor/
      biblioteca.js                 (cambia) tomarPieza usa agregarPieza
      inventario.js                 (cambia) data-seccion; «de muestra» sin punto
      panel-ficha.js                (cambia) ficha de muestra: solo aviso y botones de reemplazo
      propiedades.js                (cambia) origen «Muestra del ejemplo»; pasa alReemplazar
      mapa-activos.js               (cambia) filas de muestra
      editor.js                     (cambia) zona superior con la banda, retirada, jugado, alReemplazar
      inicio.js                     (cambia) sin título; textos nuevos; Preparando…; ejemploDisponible
    app.js                          (cambia) Empezar arma el ejemplo
  README.md                         (cambia) modo guiado y retratos de muestra
scripts/generar-ejemplo.js          genera los dos retratos de muestra
tests/
  ayudas/proyecto.js                (cambia) nombres que no son de muestra
  ayudas/ejemplo.js                 catálogo real y cargar() desde el disco
  muestra.test.js, ejemplo.test.js, fases.test.js, banda.test.js, estado-biblioteca.test.js, generar-ejemplo.test.js
  e2e/recorrido.spec.js             (se reescribe) recorrido guiado
  e2e/inventario.spec.js            (cambia) sin título en el inicio; la banda no desborda
```

---

### Task 1: Datos de prueba sin nombres de muestra

Antes de que «La llave del faro», «Ana» y «El farero» se vuelvan piezas de muestra, las pruebas que arman proyectos publicables dejan de usarlos. Ninguna prueba nueva; las 338 siguen pasando.

**Files:**
- Modify: `tests/ayudas/proyecto.js`
- Modify: las pruebas que fallen en el paso 3 (se esperan `tests/barra.test.js`, `tests/editor.test.js`, `tests/exportar.test.js`, `tests/informe.test.js`, `tests/integracion.test.js`, `tests/mapa.test.js`, `tests/mapa-activos.test.js`, `tests/paquete.test.js`, `tests/publicar.test.js`, `tests/cadena.test.js`)

- [ ] **Step 1: Cambiar los nombres del proyecto publicable**

En `tests/ayudas/proyecto.js`, dentro de `proyectoPublicable()`:

```js
  const p = crearProyecto({ estudiante: 'Camila R.', titulo: 'El faro de Camila', destino: 'gratis' });
```

```js
  const ana = agregarPersonaje(p, { nombre: 'Lucía' });
  const farero = agregarPersonaje(p, { nombre: 'El guardián' });
```

```js
  ana.retrato = elemento({ tipo: 'retrato', nombre: 'Lucía', archivo: 'ana.png', origen: 'creado' }).id;
  farero.retrato = elemento({ tipo: 'retrato', nombre: 'Guardián', archivo: 'farero.png', origen: 'creado' }).id;
```

```js
  agregarLinea(muelle, 'dialogo', { personaje: ana.id, texto: '¿Quién abrió la reja?', efecto: olas.id });
```

Los nombres de las variables (`ana`, `farero`) no cambian: las pruebas los usan por referencia.

- [ ] **Step 2: Correr la suite**

Run: `npm test`
Expected: FAIL en las pruebas que comparan textos del proyecto publicable (nombre del paquete `entrega-camila-r-la-llave-del-faro.zip`, título en la barra o en el informe, nombres en créditos y mapa).

- [ ] **Step 3: Actualizar las expectativas**

Solo en las pruebas que importan `proyectoPublicable` y fallaron, reemplazar en las expectativas:

| Antes | Después |
|---|---|
| `La llave del faro` | `El faro de Camila` |
| `la-llave-del-faro` | `el-faro-de-camila` |
| `Ana` (nombre de personaje o retrato) | `Lucía` |
| `El farero` | `El guardián` |
| `Farero` (nombre del retrato) | `Guardián` |
| `¿Quién dejó la puerta abierta?` | `¿Quién abrió la reja?` |

No tocar pruebas que arman sus propios proyectos con esos textos: siguen siendo válidas hasta la tarea 4, que dice qué hacer con ellas.

- [ ] **Step 4: Correr la suite**

Run: `npm test`
Expected: PASS, 338 pruebas.

- [ ] **Step 5: Commit**

```bash
git add tests
git commit -m "Pruebas: el proyecto publicable deja de usar los nombres del juego de ejemplo"
```

---

### Task 2: Piezas de muestra (`guia/muestra.js`)

Agrega 4 pruebas (342).

**Files:**
- Create: `plataforma/js/guia/muestra.js`
- Test: `tests/muestra.test.js`

- [ ] **Step 1: Escribir la prueba**

```js
// tests/muestra.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearProyecto, agregarEscena, agregarPersonaje, agregarElemento, agregarLinea } from '../plataforma/js/estado/modelo.js';
import { TEXTOS_MUESTRA, PERSONAJES_MUESTRA, PIEZAS_BIBLIOTECA, RETRATOS_MUESTRA, esTextoDeMuestra, piezasDeMuestra } from '../plataforma/js/guia/muestra.js';

test('las constantes del ejemplo: ocho líneas, dos personajes, tres piezas y dos retratos', () => {
  assert.equal(TEXTOS_MUESTRA.titulo, 'La llave del faro');
  assert.equal(TEXTOS_MUESTRA.sinopsis, 'Una farera en su primer turno descubre quién abrió la puerta.');
  assert.equal(TEXTOS_MUESTRA.lineas.length, 8);
  assert.deepEqual(TEXTOS_MUESTRA.personajes, ['Ana', 'El farero']);
  assert.deepEqual(PERSONAJES_MUESTRA.map((p) => p.nombre), TEXTOS_MUESTRA.personajes);
  assert.deepEqual(Object.fromEntries(Object.entries(PIEZAS_BIBLIOTECA).map(([k, v]) => [k, v.id])), { fondo: 'bib_f01', musica: 'bib_m05', efecto: 'bib_e02' });
  assert.deepEqual(RETRATOS_MUESTRA.map((r) => r.archivo), ['ejemplo/retrato-ana.png', 'ejemplo/retrato-farero.png']);
});

test('esTextoDeMuestra ignora espacios al borde y mayúsculas; un texto vacío nunca es de muestra', () => {
  assert.equal(esTextoDeMuestra('  la LLAVE del faro ', ['La llave del faro']), true);
  assert.equal(esTextoDeMuestra('La llave del faro perdida', ['La llave del faro']), false);
  assert.equal(esTextoDeMuestra('   ', ['']), false);
  assert.equal(esTextoDeMuestra(undefined, ['La llave del faro']), false);
});

function proyectoConTodoDeMuestra() {
  const p = crearProyecto({ estudiante: 'Camila R.', titulo: TEXTOS_MUESTRA.titulo });
  p.juego.sinopsis = TEXTOS_MUESTRA.sinopsis;
  const [a, b, c] = [p.juego.escenas[0], agregarEscena(p, 'B'), agregarEscena(p, 'C')];
  for (const [i, texto] of TEXTOS_MUESTRA.lineas.entries()) agregarLinea([a, b, c][i % 3], 'narracion', { texto: ` ${texto.toUpperCase()} ` });
  for (const datos of PERSONAJES_MUESTRA) agregarPersonaje(p, datos);
  // El modelo acepta el origen 'muestra' desde la tarea 3; piezasDeMuestra solo lee la lista, así que basta con meterlos a mano.
  p.juego.elementos.push({ id: 'el_m1', tipo: 'retrato', nombre: 'R1', archivo: 'r1.png', origen: 'muestra' }, { id: 'el_m2', tipo: 'retrato', nombre: 'R2', archivo: 'r2.png', origen: 'muestra' });
  agregarElemento(p, { tipo: 'fondo', nombre: 'F', archivo: 'f.png', origen: 'creado' });
  return p;
}

test('piezasDeMuestra cuenta título, sinopsis, líneas, personajes y retratos de muestra: 14 en total', () => {
  assert.deepEqual(piezasDeMuestra(proyectoConTodoDeMuestra()), { titulo: true, sinopsis: true, lineas: 8, personajes: 2, elementos: 2, total: 14 });
});

test('un proyecto propio o de la primera versión no tiene piezas de muestra', () => {
  const p = crearProyecto({ estudiante: 'Camila R.', titulo: 'El faro de Camila' });
  agregarLinea(p.juego.escenas[0], 'narracion', { texto: '¿Quién abrió la reja?' });
  agregarPersonaje(p, { nombre: 'Lucía' });
  delete p.guia;
  assert.deepEqual(piezasDeMuestra(p), { titulo: false, sinopsis: false, lineas: 0, personajes: 0, elementos: 0, total: 0 });
});
```

- [ ] **Step 2: Correr la prueba y verla fallar**

Run: `node --test tests/muestra.test.js`
Expected: FAIL, «Cannot find module …/guia/muestra.js».

- [ ] **Step 3: Escribir el módulo**

```js
// plataforma/js/guia/muestra.js
// El juego de ejemplo «La llave del faro» (diseño del modo guiado, secciones 4 y 5):
// sus textos, sus piezas de biblioteca y sus retratos, y el conteo puro de lo que queda
// de él en un proyecto. Se compara contra estas constantes, no contra marcas en el
// documento: editar no tiene que marcar nada y una copia vieja tiene cero piezas de muestra.
// No importa nada: lo usan la validación (estado/) y la guía.

export const TEXTOS_MUESTRA = {
  titulo: 'La llave del faro',
  sinopsis: 'Una farera en su primer turno descubre quién abrió la puerta.',
  lineas: [
    'La niebla cubre el muelle. La puerta del faro está abierta.',
    '¿Quién dejó la puerta abierta?',
    'Yo la cerré al anochecer. Alguien subió después.',
    '¿Subes a la torre?',
    'La escalera gira hasta la luz. En el último peldaño hay una llave.',
    'Ana guarda la llave. Mañana sabrá de qué puerta es.',
    'Mejor esperar a que aclare.',
    'Al amanecer, la puerta sigue abierta y la llave ya no está.',
  ],
  personajes: ['Ana', 'El farero'],
};

export const PERSONAJES_MUESTRA = [
  { nombre: 'Ana', descripcion: 'Farera en su primer turno.' },
  { nombre: 'El farero', descripcion: 'Lleva treinta años cuidando la luz.' },
];

/** Las tres piezas de la biblioteca que usa el ejemplo. Si el catálogo cambia, deben seguir existiendo (lo comprueba tests/ejemplo.test.js). */
export const PIEZAS_BIBLIOTECA = {
  fondo: { id: 'bib_f01', titulo: 'Muelle de noche' },
  musica: { id: 'bib_m05', titulo: 'Fiesta en el muelle' },
  efecto: { id: 'bib_e02', titulo: 'Puerta que cruje' },
};

/** Retratos de muestra, en el orden de PERSONAJES_MUESTRA. Rutas relativas a plataforma/. */
export const RETRATOS_MUESTRA = [
  { nombre: 'Retrato de Ana (muestra)', archivo: 'ejemplo/retrato-ana.png' },
  { nombre: 'Retrato del farero (muestra)', archivo: 'ejemplo/retrato-farero.png' },
];

const normal = (texto) => String(texto ?? '').trim().toLocaleLowerCase('es');

/** ¿El texto es igual a alguno de la lista, sin contar espacios al borde ni mayúsculas? Un texto vacío nunca lo es. */
export function esTextoDeMuestra(texto, lista) {
  const buscado = normal(texto);
  return buscado !== '' && lista.some((m) => normal(m) === buscado);
}

/** Lo que queda del ejemplo en el proyecto. total es lo que cuenta M_MUESTRA. */
export function piezasDeMuestra(proyecto) {
  const { juego } = proyecto;
  const titulo = esTextoDeMuestra(juego.titulo, [TEXTOS_MUESTRA.titulo]);
  const sinopsis = esTextoDeMuestra(juego.sinopsis, [TEXTOS_MUESTRA.sinopsis]);
  const lineas = juego.escenas.flatMap((e) => e.lineas).filter((l) => esTextoDeMuestra(l.texto, TEXTOS_MUESTRA.lineas)).length;
  const personajes = juego.personajes.filter((p) => esTextoDeMuestra(p.nombre, TEXTOS_MUESTRA.personajes)).length;
  const elementos = juego.elementos.filter((e) => e.origen === 'muestra').length;
  return { titulo, sinopsis, lineas, personajes, elementos, total: Number(titulo) + Number(sinopsis) + lineas + personajes + elementos };
}
```

- [ ] **Step 4: Correr la prueba**

Run: `npm test`
Expected: PASS, 342.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/guia/muestra.js tests/muestra.test.js
git commit -m "Guía: constantes del juego de ejemplo y conteo de piezas de muestra"
```

---

### Task 3: Origen `muestra` y `proyecto.guia` en el modelo y las copias

Agrega 4 pruebas (346).

**Files:**
- Modify: `plataforma/js/juridico/ficha.js` (línea de `ORIGENES_FICHA`)
- Modify: `plataforma/js/estado/modelo.js`
- Modify: `plataforma/js/estado/copias.js`
- Test: `tests/modelo.test.js`, `tests/copias.test.js`

- [ ] **Step 1: Escribir las pruebas**

Al final de `tests/modelo.test.js` (agregar `asegurarGuia, FASES_GUIA` al import del modelo):

```js
test('crearProyecto deja la guía en la fase inicial; asegurarGuia completa y corrige', () => {
  const p = crearProyecto({ estudiante: 'Camila R.' });
  assert.deepEqual(p.guia, { fase: 'conocer', jugado: false });
  assert.deepEqual(FASES_GUIA, ['conocer', 'historia', 'personajes', 'retratos', 'fondo', 'sonido', 'voz', 'destino', 'publicar']);
  delete p.guia;
  assert.equal(asegurarGuia(p), false, 'sin guía no hay nada que avisar');
  assert.deepEqual(p.guia, { fase: 'conocer', jugado: false });
  p.guia = { fase: 'fase-inventada', jugado: 'sí' };
  assert.equal(asegurarGuia(p), true, 'una fase desconocida se corrige y se avisa');
  assert.deepEqual(p.guia, { fase: 'conocer', jugado: false });
  p.guia = { fase: 'sonido', jugado: true };
  assert.equal(asegurarGuia(p), false);
  assert.deepEqual(p.guia, { fase: 'sonido', jugado: true });
  const e = agregarElemento(p, { tipo: 'retrato', nombre: 'R', archivo: 'r.png', origen: 'muestra' });
  assert.equal(p.fichas[e.id].origen, 'muestra');
});
```

Al final de `tests/copias.test.js` (usa el `JSZip` y las ayudas que ya importa el archivo; agregar los imports que falten):

```js
test('ida y vuelta con guía y un retrato de muestra', async () => {
  const p = crearProyecto({ estudiante: 'Camila R.', titulo: 'El faro de Camila' });
  p.guia = { fase: 'retratos', jugado: true };
  const e = agregarElemento(p, { tipo: 'retrato', nombre: 'Muestra', archivo: 'muestra.png', origen: 'muestra' });
  const archivos = new Map([[e.id, { tipo: 'image/png', datos: new TextEncoder().encode('png').buffer }]]);
  const copia = await importarCopia(await exportarCopia(p, archivos, { JSZip }), { JSZip });
  assert.deepEqual(copia.proyecto.guia, { fase: 'retratos', jugado: true });
  assert.equal(copia.proyecto.juego.elementos[0].origen, 'muestra');
  assert.equal(copia.guiaCorregida, false);
});

test('una copia de la primera versión, sin guía, entra en la fase inicial', async () => {
  const p = crearProyecto({ estudiante: 'Camila R.', titulo: 'El faro de Camila' });
  delete p.guia;
  assert.deepEqual(validarEstructura(p), []);
  const copia = await importarCopia(await exportarCopia(p, new Map(), { JSZip }), { JSZip });
  assert.deepEqual(copia.proyecto.guia, { fase: 'conocer', jugado: false });
  assert.equal(copia.guiaCorregida, false);
});

test('una copia con una fase desconocida entra en la fase inicial y lo avisa; una guía que no es objeto se rechaza', async () => {
  const p = crearProyecto({ estudiante: 'Camila R.', titulo: 'El faro de Camila' });
  p.guia = { fase: 'otra', jugado: false };
  const copia = await importarCopia(await exportarCopia(p, new Map(), { JSZip }), { JSZip });
  assert.equal(copia.proyecto.guia.fase, 'conocer');
  assert.equal(copia.guiaCorregida, true);
  p.guia = 'conocer';
  assert.ok(validarEstructura(p).includes('la guía no tiene la forma esperada'));
});
```

- [ ] **Step 2: Correr y verlas fallar**

Run: `node --test tests/modelo.test.js tests/copias.test.js`
Expected: FAIL (`asegurarGuia` no existe; «Origen inválido: muestra»).

- [ ] **Step 3: Agregar el origen a las fichas**

En `plataforma/js/juridico/ficha.js`:

```js
export const ORIGENES_FICHA = ['escrito', 'creado', 'subido', 'biblioteca', 'muestra'];
```

- [ ] **Step 4: Modelo**

En `plataforma/js/estado/modelo.js`:

```js
export const ORIGENES = ['creado', 'subido', 'biblioteca', 'muestra'];
/** Las nueve fases del modo guiado, en orden (diseño del modo guiado, sección 6). */
export const FASES_GUIA = ['conocer', 'historia', 'personajes', 'retratos', 'fondo', 'sonido', 'voz', 'destino', 'publicar'];
```

En `crearProyecto`, después de `publicado: null,`:

```js
    guia: { fase: FASES_GUIA[0], jugado: false },
```

Después de `crearProyecto`:

```js
/**
 * Deja proyecto.guia con una fase conocida y jugado booleano. Un proyecto de la
 * primera versión (sin guía) empieza en la fase inicial. Devuelve true solo si había
 * una fase escrita que no se reconoce, para que quien abre la copia lo avise.
 */
export function asegurarGuia(proyecto) {
  const guia = proyecto.guia !== null && typeof proyecto.guia === 'object' ? proyecto.guia : {};
  const desconocida = guia.fase !== undefined && !FASES_GUIA.includes(guia.fase);
  proyecto.guia = {
    fase: FASES_GUIA.includes(guia.fase) ? guia.fase : FASES_GUIA[0],
    jugado: guia.jugado === true,
  };
  return desconocida;
}
```

Revisar `tests/modelo.test.js`: si alguna prueba compara `crearProyecto(...)` entero con `deepEqual`, agregarle `guia: { fase: 'conocer', jugado: false }` a lo esperado.

- [ ] **Step 5: Copias**

En `plataforma/js/estado/copias.js`, cambiar el import del modelo:

```js
import { VERSION_PROYECTO, DESTINOS, TIPOS_ELEMENTO, ORIGENES, TIPOS_LINEA, asegurarGuia } from './modelo.js';
```

En `validarEstructura`, antes del `return problemas;` final:

```js
  // Modo guiado: la guía es opcional (las copias de la primera versión no la traen); asegurarGuia completa el resto al importar.
  if (proyecto.guia !== undefined && !esObjeto(proyecto.guia)) problemas.push('la guía no tiene la forma esperada');
```

En `importarCopia`, reemplazar el `return { proyecto, archivos };` final por:

```js
  const guiaCorregida = asegurarGuia(proyecto);
  return { proyecto, archivos, guiaCorregida };
```

Actualizar el comentario JSDoc de `importarCopia`: `@returns {Promise<{proyecto: object, archivos: Map, guiaCorregida: boolean}>}`.

- [ ] **Step 6: Correr la suite**

Run: `npm test`
Expected: PASS, 346. Si alguna prueba de copias compara el resultado de `importarCopia` entero con `deepEqual`, agregarle `guiaCorregida: false`.

- [ ] **Step 7: Commit**

```bash
git add plataforma/js tests
git commit -m "Modelo: origen muestra y guía del proyecto; las copias la aceptan, la completan y avisan si la fase no se reconoce"
```

---

### Task 4: Mínimo, semáforo y mapa con piezas de muestra

Agrega 4 pruebas (350).

**Files:**
- Modify: `plataforma/js/estado/validacion.js` (`cumpleMinimo`)
- Modify: `plataforma/js/juridico/semaforo.js` (`evaluarTodo`)
- Modify: `plataforma/js/juridico/mapa.js` (`filas`)
- Test: `tests/validacion.test.js`, `tests/semaforo.test.js`, `tests/mapa.test.js`

- [ ] **Step 1: Escribir las pruebas**

En `tests/validacion.test.js` (agregar `agregarElemento` al import del modelo si falta, e importar `proyectoPublicable` de `./ayudas/proyecto.js`):

```js
test('M_MUESTRA cuenta las piezas de muestra que quedan y bloquea la publicación', () => {
  const { p } = proyectoPublicable();
  assert.equal(cumpleMinimo(p).ok, true);
  p.juego.titulo = ' la llave del faro ';
  const faltante = cumpleMinimo(p).faltantes.find((f) => f.codigo === 'M_MUESTRA');
  assert.deepEqual(faltante, { codigo: 'M_MUESTRA', mensaje: 'Piezas de muestra por reemplazar', actual: 1, requerido: 0 });
  assert.equal(puedePublicar(p).ok, false);
  p.juego.titulo = 'El faro de Camila';
  assert.equal(puedePublicar(p).ok, true);
});

test('un personaje cuyo retrato es de muestra no cuenta como personaje con retrato', () => {
  const { p, ana } = proyectoPublicable();
  const muestra = agregarElemento(p, { tipo: 'retrato', nombre: 'Muestra', archivo: 'muestra.png', origen: 'muestra' });
  ana.retrato = muestra.id;
  const personajes = cumpleMinimo(p).faltantes.find((f) => f.codigo === 'M_PERSONAJES');
  assert.equal(personajes.actual, 1);
});
```

`M_MUESTRA` se cumple con cero, así que el mínimo no se compara con `actual < requerido`. La prueba fija la forma: `actual` es lo que queda y `requerido` es 0.

En `tests/semaforo.test.js` (importar `crearProyecto, agregarElemento` del modelo si falta):

```js
test('evaluarTodo salta los elementos de muestra', () => {
  const p = crearProyecto({ estudiante: 'Camila R.', titulo: 'El faro de Camila' });
  const muestra = agregarElemento(p, { tipo: 'retrato', nombre: 'Muestra', archivo: 'm.png', origen: 'muestra' });
  const propio = agregarElemento(p, { tipo: 'retrato', nombre: 'Propio', archivo: 'p.png', origen: 'creado' });
  const semaforos = evaluarTodo(p);
  assert.equal(semaforos.has(muestra.id), false);
  assert.equal(semaforos.has(propio.id), true);
});
```

En `tests/mapa.test.js` (importar lo que falte):

```js
test('las filas de muestra llevan muestra: true, sin color y con la acción de reemplazar', () => {
  const p = crearProyecto({ estudiante: 'Camila R.', titulo: 'El faro de Camila' });
  const muestra = agregarElemento(p, { tipo: 'retrato', nombre: 'Retrato de Ana (muestra)', archivo: 'm.png', origen: 'muestra' });
  const fila = filas(p, contenido).find((f) => f.id === muestra.id);
  assert.deepEqual(fila, { id: muestra.id, activo: 'Retrato de Ana (muestra)', tipo: 'Retrato', creador: 'Muestra del ejemplo', contrato: '—', prueba: '—', color: null, acciones: ['Reemplázalo por uno tuyo.'], porVerificar: false, muestra: true });
  assert.equal(filas(p, contenido).filter((f) => f.muestra).length, 1);
});
```

`contenido` es el JSON que ya carga `tests/mapa.test.js`; si el archivo lo llama de otra forma, usar ese nombre.

- [ ] **Step 2: Correr y verlas fallar**

Run: `node --test tests/validacion.test.js tests/semaforo.test.js tests/mapa.test.js`
Expected: FAIL.

- [ ] **Step 3: Mínimo**

En `plataforma/js/estado/validacion.js`, agregar el import:

```js
import { piezasDeMuestra } from '../guia/muestra.js';
```

En `cumpleMinimo`, reemplazar la línea de `M_PERSONAJES`:

```js
  const deMuestra = new Set(juego.elementos.filter((e) => e.origen === 'muestra').map((e) => e.id));
  exige('M_PERSONAJES', 'Personajes con retrato', juego.personajes.filter((p) => p.retrato && !deMuestra.has(p.retrato)).length, MINIMO.personajesConRetrato);
```

Antes del `return` de `cumpleMinimo`:

```js
  // Modo guiado: se cumple con cero piezas de muestra; actual es lo que queda.
  const muestra = piezasDeMuestra(proyecto).total;
  if (muestra > 0) faltantes.push({ codigo: 'M_MUESTRA', mensaje: 'Piezas de muestra por reemplazar', actual: muestra, requerido: 0 });
```

`puedePublicar` arma el mensaje como «Piezas de muestra por reemplazar: 1 de 0.». Para que diga lo que pasa, en `puedePublicar` cambiar el bucle de faltantes:

```js
  for (const faltante of cumpleMinimo(proyecto).faltantes) {
    const mensaje = faltante.codigo === 'M_MUESTRA' ? `${faltante.mensaje}: quedan ${faltante.actual}.` : `${faltante.mensaje}: ${faltante.actual} de ${faltante.requerido}.`;
    motivos.push({ codigo: 'P_MINIMO', faltante: faltante.codigo, mensaje });
  }
```

- [ ] **Step 4: Semáforo**

En `plataforma/js/juridico/semaforo.js`, reemplazar `evaluarTodo`:

```js
/** Evalúa todas las fichas del proyecto, salvo las de los elementos de muestra del ejemplo (no se resuelven: se reemplazan). Devuelve Map<idFicha, resultado>. */
export function evaluarTodo(proyecto) {
  const contexto = { destino: proyecto.juego.destino };
  const deMuestra = new Set(proyecto.juego.elementos.filter((e) => e.origen === 'muestra').map((e) => e.id));
  return new Map(Object.entries(proyecto.fichas).filter(([id]) => !deMuestra.has(id)).map(([id, ficha]) => [id, evaluar(ficha, contexto)]));
}
```

- [ ] **Step 5: Mapa**

En `plataforma/js/juridico/mapa.js`, dentro de `filas`, reemplazar la línea de los elementos:

```js
    ...juego.elementos.map((e) => (e.origen === 'muestra'
      ? { id: e.id, activo: nombreDe(e, 'Sin nombre'), tipo: TIPOS_ACTIVO[e.tipo], creador: 'Muestra del ejemplo', contrato: '—', prueba: '—', color: null, acciones: ['Reemplázalo por uno tuyo.'], porVerificar: false, muestra: true }
      : fila(e.id, nombreDe(e, 'Sin nombre'), TIPOS_ACTIVO[e.tipo]))),
```

Actualizar el JSDoc de `filas`: el tipo de cada fila agrega `muestra?: true` y `color` puede ser `null`.

- [ ] **Step 6: Correr la suite y ajustar pruebas propias que usan textos de muestra**

Run: `npm test`
Expected: PASS, 350. Si falla alguna prueba que arma su propio proyecto con «La llave del faro», «Ana», «El farero» o una línea del ejemplo y luego comprueba el mínimo, la publicación o el candado, cambiar en esa prueba los textos por los de la tabla de la tarea 1. No cambiar pruebas que solo dibujan o juegan esos textos.

- [ ] **Step 7: Commit**

```bash
git add plataforma/js tests
git commit -m "Validación: M_MUESTRA y retratos de muestra fuera del mínimo; el semáforo los salta y el mapa los marca"
```

---

### Task 5: Elegir una pieza de biblioteca sin la sesión (`estado/biblioteca.js`)

Agrega 1 prueba (351).

**Files:**
- Create: `plataforma/js/estado/biblioteca.js`
- Modify: `plataforma/js/editor/biblioteca.js` (`tomarPieza` e imports)
- Test: `tests/estado-biblioteca.test.js`

- [ ] **Step 1: Escribir la prueba**

```js
// tests/estado-biblioteca.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearProyecto } from '../plataforma/js/estado/modelo.js';
import { agregarPieza } from '../plataforma/js/estado/biblioteca.js';
import { pieza } from './ayudas/catalogo.js';

test('agregarPieza mete la pieza con origen biblioteca, ficha precargada y archivo con la extensión de su tipo', () => {
  const p = crearProyecto({ estudiante: 'Camila R.' });
  const entrada = pieza('bib_f9', 'fondo', 'Muelle', 'CC-BY-4.0');
  const elemento = agregarPieza(p, entrada, { tipo: 'image/png', datos: new ArrayBuffer(1) });
  assert.equal(elemento.origen, 'biblioteca');
  assert.equal(elemento.nombre, 'Muelle');
  assert.equal(elemento.archivo, `${elemento.id}.png`);
  assert.deepEqual(elemento.biblioteca, { id: 'bib_f9', autor: 'Autora de Prueba', licencia: 'CC-BY-4.0', creditoSugerido: '«Muelle», Autora de Prueba, CC-BY-4.0' });
  assert.equal(p.fichas[elemento.id].licencia, 'CC-BY-4.0');
  assert.equal(p.fichas[elemento.id].credito, '«Muelle», Autora de Prueba, CC-BY-4.0');
});
```

- [ ] **Step 2: Correr y verla fallar**

Run: `node --test tests/estado-biblioteca.test.js`
Expected: FAIL, módulo no encontrado.

- [ ] **Step 3: Escribir el módulo**

```js
// plataforma/js/estado/biblioteca.js
// Meter una pieza del catálogo al proyecto: el elemento con origen 'biblioteca', su
// ficha precargada (crearFicha) y el nombre de archivo según su tipo. Puro sobre el
// proyecto: lo usan el editor (con la sesión) y el juego de ejemplo (sin sesión).
import { agregarElemento } from './modelo.js';
import { extensionPorMime } from './archivos.js';
import { entradaDeFicha } from '../biblioteca/catalogo.js';

/**
 * @param {object} proyecto
 * @param {object} pieza entrada del catálogo
 * @param {{ tipo: string }} archivo el archivo ya descargado (solo se usa su tipo)
 * @returns {object} el elemento creado
 */
export function agregarPieza(proyecto, pieza, archivo) {
  const elemento = agregarElemento(proyecto, { tipo: pieza.tipo, nombre: pieza.titulo, archivo: 'pendiente', origen: 'biblioteca', biblioteca: entradaDeFicha(pieza) });
  elemento.archivo = `${elemento.id}.${extensionPorMime(archivo.tipo)}`;
  return elemento;
}
```

- [ ] **Step 4: Usarlo en el editor**

En `plataforma/js/editor/biblioteca.js`, reemplazar los imports de `modelo.js`, `archivos.js` y `catalogo.js` por:

```js
import { eliminarElemento } from '../estado/modelo.js';
import { agregarPieza } from '../estado/biblioteca.js';
import { TIPOS_BIBLIOTECA, medioDeTipo } from '../biblioteca/catalogo.js';
```

y en `tomarPieza`, reemplazar el `sesion.cambiar` que crea el elemento por:

```js
  const elemento = sesion.cambiar((proyecto) => agregarPieza(proyecto, pieza, archivo), { origen: 'biblioteca', estructura: true });
```

- [ ] **Step 5: Correr la suite**

Run: `npm test`
Expected: PASS, 351 (las pruebas de `tests/biblioteca.test.js` siguen pasando sin cambios).

- [ ] **Step 6: Commit**

```bash
git add plataforma/js tests/estado-biblioteca.test.js
git commit -m "Biblioteca: agregar una pieza al proyecto sin la sesión, para compartirla con el ejemplo"
```

---

### Task 6: Retratos de muestra y el juego de ejemplo (`guia/ejemplo.js`)

Agrega 5 pruebas (356).

**Files:**
- Create: `scripts/generar-ejemplo.js`
- Create: `plataforma/ejemplo/retrato-ana.png`, `plataforma/ejemplo/retrato-farero.png` (los escribe el script)
- Create: `plataforma/js/guia/ejemplo.js`
- Create: `tests/ayudas/ejemplo.js`
- Test: `tests/generar-ejemplo.test.js`, `tests/ejemplo.test.js`
- Modify: `plataforma/README.md`

- [ ] **Step 1: Prueba del script**

```js
// tests/generar-ejemplo.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { retratos } from '../scripts/generar-ejemplo.js';
import { medidasPng } from '../scripts/png-wav.js';

test('los retratos de muestra son PNG de 64×64, deterministas e iguales a los guardados en plataforma/ejemplo', () => {
  const generados = retratos();
  assert.deepEqual(Object.keys(generados), ['retrato-ana.png', 'retrato-farero.png']);
  for (const [nombre, bytes] of Object.entries(generados)) {
    assert.deepEqual(medidasPng(bytes), { ancho: 64, alto: 64 });
    assert.deepEqual(bytes, retratos()[nombre], 'la misma ejecución da los mismos bytes');
    assert.deepEqual(bytes, readFileSync(new URL(`../plataforma/ejemplo/${nombre}`, import.meta.url)), `${nombre}: correr node scripts/generar-ejemplo.js`);
  }
});
```

Si `medidasPng` devuelve otra forma, mirarla en `scripts/png-wav.js` y ajustar solo la expectativa.

- [ ] **Step 2: Escribir el script**

```js
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
  const pelo = cara(l, { piel: C.naranja, pelo: C.hueso, ropa: C.pino, fondo: C.pizarra });
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
```

- [ ] **Step 3: Generar los archivos y correr la prueba**

Run: `node scripts/generar-ejemplo.js && node --test tests/generar-ejemplo.test.js`
Expected: «Retratos de muestra escritos…» y PASS.

- [ ] **Step 4: Ayuda de prueba con el catálogo real**

```js
// tests/ayudas/ejemplo.js
// Lo que el ejemplo necesita, leído del disco: el catálogo real de la biblioteca (con
// sus archivos) y cargar(ruta) para los retratos de muestra.
import { readFile } from 'node:fs/promises';
import { crearCatalogo } from '../../plataforma/js/biblioteca/catalogo.js';
import { mimePorExtension } from '../../plataforma/js/estado/archivos.js';

const PLATAFORMA = new URL('../../plataforma/', import.meta.url);

async function fetchDelDisco(url) {
  const ruta = new URL(String(url).replace('http://localhost/plataforma/', ''), PLATAFORMA);
  try {
    const datos = await readFile(ruta);
    return { ok: true, status: 200, json: async () => JSON.parse(datos.toString('utf8')), arrayBuffer: async () => datos.buffer.slice(datos.byteOffset, datos.byteOffset + datos.byteLength) };
  } catch {
    return { ok: false, status: 404 };
  }
}

export async function catalogoReal() {
  const catalogo = crearCatalogo({ url: 'http://localhost/plataforma/biblioteca/catalogo.json', fetch: fetchDelDisco });
  await catalogo.cargar();
  return catalogo;
}

export async function cargarDelDisco(ruta) {
  const datos = await readFile(new URL(ruta, PLATAFORMA));
  return { tipo: mimePorExtension(ruta), datos: datos.buffer.slice(datos.byteOffset, datos.byteOffset + datos.byteLength) };
}

/** El ejemplo recién armado, como lo arma «Empezar». */
export async function ejemploArmado(datos = { estudiante: 'Camila R.', destino: 'gratis' }) {
  const { crearEjemplo } = await import('../../plataforma/js/guia/ejemplo.js');
  return crearEjemplo(datos, { catalogo: await catalogoReal(), cargar: cargarDelDisco });
}
```

- [ ] **Step 5: Pruebas del ejemplo**

```js
// tests/ejemplo.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ejemploArmado, catalogoReal, cargarDelDisco } from './ayudas/ejemplo.js';
import { crearEjemplo } from '../plataforma/js/guia/ejemplo.js';
import { PIEZAS_BIBLIOTECA, TEXTOS_MUESTRA, piezasDeMuestra } from '../plataforma/js/guia/muestra.js';
import { cumpleMinimo, validar } from '../plataforma/js/estado/validacion.js';
import { validarEstructura } from '../plataforma/js/estado/copias.js';
import { crearPartida, vistaActual, avanzar, elegir } from '../plataforma/js/motor/partida.js';

test('el ejemplo arma «La llave del faro»: tres escenas, dos personajes con retrato de muestra, tres piezas de biblioteca y la guía en la fase 0', async () => {
  const { proyecto, archivos } = await ejemploArmado({ estudiante: 'Camila R.', destino: 'venta' });
  const { juego } = proyecto;
  assert.equal(proyecto.estudiante, 'Camila R.');
  assert.equal(juego.titulo, TEXTOS_MUESTRA.titulo);
  assert.equal(juego.destino, 'venta');
  assert.deepEqual(juego.escenas.map((e) => e.nombre), ['El muelle', 'La torre', 'Amanecer']);
  assert.equal(juego.escenaInicial, juego.escenas[0].id);
  assert.deepEqual(juego.personajes.map((p) => [p.nombre, p.descripcion]), [['Ana', 'Farera en su primer turno.'], ['El farero', 'Lleva treinta años cuidando la luz.']]);
  const retratos = juego.personajes.map((p) => juego.elementos.find((e) => e.id === p.retrato));
  assert.deepEqual(retratos.map((e) => e.origen), ['muestra', 'muestra']);
  assert.deepEqual(juego.elementos.filter((e) => e.origen === 'biblioteca').map((e) => e.biblioteca.id), ['bib_f01', 'bib_m05', 'bib_e02']);
  for (const e of juego.elementos) assert.ok(archivos.get(e.id)?.datos.byteLength > 0, `${e.nombre} tiene archivo`);
  assert.deepEqual(proyecto.guia, { fase: 'conocer', jugado: false });
  assert.deepEqual(validarEstructura(proyecto), []);
  assert.deepEqual(validar(juego).filter((a) => a.nivel === 'bloqueante'), []);
  assert.equal(piezasDeMuestra(proyecto).total, 14);
});

test('el ejemplo cumple el mínimo salvo los retratos y las piezas de muestra', async () => {
  const { proyecto } = await ejemploArmado();
  assert.deepEqual(cumpleMinimo(proyecto).faltantes.map((f) => f.codigo), ['M_PERSONAJES', 'M_MUESTRA']);
});

test('el ejemplo se juega con el motor hasta los créditos por las dos ramas', async () => {
  const { proyecto } = await ejemploArmado();
  for (const [opcion, final] of [[0, TEXTOS_MUESTRA.lineas[5]], [1, TEXTOS_MUESTRA.lineas[7]]]) {
    const partida = crearPartida(proyecto.juego);
    const vistos = [];
    for (let paso = 0; paso < 20 && vistaActual(partida).tipo !== 'creditos'; paso += 1) {
      const vista = vistaActual(partida);
      vistos.push(vista.texto);
      if (vista.tipo === 'decision') elegir(partida, opcion);
      else avanzar(partida);
    }
    assert.equal(vistaActual(partida).tipo, 'creditos');
    assert.equal(vistos.at(-1), final);
  }
});

test('las tres piezas del ejemplo existen en el catálogo real, con el título que nombra el error', async () => {
  const catalogo = await catalogoReal();
  for (const { id, titulo } of Object.values(PIEZAS_BIBLIOTECA)) assert.equal(catalogo.piezaDe(id)?.titulo, titulo, id);
});

test('si falta una pieza en el catálogo, el ejemplo no se arma y el error la nombra', async () => {
  const real = await catalogoReal();
  const catalogo = { ...real, piezaDe: (id) => (id === 'bib_f01' ? null : real.piezaDe(id)) };
  await assert.rejects(crearEjemplo({ estudiante: 'Camila R.', destino: 'gratis' }, { catalogo, cargar: cargarDelDisco }), { message: 'No se pudo preparar el ejemplo: falta la pieza «Muelle de noche» de la biblioteca.' });
  await assert.rejects(crearEjemplo({ estudiante: 'Camila R.', destino: 'gratis' }, { catalogo: null, cargar: cargarDelDisco }), { message: 'No se pudo preparar el ejemplo: la biblioteca no está disponible.' });
});
```

Revisar en `plataforma/js/motor/partida.js` que `elegir(partida, numero)` reciba el índice desde 0 (el reproductor le pasa `Number(tecla) - 1`).

- [ ] **Step 6: Correr y verlas fallar**

Run: `node --test tests/ejemplo.test.js`
Expected: FAIL, módulo `guia/ejemplo.js` no encontrado.

- [ ] **Step 7: Escribir el módulo**

```js
// plataforma/js/guia/ejemplo.js
// Arma el juego de ejemplo «La llave del faro» (diseño del modo guiado, sección 4) con
// las mismas funciones del modelo que usa el editor. Las piezas de biblioteca entran
// como al elegirlas en el editor (agregarPieza) y los retratos de muestra con origen
// 'muestra'. No guarda nada: devuelve el proyecto y sus archivos.
import { crearProyecto, agregarEscena, agregarPersonaje, agregarElemento, agregarLinea } from '../estado/modelo.js';
import { agregarPieza } from '../estado/biblioteca.js';
import { extensionPorMime } from '../estado/archivos.js';
import { TEXTOS_MUESTRA, PERSONAJES_MUESTRA, PIEZAS_BIBLIOTECA, RETRATOS_MUESTRA } from './muestra.js';

const falla = (detalle) => new Error(`No se pudo preparar el ejemplo: ${detalle}`);

/**
 * @param {{ estudiante: string, destino: string }} datos
 * @param {{ catalogo: object|null, cargar: (ruta: string) => Promise<{ tipo: string, datos: ArrayBuffer }> }} fuentes
 *   catalogo de crearCatalogo, ya cargado (null si no está disponible); cargar lee un archivo de plataforma/.
 * @returns {Promise<{ proyecto: object, archivos: Map }>}
 */
export async function crearEjemplo({ estudiante, destino }, { catalogo, cargar }, ahora = new Date()) {
  if (!catalogo) throw falla('la biblioteca no está disponible.');
  // Primero se consigue todo; si algo falta, no se arma nada.
  const piezas = {};
  for (const [clave, { id, titulo }] of Object.entries(PIEZAS_BIBLIOTECA)) {
    const pieza = catalogo.piezaDe(id);
    if (!pieza) throw falla(`falta la pieza «${titulo}» de la biblioteca.`);
    try {
      piezas[clave] = { pieza, archivo: await catalogo.obtenerArchivo(id) };
    } catch (error) {
      throw falla(error.message);
    }
  }
  const retratos = [];
  for (const retrato of RETRATOS_MUESTRA) {
    try {
      retratos.push({ ...retrato, archivo: await cargar(retrato.archivo) });
    } catch (error) {
      throw falla(error.message);
    }
  }

  const proyecto = crearProyecto({ estudiante, titulo: TEXTOS_MUESTRA.titulo, destino }, ahora);
  const archivos = new Map();
  const { juego } = proyecto;
  juego.sinopsis = TEXTOS_MUESTRA.sinopsis;
  const muelle = juego.escenas[0];
  muelle.nombre = 'El muelle';
  const torre = agregarEscena(proyecto, 'La torre');
  const amanecer = agregarEscena(proyecto, 'Amanecer');

  const [ana, farero] = PERSONAJES_MUESTRA.map((datos) => agregarPersonaje(proyecto, datos));
  [ana, farero].forEach((personaje, i) => {
    const { nombre, archivo } = retratos[i];
    const elemento = agregarElemento(proyecto, { tipo: 'retrato', nombre, archivo: 'pendiente', origen: 'muestra' });
    elemento.archivo = `${elemento.id}.${extensionPorMime(archivo.tipo)}`;
    archivos.set(elemento.id, archivo);
    personaje.retrato = elemento.id;
  });

  const elementos = {};
  for (const [clave, { pieza, archivo }] of Object.entries(piezas)) {
    elementos[clave] = agregarPieza(proyecto, pieza, archivo);
    archivos.set(elementos[clave].id, archivo);
  }
  muelle.fondo = elementos.fondo.id;
  muelle.musica = elementos.musica.id;

  const L = TEXTOS_MUESTRA.lineas;
  agregarLinea(muelle, 'narracion', { texto: L[0] });
  agregarLinea(muelle, 'dialogo', { personaje: ana.id, texto: L[1], efecto: elementos.efecto.id });
  agregarLinea(muelle, 'dialogo', { personaje: farero.id, texto: L[2] });
  agregarLinea(muelle, 'decision', { texto: L[3], opciones: [{ texto: 'Sí', escena: torre.id }, { texto: 'No', escena: amanecer.id }] });
  agregarLinea(torre, 'narracion', { texto: L[4] });
  agregarLinea(torre, 'fin', { texto: L[5] });
  agregarLinea(amanecer, 'dialogo', { personaje: farero.id, texto: L[6] });
  agregarLinea(amanecer, 'fin', { texto: L[7] });
  return { proyecto, archivos };
}
```

- [ ] **Step 8: Correr la suite**

Run: `npm test`
Expected: PASS, 356.

- [ ] **Step 9: Anotar los retratos en el README de la plataforma**

En `plataforma/README.md`, después del párrafo de **Biblioteca real**, agregar:

```markdown
- **Juego de ejemplo.** El modo guiado parte de «La llave del faro», que se arma por código al pulsar
  «Empezar» (`js/guia/ejemplo.js`). Usa tres piezas del catálogo (`bib_f01`, `bib_m05`, `bib_e02`,
  fijadas en `js/guia/muestra.js`; si la biblioteca cambia, deben seguir existiendo o cambiarse allí) y
  dos retratos de muestra en `ejemplo/`, dibujados por programa (`scripts/generar-ejemplo.js`), sin autor
  humano y publicados bajo CC0.
```

- [ ] **Step 10: Commit**

```bash
git add scripts/generar-ejemplo.js plataforma/ejemplo plataforma/js/guia/ejemplo.js plataforma/README.md tests/ayudas/ejemplo.js tests/generar-ejemplo.test.js tests/ejemplo.test.js
git commit -m "Guía: el juego de ejemplo «La llave del faro», con dos retratos de muestra generados por programa"
```

---

### Task 7: Las nueve fases (`guia/fases.js`)

Agrega 6 pruebas (362).

**Files:**
- Create: `plataforma/js/guia/fases.js`
- Test: `tests/fases.test.js`

- [ ] **Step 1: Escribir las pruebas**

```js
// tests/fases.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ejemploArmado } from './ayudas/ejemplo.js';
import { FASES, estadoDeGuia } from '../plataforma/js/guia/fases.js';
import { FASES_GUIA, agregarElemento, eliminarElemento } from '../plataforma/js/estado/modelo.js';

const contenido = JSON.parse(readFileSync(new URL('../plataforma/contenido/juridico.json', import.meta.url), 'utf8'));
const entradaDe = (clave) => clave.split('.').reduce((o, k) => o?.[k], contenido);
const tareas = (estado, id) => Object.fromEntries(estado.fases.find((f) => f.id === id).tareas.map((t) => [t.texto, t.cumplida]));

test('nueve fases en el orden del modelo; cada lección existe en el contenido jurídico, sin textos nuevos', () => {
  assert.deepEqual(FASES.map((f) => f.id), FASES_GUIA);
  assert.deepEqual(FASES.map((f) => f.nombre), ['Conoce el ejemplo', 'Tu historia', 'Tus personajes', 'Sus retratos', 'El fondo', 'Música y efectos', 'Una voz (opcional)', 'Destino y mapa', 'Publicar']);
  for (const fase of FASES) {
    assert.ok(fase.instruccion.length > 0, fase.id);
    for (const clave of fase.leccion) {
      const entrada = entradaDe(clave);
      assert.ok(entrada?.breve && entrada.completo && entrada.fuente, `${fase.id}: ${clave}`);
    }
  }
  assert.deepEqual(FASES.find((f) => f.id === 'publicar').leccion, []);
});

test('con el ejemplo recién armado: fase 0 pendiente de jugar; lo que el ejemplo ya cumple se marca solo', async () => {
  const { proyecto } = await ejemploArmado();
  const estado = estadoDeGuia(proyecto);
  assert.equal(estado.indiceActual, 0);
  assert.equal(estado.actual.id, 'conocer');
  assert.equal(estado.puedeAvanzar, false);
  assert.deepEqual(tareas(estado, 'conocer'), { 'Juega el ejemplo hasta los créditos': false });
  assert.deepEqual(tareas(estado, 'historia'), { 'Ponle tu título': false, 'Escribe tu sinopsis': false, 'Reescribe las 8 líneas de muestra': false, 'Conserva tres escenas y una decisión': true, 'Ficha de la historia en verde': true });
  assert.equal(estado.fases[1].tareas[2].detalle, 'quedan 8');
  assert.deepEqual(tareas(estado, 'fondo'), { 'La escena inicial tiene fondo': true, 'Fichas de los fondos en verde': false });
  assert.deepEqual(tareas(estado, 'voz'), { '(Opcional) Graba una voz y resuelve su ficha': true });
  assert.deepEqual(tareas(estado, 'destino'), { 'Todo en verde': false, 'Sin piezas de muestra': false, 'Al menos una pieza que no hiciste tú': true });
  proyecto.guia.jugado = true;
  assert.equal(estadoDeGuia(proyecto).puedeAvanzar, true);
});

test('el recorrido marca cada tarea al editar el proyecto', async () => {
  const { proyecto } = await ejemploArmado();
  const { juego, fichas } = proyecto;
  const lineas = juego.escenas.flatMap((e) => e.lineas);
  juego.titulo = 'El faro de Camila';
  juego.sinopsis = 'Una guardiana descubre una reja abierta.';
  lineas.forEach((l, i) => { l.texto = `Línea propia ${i + 1}`; });
  assert.ok(estadoDeGuia(proyecto).fases[1].completa);

  juego.personajes[0].nombre = 'Lucía';
  assert.equal(tareas(estadoDeGuia(proyecto), 'personajes')['Dales nombre y descripción a los dos personajes'], false);
  juego.personajes[1].nombre = 'El guardián';
  assert.ok(estadoDeGuia(proyecto).fases[2].completa);

  for (const personaje of juego.personajes) {
    const propio = agregarElemento(proyecto, { tipo: 'retrato', nombre: `Retrato de ${personaje.nombre}`, archivo: `${personaje.nombre}.png`, origen: 'creado' });
    const muestra = personaje.retrato;
    personaje.retrato = propio.id;
    eliminarElemento(proyecto, muestra);
  }
  assert.ok(estadoDeGuia(proyecto).fases[3].completa);

  const [fondo, musica, efecto] = juego.elementos.filter((e) => e.origen === 'biblioteca');
  fichas[fondo.id].licenciaLeida = true;
  assert.ok(estadoDeGuia(proyecto).fases[4].completa);
  fichas[musica.id].licenciaLeida = true;
  fichas[efecto.id].licenciaLeida = true;
  assert.equal(tareas(estadoDeGuia(proyecto), 'sonido')['Fichas de música y efectos en verde'], false, 'falta aceptar compartir igual');
  fichas[musica.id].aceptaCompartirIgual = true;
  assert.ok(estadoDeGuia(proyecto).fases[5].completa);
  assert.ok(estadoDeGuia(proyecto).fases[7].completa);
  assert.equal(estadoDeGuia(proyecto).fases[8].completa, false);
  proyecto.publicado = '2026-11-08T12:00:00.000Z';
  assert.ok(estadoDeGuia(proyecto).fases[8].completa);
});

test('la fase de la voz es opcional: con una voz en amarillo no está completa, pero se puede avanzar', async () => {
  const { proyecto } = await ejemploArmado();
  proyecto.guia.fase = 'voz';
  agregarElemento(proyecto, { tipo: 'voz', nombre: 'Voz subida', archivo: 'voz.wav', origen: 'subido' });
  const estado = estadoDeGuia(proyecto);
  assert.equal(estado.actual.completa, false);
  assert.equal(estado.actual.opcional, true);
  assert.equal(estado.puedeAvanzar, true);
});

test('puedeIrA: atrás siempre; adelante solo si las fases intermedias están completas', async () => {
  const { proyecto } = await ejemploArmado();
  proyecto.guia.fase = 'historia';
  proyecto.guia.jugado = true;
  let estado = estadoDeGuia(proyecto);
  assert.equal(estado.puedeIrA('conocer'), true);
  assert.equal(estado.puedeIrA('historia'), true);
  assert.equal(estado.puedeIrA('personajes'), false);
  assert.equal(estado.puedeIrA('inventada'), false);
  proyecto.juego.titulo = 'El faro de Camila';
  proyecto.juego.sinopsis = 'Otra.';
  proyecto.juego.escenas.flatMap((e) => e.lineas).forEach((l, i) => { l.texto = `Propia ${i}`; });
  estado = estadoDeGuia(proyecto);
  assert.equal(estado.puedeIrA('personajes'), true, 'la historia ya está completa');
  assert.equal(estado.puedeIrA('retratos'), false, 'los personajes siguen con nombres de muestra');
});

test('deshacer una tarea anterior no cambia la fase actual, pero esa fase pierde su marca', async () => {
  const { proyecto } = await ejemploArmado();
  proyecto.guia = { fase: 'retratos', jugado: true };
  proyecto.juego.titulo = 'El faro de Camila';
  proyecto.juego.sinopsis = 'Otra.';
  proyecto.juego.escenas.flatMap((e) => e.lineas).forEach((l, i) => { l.texto = `Propia ${i}`; });
  assert.ok(estadoDeGuia(proyecto).fases[1].completa);
  proyecto.juego.titulo = 'La llave del faro';
  const estado = estadoDeGuia(proyecto);
  assert.equal(estado.actual.id, 'retratos');
  assert.equal(estado.fases[1].completa, false);
});
```

- [ ] **Step 2: Correr y verlas fallar**

Run: `node --test tests/fases.test.js`
Expected: FAIL, módulo no encontrado.

- [ ] **Step 3: Escribir el módulo**

```js
// plataforma/js/guia/fases.js
// Las nueve fases del modo guiado (diseño del modo guiado, sección 6) y el estado de la
// guía calculado del proyecto. Puro: cada tarea es un texto fijo y una condición sobre
// el proyecto, sus semáforos, su mínimo y sus avisos. Las instrucciones no afirman nada
// jurídico; las lecciones son claves de contenido/juridico.json.
import { FASES_GUIA } from '../estado/modelo.js';
import { evaluarTodo } from '../juridico/semaforo.js';
import { cumpleMinimo, validar } from '../estado/validacion.js';
import { TEXTOS_MUESTRA, esTextoDeMuestra, piezasDeMuestra } from './muestra.js';

const vacio = (texto) => !String(texto ?? '').trim();
const verde = (c, id) => c.semaforos.get(id)?.color === 'verde';
const cumple = (c, codigo) => !c.faltan.has(codigo);
const deTipo = (c, ...tipos) => c.juego.elementos.filter((e) => tipos.includes(e.tipo));
const todosVerdes = (c, lista) => lista.every((e) => verde(c, e.id));

/** Retratos propios (no de muestra) que usan los personajes. */
function retratosPropios(c) {
  return c.juego.personajes
    .map((p) => c.juego.elementos.find((e) => e.id === p.retrato))
    .filter((e) => e && e.origen !== 'muestra');
}

export const FASES = [
  {
    id: 'conocer',
    nombre: 'Conoce el ejemplo',
    instruccion: 'Juega «La llave del faro» de principio a fin. Fíjate en sus piezas: la historia, los personajes, sus retratos, el fondo y los sonidos. En las fases siguientes las vas a hacer tuyas.',
    leccion: ['campos.tipoObra'],
    tareas: [{ texto: 'Juega el ejemplo hasta los créditos', cumple: (c) => c.proyecto.guia?.jugado === true }],
  },
  {
    id: 'historia',
    nombre: 'Tu historia',
    instruccion: 'Cambia el título y la sinopsis en «El juego» y reescribe en el guion cada línea del ejemplo con tus palabras. Puedes cambiar las escenas, pero conserva tres y una decisión.',
    leccion: ['tiposObra.literaria', 'notas.N_TITULO'],
    tareas: [
      { texto: 'Ponle tu título', cumple: (c) => !vacio(c.juego.titulo) && !c.muestra.titulo },
      { texto: 'Escribe tu sinopsis', cumple: (c) => !vacio(c.juego.sinopsis) && !c.muestra.sinopsis },
      { texto: 'Reescribe las 8 líneas de muestra', cumple: (c) => c.muestra.lineas === 0, detalle: (c) => `quedan ${c.muestra.lineas}` },
      { texto: 'Conserva tres escenas y una decisión', cumple: (c) => cumple(c, 'M_ESCENAS') && cumple(c, 'M_DECISIONES') && !c.avisos.some((a) => a.nivel === 'bloqueante') },
      { texto: 'Ficha de la historia en verde', cumple: (c) => verde(c, 'historia') },
    ],
  },
  {
    id: 'personajes',
    nombre: 'Tus personajes',
    instruccion: 'Dale a cada personaje un nombre y una descripción tuyos. Los diálogos los siguen: no hace falta reasignarlos.',
    leccion: ['campos.autoria'],
    tareas: [
      { texto: 'Dales nombre y descripción a los dos personajes', cumple: (c) => c.juego.personajes.length >= 2 && c.juego.personajes.every((p) => !vacio(p.nombre) && !vacio(p.descripcion) && !esTextoDeMuestra(p.nombre, TEXTOS_MUESTRA.personajes)) },
      { texto: 'Fichas de los personajes en verde', cumple: (c) => c.juego.personajes.every((p) => verde(c, p.id)) },
    ],
  },
  {
    id: 'retratos',
    nombre: 'Sus retratos',
    instruccion: 'Haz o consigue un retrato para cada personaje con Pixel art, Subir archivo o la Biblioteca, y asígnaselo en sus propiedades. El retrato de muestra desaparece solo cuando ya nadie lo usa.',
    leccion: ['tiposObra.artistica', 'campos.prueba', 'notas.N_SELLO'],
    tareas: [
      { texto: 'Reemplaza el retrato de cada personaje', cumple: (c) => c.juego.personajes.length > 0 && retratosPropios(c).length === c.juego.personajes.length },
      { texto: 'Fichas de los retratos en verde', cumple: (c) => retratosPropios(c).length > 0 && todosVerdes(c, retratosPropios(c)) },
    ],
  },
  {
    id: 'fondo',
    nombre: 'El fondo',
    instruccion: 'El muelle tiene un fondo de la biblioteca. Puedes quedártelo si resuelves su ficha, o cambiarlo por uno tuyo en las propiedades de la escena.',
    leccion: ['campos.respaldo', 'campos.credito'],
    tareas: [
      { texto: 'La escena inicial tiene fondo', cumple: (c) => {
        const inicial = c.juego.escenas.find((e) => e.id === c.juego.escenaInicial);
        return Boolean(inicial?.fondo) && c.juego.elementos.some((e) => e.id === inicial.fondo && e.tipo === 'fondo');
      } },
      { texto: 'Fichas de los fondos en verde', cumple: (c) => cumple(c, 'M_FONDOS') && todosVerdes(c, deTipo(c, 'fondo')) },
    ],
  },
  {
    id: 'sonido',
    nombre: 'Música y efectos',
    instruccion: 'La música y el efecto del ejemplo vienen de la biblioteca. Resuelve sus fichas o cámbialos por los tuyos con el Secuenciador, Grabar o la Biblioteca.',
    leccion: ['tiposObra.musical_fonograma', 'tiposObra.fonograma'],
    tareas: [
      { texto: 'Al menos una pista y un efecto', cumple: (c) => cumple(c, 'M_MUSICA') && cumple(c, 'M_EFECTOS') },
      { texto: 'Fichas de música y efectos en verde', cumple: (c) => todosVerdes(c, deTipo(c, 'musica', 'efecto')) },
    ],
  },
  {
    id: 'voz',
    nombre: 'Una voz (opcional)',
    instruccion: 'Si quieres, graba una voz con Grabar y asígnala a un diálogo en sus propiedades. Puedes pasar a la siguiente fase sin hacerlo.',
    leccion: ['tiposObra.interpretacion'],
    opcional: true,
    tareas: [{ texto: '(Opcional) Graba una voz y resuelve su ficha', cumple: (c) => todosVerdes(c, deTipo(c, 'voz')) }],
  },
  {
    id: 'destino',
    nombre: 'Destino y mapa',
    instruccion: 'Revisa el destino en «El juego»: cambiarlo puede cambiar los semáforos. Luego abre el mapa de activos y comprueba que todo esté en verde y que no quede nada de muestra.',
    leccion: ['campos.destino', 'campos.titular'],
    tareas: [
      { texto: 'Todo en verde', cumple: (c) => [...c.semaforos.values()].every((r) => r.color === 'verde') },
      { texto: 'Sin piezas de muestra', cumple: (c) => cumple(c, 'M_MUESTRA') },
      { texto: 'Al menos una pieza que no hiciste tú', cumple: (c) => cumple(c, 'M_AJENOS') },
    ],
  },
  {
    id: 'publicar',
    nombre: 'Publicar',
    instruccion: 'Pulsa «Publicar», toma la decisión de registro y descarga el paquete. Súbelo al formulario del curso.',
    leccion: [],
    tareas: [{ texto: 'Publica y descarga el paquete', cumple: (c) => typeof c.proyecto.publicado === 'string' }],
  },
];

/**
 * Estado de la guía para el proyecto. Calcula semáforos, mínimo, avisos y piezas de
 * muestra una sola vez. La fase actual sale de proyecto.guia.fase (la primera si no se reconoce).
 * @returns {{ fases: Array<{ id, nombre, opcional, completa, tareas: Array<{ texto, cumplida, detalle }> }>, actual, indiceActual, puedeAvanzar, puedeIrA(id): boolean }}
 */
export function estadoDeGuia(proyecto) {
  const c = {
    proyecto,
    juego: proyecto.juego,
    semaforos: evaluarTodo(proyecto),
    faltan: new Set(cumpleMinimo(proyecto).faltantes.map((f) => f.codigo)),
    avisos: validar(proyecto.juego),
    muestra: piezasDeMuestra(proyecto),
  };
  const fases = FASES.map((fase) => {
    const tareas = fase.tareas.map((t) => {
      const cumplida = Boolean(t.cumple(c));
      return { texto: t.texto, cumplida, detalle: !cumplida && t.detalle ? t.detalle(c) : null };
    });
    return { id: fase.id, nombre: fase.nombre, opcional: fase.opcional === true, completa: tareas.every((t) => t.cumplida), tareas };
  });
  const indiceActual = Math.max(0, FASES.findIndex((f) => f.id === proyecto.guia?.fase));
  const avanzable = (i) => fases[i].completa || fases[i].opcional;
  return {
    fases,
    actual: fases[indiceActual],
    indiceActual,
    puedeAvanzar: indiceActual < fases.length - 1 && avanzable(indiceActual),
    puedeIrA(id) {
      const destino = FASES.findIndex((f) => f.id === id);
      if (destino === -1) return false;
      if (destino <= indiceActual) return true;
      for (let i = indiceActual; i < destino; i += 1) if (!avanzable(i)) return false;
      return true;
    },
  };
}
```

- [ ] **Step 4: Correr la suite**

Run: `npm test`
Expected: PASS, 362.

- [ ] **Step 5: Commit**

```bash
git add plataforma/js/guia/fases.js tests/fases.test.js
git commit -m "Guía: las nueve fases con sus tareas, que se evalúan solas sobre el proyecto"
```

---

### Task 8: Las piezas de muestra en el inventario, la ficha, las propiedades y el mapa

Agrega 3 pruebas (365).

**Files:**
- Modify: `plataforma/js/editor/inventario.js`
- Modify: `plataforma/js/editor/panel-ficha.js`
- Modify: `plataforma/js/editor/propiedades.js`
- Modify: `plataforma/js/editor/mapa-activos.js`
- Test: `tests/inventario.test.js`, `tests/panel-ficha.test.js`, `tests/mapa-activos.test.js`

- [ ] **Step 1: Escribir las pruebas**

En `tests/inventario.test.js` (usar la forma de armar que ya tiene el archivo; si arma con otra función, adaptar solo esa línea):

```js
test('las secciones llevan data-seccion; un elemento de muestra dice «de muestra» y no tiene punto de semáforo', () => {
  const p = crearProyecto({ estudiante: 'Camila R.', titulo: 'El faro de Camila' });
  const muestra = agregarElemento(p, { tipo: 'retrato', nombre: 'Retrato de Ana (muestra)', archivo: 'm.png', origen: 'muestra' });
  const { sesion } = sesionDePrueba(p);
  const contenedor = document.createElement('div');
  crearInventario(contenedor, sesion, { alSeleccionar: () => {}, alSubir: () => {} }).dibujar(null);
  assert.deepEqual([...contenedor.querySelectorAll('[data-seccion]')].map((n) => n.dataset.seccion), ['juego', 'escenas', 'personajes', 'elementos']);
  const entrada = contenedor.querySelector(`[data-foco="elemento:${muestra.id}"]`);
  assert.ok(entrada.classList.contains('entrada-muestra'));
  assert.equal(entrada.querySelector('.entrada-detalle').textContent, 'Retrato de muestra');
  assert.equal(entrada.querySelector('.punto-semaforo'), null);
  assert.ok(entrada.querySelector('.marca-muestra'));
});
```

En `tests/panel-ficha.test.js`:

```js
test('la ficha de un retrato de muestra solo avisa y ofrece reemplazarlo', () => {
  const p = crearProyecto({ estudiante: 'Camila R.', titulo: 'El faro de Camila' });
  const muestra = agregarElemento(p, { tipo: 'retrato', nombre: 'Muestra', archivo: 'm.png', origen: 'muestra' });
  const { sesion } = sesionDePrueba(p);
  const pedidos = [];
  const nodo = panelFicha(sesion, muestra.id, { contenido, alReemplazar: (clave) => pedidos.push(clave) });
  assert.equal(nodo.querySelector('.ficha-muestra-aviso').textContent, 'Retrato de muestra del ejemplo: reemplázalo por uno tuyo.');
  assert.equal(nodo.querySelector('.ficha-resultado'), null, 'no se evalúa');
  assert.equal(nodo.querySelector('fieldset'), null, 'no se llena');
  for (const boton of nodo.querySelectorAll('button[data-accion^="reemplazar-"]')) clic(boton);
  assert.deepEqual(pedidos, ['pixel', 'subir', 'biblioteca']);
});
```

En `tests/mapa-activos.test.js`:

```js
test('el mapa marca las filas de muestra y no las cuenta en los colores', () => {
  const p = crearProyecto({ estudiante: 'Camila R.', titulo: 'El faro de Camila' });
  agregarElemento(p, { tipo: 'retrato', nombre: 'Muestra', archivo: 'm.png', origen: 'muestra' });
  const { sesion } = sesionDePrueba(p);
  const contenedor = document.createElement('div');
  const mapa = crearMapaActivos(contenedor, sesion, { contenido, alSeleccionar: () => {} });
  mapa.abrir();
  const fila = contenedor.querySelector('tr.riesgo-muestra');
  assert.ok(fila.textContent.includes('De muestra'));
  assert.equal(fila.querySelector('.punto-semaforo'), null);
  assert.match(contenedor.querySelector('.mapa-resumen').textContent, /^3 activos: 2 en verde, 0 en amarillo, 0 en rojo; 1 de muestra\.$/);
});
```

Agregar en cada archivo los imports que falten (`crearProyecto`, `agregarElemento`, `sesionDePrueba`, `clic`, `contenido`) con la forma en que el archivo ya importa lo suyo.

- [ ] **Step 2: Correr y verlas fallar**

Run: `node --test tests/inventario.test.js tests/panel-ficha.test.js tests/mapa-activos.test.js`
Expected: FAIL.

- [ ] **Step 3: Inventario**

En `plataforma/js/editor/inventario.js`:

`entrada` acepta una clase extra:

```js
  function entrada({ clave, texto, detalle = null, activa = false, marca = null, clase = '', alPulsar }) {
    return h('li', {},
      h('button', { type: 'button', class: `entrada${activa ? ' activa' : ''}${clase ? ` ${clase}` : ''}`, dataset: { foco: clave }, 'aria-current': activa ? 'true' : null, onclick: alPulsar },
```

(el resto de `entrada` no cambia). `seccion` recibe la clave de la sección:

```js
  function seccion(clave, titulo, botones, entradas) {
    return h('section', { class: 'inventario-seccion', dataset: { seccion: clave } },
```

En `dibujar`, la lista de «El juego» lleva su clave:

```js
        h('ul', { class: 'lista', dataset: { seccion: 'juego' } }, entrada({ clave: 'juego', texto: juego.titulo?.trim() || 'Sin título', detalle: 'El juego', activa: seleccion?.tipo === 'juego', alPulsar: () => alSeleccionar({ tipo: 'juego' }) })),
```

las tres llamadas a `seccion` pasan `'escenas'`, `'personajes'` y `'elementos'` como primer argumento, y la entrada de cada elemento queda:

```js
        ], juego.elementos.map((elemento) => {
          const deMuestra = elemento.origen === 'muestra';
          return entrada({
            clave: `elemento:${elemento.id}`,
            texto: elemento.nombre?.trim() || 'Sin nombre',
            detalle: deMuestra ? `${NOMBRES_TIPO[elemento.tipo]} de muestra` : NOMBRES_TIPO[elemento.tipo],
            activa: esActiva('elemento', elemento.id),
            clase: deMuestra ? 'entrada-muestra' : '',
            marca: deMuestra ? h('span', { class: 'marca-muestra', 'aria-hidden': 'true' }) : punto(elemento.id, elemento.nombre?.trim() || 'Sin nombre'),
            alPulsar: () => alSeleccionar({ tipo: 'elemento', id: elemento.id }),
          });
        })),
```

Revisar las pruebas existentes de `tests/inventario.test.js` que buscan secciones por posición: siguen valiendo, porque el orden no cambia.

- [ ] **Step 4: Panel de ficha**

En `plataforma/js/editor/panel-ficha.js`, agregar `alReemplazar = null` a las opciones de `panelFicha` y documentarlo en el JSDoc («alReemplazar(clave) abre Pixel art, Subir archivo o la Biblioteca para reemplazar un retrato de muestra; puede faltar»). Justo después de calcular `elemento`:

```js
  if (elemento?.origen === 'muestra') {
    const opciones = [['pixel', 'Pixel art'], ['subir', 'Subir archivo'], ['biblioteca', 'Biblioteca']];
    return h('section', { class: 'ficha ficha-muestra', tabIndex: -1, dataset: { ficha: idFicha, foco: `ficha:${idFicha}` }, 'aria-label': titulo },
      h('h3', {}, titulo),
      h('p', { class: 'ficha-muestra-aviso' }, 'Retrato de muestra del ejemplo: reemplázalo por uno tuyo.'),
      alReemplazar ? h('div', { class: 'acciones' }, opciones.map(([clave, texto]) =>
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: `reemplazar-${clave}` }, onclick: () => alReemplazar(clave) }, texto))) : null);
  }
```

- [ ] **Step 5: Propiedades**

En `plataforma/js/editor/propiedades.js`:

```js
const NOMBRES_ORIGEN = { creado: 'Creado en la plataforma', subido: 'Subido', biblioteca: 'De la biblioteca', muestra: 'Muestra del ejemplo' };
```

Agregar `alReemplazar = null` a las opciones de `crearPropiedades` y pasarlo a la ficha:

```js
  const ficha = (id, titulo) => panelFicha(sesion, id, { contenido: contenido ?? {}, alSeleccionar, titulo, piezaDe, alReemplazar });
```

- [ ] **Step 6: Mapa de activos**

En `plataforma/js/editor/mapa-activos.js`, dentro de `dibujar`:

```js
    const lista = filas(sesion.proyecto, contenido);
    const cuenta = { verde: 0, amarillo: 0, rojo: 0, muestra: 0 };
    for (const fila of lista) cuenta[fila.muestra ? 'muestra' : fila.color] += 1;
    const resumen = `${lista.length} activos: ${cuenta.verde} en verde, ${cuenta.amarillo} en amarillo, ${cuenta.rojo} en rojo${cuenta.muestra ? `; ${cuenta.muestra} de muestra` : ''}.`;
```

y usar `resumen` en el párrafo `.mapa-resumen`. La fila:

```js
        h('tbody', {}, lista.map((fila) => h('tr', { dataset: { ficha: fila.id }, class: `riesgo-${fila.muestra ? 'muestra' : fila.color}` },
```

y la celda del riesgo:

```js
          h('td', {}, fila.muestra ? h('span', { class: 'chip' }, 'De muestra') : [puntoSemaforo(fila.color, `Riesgo de ${fila.activo}`), ' ', NOMBRES_COLOR[fila.color], ' ',
            fila.porVerificar ? h('span', { class: 'por-verificar', title: 'Algún texto de esta fila está pendiente de verificación jurídica' }, 'Por verificar') : null]),
```

`h()` aplana los arreglos de hijos, así que la rama normal dibuja lo mismo que antes. «Ver ficha» de una fila de muestra lleva a la ficha con el aviso, que es lo que se quiere.

- [ ] **Step 7: Correr la suite**

Run: `npm test`
Expected: PASS, 365.

- [ ] **Step 8: Commit**

```bash
git add plataforma/js/editor tests
git commit -m "Editor: los retratos de muestra se marcan en el inventario y el mapa, y su ficha solo ofrece reemplazarlos"
```

---

### Task 9: `alTerminar` en el reproductor y la banda de guía (`guia/banda.js`)

Agrega 7 pruebas (372).

**Files:**
- Modify: `plataforma/js/motor/reproductor.js`
- Create: `plataforma/js/guia/banda.js`
- Test: `tests/reproductor.test.js`, `tests/banda.test.js`

- [ ] **Step 1: Prueba del reproductor**

En `tests/reproductor.test.js` (agregar al import lo que falte: `crearProyecto` y `agregarLinea` del modelo, `clic` de `./ayudas/dom.js`):

```js
test('alTerminar se llama una vez al llegar a los créditos, y otra vez tras reiniciar', () => {
  const p = crearProyecto({ estudiante: 'Camila R.', titulo: 'El faro de Camila' });
  agregarLinea(p.juego.escenas[0], 'narracion', { texto: 'Niebla.' });
  agregarLinea(p.juego.escenas[0], 'fin', { texto: 'Fin.' });
  const juego = p.juego;
  const contenedor = document.createElement('div');
  document.body.append(contenedor);
  let terminadas = 0;
  const { raiz } = jugar(contenedor, juego, () => null, { alTerminar: () => { terminadas += 1; }, crearAudio: () => ({ play() {}, pause() {} }) });
  const escena = raiz.querySelector('.reproductor-escena');
  for (let i = 0; i < 10 && !raiz.querySelector('.escenario-creditos'); i += 1) clic(escena);
  assert.ok(raiz.querySelector('.escenario-creditos'));
  clic(escena);
  assert.equal(terminadas, 1, 'quedarse en los créditos no vuelve a avisar');
  clic(raiz.querySelector('[data-accion="reiniciar"]'));
  for (let i = 0; i < 10 && !raiz.querySelector('.escenario-creditos'); i += 1) clic(escena);
  assert.equal(terminadas, 2);
  contenedor.remove();
});
```

- [ ] **Step 2: Implementar `alTerminar`**

En `plataforma/js/motor/reproductor.js`, actualizar el comentario de opciones («opciones: escenaInicial, creditos, titulo, alCerrar, alTerminar (una vez por partida que llega a los créditos), crearAudio.»), agregar `alTerminar = null,` a la desestructuración de opciones y, junto a `ultimaLinea`:

```js
  let terminoAvisado = false; // alTerminar se llama una vez por partida terminada
```

En `dibujar`, dentro del `if (terminada || enCreditos) {`, antes del `return`:

```js
      if (terminada && !terminoAvisado) {
        terminoAvisado = true;
        alTerminar?.();
      }
```

En `botonReiniciar`, agregar `terminoAvisado = false;` junto a `ultimaLinea = null;`.

Run: `node --test tests/reproductor.test.js`
Expected: PASS.

- [ ] **Step 3: Pruebas de la banda**

```js
// tests/banda.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { instalarDom, clic, textos } from './ayudas/dom.js';
import { sesionDePrueba } from './ayudas/sesion.js';
import { ejemploArmado } from './ayudas/ejemplo.js';
import { crearBanda, retirarMuestrasSinUso } from '../plataforma/js/guia/banda.js';
import { agregarElemento } from '../plataforma/js/estado/modelo.js';

instalarDom();
const contenido = JSON.parse(readFileSync(new URL('../plataforma/contenido/juridico.json', import.meta.url), 'utf8'));

async function armar({ ancho = 1280, preparar = () => {} } = {}) {
  const { proyecto, archivos } = await ejemploArmado();
  preparar(proyecto);
  const { sesion } = sesionDePrueba(proyecto, { archivos });
  const raiz = document.createElement('div');
  const contenedor = document.createElement('section');
  raiz.append(contenedor);
  document.body.append(raiz);
  const llamadas = [];
  const banda = crearBanda(contenedor, sesion, { contenido, raiz, alJugar: () => llamadas.push('jugar'), alMapa: () => llamadas.push('mapa'), alPublicar: () => llamadas.push('publicar'), anchoVentana: () => ancho });
  sesion.suscribir((e) => { if (e.tipo === 'cambio') banda.dibujar(); });
  banda.dibujar();
  const q = (s) => contenedor.querySelector(s);
  return { sesion, banda, raiz, contenedor, llamadas, q, cerrar: () => raiz.remove() };
}

test('dibuja la fase 0: progreso, instrucción, lección del contenido, tareas y botones; marca la raíz con data-fase', async () => {
  const { q, contenedor, raiz, llamadas, cerrar } = await armar();
  assert.equal(raiz.dataset.fase, 'conocer');
  assert.equal(q('.banda-fase').textContent, 'Inicio · Conoce el ejemplo');
  assert.equal(contenedor.querySelectorAll('.banda-punto').length, 9);
  assert.equal(q('.banda-punto[aria-current="step"]').dataset.fase, 'conocer');
  assert.match(q('.banda-instruccion').textContent, /La llave del faro/);
  assert.equal(q('.banda-leccion .ficha-breve').textContent.trim(), contenido.campos.tipoObra.breve);
  assert.ok(q('.banda-leccion').hasAttribute('open'), 'a 1280 px la lección se ve abierta');
  assert.deepEqual(textos(contenedor, '.banda-lista li .banda-tarea'), ['Juega el ejemplo hasta los créditos']);
  assert.equal(q('[data-accion="guia-atras"]').disabled, true);
  assert.equal(q('[data-accion="guia-siguiente"]').disabled, true);
  clic(q('[data-accion="guia-jugar"]'));
  assert.deepEqual(llamadas, ['jugar']);
  cerrar();
});

test('en una ventana angosta la lección se pliega bajo «Ver la lección»', async () => {
  const { q, cerrar } = await armar({ ancho: 1000 });
  assert.equal(q('.banda-leccion').hasAttribute('open'), false);
  assert.equal(q('.banda-leccion summary').textContent, 'Ver la lección');
  cerrar();
});

test('al jugar se marca la tarea y se anuncia; Siguiente avanza, cambia data-fase y conserva el foco', async () => {
  const { sesion, q, raiz, cerrar } = await armar();
  sesion.cambiar((p) => { p.guia.jugado = true; }, { origen: 'guia' });
  assert.ok(q('.banda-lista li').classList.contains('cumplida'));
  assert.match(document.getElementById('anuncios').textContent, /^Fase completa: Conoce el ejemplo/);
  const siguiente = q('[data-accion="guia-siguiente"]');
  assert.equal(siguiente.disabled, false);
  siguiente.focus();
  clic(siguiente);
  assert.equal(sesion.proyecto.guia.fase, 'historia');
  assert.equal(raiz.dataset.fase, 'historia');
  assert.equal(q('.banda-fase').textContent, 'Fase 1 de 8 · Tu historia');
  assert.equal(document.activeElement, q('[data-accion="guia-siguiente"]'));
  assert.equal(document.getElementById('anuncios').textContent, 'Fase 1 de 8: Tu historia.');
  assert.match(q('.banda-lista').textContent, /Reescribe las 8 líneas de muestra \(quedan 8\)/);
  cerrar();
});

test('Atrás vuelve; los puntos de fases posteriores solo se pulsan si las intermedias están completas', async () => {
  const { sesion, q, cerrar } = await armar({ preparar: (p) => { p.guia = { fase: 'historia', jugado: true }; } });
  assert.equal(q('.banda-punto[data-fase="conocer"]').disabled, false);
  assert.equal(q('.banda-punto[data-fase="personajes"]').disabled, true);
  clic(q('[data-accion="guia-atras"]'));
  assert.equal(sesion.proyecto.guia.fase, 'conocer');
  clic(q('.banda-punto[data-fase="historia"]'));
  assert.equal(sesion.proyecto.guia.fase, 'historia');
  cerrar();
});

test('en la fase de publicar el botón de la banda sigue el candado de Publicar', async () => {
  const { q, llamadas, cerrar } = await armar({ preparar: (p) => { p.guia = { fase: 'publicar', jugado: true }; } });
  assert.equal(q('[data-accion="guia-siguiente"]'), null, 'la última fase no tiene Siguiente');
  assert.equal(q('[data-accion="guia-publicar"]').disabled, true);
  clic(q('[data-accion="guia-publicar"]'));
  assert.deepEqual(llamadas, []);
  cerrar();
});

test('retirarMuestrasSinUso quita los retratos de muestra que ningún personaje usa, con su archivo', async () => {
  const { sesion, cerrar } = await armar();
  const [ana] = sesion.proyecto.juego.personajes;
  const muestra = ana.retrato;
  assert.deepEqual(retirarMuestrasSinUso(sesion), [], 'mientras se usan, se quedan');
  const propio = sesion.cambiar((p) => agregarElemento(p, { tipo: 'retrato', nombre: 'Propio', archivo: 'propio.png', origen: 'creado' }));
  sesion.cambiar(() => { ana.retrato = propio.id; });
  assert.deepEqual(retirarMuestrasSinUso(sesion), [muestra]);
  assert.equal(sesion.proyecto.juego.elementos.some((e) => e.id === muestra), false);
  assert.equal(sesion.proyecto.fichas[muestra], undefined);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(sesion.archivos.has(muestra), false);
  cerrar();
});
```

`sesionDePrueba(proyecto, { archivos })` ya pasa `archivos` a `crearSesion` porque reparte `extra` al final. `sesion.quitarArchivo` es asíncrona; por eso la última prueba espera un turno antes de mirar los archivos.

- [ ] **Step 4: Correr y verlas fallar**

Run: `node --test tests/banda.test.js`
Expected: FAIL, módulo no encontrado.

- [ ] **Step 5: Escribir la banda**

```js
// plataforma/js/guia/banda.js
// La banda de guía sobre el editor (diseño del modo guiado, sección 7): progreso con los
// nueve puntos, instrucción y lección de la fase, y sus tareas con «Atrás» y
// «Siguiente». Dibuja desde estadoDeGuia y cambia la fase con sesion.cambiar (origen
// 'guia'). Marca la raíz del editor con data-fase para que el CSS resalte y atenúe.
// También aquí: la retirada automática de los retratos de muestra que ya nadie usa.
import { h, rellenar, conservarFoco, anunciar } from '../ui/dom.js';
import { explicacion } from '../editor/panel-ficha.js';
import { eliminarElemento } from '../estado/modelo.js';
import { puedePublicar } from '../estado/validacion.js';
import { FASES, estadoDeGuia } from './fases.js';

/** Desde este ancho la lección se muestra abierta; por debajo, plegada bajo «Ver la lección». */
export const ANCHO_LECCION_ABIERTA = 1200;

const entradaDe = (contenido, clave) => clave.split('.').reduce((o, k) => o?.[k], contenido) ?? null;
const etiquetaFase = (i) => (i === 0 ? 'Inicio' : `Fase ${i} de ${FASES.length - 1}`);

/**
 * Elimina los elementos de muestra que ningún personaje usa (y sus archivos). El estudiante
 * nunca los borra a mano. Devuelve los ids retirados.
 * @param {object} sesion de crearSesion
 * @param {(error: Error) => void} alError si el almacén no pudo borrar un archivo
 */
export function retirarMuestrasSinUso(sesion, alError = () => {}) {
  const { juego } = sesion.proyecto;
  const usados = new Set(juego.personajes.map((p) => p.retrato).filter(Boolean));
  const sobrantes = juego.elementos.filter((e) => e.origen === 'muestra' && !usados.has(e.id)).map((e) => e.id);
  if (!sobrantes.length) return [];
  sesion.cambiar((p) => { for (const id of sobrantes) eliminarElemento(p, id); }, { origen: 'guia', estructura: true });
  for (const id of sobrantes) sesion.quitarArchivo(id).catch(alError);
  return sobrantes;
}

/**
 * @param {HTMLElement} contenedor la sección aria-label="Guía"
 * @param {object} sesion de crearSesion
 * @param {object} opciones contenido (juridico.json); raiz (recibe data-fase); alJugar, alMapa, alPublicar;
 *   anunciar(texto) o null para que solo devuelva el mensaje; anchoVentana() → px.
 * @returns {{ dibujar: () => string|null }} dibujar devuelve el mensaje para lectores de pantalla, o null.
 */
export function crearBanda(contenedor, sesion, {
  contenido = {},
  raiz = null,
  alJugar = null,
  alMapa = null,
  alPublicar = null,
  anunciar: anunciarTexto = anunciar,
  anchoVentana = () => globalThis.innerWidth ?? ANCHO_LECCION_ABIERTA,
} = {}) {
  let previo = null; // { fase, cumplidas: Set<índice>, completa } del dibujo anterior
  let leccionAbierta = null; // null hasta el primer dibujo: lo decide el ancho

  function irA(id) {
    const estado = estadoDeGuia(sesion.proyecto);
    if (estado.actual.id === id || !estado.puedeIrA(id)) return;
    sesion.cambiar((p) => { p.guia.fase = id; }, { origen: 'guia' });
  }

  function mensajeDe(estado) {
    const ahora = {
      fase: estado.actual.id,
      cumplidas: new Set(estado.actual.tareas.flatMap((t, i) => (t.cumplida ? [i] : []))),
      completa: estado.actual.completa,
    };
    const antes = previo;
    previo = ahora;
    if (!antes) return null;
    if (antes.fase !== ahora.fase) return `${etiquetaFase(estado.indiceActual)}: ${estado.actual.nombre}.`;
    if (ahora.completa && !antes.completa) return `Fase completa: ${estado.actual.nombre}. Ya puedes pasar a la siguiente.`;
    const nuevas = [...ahora.cumplidas].filter((i) => !antes.cumplidas.has(i)).map((i) => estado.actual.tareas[i].texto);
    return nuevas.length ? `Tarea cumplida: ${nuevas.join('. ')}.` : null;
  }

  function accionDe(id) {
    if (id === 'conocer' && alJugar) return h('button', { type: 'button', class: 'btn btn-primary btn-sm', dataset: { foco: 'guia-jugar', accion: 'guia-jugar' }, onclick: alJugar }, 'Jugar el ejemplo');
    if (id === 'destino' && alMapa) return h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { foco: 'guia-mapa', accion: 'guia-mapa' }, onclick: alMapa }, 'Abrir el mapa de activos');
    if (id === 'publicar' && alPublicar) {
      const listo = puedePublicar(sesion.proyecto).ok;
      return h('button', { type: 'button', class: 'btn btn-primary btn-sm', dataset: { foco: 'guia-publicar', accion: 'guia-publicar' }, disabled: !listo, title: listo ? null : 'Pasa el cursor por «Publicar» en la barra para ver qué falta', onclick: () => { if (puedePublicar(sesion.proyecto).ok) alPublicar(); } }, 'Publicar');
    }
    return null;
  }

  function tarea(t) {
    return h('li', { class: t.cumplida ? 'cumplida' : null },
      h('span', { class: 'banda-casilla', 'aria-hidden': 'true' }, t.cumplida ? '☑' : '☐'),
      h('span', {},
        h('span', { class: 'sr-only' }, t.cumplida ? 'Cumplida: ' : 'Pendiente: '),
        h('span', { class: 'banda-tarea' }, t.texto),
        t.detalle ? h('span', { class: 'banda-detalle' }, ` (${t.detalle})`) : null));
  }

  function dibujar() {
    const estado = estadoDeGuia(sesion.proyecto);
    const mensaje = mensajeDe(estado);
    const fase = FASES[estado.indiceActual];
    const i = estado.indiceActual;
    if (raiz) raiz.dataset.fase = fase.id;
    if (leccionAbierta === null) leccionAbierta = anchoVentana() >= ANCHO_LECCION_ABIERTA;
    const leccion = fase.leccion.map((clave) => explicacion(entradaDe(contenido, clave))).filter(Boolean);
    conservarFoco(contenedor, () => {
      rellenar(contenedor, h('div', { class: 'banda' },
        h('div', { class: 'banda-progreso' },
          h('p', { class: 'banda-fase' }, `${etiquetaFase(i)} · `, h('strong', {}, fase.nombre)),
          h('ol', { class: 'banda-puntos', 'aria-label': 'Fases de la guía' }, estado.fases.map((f, j) => h('li', {},
            h('button', {
              type: 'button',
              class: `banda-punto${f.completa ? ' cumplida' : ''}`,
              dataset: { foco: `guia-punto:${f.id}`, fase: f.id },
              'aria-current': j === i ? 'step' : null,
              'aria-label': `${etiquetaFase(j)}: ${f.nombre}${f.completa ? ' (cumplida)' : ''}`,
              disabled: !estado.puedeIrA(f.id),
              onclick: () => irA(f.id),
            }, f.completa ? '✓' : String(j)))))),
        h('div', { class: 'banda-centro' },
          h('p', { class: 'banda-instruccion' }, fase.instruccion),
          accionDe(fase.id),
          leccion.length ? h('details', { class: 'banda-leccion', open: leccionAbierta, ontoggle: (e) => { leccionAbierta = e.currentTarget.open; } },
            h('summary', {}, 'Ver la lección'), leccion) : null),
        h('div', { class: 'banda-tareas' },
          h('ul', { class: 'banda-lista' }, estado.actual.tareas.map(tarea)),
          h('div', { class: 'banda-botones' },
            h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { foco: 'guia-atras', accion: 'guia-atras' }, disabled: i === 0, onclick: () => irA(FASES[i - 1].id) }, 'Atrás'),
            i < FASES.length - 1
              ? h('button', { type: 'button', class: 'btn btn-primary btn-sm', dataset: { foco: 'guia-siguiente', accion: 'guia-siguiente' }, disabled: !estado.puedeAvanzar, onclick: () => irA(FASES[i + 1].id) }, 'Siguiente')
              : null))));
    });
    if (mensaje && anunciarTexto) anunciarTexto(mensaje);
    return mensaje;
  }

  return { dibujar };
}
```

`conservarFoco` busca el nodo con el mismo `data-foco` después de redibujar; si ese botón quedó deshabilitado, el foco no vuelve, y eso es lo esperado. Si la clase `sr-only` no existe en `css/tokens.css` ni en `css/editor.css`, ya la usa la zona de anuncios de `ui/dom.js`: comprobar con `grep -n "sr-only" plataforma/css/*.css` y, si no está, agregarla en la tarea 10.

- [ ] **Step 6: Correr la suite**

Run: `npm test`
Expected: PASS, 372.

- [ ] **Step 7: Commit**

```bash
git add plataforma/js/motor/reproductor.js plataforma/js/guia/banda.js tests/reproductor.test.js tests/banda.test.js
git commit -m "Guía: la banda con progreso, lección, tareas y avance; el reproductor avisa al llegar a los créditos"
```

---

### Task 10: La banda en el editor

Agrega 3 pruebas (375).

**Files:**
- Modify: `plataforma/js/editor/editor.js`
- Modify: `plataforma/css/editor.css`
- Test: `tests/editor.test.js`

- [ ] **Step 1: Escribir las pruebas**

En `tests/editor.test.js` (importar `ejemploArmado` de `./ayudas/ejemplo.js` y `agregarElemento` del modelo):

```js
test('el editor aloja la banda en la zona superior y marca su raíz con la fase', async () => {
  const { proyecto } = await ejemploArmado();
  const { contenedor, q, editor } = armar({ proyecto, contenido: contenidoReal });
  assert.ok(q('.zona-superior > .zona-barra'));
  assert.ok(q('.zona-superior > section.zona-guia[aria-label="Guía"] .banda'));
  assert.equal(contenedor.dataset.fase, 'conocer');
  assert.ok(q('[data-seccion="guion"]'));
  editor.destruir();
  assert.equal(contenedor.dataset.fase, undefined);
  contenedor.remove();
});

test('jugar hasta los créditos marca guia.jugado y habilita Siguiente', async () => {
  const { proyecto, archivos } = await ejemploArmado();
  const { contenedor, q, sesion } = armar({ proyecto, contenido: contenidoReal });
  for (const [id, archivo] of archivos) sesion.archivos.set(id, archivo);
  clic(q('[data-accion="guia-jugar"]'));
  const escena = q('.capa-reproductor .reproductor-escena');
  for (let i = 0; i < 20 && !q('.capa-reproductor .escenario-creditos'); i += 1) {
    const opcion = q('.capa-reproductor .opcion');
    clic(opcion ?? escena);
  }
  assert.ok(q('.capa-reproductor .escenario-creditos'));
  assert.equal(sesion.proyecto.guia.jugado, true);
  assert.equal(q('[data-accion="guia-siguiente"]').disabled, false);
  contenedor.remove();
});

test('al asignar un retrato propio, el de muestra se retira solo y el inventario lo deja de mostrar', async () => {
  const { proyecto, archivos } = await ejemploArmado();
  const { contenedor, q, qa, sesion } = armar({ proyecto, contenido: contenidoReal });
  for (const [id, archivo] of archivos) sesion.archivos.set(id, archivo);
  assert.equal(qa('.entrada-muestra').length, 2);
  const [ana] = sesion.proyecto.juego.personajes;
  const propio = sesion.cambiar((p) => agregarElemento(p, { tipo: 'retrato', nombre: 'Propio', archivo: 'propio.png', origen: 'creado' }), { origen: 'inventario', estructura: true });
  sesion.cambiar(() => { ana.retrato = propio.id; }, { origen: 'propiedades' });
  assert.equal(qa('.entrada-muestra').length, 1);
  assert.equal(sesion.proyecto.juego.elementos.filter((e) => e.origen === 'muestra').length, 1);
  contenedor.remove();
});
```

La opción de una decisión en el reproductor se dibuja como `.opcion` (lo usa `tests/e2e/recorrido.spec.js`); en la segunda prueba se pulsa la primera opción cuando aparece.

- [ ] **Step 2: Correr y verlas fallar**

Run: `node --test tests/editor.test.js`
Expected: FAIL.

- [ ] **Step 3: Integrar en el editor**

En `plataforma/js/editor/editor.js`:

Imports nuevos:

```js
import { crearBanda, retirarMuestrasSinUso } from '../guia/banda.js';
import { asegurarGuia } from '../estado/modelo.js';
```

Antes de armar la estructura de la página, normalizar la guía (los proyectos guardados por la primera versión no la traen):

```js
  asegurarGuia(sesion.proyecto);
```

Estructura: crear la zona de la guía y la zona superior, y marcar el guion:

```js
  const zonaGuia = h('section', { class: 'zona-guia', 'aria-label': 'Guía' });
  const zonaGuion = h('div', { class: 'zona-guion', dataset: { seccion: 'guion' } });
```

(reemplaza la línea actual de `zonaGuion`) y en el `vaciar(contenedor).append(` cambiar el primer hijo `zonaBarra,` por:

```js
    h('div', { class: 'zona-superior' }, zonaBarra, zonaGuia),
```

`abrirBiblioteca` acepta el tipo con el que abre:

```js
  function abrirBiblioteca(tipo) {
    document.body.classList.add('con-biblioteca');
    biblioteca.abrir(tipo);
  }
```

(la llamada desde el inventario sigue siendo `() => abrirBiblioteca()`, que abre con el último filtro). Pasar `alReemplazar` a las propiedades:

```js
    alReemplazar: (clave) => {
      if (clave === 'subir') subirArchivo();
      else if (clave === 'biblioteca' && catalogo) abrirBiblioteca('retrato');
      else if (clave === 'pixel' && herramientas) crearConHerramienta('pixel');
    },
```

Después de crear `publicar` (la banda necesita `abrirMapa` y `abrirPublicar`, que ya existen como funciones declaradas):

```js
  // ---- guía (diseño del modo guiado, sección 7) ----
  const banda = crearBanda(zonaGuia, sesion, {
    contenido: contenido ?? {},
    raiz: contenedor,
    alJugar: () => jugarDesde(sesion.proyecto.juego.escenaInicial),
    alMapa: () => abrirMapa(),
    alPublicar: () => abrirPublicar(),
    anunciar: null,
  });
```

`anunciarSemaforos` recibe el mensaje de la guía y anuncia todo junto:

```js
  function anunciarSemaforos(mensajeGuia = null) {
    const nuevos = coloresDe();
    const cambios = [...nuevos].filter(([id, color]) => colores.has(id) && colores.get(id) !== color);
    colores = nuevos;
    const textos = cambios.map(([id, color]) => `Semáforo de «${nombreDe(sesion.proyecto, id)}»: ${color}`);
    if (mensajeGuia) textos.push(mensajeGuia);
    if (textos.length) anunciar(textos.join('. '));
  }
```

En `refrescar`, reemplazar la última línea `anunciarSemaforos();` por:

```js
    anunciarSemaforos(banda.dibujar());
```

En el oyente de la sesión, el caso `'cambio'` retira primero los retratos de muestra sin uso; si retiró alguno, ese cambio ya redibujó todo:

```js
    if (evento.tipo === 'cambio') {
      if (evento.origen !== 'guia' && retirarMuestrasSinUso(sesion, mostrarError).length) return;
      estadoGuardado.textContent = 'Guardando…';
      refrescar(evento);
```

y el caso `'reemplazo'` normaliza la guía y redibuja la banda:

```js
    } else if (evento.tipo === 'reemplazo') {
      asegurarGuia(sesion.proyecto);
      escenaActivaId = null;
      colores = coloresDe();
      barra.dibujar();
      banda.dibujar();
      seleccionar(null);
    }
```

En `jugarDesde`, agregar a las opciones de `jugar`:

```js
      alTerminar: () => {
        if (sesion.proyecto.guia && !sesion.proyecto.guia.jugado) sesion.cambiar((p) => { p.guia.jugado = true; }, { origen: 'guia' });
      },
```

En `abrirCopia`, el aviso de éxito dice si la fase se corrigió:

```js
      avisar(copia.guiaCorregida ? 'Copia abierta. La guía no reconoció la fase guardada y volvió al inicio.' : 'Copia abierta.');
```

En el arranque, antes de `seleccionar(...)`:

```js
  banda.dibujar();
```

En `destruir`, antes de `vaciar(contenedor);`:

```js
      delete contenedor.dataset.fase;
```

- [ ] **Step 4: Estilos**

En `plataforma/css/editor.css`:

Quitar la regla `.zona-barra { position: sticky; top: 0; z-index: 30; }` y, en su lugar, agregar:

```css
.zona-superior { position: sticky; top: 0; z-index: 30; flex: none; }
body.en-editor #app { display: flex; flex-direction: column; height: 100vh; }
```

En la regla `.editor`, reemplazar `height: calc(100vh - 56px);` por `flex: 1 1 auto; min-height: 0;`.

Al final de la sección del editor (antes del `@media (max-width: 899px)`):

```css
/* ---- Guía: la banda sobre las columnas (modo guiado, sección 7) ---- */
.zona-guia { border-bottom: 1px solid var(--claro-line); background: var(--claro-panel); }
.banda { display: grid; grid-template-columns: 220px minmax(0, 1fr) minmax(240px, 320px); gap: 16px; padding: 10px 16px; max-height: 36vh; overflow: auto; }
.banda-fase { margin: 0 0 8px; font-size: 14px; }
.banda-puntos { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
.banda-punto { width: 24px; height: 24px; padding: 0; border: 1px solid var(--claro-line); border-radius: 50%; background: var(--claro-panel-2); color: var(--claro-ink); font-family: var(--mono); font-size: 11px; cursor: pointer; }
.banda-punto:disabled { cursor: not-allowed; opacity: .5; }
.banda-punto.cumplida { background: var(--verde); border-color: var(--verde); color: #fff; }
.banda-punto[aria-current="step"] { box-shadow: 0 0 0 2px var(--claro-accent); }
.banda-instruccion { margin: 0 0 8px; }
.banda-centro .btn { margin-bottom: 8px; }
.banda-leccion summary { cursor: pointer; font-size: 13px; color: var(--claro-muted); }
.banda-leccion .ficha-explicacion { margin-top: 6px; }
.banda-lista { margin: 0 0 8px; padding: 0; list-style: none; display: grid; gap: 4px; font-size: 13px; }
.banda-lista li { display: grid; grid-template-columns: 18px 1fr; gap: 6px; }
.banda-lista li.cumplida { color: var(--claro-muted); }
.banda-detalle { color: var(--claro-muted); }
.banda-botones { display: flex; gap: 8px; justify-content: flex-end; }

/* Resaltar sin esconder: lo que no toca en la fase se atenúa; nada se deshabilita ni se oculta. */
#app[data-fase] [data-seccion] { opacity: .65; transition: opacity .15s; }
#app[data-fase] [data-seccion]:hover, #app[data-fase] [data-seccion]:focus-within { opacity: 1; }
#app[data-fase="historia"] :is([data-seccion="juego"], [data-seccion="escenas"], [data-seccion="guion"]),
#app[data-fase="personajes"] [data-seccion="personajes"],
#app[data-fase="retratos"] :is([data-seccion="personajes"], [data-seccion="elementos"]),
#app[data-fase="fondo"] :is([data-seccion="escenas"], [data-seccion="elementos"]),
#app[data-fase="sonido"] :is([data-seccion="escenas"], [data-seccion="elementos"]),
#app[data-fase="voz"] :is([data-seccion="elementos"], [data-seccion="guion"]),
#app[data-fase="destino"] [data-seccion="juego"] { opacity: 1; outline: 2px solid var(--claro-accent); outline-offset: 2px; border-radius: 8px; }
#app[data-fase="conocer"] .barra [data-accion="jugar"],
#app[data-fase="retratos"] :is([data-accion="crear-pixel"], [data-accion="subir"], [data-accion="biblioteca"]),
#app[data-fase="sonido"] :is([data-accion="crear-secuencia"], [data-accion="crear-grabar"], [data-accion="biblioteca"]),
#app[data-fase="voz"] [data-accion="crear-grabar"],
#app[data-fase="destino"] .barra [data-accion="mapa"],
#app[data-fase="publicar"] .barra [data-accion="publicar"] { outline: 2px solid var(--claro-accent); outline-offset: 2px; }

/* Retratos de muestra: sin semáforo, con su marca. */
.marca-muestra { width: 10px; height: 10px; border-radius: 2px; display: inline-block; border: 1px dashed var(--claro-muted); }
.entrada-muestra .entrada-detalle { font-style: italic; }
.ficha-muestra-aviso { margin: 0 0 8px; }
```

Dentro del `@media (max-width: 899px)`:

```css
  body.en-editor #app { display: block; height: auto; }
  .banda { grid-template-columns: 1fr; max-height: none; }
```

Si `grep -n "sr-only" plataforma/css/*.css` no encuentra la clase, agregar:

```css
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
```

- [ ] **Step 5: Correr la suite**

Run: `npm test`
Expected: PASS, 375. Si una prueba existente de `tests/editor.test.js` busca `.zona-barra` como primer hijo del contenedor, cambiarla a `.zona-superior > .zona-barra`.

- [ ] **Step 6: Commit**

```bash
git add plataforma/js/editor/editor.js plataforma/css/editor.css tests/editor.test.js
git commit -m "Editor: la banda de guía sobre las columnas, el resaltado por fase y la retirada de retratos de muestra"
```

---

### Task 11: El inicio y el arranque

Agrega 1 prueba neta (376).

**Files:**
- Modify: `plataforma/js/editor/inicio.js`
- Modify: `plataforma/js/app.js`
- Test: `tests/inicio.test.js`

- [ ] **Step 1: Reescribir las pruebas del inicio**

En `tests/inicio.test.js`, `armar` acepta `alEmpezar` y `ejemploDisponible`:

```js
function armar({ alEmpezar = async () => {}, ejemploDisponible = true } = {}) {
  const llamadas = [];
  const contenedor = document.createElement('div');
  document.body.append(contenedor);
  const inicio = crearInicio(contenedor, {
    nombreProducto: 'Mi primer videojuego',
    contenido: { aviso: 'Material educativo.', campos: { destino: { breve: 'El destino delimita qué licencias sirven.' } } },
    ejemploDisponible,
    alEmpezar: (datos) => { llamadas.push(['empezar', datos]); return alEmpezar(datos); },
    alAbrirCopia: () => llamadas.push(['abrir-copia']),
  });
  return { contenedor, inicio, llamadas };
}
```

La primera prueba pasa a:

```js
test('explica que recibe un juego terminado para hacerlo suyo, qué entrega y que nada sale del navegador; pide nombre y destino', () => {
  const { contenedor, inicio } = armar();
  inicio.dibujar();
  assert.equal(contenedor.querySelector('h1').textContent, 'Mi primer videojuego');
  const parrafos = textos(contenedor, '.inicio-explicacion p');
  assert.equal(parrafos.length, 3);
  assert.match(parrafos[0], /^Vas a recibir un juego terminado, «La llave del faro», y a hacerlo tuyo pieza por pieza/);
  assert.match(parrafos[1], /Cuando no quede nada del ejemplo y todas las fichas estén en verde/);
  assert.match(parrafos[2], /^Nada sale de tu navegador/);
  assert.deepEqual(textos(contenedor, 'label.campo-etiqueta'), ['Tu nombre']);
  assert.equal(contenedor.querySelector('#inicio-titulo'), null);
  assert.equal(contenedor.querySelector('legend').textContent, 'Destino del juego');
  assert.equal(document.activeElement, contenedor.querySelector('#inicio-estudiante'));
  contenedor.remove();
});
```

La segunda, sobre el envío:

```js
test('Empezar exige el nombre; con nombre llama a alEmpezar con nombre y destino y muestra «Preparando el ejemplo…» mientras espera', async () => {
  let terminar;
  const { contenedor, inicio, llamadas } = armar({ alEmpezar: () => new Promise((r) => { terminar = r; }) });
  inicio.dibujar();
  const formulario = contenedor.querySelector('form');
  const boton = contenedor.querySelector('button[type="submit"]');
  formulario.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  assert.deepEqual(llamadas, []);
  assert.equal(contenedor.querySelector('.inicio-error').textContent, 'Escribe tu nombre para empezar.');
  escribir(contenedor.querySelector('#inicio-estudiante'), '  Camila R. ');
  contenedor.querySelector('input[name="destino"][value="venta"]').checked = true;
  formulario.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  assert.deepEqual(llamadas, [['empezar', { estudiante: 'Camila R.', destino: 'venta' }]]);
  assert.equal(boton.disabled, true);
  assert.equal(boton.textContent, 'Preparando el ejemplo…');
  terminar();
  contenedor.remove();
});
```

Y dos nuevas:

```js
test('si el ejemplo no se pudo preparar, muestra el error y vuelve a habilitar Empezar', async () => {
  const { contenedor, inicio } = armar({ alEmpezar: async () => { throw new Error('No se pudo preparar el ejemplo: falta la pieza «Muelle de noche» de la biblioteca.'); } });
  inicio.dibujar();
  escribir(contenedor.querySelector('#inicio-estudiante'), 'Camila R.');
  contenedor.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((r) => setTimeout(r, 0));
  const boton = contenedor.querySelector('button[type="submit"]');
  assert.equal(boton.disabled, false);
  assert.equal(boton.textContent, 'Empezar');
  assert.equal(contenedor.querySelector('.inicio-error').textContent, 'No se pudo preparar el ejemplo: falta la pieza «Muelle de noche» de la biblioteca.');
  contenedor.remove();
});

test('sin biblioteca no se puede armar el ejemplo: Empezar queda deshabilitado y se ofrece abrir una copia', () => {
  const { contenedor, inicio } = armar({ ejemploDisponible: false });
  inicio.dibujar();
  assert.equal(contenedor.querySelector('button[type="submit"]').disabled, true);
  assert.equal(contenedor.querySelector('.inicio-sin-ejemplo').textContent, 'No se puede preparar el juego de ejemplo porque la biblioteca no está disponible. Si tienes una copia de tu proyecto, ábrela.');
  assert.ok(contenedor.querySelector('[data-accion="abrir-copia"]'));
  contenedor.remove();
});
```

La prueba de «Abrir una copia» y `mostrarError` que ya existe no cambia. Total del archivo: una prueba más que antes.

- [ ] **Step 2: Correr y verlas fallar**

Run: `node --test tests/inicio.test.js`
Expected: FAIL.

- [ ] **Step 3: Reescribir el inicio**

En `plataforma/js/editor/inicio.js`, cambiar el comentario de cabecera («Pide nombre y destino, o abre una copia. «Empezar» arma el juego de ejemplo; mientras tanto el botón dice «Preparando el ejemplo…».»), la firma:

```js
export function crearInicio(contenedor, { nombreProducto, contenido = null, ejemploDisponible = true, alEmpezar, alAbrirCopia }) {
```

y `dibujar`: quitar la variable `titulo` y su campo; crear el botón aparte para poder cambiarlo:

```js
    const empezar = h('button', { type: 'submit', class: 'btn btn-primary', disabled: !ejemploDisponible }, 'Empezar');
```

el `onsubmit` pasa a:

```js
    const formulario = h('form', { class: 'inicio-formulario', novalidate: true, onsubmit: async (evento) => {
      evento.preventDefault();
      if (empezar.disabled) return;
      const nombre = estudiante.value.trim();
      if (!nombre) {
        mostrarError('Escribe tu nombre para empezar.');
        estudiante.focus();
        return;
      }
      mostrarError('');
      empezar.disabled = true;
      empezar.textContent = 'Preparando el ejemplo…';
      try {
        await alEmpezar({ estudiante: nombre, destino: radios.find((r) => r.checked)?.value ?? 'gratis' });
      } catch (fallo) {
        empezar.disabled = false;
        empezar.textContent = 'Empezar';
        mostrarError(fallo?.message ?? String(fallo));
      }
    } },
```

dentro del formulario, quitar el `div.campo` del título; antes de `error`, agregar:

```js
      ejemploDisponible ? null : h('p', { class: 'inicio-sin-ejemplo' }, 'No se puede preparar el juego de ejemplo porque la biblioteca no está disponible. Si tienes una copia de tu proyecto, ábrela.'),
```

y en `.acciones` usar `empezar` en lugar del botón de envío literal. Los dos primeros párrafos de `.inicio-explicacion` pasan a:

```js
        h('p', {}, 'Vas a recibir un juego terminado, «La llave del faro», y a hacerlo tuyo pieza por pieza: la historia, los personajes, sus retratos, el fondo, la música y los efectos. Cada pieza que entre al juego abre una ficha jurídica con semáforo que tú resuelves.'),
        h('p', {}, 'Puedes jugar tu juego cuantas veces quieras. Cuando no quede nada del ejemplo y todas las fichas estén en verde, lo publicas y descargas un paquete con el juego, su informe jurídico y el proyecto en bruto, que subes al formulario del curso.'),
```

Si el error llega después de que el inicio se reemplazó por el editor (no pasa: el editor solo se muestra si `alEmpezar` terminó bien), `mostrarError` no hace nada porque comprueba `error`.

- [ ] **Step 4: Arranque**

En `plataforma/js/app.js`:

Imports: quitar `crearProyecto` (ya no se usa) y agregar:

```js
import { crearEjemplo } from './guia/ejemplo.js';
import { mimePorExtension } from './estado/archivos.js';
```

Función para leer archivos de la propia plataforma:

```js
/** Lee un archivo de plataforma/ (los retratos de muestra del ejemplo). */
async function cargarDePlataforma(ruta) {
  const respuesta = await fetch(new URL(`../${ruta}`, import.meta.url));
  if (!respuesta.ok) throw new Error(`falta ${ruta} (${respuesta.status}).`);
  return { tipo: mimePorExtension(ruta), datos: await respuesta.arrayBuffer() };
}
```

`crearEjemplo` antepone «No se pudo preparar el ejemplo: » a ese mensaje.

En `mostrarInicio`, las opciones de `crearInicio` pasan a:

```js
    nombreProducto: contenido.nombre,
    contenido,
    ejemploDisponible: Boolean(catalogoActual),
    alEmpezar: async (datos) => {
      const { proyecto, archivos } = await crearEjemplo(datos, { catalogo: catalogoActual, cargar: cargarDePlataforma });
      await almacen.reemplazarTodo(proyecto, archivos);
      mostrarEditor(almacen, contenido, proyecto, archivos);
    },
```

(`alAbrirCopia` no cambia). Los errores de `crearEjemplo` y del almacén suben a `crearInicio`, que los muestra.

- [ ] **Step 5: Correr la suite**

Run: `npm test`
Expected: PASS, 376.

- [ ] **Step 6: Probar a mano en el navegador**

Run: `node tests/manual/servir.js` (en segundo plano) y abrir `http://localhost:8089/plataforma/` en el navegador del panel, a 1280×800 (ver la memoria del proyecto: el panel apila columnas si no se emula el ancho). Comprobar: sin campo de título; «Empezar» muestra «Preparando el ejemplo…» y abre el editor con la banda en «Inicio · Conoce el ejemplo»; «Jugar el ejemplo» juega hasta los créditos y al cerrar «Siguiente» está habilitado; en «Tu historia» el inventario de personajes y elementos se ve atenuado y «El juego», escenas y guion resaltados. Borrar el almacén del navegador al terminar para no dejar un proyecto de prueba.

- [ ] **Step 7: Commit**

```bash
git add plataforma/js/editor/inicio.js plataforma/js/app.js tests/inicio.test.js
git commit -m "Arranque: Empezar arma el juego de ejemplo; el inicio ya no pide el título y dice si el ejemplo no se puede preparar"
```

---

### Task 12: El recorrido guiado en Chromium, README y diseño

Sin pruebas nuevas en Node (376). Reescribe una de Playwright y amplía la otra.

**Files:**
- Modify: `tests/e2e/recorrido.spec.js` (se reescribe)
- Modify: `tests/e2e/inventario.spec.js`
- Modify: `README.md`, `plataforma/README.md`
- Modify: `docs/superpowers/specs/2026-11-06-modo-guiado-design.md` (nota de implementación)

- [ ] **Step 1: Inventario en Playwright**

En `tests/e2e/inventario.spec.js`, `abrirEditor` pasa a:

```js
async function abrirEditor(page, ancho = 1280, alto = 800) {
  await page.setViewportSize({ width: ancho, height: alto });
  await page.goto('/plataforma/');
  await page.fill('#inicio-estudiante', 'Camila Rojas');
  await page.getByRole('button', { name: 'Empezar' }).click();
  await expect(page.locator('.barra-juego')).toHaveText('La llave del faro');
  await expect(page.locator('.banda')).toBeVisible();
}
```

En la primera prueba, el ejemplo ya trae dos personajes, así que la última expectativa pasa a `toHaveCount(3)`. Agregar:

```js
for (const [ancho, alto] of [[1280, 800], [1000, 700]]) {
  test(`la banda no desborda y deja ver las columnas a ${ancho}×${alto}`, async ({ page }) => {
    await abrirEditor(page, ancho, alto);
    const sinDesborde = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    expect(sinDesborde, 'la página no debe desplazarse a lo ancho').toBe(true);
    const banda = await page.locator('.zona-guia').boundingBox();
    expect(banda.height, 'la banda no ocupa más de 40 % del alto').toBeLessThanOrEqual(alto * 0.4 + 1);
    for (const selector of ['.columna-inventario', '.columna-centro', '.columna-propiedades']) {
      const caja = await page.locator(selector).boundingBox();
      expect(caja.y, `${selector} empieza bajo la banda`).toBeGreaterThanOrEqual(banda.y + banda.height - 1);
      expect(caja.height, `${selector} tiene alto útil`).toBeGreaterThan(200);
    }
    for (const boton of await page.locator('.banda button').all()) await expect(boton).toBeInViewport();
  });
}
```

Run: `npx playwright test tests/e2e/inventario.spec.js`
Expected: PASS. Si la banda pasa del 40 % a 1000×700, bajar `max-height` de `.banda` en `css/editor.css` hasta que pase; no tocar la prueba.

- [ ] **Step 2: Reescribir el recorrido**

`tests/e2e/recorrido.spec.js` completo:

```js
// tests/e2e/recorrido.spec.js
// El recorrido guiado del estudiante en Chromium (diseño del modo guiado, sección 12):
// arranque, fase 0 jugando el ejemplo, fases 1 a 7 reemplazando sus piezas con pixel art,
// una subida, la biblioteca y una grabación con micrófono falso, publicación, y el
// juego.html exportado jugado hasta los créditos. Sin errores de página.
import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import JSZip from 'jszip';
import { png, lienzo } from '../../scripts/png-wav.js';

const ESTUDIANTE = 'Camila Rojas';
const TITULO = 'El faro de Camila';
const LINEAS = {
  muelle: ['La lluvia golpea la reja del faro.', '¿Quién abrió la reja?', 'Yo la dejé con candado. Alguien tiene otra llave.', '¿Bajas al sótano?'],
  torre: ['El sótano huele a sal. Hay un cofre abierto.', 'Lucía encuentra una carta. Mañana la leerá.'],
  amanecer: ['Volvamos cuando pare la lluvia.', 'Al amanecer, la reja está cerrada otra vez.'],
};

function pngDePrueba() {
  const l = lienzo(64, 64);
  l.rect(0, 0, 64, 64, [40, 60, 90]);
  l.circulo(32, 28, 14, [220, 180, 140]);
  return png(64, 64, l.rgba);
}

const banda = (page) => page.locator('.banda');
const siguiente = (page) => page.locator('[data-accion="guia-siguiente"]');
const seccion = (page, clave) => page.locator(`[data-seccion="${clave}"] button.entrada`);

async function elegir(page, foco, etiqueta) {
  await page.locator(`[data-foco="${foco}"]`).selectOption({ label: etiqueta });
}

async function pasarDeFase(page, nombre) {
  await expect(siguiente(page)).toBeEnabled();
  await siguiente(page).click();
  await expect(page.locator('.banda-fase')).toContainText(nombre);
}

/** Clic en la escena hasta los créditos; en una decisión elige la opción dada. */
async function jugarHastaCreditos(page, raiz, opcion = 0) {
  for (let i = 0; i < 20; i += 1) {
    if (await raiz.locator('.escenario-creditos').count()) return;
    const opciones = raiz.locator(`.opcion[data-opcion="${opcion}"]`);
    if (await opciones.count()) await opciones.click();
    else await raiz.locator('.reproductor-escena').click();
  }
  await expect(raiz.locator('.escenario-creditos')).toBeVisible();
}

test('recorrido guiado: del juego de ejemplo al juego propio publicado y jugado', async ({ page }) => {
  const carpeta = mkdtempSync(join(tmpdir(), 'entrega-e2e-'));
  const errores = [];
  page.on('pageerror', (error) => errores.push(error.message));
  await page.setViewportSize({ width: 1280, height: 800 });

  // ---- Arranque ----
  await page.goto('/plataforma/');
  await expect(page.locator('.inicio-explicacion')).toContainText('Vas a recibir un juego terminado');
  await expect(page.locator('#inicio-titulo')).toHaveCount(0);
  await page.fill('#inicio-estudiante', ESTUDIANTE);
  await page.getByRole('button', { name: 'Empezar' }).click();
  await expect(page.locator('.barra-juego')).toHaveText('La llave del faro');
  await expect(page.locator('.banda-fase')).toHaveText('Inicio · Conoce el ejemplo');
  await expect(siguiente(page)).toBeDisabled();
  await expect(page.locator('.entrada-muestra')).toHaveCount(2);

  // ---- Fase 0: jugar el ejemplo hasta los créditos ----
  await page.locator('[data-accion="guia-jugar"]').click();
  const reproductor = page.locator('.capa-reproductor');
  await expect(reproductor.locator('.escenario-texto')).toHaveText('La niebla cubre el muelle. La puerta del faro está abierta.');
  await jugarHastaCreditos(page, reproductor);
  await reproductor.locator('[data-accion="cerrar"]').click();
  await pasarDeFase(page, 'Tu historia');

  // ---- Fase 1: título, sinopsis y las ocho líneas ----
  await page.locator('[data-seccion="juego"] button.entrada').click();
  await page.locator('.propiedades [data-foco="titulo"]').fill(TITULO);
  await page.locator('.propiedades [data-foco="sinopsis"]').fill('Una guardiana descubre que alguien tiene otra llave del faro.');
  for (const [i, clave] of ['muelle', 'torre', 'amanecer'].entries()) {
    await seccion(page, 'escenas').nth(i).click();
    for (const [j, texto] of LINEAS[clave].entries()) await page.locator(`[data-foco="texto:${j}"]`).fill(texto);
  }
  await expect(banda(page)).not.toContainText('quedan');
  await pasarDeFase(page, 'Tus personajes');

  // ---- Fase 2: nombres y descripciones ----
  for (const [i, [nombre, descripcion]] of [['Lucía', 'Guardiana nueva del faro.'], ['El guardián', 'Conoce todas las llaves.']].entries()) {
    await seccion(page, 'personajes').nth(i).click();
    await page.locator('.propiedades [data-foco="nombre"]').fill(nombre);
    await page.locator('.propiedades [data-foco="descripcion"]').fill(descripcion);
  }
  await pasarDeFase(page, 'Sus retratos');

  // ---- Fase 3: un retrato con pixel art y otro subido ----
  await page.locator('[data-accion="crear-pixel"]').click();
  await page.locator('.dialogo button[data-tipo="retrato"]').click();
  const lienzoPixel = page.locator('.pixelart .pixel-lienzo');
  await expect(lienzoPixel).toBeVisible();
  await page.locator('.pixelart .pixel-color[data-color="3"]').click();
  const caja = await lienzoPixel.boundingBox();
  for (const [fx, fy] of [[0.3, 0.3], [0.5, 0.5], [0.7, 0.4]]) await page.mouse.click(caja.x + caja.width * fx, caja.y + caja.height * fy);
  await page.locator('.pixelart [data-accion="guardar"]').click();
  await seccion(page, 'personajes').nth(0).click();
  await elegir(page, 'retrato', 'Retrato creado 1');
  await expect(page.locator('.entrada-muestra')).toHaveCount(1);

  const [selector] = await Promise.all([page.waitForEvent('filechooser'), page.locator('[data-accion="subir"]').click()]);
  await selector.setFiles({ name: 'guardian.png', mimeType: 'image/png', buffer: pngDePrueba() });
  await page.locator('.dialogo button[data-tipo="retrato"]').click();
  await expect(page.locator('.propiedades .ficha-color')).toContainText('amarillo');
  await page.locator('.propiedades section.ficha select[id$="-prueba"]').selectOption('original');
  await expect(page.locator('.propiedades .ficha-color')).toContainText('verde');
  await seccion(page, 'personajes').nth(1).click();
  await elegir(page, 'retrato', 'guardian');
  await expect(page.locator('.entrada-muestra')).toHaveCount(0);
  await pasarDeFase(page, 'El fondo');

  // ---- Fase 4: el fondo de la biblioteca se queda, con su ficha resuelta ----
  await seccion(page, 'elementos').filter({ hasText: 'Muelle de noche' }).click();
  await expect(page.locator('.propiedades .ficha-color')).toContainText('amarillo');
  await page.locator('.propiedades section.ficha').getByLabel('Leí la licencia').check();
  await expect(page.locator('.propiedades .ficha-color')).toContainText('verde');
  await pasarDeFase(page, 'Música y efectos');

  // ---- Fase 5: las fichas de la música y el efecto, y una pista más de la biblioteca ----
  await seccion(page, 'elementos').filter({ hasText: 'Fiesta en el muelle' }).click();
  await page.locator('.propiedades section.ficha').getByLabel('Leí la licencia').check();
  await page.locator('.propiedades section.ficha').getByLabel('Acepto licenciar mi juego igual').check();
  await expect(page.locator('.propiedades .ficha-color')).toContainText('verde');
  await seccion(page, 'elementos').filter({ hasText: 'Puerta que cruje' }).click();
  await page.locator('.propiedades section.ficha').getByLabel('Leí la licencia').check();
  await page.locator('[data-accion="biblioteca"]').click();
  await page.locator('.capa-biblioteca [data-filtro="musica"]').click();
  await page.locator('.biblioteca-pieza[data-pieza="bib_m03"] [data-accion="usar"]').click();
  await page.locator('.propiedades section.ficha').getByLabel('Leí la licencia').check();
  await seccion(page, 'escenas').nth(0).click();
  await elegir(page, 'musica', 'Persecución');
  await pasarDeFase(page, 'Una voz (opcional)');

  // ---- Fase 6: una voz grabada con micrófono falso, en el diálogo de Lucía ----
  await page.locator('[data-accion="crear-grabar"]').click();
  await page.locator('.dialogo button[data-tipo="voz"]').click();
  await page.locator('.grabador [data-accion="grabar"]').click();
  await page.waitForTimeout(1200);
  await page.locator('.grabador [data-accion="detener"]').click();
  await expect(page.locator('.grabador [data-accion="guardar"]')).toBeEnabled();
  await page.locator('.grabador [data-accion="guardar"]').click();
  await expect(page.locator('.grabador')).toHaveCount(0);
  await seccion(page, 'escenas').nth(0).click();
  await page.locator('[data-foco="texto:1"]').click();
  await elegir(page, 'voz', 'Grabación 1');
  await pasarDeFase(page, 'Destino y mapa');

  // ---- Fase 7: el mapa, todo en verde y sin muestra ----
  await page.locator('[data-accion="guia-mapa"]').click();
  await expect(page.locator('.mapa-tabla tbody tr')).toHaveCount(2 + 2 + 7);
  await expect(page.locator('.mapa-tabla tr.riesgo-muestra')).toHaveCount(0);
  await expect(page.locator('.mapa-resumen')).toHaveText('11 activos: 11 en verde, 0 en amarillo, 0 en rojo.');
  await page.locator('[data-accion="cerrar-mapa"]').click();
  await pasarDeFase(page, 'Publicar');

  // ---- Fase 8: publicar ----
  const publicar = page.locator('.barra button[data-accion="publicar"]');
  await expect(publicar).not.toHaveAttribute('aria-disabled', 'true');
  await page.locator('[data-accion="guia-publicar"]').click();
  await page.locator('.capa-publicar input[data-candidato="historia"]').check();
  await page.locator('.capa-publicar [data-decision="historia"] input[data-campo="prueba"]').fill('El guion guardado en la plataforma y en la copia descargada');
  await page.locator('.capa-publicar [data-accion="siguiente"]').click();
  await expect(page.locator('.publicar-resumen')).toContainText('entrega-camila-rojas-el-faro-de-camila.zip');
  const [descarga] = await Promise.all([page.waitForEvent('download'), page.locator('.capa-publicar [data-accion="generar"]').click()]);
  const rutaZip = join(carpeta, descarga.suggestedFilename());
  await descarga.saveAs(rutaZip);
  await expect(page.locator('.banda-lista li.cumplida')).toHaveCount(1);

  // ---- El paquete ----
  const zip = await JSZip.loadAsync(await readFile(rutaZip));
  const proyecto = JSON.parse(await zip.file('proyecto.json').async('string'));
  expect(proyecto.guia).toEqual({ fase: 'publicar', jugado: true });
  expect(proyecto.juego.elementos.filter((e) => e.origen === 'muestra')).toHaveLength(0);
  writeFileSync(join(carpeta, 'juego.html'), await zip.file('juego.html').async('nodebuffer'));

  // ---- El juego exportado se juega hasta los créditos ----
  await page.goto(pathToFileURL(join(carpeta, 'juego.html')).href);
  await expect(page).toHaveTitle(TITULO);
  await expect(page.locator('.escenario-texto')).toHaveText(LINEAS.muelle[0]);
  await jugarHastaCreditos(page, page.locator('body'));
  await expect(page.locator('.escenario-creditos')).toContainText(`${ESTUDIANTE}: autor(a) del juego`);

  expect(errores, `errores de página: ${errores.join(' | ')}`).toEqual([]);
});
```

Los elementos del mapa en la fase 7 son siete: Retrato creado 1, guardian, Muelle de noche, Fiesta en el muelle, Puerta que cruje, Persecución y Grabación 1.

- [ ] **Step 3: Correr el recorrido**

Run: `npm run test:e2e`
Expected: PASS las tres pruebas de inventario (una más dos por tamaño) y el recorrido. Si un paso falla por un selector, mirar la captura que guarda Playwright en `test-results/` y corregir el selector de la prueba, no el comportamiento, salvo que la captura muestre un error de la plataforma.

- [ ] **Step 4: READMEs**

En `plataforma/README.md`, sección **Estado**, reemplazar el párrafo por:

```markdown
Los seis planes de construcción y el modo guiado (plan 7) están terminados. El estudiante recibe un
juego terminado, «La llave del faro», y en nueve fases guiadas por una banda sobre el editor lo hace
suyo pieza por pieza, resolviendo la ficha jurídica de cada una. El recorrido completo (arrancar, jugar
el ejemplo, reemplazar sus piezas, publicar y jugar el `juego.html` exportado) corre en Chromium con
Playwright.
```

En el `README.md` de la raíz, si describe el recorrido del estudiante, agregar una frase con el mismo sentido; si no lo describe, no tocarlo.

- [ ] **Step 5: Nota en el diseño**

Al final de `docs/superpowers/specs/2026-11-06-modo-guiado-design.md`:

```markdown
## 16. Implementación

Construido con `docs/superpowers/plans/2026-11-08-plan-7-modo-guiado.md`. Ese plan fija lo que este
diseño no decía: la ficha de muestra (`ORIGENES_FICHA`), la normalización de `guia` (`asegurarGuia`),
que el ejemplo recién armado falla `M_PERSONAJES` además de `M_MUESTRA`, la retirada automática antes de
redibujar, el anuncio único por cambio, la opción `alTerminar` del reproductor y los botones de acción
de la banda.
```

- [ ] **Step 6: Suite completa**

Run: `npm test && npm run test:e2e`
Expected: 376 PASS en Node y todo PASS en Playwright.

- [ ] **Step 7: Commit**

```bash
git add tests/e2e README.md plataforma/README.md docs/superpowers/specs/2026-11-06-modo-guiado-design.md
git commit -m "Pruebas: recorrido guiado completo en Chromium; la banda no desborda; README y nota de implementación"
```

---

## Cobertura del diseño

| Sección del diseño | Tarea |
|---|---|
| 1, 2, 3 (recorrido) | 6, 7, 9, 10, 11, 12 |
| 4 (el ejemplo) | 6 |
| 5 (piezas de muestra, origen, retirada, mínimo) | 2, 3, 4, 8, 9, 10 |
| 6 (fases y tareas, avance) | 7, 9 |
| 7 (banda, accesibilidad, resaltado, pantallas angostas) | 9, 10, 12 |
| 8 (módulos e interfaces) | 2 a 11 |
| 9 (arranque) | 11 |
| 10 (persistencia y copias) | 3, 10 |
| 11 (errores) | 3, 6, 10, 11 |
| 12 (pruebas) | todas |
| 14 (pendientes de verificación) | 9 (la banda usa `explicacion()`, que pone «Por verificar») |
| 15 (orden) | el orden de las tareas |
