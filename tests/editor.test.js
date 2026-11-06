// tests/editor.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { instalarDom, clic, escribir, textos } from './ayudas/dom.js';
import { sesionDePrueba } from './ayudas/sesion.js';
import { proyectoPublicable } from './ayudas/proyecto.js';
import { crearProyecto, agregarEscena, agregarLinea } from '../plataforma/js/estado/modelo.js';
import { exportarCopia } from '../plataforma/js/estado/copias.js';
import { crearEditor, creditosProvisionales } from '../plataforma/js/editor/editor.js';

instalarDom();

function armar({ proyecto, confirmar = () => true, archivoElegido = null } = {}) {
  const { sesion, eventos } = sesionDePrueba(proyecto);
  const llamadas = [];
  const contenedor = document.createElement('div');
  document.body.append(contenedor);
  const editor = crearEditor(contenedor, sesion, {
    contenido: { campos: { destino: { breve: 'Ayuda del destino.' } } },
    JSZip,
    descargarArchivo: (blob, nombre) => llamadas.push(['descargar', nombre, blob.type]),
    confirmar: (mensaje) => { llamadas.push(['confirmar', mensaje]); return confirmar(mensaje); },
    elegirArchivo: async () => archivoElegido,
    alNuevoJuego: async () => llamadas.push(['nuevo-juego']),
  });
  const q = (selector) => contenedor.querySelector(selector);
  const qa = (selector) => [...contenedor.querySelectorAll(selector)];
  return { sesion, eventos, editor, contenedor, llamadas, q, qa };
}

function proyectoConLineas() {
  const p = crearProyecto({ estudiante: 'Camila R.', titulo: 'La llave del faro', destino: 'gratis' });
  const muelle = p.juego.escenas[0];
  muelle.nombre = 'El muelle';
  const torre = agregarEscena(p, 'La torre');
  agregarLinea(muelle, 'narracion', { texto: 'Niebla.' });
  agregarLinea(muelle, 'narracion', { texto: 'Más niebla.' });
  agregarLinea(torre, 'fin', { texto: 'Fin.' });
  return { p, muelle, torre };
}

test('arma la barra y las tres columnas y arranca con la escena inicial seleccionada', () => {
  const { p } = proyectoConLineas();
  const { contenedor, q, qa } = armar({ proyecto: p });
  assert.ok(q('.barra'));
  assert.ok(q('.columna-inventario .inventario'));
  assert.ok(q('.columna-centro .vista-previa'));
  assert.ok(q('.columna-centro .guion'));
  assert.ok(q('.columna-propiedades .propiedades'));
  assert.equal(q('.inventario [aria-current="true"] .entrada-texto').textContent, 'El muelle');
  assert.equal(q('.escenario-texto').textContent, 'Niebla.');
  assert.equal(q('.propiedades h2').textContent, 'Escena');
  assert.equal(qa('li.linea').length, 2);
  assert.equal(q('.capa-reproductor').hidden, true);
  contenedor.remove();
});

test('seleccionar desde el inventario cambia la escena activa; enfocar un bloque del guion no lo redibuja', () => {
  const { p, torre } = proyectoConLineas();
  const { contenedor, q, qa } = armar({ proyecto: p });
  clic(qa('.inventario button.entrada')[2]);
  assert.equal(q('.guion h2').textContent, 'La torre');
  assert.equal(q('.escenario-texto').textContent, 'Fin.');
  assert.equal(q('.propiedades h2').textContent, 'Escena');
  clic(qa('.inventario button.entrada')[1]);
  const guionAntes = q('.guion');
  const area = q('li.linea textarea');
  area.focus();
  assert.equal(q('.guion'), guionAntes, 'el guion no se redibuja al seleccionar una línea');
  assert.equal(q('li.linea[aria-current="true"] textarea'), area);
  assert.equal(q('.propiedades h2').textContent, 'Línea');
  assert.equal(q('.inventario [aria-current="true"] .entrada-texto').textContent, 'El muelle');
  assert.ok(torre);
  contenedor.remove();
});

test('escribir en el guion refresca la vista previa y la barra sin redibujar el guion; agregar una línea sí lo redibuja', () => {
  const { p } = proyectoConLineas();
  const { contenedor, q, qa } = armar({ proyecto: p });
  const area = q('li.linea textarea');
  area.focus();
  escribir(area, 'Niebla espesa.');
  assert.equal(q('.escenario-texto').textContent, 'Niebla espesa.');
  assert.equal(q('li.linea textarea'), area);
  const guionAntes = q('.guion');
  clic(q('button[data-agregar="dialogo"]'));
  assert.notEqual(q('.guion'), guionAntes, 'cambio de estructura: el guion se redibuja');
  assert.equal(qa('li.linea').length, 3);
  assert.equal(q('li.linea[aria-current="true"]').dataset.indice, '2');
  assert.equal(q('.propiedades h2').textContent, 'Línea');
  contenedor.remove();
});

test('Jugar abre el reproductor desde la escena inicial; «Jugar desde esta escena» desde la activa; cerrar devuelve el foco', () => {
  const { p } = proyectoConLineas();
  const { contenedor, q, qa } = armar({ proyecto: p });
  clic(q('button[data-accion="jugar"]'));
  assert.equal(q('.capa-reproductor').hidden, false);
  assert.ok(document.body.classList.contains('jugando'));
  assert.equal(q('.capa-reproductor .escenario-texto').textContent, 'Niebla.');
  clic(q('.capa-reproductor button[data-accion="cerrar"]'));
  assert.equal(q('.capa-reproductor').hidden, true);
  assert.equal(q('.capa-reproductor').childNodes.length, 0);
  assert.ok(!document.body.classList.contains('jugando'));
  assert.equal(document.activeElement, q('button[data-accion="jugar"]'));
  clic(qa('.inventario button.entrada')[2]);
  clic(q('button[data-accion="jugar-aqui"]'));
  assert.equal(q('.capa-reproductor .escenario-texto').textContent, 'Fin.');
  assert.deepEqual(textos(contenedor, '.reproductor-titulo'), ['La llave del faro']);
  clic(q('.capa-reproductor button[data-accion="cerrar"]'));
  contenedor.remove();
});

test('Guardar copia descarga el zip con el nombre del juego y reinicia el contador; con un error muestra el aviso', async () => {
  const { p, archivos } = proyectoPublicable();
  const { sesion, contenedor, editor, llamadas, q } = armar({ proyecto: p });
  sesion.cambiar(() => {});
  assert.equal(sesion.cambiosSinCopia, 1);
  assert.equal(await editor.guardarCopia(), false, 'faltan los archivos binarios: exportar falla');
  assert.match(q('.aviso-error').textContent, /Falta el archivo/);
  assert.ok(q('.aviso-error button[data-accion="guardar-copia"]'));
  for (const [id, a] of archivos) sesion.archivos.set(id, a);
  assert.equal(await editor.guardarCopia(), true);
  assert.deepEqual(llamadas.at(-1), ['descargar', 'copia-la-llave-del-faro.zip', 'application/zip']);
  assert.equal(sesion.cambiosSinCopia, 0);
  contenedor.remove();
});

test('Abrir copia importa, pide confirmación y reemplaza el proyecto; sin confirmación no toca nada', async () => {
  const { p: otro, archivos } = proyectoPublicable();
  otro.juego.titulo = 'Otro juego';
  const blob = await exportarCopia(otro, archivos, { JSZip });
  const { p } = proyectoConLineas();
  const noConfirma = armar({ proyecto: p, confirmar: () => false, archivoElegido: blob });
  await noConfirma.editor.abrirCopia();
  assert.equal(noConfirma.sesion.proyecto, p);
  assert.match(noConfirma.llamadas.at(-1)[1], /Reemplazar el proyecto actual por «Otro juego»/);
  noConfirma.contenedor.remove();
  const confirma = armar({ proyecto: proyectoConLineas().p, archivoElegido: blob });
  await confirma.editor.abrirCopia();
  assert.equal(confirma.sesion.proyecto.juego.titulo, 'Otro juego');
  assert.equal(confirma.q('.barra-juego').textContent, 'Otro juego');
  assert.equal(confirma.q('.guion h2').textContent, 'El muelle');
  assert.equal(confirma.sesion.archivos.size, 5);
  confirma.contenedor.remove();
  const danada = armar({ proyecto: proyectoConLineas().p, archivoElegido: new Blob(['no es zip']) });
  await danada.editor.abrirCopia();
  assert.match(danada.q('.aviso-error').textContent, /no es una copia válida/);
  danada.contenedor.remove();
});

test('Subir archivo pregunta qué es, da de alta el elemento y lo selecciona; un formato malo muestra el error', async () => {
  const png = { name: 'ana_retrato.png', type: 'image/png', size: 10, arrayBuffer: async () => new TextEncoder().encode('png').buffer };
  const { p } = proyectoConLineas();
  const { sesion, contenedor, editor, q, qa } = armar({ proyecto: p, archivoElegido: png });
  const pendiente = editor.subirArchivo();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(q('.dialogo h2').textContent, '¿Qué es «ana retrato»?');
  assert.deepEqual(textos(contenedor, '.dialogo button'), ['Fondo', 'Retrato', 'Cancelar']);
  clic(q('.dialogo button[data-tipo="retrato"]'));
  await pendiente;
  assert.equal(q('.dialogo'), null);
  const elemento = sesion.proyecto.juego.elementos[0];
  assert.equal(elemento.tipo, 'retrato');
  assert.equal(q('.propiedades h2').textContent, 'Retrato');
  assert.equal(q('.inventario [aria-current="true"] .entrada-texto').textContent, 'ana retrato');
  const cancelado = editor.subirArchivo();
  await new Promise((r) => setTimeout(r, 0));
  clic(q('.dialogo button[data-tipo="cancelar"]'));
  await cancelado;
  assert.equal(sesion.proyecto.juego.elementos.length, 1);
  const malo = armar({ proyecto: proyectoConLineas().p, archivoElegido: { name: 'x.gif', type: 'image/gif', size: 1 } });
  await malo.editor.subirArchivo();
  assert.match(malo.q('.aviso-error').textContent, /Formato no aceptado/);
  assert.ok(qa);
  contenedor.remove();
  malo.contenedor.remove();
});

test('los errores y el recordatorio de la sesión se muestran con botón de Guardar copia; Nuevo juego confirma y ofrece copia', async () => {
  const { p } = proyectoConLineas();
  const respuestas = ['sí', 'no'];
  const { sesion, contenedor, editor, llamadas, q, qa } = armar({ proyecto: p, confirmar: () => respuestas.shift() === 'sí' });
  const falloInterno = Object.assign(new Error('No hay espacio en el navegador para guardar.'), { codigo: 'sin_espacio' });
  editor.mostrarError(falloInterno);
  assert.match(q('.aviso-error').textContent, /No hay espacio/);
  assert.ok(q('.aviso-error button[data-accion="guardar-copia"]'));
  for (let i = 0; i < 50; i += 1) sesion.cambiar(() => {});
  assert.ok(qa('.aviso').some((a) => /50 cambios/.test(a.textContent)));
  await editor.nuevoJuego();
  assert.deepEqual(llamadas.filter((l) => l[0] === 'nuevo-juego'), [['nuevo-juego']]);
  assert.equal(llamadas.filter((l) => l[0] === 'confirmar').length, 2, 'confirmó el nuevo juego y preguntó por la copia');
  contenedor.remove();
});

test('creditosProvisionales nombra al estudiante y copia los créditos escritos en las fichas', () => {
  const { p, tema } = proyectoPublicable();
  p.fichas[tema.id].credito = '«Tema» de Autora Ejemplo, CC BY-NC 4.0';
  assert.deepEqual(creditosProvisionales(p), ['Camila R.: autor(a) del juego y de la historia', '«Tema» de Autora Ejemplo, CC BY-NC 4.0']);
  assert.deepEqual(creditosProvisionales(crearProyecto({ estudiante: ' ' })), ['Sin nombre: autor(a) del juego y de la historia']);
});
