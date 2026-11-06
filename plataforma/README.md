# Plataforma de práctica: primer videojuego y derecho de autor

Aplicación web estática. Los estudiantes arman una aventura narrativa y, por cada
elemento que incorporan, resuelven una ficha jurídica con semáforo. Diseño completo
en `docs/superpowers/specs/2026-11-04-plataforma-primer-videojuego-design.md`.

## Estado

Planes 1 (núcleo), 2 (motor y editor) y 3 (fichas en pantalla) terminados: cada elemento,
personaje, el título y la historia tienen su ficha jurídica con semáforo en el panel
derecho; el inventario muestra los colores; el mapa de activos se abre desde la barra; los
créditos del reproductor salen de las fichas. Faltan la biblioteca (plan 4), las
herramientas de creación (plan 5) y la publicación (plan 6).

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
- `js/ui/`: utilidades de DOM y comprobación de capacidades.
- `js/app.js`: arranque.

Las vistas se prueban con jsdom; lo que jsdom no cubre (arrastrar, audio, micrófono) se
comprueba a mano y, desde el plan 6, con Playwright.

## Dependencias

`js/vendor/jszip.min.js` es la copia de JSZip 3.10.2 (licencia en
`js/vendor/LICENSE-jszip.md`). Es la única dependencia en tiempo de ejecución.
