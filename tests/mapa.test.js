// tests/mapa.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { proyectoPublicable } from './ayudas/proyecto.js';
import { crearProyecto, agregarElemento } from '../plataforma/js/estado/modelo.js';
import { crearFicha } from '../plataforma/js/juridico/ficha.js';
import { evaluar } from '../plataforma/js/juridico/semaforo.js';
import { describir } from '../plataforma/js/juridico/textos.js';
import { filas, creadorDe, contratoDe, accionesDe, TIPOS_ACTIVO } from '../plataforma/js/juridico/mapa.js';

const contenido = JSON.parse(readFileSync(new URL('../plataforma/contenido/juridico.json', import.meta.url), 'utf8'));

test('filas: una por ficha, en el orden del inventario, con creador, contrato, prueba, color y acciones', () => {
  const { p, tema, ana } = proyectoPublicable();
  const lista = filas(p, contenido);
  assert.deepEqual(lista.map((f) => f.tipo), ['Título', 'Historia', 'Personaje', 'Personaje', 'Retrato', 'Retrato', 'Fondo', 'Música', 'Efecto']);
  assert.deepEqual(lista[0], { id: 'titulo', activo: 'El faro de Camila', tipo: 'Título', creador: '—', contrato: '—', prueba: '—', color: 'verde', acciones: [], porVerificar: true });
  assert.deepEqual(lista[1], { id: 'historia', activo: 'Historia', tipo: 'Historia', creador: 'Yo', contrato: 'No hace falta', prueba: 'Ninguna', color: 'verde', acciones: [], porVerificar: false });
  const filaAna = lista.find((f) => f.id === ana.id);
  assert.equal(filaAna.activo, 'Lucía');
  const filaTema = lista.find((f) => f.id === tema.id);
  assert.deepEqual(filaTema, { id: tema.id, activo: 'Tema', tipo: 'Música', creador: 'Autora Ejemplo', contrato: 'Creative Commons Atribución y no comercial 4.0', prueba: 'Ninguna', color: 'verde', acciones: [], porVerificar: false });
  const filaFondo = lista.find((f) => f.tipo === 'Fondo');
  assert.equal(filaFondo.prueba, 'Sello de la plataforma');
  assert.equal(filaFondo.porVerificar, true, 'la nota del sello está pendiente de verificación');
  assert.equal(TIPOS_ACTIVO.voz, 'Voz');
});

test('cambiar el destino a venta pone la pieza no comercial en rojo con su acción', () => {
  const { p, tema } = proyectoPublicable();
  p.juego.destino = 'venta';
  const filaTema = filas(p, contenido).find((f) => f.id === tema.id);
  assert.equal(filaTema.color, 'rojo');
  assert.deepEqual(filaTema.acciones, [contenido.reglas.R03.accion]);
});

test('creadorDe, contratoDe y accionesDe cubren IA, otra licencia, licencia sin elegir y la fusión de A01 con A02', () => {
  const base = crearFicha('retrato', { origen: 'subido' });
  assert.equal(creadorDe({ ...base, autoria: 'ia', herramientaIA: 'Gen' }), 'IA (Gen)');
  assert.equal(creadorDe({ ...base, autoria: 'ia_con_aporte', herramientaIA: '' }), 'IA (herramienta sin indicar) con mi aporte');
  assert.equal(creadorDe({ ...base, autoria: 'otra_persona', autorNombre: ' ' }), 'Otra persona (sin nombre)');
  assert.equal(creadorDe(crearFicha('titulo')), '—');
  assert.equal(contratoDe({ ...base, autoria: 'otra_persona', titular: 'otra_persona' }), 'Nada escrito');
  assert.equal(contratoDe({ ...base, respaldo: 'cesion' }), 'Cesión por escrito');
  assert.equal(contratoDe({ ...base, respaldo: 'autorizacion' }), 'Autorización informal');
  assert.equal(contratoDe({ ...base, respaldo: 'licencia' }), 'Licencia sin elegir');
  assert.equal(contratoDe({ ...base, respaldo: 'licencia', licencia: 'OTRA', licenciaTexto: 'Permiso del colectivo' }), 'Otra licencia: Permiso del colectivo');
  assert.equal(contratoDe({ ...base, respaldo: 'licencia', licencia: 'OTRA' }), 'Otra licencia');
  assert.equal(contratoDe({ ...base, respaldo: 'licencia', licencia: 'CC0' }), 'Creative Commons Zero (CC0 1.0)');
  const dosRazones = { ...base, autoria: 'otra_persona', autorNombre: 'Luis', titular: 'otra_persona', respaldo: 'licencia', licencia: 'CC-BY-4.0', licenciaLeida: true };
  const descrito = describir(evaluar(dosRazones, { destino: 'gratis' }), dosRazones, contenido);
  assert.deepEqual(descrito.razones.map((r) => r.codigo), ['A01', 'A02']);
  assert.deepEqual(accionesDe(descrito), [contenido.reglas.A01.accion], 'A02 se funde con A01');
  const repetidas = describir({ color: 'rojo', razones: ['R02', 'A10'], notas: [] }, dosRazones, contenido);
  assert.deepEqual(accionesDe(repetidas), ['Pide a Luis una cesión o una licencia por escrito.'], 'la misma acción no se repite');
});

test('las filas de muestra llevan muestra: true, sin color y con la acción de reemplazar', () => {
  const p = crearProyecto({ estudiante: 'Camila R.', titulo: 'El faro de Camila' });
  const muestra = agregarElemento(p, { tipo: 'retrato', nombre: 'Retrato de Ana (muestra)', archivo: 'm.png', origen: 'muestra' });
  const fila = filas(p, contenido).find((f) => f.id === muestra.id);
  assert.deepEqual(fila, { id: muestra.id, activo: 'Retrato de Ana (muestra)', tipo: 'Retrato', creador: 'Muestra del ejemplo', contrato: '—', prueba: '—', color: null, acciones: ['Reemplázalo por uno tuyo.'], porVerificar: false, muestra: true });
  assert.equal(filas(p, contenido).filter((f) => f.muestra).length, 1);
});
