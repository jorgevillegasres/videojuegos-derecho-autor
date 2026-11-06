// tests/vista-previa.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instalarDom, textos } from './ayudas/dom.js';
import { sesionDePrueba } from './ayudas/sesion.js';
import { agregarEscena, agregarPersonaje, agregarElemento, agregarLinea } from '../plataforma/js/estado/modelo.js';
import { crearVistaPrevia } from '../plataforma/js/editor/vista-previa.js';

instalarDom();

async function armar() {
  const { sesion } = sesionDePrueba();
  const p = sesion.proyecto;
  const muelle = p.juego.escenas[0];
  const vacia = agregarEscena(p, 'Vacía');
  const ana = agregarPersonaje(p, { nombre: 'Ana' });
  const fondo = agregarElemento(p, { tipo: 'fondo', nombre: 'Muelle', archivo: 'm.png', origen: 'creado' });
  const retrato = agregarElemento(p, { tipo: 'retrato', nombre: 'Ana', archivo: 'a.png', origen: 'subido' });
  const bytes = new TextEncoder().encode('png').buffer;
  await sesion.agregarArchivo(fondo.id, { tipo: 'image/png', datos: bytes });
  await sesion.agregarArchivo(retrato.id, { tipo: 'image/webp', datos: bytes });
  ana.retrato = retrato.id;
  muelle.fondo = fondo.id;
  agregarLinea(muelle, 'narracion', { texto: 'Niebla.' });
  agregarLinea(muelle, 'dialogo', { personaje: ana.id, texto: '¿Quién?' });
  agregarLinea(muelle, 'decision', { texto: '¿Subes?', opciones: [{ texto: 'Sí', escena: vacia.id }, { texto: 'No', escena: null }] });
  const contenedor = document.createElement('div');
  const vista = crearVistaPrevia(contenedor, sesion);
  return { sesion, muelle, vacia, contenedor, vista };
}

test('dibuja la línea seleccionada con el fondo y el retrato que resuelve la sesión', async () => {
  const { contenedor, vista, muelle } = await armar();
  vista.dibujar(muelle, 1);
  assert.equal(contenedor.querySelector('.escenario-texto').textContent, '¿Quién?');
  assert.equal(contenedor.querySelector('.escenario-nombre').textContent, 'Ana');
  assert.equal(contenedor.querySelector('.escenario-fondo img').getAttribute('src'), 'blob:image/png');
  assert.ok(contenedor.querySelector('.escenario-fondo img').classList.contains('pixel'));
  assert.equal(contenedor.querySelector('.escenario-retrato img').getAttribute('src'), 'blob:image/webp');
  vista.dibujar(muelle, 2);
  assert.deepEqual(textos(contenedor, '.escenario-opciones button'), ['1 Sí', '2 No']);
});

test('sin índice muestra la primera línea; una escena vacía lo dice; sin escena hay un texto de ayuda', async () => {
  const { contenedor, vista, muelle, vacia } = await armar();
  vista.dibujar(muelle, null);
  assert.equal(contenedor.querySelector('.escenario-texto').textContent, 'Niebla.');
  vista.dibujar(vacia, 0);
  assert.equal(contenedor.querySelector('.escenario-texto').textContent, 'Esta escena no tiene líneas todavía.');
  vista.dibujar(null, null);
  assert.equal(contenedor.querySelector('.escenario'), null);
  assert.equal(contenedor.querySelector('.vacio').textContent, 'Selecciona una escena para ver cómo se verá.');
});
