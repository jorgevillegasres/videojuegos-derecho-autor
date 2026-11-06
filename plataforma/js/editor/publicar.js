// plataforma/js/editor/publicar.js
// La capa de publicación sobre el editor (spec, sección 3 paso 5, 12.7 y 14), en dos
// pasos: la decisión de registro (hasta tres activos, con tres respuestas cada uno,
// guardadas en proyecto.registro al escribirlas) y el resumen del paquete con su peso
// (aviso si pasa el límite, sin bloquear). Generar y descargar lo hace el editor
// (alGenerar); aquí solo se decide y se muestra.
import { h, vaciar, conservarFoco } from '../ui/dom.js';
import { ETIQUETAS, ETIQUETAS_REGISTRO } from '../juridico/formulario.js';
import { LIMITES } from '../estado/archivos.js';
import { pesos, nombreDeEntrega } from '../exportar/paquete.js';
import { marcaPorVerificar } from './panel-ficha.js';
import { NOMBRES_TIPO } from './inventario.js';

export const MAXIMO_REGISTRO = 3;
const MOSTRAR_PESADOS = 5;

const mb = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;

/**
 * @param {HTMLElement} contenedor capa oculta hasta abrir()
 * @param {object} sesion de crearSesion
 * @param {{ contenido: object, alGenerar: () => Promise<void>, alCerrar?: () => void, limiteBytes?: number }} opciones
 */
export function crearPublicar(contenedor, sesion, { contenido, alGenerar, alCerrar = () => {}, limiteBytes = LIMITES.avisoPaqueteBytes }) {
  let abierto = false;
  let paso = 1;
  let error = '';
  let generando = false;

  // ---- candidatos y decisiones ----
  function candidatos() {
    const { juego } = sesion.proyecto;
    return [
      { id: 'historia', nombre: 'Historia', tipo: 'Historia' },
      ...juego.personajes.map((p) => ({ id: p.id, nombre: p.nombre?.trim() || 'Sin nombre', tipo: 'Personaje' })),
      ...juego.elementos.map((e) => ({ id: e.id, nombre: e.nombre?.trim() || 'Sin nombre', tipo: NOMBRES_TIPO[e.tipo] ?? e.tipo })),
    ];
  }

  function nuevaDecision(id) {
    const ficha = sesion.proyecto.fichas[id];
    const estudiante = sesion.proyecto.estudiante?.trim() || '';
    const aNombreDe = ficha?.titular === 'otra_persona' ? (ficha.autorNombre?.trim() || '') : estudiante;
    return { id, registraria: 'si', aNombreDe, prueba: ETIQUETAS.prueba[ficha?.prueba] ?? '', porque: '' };
  }

  const cambiar = (fn) => sesion.cambiar(fn, { origen: 'publicar' });

  /** Quita las decisiones de activos que ya no existen (sin avisar si no cambia nada). */
  function depurar() {
    const ids = new Set(candidatos().map((c) => c.id));
    const vivas = sesion.proyecto.registro.filter((d) => ids.has(d.id));
    if (vivas.length !== sesion.proyecto.registro.length) cambiar((p) => { p.registro = vivas; });
  }

  function alternar(id, marcado) {
    cambiar((p) => {
      p.registro = p.registro.filter((d) => d.id !== id);
      if (marcado && p.registro.length < MAXIMO_REGISTRO) p.registro.push(nuevaDecision(id));
    });
    error = '';
    dibujar();
  }

  function responder(id, campo, valor) {
    cambiar((p) => {
      const decision = p.registro.find((d) => d.id === id);
      if (decision) decision[campo] = valor;
    });
  }

  // ---- dibujo ----
  const cabecera = (titulo, resumen) => h('div', { class: 'mapa-cabecera' },
    h('div', {}, h('h2', { id: 'publicar-titulo' }, titulo), h('p', { class: 'mapa-resumen' }, resumen)),
    h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'cerrar-publicar', foco: 'cerrar' }, onclick: cerrar }, 'Cerrar'));
  const mensajeError = () => h('p', { class: 'publicar-error inicio-error', role: 'alert', hidden: !error }, error);

  function explicacion() {
    const prueba = contenido?.campos?.prueba;
    const sello = contenido?.notas?.N_SELLO;
    return h('section', { class: 'publicar-explicacion' },
      prueba ? h('p', {}, prueba.breve, ' ', marcaPorVerificar(prueba)) : null,
      prueba ? h('details', { class: 'ficha-mas' }, h('summary', {}, 'Ver más'), h('p', {}, prueba.completo), h('p', { class: 'ficha-fuente' }, 'Fuente: ', prueba.fuente)) : null,
      sello ? h('p', { class: 'ayuda' }, sello.breve, ' ', marcaPorVerificar(sello)) : null,
      h('p', {}, 'Elige hasta tres activos de tu juego y responde por cada uno. No hay respuesta correcta: lo que escribas va al informe para que el docente lo lea.'));
  }

  function decisionNodo(decision, candidato) {
    const id = decision.id;
    const campoTexto = (campo, etiqueta, { area = false } = {}) => {
      const idControl = `registro-${id}-${campo}`;
      const control = area
        ? h('textarea', { id: idControl, rows: 2, value: decision[campo] ?? '', dataset: { campo, foco: `registro:${id}:${campo}` }, oninput: (e) => responder(id, campo, e.target.value) })
        : h('input', { type: 'text', id: idControl, value: decision[campo] ?? '', dataset: { campo, foco: `registro:${id}:${campo}` }, oninput: (e) => responder(id, campo, e.target.value) });
      return h('div', { class: 'campo' }, h('label', { for: idControl, class: 'campo-etiqueta' }, etiqueta), control);
    };
    return h('article', { class: 'publicar-decision', dataset: { decision: id } },
      h('h3', {}, candidato.nombre, ' ', h('span', { class: 'entrada-detalle' }, candidato.tipo)),
      h('div', { class: 'ficha-radios', role: 'radiogroup', 'aria-label': '¿Lo registrarías ante la DNDA?' },
        h('p', { class: 'campo-etiqueta' }, '¿Lo registrarías ante la DNDA?'),
        Object.entries(ETIQUETAS_REGISTRO).map(([valor, texto]) => h('label', { class: 'ficha-radio' },
          h('input', { type: 'radio', name: `registraria-${id}`, value: valor, checked: decision.registraria === valor, dataset: { foco: `registro:${id}:registraria:${valor}` }, onchange: () => responder(id, 'registraria', valor) }), ' ', texto))),
      campoTexto('aNombreDe', '¿A nombre de quién?'),
      campoTexto('prueba', '¿Con qué prueba?'),
      campoTexto('porque', '¿Por qué? (opcional)', { area: true }));
  }

  function paso1() {
    const lista = candidatos();
    const registro = sesion.proyecto.registro;
    const elegidos = new Set(registro.map((d) => d.id));
    const lleno = elegidos.size >= MAXIMO_REGISTRO;
    return [
      cabecera('Publicar: decisión de registro', `Paso 1 de 2. Antes de generar el paquete, una pausa corta: ¿registrarías algo de tu juego ante la DNDA? Llevas ${elegidos.size} de ${MAXIMO_REGISTRO}.`),
      explicacion(),
      h('fieldset', { class: 'publicar-candidatos' },
        h('legend', {}, 'Activos'),
        lista.map((c) => h('label', { class: 'publicar-candidato' },
          h('input', { type: 'checkbox', checked: elegidos.has(c.id), disabled: lleno && !elegidos.has(c.id), dataset: { candidato: c.id, foco: `candidato:${c.id}` }, onchange: (e) => alternar(c.id, e.target.checked) }),
          ' ', h('span', { class: 'candidato-nombre' }, c.nombre), ' ', h('span', { class: 'entrada-detalle' }, c.tipo)))),
      h('div', { class: 'publicar-decisiones' }, registro.map((d) => decisionNodo(d, lista.find((c) => c.id === d.id)))),
      mensajeError(),
      h('div', { class: 'acciones' },
        h('button', { type: 'button', class: 'btn btn-primary', dataset: { accion: 'siguiente', foco: 'siguiente' }, onclick: siguiente }, 'Siguiente: el paquete'),
        h('button', { type: 'button', class: 'btn btn-ghost', dataset: { accion: 'cancelar' }, onclick: cerrar }, 'Cancelar')),
    ];
  }

  function paso2() {
    const proyecto = sesion.proyecto;
    const peso = pesos(proyecto, sesion.archivos);
    const pesado = peso.estimado > limiteBytes;
    return [
      cabecera('Publicar: el paquete de entrega', 'Paso 2 de 2. Se genera un archivo comprimido que subes al formulario del curso.'),
      h('section', { class: 'publicar-resumen' },
        h('p', {}, 'Nombre: ', h('code', {}, nombreDeEntrega(proyecto))),
        h('ul', {},
          h('li', {}, h('code', {}, 'juego.html'), ': el juego completo en un solo archivo; se abre en cualquier navegador sin internet.'),
          h('li', {}, h('code', {}, 'informe-juridico.html'), ': el informe para el docente; desde el navegador se guarda como PDF.'),
          h('li', {}, h('code', {}, 'proyecto.json'), ' y ', h('code', {}, 'archivos/'), `: el proyecto en bruto (${peso.elementos.length} archivos), el mismo formato de «Guardar copia».`))),
      pesado
        ? h('div', { class: 'publicar-peso', role: 'alert' },
          h('p', {}, h('strong', {}, `El paquete pesará unos ${mb(peso.estimado)}`), `, y supera los ${mb(limiteBytes)} que acepta el formulario con holgura. Estos son los elementos que más pesan; puedes reemplazar alguno o seguir igual.`),
          h('table', { class: 'mapa-tabla' },
            h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Elemento'), h('th', { scope: 'col' }, 'Tipo'), h('th', { scope: 'col' }, 'Peso'))),
            h('tbody', {}, peso.elementos.slice(0, MOSTRAR_PESADOS).map((e) => h('tr', {}, h('td', {}, e.nombre), h('td', {}, NOMBRES_TIPO[e.tipo] ?? e.tipo), h('td', {}, mb(e.bytes)))))))
        : h('p', { class: 'publicar-peso-ok ayuda' }, `Peso estimado: ${mb(peso.estimado)} (cada archivo va en bruto y dentro de juego.html).`),
      mensajeError(),
      h('div', { class: 'acciones' },
        h('button', { type: 'button', class: 'btn btn-primary', dataset: { accion: 'generar', foco: 'generar' }, disabled: generando, onclick: generar }, generando ? 'Generando…' : 'Generar y descargar'),
        h('button', { type: 'button', class: 'btn btn-ghost', dataset: { accion: 'volver' }, disabled: generando, onclick: () => { paso = 1; error = ''; dibujar(); } }, 'Volver'),
        h('button', { type: 'button', class: 'btn btn-ghost', dataset: { accion: 'cancelar' }, disabled: generando, onclick: cerrar }, 'Cancelar')),
    ];
  }

  function dibujar({ enfocar = null } = {}) {
    conservarFoco(contenedor, () => {
      vaciar(contenedor).append(h('div', { class: 'publicar', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'publicar-titulo', onkeydown: (e) => { if (e.key === 'Escape' && !generando) cerrar(); } },
        paso === 1 ? paso1() : paso2()));
    });
    if (enfocar) contenedor.querySelector(`[data-foco="${enfocar}"]`)?.focus();
  }

  // ---- acciones ----
  function siguiente() {
    if (sesion.proyecto.registro.length === 0) {
      error = 'Elige al menos un activo y responde por él antes de seguir.';
      dibujar();
      return;
    }
    paso = 2;
    error = '';
    dibujar({ enfocar: 'generar' });
  }

  async function generar() {
    if (generando) return;
    generando = true;
    error = '';
    dibujar();
    try {
      await alGenerar();
      generando = false;
      cerrar();
    } catch (fallo) {
      generando = false;
      error = fallo?.message ? String(fallo.message) : String(fallo);
      dibujar({ enfocar: 'generar' });
    }
  }

  function abrir() {
    abierto = true;
    paso = 1;
    error = '';
    generando = false;
    depurar();
    contenedor.hidden = false;
    dibujar({ enfocar: 'cerrar' });
  }

  function cerrar() {
    if (!abierto) return;
    abierto = false;
    vaciar(contenedor);
    contenedor.hidden = true;
    alCerrar();
  }

  return {
    abrir,
    cerrar,
    get abierto() { return abierto; },
  };
}
