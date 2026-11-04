// plataforma/js/estado/validacion.js
// Lectura pura del documento del juego: qué escenas se alcanzan y qué avisos
// (no jurídicos) tiene el editor. No muta nada. Los avisos 'bloqueante' impiden
// publicar; los 'informativo' solo se muestran.
import { indiceCorte } from './modelo.js';
import { evaluarTodo } from '../juridico/semaforo.js';

export const OPCIONES_MIN = 2;
export const OPCIONES_MAX = 4;

const etiqueta = (nombre, alternativa) => (nombre?.trim() ? `«${nombre}»` : alternativa);
const etiquetaEscena = (escena, indice) => etiqueta(escena.nombre, `sin nombre (n.º ${indice + 1})`);

/**
 * Escenas a las que se llega desde la inicial. Una escena termina en su primera
 * decisión o fin (indiceCorte); sin ninguna de las dos, sigue la siguiente escena
 * de la lista. Ids inexistentes se ignoran.
 */
export function escenasAlcanzables(juego) {
  const porId = new Map(juego.escenas.map((e) => [e.id, e]));
  const orden = juego.escenas.map((e) => e.id);
  const visitadas = new Set();
  const pendientes = [juego.escenaInicial];
  while (pendientes.length) {
    const id = pendientes.pop();
    if (!porId.has(id) || visitadas.has(id)) continue;
    visitadas.add(id);
    const escena = porId.get(id);
    const corte = indiceCorte(escena);
    if (corte === -1) {
      const siguiente = orden[orden.indexOf(id) + 1];
      if (siguiente) pendientes.push(siguiente);
    } else if (escena.lineas[corte].tipo === 'decision') {
      for (const opcion of escena.lineas[corte].opciones) pendientes.push(opcion.escena);
    }
  }
  return visitadas;
}

/**
 * Avisos del editor. Devuelve [{ nivel, codigo, mensaje, escena?, linea?, personaje? }].
 * Bloqueantes: B01 sin escena inicial, B02 opción sin destino, B03 diálogo sin
 * personaje, B04 decisión con menos de dos o más de cuatro opciones.
 * Informativos: I01 escena inalcanzable, I02 personaje sin retrato, I03 escena sin
 * líneas, I04 sin fin alcanzable, I05 líneas después del corte.
 * Con B01 no se calculan I01 ni I04, porque serían ruido de rebote.
 */
export function validar(juego) {
  const avisos = [];
  const idsEscenas = new Set(juego.escenas.map((e) => e.id));
  const idsPersonajes = new Set(juego.personajes.map((p) => p.id));
  const hayInicial = idsEscenas.has(juego.escenaInicial);

  if (!hayInicial) {
    avisos.push({ nivel: 'bloqueante', codigo: 'B01', mensaje: 'El juego no tiene escena inicial.' });
  }

  juego.escenas.forEach((escena, indiceEscena) => {
    const nombre = etiquetaEscena(escena, indiceEscena);
    if (escena.lineas.length === 0) {
      avisos.push({ nivel: 'informativo', codigo: 'I03', mensaje: `La escena ${nombre} no tiene líneas.`, escena: escena.id });
    }
    const corte = indiceCorte(escena);
    if (corte !== -1 && corte < escena.lineas.length - 1) {
      avisos.push({ nivel: 'informativo', codigo: 'I05', mensaje: `En ${nombre} hay líneas después de la decisión o el fin que nunca se verán.`, escena: escena.id, linea: corte + 1 });
    }
    escena.lineas.forEach((linea, i) => {
      if (linea.tipo === 'decision') {
        if (linea.opciones.length < OPCIONES_MIN || linea.opciones.length > OPCIONES_MAX) {
          avisos.push({ nivel: 'bloqueante', codigo: 'B04', mensaje: `La decisión en ${nombre} debe tener entre ${OPCIONES_MIN} y ${OPCIONES_MAX} opciones.`, escena: escena.id, linea: i });
        }
        linea.opciones.forEach((opcion, j) => {
          if (!idsEscenas.has(opcion.escena)) {
            avisos.push({ nivel: 'bloqueante', codigo: 'B02', mensaje: `La opción ${j + 1} de la decisión en ${nombre} no lleva a ninguna escena.`, escena: escena.id, linea: i });
          }
        });
      }
      if (linea.tipo === 'dialogo' && !idsPersonajes.has(linea.personaje)) {
        avisos.push({ nivel: 'bloqueante', codigo: 'B03', mensaje: `Un diálogo en ${nombre} no tiene personaje.`, escena: escena.id, linea: i });
      }
    });
  });

  for (const personaje of juego.personajes) {
    if (!personaje.retrato) {
      avisos.push({ nivel: 'informativo', codigo: 'I02', mensaje: `El personaje ${etiqueta(personaje.nombre, 'sin nombre')} no tiene retrato.`, personaje: personaje.id });
    }
  }

  if (hayInicial) {
    const alcanzables = escenasAlcanzables(juego);
    juego.escenas.forEach((escena, indiceEscena) => {
      if (!alcanzables.has(escena.id)) {
        avisos.push({ nivel: 'informativo', codigo: 'I01', mensaje: `A la escena ${etiquetaEscena(escena, indiceEscena)} no se llega desde el inicio.`, escena: escena.id });
      }
    });
    const hayFin = juego.escenas.some((e) => alcanzables.has(e.id) && e.lineas.some((l) => l.tipo === 'fin'));
    if (!hayFin) {
      avisos.push({ nivel: 'informativo', codigo: 'I04', mensaje: 'Ninguna escena alcanzable termina con una línea de fin; el juego terminará al acabar la última escena.' });
    }
  }
  return avisos;
}

// ---- Mínimo publicable (spec, sección 4) ----

// M_DECISIONES cuenta decisiones con dos o más opciones; el tope de cuatro lo bloquea validar() con B04. M_AJENOS mira solo elementos: son los únicos con origen y ficha de activo.
export const MINIMO = { escenas: 3, personajesConRetrato: 2, decisiones: 1, fondos: 1, musica: 1, efectos: 1, ajenos: 1 };

export function cumpleMinimo(proyecto) {
  const { juego, fichas } = proyecto;
  const faltantes = [];
  const exige = (codigo, mensaje, actual, requerido) => {
    if (actual < requerido) faltantes.push({ codigo, mensaje, actual, requerido });
  };
  const cuenta = (tipo) => juego.elementos.filter((e) => e.tipo === tipo).length;

  exige('M_TITULO', 'Título del juego', juego.titulo?.trim() ? 1 : 0, 1);
  exige('M_ESCENAS', 'Escenas', juego.escenas.length, MINIMO.escenas);
  exige('M_PERSONAJES', 'Personajes con retrato', juego.personajes.filter((p) => p.retrato).length, MINIMO.personajesConRetrato);
  const decisiones = juego.escenas.flatMap((e) => e.lineas).filter((l) => l.tipo === 'decision' && l.opciones.length >= 2).length;
  exige('M_DECISIONES', 'Decisiones con al menos dos opciones', decisiones, MINIMO.decisiones);
  exige('M_FONDOS', 'Fondos', cuenta('fondo'), MINIMO.fondos);
  exige('M_MUSICA', 'Pistas musicales', cuenta('musica'), MINIMO.musica);
  exige('M_EFECTOS', 'Efectos de sonido', cuenta('efecto'), MINIMO.efectos);
  const ajenos = juego.elementos.filter((e) => e.origen === 'biblioteca' || fichas[e.id]?.autoria === 'otra_persona').length;
  exige('M_AJENOS', 'Elementos que no hizo el estudiante (biblioteca u otra persona)', ajenos, MINIMO.ajenos);

  return { ok: faltantes.length === 0, faltantes };
}

// ---- Publicación ----

const nombreOAlternativa = (nombre, alternativa) => (nombre?.trim() ? nombre : alternativa);

export function nombreDe(proyecto, idFicha) {
  if (idFicha === 'titulo') return 'Título del juego';
  if (idFicha === 'historia') return 'Historia';
  const personaje = proyecto.juego.personajes.find((p) => p.id === idFicha);
  if (personaje) return nombreOAlternativa(personaje.nombre, 'Personaje sin nombre');
  const elemento = proyecto.juego.elementos.find((e) => e.id === idFicha);
  if (elemento) return nombreOAlternativa(elemento.nombre, 'Elemento sin nombre');
  return idFicha;
}

/**
 * Decide si se puede publicar: todas las fichas en verde, mínimo cumplido y sin
 * avisos bloqueantes. Calcula los tres a partir del proyecto, para que ninguna
 * llamada pueda usar datos viejos.
 * Devuelve { ok, motivos: [{ codigo, mensaje, ... }], resumen: { semaforo, minimo, bloqueantes } }.
 */
export function puedePublicar(proyecto) {
  const motivos = [];
  for (const [id, resultado] of evaluarTodo(proyecto)) {
    if (resultado.color !== 'verde') {
      motivos.push({ codigo: 'P_SEMAFORO', id, color: resultado.color, mensaje: `«${nombreDe(proyecto, id)}» está en ${resultado.color}.` });
    }
  }
  for (const faltante of cumpleMinimo(proyecto).faltantes) {
    motivos.push({ codigo: 'P_MINIMO', faltante: faltante.codigo, mensaje: `${faltante.mensaje}: ${faltante.actual} de ${faltante.requerido}.` });
  }
  for (const aviso of validar(proyecto.juego)) {
    if (aviso.nivel === 'bloqueante') motivos.push({ codigo: 'P_BLOQUEANTE', aviso: aviso.codigo, mensaje: aviso.mensaje });
  }
  const cuenta = (codigo) => motivos.filter((m) => m.codigo === codigo).length;
  return {
    ok: motivos.length === 0,
    motivos,
    resumen: { semaforo: cuenta('P_SEMAFORO'), minimo: cuenta('P_MINIMO'), bloqueantes: cuenta('P_BLOQUEANTE') },
  };
}
