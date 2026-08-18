/** Implementacion del repositorio sobre localStorage, con migracion de v1. */
import { normalizarHora } from '../dominio/horas.js';
import { crearRegistro } from '../dominio/registros.js';

const CLAVE = 'asistencia:v2';
const CLAVE_V1 = 'asistencia:v1';
const CLAVE_CLIENTE = 'asistencia:cliente';
const MAX_BITACORA = 2000;

function vacio() {
  return {
    version: 2,
    formUrl: '',
    constantes: { 'NOMBRE COMPLETO': '', DNI: '' },
      registros: {},
    bitacora: [],
  };
}

/**
 * Trae los datos del formato viejo (lista de dias + lista de enviados) al nuevo
 * (registros indexados por fecha). La hora de envio se recupera de la bitacora,
 * donde cada envio dejo su linea "OK <fecha>".
 */
export function migrarV1(v1) {
  const base = vacio();
  const enviadosEn = {};
  for (const linea of v1.registro || []) {
    const m = String(linea).match(/^\[([^\]]+)\].*\bOK (\d{4}-\d{2}-\d{2})/);
    if (m) enviadosEn[m[2]] = m[1];
  }

  const registros = {};
  for (const dia of v1.dias || []) {
    const fue = (v1.enviados || []).includes(dia.fecha);
    registros[dia.fecha] = {
      ...crearRegistro({
        fecha: dia.fecha,
        entrada: normalizarHora(dia.ingreso),
        salida: normalizarHora(dia.salida),
        observacion: dia.observacion || '',
        origen: 'migrado',
      }),
      enviadoEn: fue ? enviadosEn[dia.fecha] || 'migrado' : null,
    };
  }

  return {
    ...base,
    formUrl: v1.formUrl || '',
    constantes: { ...base.constantes, ...v1.constantes },
    registros,
    bitacora: (v1.registro || []).slice(-MAX_BITACORA),
  };
}

export function crearAlmacenLocal() {
  return {
    async leer() {
      const bruto = localStorage.getItem(CLAVE);
      if (bruto) {
        const datos = JSON.parse(bruto);
        return {
          ...vacio(),
          ...datos,
          constantes: { ...vacio().constantes, ...datos.constantes },
                registros: datos.registros || {},
          bitacora: Array.isArray(datos.bitacora) ? datos.bitacora : [],
        };
      }

      const viejo = localStorage.getItem(CLAVE_V1);
      if (viejo) {
        const migrado = migrarV1(JSON.parse(viejo));
        migrado.bitacora = [
          ...migrado.bitacora,
          `[${new Date().toISOString()}] MIGRACION ${Object.keys(migrado.registros).length} registros traidos del formato anterior`,
        ].slice(-MAX_BITACORA);
        localStorage.setItem(CLAVE, JSON.stringify(migrado));
        return migrado;
      }

      return null;
    },

    async escribir(estado) {
      const limpio = { ...estado, bitacora: (estado.bitacora || []).slice(-MAX_BITACORA), guardadoEn: new Date().toISOString() };
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
