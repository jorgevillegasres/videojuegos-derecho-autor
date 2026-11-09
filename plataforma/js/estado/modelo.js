// plataforma/js/estado/modelo.js
// El documento del juego: cómo se crea y cómo cambia. Las funciones mutan el
// proyecto que reciben y devuelven lo que crean. No tocan el DOM ni el almacén.
// Convenciones: se valida antes de mutar; un id o índice inexistente se ignora
// sin error; la validez estructural (nombres vacíos, opciones de más o de menos,
// referencias rotas) la informa validar(), no los mutadores.
import { crearFicha, DESTINOS } from '../juridico/ficha.js';
import { indiceCorte } from './corte.js';

export { DESTINOS, indiceCorte };

export const VERSION_PROYECTO = 1;
export const TIPOS_ELEMENTO = ['fondo', 'retrato', 'musica', 'efecto', 'voz'];
export const ORIGENES = ['creado', 'subido', 'biblioteca', 'muestra'];
/** Las nueve fases del modo guiado, en orden (diseño del modo guiado, sección 6). */
export const FASES_GUIA = ['conocer', 'historia', 'personajes', 'retratos', 'fondo', 'sonido', 'voz', 'destino', 'publicar'];
export const TIPOS_LINEA = ['narracion', 'dialogo', 'decision', 'fin'];

export function nuevoId(prefijo) {
  return `${prefijo}_${crypto.randomUUID().replaceAll('-', '').slice(0, 8)}`;
}

export function crearProyecto({ estudiante = '', titulo = '', destino = 'gratis' } = {}, ahora = new Date()) {
  if (!DESTINOS.includes(destino)) throw new Error(`Destino inválido: ${destino}`);
  const escena = crearEscena('Escena 1');
  return {
    version: VERSION_PROYECTO,
    estudiante,
    creado: ahora.toISOString(),
    juego: { titulo, sinopsis: '', destino, escenaInicial: escena.id, escenas: [escena], personajes: [], elementos: [] },
    fichas: { titulo: crearFicha('titulo'), historia: crearFicha('historia') },
    registro: [],
    publicado: null,
    guia: { fase: FASES_GUIA[0], jugado: false },
  };
}

/**
 * Deja proyecto.guia con una fase conocida y jugado booleano. Un proyecto de la
 * primera versión (sin guía) empieza en la fase inicial. Devuelve true solo si había
 * una fase escrita que no se reconoce, para que quien abre la copia lo avise.
 */
export function asegurarGuia(proyecto) {
  const guia = proyecto.guia !== null && typeof proyecto.guia === 'object' ? proyecto.guia : {};
  const desconocida = guia.fase !== undefined && !FASES_GUIA.includes(guia.fase);
  proyecto.guia = {
    fase: FASES_GUIA.includes(guia.fase) ? guia.fase : FASES_GUIA[0],
    jugado: guia.jugado === true,
  };
  return desconocida;
}

// ---- Escenas ----

export function crearEscena(nombre = '') {
  return { id: nuevoId('esc'), nombre, fondo: null, musica: null, lineas: [] };
}

export function agregarEscena(proyecto, nombre = '') {
  const escena = crearEscena(nombre);
  proyecto.juego.escenas.push(escena);
  return escena;
}

export function eliminarEscena(proyecto, id) {
  const { juego } = proyecto;
  juego.escenas = juego.escenas.filter((e) => e.id !== id);
  for (const escena of juego.escenas) {
    for (const linea of escena.lineas) {
      if (linea.tipo !== 'decision') continue;
      for (const opcion of linea.opciones) if (opcion.escena === id) opcion.escena = null;
    }
  }
  if (juego.escenaInicial === id) juego.escenaInicial = juego.escenas[0]?.id ?? null;
}

// ---- Personajes ----

export function agregarPersonaje(proyecto, { nombre = '', descripcion = '' } = {}) {
  const personaje = { id: nuevoId('per'), nombre, descripcion, retrato: null };
  proyecto.juego.personajes.push(personaje);
  proyecto.fichas[personaje.id] = crearFicha('personaje');
  return personaje;
}

export function eliminarPersonaje(proyecto, id) {
  const { juego } = proyecto;
  juego.personajes = juego.personajes.filter((p) => p.id !== id);
  for (const escena of juego.escenas) {
    for (const linea of escena.lineas) if (linea.tipo === 'dialogo' && linea.personaje === id) linea.personaje = null;
  }
  delete proyecto.fichas[id];
}

// ---- Elementos ----

export function agregarElemento(proyecto, { tipo, nombre, archivo, origen, sello = null, biblioteca = null }) {
  if (!TIPOS_ELEMENTO.includes(tipo)) throw new Error(`Tipo de elemento inválido: ${tipo}`);
  if (!ORIGENES.includes(origen)) throw new Error(`Origen inválido: ${origen}`);
  const ficha = crearFicha(tipo, { origen, biblioteca });
  const elemento = { id: nuevoId('el'), tipo, nombre, archivo, origen, sello, biblioteca };
  proyecto.juego.elementos.push(elemento);
  proyecto.fichas[elemento.id] = ficha;
  return elemento;
}

export function eliminarElemento(proyecto, id) {
  const { juego } = proyecto;
  juego.elementos = juego.elementos.filter((e) => e.id !== id);
  for (const personaje of juego.personajes) if (personaje.retrato === id) personaje.retrato = null;
  for (const escena of juego.escenas) {
    if (escena.fondo === id) escena.fondo = null;
    if (escena.musica === id) escena.musica = null;
    for (const linea of escena.lineas) {
      if (linea.tipo !== 'dialogo') continue;
      if (linea.efecto === id) linea.efecto = null;
      if (linea.voz === id) linea.voz = null;
    }
  }
  delete proyecto.fichas[id];
}

// ---- Líneas ----

export function crearLinea(tipo, datos = {}) {
  switch (tipo) {
    case 'narracion':
      return { tipo, texto: datos.texto ?? '' };
    case 'dialogo':
      return { tipo, personaje: datos.personaje ?? null, texto: datos.texto ?? '', efecto: datos.efecto ?? null, voz: datos.voz ?? null };
    case 'decision':
      return { tipo, texto: datos.texto ?? '', opciones: datos.opciones ?? [{ texto: '', escena: null }, { texto: '', escena: null }] };
    case 'fin':
      return { tipo, texto: datos.texto ?? '' };
    default:
      throw new Error(`Tipo de línea inválido: ${tipo}`);
  }
}

export function agregarLinea(escena, tipo, datos) {
  const linea = crearLinea(tipo, datos);
  escena.lineas.push(linea);
  return linea;
}

export function moverLinea(escena, indice, desplazamiento) {
  const destino = indice + desplazamiento;
  if (indice < 0 || indice >= escena.lineas.length) return;
  if (destino < 0 || destino >= escena.lineas.length) return;
  const [linea] = escena.lineas.splice(indice, 1);
  escena.lineas.splice(destino, 0, linea);
}

export function eliminarLinea(escena, indice) {
  if (indice < 0 || indice >= escena.lineas.length) return;
  escena.lineas.splice(indice, 1);
}

// La regla de corte (indiceCorte) vive en corte.js y se reexporta arriba: el motor la importa de ahí sin arrastrar las fichas.
