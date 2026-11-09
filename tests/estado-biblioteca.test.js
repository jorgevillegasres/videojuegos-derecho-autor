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
