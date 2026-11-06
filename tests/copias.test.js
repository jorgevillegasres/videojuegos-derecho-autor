// tests/copias.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { exportarCopia, importarCopia, validarEstructura } from '../plataforma/js/estado/copias.js';
import { crearProyecto, agregarElemento, agregarPersonaje } from '../plataforma/js/estado/modelo.js';
import { crearFicha } from '../plataforma/js/juridico/ficha.js';

function proyectoConArchivos() {
  const proyecto = crearProyecto({ estudiante: 'Camila', titulo: 'Faro' });
  const fondo = agregarElemento(proyecto, { tipo: 'fondo', nombre: 'Muelle', archivo: 'el_1.png', origen: 'creado' });
  const tema = agregarElemento(proyecto, { tipo: 'musica', nombre: 'Tema', archivo: 'el_2.wav', origen: 'subido' });
  const archivos = new Map([
    [fondo.id, { tipo: 'image/png', datos: new TextEncoder().encode('PNG').buffer }],
    [tema.id, { tipo: 'audio/wav', datos: new TextEncoder().encode('WAV').buffer }],
  ]);
  return { proyecto, archivos, fondo, tema };
}

test('exportar e importar devuelven el mismo proyecto y los mismos archivos', async () => {
  const { proyecto, archivos, fondo, tema } = proyectoConArchivos();
  const blob = await exportarCopia(proyecto, archivos, { JSZip });
  assert.equal(blob.type, 'application/zip');
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  assert.deepEqual(Object.keys(zip.files).filter((n) => !zip.files[n].dir).sort(), ['archivos/el_1.png', 'archivos/el_2.wav', 'proyecto.json']);

  const importado = await importarCopia(await blob.arrayBuffer(), { JSZip });
  assert.deepEqual(importado.proyecto, proyecto);
  assert.equal(importado.archivos.get(fondo.id).tipo, 'image/png');
  assert.equal(new TextDecoder().decode(importado.archivos.get(fondo.id).datos), 'PNG');
  assert.equal(importado.archivos.get(tema.id).tipo, 'audio/wav');
});

test('importarCopia acepta un Blob', async () => {
  const { proyecto, archivos } = proyectoConArchivos();
  const blob = await exportarCopia(proyecto, archivos, { JSZip });
  const importado = await importarCopia(blob, { JSZip });
  assert.equal(importado.proyecto.juego.titulo, 'Faro');
});

test('exportar falla si falta el archivo de un elemento', async () => {
  const { proyecto, archivos, tema } = proyectoConArchivos();
  archivos.delete(tema.id);
  await assert.rejects(exportarCopia(proyecto, archivos, { JSZip }), /Falta el archivo del elemento «Tema»/);
});

test('importar rechaza lo que no es un zip', async () => {
  await assert.rejects(importarCopia(new TextEncoder().encode('no soy un zip').buffer, { JSZip }), /no es una copia válida/);
});

test('importar rechaza un zip sin proyecto.json o con JSON dañado', async () => {
  const sinProyecto = await new JSZip().file('otra.txt', 'x').generateAsync({ type: 'uint8array' });
  await assert.rejects(importarCopia(sinProyecto, { JSZip }), /no contiene proyecto.json/);
  const roto = await new JSZip().file('proyecto.json', '{ esto no es json').generateAsync({ type: 'uint8array' });
  await assert.rejects(importarCopia(roto, { JSZip }), /está dañado/);
});

test('importar rechaza un proyecto con la forma equivocada o con archivos faltantes', async () => {
  const otraVersion = await new JSZip().file('proyecto.json', JSON.stringify({ version: 2 })).generateAsync({ type: 'uint8array' });
  await assert.rejects(importarCopia(otraVersion, { JSZip }), /versión 2 no soportada/);

  const { proyecto } = proyectoConArchivos();
  const sinArchivos = await new JSZip().file('proyecto.json', JSON.stringify(proyecto)).generateAsync({ type: 'uint8array' });
  await assert.rejects(importarCopia(sinArchivos, { JSZip }), /Falta el archivo del elemento «Muelle»/);
});

test('validarEstructura enumera los problemas', () => {
  assert.deepEqual(validarEstructura(null), ['no es un objeto']);
  const p = crearProyecto({ titulo: 'x' });
  assert.deepEqual(validarEstructura(p), []);
  const el = agregarElemento(p, { tipo: 'fondo', nombre: 'Muelle', archivo: 'a.png', origen: 'creado' });
  delete p.fichas[el.id];
  assert.deepEqual(validarEstructura(p), ['el elemento «Muelle» no tiene ficha']);
});

test('un paquete de entrega con archivos extra se importa igual', async () => {
  const { proyecto, archivos } = proyectoConArchivos();
  const blob = await exportarCopia(proyecto, archivos, { JSZip });
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  zip.file('juego.html', '<!doctype html>');
  zip.file('informe-juridico.html', '<!doctype html>');
  const paquete = await zip.generateAsync({ type: 'uint8array' });
  const importado = await importarCopia(paquete, { JSZip });
  assert.deepEqual(importado.proyecto, proyecto);
});

test('los errores llevan código estable', async () => {
  const codigo = async (promesa) => promesa.then(() => null, (e) => e.codigo);
  assert.equal(await codigo(importarCopia(new TextEncoder().encode('x').buffer, { JSZip })), 'no_es_zip');
  assert.equal(await codigo(importarCopia(await new JSZip().file('a.txt', 'x').generateAsync({ type: 'uint8array' }), { JSZip })), 'sin_proyecto');
  assert.equal(await codigo(importarCopia(await new JSZip().file('proyecto.json', '{').generateAsync({ type: 'uint8array' }), { JSZip })), 'json_danado');
  const { proyecto, archivos, fondo } = proyectoConArchivos();
  delete proyecto.fichas[fondo.id];
  const sinFicha = await new JSZip().file('proyecto.json', JSON.stringify(proyecto)).generateAsync({ type: 'uint8array' });
  const error = await importarCopia(sinFicha, { JSZip }).catch((e) => e);
  assert.equal(error.codigo, 'forma');
  assert.deepEqual(error.problemas, ['el elemento «Muelle» no tiene ficha']);
  assert.equal(await codigo(exportarCopia(proyecto, archivos, { JSZip })), 'forma', 'exportar también valida');
  proyecto.fichas[fondo.id] = crearFicha('fondo', { origen: 'creado' });
  archivos.delete(fondo.id);
  assert.equal(await codigo(exportarCopia(proyecto, archivos, { JSZip })), 'archivo_faltante');
});

test('validarEstructura detecta lo que una copia editada a mano puede traer, sin lanzar', () => {
  const base = () => proyectoConArchivos().proyecto;

  let p = base();
  p.juego.elementos[1].id = p.juego.elementos[0].id;
  assert.ok(validarEstructura(p).some((m) => /está repetido/.test(m)), 'id repetido');

  p = base();
  p.juego.elementos[0].archivo = '../x';
  assert.ok(validarEstructura(p).some((m) => /nombre de archivo no permitido/.test(m)), 'ruta relativa');
  p.juego.elementos[0].archivo = '';
  assert.ok(validarEstructura(p).some((m) => /nombre de archivo no permitido/.test(m)), 'nombre vacío');

  p = base();
  p.juego.elementos[1].archivo = p.juego.elementos[0].archivo;
  assert.ok(validarEstructura(p).some((m) => /archivo «el_1.png» está repetido/.test(m)), 'archivo repetido');

  p = base();
  p.juego.destino = 'alquiler';
  assert.ok(validarEstructura(p).some((m) => /destino «alquiler» no es válido/.test(m)), 'destino');

  p = base();
  p.fichas.el_fantasma = { tipo: 'fondo' };
  assert.ok(validarEstructura(p).some((m) => /ficha «el_fantasma» no corresponde/.test(m)), 'ficha huérfana');

  p = base();
  p.juego.elementos.push(null);
  assert.ok(validarEstructura(p).some((m) => /sin identificador/.test(m)), 'entrada nula');

  p = base();
  p.fichas = [];
  assert.ok(validarEstructura(p).includes('faltan las fichas'), 'fichas como lista');

  assert.equal(validarEstructura({ juego: {} })[0], 'no indica su versión');
  assert.deepEqual(validarEstructura(base()), [], 'un proyecto sano no tiene problemas');
});

test('validarEstructura rechaza fichas faltantes, cambiadas o incoherentes y escenas malformadas', () => {
  const base = () => proyectoConArchivos().proyecto;
  const problemasDe = (modificar) => { const p = base(); modificar(p); return validarEstructura(p); };
  const primero = (p) => p.juego.elementos[0].id;
  assert.ok(problemasDe((p) => { delete p.fichas.historia; }).some((m) => /la historia no tiene ficha/.test(m)), 'historia');
  assert.ok(problemasDe((p) => { delete p.fichas.titulo; }).some((m) => /el título no tiene ficha/.test(m)), 'título');
  assert.ok(problemasDe((p) => { const per = agregarPersonaje(p, { nombre: 'Ana' }); delete p.fichas[per.id]; }).some((m) => /el personaje «Ana» no tiene ficha/.test(m)), 'personaje');
  assert.ok(problemasDe((p) => { p.fichas[primero(p)].tipo = 'titulo'; }).some((m) => /es de tipo «titulo»/.test(m)), 'tipo cambiado');
  assert.ok(problemasDe((p) => { p.fichas[primero(p)].tipoObra = 'literaria'; }).some((m) => /tipo de obra que no corresponde/.test(m)), 'tipoObra cambiado');
  assert.ok(problemasDe((p) => { p.fichas[primero(p)].licencia = 'FOO'; }).some((m) => /licencia desconocida/.test(m)), 'licencia');
  assert.ok(problemasDe((p) => { p.fichas[primero(p)].autoria = 'nadie'; }).some((m) => /autoría desconocida/.test(m)), 'autoría');
  assert.ok(problemasDe((p) => { p.fichas[p.juego.elementos[1].id].origen = 'creado'; }).some((m) => /dice origen «creado»/.test(m)), 'origen');
  assert.ok(problemasDe((p) => { p.fichas[primero(p)].licenciaLeida = 'sí'; }).some((m) => /no es sí o no/.test(m)), 'booleano');
  assert.ok(problemasDe((p) => { p.fichas[primero(p)].credito = 5; }).some((m) => /no es texto/.test(m)), 'texto');
  assert.ok(problemasDe((p) => { p.fichas[primero(p)].condicionesOtra = ['XX']; }).some((m) => /condiciones de licencia desconocidas/.test(m)), 'condiciones');
  assert.ok(problemasDe((p) => { delete p.juego.escenas[0].lineas; }).some((m) => /no tiene lista de líneas/.test(m)), 'escena sin líneas');
  assert.ok(problemasDe((p) => { p.juego.escenas[0].lineas.push({ tipo: 'decision', texto: '¿?' }); }).some((m) => /no tiene lista de opciones/.test(m)), 'decisión sin opciones');
  assert.ok(problemasDe((p) => { p.juego.escenas[0].lineas.push({ tipo: 'salto' }); }).some((m) => /no tiene un tipo conocido/.test(m)), 'línea rara');
  assert.ok(problemasDe((p) => { p.fichas[p.juego.escenas[0].id] = crearFicha('fondo', { origen: 'creado' }); }).some((m) => /no corresponde a ningún elemento ni personaje/.test(m)), 'ficha de escena');
  assert.deepEqual(validarEstructura(base()), []);
});
