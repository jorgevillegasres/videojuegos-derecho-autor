// plataforma/js/app.js
// Arranque: comprueba el navegador, carga el contenido, abre el almacén y muestra la
// pantalla de inicio o el editor. Atrapa los errores inesperados para que nunca quede
// una pantalla en blanco (spec, sección 17).
import { comprobar, NAVEGADORES } from './ui/capacidades.js';
import { h, rellenar } from './ui/dom.js';
import { cargarContenido } from './juridico/textos.js';
import { abrirAlmacen } from './estado/almacen.js';
import { crearProyecto } from './estado/modelo.js';
import { importarCopia } from './estado/copias.js';
import { crearSesion } from './editor/sesion.js';
import { crearInicio } from './editor/inicio.js';
import { crearEditor, elegirArchivoDelNavegador } from './editor/editor.js';
import { crearCatalogo } from './biblioteca/catalogo.js';
import { crearPixelArt } from './herramientas/pixelart.js';
import { crearGrabador } from './herramientas/grabador.js';
import { crearSecuenciador } from './herramientas/secuenciador.js';
import { cargarMotor } from './exportar/empaquetar.js';

const raiz = document.getElementById('app');
let sesionActual = null;
let editorActual = null;
let catalogoActual = null; // el catálogo de la biblioteca ya cargado, o null si no está disponible
let avisoBiblioteca = null;
let paletaActual = null; // colores de contenido/paleta.json, o null si no cargó (sin paleta no hay herramientas)
let motorCargado = null; // el motor leído de la propia plataforma para juego.html; se lee una vez, al publicar

function pantallaDeError(titulo, detalle, lista = []) {
  rellenar(raiz, h('main', { class: 'inicio', id: 'contenido' },
    h('h1', {}, titulo),
    h('p', {}, detalle),
    lista.length ? h('ul', {}, lista.map((texto) => h('li', {}, texto))) : null,
    h('p', { class: 'ayuda' }, `Navegadores con los que funciona: ${NAVEGADORES}`)));
}

function cerrarEditor() {
  editorActual?.destruir();
  editorActual = null;
  sesionActual?.cerrar();
  sesionActual = null;
  document.body.classList.remove('en-editor', 'jugando');
}

function mostrarEditor(almacen, contenido, proyecto, archivos) {
  cerrarEditor();
  document.body.classList.add('en-editor');
  sesionActual = crearSesion({ proyecto, archivos, almacen });
  editorActual = crearEditor(raiz, sesionActual, {
    contenido,
    JSZip: window.JSZip,
    catalogo: catalogoActual,
    avisoInicial: avisoBiblioteca,
    crearHerramientas: paletaActual ? (zona) => ({
      pixelart: crearPixelArt(zona, { paleta: paletaActual }),
      grabador: crearGrabador(zona),
      secuenciador: crearSecuenciador(zona),
    }) : null,
    cargarMotor: async () => {
      motorCargado ??= await cargarMotor();
      return motorCargado;
    },
    nombreProducto: contenido.nombre,
    alNuevoJuego: async () => {
      await almacen.borrarTodo();
      mostrarInicio(almacen, contenido);
    },
  });
}

function mostrarInicio(almacen, contenido) {
  cerrarEditor();
  const inicio = crearInicio(raiz, {
    nombreProducto: contenido.nombre,
    contenido,
    alEmpezar: async (datos) => {
      const proyecto = crearProyecto(datos);
      try {
        await almacen.guardar(proyecto);
      } catch (error) {
        inicio.mostrarError(error.message);
        return;
      }
      mostrarEditor(almacen, contenido, proyecto, new Map());
    },
    alAbrirCopia: async () => {
      const archivo = await elegirArchivoDelNavegador('.zip,application/zip');
      if (!archivo) return;
      try {
        const copia = await importarCopia(archivo, { JSZip: window.JSZip });
        await almacen.reemplazarTodo(copia.proyecto, copia.archivos);
        mostrarEditor(almacen, contenido, copia.proyecto, copia.archivos);
      } catch (error) {
        inicio.mostrarError(error.message);
      }
    },
  });
  inicio.dibujar();
}

async function arrancar() {
  const capacidades = comprobar(window);
  if (!capacidades.ok) {
    pantallaDeError('Este navegador no puede ejecutar la plataforma', 'Le falta:', capacidades.faltantes);
    return;
  }
  let contenido;
  try {
    contenido = await cargarContenido();
  } catch (error) {
    pantallaDeError('No se pudo cargar el contenido jurídico', error.message);
    return;
  }
  document.title = contenido.nombre;
  // La biblioteca no es imprescindible: si su catálogo falta o está mal, el editor arranca igual y lo dice.
  const catalogo = crearCatalogo();
  try {
    await catalogo.cargar();
    catalogoActual = catalogo;
  } catch (error) {
    avisoBiblioteca = `La biblioteca no está disponible: ${error.message}`;
  }
  try {
    const respuesta = await fetch(new URL('../contenido/paleta.json', import.meta.url));
    if (!respuesta.ok) throw new Error(`paleta.json (${respuesta.status})`);
    paletaActual = (await respuesta.json()).colores;
  } catch (error) {
    avisoBiblioteca = [avisoBiblioteca, `Las herramientas de creación no están disponibles: ${error.message}`].filter(Boolean).join(' ');
  }
  const almacen = abrirAlmacen();
  try {
    const proyecto = await almacen.cargar();
    if (proyecto) {
      mostrarEditor(almacen, contenido, proyecto, await almacen.leerArchivos());
    } else {
      mostrarInicio(almacen, contenido);
    }
  } catch (error) {
    pantallaDeError('No se pudo abrir lo guardado en el navegador', error.message);
  }
}

const aError = (valor) => (valor instanceof Error ? valor : new Error(String(valor?.message ?? valor ?? 'Error desconocido')));
window.addEventListener('error', (evento) => {
  if (editorActual) editorActual.mostrarError(aError(evento.error ?? evento.message));
  else pantallaDeError('Algo salió mal', aError(evento.error ?? evento.message).message);
});
window.addEventListener('unhandledrejection', (evento) => {
  if (editorActual) editorActual.mostrarError(aError(evento.reason));
  else pantallaDeError('Algo salió mal', aError(evento.reason).message);
});

arrancar();
