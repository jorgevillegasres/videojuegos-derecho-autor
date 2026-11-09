// tests/ayudas/proyecto.js
// Un proyecto que cumple el mínimo, con todas las fichas en verde y sin avisos bloqueantes.
import { crearProyecto, agregarEscena, agregarPersonaje, agregarElemento, agregarLinea } from '../../plataforma/js/estado/modelo.js';

export function proyectoPublicable() {
  const p = crearProyecto({ estudiante: 'Camila R.', titulo: 'El faro de Camila', destino: 'gratis' });
  const muelle = p.juego.escenas[0];
  muelle.nombre = 'El muelle';
  const torre = agregarEscena(p, 'La torre');
  const amanecer = agregarEscena(p, 'Amanecer');
  const ana = agregarPersonaje(p, { nombre: 'Lucía' });
  const farero = agregarPersonaje(p, { nombre: 'El guardián' });
  const bytes = (texto) => new TextEncoder().encode(texto).buffer;
  const archivos = new Map();
  const elemento = (datos) => {
    const e = agregarElemento(p, datos);
    archivos.set(e.id, { tipo: 'application/octet-stream', datos: bytes(e.nombre) });
    return e;
  };
  ana.retrato = elemento({ tipo: 'retrato', nombre: 'Lucía', archivo: 'ana.png', origen: 'creado' }).id;
  farero.retrato = elemento({ tipo: 'retrato', nombre: 'Guardián', archivo: 'farero.png', origen: 'creado' }).id;
  muelle.fondo = elemento({ tipo: 'fondo', nombre: 'Muelle', archivo: 'muelle.png', origen: 'creado' }).id;
  const tema = elemento({ tipo: 'musica', nombre: 'Tema', archivo: 'tema.ogg', origen: 'biblioteca', biblioteca: { id: 'bib_m1', autor: 'Autora Ejemplo', licencia: 'CC-BY-NC-4.0', creditoSugerido: '«Tema» de Autora Ejemplo, CC BY-NC 4.0' } });
  muelle.musica = tema.id;
  p.fichas[tema.id].licenciaLeida = true;
  const olas = elemento({ tipo: 'efecto', nombre: 'Olas', archivo: 'olas.wav', origen: 'creado' });
  agregarLinea(muelle, 'dialogo', { personaje: ana.id, texto: '¿Quién abrió la reja?', efecto: olas.id });
  agregarLinea(muelle, 'decision', { texto: '¿Bajas al sótano?', opciones: [{ texto: 'Sí', escena: torre.id }, { texto: 'No', escena: amanecer.id }] });
  agregarLinea(torre, 'fin', { texto: 'Fin' });
  agregarLinea(amanecer, 'fin', { texto: 'Amanece.' });
  return { p, archivos, tema, muelle, torre, amanecer, ana, farero, olas };
}
