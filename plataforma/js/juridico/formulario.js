// plataforma/js/juridico/formulario.js
// Reglas del formulario de la ficha (spec, secciones 12.2 y 12.4): qué campos se
// muestran según las respuestas, y qué se limpia cuando una respuesta cambia. Es puro:
// el dibujo está en editor/panel-ficha.js. Las etiquetas nombran respuestas; no
// afirman nada jurídico (eso está en contenido/juridico.json).
import { AUTORIAS, TITULARES, RESPALDOS, PRUEBAS } from './ficha.js';
import { LICENCIAS, CONDICIONES, condicionesDe } from './licencias.js';

export const PREGUNTAS = {
  tipoObra: 'Qué obra es',
  autoria: '¿Quién lo hizo?',
  titular: '¿Quién es titular de los derechos patrimoniales?',
  respaldo: '¿Qué lo respalda?',
  credito: '¿Cómo se acredita?',
  prueba: '¿Qué prueba la fecha?',
};

export const NOMBRES_DESTINO = { personal: 'Uso personal', gratis: 'Publicarlo gratis', venta: 'Venderlo' };

export const ETIQUETAS = {
  autoria: { yo: 'Yo', otra_persona: 'Otra persona', ia: 'Una herramienta de IA', ia_con_aporte: 'IA con mi aporte creativo' },
  titular: { yo: 'Yo', otra_persona: 'Otra persona' },
  respaldo: { ninguno: 'Nada escrito', cesion: 'Cesión por escrito', licencia: 'Licencia', autorizacion: 'Autorización informal (mensaje, correo, de palabra)' },
  prueba: { ninguna: 'Ninguna', sello: 'Sello de la plataforma', original: 'Archivo original con fecha', repositorio: 'Repositorio con historial', registro_dnda: 'Registro ante la DNDA' },
  condiciones: { BY: 'Exige atribución (BY)', NC: 'No comercial (NC)', SA: 'Compartir igual (SA)', ND: 'Sin derivadas (ND)' },
  registraria: { si: 'Sí lo registraría', no: 'No lo registraría' },
};

/** Códigos que el estudiante puede elegir cuando el respaldo es una licencia. */
export const LICENCIAS_ELEGIBLES = Object.keys(LICENCIAS);

const SOLO_LECTURA_BIBLIOTECA = ['autoria', 'autorNombre', 'titular', 'respaldo', 'licencia'];
const BOOLEANOS = ['reconoceSinDerechos', 'basadoEnObraAjena', 'autorizacionDerivada', 'licenciaLeida', 'aceptaCompartirIgual', 'modificado'];
const TEXTOS = ['autorNombre', 'herramientaIA', 'aporteHumano', 'licenciaTexto', 'credito'];
const LISTAS = { autoria: AUTORIAS, titular: TITULARES, respaldo: RESPALDOS, prueba: PRUEBAS };

/** Qué campos se muestran. soloLectura: los que se muestran como texto fijo. */
export function visibles(ficha) {
  const esTitulo = ficha.tipo === 'titulo';
  const editable = !esTitulo;
  const conIA = ficha.autoria === 'ia' || ficha.autoria === 'ia_con_aporte';
  const conLicencia = ficha.respaldo === 'licencia';
  const subidoOBiblioteca = ficha.origen === 'biblioteca' || ficha.origen === 'subido';
  return {
    autoria: editable,
    autorNombre: editable && ficha.autoria === 'otra_persona',
    herramientaIA: editable && conIA,
    aporteHumano: editable && ficha.autoria === 'ia_con_aporte',
    reconoceSinDerechos: editable && ficha.autoria === 'ia',
    basadoEnObraAjena: editable,
    autorizacionDerivada: editable && ficha.basadoEnObraAjena === true,
    titular: editable,
    respaldo: editable && !(ficha.autoria === 'yo' && ficha.titular === 'yo'),
    licencia: editable && conLicencia,
    licenciaTexto: editable && conLicencia && ficha.licencia === 'OTRA',
    condicionesOtra: editable && conLicencia && ficha.licencia === 'OTRA',
    licenciaLeida: editable && conLicencia && Boolean(ficha.licencia),
    aceptaCompartirIgual: editable && conLicencia && condicionesDe(ficha).includes('SA'),
    modificado: editable && conLicencia && subidoOBiblioteca,
    credito: editable,
    prueba: editable,
    soloLectura: ficha.origen === 'biblioteca' ? [...SOLO_LECTURA_BIBLIOTECA] : [],
  };
}

function limpiarLicencia(ficha) {
  Object.assign(ficha, { licencia: null, licenciaTexto: '', condicionesOtra: [], licenciaLeida: false, aceptaCompartirIgual: false, modificado: false });
}

function valorValido(campo, valor) {
  if (campo in LISTAS) return LISTAS[campo].includes(valor);
  if (campo === 'licencia') return valor === null || Object.hasOwn(LICENCIAS, valor);
  if (campo === 'condicionesOtra') return Array.isArray(valor);
  if (BOOLEANOS.includes(campo)) return typeof valor === 'boolean';
  if (TEXTOS.includes(campo)) return typeof valor === 'string';
  return false;
}

/** Cambia un campo y limpia lo que deja de aplicar. Devuelve la ficha (mutada). Ignora lo inválido. */
export function aplicarCambio(ficha, campo, valor) {
  if (ficha.tipo === 'titulo') return ficha;
  if (visibles(ficha).soloLectura.includes(campo)) return ficha;
  if (!valorValido(campo, valor)) return ficha;
  ficha[campo] = campo === 'condicionesOtra' ? valor.filter((c) => CONDICIONES.includes(c)) : valor;

  if (campo === 'autoria') {
    if (valor !== 'otra_persona') ficha.autorNombre = '';
    if (valor !== 'ia' && valor !== 'ia_con_aporte') ficha.herramientaIA = '';
    if (valor !== 'ia_con_aporte') ficha.aporteHumano = '';
    if (valor !== 'ia') ficha.reconoceSinDerechos = false;
  }
  if ((campo === 'autoria' || campo === 'titular') && ficha.autoria === 'yo' && ficha.titular === 'yo') {
    ficha.respaldo = 'ninguno';
    limpiarLicencia(ficha);
  }
  if (campo === 'respaldo' && valor !== 'licencia') limpiarLicencia(ficha);
  if (campo === 'licencia') {
    ficha.licenciaLeida = false;
    ficha.aceptaCompartirIgual = false;
    if (valor !== 'OTRA') {
      ficha.licenciaTexto = '';
      ficha.condicionesOtra = [];
    }
  }
  if (campo === 'basadoEnObraAjena' && valor === false) ficha.autorizacionDerivada = false;
  return ficha;
}
