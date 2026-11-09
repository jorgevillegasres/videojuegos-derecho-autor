// plataforma/js/juridico/mapa.js
// Filas del mapa de activos (spec, sección 12.8): la tabla del taller, llena sola.
// Activo, quién lo creó, contrato o licencia, prueba, riesgo (color) y acción.
// Puro: lo dibuja editor/mapa-activos.js y lo reutiliza el informe (plan 6).
import { evaluarTodo } from './semaforo.js';
import { describir } from './textos.js';
import { ETIQUETAS } from './formulario.js';
import { LICENCIAS } from './licencias.js';

export const TIPOS_ACTIVO = { titulo: 'Título', historia: 'Historia', personaje: 'Personaje', fondo: 'Fondo', retrato: 'Retrato', musica: 'Música', efecto: 'Efecto', voz: 'Voz' };

const nombreDe = (cosa, alternativa) => cosa?.nombre?.trim() || alternativa;

export function creadorDe(ficha) {
  if (!ficha || ficha.tipo === 'titulo') return '—';
  const herramienta = ficha.herramientaIA?.trim() || 'herramienta sin indicar';
  switch (ficha.autoria) {
    case 'otra_persona': return ficha.autorNombre?.trim() || 'Otra persona (sin nombre)';
    case 'ia': return `IA (${herramienta})`;
    case 'ia_con_aporte': return `IA (${herramienta}) con mi aporte`;
    default: return 'Yo';
  }
}

export function contratoDe(ficha) {
  if (!ficha || ficha.tipo === 'titulo') return '—';
  switch (ficha.respaldo) {
    case 'cesion': return 'Cesión por escrito';
    case 'autorizacion': return 'Autorización informal';
    case 'licencia': {
      if (!ficha.licencia) return 'Licencia sin elegir';
      if (ficha.licencia === 'OTRA') {
        const texto = ficha.licenciaTexto?.trim();
        return texto ? `Otra licencia: ${texto}` : 'Otra licencia';
      }
      return LICENCIAS[ficha.licencia]?.nombre ?? ficha.licencia;
    }
    default: return ficha.autoria === 'yo' && ficha.titular === 'yo' ? 'No hace falta' : 'Nada escrito';
  }
}

/** Acciones del semáforo sin repetir; A02 se funde con A01 (spec 12.4). */
export function accionesDe(descrito) {
  const hayA01 = descrito.razones.some((r) => r.codigo === 'A01');
  const razones = hayA01 ? descrito.razones.filter((r) => r.codigo !== 'A02') : descrito.razones;
  const acciones = [];
  for (const razon of razones) {
    if (razon.accion && !acciones.includes(razon.accion)) acciones.push(razon.accion);
  }
  return acciones;
}

/**
 * @param {object} proyecto
 * @param {object} contenido el JSON de contenido/juridico.json
 * @returns {Array<{ id, activo, tipo, creador, contrato, prueba, color: string|null, acciones: string[], porVerificar: boolean, muestra?: true }>} color es null en las filas de muestra.
 */
export function filas(proyecto, contenido) {
  const semaforos = evaluarTodo(proyecto);
  const { juego, fichas } = proyecto;
  const fila = (id, activo, tipo) => {
    const ficha = fichas[id];
    const descrito = describir(semaforos.get(id), ficha, contenido);
    return {
      id,
      activo,
      tipo,
      creador: creadorDe(ficha),
      contrato: contratoDe(ficha),
      prueba: ficha?.tipo === 'titulo' ? '—' : (ETIQUETAS.prueba[ficha?.prueba] ?? '—'),
      color: descrito.color,
      acciones: accionesDe(descrito),
      porVerificar: [...descrito.razones, ...descrito.notas].some((r) => r.verificacion === 'pendiente'),
    };
  };
  return [
    fila('titulo', juego.titulo?.trim() || 'Sin título', TIPOS_ACTIVO.titulo),
    fila('historia', 'Historia', TIPOS_ACTIVO.historia),
    ...juego.personajes.map((p) => fila(p.id, nombreDe(p, 'Sin nombre'), TIPOS_ACTIVO.personaje)),
    // Los retratos de muestra del ejemplo no se evalúan: se marcan para reemplazarlos.
    ...juego.elementos.map((e) => (e.origen === 'muestra'
      ? { id: e.id, activo: nombreDe(e, 'Sin nombre'), tipo: TIPOS_ACTIVO[e.tipo], creador: 'Muestra del ejemplo', contrato: '—', prueba: '—', color: null, acciones: ['Reemplázalo por uno tuyo.'], porVerificar: false, muestra: true }
      : fila(e.id, nombreDe(e, 'Sin nombre'), TIPOS_ACTIVO[e.tipo]))),
  ];
}
