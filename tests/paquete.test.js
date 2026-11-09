// tests/paquete.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM, VirtualConsole } from 'jsdom';
import { generarJuegoHtml, pesos, FACTOR_PAQUETE } from '../plataforma/js/exportar/paquete.js';
import { creditos } from '../plataforma/js/juridico/cadena.js';
import { proyectoPublicable } from './ayudas/proyecto.js';
import { motorDesdeDisco } from './ayudas/motor.js';

const motor = motorDesdeDisco();

/** Abre el HTML generado en jsdom con los scripts corriendo; el audio de jsdom no está implementado y se silencia. */
function abrirJuego(html) {
  const virtualConsole = new VirtualConsole();
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole });
  const { document } = dom.window;
  const q = (selector) => document.querySelector(selector);
  const clic = (nodo) => nodo.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  return { dom, document, q, clic };
}

test('generarJuegoHtml incrusta el motor, los estilos, el documento, los recursos en base64 y los créditos', () => {
  const { p, archivos, muelle } = proyectoPublicable();
  const html = generarJuegoHtml(p, archivos, motor);
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(html.includes('<title>El faro de Camila</title>'));
  assert.ok(html.includes('function jugar('), 'el reproductor está dentro');
  assert.ok(html.includes('.escenario-caja'), 'los estilos del reproductor están dentro');
  assert.ok(!/^\s*(import|export)\b/m.test(html), 'sin import ni export: es un script clásico');
  for (const archivo of archivos.values()) {
    assert.ok(html.includes(`data:${archivo.tipo};base64,`), 'cada archivo va como data: URL');
  }
  assert.ok(html.includes(JSON.stringify(muelle.fondo)), 'el documento del juego va dentro');
  for (const linea of creditos(p)) assert.ok(html.includes(JSON.stringify(linea)), `crédito presente: ${linea}`);
  assert.ok(!html.includes('"fichas"'), 'las fichas no viajan en el juego');
});

test('generarJuegoHtml escapa el título en la página y lo que cerraría el script', () => {
  const { p, archivos } = proyectoPublicable();
  p.juego.titulo = '</script><b>Faro</b>';
  p.juego.escenas[0].lineas[0].texto = 'Cuidado: </script> <!-- ahí';
  const html = generarJuegoHtml(p, archivos, motor);
  assert.ok(html.includes('<title>&lt;/script&gt;&lt;b&gt;Faro&lt;/b&gt;</title>'));
  const cuerpo = html.slice(html.indexOf('<script>') + 8);
  assert.equal(cuerpo.indexOf('</script>'), cuerpo.lastIndexOf('</script>'), 'solo cierra el script una vez');
  assert.ok(!cuerpo.includes('<!--'));
  const { q } = abrirJuego(html);
  assert.equal(q('.escenario-texto').textContent, 'Cuidado: </script> <!-- ahí', 'el texto llega intacto al jugador');
});

test('generarJuegoHtml falla si falta el archivo de un elemento', () => {
  const { p, archivos, olas } = proyectoPublicable();
  archivos.delete(olas.id);
  assert.throws(() => generarJuegoHtml(p, archivos, motor), (error) => error.codigo === 'archivo_faltante' && /«Olas»/.test(error.message));
});

test('el juego.html generado se juega solo en jsdom: avanza, decide y termina en los créditos con las líneas de las fichas', () => {
  const { p, archivos } = proyectoPublicable();
  const html = generarJuegoHtml(p, archivos, motor);
  const { document, q, clic } = abrirJuego(html);
  assert.equal(document.title, 'El faro de Camila');
  assert.equal(q('.reproductor-titulo').textContent, 'El faro de Camila');
  assert.equal(q('.escenario-nombre').textContent, 'Lucía');
  assert.equal(q('.escenario-texto').textContent, '¿Quién abrió la reja?');
  assert.ok(q('.escenario-fondo img').getAttribute('src').startsWith('data:application/octet-stream;base64,'));
  assert.ok(q('.escenario-retrato img').classList.contains('pixel'), 'el retrato creado se escala sin suavizado');
  assert.equal(q('button[data-accion="cerrar"]'), null, 'el juego exportado no tiene Cerrar');
  clic(q('.reproductor-escena'));
  assert.equal(q('.escenario-texto').textContent, '¿Subes a la torre?');
  clic(q('.opcion[data-opcion="0"]'));
  assert.equal(q('.escenario-texto').textContent, 'Fin');
  clic(q('.reproductor-escena'));
  const lineas = [...document.querySelectorAll('.escenario-creditos li')].map((n) => n.textContent);
  assert.deepEqual(lineas, creditos(p));
  assert.ok(lineas[0].startsWith('Camila R.'));
});

test('pesos ordena los elementos de mayor a menor y estima el paquete', () => {
  const { p, archivos, olas, tema } = proyectoPublicable();
  archivos.set(olas.id, { tipo: 'audio/wav', datos: new ArrayBuffer(5000) });
  archivos.set(tema.id, { tipo: 'audio/ogg', datos: new ArrayBuffer(9000) });
  const resultado = pesos(p, archivos);
  assert.equal(resultado.elementos[0].id, tema.id);
  assert.equal(resultado.elementos[0].bytes, 9000);
  assert.equal(resultado.elementos[0].tipo, 'musica');
  assert.equal(resultado.elementos[1].id, olas.id);
  assert.equal(resultado.elementos.length, p.juego.elementos.length);
  const suma = [...archivos.values()].reduce((s, a) => s + a.datos.byteLength, 0);
  assert.equal(resultado.total, suma);
  assert.equal(resultado.estimado, suma * FACTOR_PAQUETE);
  archivos.delete(olas.id);
  assert.equal(pesos(p, archivos).elementos.find((e) => e.id === olas.id).bytes, 0, 'sin archivo pesa cero');
});
