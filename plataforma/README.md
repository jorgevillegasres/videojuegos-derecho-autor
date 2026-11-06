# Plataforma de práctica: primer videojuego y derecho de autor

Aplicación web estática. Los estudiantes arman una aventura narrativa y, por cada
elemento que incorporan, resuelven una ficha jurídica con semáforo. Diseño completo
en `docs/superpowers/specs/2026-11-04-plataforma-primer-videojuego-design.md`.

## Estado

Planes 1 (núcleo), 2 (motor y editor), 3 (fichas en pantalla) y 4 (biblioteca) terminados.
La biblioteca trae un **catálogo provisional** de 34 piezas generadas por programa
(`scripts/generar-biblioteca-provisional.js`): no tienen autor humano, se publican bajo CC0 y el
catálogo las presenta con las licencias del ejercicio, diciéndolo en cada entrada (`simulado`) y en
`biblioteca/CREDITOS.md`. Reemplazarlas por piezas reales es una tarea de contenido (ver abajo).
El plan 5 agrega las tres herramientas de creación: pixel art con la paleta fija, grabador
con el micrófono y secuenciador de dos compases; lo que producen entra con sello de fecha y
huella. Falta la publicación (plan 6).

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
- `js/juridico/`: fichas, licencias, semáforo, textos, reglas del formulario (`formulario.js`), cadena de titularidad y créditos (`cadena.js`) y filas del mapa de activos (`mapa.js`).
- `js/motor/`: `partida.js` (estado puro), `pantalla.js` (dibujo) y `reproductor.js` (entrada y audio).
- `js/editor/`: `sesion.js` (estado del editor) y una vista por columna; `editor.js` las coordina.
- `js/herramientas/`: `pixel.js`, `secuencia.js` y `audio-util.js` son puros (se prueban en Node); `pixelart.js`, `secuenciador.js` y `grabador.js` son las vistas, con canvas, Web Audio y micrófono inyectables.
- `js/ui/`: utilidades de DOM y comprobación de capacidades.
- `js/app.js`: arranque.

Las vistas se prueban con jsdom; lo que jsdom no cubre (arrastrar, audio, micrófono) se
comprueba a mano y, desde el plan 6, con Playwright.

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
`js/vendor/LICENSE-jszip.md`). Es la única dependencia en tiempo de ejecución.
