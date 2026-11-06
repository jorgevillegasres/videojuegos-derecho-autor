// tests/catalogo.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalogoDePrueba, pieza } from './ayudas/catalogo.js';
import { validarCatalogo, faltantesDelMinimo, entradaDeFicha, crearCatalogo, MINIMO_CATALOGO, CARPETAS } from '../plataforma/js/biblioteca/catalogo.js';
import { crearFicha } from '../plataforma/js/juridico/ficha.js';

test('un catálogo bien formado no tiene problemas ni faltantes', () => {
  const catalogo = catalogoDePrueba();
  assert.deepEqual(validarCatalogo(catalogo), []);
  assert.deepEqual(faltantesDelMinimo(catalogo), []);
  assert.equal(catalogo.piezas.length, 34);
  assert.deepEqual(MINIMO_CATALOGO, { fondo: 8, retrato: 8, musica: 6, efecto: 12 });
  assert.deepEqual(CARPETAS, { fondo: 'fondos', retrato: 'retratos', musica: 'musica', efecto: 'efectos' });
});

test('validarCatalogo enumera los problemas de forma sin lanzar', () => {
  assert.deepEqual(validarCatalogo(null), ['el catálogo no es un objeto']);
  assert.deepEqual(validarCatalogo({ version: 1 }), ['el catálogo no tiene lista de piezas']);
  const problemasDe = (modificar) => { const c = catalogoDePrueba(); modificar(c); return validarCatalogo(c); };
  assert.ok(problemasDe((c) => { c.piezas[1].id = c.piezas[0].id; }).some((m) => /repetido/.test(m)), 'id repetido');
  assert.ok(problemasDe((c) => { c.piezas[0].tipo = 'voz'; }).some((m) => /tipo «voz» no es de biblioteca/.test(m)), 'tipo');
  assert.ok(problemasDe((c) => { c.piezas[0].licencia = 'OTRA'; }).some((m) => /licencia «OTRA»/.test(m)), 'OTRA no va en el catálogo');
  assert.ok(problemasDe((c) => { c.piezas[0].licencia = 'MIT'; }).some((m) => /licencia «MIT»/.test(m)), 'licencia desconocida');
  assert.ok(problemasDe((c) => { c.piezas[0].condiciones = ['NC']; }).some((m) => /condiciones .* no son las de CC-BY-4\.0/.test(m)), 'condiciones');
  assert.ok(problemasDe((c) => { c.piezas[0].archivo = 'retratos/x.png'; }).some((m) => /carpeta «fondos»/.test(m)), 'carpeta');
  assert.ok(problemasDe((c) => { c.piezas[0].archivo = 'fondos/x.wav'; }).some((m) => /extensión/.test(m)), 'extensión de imagen');
  assert.ok(problemasDe((c) => { c.piezas[16].archivo = 'musica/x.png'; }).some((m) => /extensión/.test(m)), 'extensión de audio');
  assert.ok(problemasDe((c) => { c.piezas[0].titulo = ' '; }).some((m) => /título/.test(m)), 'título vacío');
  assert.ok(problemasDe((c) => { delete c.piezas[0].fuente; }).some((m) => /fuente/.test(m)), 'fuente');
  assert.ok(problemasDe((c) => { c.piezas[0].creditoSugerido = 3; }).some((m) => /crédito/.test(m)), 'crédito');
  assert.ok(problemasDe((c) => { delete c.piezas[6].simulado; }).some((m) => /CURSO.*simulado/.test(m)), 'CURSO sin simulado');
  assert.ok(problemasDe((c) => { c.piezas[7].simulado = { licencia: 'CC-BY-4.0', autor: 'x', fuente: 'y' }; }).some((m) => /simulado.*CC0 o DP/.test(m)), 'simulado con licencia que no se puede distribuir');
  assert.ok(problemasDe((c) => { c.piezas[0].simulado = { licencia: 'CC0', autor: 'x', fuente: 'y' }; }).some((m) => /solo .* provisional/.test(m)), 'simulado fuera de CURSO/DESCONOCIDO sin catálogo provisional');
  assert.deepEqual(problemasDe((c) => { c.provisional = true; c.piezas[0].simulado = { licencia: 'CC0', autor: 'x', fuente: 'y' }; }), [], 'con catálogo provisional sí');
  assert.ok(problemasDe((c) => { c.piezas[16].licencia = 'CC-BY-ND-4.0'; c.piezas[16].condiciones = ['BY', 'ND']; }).some((m) => /audio sin derivadas/.test(m)), 'audio con ND');
});

test('faltantesDelMinimo exige las cantidades y la mezcla de la sección 11', () => {
  const faltantesDe = (modificar) => { const c = catalogoDePrueba(); modificar(c); return faltantesDelMinimo(c).map((f) => f.codigo); };
  assert.deepEqual(faltantesDe((c) => { c.piezas = c.piezas.filter((p) => p.id !== 'bib_f1'); }), ['M_FONDO'], 'quedan otros CC-BY en fondos: solo falta la cantidad');
  assert.ok(faltantesDe((c) => { c.piezas = c.piezas.filter((p) => p.tipo !== 'efecto').concat(c.piezas.filter((p) => p.tipo === 'efecto').slice(0, 11)); }).includes('M_EFECTO'));
  assert.ok(faltantesDe((c) => { for (const p of c.piezas) if (p.tipo === 'musica' && p.licencia === 'CC-BY-NC-4.0') { p.licencia = 'CC-BY-4.0'; p.condiciones = ['BY']; } }).includes('MEZCLA_NC_MUSICA'));
  assert.ok(faltantesDe((c) => { for (const p of c.piezas) if (p.licencia === 'CC-BY-ND-4.0') { p.licencia = 'CC-BY-4.0'; p.condiciones = ['BY']; } }).includes('MEZCLA_ND_IMAGEN'));
  assert.ok(faltantesDe((c) => { for (const p of c.piezas) if (p.licencia === 'CC-BY-SA-4.0' && (p.tipo === 'fondo' || p.tipo === 'retrato')) { p.licencia = 'CC-BY-4.0'; p.condiciones = ['BY']; } }).includes('MEZCLA_SA_IMAGEN'));
  assert.ok(faltantesDe((c) => { for (const p of c.piezas) if (p.licencia === 'CURSO') { p.licencia = 'CC0'; delete p.simulado; } }).includes('MEZCLA_CURSO'));
  assert.ok(faltantesDe((c) => { for (const p of c.piezas) if (p.licencia === 'DESCONOCIDO') { p.licencia = 'CC0'; delete p.simulado; p.autor = 'A'; } }).includes('MEZCLA_DESCONOCIDO'));
  assert.ok(faltantesDe((c) => { for (const p of c.piezas) if (p.tipo === 'retrato' && (p.licencia === 'CC0' || p.licencia === 'DP')) { p.licencia = 'CC-BY-4.0'; p.condiciones = ['BY']; } }).includes('MEZCLA_LIBRE_retrato'));
  const faltantes = faltantesDelMinimo({ version: 1, piezas: [] });
  assert.equal(faltantes.find((f) => f.codigo === 'M_FONDO').mensaje, 'Fondos: 0 de 8.');
});

test('entradaDeFicha da lo que crearFicha espera de una pieza de biblioteca', () => {
  const p = pieza('bib_x', 'musica', 'Tema', 'CC-BY-NC-4.0');
  const entrada = entradaDeFicha(p);
  assert.deepEqual(entrada, { id: 'bib_x', autor: 'Autora de Prueba', licencia: 'CC-BY-NC-4.0', creditoSugerido: '«Tema», Autora de Prueba, CC-BY-NC-4.0' });
  const ficha = crearFicha('musica', { origen: 'biblioteca', biblioteca: entrada });
  assert.equal(ficha.licencia, 'CC-BY-NC-4.0');
  assert.equal(ficha.credito, entrada.creditoSugerido);
  assert.equal(ficha.autorNombre, 'Autora de Prueba');
});

test('crearCatalogo carga y valida el catálogo, resuelve URLs y trae archivos con su tipo', async () => {
  const datos = catalogoDePrueba();
  const pedidas = [];
  const fetchFalso = async (url) => {
    const texto = String(url);
    pedidas.push(texto);
    if (texto.endsWith('catalogo.json')) return { ok: true, json: async () => datos };
    if (texto.endsWith('.png') || texto.endsWith('.wav')) return { ok: true, arrayBuffer: async () => new TextEncoder().encode(`bytes de ${texto}`).buffer };
    return { ok: false, status: 404 };
  };
  const catalogo = crearCatalogo({ url: 'http://localhost/plataforma/biblioteca/catalogo.json', fetch: fetchFalso });
  const cargado = await catalogo.cargar();
  assert.equal(cargado.piezas.length, 34);
  assert.deepEqual(catalogo.piezas().map((p) => p.id).slice(0, 2), ['bib_f1', 'bib_f2']);
  assert.equal(catalogo.piezaDe('bib_m1').titulo, 'Pista 1');
  assert.equal(catalogo.piezaDe('nada'), null);
  assert.equal(catalogo.urlDe(catalogo.piezaDe('bib_f1')), 'http://localhost/plataforma/biblioteca/fondos/bib_f1.png');
  const archivo = await catalogo.obtenerArchivo('bib_m1');
  assert.equal(archivo.tipo, 'audio/wav');
  assert.equal(new TextDecoder().decode(archivo.datos), 'bytes de http://localhost/plataforma/biblioteca/musica/bib_m1.wav');
  await assert.rejects(catalogo.obtenerArchivo('nada'), /no está en el catálogo/);
  assert.equal(pedidas.length, 2, 'cargar se hace una sola vez');
  await catalogo.cargar();
  assert.equal(pedidas.length, 2);
});

test('crearCatalogo rechaza un catálogo ausente o inválido con un mensaje para la interfaz', async () => {
  const ausente = crearCatalogo({ url: 'http://localhost/x/catalogo.json', fetch: async () => ({ ok: false, status: 404 }) });
  await assert.rejects(ausente.cargar(), (e) => e.codigo === 'catalogo' && /404/.test(e.message));
  const invalido = crearCatalogo({ url: 'http://localhost/x/catalogo.json', fetch: async () => ({ ok: true, json: async () => ({ version: 1, piezas: [{ id: 'a' }] }) }) });
  await assert.rejects(invalido.cargar(), (e) => e.codigo === 'catalogo' && Array.isArray(e.problemas) && e.problemas.length > 0);
  assert.equal(invalido.piezas().length, 0, 'sin cargar, no hay piezas');
});
