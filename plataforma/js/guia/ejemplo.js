// plataforma/js/guia/ejemplo.js
// Arma el juego de ejemplo «La llave del faro» (diseño del modo guiado, sección 4) con
// las mismas funciones del modelo que usa el editor. Las piezas de biblioteca entran
// como al elegirlas en el editor (agregarPieza) y los retratos de muestra con origen
// 'muestra'. No guarda nada: devuelve el proyecto y sus archivos.
import { crearProyecto, agregarEscena, agregarPersonaje, agregarElemento, agregarLinea } from '../estado/modelo.js';
import { agregarPieza } from '../estado/biblioteca.js';
import { extensionPorMime } from '../estado/archivos.js';
import { TEXTOS_MUESTRA, PERSONAJES_MUESTRA, PIEZAS_BIBLIOTECA, RETRATOS_MUESTRA } from './muestra.js';

const falla = (detalle) => new Error(`No se pudo preparar el ejemplo: ${detalle}`);

/**
 * @param {{ estudiante: string, destino: string }} datos
 * @param {{ catalogo: object|null, cargar: (ruta: string) => Promise<{ tipo: string, datos: ArrayBuffer }> }} fuentes
 *   catalogo de crearCatalogo, ya cargado (null si no está disponible); cargar lee un archivo de plataforma/.
 * @returns {Promise<{ proyecto: object, archivos: Map }>}
 */
export async function crearEjemplo({ estudiante, destino }, { catalogo, cargar }, ahora = new Date()) {
  if (!catalogo) throw falla('la biblioteca no está disponible.');
  // Primero se consigue todo; si algo falta, no se arma nada.
  const piezas = {};
  for (const [clave, { id, titulo }] of Object.entries(PIEZAS_BIBLIOTECA)) {
    const pieza = catalogo.piezaDe(id);
    if (!pieza) throw falla(`falta la pieza «${titulo}» de la biblioteca.`);
    try {
      piezas[clave] = { pieza, archivo: await catalogo.obtenerArchivo(id) };
    } catch (error) {
      throw falla(error.message);
    }
  }
  const retratos = [];
  for (const retrato of RETRATOS_MUESTRA) {
    try {
      retratos.push({ ...retrato, archivo: await cargar(retrato.archivo) });
    } catch (error) {
      throw falla(error.message);
    }
  }

  const proyecto = crearProyecto({ estudiante, titulo: TEXTOS_MUESTRA.titulo, destino }, ahora);
  const archivos = new Map();
  const { juego } = proyecto;
  juego.sinopsis = TEXTOS_MUESTRA.sinopsis;
  const muelle = juego.escenas[0];
  muelle.nombre = 'El muelle';
  const torre = agregarEscena(proyecto, 'La torre');
  const amanecer = agregarEscena(proyecto, 'Amanecer');

  const [ana, farero] = PERSONAJES_MUESTRA.map((datos) => agregarPersonaje(proyecto, datos));
  [ana, farero].forEach((personaje, i) => {
    const { nombre, archivo } = retratos[i];
    const elemento = agregarElemento(proyecto, { tipo: 'retrato', nombre, archivo: 'pendiente', origen: 'muestra' });
    elemento.archivo = `${elemento.id}.${extensionPorMime(archivo.tipo)}`;
    archivos.set(elemento.id, archivo);
    personaje.retrato = elemento.id;
  });

  const elementos = {};
  for (const [clave, { pieza, archivo }] of Object.entries(piezas)) {
    elementos[clave] = agregarPieza(proyecto, pieza, archivo);
    archivos.set(elementos[clave].id, archivo);
  }
  muelle.fondo = elementos.fondo.id;
  muelle.musica = elementos.musica.id;

  const L = TEXTOS_MUESTRA.lineas;
  agregarLinea(muelle, 'narracion', { texto: L[0] });
  agregarLinea(muelle, 'dialogo', { personaje: ana.id, texto: L[1], efecto: elementos.efecto.id });
  agregarLinea(muelle, 'dialogo', { personaje: farero.id, texto: L[2] });
  agregarLinea(muelle, 'decision', { texto: L[3], opciones: [{ texto: 'Sí', escena: torre.id }, { texto: 'No', escena: amanecer.id }] });
  agregarLinea(torre, 'narracion', { texto: L[4] });
  agregarLinea(torre, 'fin', { texto: L[5] });
  agregarLinea(amanecer, 'dialogo', { personaje: farero.id, texto: L[6] });
  agregarLinea(amanecer, 'fin', { texto: L[7] });
  return { proyecto, archivos };
}
