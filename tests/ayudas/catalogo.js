// tests/ayudas/catalogo.js
// Catálogo de prueba: cumple los mínimos y la mezcla de la sección 11 con piezas ficticias.
const SIMULADO = { licencia: 'CC0', autor: 'Generada por programa, sin autor humano', fuente: 'scripts/prueba.js' };

function pieza(id, tipo, titulo, licencia, extra = {}) {
  const carpeta = { fondo: 'fondos', retrato: 'retratos', musica: 'musica', efecto: 'efectos' }[tipo];
  const ext = tipo === 'fondo' || tipo === 'retrato' ? 'png' : 'wav';
  const condiciones = { DP: [], CC0: [], 'CC-BY-4.0': ['BY'], 'CC-BY-SA-4.0': ['BY', 'SA'], 'CC-BY-NC-4.0': ['BY', 'NC'], 'CC-BY-ND-4.0': ['BY', 'ND'], CURSO: [], DESCONOCIDO: [] }[licencia];
  return {
    id, tipo, titulo,
    autor: licencia === 'DESCONOCIDO' ? 'Desconocido' : 'Autora de Prueba',
    fuente: 'https://ejemplo.test/piezas/' + id,
    licencia, condiciones,
    archivo: `${carpeta}/${id}.${ext}`,
    creditoSugerido: licencia === 'DESCONOCIDO' ? '' : `«${titulo}», Autora de Prueba, ${licencia}`,
    ...(licencia === 'CURSO' || licencia === 'DESCONOCIDO' ? { simulado: SIMULADO } : {}),
    ...extra,
  };
}

export function catalogoDePrueba() {
  const piezas = [];
  const fondos = ['CC-BY-4.0', 'CC0', 'CC-BY-SA-4.0', 'CC-BY-ND-4.0', 'DP', 'CC-BY-4.0', 'CURSO', 'DESCONOCIDO'];
  const retratos = ['CC-BY-4.0', 'CC0', 'CC-BY-SA-4.0', 'CC-BY-ND-4.0', 'DP', 'CC-BY-4.0', 'CURSO', 'DESCONOCIDO'];
  const musica = ['CC-BY-4.0', 'CC0', 'CC-BY-NC-4.0', 'DP', 'CC-BY-SA-4.0', 'CURSO'];
  const efectos = ['CC-BY-4.0', 'CC0', 'CC-BY-NC-4.0', 'DP', 'CC-BY-4.0', 'CC0', 'CC-BY-SA-4.0', 'CC-BY-4.0', 'CC0', 'DP', 'CURSO', 'DESCONOCIDO'];
  fondos.forEach((l, i) => piezas.push(pieza(`bib_f${i + 1}`, 'fondo', `Fondo ${i + 1}`, l)));
  retratos.forEach((l, i) => piezas.push(pieza(`bib_r${i + 1}`, 'retrato', `Retrato ${i + 1}`, l)));
  musica.forEach((l, i) => piezas.push(pieza(`bib_m${i + 1}`, 'musica', `Pista ${i + 1}`, l)));
  efectos.forEach((l, i) => piezas.push(pieza(`bib_e${i + 1}`, 'efecto', `Efecto ${i + 1}`, l)));
  return { version: 1, provisional: false, piezas };
}

export { pieza };
