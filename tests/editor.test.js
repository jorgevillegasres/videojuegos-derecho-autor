// tests/editor.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { instalarDom, clic, escribir, textos } from './ayudas/dom.js';
import { sesionDePrueba } from './ayudas/sesion.js';
import { proyectoPublicable } from './ayudas/proyecto.js';
import { catalogoCargado } from './ayudas/catalogo.js';
import { crearProyecto, agregarEscena, agregarLinea } from '../plataforma/js/estado/modelo.js';
import { exportarCopia } from '../plataforma/js/estado/copias.js';
import { crearEditor } from '../plataforma/js/editor/editor.js';

instalarDom();

function armar({ proyecto, confirmar = () => true, archivoElegido = null, catalogo = null, avisoInicial = null, herramientas = null } = {}) {
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
    catalogo,
    avisoInicial,
    crearHerramientas: herramientas ? () => herramientas : null,
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

test('el reproductor muestra los créditos que salen de las fichas', () => {
  const { p } = proyectoPublicable();
  const { contenedor, q } = armar({ proyecto: p });
  clic(q('button[data-accion="jugar"]'));
  clic(q('.capa-reproductor button[data-accion="creditos"]'));
  assert.deepEqual(textos(contenedor, '.escenario-creditos li'), ['Camila R.: autor(a) del juego y de la historia', '«Tema» de Autora Ejemplo, CC BY-NC 4.0']);
  clic(q('.capa-reproductor button[data-accion="cerrar"]'));
  contenedor.remove();
});

test('Mapa de activos abre la capa; «Ver ficha» la cierra y abre la ficha con el foco en ella', () => {
  const { p, tema } = proyectoPublicable();
  const { contenedor, q } = armar({ proyecto: p });
  clic(q('button[data-accion="mapa"]'));
  assert.equal(q('.capa-mapa').hidden, false);
  assert.ok(document.body.classList.contains('con-mapa'));
  assert.equal(q('.capa-mapa tbody').children.length, 9);
  clic(q(`.capa-mapa tr[data-ficha="${tema.id}"] button[data-accion="ver-ficha"]`));
  assert.equal(q('.capa-mapa').hidden, true);
  assert.ok(!document.body.classList.contains('con-mapa'));
  assert.equal(q('.propiedades h2').textContent, 'Música');
  assert.equal(document.activeElement, q(`section.ficha[data-ficha="${tema.id}"]`), 'el foco queda en la ficha');
  clic(q('button[data-accion="mapa"]'));
  clic(q('.capa-mapa button[data-accion="cerrar-mapa"]'));
  assert.equal(document.activeElement, q('button[data-accion="mapa"]'), 'cerrar devuelve el foco al botón');
  contenedor.remove();
});

test('al subir un archivo la ficha se abre con el foco en «¿Quién lo hizo?»', async () => {
  const png = { name: 'ana.png', type: 'image/png', size: 10, arrayBuffer: async () => new TextEncoder().encode('png').buffer };
  const { p } = proyectoConLineas();
  const { sesion, contenedor, editor, q } = armar({ proyecto: p, archivoElegido: png });
  const pendiente = editor.subirArchivo();
  await new Promise((r) => setTimeout(r, 0));
  clic(q('.dialogo button[data-tipo="retrato"]'));
  await pendiente;
  const elemento = sesion.proyecto.juego.elementos[0];
  assert.equal(document.activeElement, q(`[data-foco="ficha:${elemento.id}:autoria:yo"]`));
  contenedor.remove();
});

test('Biblioteca abre el selector; «Usar esta pieza» mete la pieza con su ficha precargada y deja el foco en la ficha', async () => {
  const catalogo = await catalogoCargado();
  const { p } = proyectoConLineas();
  const { sesion, contenedor, q } = armar({ proyecto: p, catalogo });
  clic(q('.inventario button[data-accion="biblioteca"]'));
  assert.equal(q('.capa-biblioteca').hidden, false);
  assert.ok(document.body.classList.contains('con-biblioteca'));
  clic(q('.capa-biblioteca [data-filtro="musica"]'));
  clic(q('.capa-biblioteca .biblioteca-pieza[data-pieza="bib_m3"] button[data-accion="usar"]'));
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(q('.capa-biblioteca').hidden, true);
  assert.ok(!document.body.classList.contains('con-biblioteca'));
  const elemento = sesion.proyecto.juego.elementos[0];
  assert.equal(elemento.origen, 'biblioteca');
  assert.equal(elemento.nombre, 'Pista 3');
  assert.equal(sesion.proyecto.fichas[elemento.id].licencia, 'CC-BY-NC-4.0');
  assert.equal(q('.propiedades h2').textContent, 'Música');
  assert.equal(document.activeElement, q(`section.ficha[data-ficha="${elemento.id}"]`));
  assert.equal(q('.ficha-pieza strong').textContent, 'Pista 3');
  assert.ok(q('.inventario .punto-semaforo').classList.contains('semaforo-amarillo'), 'falta leer la licencia');
  assert.ok([...contenedor.querySelectorAll('.aviso')].some((a) => /entró al juego desde la biblioteca/.test(a.textContent)));
  clic(q('.inventario button[data-accion="biblioteca"]'));
  clic(q('.capa-biblioteca button[data-accion="cerrar-biblioteca"]'));
  assert.equal(document.activeElement, q('.inventario button[data-accion="biblioteca"]'), 'cerrar devuelve el foco al botón');
  contenedor.remove();
});

test('sin catálogo, Biblioteca queda deshabilitado y el aviso inicial se muestra', () => {
  const { p } = proyectoConLineas();
  const { contenedor, q } = armar({ proyecto: p, avisoInicial: 'La biblioteca no está disponible: el catálogo no cargó.' });
  assert.equal(q('.inventario button[data-accion="biblioteca"]').disabled, true);
  assert.ok([...contenedor.querySelectorAll('.aviso')].some((a) => /La biblioteca no está disponible/.test(a.textContent)));
  assert.equal(q('.capa-biblioteca').hidden, true);
  contenedor.remove();
});

function herramientasFalsas(resultados = {}) {
  const llamadas = [];
  const blob = (tipo, texto) => new Blob([texto], { type: tipo });
  return {
    llamadas,
    pixelart: { abrir: async (opciones) => { llamadas.push(['pixelart', opciones]); return resultados.pixelart === null ? null : blob('image/png', 'png nuevo'); } },
    grabador: { abrir: async (opciones) => { llamadas.push(['grabador', Object.keys(opciones)]); return resultados.grabador === null ? null : blob('audio/webm;codecs=opus', 'voz'); } },
    secuenciador: { abrir: async () => { llamadas.push(['secuenciador']); return resultados.secuenciador === null ? null : blob('audio/wav', 'wav'); } },
  };
}

test('Pixel art pregunta qué dibujar, abre la herramienta y mete el resultado como elemento creado con sello y ficha en verde', async () => {
  const herramientas = herramientasFalsas();
  const { p } = proyectoConLineas();
  const { sesion, contenedor, q } = armar({ proyecto: p, herramientas });
  clic(q('.inventario button[data-accion="crear-pixel"]'));
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(q('.dialogo h2').textContent, '¿Qué vas a dibujar?');
  assert.deepEqual(textos(contenedor, '.dialogo button'), ['Fondo', 'Retrato', 'Cancelar']);
  clic(q('.dialogo button[data-tipo="retrato"]'));
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(herramientas.llamadas, [['pixelart', { tipo: 'retrato' }]]);
  const elemento = sesion.proyecto.juego.elementos[0];
  assert.equal(elemento.origen, 'creado');
  assert.equal(elemento.tipo, 'retrato');
  assert.equal(elemento.nombre, 'Retrato creado 1');
  assert.match(elemento.sello.huella, /^sha256:[0-9a-f]{64}$/);
  assert.equal(q('.propiedades h2').textContent, 'Retrato');
  assert.equal(document.activeElement, q(`section.ficha[data-ficha="${elemento.id}"]`));
  assert.ok(q('.inventario .punto-semaforo').classList.contains('semaforo-verde'));
  assert.ok(q('.ficha-notas li[data-codigo="N_SELLO"]'), 'la ficha explica el sello');
  assert.ok([...contenedor.querySelectorAll('.aviso')].some((a) => /sello de creación/.test(a.textContent)));
  assert.ok(!document.body.classList.contains('con-herramienta'));
  contenedor.remove();
});

test('Grabar pregunta voz o efecto y ofrece subir en su lugar; el secuenciador no pregunta; cancelar no crea nada; sin herramientas, los botones se deshabilitan', async () => {
  const herramientas = herramientasFalsas({ secuenciador: null });
  const { p } = proyectoConLineas();
  const { sesion, contenedor, q } = armar({ proyecto: p, herramientas });
  clic(q('.inventario button[data-accion="crear-grabar"]'));
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(q('.dialogo h2').textContent, '¿Qué vas a grabar?');
  assert.deepEqual(textos(contenedor, '.dialogo button'), ['Voz', 'Efecto', 'Cancelar']);
  clic(q('.dialogo button[data-tipo="voz"]'));
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(herramientas.llamadas.at(-1), ['grabador', ['alSubirEnSuLugar']]);
  assert.equal(sesion.proyecto.juego.elementos[0].tipo, 'voz');
  assert.equal(sesion.proyecto.juego.elementos[0].nombre, 'Grabación 1');
  assert.equal(sesion.proyecto.juego.elementos[0].archivo, `${sesion.proyecto.juego.elementos[0].id}.webm`);
  clic(q('.inventario button[data-accion="crear-secuencia"]'));
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(q('.dialogo'), null, 'el secuenciador no pregunta el tipo');
  assert.deepEqual(herramientas.llamadas.at(-1), ['secuenciador']);
  assert.equal(sesion.proyecto.juego.elementos.length, 1, 'cancelar no crea nada');
  contenedor.remove();
  const sinHerramientas = armar({ proyecto: proyectoConLineas().p });
  assert.equal(sinHerramientas.q('.inventario button[data-accion="crear-pixel"]').disabled, true);
  sinHerramientas.contenedor.remove();
});

test('«Editar en pixel art» reabre el fondo creado con su archivo y, al guardar, reemplaza el archivo y el sello', async () => {
  const herramientas = herramientasFalsas();
  const { p } = proyectoConLineas();
  const { sesion, contenedor, editor, q } = armar({ proyecto: p, herramientas });
  await editor.crearConHerramienta('secuencia');
  clic(q('.inventario button[data-accion="crear-pixel"]'));
  await new Promise((r) => setTimeout(r, 0));
  clic(q('.dialogo button[data-tipo="fondo"]'));
  await new Promise((r) => setTimeout(r, 20));
  const fondo = sesion.proyecto.juego.elementos.find((e) => e.tipo === 'fondo');
  const huellaAntes = fondo.sello.huella;
  herramientas.pixelart.abrir = async (opciones) => { herramientas.llamadas.push(['pixelart', opciones.tipo, new TextDecoder().decode(opciones.archivo.datos)]); return new Blob(['png editado'], { type: 'image/png' }); };
  clic(q('.propiedades button[data-accion="editar-pixel"]'));
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(herramientas.llamadas.at(-1), ['pixelart', 'fondo', 'png nuevo']);
  assert.notEqual(fondo.sello.huella, huellaAntes);
  assert.equal(new TextDecoder().decode(sesion.archivos.get(fondo.id).datos), 'png editado');
  assert.equal(q('.propiedades h2').textContent, 'Fondo');
  contenedor.remove();
});

test('cambiar el destino recalcula los semáforos y anuncia los que cambian de color', () => {
  const { p, tema } = proyectoPublicable();
  const { contenedor, q, qa } = armar({ proyecto: p });
  clic(qa('.inventario button.entrada')[0]);
  escribir(q('[data-foco="destino"]'), 'venta');
  assert.ok(q(`.punto-semaforo[data-ficha="${tema.id}"]`).classList.contains('semaforo-rojo'));
  assert.equal(document.getElementById('anuncios').textContent, 'Semáforo de «Tema»: rojo');
  escribir(q('[data-foco="destino"]'), 'gratis');
  assert.equal(document.getElementById('anuncios').textContent, 'Semáforo de «Tema»: verde');
  assert.ok(q('section.ficha[data-ficha="titulo"]'), 'El juego muestra sus fichas');
  contenedor.remove();
});
