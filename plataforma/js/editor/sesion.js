// plataforma/js/editor/sesion.js
// Estado del editor: el proyecto, sus archivos binarios, el guardado automático con
// espera, el contador de cambios para recordar la copia y las URLs de objetos con las
// que se muestran imágenes y sonidos. Las vistas leen sesion.proyecto cada vez (Abrir
// copia lo reemplaza entero) y cambian el proyecto solo con sesion.cambiar().
// Eventos a los suscriptores: { tipo: 'cambio', ...detalle } | 'guardado' | 'error' | 'recordatorio' | 'reemplazo'.

export const ESPERA_GUARDADO_MS = 400;
export const CAMBIOS_PARA_RECORDAR = 50;

export function crearSesion({
  proyecto,
  archivos = new Map(),
  almacen,
  esperaMs = ESPERA_GUARDADO_MS,
  planificar = (fn, ms) => setTimeout(fn, ms),
  cancelar = (temporizador) => clearTimeout(temporizador),
  crearUrl = (archivo) => URL.createObjectURL(new Blob([archivo.datos], { type: archivo.tipo })),
  liberarUrl = (url) => URL.revokeObjectURL(url),
}) {
  const oyentes = new Set();
  const urls = new Map();
  let temporizador = null;
  let cola = Promise.resolve();
  let cambiosSinCopia = 0;

  function avisar(evento) {
    for (const oyente of oyentes) oyente(evento);
  }

  function cancelarEspera() {
    if (temporizador === null) return;
    cancelar(temporizador);
    temporizador = null;
  }

  // Los guardados se encadenan para que nunca corran dos a la vez.
  function guardar() {
    cola = cola
      .then(() => almacen.guardar(sesion.proyecto))
      .then(() => avisar({ tipo: 'guardado' }), (error) => avisar({ tipo: 'error', error }));
    return cola;
  }

  function programar() {
    cancelarEspera();
    temporizador = planificar(() => {
      temporizador = null;
      guardar();
    }, esperaMs);
  }

  function liberar(id) {
    const url = urls.get(id);
    if (url === undefined) return;
    liberarUrl(url);
    urls.delete(id);
  }

  const sesion = {
    proyecto,
    archivos,
    almacen,
    get cambiosSinCopia() {
      return cambiosSinCopia;
    },
    suscribir(oyente) {
      oyentes.add(oyente);
      return () => oyentes.delete(oyente);
    },
    /** Aplica fn(proyecto), programa el guardado y avisa { tipo: 'cambio', ...detalle }. Devuelve lo que fn devuelva. */
    cambiar(fn, detalle = {}) {
      const resultado = fn(sesion.proyecto);
      // El número se fija antes de avisar: un oyente puede hacer otro cambio dentro de este aviso.
      const numero = (cambiosSinCopia += 1);
      programar();
      avisar({ tipo: 'cambio', ...detalle });
      if (numero === CAMBIOS_PARA_RECORDAR) avisar({ tipo: 'recordatorio' });
      return resultado;
    },
    async agregarArchivo(id, archivo) {
      await almacen.guardarArchivo(id, archivo);
      liberar(id);
      sesion.archivos.set(id, archivo);
    },
    async quitarArchivo(id) {
      liberar(id);
      sesion.archivos.delete(id);
      await almacen.borrarArchivo(id);
    },
    /** URL con la que el navegador muestra el archivo del elemento, o null si no hay archivo. */
    resolverRecurso(id) {
      if (urls.has(id)) return urls.get(id);
      const archivo = sesion.archivos.get(id);
      if (!archivo) return null;
      const url = crearUrl(archivo);
      urls.set(id, url);
      return url;
    },
    guardarAhora() {
      cancelarEspera();
      return guardar();
    },
    esperarGuardado() {
      return cola;
    },
    marcarCopiaGuardada() {
      cambiosSinCopia = 0;
    },
    /** Abrir copia: proyecto y archivos nuevos, en una sola transacción del almacén. */
    async reemplazar(nuevoProyecto, nuevosArchivos) {
      cancelarEspera();
      await cola;
      await almacen.reemplazarTodo(nuevoProyecto, nuevosArchivos);
      for (const id of [...urls.keys()]) liberar(id);
      sesion.proyecto = nuevoProyecto;
      sesion.archivos = nuevosArchivos;
      cambiosSinCopia = 0;
      avisar({ tipo: 'reemplazo' });
    },
    cerrar() {
      cancelarEspera();
      for (const id of [...urls.keys()]) liberar(id);
    },
  };
  return sesion;
}
