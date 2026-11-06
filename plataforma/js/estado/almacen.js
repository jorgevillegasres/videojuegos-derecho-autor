// plataforma/js/estado/almacen.js
// Guardado en el navegador con IndexedDB. Dos almacenes: 'proyecto' (una sola
// clave, 'actual') y 'archivos' (clave = id de elemento, valor = { tipo, datos }).
// Los datos son ArrayBuffer, nunca Blob, para que la copia estructurada funcione igual
// en todos los navegadores y en las pruebas.
// reemplazarTodo deja el proyecto y los archivos nuevos en una sola transacción: una
// copia importada o entra completa o no entra.

export const NOMBRE_BD_DEFECTO = 'mi-primer-videojuego';
const VERSION_BD = 1;
const CLAVE_PROYECTO = 'actual';

/** Traduce los errores del navegador a mensajes para el estudiante, con un código estable para la interfaz. */
export function traducirError(error) {
  if (error?.name === 'QuotaExceededError') {
    return Object.assign(
      new Error('No hay espacio en el navegador para guardar. Guarda una copia y libera espacio.'),
      { codigo: 'sin_espacio', cause: error },
    );
  }
  return error ?? new Error('Transacción cancelada');
}

const esArrayBuffer = (valor) => Object.prototype.toString.call(valor) === '[object ArrayBuffer]';

export function abrirAlmacen({ nombre = NOMBRE_BD_DEFECTO, indexedDB = globalThis.indexedDB } = {}) {
  if (!indexedDB) throw Object.assign(new Error('Este navegador no permite guardar el proyecto (IndexedDB no disponible).'), { codigo: 'sin_indexeddb' });

  const bd = new Promise((resolve, reject) => {
    const solicitud = indexedDB.open(nombre, VERSION_BD);
    solicitud.onupgradeneeded = () => {
      const db = solicitud.result;
      if (!db.objectStoreNames.contains('proyecto')) db.createObjectStore('proyecto');
      if (!db.objectStoreNames.contains('archivos')) db.createObjectStore('archivos');
    };
    solicitud.onblocked = () => reject(Object.assign(new Error('Cierra las otras pestañas de la plataforma y vuelve a intentar.'), { codigo: 'bloqueado' }));
    solicitud.onsuccess = () => {
      const db = solicitud.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    solicitud.onerror = () => reject(traducirError(solicitud.error));
  });
  bd.catch(() => {}); // la falla se reporta en cada uso; esto solo evita un rechazo sin manejar

  function transaccionCompleta(db, almacenes, modo, accion) {
    return new Promise((resolve, reject) => {
      const transaccion = db.transaction(almacenes, modo);
      let resultado;
      try {
        resultado = accion(transaccion);
      } catch (error) {
        // Un fallo síncrono (por ejemplo un valor que no se puede clonar) no debe dejar
        // a medias lo que ya se encoló: se aborta y nada cambia.
        transaccion.abort();
        reject(traducirError(error));
        return;
      }
      transaccion.oncomplete = () => resolve(resultado?.result);
      transaccion.onerror = () => reject(traducirError(transaccion.error));
      transaccion.onabort = () => reject(traducirError(transaccion.error));
    });
  }

  async function correr(almacen, modo, accion) {
    const db = await bd;
    return transaccionCompleta(db, almacen, modo, (transaccion) => accion(transaccion.objectStore(almacen)));
  }

  return {
    cargar: () => correr('proyecto', 'readonly', (s) => s.get(CLAVE_PROYECTO)).then((v) => v ?? null),
    guardar: (proyecto) => correr('proyecto', 'readwrite', (s) => s.put(proyecto, CLAVE_PROYECTO)),
    guardarArchivo: async (id, archivo) => {
      if (!esArrayBuffer(archivo?.datos)) throw new Error('Los archivos se guardan como { tipo, datos: ArrayBuffer }.');
      return correr('archivos', 'readwrite', (s) => s.put(archivo, id));
    },
    leerArchivo: (id) => correr('archivos', 'readonly', (s) => s.get(id)).then((v) => v ?? null),
    borrarArchivo: (id) => correr('archivos', 'readwrite', (s) => s.delete(id)),
    listarArchivos: () => correr('archivos', 'readonly', (s) => s.getAllKeys()),
    borrarTodo: async () => {
      const db = await bd;
      await transaccionCompleta(db, ['proyecto', 'archivos'], 'readwrite', (transaccion) => {
        transaccion.objectStore('proyecto').clear();
        transaccion.objectStore('archivos').clear();
        return null;
      });
    },
    /** Reemplaza proyecto y archivos en una sola transacción. El proyecto debe haber pasado por validarEstructura (importarCopia lo garantiza). */
    reemplazarTodo: async (proyecto, archivos) => {
      for (const [id, archivo] of archivos) {
        if (!esArrayBuffer(archivo?.datos)) throw new Error(`El archivo «${id}» no es { tipo, datos: ArrayBuffer }.`);
      }
      const db = await bd;
      await transaccionCompleta(db, ['proyecto', 'archivos'], 'readwrite', (transaccion) => {
        const proyectos = transaccion.objectStore('proyecto');
        proyectos.clear();
        proyectos.put(proyecto, CLAVE_PROYECTO);
        const binarios = transaccion.objectStore('archivos');
        binarios.clear();
        for (const [id, archivo] of archivos) binarios.put(archivo, id);
        return null;
      });
    },
    leerArchivos: async () => {
      const db = await bd;
      return new Promise((resolve, reject) => {
        const transaccion = db.transaction('archivos', 'readonly');
        const almacen = transaccion.objectStore('archivos');
        const claves = almacen.getAllKeys();
        const valores = almacen.getAll();
        transaccion.oncomplete = () => resolve(new Map(claves.result.map((clave, i) => [clave, valores.result[i]])));
        transaccion.onerror = () => reject(traducirError(transaccion.error));
        transaccion.onabort = () => reject(traducirError(transaccion.error));
      });
    },
    cerrar: async () => {
      try {
        (await bd).close();
      } catch {
        // si la base nunca abrió, no hay nada que cerrar
      }
    },
  };
}
