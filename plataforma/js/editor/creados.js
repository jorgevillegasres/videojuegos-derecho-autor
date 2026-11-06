// plataforma/js/editor/creados.js
// Lo que sale de una herramienta entra al proyecto como elemento con origen 'creado',
// sello de creación (fecha y huella SHA-256 del archivo) y ficha con prueba «sello».
// Reabrir un pixel art reemplaza el archivo y recalcula el sello (spec, sección 9).
import { agregarElemento, eliminarElemento } from '../estado/modelo.js';
import { crearSello, extensionPorMime } from '../estado/archivos.js';

const mimeDe = (blob) => blob.type || 'application/octet-stream';

/**
 * @param {object} sesion de crearSesion
 * @param {Blob} blob lo que devolvió la herramienta
 * @param {{ tipo: string, nombre: string, ahora?: Date }} datos tipo de elemento y nombre inicial
 */
export async function crearElementoCreado(sesion, blob, { tipo, nombre, ahora = new Date() }) {
  const datos = await blob.arrayBuffer();
  const mime = mimeDe(blob);
  const sello = await crearSello(datos, ahora);
  const elemento = sesion.cambiar((proyecto) => {
    const nuevo = agregarElemento(proyecto, { tipo, nombre, archivo: 'pendiente', origen: 'creado', sello });
    nuevo.archivo = `${nuevo.id}.${extensionPorMime(mime)}`;
    return nuevo;
  }, { origen: 'herramienta', estructura: true });
  try {
    await sesion.agregarArchivo(elemento.id, { tipo: mime, datos });
  } catch (error) {
    sesion.cambiar((proyecto) => eliminarElemento(proyecto, elemento.id), { origen: 'herramienta', estructura: true });
    throw error;
  }
  return elemento;
}

/** Reemplaza el archivo de un elemento creado y recalcula su sello. Lanza si el elemento ya no existe. */
export async function reemplazarArchivoCreado(sesion, id, blob, { ahora = new Date() } = {}) {
  const existe = sesion.proyecto.juego.elementos.some((e) => e.id === id);
  if (!existe) throw new Error('El elemento ya no existe.');
  const datos = await blob.arrayBuffer();
  const mime = mimeDe(blob);
  const sello = await crearSello(datos, ahora);
  await sesion.agregarArchivo(id, { tipo: mime, datos });
  return sesion.cambiar((proyecto) => {
    const elemento = proyecto.juego.elementos.find((e) => e.id === id);
    elemento.sello = sello;
    elemento.archivo = `${id}.${extensionPorMime(mime)}`;
    return elemento;
  }, { origen: 'herramienta', estructura: true });
}
