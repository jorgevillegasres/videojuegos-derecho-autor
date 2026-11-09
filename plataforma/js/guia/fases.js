// plataforma/js/guia/fases.js
// Las nueve fases del modo guiado (diseño del modo guiado, sección 6) y el estado de la
// guía calculado del proyecto. Puro: cada tarea es un texto fijo y una condición sobre
// el proyecto, sus semáforos, su mínimo y sus avisos. Las instrucciones no afirman nada
// jurídico; las lecciones son claves de contenido/juridico.json.
import { FASES_GUIA } from '../estado/modelo.js';
import { evaluarTodo } from '../juridico/semaforo.js';
import { cumpleMinimo, validar } from '../estado/validacion.js';
import { TEXTOS_MUESTRA, esTextoDeMuestra, piezasDeMuestra } from './muestra.js';

const vacio = (texto) => !String(texto ?? '').trim();
const verde = (c, id) => c.semaforos.get(id)?.color === 'verde';
const cumple = (c, codigo) => !c.faltan.has(codigo);
const deTipo = (c, ...tipos) => c.juego.elementos.filter((e) => tipos.includes(e.tipo));
const todosVerdes = (c, lista) => lista.every((e) => verde(c, e.id));

/** Retratos propios (no de muestra) que usan los personajes. */
function retratosPropios(c) {
  return c.juego.personajes
    .map((p) => c.juego.elementos.find((e) => e.id === p.retrato))
    .filter((e) => e && e.origen !== 'muestra');
}

export const FASES = [
  {
    id: 'conocer',
    nombre: 'Conoce el ejemplo',
    instruccion: 'Juega «La llave del faro» de principio a fin. Fíjate en sus piezas: la historia, los personajes, sus retratos, el fondo y los sonidos. En las fases siguientes las vas a hacer tuyas.',
    leccion: ['campos.tipoObra'],
    tareas: [{ texto: 'Juega el ejemplo hasta los créditos', cumple: (c) => c.proyecto.guia?.jugado === true }],
  },
  {
    id: 'historia',
    nombre: 'Tu historia',
    instruccion: 'Cambia el título y la sinopsis en «El juego» y reescribe en el guion cada línea del ejemplo con tus palabras. Puedes cambiar las escenas, pero conserva tres y una decisión.',
    leccion: ['tiposObra.literaria', 'notas.N_TITULO'],
    tareas: [
      { texto: 'Ponle tu título', cumple: (c) => !vacio(c.juego.titulo) && !c.muestra.titulo },
      { texto: 'Escribe tu sinopsis', cumple: (c) => !vacio(c.juego.sinopsis) && !c.muestra.sinopsis },
      { texto: 'Reescribe las 8 líneas de muestra', cumple: (c) => c.muestra.lineas === 0, detalle: (c) => `quedan ${c.muestra.lineas}` },
      { texto: 'Conserva tres escenas y una decisión', cumple: (c) => cumple(c, 'M_ESCENAS') && cumple(c, 'M_DECISIONES') && !c.avisos.some((a) => a.nivel === 'bloqueante') },
      { texto: 'Ficha de la historia en verde', cumple: (c) => verde(c, 'historia') },
    ],
  },
  {
    id: 'personajes',
    nombre: 'Tus personajes',
    instruccion: 'Dale a cada personaje un nombre y una descripción tuyos. Los diálogos los siguen: no hace falta reasignarlos.',
    leccion: ['campos.autoria'],
    tareas: [
      { texto: 'Dales nombre y descripción a los dos personajes', cumple: (c) => c.juego.personajes.length >= 2 && c.juego.personajes.every((p) => !vacio(p.nombre) && !vacio(p.descripcion) && !esTextoDeMuestra(p.nombre, TEXTOS_MUESTRA.personajes)) },
      { texto: 'Fichas de los personajes en verde', cumple: (c) => c.juego.personajes.every((p) => verde(c, p.id)) },
    ],
  },
  {
    id: 'retratos',
    nombre: 'Sus retratos',
    instruccion: 'Haz o consigue un retrato para cada personaje con Pixel art, Subir archivo o la Biblioteca, y asígnaselo en sus propiedades. El retrato de muestra desaparece solo cuando ya nadie lo usa.',
    leccion: ['tiposObra.artistica', 'campos.prueba', 'notas.N_SELLO'],
    tareas: [
      { texto: 'Reemplaza el retrato de cada personaje', cumple: (c) => c.juego.personajes.length > 0 && retratosPropios(c).length === c.juego.personajes.length },
      { texto: 'Fichas de los retratos en verde', cumple: (c) => retratosPropios(c).length > 0 && todosVerdes(c, retratosPropios(c)) },
    ],
  },
  {
    id: 'fondo',
    nombre: 'El fondo',
    instruccion: 'El muelle tiene un fondo de la biblioteca. Puedes quedártelo si resuelves su ficha, o cambiarlo por uno tuyo en las propiedades de la escena.',
    leccion: ['campos.respaldo', 'campos.credito'],
    tareas: [
      { texto: 'La escena inicial tiene fondo', cumple: (c) => {
        const inicial = c.juego.escenas.find((e) => e.id === c.juego.escenaInicial);
        return Boolean(inicial?.fondo) && c.juego.elementos.some((e) => e.id === inicial.fondo && e.tipo === 'fondo');
      } },
      { texto: 'Fichas de los fondos en verde', cumple: (c) => cumple(c, 'M_FONDOS') && todosVerdes(c, deTipo(c, 'fondo')) },
    ],
  },
  {
    id: 'sonido',
    nombre: 'Música y efectos',
    instruccion: 'La música y el efecto del ejemplo vienen de la biblioteca. Resuelve sus fichas o cámbialos por los tuyos con el Secuenciador, Grabar o la Biblioteca.',
    leccion: ['tiposObra.musical_fonograma', 'tiposObra.fonograma'],
    tareas: [
      { texto: 'Al menos una pista y un efecto', cumple: (c) => cumple(c, 'M_MUSICA') && cumple(c, 'M_EFECTOS') },
      { texto: 'Fichas de música y efectos en verde', cumple: (c) => todosVerdes(c, deTipo(c, 'musica', 'efecto')) },
    ],
  },
  {
    id: 'voz',
    nombre: 'Una voz (opcional)',
    instruccion: 'Si quieres, graba una voz con Grabar y asígnala a un diálogo en sus propiedades. Puedes pasar a la siguiente fase sin hacerlo.',
    leccion: ['tiposObra.interpretacion'],
    opcional: true,
    tareas: [{ texto: '(Opcional) Graba una voz y resuelve su ficha', cumple: (c) => todosVerdes(c, deTipo(c, 'voz')) }],
  },
  {
    id: 'destino',
    nombre: 'Destino y mapa',
    instruccion: 'Revisa el destino en «El juego»: cambiarlo puede cambiar los semáforos. Luego abre el mapa de activos y comprueba que todo esté en verde y que no quede nada de muestra.',
    leccion: ['campos.destino', 'campos.titular'],
    tareas: [
      { texto: 'Todo en verde', cumple: (c) => [...c.semaforos.values()].every((r) => r.color === 'verde') },
      { texto: 'Sin piezas de muestra', cumple: (c) => cumple(c, 'M_MUESTRA') },
      { texto: 'Al menos una pieza que no hiciste tú', cumple: (c) => cumple(c, 'M_AJENOS') },
    ],
  },
  {
    id: 'publicar',
    nombre: 'Publicar',
    instruccion: 'Pulsa «Publicar», toma la decisión de registro y descarga el paquete. Súbelo al formulario del curso.',
    leccion: [],
    tareas: [{ texto: 'Publica y descarga el paquete', cumple: (c) => typeof c.proyecto.publicado === 'string' }],
  },
];

/**
 * Estado de la guía para el proyecto. Calcula semáforos, mínimo, avisos y piezas de
 * muestra una sola vez. La fase actual sale de proyecto.guia.fase (la primera si no se reconoce).
 * @returns {{ fases: Array<{ id, nombre, opcional, completa, tareas: Array<{ texto, cumplida, detalle }> }>, actual, indiceActual, puedeAvanzar, puedeIrA(id): boolean }}
 */
export function estadoDeGuia(proyecto) {
  const c = {
    proyecto,
    juego: proyecto.juego,
    semaforos: evaluarTodo(proyecto),
    faltan: new Set(cumpleMinimo(proyecto).faltantes.map((f) => f.codigo)),
    avisos: validar(proyecto.juego),
    muestra: piezasDeMuestra(proyecto),
  };
  const fases = FASES.map((fase) => {
    const tareas = fase.tareas.map((t) => {
      const cumplida = Boolean(t.cumple(c));
      return { texto: t.texto, cumplida, detalle: !cumplida && t.detalle ? t.detalle(c) : null };
    });
    return { id: fase.id, nombre: fase.nombre, opcional: fase.opcional === true, completa: tareas.every((t) => t.cumplida), tareas };
  });
  const indiceActual = Math.max(0, FASES.findIndex((f) => f.id === proyecto.guia?.fase));
  const avanzable = (i) => fases[i].completa || fases[i].opcional;
  return {
    fases,
    actual: fases[indiceActual],
    indiceActual,
    puedeAvanzar: indiceActual < fases.length - 1 && avanzable(indiceActual),
    puedeIrA(id) {
      const destino = FASES.findIndex((f) => f.id === id);
      if (destino === -1) return false;
      if (destino <= indiceActual) return true;
      for (let i = indiceActual; i < destino; i += 1) if (!avanzable(i)) return false;
      return true;
    },
  };
}
