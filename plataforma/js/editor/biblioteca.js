// plataforma/js/editor/biblioteca.js
// El selector de la biblioteca (spec, sección 11) sobre el editor: filtros por tipo y
// tarjetas con vista previa, autor, licencia y condiciones. tomarPieza mete la pieza
// elegida al proyecto con origen 'biblioteca', la ficha precargada por crearFicha y el
// archivo guardado, igual que subirElemento con los archivos subidos.
import { h, vaciar } from '../ui/dom.js';
import { ETIQUETAS } from '../juridico/formulario.js';
import { agregarElemento, eliminarElemento } from '../estado/modelo.js';
import { extensionPorMime } from '../estado/archivos.js';
import { entradaDeFicha, TIPOS_BIBLIOTECA, medioDeTipo } from '../biblioteca/catalogo.js';

export const FILTROS = { fondo: 'Fondos', retrato: 'Retratos', musica: 'Música', efecto: 'Efectos' };
export const ABREVIATURAS = { DP: 'Dominio público', CC0: 'CC0', 'CC-BY-4.0': 'CC BY', 'CC-BY-SA-4.0': 'CC BY-SA', 'CC-BY-NC-4.0': 'CC BY-NC', 'CC-BY-ND-4.0': 'CC BY-ND', CURSO: 'Solo curso', DESCONOCIDO: 'Autor desconocido' };

/**
 * Mete una pieza del catálogo al proyecto. Si el almacén falla al guardar el archivo,
 * retira el elemento y propaga el error.
 * @param {object} sesion de crearSesion
 * @param {object} catalogo de crearCatalogo, ya cargado
 * @param {object} pieza entrada del catálogo
 */
export async function tomarPieza(sesion, catalogo, pieza) {
  const archivo = await catalogo.obtenerArchivo(pieza.id);
  const elemento = sesion.cambiar((proyecto) => {
    const nuevo = agregarElemento(proyecto, { tipo: pieza.tipo, nombre: pieza.titulo, archivo: 'pendiente', origen: 'biblioteca', biblioteca: entradaDeFicha(pieza) });
    nuevo.archivo = `${nuevo.id}.${extensionPorMime(archivo.tipo)}`;
    return nuevo;
  }, { origen: 'biblioteca', estructura: true });
  try {
    await sesion.agregarArchivo(elemento.id, archivo);
  } catch (error) {
    sesion.cambiar((proyecto) => eliminarElemento(proyecto, elemento.id), { origen: 'biblioteca', estructura: true });
    throw error;
  }
  return elemento;
}

/**
 * @param {HTMLElement} contenedor capa oculta hasta abrir()
 * @param {object} catalogo de crearCatalogo, ya cargado
 * @param {{ alElegir: (pieza: object) => void, alCerrar?: () => void }} opciones
 */
export function crearBiblioteca(contenedor, catalogo, { alElegir, alCerrar = () => {} }) {
  let abierto = false;
  let filtro = 'fondo';

  function tarjeta(pieza) {
    const url = catalogo.urlDe(pieza);
    const vista = medioDeTipo(pieza.tipo) === 'imagen'
      ? h('img', { class: 'biblioteca-vista', src: url, alt: '' })
      : h('audio', { class: 'biblioteca-vista', controls: true, preload: 'none', src: url });
    return h('article', { class: 'biblioteca-pieza', dataset: { pieza: pieza.id } },
      h('div', { class: `biblioteca-marco marco-${pieza.tipo}` }, vista),
      h('h3', {}, pieza.titulo),
      h('p', { class: 'biblioteca-autor' }, pieza.autor),
      h('p', { class: 'biblioteca-licencia' },
        h('span', { class: `chip licencia-${pieza.licencia}` }, ABREVIATURAS[pieza.licencia] ?? pieza.licencia),
        pieza.condiciones.map((c) => h('span', { class: 'chip', title: ETIQUETAS.condiciones[c] }, c))),
      h('button', { type: 'button', class: 'btn btn-primary btn-sm', dataset: { accion: 'usar' }, onclick: () => { cerrar(); alElegir(pieza); } }, 'Usar esta pieza'));
  }

  function dibujar() {
    const piezas = catalogo.piezas().filter((p) => p.tipo === filtro);
    vaciar(contenedor).append(h('div', { class: 'biblioteca', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'biblioteca-titulo', onkeydown: (e) => { if (e.key === 'Escape') cerrar(); } },
      h('div', { class: 'mapa-cabecera' },
        h('div', {},
          h('h2', { id: 'biblioteca-titulo' }, 'Biblioteca'),
          h('p', { class: 'mapa-resumen' }, catalogo.provisional()
            ? 'Catálogo provisional: piezas generadas por programa; la licencia de cada una es parte del ejercicio.'
            : `${catalogo.piezas().length} piezas con licencias reales, verificadas en la fuente.`)),
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'cerrar-biblioteca' }, onclick: cerrar }, 'Cerrar')),
      h('div', { class: 'biblioteca-filtros', role: 'tablist', 'aria-label': 'Tipo de pieza' },
        Object.entries(FILTROS).map(([tipo, texto]) => h('button', {
          type: 'button',
          role: 'tab',
          class: `btn btn-sm ${tipo === filtro ? 'btn-primary' : 'btn-ghost'}`,
          'aria-selected': tipo === filtro ? 'true' : 'false',
          dataset: { filtro: tipo },
          onclick: () => { filtro = tipo; dibujar(); },
        }, `${texto} (${catalogo.piezas().filter((p) => p.tipo === tipo).length})`))),
      piezas.length ? h('div', { class: 'biblioteca-piezas' }, piezas.map(tarjeta)) : h('p', { class: 'vacio' }, 'No hay piezas de este tipo.')));
    contenedor.querySelector(`[data-filtro="${filtro}"]`)?.focus();
  }

  function abrir(tipo = filtro) {
    if (TIPOS_BIBLIOTECA.includes(tipo)) filtro = tipo;
    abierto = true;
    contenedor.hidden = false;
    dibujar();
  }

  function cerrar() {
    if (!abierto) return;
    abierto = false;
    vaciar(contenedor);
    contenedor.hidden = true;
    alCerrar();
  }

  return { abrir, cerrar, get abierto() { return abierto; } };
}
