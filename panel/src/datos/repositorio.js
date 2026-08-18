/**
 * Puerta de acceso a los datos. Los componentes NUNCA hablan con localStorage:
 * usan este repositorio. Para pasar a una API mas adelante basta con escribir
 * otro objeto con los mismos cuatro metodos y cambiar la ultima linea.
 *
 *   leer()            -> Promise<estado | null>
 *   escribir(estado)  -> Promise<estado>
 *   idCliente()       -> Promise<string>
 *   borrar()          -> Promise<void>
 *
 * Cada seccion guarda en su propio sitio y no se mezclan:
 *
 *   configuracion  formUrl + constantes (nombre y DNI)
 *   jornada        SOLO el dia de hoy, marcado con el reloj
 *   unDia          UN dia suelto que se olvido marcar
 *   lote           lo que produjo la ultima generacion por intervalo
 *   enviados       el historial; lo unico que se conserva para siempre
 */
import { crearAlmacenLocal } from './almacenLocal.js';

export const ESTADO_VACIO = {
  version: 1,
  formUrl: '',
  constantes: { 'NOMBRE COMPLETO': '', DNI: '' },
  jornada: null,
  unDia: null,
  lote: null,
  enviados: {},
  bitacora: [],
};

export const repositorio = crearAlmacenLocal();
