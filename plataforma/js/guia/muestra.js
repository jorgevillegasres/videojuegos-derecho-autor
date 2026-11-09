// plataforma/js/guia/muestra.js
// El juego de ejemplo «La llave del faro» (diseño del modo guiado, secciones 4 y 5):
// sus textos, sus piezas de biblioteca y sus retratos, y el conteo puro de lo que queda
// de él en un proyecto. Se compara contra estas constantes, no contra marcas en el
// documento: editar no tiene que marcar nada y una copia vieja tiene cero piezas de muestra.
// No importa nada: lo usan la validación (estado/) y la guía.

export const TEXTOS_MUESTRA = {
  titulo: 'La llave del faro',
  sinopsis: 'Una farera en su primer turno descubre quién abrió la puerta.',
  lineas: [
    'La niebla cubre el muelle. La puerta del faro está abierta.',
    '¿Quién dejó la puerta abierta?',
    'Yo la cerré al anochecer. Alguien subió después.',
    '¿Subes a la torre?',
    'La escalera gira hasta la luz. En el último peldaño hay una llave.',
    'Ana guarda la llave. Mañana sabrá de qué puerta es.',
    'Mejor esperar a que aclare.',
    'Al amanecer, la puerta sigue abierta y la llave ya no está.',
  ],
  personajes: ['Ana', 'El farero'],
};

export const PERSONAJES_MUESTRA = [
  { nombre: 'Ana', descripcion: 'Farera en su primer turno.' },
  { nombre: 'El farero', descripcion: 'Lleva treinta años cuidando la luz.' },
];

/** Las tres piezas de la biblioteca que usa el ejemplo. Si el catálogo cambia, deben seguir existiendo (lo comprueba tests/ejemplo.test.js). */
export const PIEZAS_BIBLIOTECA = {
  fondo: { id: 'bib_f01', titulo: 'Muelle de noche' },
  musica: { id: 'bib_m05', titulo: 'Fiesta en el muelle' },
  efecto: { id: 'bib_e02', titulo: 'Puerta que cruje' },
};

/** Retratos de muestra, en el orden de PERSONAJES_MUESTRA. Rutas relativas a plataforma/. */
export const RETRATOS_MUESTRA = [
  { nombre: 'Retrato de Ana (muestra)', archivo: 'ejemplo/retrato-ana.png' },
  { nombre: 'Retrato del farero (muestra)', archivo: 'ejemplo/retrato-farero.png' },
];

const normal = (texto) => String(texto ?? '').trim().toLocaleLowerCase('es');

/** ¿El texto es igual a alguno de la lista, sin contar espacios al borde ni mayúsculas? Un texto vacío nunca lo es. */
export function esTextoDeMuestra(texto, lista) {
  const buscado = normal(texto);
  return buscado !== '' && lista.some((m) => normal(m) === buscado);
}

/** Lo que queda del ejemplo en el proyecto. total es lo que cuenta M_MUESTRA. */
export function piezasDeMuestra(proyecto) {
  const { juego } = proyecto;
  const titulo = esTextoDeMuestra(juego.titulo, [TEXTOS_MUESTRA.titulo]);
  const sinopsis = esTextoDeMuestra(juego.sinopsis, [TEXTOS_MUESTRA.sinopsis]);
  const lineas = juego.escenas.flatMap((e) => e.lineas).filter((l) => esTextoDeMuestra(l.texto, TEXTOS_MUESTRA.lineas)).length;
  const personajes = juego.personajes.filter((p) => esTextoDeMuestra(p.nombre, TEXTOS_MUESTRA.personajes)).length;
  const elementos = juego.elementos.filter((e) => e.origen === 'muestra').length;
  return { titulo, sinopsis, lineas, personajes, elementos, total: Number(titulo) + Number(sinopsis) + lineas + personajes + elementos };
}
