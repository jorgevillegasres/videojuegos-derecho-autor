// plataforma/js/juridico/cadena.js
// Cadena de titularidad y pantalla de créditos (spec, sección 12.6). Las dos salen
// de las fichas; nada se escribe a mano. El árbol lo dibuja el informe (plan 6); los
// créditos los muestra el reproductor desde este plan.
import { evaluarTodo } from './semaforo.js';
import { piezasDeMuestra, TEXTOS_MUESTRA } from '../guia/muestra.js';

export const NOMBRES_TIPO_CREDITO = { fondo: 'fondo', retrato: 'retrato', musica: 'música', efecto: 'efecto de sonido', voz: 'voz' };

const nombreDe = (cosa, alternativa) => cosa?.nombre?.trim() || alternativa;
const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

function nodoDe(id, nombre, ficha, color, hijos = []) {
  return {
    id,
    nombre,
    autoria: ficha?.autoria ?? 'yo',
    autorNombre: ficha?.autorNombre?.trim() ?? '',
    titular: ficha?.titular ?? 'yo',
    respaldo: ficha?.respaldo ?? 'ninguno',
    licencia: ficha?.licencia ?? null,
    color: color ?? null,
    hijos,
  };
}

/**
 * Árbol de titularidad: el juego es del estudiante; de él cuelgan el título, la historia
 * (con las escenas), cada personaje con su retrato y los demás elementos.
 * @param {object} proyecto
 * @param {Map} semaforos resultado de evaluarTodo (se calcula si no se pasa)
 */
export function construir(proyecto, semaforos = evaluarTodo(proyecto)) {
  const { juego, fichas } = proyecto;
  const color = (id) => semaforos.get(id)?.color ?? null;
  const elementoNodo = (e) => nodoDe(e.id, `${NOMBRES_TIPO_CREDITO[e.tipo]} «${nombreDe(e, 'sin nombre')}»`, fichas[e.id], color(e.id));
  const retratos = new Set(juego.personajes.map((p) => p.retrato).filter(Boolean));
  const personajes = juego.personajes.map((p) => {
    const retrato = juego.elementos.find((e) => e.id === p.retrato);
    return nodoDe(p.id, `personaje «${nombreDe(p, 'sin nombre')}»`, fichas[p.id], color(p.id), retrato ? [elementoNodo(retrato)] : []);
  });
  const sueltos = juego.elementos.filter((e) => !retratos.has(e.id)).map(elementoNodo);
  return {
    id: 'juego',
    nombre: juego.titulo?.trim() || 'Sin título',
    estudiante: proyecto.estudiante?.trim() || 'Sin nombre',
    hijos: [
      nodoDe('titulo', 'título', fichas.titulo, color('titulo')),
      nodoDe('historia', 'historia y escenas', fichas.historia, color('historia')),
      ...personajes,
      ...sueltos,
    ],
  };
}

/** Línea de crédito de una ficha, o null si la pieza es del estudiante y no tiene crédito escrito. */
function creditoDe(ficha, etiqueta, estudiante) {
  if (!ficha) return null;
  const escrito = ficha.credito?.trim();
  if (escrito) return escrito;
  const herramienta = ficha.herramientaIA?.trim() || 'herramienta no indicada';
  if (ficha.autoria === 'otra_persona') return `${etiqueta}: ${ficha.autorNombre?.trim() || 'otra persona'}`;
  if (ficha.autoria === 'ia') return `${etiqueta}: generado con IA (${herramienta})`;
  if (ficha.autoria === 'ia_con_aporte') return `${etiqueta}: hecho con IA (${herramienta}) con aporte creativo de ${estudiante}`;
  return null;
}

/** Pantalla de créditos: el estudiante, cada persona nombrada con su aporte, cada crédito escrito y cada pieza con IA. */
export function creditos(proyecto) {
  const { juego, fichas } = proyecto;
  const estudiante = proyecto.estudiante?.trim() || 'Sin nombre';
  const lineas = [];
  const agregar = (texto) => {
    if (texto && !lineas.includes(texto)) lineas.push(texto);
  };
  // Modo guiado: el juego de ejemplo no es del estudiante; mientras quede algo de él, se dice (publicar exige que no quede nada).
  if (piezasDeMuestra(proyecto).total > 0) agregar(`Este juego aún tiene piezas de muestra del ejemplo «${TEXTOS_MUESTRA.titulo}», escritas y dibujadas por la plataforma.`);
  const historia = creditoDe(fichas.historia, 'Historia', estudiante);
  if (historia) {
    agregar(`${estudiante}: autor(a) del juego`);
    agregar(historia);
  } else {
    agregar(`${estudiante}: autor(a) del juego y de la historia`);
  }
  for (const personaje of juego.personajes) agregar(creditoDe(fichas[personaje.id], `Personaje «${nombreDe(personaje, 'sin nombre')}»`, estudiante));
  for (const elemento of juego.elementos) agregar(creditoDe(fichas[elemento.id], `${capitalizar(NOMBRES_TIPO_CREDITO[elemento.tipo])} «${nombreDe(elemento, 'sin nombre')}»`, estudiante));
  return lineas;
}
