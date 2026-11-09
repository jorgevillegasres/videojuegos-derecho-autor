# Plataforma de práctica: primer videojuego y derecho de autor

Aplicación web estática. Los estudiantes reciben una aventura narrativa terminada, «La llave del
faro», y la hacen suya pieza por pieza; por cada elemento que reemplazan o conservan resuelven una
ficha jurídica con semáforo. Diseño completo en
`docs/superpowers/specs/2026-11-04-plataforma-primer-videojuego-design.md`, y el del modo guiado en
`docs/superpowers/specs/2026-11-06-modo-guiado-design.md` (donde difieren, manda este).

## Estado

Los seis planes de construcción y el modo guiado (plan 7) están terminados. El estudiante recibe un
juego terminado, «La llave del faro», y en nueve fases guiadas por una banda sobre el editor lo hace
suyo pieza por pieza, resolviendo la ficha jurídica de cada una. El recorrido completo (arrancar, jugar
el ejemplo, reemplazar sus piezas, publicar y jugar el `juego.html` exportado) corre en Chromium con
Playwright.

## Dónde está publicada

La plataforma vive en <https://jorgevillegasres.github.io/videojuegos-derecho-autor/plataforma/>.
GitHub Pages la sirve desde la raíz de la rama `main` del repositorio
<https://github.com/jorgevillegasres/videojuegos-derecho-autor>, sin ningún paso de construcción:
cada `git push` a `main` publica en uno o dos minutos. La raíz del sitio es una portada con enlaces
a la plataforma y al portal del curso; el archivo `.nojekyll` evita que Pages procese los archivos
con Jekyll.

Queda fuera del código:

- **Biblioteca real.** La biblioteca trae un **catálogo provisional** de 34 piezas generadas por
  programa (`scripts/generar-biblioteca-provisional.js`): no tienen autor humano, se publican bajo
  CC0 y el catálogo las presenta con las licencias del ejercicio, diciéndolo en cada entrada
  (`simulado`) y en `biblioteca/CREDITOS.md`. Reemplazarlas por piezas reales es una tarea de
  contenido (ver abajo).
- **Juego de ejemplo.** El modo guiado parte de «La llave del faro», que se arma por código al pulsar
  «Empezar» (`js/guia/ejemplo.js`). Usa tres piezas del catálogo (`bib_f01`, `bib_m05`, `bib_e02`,
  fijadas en `js/guia/muestra.js`; si la biblioteca cambia, deben seguir existiendo o cambiarse allí) y
  dos retratos de muestra en `ejemplo/`, dibujados por programa (`scripts/generar-ejemplo.js`), sin autor
  humano y publicados bajo CC0.
- **Verificación jurídica pendiente** (spec, sección 19): los textos marcados `pendiente` en
  `contenido/juridico.json` salen con la marca «Por verificar» en la ficha, en el mapa y en el
  informe, y se listan al final del informe.
- **Lista manual**: grabar con micrófono real en cada navegador soportado, guardar el informe como
  PDF desde el navegador y abrir `juego.html` en un celular.

## Qué entrega el estudiante

«Publicar» se habilita con todas las fichas en verde, el mínimo cumplido y sin avisos bloqueantes.
Pide primero la **decisión de registro** (hasta tres activos: si lo registraría ante la DNDA, a
nombre de quién y con qué prueba) y luego descarga `entrega-<estudiante>-<juego>.zip` con:

- `juego.html`: el juego completo en un solo archivo, con el motor, el documento, los recursos en
  base64 y la pantalla de créditos. Se abre sin internet.
- `informe-juridico.html`: portada (estudiante, juego, destino, fecha, huella SHA-256 de
  `proyecto.json`), mapa de activos, cadena de titularidad, decisión de registro, todas las
  fichas con sus razones y notas, explicaciones y textos pendientes. Se imprime a PDF.
- `proyecto.json` y `archivos/`: el proyecto en bruto, el mismo formato de «Guardar copia»;
  «Abrir copia» acepta el paquete.

Si el paquete estimado pasa de 50 MB, el segundo paso muestra los elementos que más pesan y deja
seguir.

## Pruebas

```bash
npm install
npm test
```

Las reglas del semáforo se prueban con la tabla `tests/semaforo.casos.json`, que se
puede leer sin saber programar: cada caso dice qué ficha entra y qué color y razones
salen.

El recorrido completo en un navegador real (spec, sección 18) corre aparte, con Playwright:

```bash
npx playwright install chromium
npm run test:e2e
```

Levanta el servidor local en el puerto 8089, usa un micrófono falso para el grabador y termina
abriendo el `juego.html` y el `informe-juridico.html` del paquete descargado.

`tests/e2e/inventario.spec.js` mide lo que jsdom no puede: que los botones del inventario quepan en su
columna sin desplazamiento escondido y que la lista «Falta para publicar» no reciba los clics del panel
derecho. Playwright desplaza a la vista lo que pulsa, así que el recorrido solo no lo detecta.

## Contenido jurídico

Todos los textos que ve el estudiante están en `contenido/juridico.json`. Las entradas
con `"verificacion": "pendiente"` corresponden a la sección 19 del diseño y no deben
publicarse sin cotejo. `npm test` imprime la lista. Dos pruebas vigilan que las fuentes
digan «por verificar» solo en las entradas pendientes y que ningún texto haga las
afirmaciones que el memo de verificación prohíbe.

## Probar en local

```bash
node tests/manual/servir.js
```

Abre `http://localhost:8080/plataforma/` (el editor) o
`http://localhost:8080/tests/manual/motor.html` (el reproductor con un juego escrito a mano).
La plataforma usa IndexedDB y Web Crypto; Web Crypto exige un contexto seguro (HTTPS o
`localhost`) y los módulos ES no cargan desde `file://`, por eso hace falta el servidor.
El `juego.html` exportado sí se abre desde `file://`: no usa módulos ni red.

## Cómo está armado el código

- `js/estado/`: el documento del juego y su validación, la regla de corte (`corte.js`), el almacén y las copias.
- `js/juridico/`: fichas, licencias, semáforo, textos, reglas del formulario (`formulario.js`), cadena de titularidad y créditos (`cadena.js`), filas del mapa de activos (`mapa.js`) y el informe (`informe.js`).
- `js/motor/`: `partida.js` (estado puro), `pantalla.js` (dibujo) y `reproductor.js` (entrada y audio). Es el mismo código que se incrusta en `juego.html`.
- `js/exportar/`: `empaquetar.js` (base64, escapes, los módulos del motor convertidos en un solo script, `cargarMotor`) y `paquete.js` (`generarJuegoHtml`, `pesos`, `generarEntrega`).
- `js/editor/`: `sesion.js` (estado del editor) y una vista por columna o capa (`publicar.js` es la de publicación); `editor.js` las coordina.
- `js/herramientas/`: `pixel.js`, `secuencia.js` y `audio-util.js` son puros (se prueban en Node); `pixelart.js`, `secuenciador.js` y `grabador.js` son las vistas, con canvas, Web Audio y micrófono inyectables.
- `js/ui/`: utilidades de DOM y comprobación de capacidades.
- `js/app.js`: arranque.

Las vistas se prueban con jsdom; lo que jsdom no cubre (arrastrar, audio, micrófono, la descarga
real) lo cubre el recorrido de Playwright en `tests/e2e/`. El motor que va dentro de `juego.html`
se lee de la propia plataforma con la lista `RUTAS_MOTOR` de `js/exportar/empaquetar.js`: los
módulos del motor deben tener imports de una línea y no importar nada jurídico, y una prueba lo
vigila.

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

## Dependencias

`js/vendor/jszip.min.js` es la copia de JSZip 3.10.2 (licencia en
`js/vendor/LICENSE-jszip.md`). Es la única dependencia en tiempo de ejecución. Para desarrollo:
`jszip` y `fake-indexeddb` y `jsdom` (pruebas en Node) y `@playwright/test` (el recorrido).
