// plataforma/js/editor/editor.js
// Arma el editor (spec, sección 7): barra, inventario, escena activa (vista previa y
// guion), propiedades, avisos, y el reproductor sobre el editor. Coordina la selección
// y decide qué redibujar con cada cambio según su origen y si cambió la estructura.
import { h, vaciar, anunciar, descargar } from '../ui/dom.js';
import { exportarCopia, importarCopia } from '../estado/copias.js';
import { jugar } from '../motor/reproductor.js';
import { crearBarra } from './barra.js';
import { crearInventario, NOMBRES_TIPO } from './inventario.js';
import { crearGuion } from './guion.js';
import { crearVistaPrevia } from './vista-previa.js';
import { crearPropiedades } from './propiedades.js';
import { subirElemento, validarSubida, nombreSugerido, TIPOS_POR_MEDIO, ACEPTA } from './subida.js';

const AVISO_MS = 6000;

/** Créditos provisionales del reproductor hasta que el plan 6 traiga juridico/cadena.js. */
export function creditosProvisionales(proyecto) {
  const lineas = [`${proyecto.estudiante?.trim() || 'Sin nombre'}: autor(a) del juego y de la historia`];
  for (const elemento of proyecto.juego.elementos) {
    const credito = proyecto.fichas[elemento.id]?.credito?.trim();
    if (credito) lineas.push(credito);
  }
  return lineas;
}

/** «La llave del faro» → la-llave-del-faro, para nombrar descargas. */
export function nombreDeArchivo(texto) {
  const limpio = String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return limpio || 'sin-nombre';
}

/** Abre el selector de archivos del navegador. Resuelve con el File o con null si se cancela. */
export function elegirArchivoDelNavegador(accept) {
  return new Promise((resolver) => {
    const entrada = h('input', { type: 'file', accept, hidden: true });
    const terminar = (archivo) => { entrada.remove(); resolver(archivo); };
    entrada.addEventListener('change', () => terminar(entrada.files?.[0] ?? null));
    entrada.addEventListener('cancel', () => terminar(null));
    document.body.append(entrada);
    entrada.click();
  });
}

/**
 * @param {HTMLElement} contenedor
 * @param {object} sesion de crearSesion
 * @param {object} opciones contenido (juridico.json), JSZip, descargarArchivo(blob, nombre),
 *   confirmar(mensaje) → boolean, elegirArchivo(accept) → Promise<File|null>, alNuevoJuego() → Promise
 */
export function crearEditor(contenedor, sesion, {
  contenido = null,
  JSZip = globalThis.JSZip,
  descargarArchivo = descargar,
  confirmar = (mensaje) => window.confirm(mensaje),
  elegirArchivo = elegirArchivoDelNavegador,
  alNuevoJuego = async () => {},
} = {}) {
  let seleccion = null;
  let escenaActivaId = null;
  let reproductor = null;

  // ---- estructura de la página ----
  const zonaBarra = h('div', { class: 'zona-barra' });
  const zonaInventario = h('aside', { class: 'columna columna-inventario', 'aria-label': 'Inventario' });
  const zonaVistaPrevia = h('div', { class: 'zona-vista-previa' });
  const zonaGuion = h('div', { class: 'zona-guion' });
  const zonaPropiedades = h('aside', { class: 'columna columna-propiedades', 'aria-label': 'Propiedades' });
  const zonaAvisos = h('div', { class: 'avisos' });
  const zonaDialogo = h('div', { class: 'capa-dialogo', hidden: true });
  const zonaReproductor = h('div', { class: 'capa-reproductor', hidden: true });
  const estadoGuardado = h('span', { class: 'estado-guardado', 'aria-live': 'polite' });
  const botonJugarAqui = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'jugar-aqui' }, onclick: () => jugarDesde(escenaActivaId) }, '▶ Jugar desde esta escena');
  vaciar(contenedor).append(
    zonaBarra,
    h('div', { class: 'editor', id: 'contenido' },
      zonaInventario,
      h('main', { class: 'columna columna-centro' }, zonaVistaPrevia, h('div', { class: 'centro-acciones' }, botonJugarAqui, estadoGuardado), zonaGuion),
      zonaPropiedades),
    zonaAvisos,
    zonaDialogo,
    zonaReproductor,
  );

  // ---- vistas ----
  const barra = crearBarra(zonaBarra, sesion, {
    alJugar: () => jugarDesde(sesion.proyecto.juego.escenaInicial),
    alGuardarCopia: guardarCopia,
    alAbrirCopia: abrirCopia,
    alNuevoJuego: nuevoJuego,
    alPublicar: () => avisar('La publicación llega en una versión siguiente. Por ahora el candado te dice qué falta.'),
  });
  const inventario = crearInventario(zonaInventario, sesion, { alSeleccionar: (s) => seleccionar(s), alSubir: subirArchivo });
  const vistaPrevia = crearVistaPrevia(zonaVistaPrevia, sesion);
  const guion = crearGuion(zonaGuion, sesion, {
    alSeleccionar: (indice) => seleccionar(indice === null ? { tipo: 'escena', id: escenaActivaId } : { tipo: 'linea', escena: escenaActivaId, indice }, { redibujarGuion: false }),
    confirmar,
  });
  const propiedades = crearPropiedades(zonaPropiedades, sesion, { contenido, alSeleccionar: (s) => seleccionar(s), confirmar });

  // ---- selección y redibujado ----
  const escenaActiva = () => sesion.proyecto.juego.escenas.find((e) => e.id === escenaActivaId) ?? null;
  const escenaDe = (s) => (s?.tipo === 'escena' ? s.id : s?.tipo === 'linea' ? s.escena : null);

  function normalizar(s) {
    const { juego } = sesion.proyecto;
    if (s) return s;
    if (juego.escenas.some((e) => e.id === escenaActivaId)) return { tipo: 'escena', id: escenaActivaId };
    return juego.escenas[0] ? { tipo: 'escena', id: juego.escenas[0].id } : { tipo: 'juego' };
  }

  function seleccionar(nueva, { redibujarGuion = true } = {}) {
    seleccion = normalizar(nueva);
    const { juego } = sesion.proyecto;
    const escenaId = escenaDe(seleccion);
    const cambioEscena = escenaId !== null && escenaId !== escenaActivaId;
    if (escenaId !== null) escenaActivaId = escenaId;
    if (!juego.escenas.some((e) => e.id === escenaActivaId)) escenaActivaId = juego.escenas[0]?.id ?? null;
    const indice = seleccion.tipo === 'linea' ? seleccion.indice : null;
    inventario.dibujar(seleccion);
    vistaPrevia.dibujar(escenaActiva(), indice);
    propiedades.dibujar(seleccion);
    if (cambioEscena || redibujarGuion) guion.dibujar(escenaActiva(), indice);
    else guion.marcarSeleccion(indice);
    botonJugarAqui.disabled = !escenaActiva();
  }

  function refrescar({ origen, estructura }) {
    const indice = seleccion?.tipo === 'linea' ? seleccion.indice : null;
    barra.dibujar();
    inventario.dibujar(seleccion);
    vistaPrevia.dibujar(escenaActiva(), indice);
    if (estructura || origen !== 'propiedades') propiedades.dibujar(seleccion);
    if (estructura || origen !== 'guion') guion.dibujar(escenaActiva(), indice);
  }

  sesion.suscribir((evento) => {
    if (evento.tipo === 'cambio') {
      estadoGuardado.textContent = 'Guardando…';
      refrescar(evento);
    } else if (evento.tipo === 'guardado') {
      estadoGuardado.textContent = 'Guardado';
    } else if (evento.tipo === 'error') {
      mostrarError(evento.error);
    } else if (evento.tipo === 'recordatorio') {
      avisar('Llevas 50 cambios sin guardar una copia. Descarga una por si acaso.', { accion: ['Guardar copia', guardarCopia] });
    } else if (evento.tipo === 'reemplazo') {
      escenaActivaId = null;
      barra.dibujar();
      seleccionar(null);
    }
  });

  // ---- avisos y errores (spec, sección 17) ----
  function avisar(texto, { accion = null, error = false } = {}) {
    const aviso = h('div', { class: `aviso${error ? ' aviso-error' : ''}`, role: error ? 'alert' : 'status' },
      h('span', { class: 'aviso-texto' }, texto),
      accion ? h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'guardar-copia' }, onclick: () => { aviso.remove(); accion[1](); } }, accion[0]) : null,
      h('button', { type: 'button', class: 'icono', 'aria-label': 'Cerrar aviso', onclick: () => aviso.remove() }, '✕'));
    zonaAvisos.append(aviso);
    anunciar(texto);
    if (!accion) {
      const temporizador = setTimeout(() => aviso.remove(), AVISO_MS);
      temporizador.unref?.();
    }
    return aviso;
  }

  function mostrarError(error) {
    const texto = error?.message ? String(error.message) : String(error);
    return avisar(texto, { error: true, accion: ['Guardar copia', guardarCopia] });
  }

  // ---- reproductor sobre el editor ----
  function cerrarReproductor() {
    reproductor?.cerrar();
    reproductor = null;
  }

  function jugarDesde(escenaInicial) {
    cerrarReproductor();
    zonaReproductor.hidden = false;
    document.body.classList.add('jugando');
    reproductor = jugar(zonaReproductor, sesion.proyecto.juego, (id) => sesion.resolverRecurso(id), {
      escenaInicial,
      creditos: creditosProvisionales(sesion.proyecto),
      alCerrar: () => {
        reproductor = null;
        zonaReproductor.hidden = true;
        document.body.classList.remove('jugando');
        zonaBarra.querySelector('[data-accion="jugar"]')?.focus();
      },
    });
  }

  // ---- copias y nuevo juego (spec, sección 13) ----
  async function guardarCopia() {
    try {
      await sesion.guardarAhora();
      const blob = await exportarCopia(sesion.proyecto, sesion.archivos, { JSZip });
      descargarArchivo(blob, `copia-${nombreDeArchivo(sesion.proyecto.juego.titulo)}.zip`);
      sesion.marcarCopiaGuardada();
      avisar('Copia descargada.');
      return true;
    } catch (error) {
      mostrarError(error);
      return false;
    }
  }

  async function abrirCopia() {
    const archivo = await elegirArchivo('.zip,application/zip');
    if (!archivo) return;
    let copia;
    try {
      copia = await importarCopia(archivo, { JSZip });
    } catch (error) {
      mostrarError(error);
      return;
    }
    const titulo = copia.proyecto.juego.titulo?.trim() || 'Sin título';
    if (!confirmar(`¿Reemplazar el proyecto actual por «${titulo}»? Lo que tienes ahora se perderá si no guardaste una copia.`)) return;
    try {
      cerrarReproductor();
      await sesion.reemplazar(copia.proyecto, copia.archivos);
      avisar('Copia abierta.');
    } catch (error) {
      mostrarError(error);
    }
  }

  async function nuevoJuego() {
    if (!confirmar('¿Empezar un juego nuevo? El proyecto actual se borrará de este navegador.')) return;
    if (confirmar('¿Quieres guardar una copia del proyecto actual antes?')) {
      const descargada = await guardarCopia();
      if (!descargada) return;
    }
    cerrarReproductor();
    await alNuevoJuego();
  }

  // ---- subida de archivos (spec, sección 10) ----
  function elegirTipo(tipos, nombre) {
    return new Promise((resolver) => {
      const cerrar = (valor) => {
        vaciar(zonaDialogo);
        zonaDialogo.hidden = true;
        resolver(valor);
      };
      zonaDialogo.hidden = false;
      vaciar(zonaDialogo).append(h('div', { class: 'dialogo', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dialogo-titulo' },
        h('h2', { id: 'dialogo-titulo' }, `¿Qué es «${nombre}»?`),
        h('div', { class: 'acciones' },
          tipos.map((tipo) => h('button', { type: 'button', class: 'btn btn-primary btn-sm', dataset: { tipo }, onclick: () => cerrar(tipo) }, NOMBRES_TIPO[tipo])),
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { tipo: 'cancelar' }, onclick: () => cerrar(null) }, 'Cancelar'))));
      zonaDialogo.querySelector('button')?.focus();
    });
  }

  async function subirArchivo() {
    const archivo = await elegirArchivo(`${ACEPTA.imagen},${ACEPTA.audio}`);
    if (!archivo) return;
    const resultado = validarSubida(archivo);
    if (!resultado.ok) {
      mostrarError(new Error(resultado.mensaje));
      return;
    }
    const tipo = await elegirTipo(TIPOS_POR_MEDIO[resultado.medio], nombreSugerido(archivo.name));
    if (!tipo) return;
    try {
      const elemento = await subirElemento(sesion, archivo, { tipo });
      seleccionar({ tipo: 'elemento', id: elemento.id });
      avisar(`«${elemento.nombre}» entró al juego como ${NOMBRES_TIPO[tipo].toLowerCase()}.`);
    } catch (error) {
      mostrarError(error);
    }
  }

  // ---- arranque ----
  barra.dibujar();
  seleccionar({ tipo: 'escena', id: sesion.proyecto.juego.escenaInicial });

  return {
    seleccionar,
    guardarCopia,
    abrirCopia,
    nuevoJuego,
    subirArchivo,
    jugarDesde,
    mostrarError,
    destruir() {
      cerrarReproductor();
      vaciar(contenedor);
    },
  };
}
