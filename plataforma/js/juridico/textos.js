// plataforma/js/juridico/textos.js
// Une el resultado del semáforo (códigos) con los textos de contenido/juridico.json.

/**
 * @param {{color: string, razones: string[], notas: string[]}} resultado de evaluar()
 * @param {object} ficha la ficha evaluada (para el nombre del autor)
 * @param {object} contenido el JSON de contenido/juridico.json ya cargado
 */
export function describir(resultado, ficha, contenido) {
  const autor = (ficha.autorNombre ?? '').trim() || 'esa persona';
  const razones = resultado.razones.map((codigo) => {
    const texto = contenido.reglas?.[codigo] ?? {};
    return {
      codigo,
      breve: texto.breve ?? codigo,
      completo: texto.completo ?? '',
      fuente: texto.fuente ?? '',
      accion: (texto.accion ?? '').replaceAll('{autor}', autor),
      verificacion: texto.verificacion ?? 'pendiente',
    };
  });
  const notas = resultado.notas.map((codigo) => {
    const texto = contenido.notas?.[codigo] ?? {};
    return {
      codigo,
      breve: texto.breve ?? codigo,
      completo: texto.completo ?? '',
      fuente: texto.fuente ?? '',
      verificacion: texto.verificacion ?? 'pendiente',
    };
  });
  return { color: resultado.color, razones, notas };
}

/** Carga el contenido en el navegador. En las pruebas se lee el JSON directamente. */
export async function cargarContenido(url = new URL('../../contenido/juridico.json', import.meta.url)) {
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error(`No se pudo cargar el contenido jurídico (${respuesta.status}).`);
  return respuesta.json();
}
