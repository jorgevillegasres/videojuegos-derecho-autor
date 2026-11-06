// tests/exportar.test.js
// El paquete de entrega (spec, sección 18): las tres piezas, proyecto.json se vuelve a
// importar idéntico, juego.html contiene el motor, el documento y los créditos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import JSZip from 'jszip';
import { generarEntrega, nombreDeEntrega } from '../plataforma/js/exportar/paquete.js';
import { importarCopia } from '../plataforma/js/estado/copias.js';
import { huellaSha256 } from '../plataforma/js/estado/archivos.js';
import { proyectoPublicable } from './ayudas/proyecto.js';
import { motorDesdeDisco } from './ayudas/motor.js';

const contenido = JSON.parse(readFileSync(new URL('../plataforma/contenido/juridico.json', import.meta.url), 'utf8'));
const motor = motorDesdeDisco();
const FECHA = '2026-11-06T15:30:00.000Z';

test('nombreDeEntrega: entrega-<estudiante>-<juego>.zip sin acentos ni espacios', () => {
  const { p } = proyectoPublicable();
  assert.equal(nombreDeEntrega(p), 'entrega-camila-r-la-llave-del-faro.zip');
  p.estudiante = 'José Ñáñez';
  p.juego.titulo = '';
  assert.equal(nombreDeEntrega(p), 'entrega-jose-nanez-sin-nombre.zip');
});

test('generarEntrega arma el zip con juego.html, informe-juridico.html, proyecto.json y archivos/, y devuelve la huella de proyecto.json', async () => {
  const { p, archivos } = proyectoPublicable();
  p.publicado = FECHA;
  const { blob, huella, nombre } = await generarEntrega(p, archivos, { JSZip, contenido, motor });
  assert.equal(blob.type, 'application/zip');
  assert.equal(nombre, 'entrega-camila-r-la-llave-del-faro.zip');
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const nombres = Object.keys(zip.files).filter((n) => !zip.files[n].dir).sort();
  assert.deepEqual(nombres, ['archivos/ana.png', 'archivos/farero.png', 'archivos/muelle.png', 'archivos/olas.wav', 'archivos/tema.ogg', 'informe-juridico.html', 'juego.html', 'proyecto.json']);
  const texto = await zip.file('proyecto.json').async('string');
  assert.match(huella, /^sha256:[0-9a-f]{64}$/);
  assert.equal(huella, await huellaSha256(new TextEncoder().encode(texto)), 'la huella es la del texto exacto que va en el zip');
  assert.equal(JSON.parse(texto).publicado, FECHA);
  const informe = await zip.file('informe-juridico.html').async('string');
  assert.ok(informe.includes(huella) && informe.includes(FECHA) && informe.includes('Camila R.') && informe.includes(contenido.nombre));
  const juego = await zip.file('juego.html').async('string');
  assert.ok(juego.includes('function jugar(') && juego.includes('Camila R.: autor(a) del juego'));
  assert.ok(juego.includes(JSON.stringify(p.juego.escenaInicial)));
});

test('el proyecto.json del paquete se vuelve a importar idéntico con sus archivos, como una copia', async () => {
  const { p, archivos, ana } = proyectoPublicable();
  p.publicado = FECHA;
  p.registro = [{ id: ana.id, registraria: 'si', aNombreDe: 'Camila R.', prueba: 'El sello', porque: '' }];
  const { blob } = await generarEntrega(p, archivos, { JSZip, contenido, motor });
  const importado = await importarCopia(blob, { JSZip });
  assert.deepEqual(importado.proyecto, p);
  assert.equal(importado.archivos.size, archivos.size);
  for (const [id, archivo] of archivos) {
    assert.equal(new TextDecoder().decode(importado.archivos.get(id).datos), new TextDecoder().decode(archivo.datos));
  }
});

test('sin fecha de publicación usa «ahora»; no muta el proyecto; falla con la forma equivocada o un archivo faltante', async () => {
  const { p, archivos, olas } = proyectoPublicable();
  const antes = JSON.stringify(p);
  const ahora = new Date('2026-11-07T08:00:00.000Z');
  const { blob } = await generarEntrega(p, archivos, { JSZip, contenido, motor, ahora });
  assert.equal(JSON.stringify(p), antes, 'el proyecto no cambia');
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  assert.ok((await zip.file('informe-juridico.html').async('string')).includes('2026-11-07T08:00:00.000Z'));
  archivos.delete(olas.id);
  await assert.rejects(generarEntrega(p, archivos, { JSZip, contenido, motor }), /«Olas»/);
  await assert.rejects(generarEntrega({ version: 2 }, archivos, { JSZip, contenido, motor }), (error) => error.codigo === 'forma' && /versión 2/.test(error.message));
});
