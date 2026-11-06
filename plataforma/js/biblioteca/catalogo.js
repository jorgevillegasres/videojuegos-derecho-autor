// plataforma/js/biblioteca/catalogo.js
// El catálogo de la biblioteca (spec, sección 11): qué forma tiene, qué mínimos y
// mezcla de licencias exige, y cómo se cargan las piezas. Puro salvo fetch, que se
// inyecta. Las piezas CURSO y DESCONOCIDO son en realidad CC0 o dominio público y lo
// dicen en `simulado`; un catálogo `provisional` puede simular también las demás.
import { LICENCIAS } from '../juridico/licencias.js';
import { mimePorExtension } from '../estado/archivos.js';

export const MINIMO_CATALOGO = { fondo: 8, retrato: 8, musica: 6, efecto: 12 };
export const CARPETAS = { fondo: 'fondos', retrato: 'retratos', musica: 'musica', efecto: 'efectos' };
export const TIPOS_BIBLIOTECA = Object.keys(MINIMO_CATALOGO);
const NOMBRES = { fondo: 'Fondos', retrato: 'Retratos', musica: 'Pistas musicales', efecto: 'Efectos de sonido' };
const EXTENSIONES = { imagen: ['png', 'jpg', 'jpeg', 'webp'], audio: ['mp3', 'ogg', 'wav'] };
const LIBRES = ['CC0', 'DP'];
const SIMULADAS = ['CURSO', 'DESCONOCIDO'];
const NOMBRE_ARCHIVO = /^[a-z]+\/[\w.-]+\.[a-z0-9]+$/;

const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const texto = (v) => typeof v === 'string' && v.trim() !== '';
export const medioDeTipo = (tipo) => (tipo === 'fondo' || tipo === 'retrato' ? 'imagen' : 'audio');

/** Problemas de forma del catálogo, sin lanzar. Vacío si está bien. */
export function validarCatalogo(catalogo) {
  if (!esObjeto(catalogo)) return ['el catálogo no es un objeto'];
  if (!Array.isArray(catalogo.piezas)) return ['el catálogo no tiene lista de piezas'];
  const problemas = [];
  const ids = new Set();
  catalogo.piezas.forEach((pieza, i) => {
    const etiqueta = `la pieza ${esObjeto(pieza) && texto(pieza.id) ? `«${pieza.id}»` : `n.º ${i + 1}`}`;
    if (!esObjeto(pieza) || !texto(pieza.id)) {
      problemas.push(`${etiqueta} no tiene identificador`);
      return;
    }
    if (ids.has(pieza.id)) problemas.push(`el identificador «${pieza.id}» está repetido`);
    ids.add(pieza.id);
    if (!TIPOS_BIBLIOTECA.includes(pieza.tipo)) problemas.push(`${etiqueta}: el tipo «${pieza.tipo}» no es de biblioteca`);
    if (!texto(pieza.titulo)) problemas.push(`${etiqueta} no tiene título`);
    if (!texto(pieza.autor)) problemas.push(`${etiqueta} no tiene autor`);
    if (!texto(pieza.fuente)) problemas.push(`${etiqueta} no tiene fuente`);
    if (typeof pieza.creditoSugerido !== 'string') problemas.push(`${etiqueta}: el crédito sugerido no es texto`);
    const licencia = LICENCIAS[pieza.licencia];
    if (!licencia || pieza.licencia === 'OTRA') {
      problemas.push(`${etiqueta}: la licencia «${pieza.licencia}» no va en el catálogo`);
    } else {
      const esperadas = licencia.condiciones ?? [];
      const dadas = Array.isArray(pieza.condiciones) ? pieza.condiciones : null;
      if (!dadas || dadas.length !== esperadas.length || !esperadas.every((c) => dadas.includes(c))) {
        problemas.push(`${etiqueta}: las condiciones ${JSON.stringify(pieza.condiciones)} no son las de ${pieza.licencia}`);
      }
      if (pieza.licencia === 'CC-BY-ND-4.0' && medioDeTipo(pieza.tipo) === 'audio') problemas.push(`${etiqueta}: el catálogo no lleva audio sin derivadas (ND)`);
      if (SIMULADAS.includes(pieza.licencia) && !esObjeto(pieza.simulado)) problemas.push(`${etiqueta}: una pieza ${pieza.licencia} necesita «simulado» con su licencia y fuente reales`);
      if (esObjeto(pieza.simulado)) {
        if (!LIBRES.includes(pieza.simulado.licencia)) problemas.push(`${etiqueta}: lo simulado debe ser CC0 o DP para poder distribuirse`);
        if (!texto(pieza.simulado.autor) || !texto(pieza.simulado.fuente)) problemas.push(`${etiqueta}: «simulado» necesita autor y fuente reales`);
        if (!SIMULADAS.includes(pieza.licencia) && catalogo.provisional !== true) problemas.push(`${etiqueta}: solo un catálogo provisional simula licencias distintas de CURSO y DESCONOCIDO`);
      }
    }
    if (TIPOS_BIBLIOTECA.includes(pieza.tipo)) {
      if (!texto(pieza.archivo) || !NOMBRE_ARCHIVO.test(pieza.archivo)) {
        problemas.push(`${etiqueta}: el archivo «${pieza.archivo}» no tiene un nombre permitido`);
      } else {
        const [carpeta, nombre] = pieza.archivo.split('/');
        const extension = nombre.split('.').pop().toLowerCase();
        if (carpeta !== CARPETAS[pieza.tipo]) problemas.push(`${etiqueta}: el archivo debe estar en la carpeta «${CARPETAS[pieza.tipo]}»`);
        if (!EXTENSIONES[medioDeTipo(pieza.tipo)].includes(extension)) problemas.push(`${etiqueta}: la extensión «${extension}» no es de ${medioDeTipo(pieza.tipo)}`);
      }
    }
  });
  return problemas;
}

/** Mínimos y mezcla de licencias de la sección 11. Devuelve [{ codigo, mensaje }]. */
export function faltantesDelMinimo(catalogo) {
  const piezas = Array.isArray(catalogo?.piezas) ? catalogo.piezas.filter(esObjeto) : [];
  const faltantes = [];
  const cuenta = (filtro) => piezas.filter(filtro).length;
  for (const tipo of TIPOS_BIBLIOTECA) {
    const actual = cuenta((p) => p.tipo === tipo);
    if (actual < MINIMO_CATALOGO[tipo]) faltantes.push({ codigo: `M_${tipo.toUpperCase()}`, mensaje: `${NOMBRES[tipo]}: ${actual} de ${MINIMO_CATALOGO[tipo]}.` });
    if (!cuenta((p) => p.tipo === tipo && p.licencia === 'CC-BY-4.0')) faltantes.push({ codigo: `MEZCLA_BY_${tipo}`, mensaje: `${NOMBRES[tipo]}: falta una pieza CC-BY-4.0.` });
    if (!cuenta((p) => p.tipo === tipo && LIBRES.includes(p.licencia))) faltantes.push({ codigo: `MEZCLA_LIBRE_${tipo}`, mensaje: `${NOMBRES[tipo]}: falta una pieza CC0 o de dominio público.` });
  }
  const esImagen = (p) => medioDeTipo(p.tipo) === 'imagen';
  if (!cuenta((p) => p.tipo === 'musica' && p.licencia === 'CC-BY-NC-4.0')) faltantes.push({ codigo: 'MEZCLA_NC_MUSICA', mensaje: 'Falta una pista CC-BY-NC-4.0.' });
  if (!cuenta((p) => esImagen(p) && p.licencia === 'CC-BY-ND-4.0')) faltantes.push({ codigo: 'MEZCLA_ND_IMAGEN', mensaje: 'Falta una imagen CC-BY-ND-4.0.' });
  if (!cuenta((p) => esImagen(p) && p.licencia === 'CC-BY-SA-4.0')) faltantes.push({ codigo: 'MEZCLA_SA_IMAGEN', mensaje: 'Falta una imagen CC-BY-SA-4.0.' });
  if (!cuenta((p) => p.licencia === 'CURSO')) faltantes.push({ codigo: 'MEZCLA_CURSO', mensaje: 'Falta una pieza CURSO.' });
  if (!cuenta((p) => p.licencia === 'DESCONOCIDO')) faltantes.push({ codigo: 'MEZCLA_DESCONOCIDO', mensaje: 'Falta una pieza DESCONOCIDO.' });
  return faltantes;
}

/** Lo que crearFicha espera en `biblioteca` al agregar un elemento. */
export function entradaDeFicha(pieza) {
  return { id: pieza.id, autor: pieza.autor, licencia: pieza.licencia, creditoSugerido: pieza.creditoSugerido ?? '' };
}

const falla = (mensaje, extra = {}) => Object.assign(new Error(mensaje), { codigo: 'catalogo', ...extra });

/**
 * @param {{ url?: string|URL, fetch?: typeof fetch }} opciones url del catalogo.json; las piezas se resuelven junto a él.
 */
export function crearCatalogo({ url = new URL('../../biblioteca/catalogo.json', import.meta.url), fetch = globalThis.fetch } = {}) {
  const base = new URL('.', new URL(String(url), 'http://localhost/'));
  const absoluta = (ruta) => new URL(ruta, base).href;
  let catalogo = null;
  let cargando = null;

  async function cargarDeVerdad() {
    const respuesta = await fetch(String(url));
    if (!respuesta.ok) throw falla(`No se pudo cargar el catálogo de la biblioteca (${respuesta.status}).`);
    let datos;
    try {
      datos = await respuesta.json();
    } catch {
      throw falla('El catálogo de la biblioteca está dañado.');
    }
    const problemas = validarCatalogo(datos);
    if (problemas.length) throw falla(`El catálogo de la biblioteca no tiene la forma esperada: ${problemas[0]}${problemas.length > 1 ? ` (y ${problemas.length - 1} más)` : ''}.`, { problemas });
    catalogo = datos;
    return catalogo;
  }

  return {
    cargar() {
      if (catalogo) return Promise.resolve(catalogo);
      cargando ??= cargarDeVerdad().catch((error) => { cargando = null; throw error; });
      return cargando;
    },
    piezas: () => catalogo?.piezas ?? [],
    piezaDe: (id) => catalogo?.piezas.find((p) => p.id === id) ?? null,
    provisional: () => catalogo?.provisional === true,
    urlDe: (pieza) => absoluta(pieza.archivo),
    async obtenerArchivo(id) {
      const pieza = catalogo?.piezas.find((p) => p.id === id);
      if (!pieza) throw falla(`La pieza «${id}» no está en el catálogo.`);
      const respuesta = await fetch(absoluta(pieza.archivo));
      if (!respuesta.ok) throw falla(`No se pudo descargar «${pieza.titulo}» (${respuesta.status}).`);
      return { tipo: mimePorExtension(pieza.archivo), datos: await respuesta.arrayBuffer() };
    },
  };
}
