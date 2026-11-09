// plataforma/js/editor/panel-ficha.js
// La ficha jurídica en pantalla (spec, secciones 12.2, 12.3, 12.4 y 12.9): seis
// campos con su explicación breve y «ver más» (texto completo y fuente), y el
// resultado del semáforo con razones, acciones y notas. Qué se muestra y qué se
// limpia lo decide juridico/formulario.js; aquí solo se dibuja.
// Los textos pendientes de verificación llevan la marca «Por verificar» (spec 19.13).
import { h, rellenar } from '../ui/dom.js';
import { evaluar } from '../juridico/semaforo.js';
import { describir } from '../juridico/textos.js';
import { visibles, aplicarCambio, ETIQUETAS, PREGUNTAS, LICENCIAS_ELEGIBLES } from '../juridico/formulario.js';
import { LICENCIAS, CONDICIONES } from '../juridico/licencias.js';
import { TIPOS_OBRA } from '../juridico/ficha.js';

export const NOMBRES_COLOR = { verde: 'verde', amarillo: 'amarillo', rojo: 'rojo' };

export function marcaPorVerificar(entrada) {
  if (entrada?.verificacion !== 'pendiente') return null;
  return h('span', { class: 'por-verificar', title: 'Texto pendiente de verificación jurídica' }, 'Por verificar');
}

/** Punto de color con nombre accesible. */
export function puntoSemaforo(color, etiqueta = 'Semáforo') {
  return h('span', { class: `punto-semaforo semaforo-${color}`, role: 'img', 'aria-label': `${etiqueta}: ${NOMBRES_COLOR[color] ?? color}` });
}

function verMas(entrada) {
  return h('details', { class: 'ficha-mas' }, h('summary', {}, 'Ver más'), h('p', {}, entrada.completo), h('p', { class: 'ficha-fuente' }, 'Fuente: ', entrada.fuente));
}

/** Explicación de un campo o tipo de obra: breve, marca de verificación y «ver más». */
export function explicacion(entrada) {
  if (!entrada) return null;
  return h('div', { class: 'ficha-explicacion' }, h('p', { class: 'ficha-breve' }, entrada.breve, ' ', marcaPorVerificar(entrada)), verMas(entrada));
}

const nombreLicencia = (codigo) => LICENCIAS[codigo]?.nombre ?? codigo;
const fuenteNodo = (fuente) => (/^https?:\/\//.test(fuente) ? h('a', { href: fuente, target: '_blank', rel: 'noopener' }, fuente) : h('code', {}, fuente));
const URL_LICENCIA_CURSO = new URL('../../biblioteca/LICENCIA-CURSO.md', import.meta.url).href;

/**
 * @param {object} sesion de crearSesion
 * @param {string} idFicha 'titulo' | 'historia' | id de personaje | id de elemento
 * @param {{ contenido: object, alSeleccionar?: (seleccion: object) => void, titulo?: string, piezaDe?: (id: string) => object|null }} opciones
 *   piezaDe devuelve la entrada del catálogo de una pieza de biblioteca (para la fuente y lo simulado); puede faltar.
 *   alReemplazar(clave) abre Pixel art ('pixel'), Subir archivo ('subir') o la Biblioteca ('biblioteca') para
 *   reemplazar un retrato de muestra del ejemplo; puede faltar.
 * @returns {HTMLElement}
 */
export function panelFicha(sesion, idFicha, { contenido, alSeleccionar = () => {}, titulo = 'Ficha jurídica', piezaDe = () => null, alReemplazar = null }) {
  const ficha = sesion.proyecto.fichas[idFicha];
  if (!ficha) return h('section', { class: 'ficha' }, h('h3', {}, titulo), h('p', { class: 'vacio' }, 'Esta ficha ya no existe.'));
  const { juego } = sesion.proyecto;
  const elemento = juego.elementos.find((e) => e.id === idFicha) ?? null;
  // Un retrato de muestra del ejemplo no se resuelve: se reemplaza (diseño del modo guiado, sección 5).
  if (elemento?.origen === 'muestra') {
    const opciones = [['pixel', 'Pixel art'], ['subir', 'Subir archivo'], ['biblioteca', 'Biblioteca']];
    return h('section', { class: 'ficha ficha-muestra', tabIndex: -1, dataset: { ficha: idFicha, foco: `ficha:${idFicha}` }, 'aria-label': titulo },
      h('h3', {}, titulo),
      h('p', { class: 'ficha-muestra-aviso' }, 'Retrato de muestra del ejemplo: reemplázalo por uno tuyo.'),
      alReemplazar ? h('div', { class: 'acciones' }, opciones.map(([clave, texto]) =>
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: `reemplazar-${clave}` }, onclick: () => alReemplazar(clave) }, texto))) : null);
  }
  const pieza = elemento?.biblioteca ? piezaDe(elemento.biblioteca.id) : null;
  const v = visibles(ficha);
  const fijo = (campo) => v.soloLectura.includes(campo);
  const clave = (campo, extra = '') => `ficha:${idFicha}:${campo}${extra ? `:${extra}` : ''}`;
  const cambiarOpcion = (campo, valor) => sesion.cambiar(() => aplicarCambio(ficha, campo, valor), { origen: 'ficha' });
  const cambiarTexto = (campo) => (e) => {
    sesion.cambiar(() => aplicarCambio(ficha, campo, e.target.value), { origen: 'propiedades' });
    pintarResultado();
  };
  const resultado = h('div', { class: 'ficha-resultado', 'aria-live': 'polite' });

  function razonNodo(r, clase) {
    return h('li', { class: clase, dataset: { codigo: r.codigo } },
      h('p', {}, r.breve, ' ', marcaPorVerificar(r)),
      r.accion ? h('p', { class: 'accion' }, h('strong', {}, 'Qué hacer: '), r.accion) : null,
      verMas(r));
  }

  function pintarResultado() {
    const descrito = describir(evaluar(ficha, { destino: sesion.proyecto.juego.destino }), ficha, contenido);
    const hayA01 = descrito.razones.some((r) => r.codigo === 'A01');
    const razones = hayA01 ? descrito.razones.filter((r) => r.codigo !== 'A02') : descrito.razones;
    rellenar(resultado,
      h('p', { class: 'ficha-color' }, puntoSemaforo(descrito.color), ' ', h('strong', {}, `Semáforo: ${NOMBRES_COLOR[descrito.color]}`)),
      razones.length ? h('ul', { class: 'ficha-razones' }, razones.map((r) => razonNodo(r, 'razon'))) : h('p', { class: 'ficha-ok' }, 'Ninguna regla aplica.'),
      descrito.notas.length ? h('ul', { class: 'ficha-notas' }, descrito.notas.map((n) => razonNodo(n, 'nota'))) : null,
    );
  }

  // ---- controles ----
  const grupo = (campo, hijos) => h('fieldset', { class: 'ficha-campo', dataset: { campo } }, h('legend', {}, PREGUNTAS[campo]), explicacion(contenido.campos?.[campo]), hijos);

  function radios(campo) {
    if (fijo(campo)) return h('p', { class: 'ficha-fijo' }, ETIQUETAS[campo][ficha[campo]] ?? ficha[campo]);
    return h('div', { class: 'ficha-radios', role: 'radiogroup', 'aria-label': PREGUNTAS[campo] }, Object.entries(ETIQUETAS[campo]).map(([valor, texto]) =>
      h('label', { class: 'ficha-radio' }, h('input', { type: 'radio', name: `${idFicha}-${campo}`, value: valor, checked: ficha[campo] === valor, dataset: { foco: clave(campo, valor) }, onchange: () => cambiarOpcion(campo, valor) }), ' ', texto)));
  }

  function casilla(campo, texto) {
    return h('label', { class: 'ficha-casilla' }, h('input', { type: 'checkbox', checked: ficha[campo] === true, dataset: { foco: clave(campo) }, onchange: (e) => cambiarOpcion(campo, e.target.checked) }), ' ', texto);
  }

  function campoTexto(campo, etiqueta, { area = false, placeholder = '' } = {}) {
    if (fijo(campo)) return h('p', { class: 'ficha-fijo' }, ficha[campo]?.trim() || '—');
    const id = `${idFicha}-${campo}`;
    const control = area
      ? h('textarea', { id, rows: 2, value: ficha[campo] ?? '', placeholder, dataset: { foco: clave(campo) }, oninput: cambiarTexto(campo) })
      : h('input', { type: 'text', id, value: ficha[campo] ?? '', placeholder, dataset: { foco: clave(campo) }, oninput: cambiarTexto(campo) });
    return h('div', { class: 'campo' }, h('label', { for: id, class: 'campo-etiqueta' }, etiqueta), control);
  }

  function selectorLicencia() {
    if (fijo('licencia')) return h('p', { class: 'ficha-fijo' }, LICENCIAS[ficha.licencia]?.nombre ?? ficha.licencia ?? '—');
    const id = `${idFicha}-licencia`;
    const select = h('select', { id, dataset: { foco: clave('licencia') }, onchange: (e) => cambiarOpcion('licencia', e.target.value || null) },
      h('option', { value: '' }, 'Elige la licencia'),
      LICENCIAS_ELEGIBLES.map((codigo) => h('option', { value: codigo }, LICENCIAS[codigo].nombre)));
    select.value = ficha.licencia ?? '';
    return h('div', { class: 'campo' }, h('label', { for: id, class: 'campo-etiqueta' }, 'Cuál'), select);
  }

  function condiciones() {
    return h('div', { class: 'ficha-condiciones', role: 'group', 'aria-label': 'Condiciones de la licencia' }, CONDICIONES.map((c) =>
      h('label', { class: 'ficha-casilla' }, h('input', { type: 'checkbox', checked: ficha.condicionesOtra.includes(c), dataset: { foco: clave('condicionesOtra', c) }, onchange: (e) => {
        const nuevas = e.target.checked ? [...ficha.condicionesOtra, c] : ficha.condicionesOtra.filter((x) => x !== c);
        cambiarOpcion('condicionesOtra', nuevas);
      } }), ' ', ETIQUETAS.condiciones[c])));
  }

  function selectorPrueba() {
    const id = `${idFicha}-prueba`;
    const select = h('select', { id, dataset: { foco: clave('prueba') }, onchange: (e) => cambiarOpcion('prueba', e.target.value) },
      Object.entries(ETIQUETAS.prueba).map(([valor, texto]) => h('option', { value: valor }, texto)));
    select.value = ficha.prueba;
    return h('div', { class: 'campo' }, h('label', { for: id, class: 'campo-etiqueta' }, 'Prueba'), select);
  }

  /** De dónde salió una pieza de biblioteca y, si es simulada, lo que es en realidad (spec 11, honestidad del catálogo). */
  function piezaDeBiblioteca() {
    if (!elemento?.biblioteca) return null;
    const fuente = pieza?.fuente ?? null;
    return h('div', { class: 'ficha-pieza' },
      h('p', {}, 'De la biblioteca: ', h('strong', {}, pieza?.titulo ?? elemento.nombre), ` · ${elemento.biblioteca.autor?.trim() || 'autor desconocido'}`, fuente ? [' · ', fuenteNodo(fuente)] : null),
      pieza?.simulado ? h('details', { class: 'ficha-mas' }, h('summary', {}, 'Ver más'),
        h('p', {}, `En la vida real esta pieza es ${nombreLicencia(pieza.simulado.licencia)} de ${pieza.simulado.autor} (${pieza.simulado.fuente}); aquí se presenta como ${nombreLicencia(pieza.licencia)} para que practiques.`)) : null);
  }

  function enlaceRetrato() {
    if (ficha.tipo !== 'personaje') return null;
    const personaje = juego.personajes.find((p) => p.id === idFicha);
    if (!personaje?.retrato) return h('p', { class: 'ayuda' }, 'Su retrato tendrá su propia ficha cuando se lo asignes.');
    return h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'ver-retrato' }, onclick: () => alSeleccionar({ tipo: 'elemento', id: personaje.retrato }) }, 'Ver la ficha del retrato');
  }

  // ---- secciones ----
  const secciones = [
    h('fieldset', { class: 'ficha-campo', dataset: { campo: 'tipoObra' } },
      h('legend', {}, PREGUNTAS.tipoObra),
      h('p', { class: 'ficha-fijo' }, TIPOS_OBRA[ficha.tipoObra]?.nombre ?? ficha.tipoObra),
      explicacion(contenido.tiposObra?.[ficha.tipoObra]),
      piezaDeBiblioteca(),
      enlaceRetrato()),
  ];
  if (v.autoria) {
    secciones.push(grupo('autoria', [
      radios('autoria'),
      v.autorNombre ? campoTexto('autorNombre', 'Nombre de la persona') : null,
      v.herramientaIA ? campoTexto('herramientaIA', 'Herramienta de IA') : null,
      v.aporteHumano ? campoTexto('aporteHumano', 'Describe tu aporte creativo', { area: true }) : null,
      v.reconoceSinDerechos ? casilla('reconoceSinDerechos', 'Entiendo que no puedo reclamar derechos sobre este elemento y lo declaro en los créditos') : null,
      v.basadoEnObraAjena ? casilla('basadoEnObraAjena', '¿Está basado en una obra ajena? (adaptación, versión de una canción, fan art)') : null,
      v.autorizacionDerivada ? casilla('autorizacionDerivada', 'Tengo autorización por escrito del autor de la obra original') : null,
    ]));
  }
  if (v.titular) secciones.push(grupo('titular', [radios('titular')]));
  if (v.respaldo) {
    secciones.push(grupo('respaldo', [
      radios('respaldo'),
      v.licencia ? selectorLicencia() : null,
      ficha.licencia === 'CURSO' ? h('p', {}, h('a', { class: 'ficha-enlace', href: URL_LICENCIA_CURSO, target: '_blank', rel: 'noopener', dataset: { accion: 'licencia-curso' } }, 'Leer la licencia del curso')) : null,
      v.licenciaTexto ? campoTexto('licenciaTexto', 'Describe la licencia', { area: true }) : null,
      v.condicionesOtra ? condiciones() : null,
      v.licenciaLeida ? casilla('licenciaLeida', 'Leí la licencia') : null,
      v.aceptaCompartirIgual ? casilla('aceptaCompartirIgual', 'Acepto licenciar mi juego igual') : null,
      v.modificado ? casilla('modificado', 'Lo modifiqué') : null,
    ]));
  }
  if (v.credito) secciones.push(grupo('credito', [campoTexto('credito', 'Crédito tal como saldrá en la pantalla de créditos')]));
  if (v.prueba) secciones.push(grupo('prueba', [selectorPrueba()]));

  pintarResultado();
  // La sección es enfocable (tabIndex -1) para que «Ver ficha» del mapa y la subida puedan llevar el foco a ella.
  return h('section', { class: `ficha ficha-${ficha.tipo}`, tabIndex: -1, dataset: { ficha: idFicha, foco: `ficha:${idFicha}` }, 'aria-label': titulo }, h('h3', {}, titulo), resultado, secciones);
}
