// plataforma/js/juridico/licencias.js
// Códigos de licencia que entiende la plataforma y las condiciones que imponen.
// Las condiciones son las de Creative Commons: BY (atribución), NC (no comercial),
// SA (compartir igual), ND (sin derivadas). CURSO y DESCONOCIDO no llevan
// condiciones: el semáforo las trata por su código.

export const LICENCIAS = {
  DP: { nombre: 'Dominio público', condiciones: [] },
  CC0: { nombre: 'Creative Commons Zero (CC0 1.0)', condiciones: [] },
  'CC-BY-4.0': { nombre: 'Creative Commons Atribución 4.0', condiciones: ['BY'] },
  'CC-BY-SA-4.0': { nombre: 'Creative Commons Atribución y compartir igual 4.0', condiciones: ['BY', 'SA'] },
  'CC-BY-NC-4.0': { nombre: 'Creative Commons Atribución y no comercial 4.0', condiciones: ['BY', 'NC'] },
  'CC-BY-ND-4.0': { nombre: 'Creative Commons Atribución y sin derivadas 4.0', condiciones: ['BY', 'ND'] },
  CURSO: { nombre: 'Licencia limitada al curso', condiciones: [] },
  DESCONOCIDO: { nombre: 'Autor desconocido (encontrado en internet)', condiciones: [] },
  OTRA: { nombre: 'Otra licencia (descríbela)', condiciones: null },
};

export const CONDICIONES = ['BY', 'NC', 'SA', 'ND'];

/** Condiciones que impone la licencia de una ficha. Con OTRA, las que marcó el estudiante. */
export function condicionesDe(ficha) {
  if (!ficha.licencia) return [];
  if (ficha.licencia === 'OTRA') return Array.isArray(ficha.condicionesOtra) ? ficha.condicionesOtra : [];
  return LICENCIAS[ficha.licencia]?.condiciones ?? [];
}
