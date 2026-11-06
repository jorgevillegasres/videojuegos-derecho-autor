// plataforma/js/editor/subida.js
// Subida de archivos (spec, sección 10): formatos y límites por archivo, lectura y
// alta como elemento con origen 'subido'. La pregunta de autoría que abre la ficha
// al subir llega con el panel de ficha (plan 3).
import { LIMITES, mimePorExtension, extensionPorMime } from '../estado/archivos.js';
import { agregarElemento, eliminarElemento } from '../estado/modelo.js';

export const FORMATOS = {
  imagen: ['image/png', 'image/jpeg', 'image/webp'],
  audio: ['audio/mpeg', 'audio/ogg', 'audio/wav'],
};
export const TIPOS_POR_MEDIO = { imagen: ['fondo', 'retrato'], audio: ['musica', 'efecto', 'voz'] };
/** Valor del atributo accept del <input type="file"> por medio. */
export const ACEPTA = {
  imagen: '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp',
  audio: '.mp3,.ogg,.wav,audio/mpeg,audio/ogg,audio/wav',
};
const SINONIMOS = {
  'image/jpg': 'image/jpeg',
  'audio/x-wav': 'audio/wav',
  'audio/wave': 'audio/wav',
  'audio/mp3': 'audio/mpeg',
  'audio/x-mpeg': 'audio/mpeg',
};
const MB = 1024 * 1024;

export function medioDe(mime) {
  if (FORMATOS.imagen.includes(mime)) return 'imagen';
  if (FORMATOS.audio.includes(mime)) return 'audio';
  return null;
}

export function medioDeTipo(tipo) {
  if (TIPOS_POR_MEDIO.imagen.includes(tipo)) return 'imagen';
  if (TIPOS_POR_MEDIO.audio.includes(tipo)) return 'audio';
  return null;
}

/** MIME normalizado: lo que dice el navegador o, si no dice nada, la extensión. */
export function mimeDe(archivo) {
  const base = String(archivo.type ?? '').split(';')[0].trim().toLowerCase();
  const mime = SINONIMOS[base] ?? base;
  return mime || mimePorExtension(archivo.name ?? '');
}

const enMB = (bytes) => `${String(Math.round((bytes / MB) * 10) / 10)} MB`;

/** @returns {{ ok: true, mime: string, medio: string } | { ok: false, mensaje: string }} */
export function validarSubida(archivo) {
  const mime = mimeDe(archivo);
  const medio = medioDe(mime);
  if (!medio) return { ok: false, mensaje: 'Formato no aceptado. Imágenes: PNG, JPG o WebP. Audio: MP3, OGG o WAV.' };
  const limite = medio === 'imagen' ? LIMITES.imagenBytes : LIMITES.audioBytes;
  if (archivo.size > limite) {
    return { ok: false, mensaje: `El archivo pesa ${enMB(archivo.size)} y el máximo para ${medio === 'imagen' ? 'imágenes' : 'audio'} es ${enMB(limite)}.` };
  }
  return { ok: true, mime, medio };
}

export function nombreSugerido(nombreArchivo) {
  const sinExtension = String(nombreArchivo ?? '').replace(/\.[^.]+$/, '');
  const limpio = sinExtension.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return limpio || 'Sin nombre';
}

const rechazo = (mensaje) => Object.assign(new Error(mensaje), { codigo: 'subida' });

/**
 * Lee el archivo, lo da de alta como elemento con origen 'subido' y lo guarda.
 * Si el almacén falla, retira el elemento y propaga el error. Lanza con codigo 'subida' si no se acepta.
 * @param {object} sesion de crearSesion
 * @param {File} archivo
 * @param {{ tipo: string, nombre?: string }} datos tipo de elemento (fondo, retrato, musica, efecto, voz)
 */
export async function subirElemento(sesion, archivo, { tipo, nombre = nombreSugerido(archivo.name) }) {
  const resultado = validarSubida(archivo);
  if (!resultado.ok) throw rechazo(resultado.mensaje);
  if (!TIPOS_POR_MEDIO[resultado.medio].includes(tipo)) throw rechazo(`Un archivo de ${resultado.medio} no puede ser ${tipo}.`);
  const datos = await archivo.arrayBuffer();
  const elemento = sesion.cambiar((proyecto) => {
    const nuevo = agregarElemento(proyecto, { tipo, nombre, archivo: 'pendiente', origen: 'subido' });
    nuevo.archivo = `${nuevo.id}.${extensionPorMime(resultado.mime)}`;
    return nuevo;
  }, { origen: 'subida', estructura: true });
  try {
    await sesion.agregarArchivo(elemento.id, { tipo: resultado.mime, datos });
  } catch (error) {
    sesion.cambiar((proyecto) => eliminarElemento(proyecto, elemento.id), { origen: 'subida', estructura: true });
    throw error;
  }
  return elemento;
}
