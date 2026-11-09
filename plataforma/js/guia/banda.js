// plataforma/js/guia/banda.js
// La banda de guía sobre el editor (diseño del modo guiado, sección 7): progreso con los
// nueve puntos, instrucción y lección de la fase, y sus tareas con «Atrás» y
// «Siguiente». Dibuja desde estadoDeGuia y cambia la fase con sesion.cambiar (origen
// 'guia'). Marca la raíz del editor con data-fase para que el CSS resalte y atenúe.
// También aquí: la retirada automática de los retratos de muestra que ya nadie usa.
import { h, rellenar, conservarFoco, anunciar } from '../ui/dom.js';
import { explicacion } from '../editor/panel-ficha.js';
import { eliminarElemento } from '../estado/modelo.js';
import { puedePublicar } from '../estado/validacion.js';
import { FASES, estadoDeGuia } from './fases.js';

/** Desde este ancho la lección se muestra abierta; por debajo, plegada bajo «Ver la lección». */
export const ANCHO_LECCION_ABIERTA = 1200;

const entradaDe = (contenido, clave) => clave.split('.').reduce((o, k) => o?.[k], contenido) ?? null;
const etiquetaFase = (i) => (i === 0 ? 'Inicio' : `Fase ${i} de ${FASES.length - 1}`);

/**
 * Elimina los elementos de muestra que ningún personaje usa (y sus archivos). El estudiante
 * nunca los borra a mano. Devuelve los ids retirados. Los archivos se borran después de guardar
 * el proyecto sin esos elementos: si se cierra la pestaña en medio, el proyecto guardado nunca
 * apunta a un archivo que ya no está.
 * @param {object} sesion de crearSesion
 * @param {(error: Error) => void} alError si el almacén no pudo borrar un archivo
 */
export function retirarMuestrasSinUso(sesion, alError = () => {}) {
  const { juego } = sesion.proyecto;
  const usados = new Set(juego.personajes.map((p) => p.retrato).filter(Boolean));
  const sobrantes = juego.elementos.filter((e) => e.origen === 'muestra' && !usados.has(e.id)).map((e) => e.id);
  if (!sobrantes.length) return [];
  sesion.cambiar((p) => { for (const id of sobrantes) eliminarElemento(p, id); }, { origen: 'guia', estructura: true });
  sesion.guardarAhora()
    .then(() => Promise.all(sobrantes.map((id) => sesion.quitarArchivo(id))))
    .catch(alError);
  return sobrantes;
}

/**
 * @param {HTMLElement} contenedor la sección aria-label="Guía"
 * @param {object} sesion de crearSesion
 * @param {object} opciones contenido (juridico.json); raiz (recibe data-fase); alJugar, alMapa, alPublicar;
 *   anunciar(texto) o null para que solo devuelva el mensaje; anchoVentana() → px.
 * @returns {{ dibujar: () => string|null }} dibujar devuelve el mensaje para lectores de pantalla, o null.
 */
export function crearBanda(contenedor, sesion, {
  contenido = {},
  raiz = null,
  alJugar = null,
  alMapa = null,
  alPublicar = null,
  anunciar: anunciarTexto = anunciar,
  anchoVentana = () => globalThis.innerWidth ?? ANCHO_LECCION_ABIERTA,
} = {}) {
  let previo = null; // { fase, cumplidas: Set<índice>, completa } del dibujo anterior
  let leccionAbierta = null; // null hasta el primer dibujo: lo decide el ancho

  function irA(id) {
    const estado = estadoDeGuia(sesion.proyecto);
    if (estado.actual.id === id || !estado.puedeIrA(id)) return;
    sesion.cambiar((p) => { p.guia.fase = id; }, { origen: 'guia' });
  }

  function mensajeDe(estado) {
    const ahora = {
      fase: estado.actual.id,
      cumplidas: new Set(estado.actual.tareas.flatMap((t, i) => (t.cumplida ? [i] : []))),
      completa: estado.actual.completa,
    };
    const antes = previo;
    previo = ahora;
    if (!antes) return null;
    if (antes.fase !== ahora.fase) return `${etiquetaFase(estado.indiceActual)}: ${estado.actual.nombre}.`;
    if (ahora.completa && !antes.completa) return `Fase completa: ${estado.actual.nombre}. Ya puedes pasar a la siguiente.`;
    const nuevas = [...ahora.cumplidas].filter((i) => !antes.cumplidas.has(i)).map((i) => estado.actual.tareas[i].texto);
    return nuevas.length ? `Tarea cumplida: ${nuevas.join('. ')}.` : null;
  }

  function accionDe(id) {
    if (id === 'conocer' && alJugar) return h('button', { type: 'button', class: 'btn btn-primary btn-sm', dataset: { foco: 'guia-jugar', accion: 'guia-jugar' }, onclick: alJugar }, 'Jugar el ejemplo');
    if (id === 'destino' && alMapa) return h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { foco: 'guia-mapa', accion: 'guia-mapa' }, onclick: alMapa }, 'Abrir el mapa de activos');
    if (id === 'publicar' && alPublicar) {
      const listo = puedePublicar(sesion.proyecto).ok;
      return h('button', { type: 'button', class: 'btn btn-primary btn-sm', dataset: { foco: 'guia-publicar', accion: 'guia-publicar' }, disabled: !listo, title: listo ? null : 'Pasa el cursor por «Publicar» en la barra para ver qué falta', onclick: () => { if (puedePublicar(sesion.proyecto).ok) alPublicar(); } }, 'Publicar');
    }
    return null;
  }

  function tarea(t) {
    return h('li', { class: t.cumplida ? 'cumplida' : null },
      h('span', { class: 'banda-casilla', 'aria-hidden': 'true' }, t.cumplida ? '☑' : '☐'),
      h('span', {},
        h('span', { class: 'sr-only' }, t.cumplida ? 'Cumplida: ' : 'Pendiente: '),
        h('span', { class: 'banda-tarea' }, t.texto),
        t.detalle ? h('span', { class: 'banda-detalle' }, ` (${t.detalle})`) : null));
  }

  function dibujar() {
    const estado = estadoDeGuia(sesion.proyecto);
    const mensaje = mensajeDe(estado);
    const fase = FASES[estado.indiceActual];
    const i = estado.indiceActual;
    if (raiz) raiz.dataset.fase = fase.id;
    if (leccionAbierta === null) leccionAbierta = anchoVentana() >= ANCHO_LECCION_ABIERTA;
    const leccion = fase.leccion.map((clave) => explicacion(entradaDe(contenido, clave))).filter(Boolean);
    const teniaFoco = contenedor.contains(document.activeElement);
    conservarFoco(contenedor, () => {
      rellenar(contenedor, h('div', { class: 'banda' },
        h('div', { class: 'banda-progreso' },
          h('p', { class: 'banda-fase', tabIndex: -1 }, `${etiquetaFase(i)} · `, h('strong', {}, fase.nombre)),
          h('ol', { class: 'banda-puntos', 'aria-label': 'Fases de la guía' }, estado.fases.map((f, j) => h('li', {},
            h('button', {
              type: 'button',
              class: `banda-punto${f.completa ? ' cumplida' : ''}`,
              dataset: { foco: `guia-punto:${f.id}`, fase: f.id },
              'aria-current': j === i ? 'step' : null,
              'aria-label': `${etiquetaFase(j)}: ${f.nombre}${f.completa ? ' (cumplida)' : ''}`,
              disabled: !estado.puedeIrA(f.id),
              onclick: () => irA(f.id),
            }, f.completa ? '✓' : String(j)))))),
        h('div', { class: 'banda-centro' },
          h('p', { class: 'banda-instruccion' }, fase.instruccion),
          accionDe(fase.id),
          leccion.length ? h('details', { class: 'banda-leccion', open: leccionAbierta, ontoggle: (e) => { leccionAbierta = e.currentTarget.open; } },
            h('summary', {}, 'Ver la lección'), leccion) : null),
        h('div', { class: 'banda-tareas' },
          h('ul', { class: 'banda-lista' }, estado.actual.tareas.map(tarea)),
          h('div', { class: 'banda-botones' },
            h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { foco: 'guia-atras', accion: 'guia-atras' }, disabled: i === 0, onclick: () => irA(FASES[i - 1].id) }, 'Atrás'),
            i < FASES.length - 1
              ? h('button', { type: 'button', class: 'btn btn-primary btn-sm', dataset: { foco: 'guia-siguiente', accion: 'guia-siguiente' }, disabled: !estado.puedeAvanzar, onclick: () => irA(FASES[i + 1].id) }, 'Siguiente')
              : null))));
    });
    // Si el botón que tenía el foco quedó deshabilitado (Siguiente en una fase nueva), el foco va al título de la fase.
    if (teniaFoco && !contenedor.contains(document.activeElement)) contenedor.querySelector('.banda-fase')?.focus();
    if (mensaje && anunciarTexto) anunciarTexto(mensaje);
    return mensaje;
  }

  return { dibujar };
}
