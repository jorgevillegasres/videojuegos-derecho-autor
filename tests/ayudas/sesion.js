// tests/ayudas/sesion.js
// Sesión de prueba para las vistas: almacén mudo, temporizador que no corre, URLs predecibles.
import { crearProyecto } from '../../plataforma/js/estado/modelo.js';
import { crearSesion } from '../../plataforma/js/editor/sesion.js';

export function almacenMudo() {
  const archivos = new Map();
  return {
    guardar: async () => {},
    guardarArchivo: async (id, archivo) => { archivos.set(id, archivo); },
    borrarArchivo: async (id) => { archivos.delete(id); },
    reemplazarTodo: async (proyecto, nuevos) => { archivos.clear(); for (const [id, a] of nuevos) archivos.set(id, a); },
    archivos,
  };
}

export function sesionDePrueba(proyecto = crearProyecto({ estudiante: 'Camila R.', titulo: 'El faro de Camila', destino: 'gratis' }), extra = {}) {
  const eventos = [];
  const sesion = crearSesion({
    proyecto,
    almacen: almacenMudo(),
    planificar: () => 1,
    cancelar: () => {},
    crearUrl: (archivo) => `blob:${archivo.tipo}`,
    liberarUrl: () => {},
    ...extra,
  });
  sesion.suscribir((evento) => eventos.push(evento));
  return { sesion, eventos };
}
