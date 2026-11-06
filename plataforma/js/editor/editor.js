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
import { evaluarTodo } from '../juridico/semaforo.js';
import { creditos } from '../juridico/cadena.js';
import { nombreDe } from '../estado/validacion.js';
import { crearMapaActivos } from './mapa-activos.js';
import { crearBiblioteca, tomarPieza } from './biblioteca.js';
import { crearElementoCreado, reemplazarArchivoCreado } from './creados.js';
import { nombreDeArchivo } from '../estado/archivos.js';
import { crearPublicar } from './publicar.js';
import { generarEntrega } from '../exportar/paquete.js';

const AVISO_MS = 6000;

export { nombreDeArchivo };

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
 *   confirmar(mensaje) → boolean, elegirArchivo(accept) → Promise<File|null>, alNuevoJuego() → Promise,
 *   catalogo (de crearCatalogo, ya cargado; null si la biblioteca no está disponible), avisoInicial (texto que se muestra al abrir),
 *   crearHerramientas(contenedor) → { pixelart, grabador, secuenciador } (cada una con abrir(); null si no hay herramientas),
 *   cargarMotor() → Promise<{ modulos, estilos }> (el motor que se incrusta en juego.html; null si no se puede publicar),
 *   nombreProducto (para el informe), ahora() → Date.
 */
export function crearEditor(contenedor, sesion, {
  contenido = null,
  JSZip = globalThis.JSZip,
  descargarArchivo = descargar,
  confirmar = (mensaje) => window.confirm(mensaje),
  elegirArchivo = elegirArchivoDelNavegador,
  alNuevoJuego = async () => {},
  catalogo = null,
  avisoInicial = null,
  crearHerramientas = null,
  cargarMotor = null,
  nombreProducto = contenido?.nombre ?? 'Mi primer videojuego',
  ahora = () => new Date(),
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
  const zonaMapa = h('div', { class: 'capa-mapa', hidden: true });
  const zonaBiblioteca = h('div', { class: 'capa-biblioteca', hidden: true });
  const zonaHerramienta = h('div', { class: 'capa-herramienta', hidden: true });
  const zonaPublicar = h('div', { class: 'capa-publicar', hidden: true });
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
    zonaBiblioteca,
    zonaHerramienta,
    zonaPublicar,
    zonaMapa,
    zonaReproductor,
  );
  const herramientas = crearHerramientas ? crearHerramientas(zonaHerramienta) : null;

  // ---- vistas ----
  const barra = crearBarra(zonaBarra, sesion, {
    alJugar: () => jugarDesde(sesion.proyecto.juego.escenaInicial),
    alMapa: () => abrirMapa(),
    alGuardarCopia: guardarCopia,
    alAbrirCopia: abrirCopia,
    alNuevoJuego: nuevoJuego,
    alPublicar: () => abrirPublicar(),
  });
  const inventario = crearInventario(zonaInventario, sesion, {
    alSeleccionar: (s) => seleccionar(s),
    alSubir: subirArchivo,
    alBiblioteca: catalogo ? () => abrirBiblioteca() : null,
    alCrear: herramientas ? (clave) => crearConHerramienta(clave) : null,
  });
  const vistaPrevia = crearVistaPrevia(zonaVistaPrevia, sesion);
  const guion = crearGuion(zonaGuion, sesion, {
    alSeleccionar: (indice) => seleccionar(indice === null ? { tipo: 'escena', id: escenaActivaId } : { tipo: 'linea', escena: escenaActivaId, indice }, { redibujarGuion: false }),
    confirmar,
  });
  const propiedades = crearPropiedades(zonaPropiedades, sesion, {
    contenido,
    alSeleccionar: (s) => seleccionar(s),
    confirmar,
    piezaDe: (id) => catalogo?.piezaDe(id) ?? null,
    alEditarPixel: herramientas ? (id) => editarPixel(id) : null,
  });
  const biblioteca = catalogo ? crearBiblioteca(zonaBiblioteca, catalogo, {
    alElegir: usarPieza,
    alCerrar: () => {
      document.body.classList.remove('con-biblioteca');
      zonaInventario.querySelector('[data-accion="biblioteca"]')?.focus();
    },
  }) : null;

  function abrirBiblioteca() {
    document.body.classList.add('con-biblioteca');
    biblioteca.abrir();
  }

  /** Mete la pieza elegida al juego y abre su ficha, que llega precargada desde el catálogo. */
  async function usarPieza(pieza) {
    try {
      const elemento = await tomarPieza(sesion, catalogo, pieza);
      seleccionar({ tipo: 'elemento', id: elemento.id }, { enfocar: `ficha:${elemento.id}` });
      avisar(`«${elemento.nombre}» entró al juego desde la biblioteca, con su ficha precargada.`);
    } catch (error) {
      mostrarError(error);
    }
  }

  const mapa = crearMapaActivos(zonaMapa, sesion, {
    contenido: contenido ?? {},
    alSeleccionar: (s, enfocar) => seleccionar(s, { enfocar }),
    alCerrar: () => {
      document.body.classList.remove('con-mapa');
      zonaBarra.querySelector('[data-accion="mapa"]')?.focus();
    },
  });

  function abrirMapa() {
    document.body.classList.add('con-mapa');
    mapa.abrir();
  }

  // ---- publicación (spec, sección 3 paso 5, 12.7, 13 y 14) ----
  const publicar = crearPublicar(zonaPublicar, sesion, {
    contenido: contenido ?? {},
    alGenerar: generarPaquete,
    alCerrar: () => {
      document.body.classList.remove('con-publicar');
      zonaBarra.querySelector('[data-accion="publicar"]')?.focus();
    },
  });

  function abrirPublicar() {
    document.body.classList.add('con-publicar');
    publicar.abrir();
  }

  /** Escribe la fecha de publicación, genera el paquete y lo descarga. Si algo falla, la fecha vuelve atrás y el error sube a la capa. */
  async function generarPaquete() {
    if (!cargarMotor) throw new Error('No se puede generar el paquete: el motor del juego no está disponible.');
    const motor = await cargarMotor();
    const anterior = sesion.proyecto.publicado;
    sesion.cambiar((p) => { p.publicado = ahora().toISOString(); }, { origen: 'publicar' });
    let paquete;
    try {
      paquete = await generarEntrega(sesion.proyecto, sesion.archivos, { JSZip, contenido: contenido ?? {}, motor, nombreProducto, ahora: ahora() });
    } catch (error) {
      sesion.cambiar((p) => { p.publicado = anterior; }, { origen: 'publicar' });
      throw error;
    }
    await sesion.guardarAhora();
    descargarArchivo(paquete.blob, paquete.nombre);
    sesion.marcarCopiaGuardada();
    avisar(`Paquete descargado: ${paquete.nombre}. Súbelo al formulario del curso. También sirve como copia del proyecto («Abrir copia» lo acepta): guárdalo bien.`, { accion: ['Guardar copia', guardarCopia] });
  }

  // ---- selección y redibujado ----
  const escenaActiva = () => sesion.proyecto.juego.escenas.find((e) => e.id === escenaActivaId) ?? null;
  const escenaDe = (s) => (s?.tipo === 'escena' ? s.id : s?.tipo === 'linea' ? s.escena : null);

  function normalizar(s) {
    const { juego } = sesion.proyecto;
    if (s) return s;
    if (juego.escenas.some((e) => e.id === escenaActivaId)) return { tipo: 'escena', id: escenaActivaId };
    return juego.escenas[0] ? { tipo: 'escena', id: juego.escenas[0].id } : { tipo: 'juego' };
  }

  function seleccionar(nueva, { redibujarGuion = true, enfocar = null } = {}) {
    seleccion = normalizar(nueva);
    const { juego } = sesion.proyecto;
    const escenaId = escenaDe(seleccion);
    const cambioEscena = escenaId !== null && escenaId !== escenaActivaId;
    if (escenaId !== null) escenaActivaId = escenaId;
    if (!juego.escenas.some((e) => e.id === escenaActivaId)) escenaActivaId = juego.escenas[0]?.id ?? null;
    const indice = seleccion.tipo === 'linea' ? seleccion.indice : null;
    inventario.dibujar(seleccion);
    vistaPrevia.dibujar(escenaActiva(), indice);
    propiedades.dibujar(seleccion, { enfocar });
    if (cambioEscena || redibujarGuion) guion.dibujar(escenaActiva(), indice);
    else guion.marcarSeleccion(indice);
    botonJugarAqui.disabled = !escenaActiva();
  }

  // Colores de todas las fichas, para anunciar a lectores de pantalla los que cambian (spec, sección 16).
  const coloresDe = () => new Map([...evaluarTodo(sesion.proyecto)].map(([id, r]) => [id, r.color]));
  let colores = coloresDe();

  function anunciarSemaforos() {
    const nuevos = coloresDe();
    const cambios = [...nuevos].filter(([id, color]) => colores.has(id) && colores.get(id) !== color);
    colores = nuevos;
    if (cambios.length) anunciar(cambios.map(([id, color]) => `Semáforo de «${nombreDe(sesion.proyecto, id)}»: ${color}`).join('. '));
  }

  function refrescar({ origen, estructura }) {
    const indice = seleccion?.tipo === 'linea' ? seleccion.indice : null;
    barra.dibujar();
    inventario.dibujar(seleccion);
    vistaPrevia.dibujar(escenaActiva(), indice);
    if (estructura || (origen !== 'propiedades' && origen !== 'publicar')) propiedades.dibujar(seleccion);
    if (estructura || (origen !== 'guion' && origen !== 'publicar')) guion.dibujar(escenaActiva(), indice);
    mapa.dibujar();
    anunciarSemaforos();
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
      colores = coloresDe();
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
      creditos: creditos(sesion.proyecto),
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
      biblioteca?.cerrar();
      mapa.cerrar();
      publicar.cerrar();
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
    biblioteca?.cerrar();
    mapa.cerrar();
    publicar.cerrar();
    cerrarReproductor();
    await alNuevoJuego();
  }

  // ---- subida de archivos (spec, sección 10) ----
  function elegirTipo(tipos, nombre, titulo = `¿Qué es «${nombre}»?`) {
    return new Promise((resolver) => {
      const cerrar = (valor) => {
        vaciar(zonaDialogo);
        zonaDialogo.hidden = true;
        resolver(valor);
      };
      zonaDialogo.hidden = false;
      vaciar(zonaDialogo).append(h('div', { class: 'dialogo', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dialogo-titulo' },
        h('h2', { id: 'dialogo-titulo' }, titulo),
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
      seleccionar({ tipo: 'elemento', id: elemento.id }, { enfocar: `ficha:${elemento.id}:autoria` });
      avisar(`«${elemento.nombre}» entró al juego como ${NOMBRES_TIPO[tipo].toLowerCase()}.`);
    } catch (error) {
      mostrarError(error);
    }
  }

  // ---- herramientas de creación (spec, sección 9) ----
  const NOMBRES_CREADO = { fondo: 'Fondo creado', retrato: 'Retrato creado', voz: 'Grabación', efecto: 'Efecto grabado', musica: 'Pista' };

  function nombreCreado(tipo) {
    const n = sesion.proyecto.juego.elementos.filter((e) => e.tipo === tipo && e.origen === 'creado').length + 1;
    return `${NOMBRES_CREADO[tipo]} ${n}`;
  }

  async function conHerramientaAbierta(fn) {
    document.body.classList.add('con-herramienta');
    try {
      return await fn();
    } finally {
      document.body.classList.remove('con-herramienta');
    }
  }

  /** Abre la herramienta pedida ('pixel', 'grabar' o 'secuencia') y mete lo que devuelva como elemento creado. */
  async function crearConHerramienta(clave) {
    let tipo;
    let blob;
    if (clave === 'pixel') {
      tipo = await elegirTipo(['fondo', 'retrato'], null, '¿Qué vas a dibujar?');
      if (!tipo) return;
      blob = await conHerramientaAbierta(() => herramientas.pixelart.abrir({ tipo }));
    } else if (clave === 'grabar') {
      tipo = await elegirTipo(['voz', 'efecto'], null, '¿Qué vas a grabar?');
      if (!tipo) return;
      blob = await conHerramientaAbierta(() => herramientas.grabador.abrir({ alSubirEnSuLugar: () => subirArchivo() }));
    } else if (clave === 'secuencia') {
      tipo = 'musica';
      blob = await conHerramientaAbierta(() => herramientas.secuenciador.abrir());
    } else {
      return;
    }
    if (!blob) return;
    try {
      const elemento = await crearElementoCreado(sesion, blob, { tipo, nombre: nombreCreado(tipo) });
      seleccionar({ tipo: 'elemento', id: elemento.id }, { enfocar: `ficha:${elemento.id}` });
      avisar(`«${elemento.nombre}» entró al juego como obra tuya, con sello de creación.`);
    } catch (error) {
      mostrarError(error);
    }
  }

  /** Reabre un fondo o retrato creado dentro en el pixel art; al guardar se reemplaza el archivo y se recalcula el sello. */
  async function editarPixel(id) {
    const elemento = sesion.proyecto.juego.elementos.find((e) => e.id === id);
    if (!elemento) return;
    const blob = await conHerramientaAbierta(() => herramientas.pixelart.abrir({ tipo: elemento.tipo, archivo: sesion.archivos.get(id) ?? null }));
    if (!blob) return;
    try {
      await reemplazarArchivoCreado(sesion, id, blob);
      seleccionar({ tipo: 'elemento', id });
      avisar(`«${elemento.nombre}» se actualizó, con un sello de creación nuevo.`);
    } catch (error) {
      mostrarError(error);
    }
  }

  // ---- arranque ----
  barra.dibujar();
  seleccionar({ tipo: 'escena', id: sesion.proyecto.juego.escenaInicial });
  if (avisoInicial) avisar(avisoInicial);

  return {
    seleccionar,
    guardarCopia,
    abrirCopia,
    nuevoJuego,
    subirArchivo,
    usarPieza,
    crearConHerramienta,
    editarPixel,
    jugarDesde,
    publicar: abrirPublicar,
    mostrarError,
    destruir() {
      biblioteca?.cerrar();
      mapa.cerrar();
      publicar.cerrar();
      cerrarReproductor();
      vaciar(contenedor);
    },
  };
}
