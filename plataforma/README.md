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
