# Modo guiado: del juego de ejemplo al juego propio

Diseño de la segunda versión del recorrido del estudiante en la plataforma de práctica
«Mi primer videojuego». Complementa el diseño general
(`2026-11-04-plataforma-primer-videojuego-design.md`); donde los dos difieren, manda este.

Fecha: 6 de noviembre de 2026.

## 1. Resumen

El editor libre de la primera versión no enseña el orden: el docente, probando el sitio
publicado, creó un fondo, una narración y diálogos, pero no encontró cómo dar un retrato a un
personaje (hay que crear el retrato antes, y nada lo dice). La segunda versión cambia el
punto de partida: el estudiante recibe un **juego terminado** («La llave del faro») y, en
**nueve fases**, lo va haciendo suyo pieza por pieza. En cada fase una **banda de guía**
sobre el editor explica qué hacer, cita el pasaje jurídico ya verificado que toca, lista las
tareas y las marca sola al leer el proyecto. **La ficha jurídica es el ejercicio**: en cada
reemplazo el estudiante la resuelve y el semáforo le dice si quedó bien.

Lo que el estudiante «hizo» en el ejemplo (título, sinopsis, líneas, personajes y sus
retratos) se reemplaza obligatoriamente; las tres piezas de biblioteca del ejemplo pueden
quedarse si su ficha queda resuelta. Publicar exige, además del mínimo de hoy, que no quede
ninguna pieza de muestra.

## 2. Decisiones tomadas

| Pregunta | Decisión |
|---|---|
| ¿Qué es «un tipo de juego estándar»? | Un juego de ejemplo ya hecho, que el estudiante reemplaza pieza por pieza. |
| ¿Qué queda del ejemplo al entregar? | Nada de lo propio del ejemplo; las piezas de biblioteca pueden quedarse con su ficha resuelta. |
| ¿Cómo se ejercita el conocimiento? | Resolviendo la ficha de cada pieza. Ni preguntas de comprobación ni problemas escondidos. |
| ¿Convive con el editor libre? | No se ofrece: todos pasan por el ejemplo. El editor sigue debajo, entero. |
| ¿Cómo se guía? | Una banda sobre el editor de tres columnas, que resalta sin esconder. |
| ¿Textos jurídicos? | Solo los que ya existen en `contenido/juridico.json`, citados tal cual y con fuente. Ninguno nuevo. |

## 3. Recorrido del estudiante

1. **Arranque.** La pantalla de inicio explica que va a recibir un juego terminado y a
   hacerlo suyo, que cada pieza abre una ficha jurídica, qué va a entregar y que nada sale
   del navegador. Pide su nombre y el destino del juego. El título ya no se pide aquí.
2. **Fase 0, conoce el ejemplo.** Juega «La llave del faro» hasta los créditos.
3. **Fases 1 a 6.** Historia, personajes, retratos, fondo, música y efectos, y una voz
   opcional. En cada una reemplaza lo de muestra o resuelve la ficha de lo que conserva.
4. **Fase 7, destino y mapa.** Elige el destino a conciencia y revisa el mapa de activos:
   todo en verde y sin piezas de muestra.
5. **Fase 8, publicar.** Decisión de registro y paquete de entrega, como en la primera versión.

Jugar nunca está bloqueado. Volver a una fase anterior siempre es posible. Editar algo que no
toca en la fase no está prohibido: la guía solo dice qué toca ahora.

## 4. El juego de ejemplo: «La llave del faro»

Se arma por código al pulsar «Empezar», con las mismas funciones del modelo que usa el
editor (`crearProyecto`, `agregarEscena`, `agregarPersonaje`, `agregarElemento`,
`agregarLinea`). Las piezas de biblioteca entran por el mismo camino que «Usar esta pieza»
(`usarPieza` del editor), así que nacen con su ficha y su entrada de catálogo.

**Juego.** Título «La llave del faro». Sinopsis «Una farera en su primer turno descubre
quién abrió la puerta.» Destino: el elegido en el inicio. Escena inicial: «El muelle».

**Personajes.**

| Nombre | Descripción | Retrato |
|---|---|---|
| Ana | Farera en su primer turno. | `ejemplo/retrato-ana.png`, origen `muestra` |
| El farero | Lleva treinta años cuidando la luz. | `ejemplo/retrato-farero.png`, origen `muestra` |

**Piezas de biblioteca** (identificadores del catálogo, fijados en `js/guia/muestra.js`):

| Id | Tipo | Título | Licencia | Qué enseña su ficha |
|---|---|---|---|---|
| `bib_f01` | fondo | Muelle de noche | CC BY 4.0 | Atribución: leer la licencia (A07) y escribir el crédito (A01) |
| `bib_m05` | música | Fiesta en el muelle | CC BY-SA 4.0 | Compartir igual: la casilla de aceptación (A03), además del crédito |
| `bib_e02` | efecto | Puerta que cruje | CC0 | Sin condiciones: basta leer la licencia |

Ninguna se pone roja con ningún destino. Si la biblioteca provisional se reemplaza por la
real, hay que conservar esos tres identificadores o cambiarlos en `muestra.js`; una prueba
comprueba que existan en el catálogo.

**Escenas y líneas** (ocho líneas, todas de muestra):

| Escena | Fondo / música | Líneas |
|---|---|---|
| El muelle | Muelle de noche / Fiesta en el muelle | 1. Narración: «La niebla cubre el muelle. La puerta del faro está abierta.» 2. Diálogo de Ana, con el efecto Puerta que cruje: «¿Quién dejó la puerta abierta?» 3. Diálogo de El farero: «Yo la cerré al anochecer. Alguien subió después.» 4. Decisión «¿Subes a la torre?»: «Sí» → La torre; «No» → Amanecer. |
| La torre | sin fondo / sin música | 5. Narración: «La escalera gira hasta la luz. En el último peldaño hay una llave.» 6. Fin: «Ana guarda la llave. Mañana sabrá de qué puerta es.» |
| Amanecer | sin fondo / sin música | 7. Diálogo de El farero: «Mejor esperar a que aclare.» 8. Fin: «Al amanecer, la puerta sigue abierta y la llave ya no está.» |

El ejemplo cumple el mínimo del diseño general (tres escenas, dos personajes con retrato,
una decisión, un fondo, una pista, un efecto y tres piezas ajenas) y se juega entero. Es
texto de ficción; no afirma nada jurídico.

**Retratos de muestra.** Dos dibujos de 64×64 generados por `scripts/generar-ejemplo.js`
(pixel art sin autor humano, publicados como CC0, anotados en `plataforma/README.md`),
guardados en `plataforma/ejemplo/`. El arranque los lee con `fetch` y los copia a los
archivos del proyecto, igual que una pieza de biblioteca.

## 5. Piezas de muestra

**Qué es de muestra.** Cinco cosas del ejemplo, y solo esas:

- El **título**, mientras su texto sea igual al del ejemplo.
- La **sinopsis**, mientras su texto sea igual al del ejemplo.
- Cada **línea** cuyo texto sea igual al de alguna línea del ejemplo.
- Cada **personaje** cuyo nombre sea igual al de un personaje del ejemplo.
- Cada **elemento** con origen `muestra` (los dos retratos).

La igualdad de textos ignora espacios al borde y mayúsculas. Se compara contra las
constantes de `js/guia/muestra.js`, no contra el documento: así no hace falta marcar nada
en el modelo al editar, y una copia vieja (sin muestra) tiene cero piezas de muestra.

**Origen `muestra`.** Se agrega a `ORIGENES`. Un elemento de muestra tiene archivo real
(el juego se juega) y tiene ficha, como todos, pero la ficha **no se evalúa ni se muestra**:
`evaluarTodo` lo salta, el inventario y el mapa de activos lo listan con la marca «de
muestra» en lugar del punto de semáforo, y el panel derecho solo dice «Retrato de muestra
del ejemplo: reemplázalo por uno tuyo», con un enlace a Pixel art, Subir archivo y
Biblioteca. No cuenta como «personaje con retrato» para el mínimo.

**Retirada automática.** Después de cada cambio del proyecto, la guía elimina los elementos
de muestra que ningún personaje use (origen de cambio `guia`, sin redibujo propio: el
editor ya redibuja por el cambio). El estudiante nunca tiene que borrarlos a mano.

**Mínimo.** `cumpleMinimo` gana la línea `M_MUESTRA`, «Piezas de muestra por reemplazar»,
con el número de piezas de muestra que quedan; se cumple con cero. El candado de «Publicar»
la lista como las demás.

## 6. Las fases

Nueve fases, en este orden, con identificador fijo. Cada una tiene una **instrucción**
(una o dos frases nuevas, sin afirmaciones jurídicas), una **lección** (entradas de
`contenido/juridico.json`, citadas con el mismo componente `explicacion()` de la ficha:
breve, «Ver más», texto completo, fuente y marca «Por verificar» cuando la entrada está
pendiente), una lista de **tareas** que se evalúan solas, y qué **resalta** en el editor.

| # | Id | Nombre | Lección (claves del contenido) | Resalta |
|---|---|---|---|---|
| 0 | `conocer` | Conoce el ejemplo | `campos.tipoObra` | Botón «Jugar» |
| 1 | `historia` | Tu historia | `tiposObra.literaria`, `notas.N_TITULO` | Entrada «El juego», sección Escenas, guion |
| 2 | `personajes` | Tus personajes | `campos.autoria` | Sección Personajes |
| 3 | `retratos` | Sus retratos | `tiposObra.artistica`, `campos.prueba`, `notas.N_SELLO` | Pixel art, Subir archivo, Biblioteca; entradas de personajes |
| 4 | `fondo` | El fondo | `campos.respaldo`, `campos.credito` | Sección Elementos; entrada del fondo |
| 5 | `sonido` | Música y efectos | `tiposObra.musical_fonograma`, `tiposObra.fonograma` | Secuenciador, Grabar, Biblioteca; entradas de música y efectos |
| 6 | `voz` | Una voz (opcional) | `tiposObra.interpretacion` | Grabar; selector de voz del diálogo |
| 7 | `destino` | Destino y mapa | `campos.destino`, `campos.titular` | Entrada «El juego» (destino); botón «Mapa de activos» |
| 8 | `publicar` | Publicar | ninguna (la capa de publicación ya explica la prueba y el sello) | Botón «Publicar» |

**Tareas por fase.** Cada tarea es un texto fijo y una condición sobre el proyecto. Los
semáforos vienen de `evaluarTodo(proyecto)`; el mínimo, de `cumpleMinimo`; los avisos, de
`validar`.

| Fase | Tarea | Se cumple cuando |
|---|---|---|
| 0 | Juega el ejemplo hasta los créditos | `proyecto.guia.jugado === true` |
| 1 | Ponle tu título | título no vacío y distinto del de muestra |
| 1 | Escribe tu sinopsis | sinopsis no vacía y distinta de la de muestra |
| 1 | Reescribe las 8 líneas de muestra (quedan N) | ninguna línea con texto de muestra |
| 1 | Conserva tres escenas y una decisión | `M_ESCENAS` y `M_DECISIONES` cumplidos y sin avisos bloqueantes |
| 1 | Ficha de la historia en verde | semáforo de `historia` verde |
| 2 | Dales nombre y descripción a los dos personajes | al menos dos personajes, ninguno con nombre de muestra ni vacío |
| 2 | Fichas de los personajes en verde | semáforo de cada personaje verde |
| 3 | Reemplaza el retrato de cada personaje | cada personaje con retrato cuyo elemento no es de muestra |
| 3 | Fichas de los retratos en verde | semáforo de cada retrato usado verde |
| 4 | La escena inicial tiene fondo | `escenaInicial.fondo` apunta a un fondo existente |
| 4 | Fichas de los fondos en verde | `M_FONDOS` cumplido y semáforo de cada fondo verde |
| 5 | Al menos una pista y un efecto | `M_MUSICA` y `M_EFECTOS` cumplidos |
| 5 | Fichas de música y efectos en verde | semáforo de cada pista y cada efecto verde |
| 6 | (Opcional) Graba una voz y resuelve su ficha | si hay voces, todas en verde; sin voces, cumplida |
| 7 | Todo en verde | ninguna ficha evaluada en rojo ni amarillo |
| 7 | Sin piezas de muestra | `M_MUESTRA` cumplido |
| 7 | Al menos una pieza que no hiciste tú | `M_AJENOS` cumplido |
| 8 | Publica y descarga el paquete | `proyecto.publicado !== null` |

**Avance.** «Siguiente» se habilita cuando todas las tareas de la fase están cumplidas (en la
fase 6, siempre). «Atrás» siempre. Los puntos de progreso de fases anteriores se pueden
pulsar; los de fases posteriores, solo si todas las fases intermedias están completas. La
fase actual se guarda en el proyecto. Si una tarea de una fase anterior se deshace (por
ejemplo, se vuelve a poner el título de muestra), la fase actual no cambia, pero el punto de
esa fase pierde su marca y el candado de «Publicar» lo lista.

## 7. La banda de guía

Una franja a lo ancho entre la barra superior y las tres columnas, siempre visible dentro
del editor, en la zona fija superior junto con la barra. Las columnas ocupan el alto restante.

Tres partes, de izquierda a derecha:

- **Progreso.** «Fase 3 de 8 · Sus retratos» y nueve puntos (`button`, `aria-current` en
  el actual, marca de cumplida en los que lo están). La fase 0 se cuenta como «Inicio».
- **Instrucción y lección.** La instrucción de la fase en una o dos frases; debajo, cada
  entrada de la lección con el componente `explicacion()` de la ficha. En pantallas de
  menos de 1200 px la lección se pliega bajo un «Ver la lección».
- **Tareas y botones.** La lista de tareas con casilla marcada o vacía (solo lectura) y los
  botones «Atrás» y «Siguiente». Una tarea con contador («quedan 5») se actualiza con cada
  cambio.

**Accesibilidad.** La banda es una `section` con `aria-label="Guía"`. Al cumplirse una
tarea o una fase se anuncia con `anunciar()` (la zona `aria-live` única). Todo se opera con
teclado; el foco se conserva al redibujar con `conservarFoco`.

**Resaltar sin esconder.** El editor lleva `data-fase` con el id de la fase en su raíz. El
CSS resalta (borde de acento) las secciones y botones de la tabla de la sección 6 y atenúa
el resto (opacidad 0,65). Nada se deshabilita ni se oculta por la guía. Las secciones del
inventario llevan `data-seccion` (`escenas`, `personajes`, `elementos`) y la entrada «El
juego» su `data-foco` actual, para que el CSS las encuentre.

**Pantallas angostas.** Por debajo de 900 px el editor ya apila las columnas y avisa que
se edita en un computador; la banda se apila igual, sin cambios de comportamiento.

## 8. Módulos e interfaces

Todo nuevo va en `plataforma/js/guia/`. Nada de lo nuevo importa del editor salvo la vista
de la banda; `estado/validacion.js` importa solo las constantes de `muestra.js`.

- `guia/muestra.js`: constantes del ejemplo. `TEXTOS_MUESTRA = { titulo, sinopsis, lineas:
  los ocho textos, personajes: ['Ana', 'El farero'] }`, `PIEZAS_BIBLIOTECA = { fondo:
  'bib_f01', musica: 'bib_m05', efecto: 'bib_e02' }`, `RETRATOS_MUESTRA = [{ nombre, archivo
  }]`, y las funciones puras `esTextoDeMuestra(texto, lista)`, `piezasDeMuestra(proyecto)`
  → `{ titulo, sinopsis, lineas, personajes, elementos, total }`.
- `guia/ejemplo.js`: `async crearEjemplo({ estudiante, destino }, { catalogo, cargar })` →
  `{ proyecto, archivos }`. `cargar(ruta)` devuelve `{ tipo, datos }` (se inyecta: en el
  navegador usa `fetch`; en las pruebas lee del disco). Arma el proyecto con el modelo, las
  piezas de biblioteca con la misma función que usa el editor al elegir una pieza (se extrae
  de `editor.js` a `estado/biblioteca.js` para poder compartirla), y los retratos de muestra
  con origen `muestra`. Deja `guia = { fase: 'conocer', jugado: false }`.
- `guia/fases.js`: `FASES` (lista ordenada con id, nombre, instrucción, lección, tareas,
  resalta) y `estadoDeGuia(proyecto)` → `{ fases: [{ id, nombre, tareas: [{ texto,
  cumplida, detalle }], completa, opcional }], actual, indiceActual, puedeAvanzar,
  puedeIrA(id) }`. Pura: calcula `evaluarTodo`, `cumpleMinimo`, `validar` y
  `piezasDeMuestra` una vez por llamada.
- `guia/banda.js`: `crearBanda(contenedor, sesion, { contenido, alJugar, alMapa, alIrA
  })` → `{ dibujar }`. Dibuja desde `estadoDeGuia`, cambia `proyecto.guia.fase` con
  `sesion.cambiar(..., { origen: 'guia' })`, llama `anunciar` al completarse algo y pone
  `data-fase` en la raíz del editor. La retirada automática de piezas de muestra sin uso
  también vive aquí (en el `dibujar`, que corre tras cada cambio), para que la lógica de
  muestra quede en un solo módulo de interfaz.

**Cambios en interfaces existentes.**

- `estado/modelo.js`: `ORIGENES` incluye `muestra`; `crearProyecto` deja `guia: { fase:
  'conocer', jugado: false }`.
- `estado/validacion.js`: `cumpleMinimo` cuenta `M_MUESTRA` y no cuenta como «con retrato»
  a un personaje cuyo retrato sea de muestra. `puedePublicar` no cambia de firma.
- `estado/copias.js`: `validarEstructura` acepta `guia` (objeto con `fase` entre los nueve
  ids y `jugado` booleano) y el origen `muestra`; si `guia` falta, se completa con la fase
  0 al importar.
- `juridico/semaforo.js`: `evaluarTodo` salta elementos de origen `muestra`.
- `juridico/mapa.js`: las filas de esos elementos llevan `muestra: true` y sin color.
- `editor/inventario.js`: detalle «de muestra» y sin punto; `data-seccion`.
- `editor/panel-ficha.js`: para origen `muestra`, solo el aviso y los enlaces.
- `editor/editor.js`: aloja `zonaGuia`; expone `alTerminar` del reproductor (que ya sabe
  cuándo llega a los créditos) para poner `guia.jugado = true`; pasa `alJugar`, `alMapa`.
- `editor/inicio.js`: sin campo de título; textos nuevos; `alEmpezar({ estudiante,
  destino })`.
- `app.js`: «Empezar» llama `crearEjemplo` con el catálogo ya cargado y `fetch`; guarda y
  abre el editor.
- `css/editor.css`: la banda, el resaltado por `data-fase`, la marca «de muestra».

## 9. Arranque

La pantalla de inicio mantiene el eyebrow, el título del producto, la privacidad y el aviso
legal. Cambian los dos párrafos de explicación:

> Vas a recibir un juego terminado, «La llave del faro», y a hacerlo tuyo pieza por pieza:
> la historia, los personajes, sus retratos, el fondo, la música y los efectos. Cada pieza
> que entre al juego abre una ficha jurídica con semáforo que tú resuelves.
>
> Puedes jugar tu juego cuantas veces quieras. Cuando no quede nada del ejemplo y todas las
> fichas estén en verde, lo publicas y descargas un paquete con el juego, su informe
> jurídico y el proyecto en bruto, que subes al formulario del curso.

Pide nombre y destino. «Empezar» arma el ejemplo y abre el editor en la fase 0; mientras
carga, el botón dice «Preparando el ejemplo…» y queda deshabilitado. «Abrir una copia» no
cambia. Si ya hay un proyecto guardado, el arranque abre el editor directamente, como hoy.

## 10. Persistencia y copias

`proyecto.guia` viaja con el proyecto: al almacén, a las copias y al paquete de entrega
(`proyecto.json`). El informe no lo muestra. Una copia de la primera versión, sin `guia`,
se importa con `{ fase: 'conocer', jugado: false }` y cero piezas de muestra, así que las
tareas de las fases 1 a 7 aparecen cumplidas en cuanto sus fichas estén en verde.

## 11. Manejo de errores

- No se pudo cargar el ejemplo (sin red, archivo o pieza del catálogo que falta): el inicio
  muestra el mensaje («No se pudo preparar el ejemplo: falta la pieza «Muelle de noche» de
  la biblioteca.») y vuelve a habilitar «Empezar». No se guarda nada.
- El catálogo no cargó (hoy, la biblioteca se deshabilita y se avisa): el ejemplo no se
  puede armar; el inicio lo dice y ofrece «Abrir una copia».
- Una copia con `guia.fase` desconocida: se importa con la fase 0 y se avisa en el editor.
- Una pieza de muestra que alguien cargó en una copia editada a mano: se trata como de
  muestra (se lista, se retira si no se usa, bloquea la publicación).

## 12. Pruebas

En Node, con `node:test`:

- `tests/muestra.test.js`: `piezasDeMuestra` sobre el ejemplo recién armado (total 14: título,
  sinopsis, ocho líneas, dos personajes y dos retratos), sobre un proyecto editado (cero) y sobre una copia de la primera versión
  (cero). Igualdad con espacios y mayúsculas.
- `tests/ejemplo.test.js`: el ejemplo cumple el mínimo salvo `M_MUESTRA`, se juega con el
  motor hasta un final, sus tres piezas de biblioteca existen en `catalogo.json`, los retratos
  tienen origen `muestra` y archivo, `guia` está en la fase 0.
- `tests/fases.test.js`: con el ejemplo recién armado solo la fase 0 tiene tareas por
  cumplir que dependan de jugar; tras cada edición del recorrido, la tarea correspondiente se
  marca; `puedeAvanzar` y `puedeIrA`; la fase opcional; deshacer una tarea anterior.
- `tests/validacion.test.js`: `M_MUESTRA` y el conteo de retratos (se amplía).
- `tests/copias.test.js`: ida y vuelta con `guia` y origen `muestra`; copia vieja (se amplía).
- `tests/semaforo.test.js`, `tests/mapa.test.js`: las piezas de muestra se saltan o se
  marcan (se amplían).
- Con jsdom: `tests/banda.test.js` (fase, tareas, «Siguiente» habilitado o no, «Atrás»,
  puntos, `data-fase`, anuncios, retirada automática), `tests/inventario.test.js`,
  `tests/panel-ficha.test.js`, `tests/inicio.test.js` (sin título, `alEmpezar` con nombre y
  destino, estado «Preparando…», error), `tests/editor.test.js` (la banda en el editor y
  `jugado` al terminar el juego).

En Chromium, con Playwright:

- `tests/e2e/recorrido.spec.js` se reescribe: inicio, fase 0 jugando el ejemplo, fases 1 a
  7 con pixel art, subida, biblioteca y grabación con micrófono falso, publicación, y el
  `juego.html` exportado jugado hasta los créditos; sin errores de página.
- `tests/e2e/inventario.spec.js` se amplía: la banda no desborda a 1280×800 ni a 1000×700.

## 13. Fuera de alcance

- Preguntas de comprobación y problemas escondidos en el ejemplo.
- Entrada al editor libre desde el inicio.
- Textos jurídicos nuevos; cualquier entrada que haga falta se escribe en
  `contenido/juridico.json` con `verificacion: pendiente`, pero este diseño no necesita ninguna.
- Un segundo juego de ejemplo o un segundo tipo de juego.
- Cambios al informe, al paquete o al motor.

## 14. Pendientes de verificación jurídica

Ninguno nuevo. Las fases citan entradas que ya están marcadas `pendiente` en el diseño
general (sección 19): `campos.prueba`, `tiposObra.musical_fonograma`, `tiposObra.fonograma`,
`tiposObra.interpretacion`, `tiposObra.titulo`, `notas.N_TITULO`, `notas.N_SELLO`. Salen con
la marca «Por verificar» en la banda, como en la ficha.

## 15. Orden de construcción sugerido

1. `muestra.js` con sus constantes y `piezasDeMuestra`; `ORIGENES` y `guia` en el modelo;
   el mínimo y las copias. Todo puro, con pruebas.
2. `estado/biblioteca.js` (la función de elegir pieza, extraída del editor) y `ejemplo.js`,
   con el script que genera los retratos de muestra.
3. `fases.js` con `FASES` y `estadoDeGuia`, con pruebas sobre el ejemplo.
4. Semáforo, mapa, inventario y panel de ficha con las piezas de muestra.
5. La banda y su CSS, en el editor; `jugado` desde el reproductor.
6. El inicio y el arranque.
7. El recorrido de Playwright reescrito; README; nota en el diseño general.

## 16. Implementación

Construido con `docs/superpowers/plans/2026-11-08-plan-7-modo-guiado.md`. Ese plan fija lo que este
diseño no decía: la ficha de muestra (`ORIGENES_FICHA`), la normalización de `guia` (`asegurarGuia`),
que el ejemplo recién armado falla `M_PERSONAJES` además de `M_MUESTRA`, la retirada automática antes de
redibujar, el anuncio único por cambio, la opción `alTerminar` del reproductor y los botones de acción
de la banda. Al construirlo se agregaron dos cosas más: los créditos avisan que el juego aún tiene
piezas de muestra (para no atribuirle al estudiante la historia del ejemplo), y si el botón con el
foco queda deshabilitado al cambiar de fase, el foco pasa al título de la fase.
