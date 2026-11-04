// plataforma/js/estado/almacen.js
// Guardado en el navegador con IndexedDB. Dos almacenes: 'proyecto' (una sola
// clave, 'actual') y 'archivos' (clave = id de elemento, valor = { tipo, datos }).
// Los datos son ArrayBuffer, nunca Blob, para que la copia estructurada funcione igual
// en todos los navegadores y en las pruebas.

export const NOMBRE_BD_DEFECTO = 'mi-primer-videojuego';
const VERSION_BD = 1;
const CLAVE_PROYECTO = 'actual';

export function abrirAlmacen({ nombre = NOMBRE_BD_DEFECTO, indexedDB = globalThis.indexedDB } = {}) {
  if (!indexedDB) throw new Error('Este navegador no permite guardar el proyecto (IndexedDB no disponible).');

  const bd = new Promise((resolve, reject) => {
    const solicitud = indexedDB.open(nombre, VERSION_BD);
    solicitud.onupgradeneeded = () => {
      const db = solicitud.result;
      if (!db.objectStoreNames.contains('proyecto')) db.createObjectStore('proyecto');
      if (!db.objectStoreNames.contains('archivos')) db.createObjectStore('archivos');
    };
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => reject(solicitud.error);
  });

  async function correr(almacen, modo, accion) {
    const db = await bd;
    return new Promise((resolve, reject) => {
      const transaccion = db.transaction(almacen, modo);
      const solicitud = accion(transaccion.objectStore(almacen));
      transaccion.oncomplete = () => resolve(solicitud.result);
      transaccion.onerror = () => reject(transaccion.error);
      transaccion.onabort = () => reject(transaccion.error ?? new Error('Transacción cancelada'));
    });
  }

  return {
    cargar: () => correr('proyecto', 'readonly', (s) => s.get(CLAVE_PROYECTO)).then((v) => v ?? null),
    guardar: (proyecto) => correr('proyecto', 'readwrite', (s) => s.put(proyecto, CLAVE_PROYECTO)),
    guardarArchivo: (id, archivo) => correr('archivos', 'readwrite', (s) => s.put(archivo, id)),
    leerArchivo: (id) => correr('archivos', 'readonly', (s) => s.get(id)).then((v) => v ?? null),
    borrarArchivo: (id) => correr('archivos', 'readwrite', (s) => s.delete(id)),
    listarArchivos: () => correr('archivos', 'readonly', (s) => s.getAllKeys()),
    borrarTodo: async () => {
      await correr('proyecto', 'readwrite', (s) => s.clear());
      await correr('archivos', 'readwrite', (s) => s.clear());
    },
    cerrar: async () => (await bd).close(),
  };
}
