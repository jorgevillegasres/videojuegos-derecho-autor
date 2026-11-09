// plataforma/js/estado/biblioteca.js
// Meter una pieza del catálogo al proyecto: el elemento con origen 'biblioteca', su
// ficha precargada (crearFicha) y el nombre de archivo según su tipo. Puro sobre el
// proyecto: lo usan el editor (con la sesión) y el juego de ejemplo (sin sesión).
import { agregarElemento } from './modelo.js';
import { extensionPorMime } from './archivos.js';
import { entradaDeFicha } from '../biblioteca/catalogo.js';

/**
 * @param {object} proyecto
 * @param {object} pieza entrada del catálogo
 * @param {{ tipo: string }} archivo el archivo ya descargado (solo se usa su tipo)
 * @returns {object} el elemento creado
 */
export function agregarPieza(proyecto, pieza, archivo) {
  const elemento = agregarElemento(proyecto, { tipo: pieza.tipo, nombre: pieza.titulo, archivo: 'pendiente', origen: 'biblioteca', biblioteca: entradaDeFicha(pieza) });
  elemento.archivo = `${elemento.id}.${extensionPorMime(archivo.tipo)}`;
  return elemento;
}
