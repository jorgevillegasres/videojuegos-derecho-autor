# Plataforma de práctica: primer videojuego y derecho de autor — Diseño

**Fecha:** 4 de noviembre de 2026
**Estado:** diseño aprobado por secciones en conversación con el docente; pendiente de su revisión final sobre este documento.
**Carpeta de la plataforma:** `plataforma/` dentro de este proyecto.
**Nombre del producto:** lo elige el docente antes de publicar. Mientras tanto, la plataforma usa como título «Mi primer videojuego», que se cambia en un solo lugar (`contenido/juridico.json`, clave `nombre`).

---

## 1. Resumen

Una aplicación web estática en la que cada estudiante arma, de forma autónoma e individual, una aventura narrativa corta sobre un motor común. Cada elemento que entra al juego (título, historia, personajes, fondos, retratos, música, efectos de sonido, voces) abre una ficha jurídica que el estudiante debe resolver. Un semáforo por elemento muestra el riesgo. El juego se puede jugar siempre, pero solo se puede publicar cuando todas las fichas están en verde y se cumple un mínimo. Al publicar, la plataforma genera un paquete de entrega (juego jugable, informe jurídico y proyecto en bruto) que el estudiante sube al formulario del curso.

Es la continuación práctica del taller «¿De quién es tu videojuego?» y del portal del creador que ya existen en este proyecto. Toma de ellos las capas creativas, el mapa de activos y el memo de verificación legal (`07-memo-verificacion-bonasera.md`), que es la única fuente de los textos jurídicos de la plataforma.

## 2. Decisiones tomadas

| Pregunta | Decisión |
|---|---|
| Audiencia | Estudiantes creadores y desarrolladores: ya saben crear, no conocen el derecho de autor |
| Contexto de uso | Práctica autónoma e individual, posterior a la clase, como profundización |
| Seguimiento | El docente recibe una entrega al final. No hay cuentas ni vista de docente |
| Tipo de juego | Aventura narrativa: escenas, personajes, diálogos con decisiones, fondos, música, efectos, voces |
| Origen de los elementos | Mixto: creados dentro, subidos, tomados de una biblioteca con licencias reales, y declaración de contenido generado con IA |
| Capa jurídica | Ficha por elemento con explicación breve, semáforo de riesgo, publicación solo con todo en verde |
| Arquitectura | Estática, publicada en GitHub Pages, guardado en el navegador, paquete de entrega exportable |

## 3. Recorrido del estudiante

1. **Arranque.** Una sola pantalla explica qué va a hacer y qué va a entregar, y declara que nada sale del navegador. El estudiante escribe su nombre, el título del juego y el **destino del juego**: uso personal, publicarlo gratis o venderlo. El destino condiciona qué licencias sirven y se puede cambiar después.
2. **Editor.** Arma el juego: escenas, personajes, diálogos con decisiones, fondos, retratos, música, efectos y voces. Cada vez que un elemento entra al juego se abre su ficha jurídica en el panel derecho. Puede dejarla incompleta y seguir; el elemento queda en amarillo o rojo.
3. **Mapa de activos.** En cualquier momento ve todos sus elementos con su semáforo, en la misma tabla del taller, pero viva.
4. **Jugar.** Prueba el juego en el reproductor cuantas veces quiera, con elementos en rojo incluidos. Jugar nunca está bloqueado.
5. **Publicar y entregar.** Cuando todas las fichas están en verde, el juego cumple el mínimo y no tiene errores bloqueantes, se habilita «Publicar». Antes de generar el paquete, el estudiante hace la **decisión de registro** (sección 12.7). Luego descarga el paquete de entrega y lo sube al formulario del curso.

## 4. Juego mínimo publicable

«Publicar» exige, además de todas las fichas en verde:

| Elemento | Mínimo |
|---|---|
| Título del juego | 1 |
| Escenas | 3 |
| Personajes con retrato | 2 |
| Decisiones con al menos dos opciones | 1 |
| Fondos | 1 |
| Pistas musicales | 1 |
| Efectos de sonido | 1 |
| Elementos que no hizo el estudiante (origen biblioteca, o autoría de otra persona) | 1 |

La última fila obliga a que aparezca al menos una vez la lección de licencia o de cesión. Las voces son opcionales.

## 5. Supuestos y fuera de alcance

**Supuestos.**

- Todo en español y bajo derecho colombiano, con las fuentes del memo de verificación. Sin derecho comparado.
- El editor se usa en computador o tableta. El juego terminado se juega también en celular.
- Un estudiante, un juego, un navegador. Sin colaboración entre estudiantes.
- El formulario de entrega del curso acepta archivos comprimidos de varias decenas de megabytes. Si el límite real es menor, el tamaño máximo del paquete se ajusta en la implementación.

**Fuera de la primera versión.** Cuentas y vista de docente, eventos jurídicos simulados (reclamos después de publicar), colaboración entre estudiantes, exportar como aplicación móvil, arte 3D, generación de contenido con IA dentro de la plataforma, proyecto de ejemplo precargado.

## 6. Modelo del juego

Todo lo que el estudiante arma es un solo documento JSON (`proyecto.json`) más los archivos binarios de los elementos. Cinco tipos de pieza:

- **Juego**: título, nombre del estudiante, destino (`personal` | `gratis` | `venta`) y escena inicial.
- **Escena**: id, nombre, fondo (id de elemento, opcional), música (id de elemento, opcional) y lista ordenada de líneas.
- **Línea**, de cuatro tipos:
  - `narracion`: texto sin personaje.
  - `dialogo`: personaje, texto, efecto de sonido opcional, voz grabada opcional.
  - `decision`: texto de la pregunta y de dos a cuatro opciones; cada opción tiene texto y escena destino.
  - `fin`: texto de cierre. Termina el juego y muestra los créditos.
- **Personaje**: id, nombre, descripción corta y retrato (id de elemento).
- **Elemento**: id, tipo (`fondo` | `retrato` | `musica` | `efecto` | `voz`), nombre, archivo, origen (`creado` | `subido` | `biblioteca`), sello de creación cuando se creó dentro (fecha, hora y huella SHA-256 del archivo), y referencia a la entrada de biblioteca cuando viene de ahí.

Además del juego, el documento guarda las **fichas jurídicas** (sección 12), la **decisión de registro** y la fecha de publicación.

Esquema orientativo:

```json
{
  "version": 1,
  "estudiante": "Camila R.",
  "creado": "2026-11-04T20:00:00Z",
  "juego": {
    "titulo": "La llave del faro",
    "destino": "gratis",
    "escenaInicial": "esc1",
    "escenas": [
      { "id": "esc1", "nombre": "El muelle", "fondo": "el1", "musica": "el2",
        "lineas": [
          { "tipo": "narracion", "texto": "La niebla cubre el muelle." },
          { "tipo": "dialogo", "personaje": "p1", "texto": "¿Quién dejó la puerta abierta?", "efecto": "el3", "voz": null },
          { "tipo": "decision", "texto": "¿Subes a la torre?",
            "opciones": [ { "texto": "Sí", "escena": "esc2" }, { "texto": "No", "escena": "esc3" } ] }
        ] }
    ],
    "personajes": [ { "id": "p1", "nombre": "Ana", "descripcion": "Farera en su primer turno.", "retrato": "el4" } ],
    "elementos": [
      { "id": "el1", "tipo": "fondo", "nombre": "Fondo muelle", "archivo": "el1.png", "origen": "creado",
        "sello": { "fecha": "2026-11-04T20:10:00Z", "huella": "sha256:…" }, "biblioteca": null }
    ]
  },
  "fichas": { "titulo": {}, "historia": {}, "p1": {}, "el1": {} },
  "registro": [],
  "publicado": null
}
```

**Regla de corte.** Una escena termina en su primera línea de decisión o de fin. Si se acaban las líneas sin ninguna de las dos, el juego sigue con la siguiente escena de la lista; si no hay siguiente, termina y muestra los créditos. Las líneas que quedan después de una decisión o un fin nunca se ven. El reproductor y la validación comparten esta regla.

**Validación del juego** (no jurídica). Dos niveles:

- **Bloqueante** para publicar: escena inicial inexistente (B01), decisión con una opción sin escena destino (B02), diálogo con personaje inexistente (B03), decisión con menos de dos o más de cuatro opciones (B04).
- **Informativo**: escena a la que no se llega desde la inicial (I01), personaje sin retrato (I02), escena sin líneas (I03), juego sin ninguna línea `fin` alcanzable (I04), líneas después del corte (I05). Sin escena inicial válida no se calculan I01 ni I04, que serían ruido de rebote.

Los avisos se muestran en gris, nunca en los colores del semáforo jurídico.

## 7. Editor

Una pantalla con barra superior y tres columnas.

**Barra superior.** Título del juego y nombre del estudiante; botones «Jugar», «Mapa de activos», «Guardar copia» y «Publicar». «Publicar» muestra un candado hasta que se cumplan las condiciones; al pasar el cursor o enfocarlo, dice qué falta.

**Columna izquierda: inventario.** Tres listas con botón de crear en cada una: escenas, personajes y elementos. Cada entrada lleva su punto de semáforo (los elementos y personajes) o su aviso gris (las escenas). Seleccionar una entrada la abre en el centro o en el panel derecho según corresponda.

**Columna central: la escena activa.** Arriba, una vista previa fija tal como se verá en el juego: fondo, retrato de quien habla y caja de texto con el nombre, para la línea seleccionada. Abajo, el guion de la escena: la lista de líneas como bloques que se editan en el lugar. Se reordenan arrastrando y también con botones de subir y bajar, para que funcione con teclado. Un botón «Línea» al final agrega narración, diálogo, decisión o fin. En un diálogo se elige el personaje de una lista, y opcionalmente un efecto o una voz de entre los elementos existentes o creando uno nuevo. En una decisión, cada opción elige su escena destino de una lista.

**Columna derecha: ficha y propiedades.** Si lo seleccionado es un elemento, un personaje, el título o la historia, muestra su ficha jurídica (sección 12). Si es una línea o una escena, muestra sus propiedades (fondo y música de la escena, personaje de la línea). Siempre visible, nunca en ventana aparte.

**Jugar** abre el reproductor sobre el editor, desde la escena inicial o desde la escena activa. Cerrarlo devuelve al mismo punto.

**Mapa de activos** abre la tabla de la sección 12.8 sobre el editor, con enlace a cada ficha.

**Historia y título** se editan desde una entrada fija al inicio del inventario («El juego»): título, nombre del estudiante, destino y una sinopsis corta. Esa entrada tiene dos fichas: la del título y la de la historia.

## 8. Motor (reproductor)

Un módulo que recibe un contenedor, el documento del juego y una función que resuelve cada elemento a una URL. Muestra el fondo de la escena, reproduce su música en bucle, y recorre las líneas: narración y diálogo avanzan con clic, toque, barra espaciadora o Enter; el efecto de una línea suena al llegar a ella y la voz se reproduce completa; las decisiones se muestran como botones, también accesibles con las teclas 1 a 4; `fin` muestra el texto de cierre y luego la pantalla de créditos (sección 12.6). Un botón «Créditos» está disponible en todo momento. Un botón «Reiniciar» vuelve a la escena inicial.

Es el mismo código que usa la vista previa del editor y el que se incrusta en el `juego.html` exportado. Lo que se prueba es lo que se entrega.

Las imágenes creadas con la herramienta de pixel art se escalan sin suavizado para conservar el estilo.

## 9. Herramientas de creación

Deliberadamente simples. Existen para que quien no trae nada pueda armar un juego en una tarde, no para competir con herramientas profesionales. Cada una devuelve un archivo que entra como elemento con origen `creado`, sello de fecha y hora, huella SHA-256 y autoría «yo».

**Pixel art.** Lienzo fijo: retratos de 64×64 y fondos de 192×108 píxeles. Paleta fija de 16 colores definida en `contenido/paleta.json`. Herramientas: lápiz, borrador, relleno, cuentagotas, deshacer y rehacer (20 pasos), zoom. Produce PNG. Se puede reabrir un elemento creado aquí para editarlo; al guardarlo se actualiza el sello.

**Grabador.** Usa el micrófono del navegador. Grabar, detener, escuchar, recortar inicio y final con dos manijas sobre una forma de onda simple. Máximo 30 segundos. Formato: el que el navegador soporte, con preferencia por WebM/Opus y alternativa MP4/AAC. Sirve para voces y para efectos de sonido caseros.

**Secuenciador.** Dos compases de ocho pasos, cuatro instrumentos sintetizados (bajo, melodía, acorde, percusión), tempo entre 80 y 160, escala pentatónica para que todo suene bien. Se escucha en bucle mientras se edita. Al guardar, se renderiza a WAV con audio fuera de línea. El reproductor lo pone en bucle como música de escena.

**Texto.** La historia (sinopsis), los diálogos y la narración se escriben en el propio editor. No hay herramienta aparte.

## 10. Subida de archivos

Formatos: imágenes PNG, JPG y WebP; audio MP3, OGG y WAV. Límites por archivo: 2 MB para imágenes, 5 MB para audio. Las imágenes de fondo se muestran ajustadas al cuadro del juego sin recortar; los retratos, ajustados a su recuadro.

Al subir, la ficha se abre con la pregunta de autoría primero: «¿Quién lo hizo?» con cuatro respuestas: yo, otra persona, una herramienta de IA, IA con mi aporte creativo. Cada respuesta abre los campos que le corresponden (sección 12.2).

## 11. Biblioteca

Un catálogo pequeño que viene con la plataforma: al menos 8 fondos, 8 retratos, 6 pistas musicales y 12 efectos de sonido. Cada entrada de `biblioteca/catalogo.json` tiene: id, tipo, título, autor, fuente (URL), licencia (código de la tabla siguiente), `condiciones` (lista con cero o más de `BY`, `NC`, `SA`, `ND`, derivada del código), archivo y crédito sugerido en el formato que la licencia pide. Las piezas `CURSO` y `DESCONOCIDO` no llevan condiciones; el semáforo las trata por su código.

**Licencias del catálogo**, con su código en el catálogo:

| Código | Qué es | Condiciones |
|---|---|---|
| `DP` | Dominio público | Ninguna; se recomienda crédito |
| `CC0` | Creative Commons Zero | Ninguna; se recomienda crédito |
| `CC-BY-4.0` | Atribución | Crédito obligatorio |
| `CC-BY-SA-4.0` | Atribución y compartir igual | Crédito; el juego debe licenciarse igual |
| `CC-BY-NC-4.0` | Atribución y no comercial | Crédito; no sirve si el juego se vende |
| `CC-BY-ND-4.0` | Atribución y sin derivadas | Crédito; no se puede modificar |
| `CURSO` | Licencia limitada al curso | Solo para uso dentro de la plataforma y del curso; no se puede publicar fuera |
| `DESCONOCIDO` | Autor desconocido, «encontrado en internet» | Se presume reservado; no se puede usar |

La mezcla es intencional. Cada tipo de medio incluye al menos una pieza `CC-BY-4.0` y una `CC0` o `DP`; hay al menos una pista `CC-BY-NC-4.0`, una imagen `CC-BY-ND-4.0`, una imagen `CC-BY-SA-4.0`, una pieza `CURSO` y una pieza `DESCONOCIDO`. El audio con `CC-BY-ND-4.0` queda fuera del catálogo mientras el docente resuelve el punto 10 de la sección 19.

**Licencia del curso.** La licencia `CURSO` tiene un texto propio, publicado en `biblioteca/LICENCIA-CURSO.md` y enlazado desde la ficha, porque la regla R05 se apoya en ese texto y no en una norma.

**Honestidad del catálogo.** Las piezas `CURSO` y `DESCONOCIDO` son en realidad piezas `CC0` o de dominio público, que la plataforma puede distribuir. El catálogo guarda su licencia y fuente reales en un campo `simulado`, y la explicación de la ficha lo revela en «ver más»: «en la vida real esta pieza es CC0 de tal autor; aquí se presenta así para que practiques». No se inventa ningún autor ni ninguna fuente.

**Procedencia.** Las piezas se toman de repositorios con licencias abiertas (por ejemplo OpenGameArt, Freesound, Kenney, Wikimedia Commons), verificando la licencia en la fuente al momento de incluirlas. `biblioteca/CREDITOS.md` lista todas con autor, licencia y enlace.

## 12. Capa jurídica

### 12.1 Qué tiene ficha

- El **título** del juego.
- La **historia** (sinopsis, narración y diálogos, como un todo).
- Cada **personaje** (nombre y descripción; su retrato tiene ficha propia como elemento).
- Cada **elemento**: fondo, retrato, música, efecto, voz.

### 12.2 Campos de la ficha

Seis campos, siempre los mismos, para que el estudiante aprenda a hacer las mismas preguntas ante cualquier obra. Cada campo tiene al lado una explicación de dos o tres líneas y un «ver más» con el texto completo y su fuente.

1. **Qué obra es.** Lo rellena la plataforma según el tipo (sección 12.3) y lo explica.
2. **Quién lo creó** (`autoria`): `yo` | `otra_persona` | `ia` | `ia_con_aporte`. Si es otra persona, pide su nombre. Si hay IA, pide la herramienta; si hay aporte humano, pide describirlo. Para historia y personajes, pregunta además si está **basado en una obra ajena** y, en ese caso, si hay autorización.
3. **Quién es titular de los derechos patrimoniales** (`titular`): `yo` | `otra_persona`. Aquí aparece la diferencia entre autor y titular.
4. **Qué lo respalda** (`respaldo`): `ninguno` | `cesion` | `licencia` | `autorizacion`. Con licencia, pide cuál (los códigos de la sección 11 u «otra», con texto) y una casilla «leí la licencia». Para licencias con compartir igual, una casilla «acepto licenciar mi juego igual». Para piezas de biblioteca o subidas, una casilla «lo modifiqué».
5. **Cómo se acredita** (`credito`): el texto del crédito tal como saldrá en la pantalla de créditos. Para piezas de biblioteca se precarga el crédito sugerido.
6. **Qué prueba la fecha** (`prueba`): `ninguna` | `sello` | `original` | `repositorio` | `registro_dnda`. Para lo creado dentro, se precarga `sello`. La explicación dice que el sello de la plataforma es un indicio de fecha, no un registro, y que el registro ante la DNDA es la prueba fuerte y declarativa.

Para el contenido hecho solo con IA hay una casilla adicional: «entiendo que no puedo reclamar derechos sobre este elemento y lo declaro en los créditos».

### 12.3 Tipo de obra por elemento

| Qué | Tipo de obra que muestra la ficha | Nota para la explicación |
|---|---|---|
| Historia, narración, diálogos | Obra literaria | Incluye la lógica de las decisiones; el memo ya trae el software como obra literaria y la explicación lo usa como analogía, sin afirmar que el guion sea software |
| Personaje (nombre y descripción) | Obra literaria; su retrato es obra artística | La ficha enlaza a la del retrato |
| Fondo, retrato | Obra artística | |
| Música | Obra musical y grabación (fonograma) | Dos capas con titulares que pueden ser distintos. En la primera versión la ficha trata el archivo como una sola pieza y la explicación cuenta las dos capas |
| Efecto de sonido | Grabación (fonograma); obra si hay creación | |
| Voz | Interpretación y grabación | Derechos del intérprete; si la voz es de otra persona, se necesita su autorización |
| Título | No es obra; puede ser marca | Ficha informativa, siempre en verde, con explicación sobre marca |

Las bases legales de interpretación, fonograma, obra derivada y título están en la lista de pendientes de verificación (sección 19).

### 12.4 Reglas del semáforo

`evaluar(ficha, contexto)` es una función pura. Entra la ficha y el contexto (`destino` del juego, obligatorio y validado). Sale `{ color, razones, notas }`, donde `razones` y `notas` son listas de códigos; los textos, fuentes y acciones de cada código los agrega aparte `describir()` desde el archivo de contenido. Dos atajos: la ficha del título siempre es verde con la nota de marca, y una pieza de autor desconocido (R01) devuelve solo R01, porque nada la arregla salvo reemplazarla. En los demás casos se evalúan todas las reglas; el color es el peor que aplique. Sin reglas aplicables, verde.

**Rojo** (incompatibilidad o vacío):

| Código | Condición | Acción sugerida |
|---|---|---|
| R01 | Licencia `DESCONOCIDO` (autor desconocido), venga de donde venga la pieza | Reemplazar la pieza |
| R02 | `autoria` es `otra_persona` o `titular` es `otra_persona`, y `respaldo` es `ninguno` | Pedir cesión o licencia escrita a esa persona |
| R03 | Respaldo de licencia con condición no comercial y `destino` es `venta` | Cambiar el destino o reemplazar la pieza |
| R04 | Respaldo de licencia con condición sin derivadas y «lo modifiqué» marcado | Usar la pieza sin modificar o reemplazarla |
| R05 | Respaldo de licencia `CURSO` y `destino` distinto de `personal` | Reemplazar la pieza o cambiar el destino |
| R06 | Cualquier ficha (historia, personaje o elemento) basada en obra ajena sin autorización: adaptaciones, versiones de canciones, fan art | Pedir autorización o cambiar la obra |

**Amarillo** (falta algo subsanable):

| Código | Condición | Cómo se resuelve |
|---|---|---|
| A01 | Licencia que exige atribución y `credito` vacío | Escribir el crédito |
| A02 | `autoria` es `otra_persona`, hay respaldo y `credito` vacío | Escribir el crédito: el derecho moral de paternidad no se cede |
| A03 | Licencia con compartir igual y la casilla de aceptación sin marcar | Marcar la casilla, o reemplazar la pieza |
| A04 | `autoria` es `ia` y la casilla de reconocimiento sin marcar | Marcar la casilla y escribir el crédito como «generado con IA (herramienta)» |
| A05 | `autoria` es `ia_con_aporte` y el aporte humano sin describir | Describir el aporte |
| A06 | Origen `subido`, `autoria` `yo` o `ia_con_aporte`, y `prueba` `ninguna` | Elegir una prueba: archivo original, repositorio o registro |
| A07 | Hay licencia y «leí la licencia» sin marcar | Leerla y marcar |
| A08 | `autoria` es `otra_persona` y el nombre vacío | Escribir el nombre |
| A09 | `respaldo` es `cesion` y `titular` es `otra_persona` | Revisar: si te cedieron los derechos, el titular eres tú |
| A10 | `respaldo` es `autorizacion` y `destino` es `venta` | Una autorización informal no basta para vender; pedir cesión o licencia escrita |
| A11 | Licencia «otra» sin describir (texto vacío) | Describir la licencia y marcar sus condiciones; sin descripción, una licencia desconocida no puede leerse como permisiva |
| A12 | `respaldo` es `licencia` pero no se eligió cuál | Elegir la licencia |
| A13 | `autoria` es `ia` o `ia_con_aporte` y la herramienta no está escrita | Escribir la herramienta; sin ella no se puede armar el crédito «generado con IA (herramienta)» |

Las reglas R03, R04 y R05 solo aplican cuando el respaldo es una licencia; un código de licencia que quedó de una elección anterior no dispara nada. El formulario (plan 3) limpia los campos de licencia cuando el respaldo deja de ser «licencia», oculta el respaldo cuando autoría y titular son «yo», oculta los campos que no aplican al título, y presenta A01 y A02 como una sola acción cuando coinciden. La pregunta «¿basado en una obra ajena?» se muestra en todas las fichas salvo el título.

Una ficha con origen biblioteca siempre nace de una entrada del catálogo con licencia conocida; crearla sin entrada es un error de programación, no un estado posible.

**Verde**: ninguna regla aplica. Algunos verdes llevan nota informativa en el informe: contenido con IA reconocido (A04 resuelta), aporte humano sobre IA (A05 resuelta, la protección cubre solo el aporte), y el título (información sobre marca).

Al cambiar el destino del juego se recalculan todos los semáforos. Pasar de «gratis» a «venta» y ver elementos ponerse en rojo es parte del diseño.

### 12.5 Destino del juego

`personal`: solo el estudiante lo juega. `gratis`: se publica sin cobrar. `venta`: se vende o monetiza. Se elige al arrancar y se puede cambiar desde la entrada «El juego». La explicación cuenta por qué importa: las licencias delimitan usos.

### 12.6 Cadena de titularidad y créditos

La cadena de titularidad se arma sola a partir de las fichas: el juego es del estudiante; la historia y las escenas, del estudiante; cada personaje y cada elemento cuelga de ahí con su autoría, titular, respaldo y licencia. Se muestra como árbol en el informe.

La **pantalla de créditos** del juego se genera de las fichas y no se edita a mano: el estudiante como autor del juego y de la historia; cada persona nombrada en una ficha con su aporte; cada pieza de biblioteca con su crédito; cada elemento con IA declarado como tal. El juego no se publica sin ella. Es el derecho moral de paternidad hecho pantalla.

### 12.7 Decisión de registro

Antes de generar el paquete, un paso corto igual a la estación B del taller: el estudiante elige hasta tres elementos y responde, para cada uno, si lo registraría ante la DNDA, a nombre de quién y con qué prueba, con una explicación breve de qué prueba el registro y qué no. No hay respuesta correcta; va al informe para que el docente lo lea.

### 12.8 Mapa de activos

La misma tabla del taller, llena sola: activo, quién lo creó, contrato o licencia, prueba, riesgo (color) y acción. La columna de acción sale de las acciones del semáforo. Cada fila enlaza a su ficha.

### 12.9 Contenido jurídico

Todos los textos de explicación, razones y fuentes viven en `contenido/juridico.json`, aparte del código, con esta forma por clave: `{ breve, completo, fuente }`. Hay una clave por campo de ficha, por tipo de obra, por regla del semáforo y por nota informativa. El docente puede corregir cualquier texto sin tocar la plataforma.

La única fuente de esos textos es el memo de verificación. Las afirmaciones que el memo marca como «matizar» se escriben con la fórmula corregida; las que marca «no decir» no aparecen. Lo que la plataforma necesita y el memo no cubre está en la sección 19 y no se publica sin verificación.

## 13. Persistencia y copias

- **Guardado automático** en IndexedDB en cada cambio, con una espera corta para no escribir en cada tecla. Dos almacenes: el documento del proyecto y los archivos binarios por id.
- **Un proyecto por navegador.** «Nuevo juego» pide confirmación y ofrece guardar copia antes.
- **Guardar copia** descarga un archivo comprimido con `proyecto.json` y la carpeta `archivos/`. **Abrir copia** acepta ese archivo o un paquete de entrega, lo valida completo y, solo si es válido, reemplaza el proyecto actual previa confirmación. Un archivo dañado se rechaza sin tocar nada.
- **Recordatorio** de guardar copia cada 50 cambios y después de publicar.

## 14. Publicación y paquete de entrega

Condiciones para habilitar «Publicar»: todas las fichas en verde, mínimo cumplido, sin avisos bloqueantes. Al publicar: decisión de registro, luego generación del paquete `entrega-<estudiante>-<juego>.zip` con:

- `juego.html`: el juego completo en un solo archivo, con motor, documento y elementos incrustados como datos, más la pantalla de créditos. Se abre en cualquier navegador sin internet.
- `informe-juridico.html`: página imprimible con portada (estudiante, juego, destino, fecha de publicación y huella del proyecto, que es el SHA-256 de `proyecto.json`), mapa de activos, cadena de titularidad, decisión de registro, todas las fichas completas con sus notas, y la leyenda de material educativo. Desde el navegador se guarda como PDF.
- `proyecto.json` y `archivos/`: el proyecto en bruto, el mismo formato que «Guardar copia».

Si el paquete supera 50 MB, antes de descargarlo se muestran los elementos que más pesan para que el estudiante decida. No se bloquea.

## 15. Arquitectura técnica

### 15.1 Pila

HTML, CSS y JavaScript con módulos ES, sin framework y sin paso de compilación, como el portal y la presentación. Una sola dependencia en tiempo de ejecución, para comprimir y descomprimir (JSZip), guardada localmente en `vendor/`. Las herramientas usan lo que el navegador trae: `canvas` para el pixel art, `MediaRecorder` para el grabador, Web Audio y `OfflineAudioContext` para el secuenciador, Web Crypto para las huellas, IndexedDB para guardar. Las fuentes tipográficas se sirven desde la propia carpeta para que no salga ninguna petición y funcione sin red.

### 15.2 Estructura de carpetas

```
plataforma/
  index.html                 inicio y editor en una sola página
  css/                       estilos; hereda los tokens del portal
  js/
    app.js                   arranque y navegación entre inicio, editor, mapa y publicar
    estado/
      modelo.js              crear proyecto, escenas, personajes, elementos, líneas; regla de corte
      validacion.js          escenas alcanzables, validar, mínimo, puede publicar (lectura pura)
      almacen.js             IndexedDB: proyecto y archivos
      copias.js              exportar e importar copia
    editor/                  inventario, guion, vista previa, panel derecho
    motor/
      reproductor.js         reproductor; también va dentro de juego.html
    herramientas/
      pixelart.js
      grabador.js
      secuenciador.js
    juridico/
      ficha.js               formulario de ficha y precargas
      semaforo.js            evaluar(ficha, contexto)
      cadena.js              cadena de titularidad y créditos
      informe.js             genera informe-juridico.html
    biblioteca/
      catalogo.js            carga y consulta del catálogo
    exportar/
      paquete.js             generarEntrega, generarJuegoHtml
    vendor/jszip.min.js
  contenido/
    juridico.json            textos y fuentes
    paleta.json
  biblioteca/
    catalogo.json
    CREDITOS.md
    fondos/ retratos/ musica/ efectos/
  fuentes/                   tipografías con licencia OFL
tests/
  semaforo.test.js           lee tests/semaforo.casos.json
  semaforo.casos.json        tabla de casos legible
  modelo.test.js
  exportar.test.js
  e2e/                       Playwright: recorrido completo
```

### 15.3 Módulos e interfaces

Cada módulo tiene una sola responsabilidad y una interfaz pequeña, para que se pueda entender y probar sin leer los demás:

- `juridico/semaforo.js`: `evaluar(ficha, contexto) → { color, razones[], acciones[] }` y `evaluarTodo(proyecto) → Map<id, resultado>`. Sin acceso al DOM ni al almacén.
- `estado/modelo.js`: `crearProyecto(datosIniciales)` y los mutadores de escenas, personajes, elementos y líneas (mutan el proyecto y devuelven lo creado), más `indiceCorte(escena)`.
- `estado/validacion.js` (lectura pura): `escenasAlcanzables(juego) → Set`, `validar(juego) → avisos[]` (con nivel bloqueante o informativo), `cumpleMinimo(proyecto) → { ok, faltantes[] }`, `puedePublicar(proyecto) → { ok, motivos[], resumen }` (calcula semáforos, mínimo y avisos por sí misma).
- `estado/almacen.js`: `cargar()`, `guardar(proyecto)`, `guardarArchivo(id, blob)`, `leerArchivo(id)`, `borrarArchivo(id)`.
- `estado/copias.js`: `exportarCopia(proyecto, archivos) → Blob`, `importarCopia(archivo) → { proyecto, archivos }` o error descriptivo.
- `motor/reproductor.js`: `jugar(contenedor, juego, resolverRecurso, opciones)`; `resolverRecurso(id) → URL`. En el editor devuelve URLs de objetos; en el exportado, datos incrustados.
- `herramientas/*.js`: cada una exporta `abrir(opciones) → Promise<Blob | null>`; `null` si el estudiante cancela.
- `biblioteca/catalogo.js`: `cargar() → entradas[]`, `obtenerArchivo(id) → Blob`.
- `juridico/cadena.js`: `construir(proyecto, semaforos) → árbol`, `creditos(proyecto) → lista`.
- `exportar/paquete.js`: `generarEntrega(proyecto, archivos, semaforos) → Blob`, `generarJuegoHtml(proyecto, archivos) → string`.
- `juridico/informe.js`: `generar(proyecto, semaforos, cadena) → string`.

El editor y `app.js` son los únicos que tocan el DOM de la plataforma.

### 15.4 Identidad visual

Hereda la del portal del creador (La Casa · Programa PI): tipografía, colores y componentes, copiando sus tokens a `plataforma/css/`. El editor usa tema claro porque se usa durante horas. El reproductor usa tema oscuro, como un juego.

### 15.5 Publicación

Este proyecto se convierte en repositorio git y se publica en GitHub Pages. La plataforma queda en `/plataforma/`. El nombre del repositorio y la dirección pública los decide el docente.

### 15.6 Orden de construcción sugerido

Cada paso deja algo que se puede probar solo:

1. Modelo del juego y reglas del semáforo, con sus pruebas sin navegador. Es el corazón y no depende de nada visual.
2. Almacén en IndexedDB y copias, con prueba de ida y vuelta.
3. Motor con un juego de prueba escrito a mano.
4. Editor mínimo: inventario, guion, vista previa, panel de propiedades. Todavía sin fichas.
5. Fichas jurídicas, semáforos en el inventario y mapa de activos, con el contenido jurídico en su archivo.
6. Biblioteca con catálogo y créditos reales.
7. Herramientas: pixel art, grabador, secuenciador.
8. Publicación: decisión de registro, créditos, informe y paquete de entrega.
9. Recorrido completo en navegador y lista manual.

## 16. Navegadores, accesibilidad y privacidad

**Navegadores.** Para editar: Chrome, Edge y Firefox de escritorio en versiones publicadas en los últimos doce meses. Safari de escritorio e iPad: edición completa salvo que el grabador queda limitado al formato que soporten. Celular: solo jugar; el editor muestra un aviso en pantallas angostas.

**Accesibilidad.** Todo el editor y el reproductor se manejan con teclado. Enlace para saltar al contenido, foco visible, contraste AA, nombres accesibles en botones con ícono. Los cambios de semáforo se anuncian a lectores de pantalla.

**Privacidad.** Después de cargar, la plataforma no hace ninguna petición de red. El nombre del estudiante, las grabaciones y todo lo demás viven en su navegador y en los archivos que él mismo descarga. La pantalla de inicio lo dice en una línea.

## 17. Manejo de errores

| Situación | Comportamiento |
|---|---|
| Micrófono sin permiso o inexistente | El grabador explica cómo permitirlo y ofrece subir un archivo en su lugar |
| Archivo muy grande o formato no aceptado | Mensaje con el límite y los formatos; no se pierde nada |
| Espacio del navegador lleno | Aviso y botón para guardar copia antes de seguir |
| Paquete de entrega muy pesado | Lista de elementos por peso; el estudiante decide |
| Copia dañada o de otra versión | Se rechaza con explicación; el proyecto actual no se toca |
| Navegador sin alguna capacidad (IndexedDB, Web Audio) | Pantalla de inicio con el aviso y la lista de navegadores soportados |
| Error inesperado | Mensaje con lo que pasó y un botón para guardar copia; nunca una pantalla en blanco |

## 18. Pruebas

**Sin navegador** (`node --test tests/`, con Node 20 o superior, sin paso de compilación):

- `semaforo.test.js` recorre `semaforo.casos.json`: una tabla de casos con nombre, ficha, contexto y resultado esperado (color y códigos de razones). Un caso por cada regla y por cada forma de resolverla. Es la prueba más importante y el docente puede leer la tabla. Si el memo cambia, cambia la tabla.
- `modelo.test.js`: validación del juego (bloqueante e informativa), mínimo publicable, condiciones de publicación.
- `exportar.test.js`: dado un proyecto de prueba, el paquete contiene las tres piezas, `proyecto.json` se vuelve a importar idéntico, y `juego.html` contiene el motor, el documento y los créditos.

**Con navegador** (Playwright, solo como dependencia de desarrollo): un recorrido de principio a fin, desde el arranque hasta abrir el `juego.html` exportado y jugarlo, pasando por crear con pixel art, subir un archivo, tomar una pieza de biblioteca, llenar fichas, ver el cambio de semáforo al cambiar el destino, y publicar. El grabador se prueba con un micrófono simulado.

**Manual**, con una lista corta: grabar en cada navegador soportado, imprimir el informe a PDF, abrir el juego exportado en un celular.

## 19. Pendientes de verificación jurídica

Lo que la plataforma necesita afirmar y el memo de verificación no cubre. Ninguno de estos textos se publica sin cotejo.

1. **Derechos del intérprete y del productor de fonogramas** (voces, música grabada, efectos): artículos exactos de la Ley 23 de 1982 y de la Decisión 351 que sustentan la ficha de voz y la explicación de las dos capas de la música.
2. **Obra derivada y derecho de transformación** (regla R06): artículos exactos que exigen autorización del autor original.
3. **Título de la obra y marca**: qué protección da la Ley 23 al título y cuándo conviene registrar marca ante la SIC.
4. **Personaje como objeto de protección**: criterio aplicable para la ficha de personaje.
5. **Licencias Creative Commons en Colombia**: su tratamiento como licencia escrita frente al requisito de forma escrita del artículo 181 de la Ley 1955 de 2019 que el memo cita.
6. **IA con aporte humano**: qué grado de aporte reconoce la DNDA según las resoluciones 2023-2025 que el memo cita; la plataforma solo afirma hoy que sin aporte humano no hay registro.
7. **Tarifa vigente de la DNDA** (laguna 8 del memo), para el texto de la decisión de registro.
8. **Fórmula para el sello de la plataforma**: cómo describirlo (indicio de fecha, no prueba en sentido legal) sin sobrevender.

**Decisiones del docente que la revisión técnica dejó abiertas** (no cambian el código hasta que se resuelvan):

9. **Severidad de A10.** Una autorización informal con destino «venta» hoy es amarilla. La revisión observa que el arreglo es el mismo que el de R02 (conseguir un contrato escrito o cambiar el destino), lo que la acercaría a rojo. Decidir con el memo si la autorización informal basta siquiera para «gratis».
10. **Música con licencia sin derivadas (ND).** Las licencias Creative Commons 4.0 tratan como obra adaptada la música sincronizada con imágenes en movimiento. Si incorporar una pista a un juego cuenta como sincronización, R04 debería aplicar a música, efectos y voces con ND aunque no se hayan modificado, o la biblioteca no debería ofrecer audio ND. Mientras se decide, el catálogo del plan 4 evita audio con ND.
11. **Voz y retrato de personas reales.** La ficha no puede expresar «la voz es mía como grabación pero la persona que habla es otra», ni «el retrato es de una persona real». El formulario del plan 3 debe preguntar de quién es la voz y si el retrato representa a alguien real, y el memo debe decir qué tratamiento corresponde (derechos del intérprete, imagen).
12. **Alcance de los contratos a los usos pactados.** Varios textos de la plataforma querrían decir que un contrato o licencia solo autoriza los usos que menciona. El memo resume el art. 181 de la Ley 1955 de 2019 (forma escrita, plazo y territorio por defecto, inscripción para oponibilidad, ineficacia de la cesión de modalidades inexistentes) pero no enuncia ese principio con fuente. Mientras no haya un addendum del memo (texto del art. 183 de la Ley 23 sobre limitación a las modalidades pactadas), la plataforma lo afirma solo respecto del texto de cada licencia, no como regla de derecho colombiano.
13. **Interfaz de los textos pendientes.** El panel de la ficha (plan 3) y el informe (plan 6) deben marcar visiblemente, o no mostrar, los textos cuya `verificacion` sea `pendiente`, para cumplir la sección 12.9.

## 20. Segunda etapa (no incluida)

- Eventos jurídicos después de publicar: reclamos simulados que el estudiante responde con sus fichas como prueba.
- Cuentas, almacenamiento en servidor y vista de docente. El paquete de entrega ya tiene el formato que ese servidor recibiría.
- Proyecto de ejemplo precargado para ver un juego terminado.
- Música con composición y grabación como fichas separadas.
- Derecho comparado.
