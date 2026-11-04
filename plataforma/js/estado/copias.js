// plataforma/js/estado/copias.js
// Copia completa del proyecto en un archivo comprimido: proyecto.json + archivos/.
// JSZip se recibe como parámetro: en el navegador es window.JSZip (vendor/jszip.min.js),
// en las pruebas es el paquete de npm. Los errores llevan un código estable para la
// interfaz: no_es_zip, sin_proyecto, json_danado, forma (con la lista `problemas`),
// archivo_faltante. El paquete de entrega (plan 6) usa el mismo formato más otros archivos.
import { mimePorExtension } from './archivos.js';
import { VERSION_PROYECTO, DESTINOS, TIPOS_ELEMENTO, ORIGENES } from './modelo.js';

const FICHAS_FIJAS = ['titulo', 'historia'];
const NOMBRE_ARCHIVO = /^(?!\.+$)[\w.-]+$/;
const esObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);
const falla = (codigo, mensaje, extra = {}) => Object.assign(new Error(mensaje), { codigo, ...extra });
const fallaDeForma = (problemas) => falla('forma', `El proyecto no tiene la forma esperada: ${problemas.join('; ')}.`, { problemas });

/**
 * @param {object} proyecto
 * @param {Map<string, {tipo: string, datos: ArrayBuffer}>} archivos por id de elemento
 * @returns {Promise<Blob>}
 */
export async function exportarCopia(proyecto, archivos, { JSZip }) {
  const problemas = validarEstructura(proyecto);
  if (problemas.length) throw fallaDeForma(problemas);
  const zip = new JSZip();
  zip.file('proyecto.json', JSON.stringify(proyecto, null, 2));
  for (const elemento of proyecto.juego.elementos) {
    const archivo = archivos.get(elemento.id);
    if (!archivo) throw falla('archivo_faltante', `Falta el archivo del elemento «${elemento.nombre}».`);
    zip.file(`archivos/${elemento.archivo}`, archivo.datos);
  }
  // En Node no existe el tipo 'blob'; pasar por Uint8Array duplica la memoria un instante, aceptable bajo el aviso de 50 MB.
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
    throw falla('no_es_zip', 'El archivo no es una copia válida (no se pudo abrir).');
  }
  const entradaProyecto = zip.file('proyecto.json');
  if (!entradaProyecto) throw falla('sin_proyecto', 'El archivo no contiene proyecto.json.');
  let proyecto;
  try {
    proyecto = JSON.parse(await entradaProyecto.async('string'));
  } catch {
    throw falla('json_danado', 'proyecto.json está dañado.');
  }
  const problemas = validarEstructura(proyecto);
  if (problemas.length) throw fallaDeForma(problemas);

  const archivos = new Map();
  for (const elemento of proyecto.juego.elementos) {
    const entradaArchivo = zip.file(`archivos/${elemento.archivo}`);
    if (!entradaArchivo) throw falla('archivo_faltante', `Falta el archivo del elemento «${elemento.nombre}» (archivos/${elemento.archivo}).`);
    // El tipo sale de la extensión; archivos.js mapea en los dos sentidos y la plataforma nunca escribe .mp4 (usa .m4a).
    archivos.set(elemento.id, { tipo: mimePorExtension(elemento.archivo), datos: await entradaArchivo.async('arraybuffer') });
  }
  return { proyecto, archivos };
}

/**
 * Comprueba la forma de un proyecto sin lanzar nunca: devuelve una lista de problemas
 * (vacía si está bien). Atrapa lo que una copia editada a mano puede traer: versión,
 * destino, ids repetidos o ausentes, nombres de archivo inseguros o repetidos, fichas
 * faltantes o huérfanas. La validez del juego (escenas, líneas) la informa validar().
 */
export function validarEstructura(proyecto) {
  if (!esObjeto(proyecto)) return ['no es un objeto'];
  const problemas = [];
  if (proyecto.version === undefined) problemas.push('no indica su versión');
  else if (proyecto.version !== VERSION_PROYECTO) problemas.push(`versión ${proyecto.version} no soportada`);

  const juego = proyecto.juego;
  if (!esObjeto(juego)) {
    problemas.push('falta el juego');
    return problemas;
  }
  if (typeof juego.titulo !== 'string') problemas.push('el título del juego no es texto');
  if (!DESTINOS.includes(juego.destino)) problemas.push(`el destino «${juego.destino}» no es válido`);
  if (juego.escenaInicial !== null && typeof juego.escenaInicial !== 'string') problemas.push('la escena inicial no es válida');

  const ids = new Set();
  const etiquetas = { escenas: 'las escenas', personajes: 'los personajes', elementos: 'los elementos' };
  for (const [lista, etiqueta] of Object.entries(etiquetas)) {
    if (!Array.isArray(juego[lista])) {
      problemas.push(`faltan ${etiqueta}`);
      continue;
    }
    for (const item of juego[lista]) {
      if (!esObjeto(item) || typeof item.id !== 'string' || !item.id) {
        problemas.push(`hay entradas sin identificador en ${etiqueta}`);
        continue;
      }
      if (ids.has(item.id)) problemas.push(`el identificador «${item.id}» está repetido`);
      ids.add(item.id);
    }
  }

  if (!esObjeto(proyecto.fichas)) {
    problemas.push('faltan las fichas');
    return problemas;
  }
  if (Array.isArray(juego.elementos)) {
    const usados = new Set();
    for (const elemento of juego.elementos) {
      if (!esObjeto(elemento) || typeof elemento.id !== 'string') continue;
      const nombre = typeof elemento.nombre === 'string' && elemento.nombre ? elemento.nombre : elemento.id;
      if (!TIPOS_ELEMENTO.includes(elemento.tipo)) problemas.push(`el elemento «${nombre}» tiene un tipo desconocido`);
      if (!ORIGENES.includes(elemento.origen)) problemas.push(`el elemento «${nombre}» tiene un origen desconocido`);
      if (typeof elemento.archivo !== 'string' || !NOMBRE_ARCHIVO.test(elemento.archivo)) {
        problemas.push(`el elemento «${nombre}» tiene un nombre de archivo no permitido`);
      } else if (usados.has(elemento.archivo)) {
        problemas.push(`el archivo «${elemento.archivo}» está repetido`);
      } else {
        usados.add(elemento.archivo);
      }
      if (!esObjeto(proyecto.fichas[elemento.id])) problemas.push(`el elemento «${nombre}» no tiene ficha`);
    }
  }
  for (const id of Object.keys(proyecto.fichas)) {
    if (!FICHAS_FIJAS.includes(id) && !ids.has(id)) problemas.push(`la ficha «${id}» no corresponde a ningún elemento ni personaje`);
  }
  return problemas;
}
