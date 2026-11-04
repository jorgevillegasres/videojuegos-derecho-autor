// plataforma/js/estado/copias.js
// Copia completa del proyecto en un archivo comprimido: proyecto.json + archivos/.
// JSZip se recibe como parámetro: en el navegador es window.JSZip (vendor/jszip.min.js),
// en las pruebas es el paquete de npm.
import { mimePorExtension } from './archivos.js';
import { VERSION_PROYECTO } from './modelo.js';

/**
 * @param {object} proyecto
 * @param {Map<string, {tipo: string, datos: ArrayBuffer}>} archivos por id de elemento
 * @returns {Promise<Blob>}
 */
export async function exportarCopia(proyecto, archivos, { JSZip }) {
  const zip = new JSZip();
  zip.file('proyecto.json', JSON.stringify(proyecto, null, 2));
  for (const elemento of proyecto.juego.elementos) {
    const archivo = archivos.get(elemento.id);
    if (!archivo) throw new Error(`Falta el archivo del elemento «${elemento.nombre}».`);
    zip.file(`archivos/${elemento.archivo}`, archivo.datos);
  }
  const bytes = await zip.generateAsync({ type: 'uint8array' });
  return new Blob([bytes], { type: 'application/zip' });
}

/**
 * @param {Blob|ArrayBuffer|Uint8Array} entrada
 * @returns {Promise<{proyecto: object, archivos: Map}>}
 */
export async function importarCopia(entrada, { JSZip }) {
  const datos = typeof Blob !== 'undefined' && entrada instanceof Blob ? await entrada.arrayBuffer() : entrada;
  let zip;
  try {
    zip = await JSZip.loadAsync(datos);
  } catch {
    throw new Error('El archivo no es una copia válida (no se pudo abrir).');
  }
  const entradaProyecto = zip.file('proyecto.json');
  if (!entradaProyecto) throw new Error('El archivo no contiene proyecto.json.');
  let proyecto;
  try {
    proyecto = JSON.parse(await entradaProyecto.async('string'));
  } catch {
    throw new Error('proyecto.json está dañado.');
  }
  const problemas = validarEstructura(proyecto);
  if (problemas.length) throw new Error(`El proyecto no tiene la forma esperada: ${problemas.join('; ')}.`);

  const archivos = new Map();
  for (const elemento of proyecto.juego.elementos) {
    const entradaArchivo = zip.file(`archivos/${elemento.archivo}`);
    if (!entradaArchivo) throw new Error(`Falta el archivo del elemento «${elemento.nombre}» (archivos/${elemento.archivo}).`);
    archivos.set(elemento.id, { tipo: mimePorExtension(elemento.archivo), datos: await entradaArchivo.async('arraybuffer') });
  }
  return { proyecto, archivos };
}

/** Comprueba la forma mínima de un proyecto. Devuelve una lista de problemas (vacía si está bien). */
export function validarEstructura(proyecto) {
  if (!proyecto || typeof proyecto !== 'object') return ['no es un objeto'];
  const problemas = [];
  if (proyecto.version !== VERSION_PROYECTO) problemas.push(`versión ${proyecto.version} no soportada`);
  const juego = proyecto.juego;
  if (!juego || typeof juego !== 'object') {
    problemas.push('falta el juego');
    return problemas;
  }
  if (!Array.isArray(juego.escenas)) problemas.push('faltan las escenas');
  if (!Array.isArray(juego.personajes)) problemas.push('faltan los personajes');
  if (!Array.isArray(juego.elementos)) problemas.push('faltan los elementos');
  if (!proyecto.fichas || typeof proyecto.fichas !== 'object') {
    problemas.push('faltan las fichas');
  } else if (Array.isArray(juego.elementos)) {
    for (const elemento of juego.elementos) {
      if (!proyecto.fichas[elemento.id]) problemas.push(`el elemento «${elemento.nombre}» no tiene ficha`);
    }
  }
  return problemas;
}
