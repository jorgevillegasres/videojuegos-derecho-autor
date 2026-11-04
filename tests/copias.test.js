// tests/copias.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { exportarCopia, importarCopia, validarEstructura } from '../plataforma/js/estado/copias.js';
import { crearProyecto, agregarElemento } from '../plataforma/js/estado/modelo.js';

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
