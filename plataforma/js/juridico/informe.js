// plataforma/js/juridico/informe.js
// El informe jurídico del paquete de entrega (spec, sección 14): una página HTML
// autónoma e imprimible con portada, mapa de activos, cadena de titularidad, decisión
// de registro, todas las fichas con sus razones y notas, las explicaciones del
// contenido una sola vez y la lista de textos pendientes de verificación (spec 19.13).
// Puro: devuelve texto. Todo lo que escribió el estudiante pasa por escaparHtml.
import { evaluarTodo } from './semaforo.js';
import { describir } from './textos.js';
import { filas, TIPOS_ACTIVO } from './mapa.js';
import { construir } from './cadena.js';
import { visibles, ETIQUETAS, PREGUNTAS, NOMBRES_DESTINO } from './formulario.js';
import { LICENCIAS, condicionesDe } from './licencias.js';
import { TIPOS_OBRA } from './ficha.js';
import { nombreDe } from '../estado/validacion.js';
import { escaparHtml as e } from '../exportar/empaquetar.js';

const NOMBRES_ORIGEN = { escrito: 'Escrito en la plataforma', creado: 'Creado en la plataforma', subido: 'Subido', biblioteca: 'De la biblioteca' };
const CAMPOS_EXPLICADOS = ['tipoObra', 'autoria', 'titular', 'respaldo', 'credito', 'prueba', 'destino'];
const TITULOS_CAMPO = { ...PREGUNTAS, destino: 'Destino del juego' };
const siNo = (valor) => (valor ? 'sí' : 'no');
const oGuion = (texto) => (texto?.trim() ? e(texto) : '—');
const lista = (items) => (items.length ? `<ul>${items.join('')}</ul>` : '');

const ESTILOS = `
:root { color-scheme: light; }
body { max-width: 960px; margin: 0 auto; padding: 32px 24px 64px; font: 15px/1.5 Georgia, "Times New Roman", serif; color: #1a1d22; background: #fff; }
h1 { font: 700 32px/1.1 "Arial Black", "Segoe UI Black", Arial, sans-serif; margin: 0 0 16px; }
h2 { font: 700 20px/1.2 Arial, sans-serif; margin: 40px 0 12px; padding-top: 12px; border-top: 2px solid #1a1d22; }
h3 { font: 700 16px/1.3 Arial, sans-serif; margin: 20px 0 6px; }
.eyebrow { margin: 0 0 8px; font: 11px/1 Consolas, monospace; letter-spacing: .14em; text-transform: uppercase; color: #2f5d00; }
.portada { padding-bottom: 20px; border-bottom: 2px solid #1a1d22; }
.datos { display: grid; grid-template-columns: max-content 1fr; gap: 4px 16px; margin: 0 0 16px; }
.datos dt { font: 700 12px/1.6 Arial, sans-serif; text-transform: uppercase; letter-spacing: .06em; color: #5d5a52; }
.datos dd { margin: 0; overflow-wrap: anywhere; }
.aviso-legal { padding: 10px 14px; background: #f4f0e6; border-left: 4px solid #2f5d00; font-size: 13px; }
.indice { margin: 16px 0 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 6px 18px; font-family: Arial, sans-serif; font-size: 13px; }
table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 13px; }
th, td { padding: 6px 8px; border-bottom: 1px solid #d9d2c3; text-align: left; vertical-align: top; }
thead th { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #5d5a52; }
td ul, .razones, .notas { margin: 0; padding-left: 18px; }
.tipo { display: block; font: 10px/1.6 Consolas, monospace; text-transform: uppercase; letter-spacing: .06em; color: #5d5a52; }
.punto { display: inline-block; width: 10px; height: 10px; border-radius: 50%; vertical-align: middle; margin-right: 4px; border: 1px solid #868e96; }
.semaforo-verde { background: #2b8a3e; } .semaforo-amarillo { background: #d9930d; } .semaforo-rojo { background: #c92a2a; }
.riesgo-rojo td:first-child { box-shadow: inset 3px 0 0 #c92a2a; } .riesgo-amarillo td:first-child { box-shadow: inset 3px 0 0 #d9930d; }
.por-verificar { display: inline-block; margin-left: 6px; padding: 1px 6px; border-radius: 99px; background: #ffb648; color: #101408; font: 9px/1.6 Consolas, monospace; letter-spacing: .06em; text-transform: uppercase; vertical-align: middle; }
.arbol, .arbol ul { list-style: none; padding-left: 22px; margin: 4px 0; border-left: 1px solid #d9d2c3; }
.arbol > li { border: 0; }
.arbol li { margin: 4px 0; font-size: 14px; }
.nodo { font-weight: 700; }
.ficha { margin: 18px 0; padding: 14px 16px; border: 1px solid #d9d2c3; border-radius: 10px; page-break-inside: avoid; }
.ficha h3 { margin-top: 0; }
.ficha table th { width: 220px; font-weight: 700; }
.resultado { margin-top: 12px; padding: 10px 12px; background: #f4f0e6; border-radius: 8px; }
.resultado p { margin: 0 0 6px; }
.razones li, .notas li { margin-bottom: 8px; }
.fuente { font-size: 12px; font-style: italic; color: #5d5a52; }
.completo { font-size: 13px; }
.decision { margin: 12px 0; padding: 10px 14px; border-left: 3px solid #2f5d00; background: #fafaf7; }
.decision h3 { margin: 0 0 6px; }
.decision dl { display: grid; grid-template-columns: max-content 1fr; gap: 2px 14px; margin: 0; font-size: 14px; }
.decision dt { font-weight: 700; } .decision dd { margin: 0; }
footer { margin-top: 48px; padding-top: 12px; border-top: 1px solid #d9d2c3; font-size: 12px; color: #5d5a52; }
@page { margin: 2cm; }
@media print {
  body { padding: 0; font-size: 12px; }
  h2 { page-break-before: always; }
  .portada h2, #mapa h2 { page-break-before: auto; }
  a { color: inherit; text-decoration: none; }
}`;

/**
 * @param {object} proyecto
 * @param {{ contenido: object, huella: string, fecha: string, nombreProducto?: string }} opciones
 *   huella: SHA-256 del proyecto.json que va en el paquete; fecha: ISO de la publicación.
 * @returns {string} HTML completo
 */
export function generar(proyecto, { contenido, huella, fecha, nombreProducto = contenido.nombre ?? 'Mi primer videojuego' }) {
  const { juego } = proyecto;
  const titulo = juego.titulo?.trim() || 'Sin título';
  const estudiante = proyecto.estudiante?.trim() || 'Sin nombre';
  const semaforos = evaluarTodo(proyecto);
  const pendientes = new Map();

  /** Marca «Por verificar» y la anota para la lista final. */
  function marca(entrada, clave) {
    if (entrada?.verificacion !== 'pendiente') return '';
    pendientes.set(clave, entrada.breve ?? '');
    return ' <mark class="por-verificar">Por verificar</mark>';
  }
  const explicada = (entrada, clave) => `<p>${e(entrada.breve)}${marca(entrada, clave)}</p><p class="completo">${e(entrada.completo)}</p><p class="fuente">Fuente: ${e(entrada.fuente)}</p>`;

  // ---- 1. Mapa de activos ----
  const mapa = `<section id="mapa"><h2>1. Mapa de activos</h2>
<table><thead><tr><th>Activo</th><th>¿Quién lo creó?</th><th>Contrato o licencia</th><th>Prueba</th><th>Riesgo</th><th>Acción</th></tr></thead>
<tbody>${filas(proyecto, contenido).map((f) => `<tr class="riesgo-${f.color}">
<td><a href="#ficha-${e(f.id)}">${e(f.activo)}</a><span class="tipo">${e(f.tipo)}</span></td>
<td>${e(f.creador)}</td><td>${e(f.contrato)}</td><td>${e(f.prueba)}</td>
<td><span class="punto semaforo-${f.color}"></span>${f.color}${f.porVerificar ? ' <mark class="por-verificar">Por verificar</mark>' : ''}</td>
<td>${f.acciones.length ? lista(f.acciones.map((a) => `<li>${e(a)}</li>`)) : 'Nada por hacer'}</td></tr>`).join('')}</tbody></table></section>`;

  // ---- 2. Cadena de titularidad ----
  function nodo(n) {
    const detalle = n.id === 'juego'
      ? ` — ${e(n.estudiante)}`
      : ` — autoría: ${e(ETIQUETAS.autoria[n.autoria] ?? n.autoria)}${n.autorNombre ? ` (${e(n.autorNombre)})` : ''}; titular: ${e(ETIQUETAS.titular[n.titular] ?? n.titular)}; respaldo: ${e(ETIQUETAS.respaldo[n.respaldo] ?? n.respaldo)}${n.licencia ? ` (${e(LICENCIAS[n.licencia]?.nombre ?? n.licencia)})` : ''}; semáforo: ${n.color ?? '—'}`;
    return `<li><span class="nodo">${e(n.nombre)}</span>${detalle}${n.hijos.length ? `<ul>${n.hijos.map(nodo).join('')}</ul>` : ''}</li>`;
  }
  const cadena = `<section id="cadena"><h2>2. Cadena de titularidad</h2>
<p>El juego es del estudiante; de él cuelgan el título, la historia con sus escenas, cada personaje con su retrato y los demás elementos, con lo que dice cada ficha.</p>
<ul class="arbol">${nodo(construir(proyecto, semaforos))}</ul></section>`;

  // ---- 3. Decisión de registro ----
  const decisiones = Array.isArray(proyecto.registro) ? proyecto.registro : [];
  const registro = `<section id="registro"><h2>3. Decisión de registro</h2>
<p>El estudiante eligió hasta tres activos y respondió si los registraría ante la Dirección Nacional de Derecho de Autor, a nombre de quién y con qué prueba. No hay respuesta correcta: el ejercicio es pensarlo.</p>
${contenido.campos?.prueba ? explicada(contenido.campos.prueba, 'campos.prueba') : ''}
${decisiones.length ? decisiones.map((d) => `<article class="decision"><h3>${e(nombreDe(proyecto, d.id))}</h3><dl>
<dt>¿Lo registraría ante la DNDA?</dt><dd>${e(ETIQUETAS.registraria[d.registraria] ?? '—')}</dd>
<dt>¿A nombre de quién?</dt><dd>${oGuion(d.aNombreDe)}</dd>
<dt>¿Con qué prueba?</dt><dd>${oGuion(d.prueba)}</dd>
${d.porque?.trim() ? `<dt>¿Por qué?</dt><dd>${e(d.porque)}</dd>` : ''}</dl></article>`).join('') : '<p>El estudiante no dejó decisiones de registro.</p>'}</section>`;

  // ---- 4. Fichas ----
  const tiposObraUsados = new Set();
  function razonHtml(r, clave) {
    return `<li><p><strong>${e(r.breve)}</strong>${marca(r, clave)}</p>${r.accion ? `<p>Qué hacer: ${e(r.accion)}</p>` : ''}<p class="completo">${e(r.completo)}</p><p class="fuente">Fuente: ${e(r.fuente)}</p></li>`;
  }
  function fichaHtml(id, nombre, tipoActivo) {
    const ficha = proyecto.fichas[id];
    if (!ficha) return '';
    tiposObraUsados.add(ficha.tipoObra);
    const descrito = describir(semaforos.get(id), ficha, contenido);
    const hayA01 = descrito.razones.some((r) => r.codigo === 'A01');
    const razones = hayA01 ? descrito.razones.filter((r) => r.codigo !== 'A02') : descrito.razones;
    const v = visibles(ficha);
    const elemento = juego.elementos.find((x) => x.id === id) ?? null;
    const filasFicha = [];
    const fila = (etiqueta, valor) => filasFicha.push(`<tr><th scope="row">${etiqueta}</th><td>${valor}</td></tr>`);

    fila(e(PREGUNTAS.tipoObra), `${e(TIPOS_OBRA[ficha.tipoObra]?.nombre ?? ficha.tipoObra)}${marca(contenido.tiposObra?.[ficha.tipoObra], `tiposObra.${ficha.tipoObra}`)}`);
    const origen = [e(NOMBRES_ORIGEN[ficha.origen] ?? ficha.origen)];
    if (elemento?.biblioteca) origen.push(`(pieza ${e(elemento.biblioteca.id)}: autor ${oGuion(elemento.biblioteca.autor)}, licencia ${e(LICENCIAS[elemento.biblioteca.licencia]?.nombre ?? elemento.biblioteca.licencia)}${elemento.biblioteca.creditoSugerido ? `, crédito sugerido «${e(elemento.biblioteca.creditoSugerido)}»` : ''})`);
    fila('Origen', origen.join(' '));
    if (v.autoria) {
      const partes = [e(ETIQUETAS.autoria[ficha.autoria] ?? ficha.autoria)];
      if (v.autorNombre) partes.push(`(${oGuion(ficha.autorNombre)})`);
      if (v.herramientaIA) partes.push(`; herramienta: ${oGuion(ficha.herramientaIA)}`);
      if (v.aporteHumano) partes.push(`; aporte creativo: ${oGuion(ficha.aporteHumano)}`);
      if (v.reconoceSinDerechos) partes.push(`; reconoce que no puede reclamar derechos: ${siNo(ficha.reconoceSinDerechos)}`);
      if (v.basadoEnObraAjena) partes.push(`; basado en una obra ajena: ${siNo(ficha.basadoEnObraAjena)}`);
      if (v.autorizacionDerivada) partes.push(`; autorización del autor original: ${siNo(ficha.autorizacionDerivada)}`);
      fila(e(PREGUNTAS.autoria), partes.join(' '));
    }
    if (v.titular) fila(e(PREGUNTAS.titular), e(ETIQUETAS.titular[ficha.titular] ?? ficha.titular));
    if (ficha.tipo !== 'titulo') {
      const partes = [e(ETIQUETAS.respaldo[ficha.respaldo] ?? ficha.respaldo)];
      if (ficha.respaldo === 'licencia') {
        partes.push(`: ${e(ficha.licencia ? (LICENCIAS[ficha.licencia]?.nombre ?? ficha.licencia) : 'sin elegir')}`);
        if (ficha.licencia === 'OTRA') partes.push(`(${oGuion(ficha.licenciaTexto)})`);
        const condiciones = condicionesDe(ficha);
        if (condiciones.length) partes.push(`; condiciones: ${condiciones.map((c) => e(ETIQUETAS.condiciones[c] ?? c)).join(', ')}`);
        if (v.licenciaLeida) partes.push(`; Leí la licencia: ${siNo(ficha.licenciaLeida)}`);
        if (v.aceptaCompartirIgual) partes.push(`; acepto licenciar mi juego igual: ${siNo(ficha.aceptaCompartirIgual)}`);
        if (v.modificado) partes.push(`; lo modifiqué: ${siNo(ficha.modificado)}`);
      }
      fila(e(PREGUNTAS.respaldo), partes.join(' '));
    }
    if (v.credito) fila(e(PREGUNTAS.credito), oGuion(ficha.credito));
    if (v.prueba) {
      const partes = [e(ETIQUETAS.prueba[ficha.prueba] ?? ficha.prueba)];
      if (elemento?.sello) partes.push(`— sello de creación: ${e(elemento.sello.fecha)}, <code>${e(elemento.sello.huella)}</code>`);
      fila(e(PREGUNTAS.prueba), partes.join(' '));
    }
    const color = descrito.color;
    return `<article class="ficha" id="ficha-${e(id)}" data-ficha="${e(id)}">
<h3>${e(nombre)} <span class="tipo">${e(tipoActivo)}</span></h3>
<table>${filasFicha.join('')}</table>
<div class="resultado">
<p><span class="punto semaforo-${color}"></span><strong>Semáforo: ${color}</strong></p>
${razones.length ? `<ul class="razones">${razones.map((r) => razonHtml(r, `reglas.${r.codigo}`)).join('')}</ul>` : '<p>Ninguna regla aplica.</p>'}
${descrito.notas.length ? `<ul class="notas">${descrito.notas.map((n) => razonHtml(n, `notas.${n.codigo}`)).join('')}</ul>` : ''}
</div></article>`;
  }
  const fichas = `<section id="fichas"><h2>4. Fichas jurídicas</h2>
${[
    fichaHtml('titulo', titulo, TIPOS_ACTIVO.titulo),
    fichaHtml('historia', 'Historia', TIPOS_ACTIVO.historia),
    ...juego.personajes.map((p) => fichaHtml(p.id, p.nombre?.trim() || 'Sin nombre', TIPOS_ACTIVO.personaje)),
    ...juego.elementos.map((x) => fichaHtml(x.id, x.nombre?.trim() || 'Sin nombre', TIPOS_ACTIVO[x.tipo] ?? x.tipo)),
  ].join('')}</section>`;

  // ---- 5. Explicaciones (una vez) ----
  const explicaciones = `<section id="explicaciones"><h2>5. Explicaciones de los campos y de los tipos de obra</h2>
${CAMPOS_EXPLICADOS.filter((c) => contenido.campos?.[c]).map((c) => `<h3>${e(TITULOS_CAMPO[c] ?? c)}</h3>${explicada(contenido.campos[c], `campos.${c}`)}`).join('')}
${[...tiposObraUsados].filter((t) => contenido.tiposObra?.[t]).map((t) => `<h3>${e(TIPOS_OBRA[t]?.nombre ?? t)}</h3>${explicada(contenido.tiposObra[t], `tiposObra.${t}`)}`).join('')}</section>`;

  // ---- 6. Pendientes (se arma al final, cuando ya se marcó todo) ----
  const listaPendientes = `<section id="pendientes"><h2>6. Textos pendientes de verificación jurídica</h2>
<p>Estos textos aparecen en el informe con la marca «Por verificar»: corresponden a la sección 19 del diseño y no deben tomarse como verificados.</p>
${pendientes.size ? `<ul>${[...pendientes].map(([clave, breve]) => `<li><code>${e(clave)}</code>: ${e(breve)}</li>`).join('')}</ul>` : '<p>Ninguno.</p>'}</section>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Informe jurídico: ${e(titulo)}</title>
<style>${ESTILOS}</style>
</head>
<body>
<header class="portada">
<p class="eyebrow">${e(nombreProducto)} · Informe jurídico</p>
<h1>${e(titulo)}</h1>
<dl class="datos">
<dt>Estudiante</dt><dd>${e(estudiante)}</dd>
<dt>Destino del juego</dt><dd>${e(NOMBRES_DESTINO[juego.destino] ?? juego.destino)}</dd>
${juego.sinopsis?.trim() ? `<dt>Sinopsis</dt><dd>${e(juego.sinopsis)}</dd>` : ''}
<dt>Fecha de publicación</dt><dd>${e(fecha)}</dd>
<dt>Huella del proyecto</dt><dd><code>${e(huella)}</code> (SHA-256 de proyecto.json)</dd>
<dt>Proyecto creado</dt><dd>${e(proyecto.creado)}</dd>
</dl>
<p class="aviso-legal">${e(contenido.aviso ?? '')}</p>
<ul class="indice"><li><a href="#mapa">1. Mapa de activos</a></li><li><a href="#cadena">2. Cadena de titularidad</a></li><li><a href="#registro">3. Decisión de registro</a></li><li><a href="#fichas">4. Fichas jurídicas</a></li><li><a href="#explicaciones">5. Explicaciones</a></li><li><a href="#pendientes">6. Pendientes de verificación</a></li></ul>
</header>
${mapa}
${cadena}
${registro}
${fichas}
${explicaciones}
${listaPendientes}
<footer>
<p>${e(contenido.aviso ?? '')}</p>
<p>Fuente de los textos jurídicos: ${e(contenido.fuentePrincipal ?? '')}</p>
<p>Informe generado por ${e(nombreProducto)} el ${e(fecha)}. Los datos salen de las fichas que llenó el estudiante; la plataforma no los verifica.</p>
</footer>
</body>
</html>
`;
}
