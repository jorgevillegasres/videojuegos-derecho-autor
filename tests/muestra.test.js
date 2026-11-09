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
