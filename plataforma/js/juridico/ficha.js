// plataforma/js/juridico/ficha.js
// Qué es una ficha jurídica y cómo nace, con sus precargas según el origen.

import { LICENCIAS } from './licencias.js';

export const TIPOS_FICHA = ['titulo', 'historia', 'personaje', 'fondo', 'retrato', 'musica', 'efecto', 'voz'];
export const ORIGENES_FICHA = ['escrito', 'creado', 'subido', 'biblioteca', 'muestra'];
export const AUTORIAS = ['yo', 'otra_persona', 'ia', 'ia_con_aporte'];
export const TITULARES = ['yo', 'otra_persona'];
export const RESPALDOS = ['ninguno', 'cesion', 'licencia', 'autorizacion'];
export const PRUEBAS = ['ninguna', 'sello', 'original', 'repositorio', 'registro_dnda'];
export const DESTINOS = ['personal', 'gratis', 'venta'];

export const TIPOS_OBRA = {
  literaria: { nombre: 'Obra literaria' },
  artistica: { nombre: 'Obra artística' },
  musical_fonograma: { nombre: 'Obra musical y grabación (fonograma)' },
  fonograma: { nombre: 'Grabación (fonograma)' },
  interpretacion: { nombre: 'Interpretación y grabación' },
  titulo: { nombre: 'Título: no es obra; puede ser marca' },
};

const OBRA_POR_FICHA = {
  titulo: 'titulo',
  historia: 'literaria',
  personaje: 'literaria',
  fondo: 'artistica',
  retrato: 'artistica',
  musica: 'musical_fonograma',
  efecto: 'fonograma',
  voz: 'interpretacion',
};

export function tipoObraPara(tipoFicha) {
  const codigo = OBRA_POR_FICHA[tipoFicha];
  if (!codigo) throw new Error(`Tipo de ficha inválido: ${tipoFicha}`);
  return codigo;
}

/**
 * Crea la ficha inicial de un elemento, personaje, historia o título.
 * @param {string} tipoFicha uno de TIPOS_FICHA
 * @param {{origen?: string, biblioteca?: object|null}} opciones
 */
export function crearFicha(tipoFicha, { origen = 'escrito', biblioteca = null } = {}) {
  const tipoObra = tipoObraPara(tipoFicha);
  if (!ORIGENES_FICHA.includes(origen)) throw new Error(`Origen inválido: ${origen}`);
  if (origen === 'biblioteca') {
    if (!biblioteca) throw new Error('El origen biblioteca requiere la entrada de biblioteca.');
    if (!Object.hasOwn(LICENCIAS, biblioteca.licencia)) throw new Error(`Licencia desconocida en la biblioteca: ${biblioteca.licencia}`);
  }
  const ficha = {
    tipo: tipoFicha,
    tipoObra,
    origen,
    autoria: 'yo',
    autorNombre: '',
    herramientaIA: '',
    aporteHumano: '',
    reconoceSinDerechos: false,
    basadoEnObraAjena: false,
    autorizacionDerivada: false,
    titular: 'yo',
    respaldo: 'ninguno',
    licencia: null,
    licenciaTexto: '',
    condicionesOtra: [],
    licenciaLeida: false,
    aceptaCompartirIgual: false,
    modificado: false,
    credito: '',
    prueba: 'ninguna',
  };
  if (origen === 'creado') ficha.prueba = 'sello';
  if (origen === 'biblioteca') {
    ficha.autoria = 'otra_persona';
    ficha.autorNombre = biblioteca.autor ?? '';
    ficha.titular = 'otra_persona';
    ficha.respaldo = 'licencia';
    ficha.licencia = biblioteca.licencia;
    ficha.credito = biblioteca.creditoSugerido ?? '';
  }
  return ficha;
}
