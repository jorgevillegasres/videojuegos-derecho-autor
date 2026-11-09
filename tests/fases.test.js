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
