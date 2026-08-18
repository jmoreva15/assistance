/** Implementacion del repositorio sobre localStorage. Sin migraciones: una sola clave. */
import { ESTADO_VACIO } from './repositorio.js';

const CLAVE = 'asistencia';
const CLAVE_CLIENTE = 'asistencia:cliente';
const MAX_BITACORA = 2000;

/**
 * Borra claves de versiones anteriores del proyecto. No lee ni convierte nada:
 * solo evita dejar datos personales olvidados en el navegador.
 */
function limpiarClavesViejas() {
  for (const clave of Object.keys(localStorage)) {
    if (/^asistencia:v\d+$/.test(clave)) localStorage.removeItem(clave);
  }
}

export function crearAlmacenLocal() {
  return {
    async leer() {
      limpiarClavesViejas();
      const bruto = localStorage.getItem(CLAVE);
      if (!bruto) return null;
      const datos = JSON.parse(bruto);
      return {
        ...ESTADO_VACIO,
        ...datos,
        constantes: { ...ESTADO_VACIO.constantes, ...datos.constantes },
        enviados: datos.enviados || {},
        bitacora: Array.isArray(datos.bitacora) ? datos.bitacora : [],
      };
    },

    async escribir(estado) {
      const limpio = {
        ...estado,
        bitacora: (estado.bitacora || []).slice(-MAX_BITACORA),
        guardadoEn: new Date().toISOString(),
      };
      localStorage.setItem(CLAVE, JSON.stringify(limpio));
      return limpio;
    },

    async idCliente() {
      let id = localStorage.getItem(CLAVE_CLIENTE);
      if (!id) {
        id = crypto.randomUUID ? crypto.randomUUID() : `c${Date.now()}${Math.random().toString(16).slice(2)}`;
        localStorage.setItem(CLAVE_CLIENTE, id);
      }
      return id;
    },

    async borrar() {
      localStorage.removeItem(CLAVE);
    },
  };
}
