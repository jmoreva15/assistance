/**
 * Puerta de acceso a los datos. Los componentes NUNCA hablan con localStorage:
 * usan este repositorio. Para pasar a una API mas adelante basta con escribir
 * otro objeto con los mismos cuatro metodos y cambiar la linea del final.
 *
 *   leer()            -> Promise<estado>
 *   escribir(estado)  -> Promise<estado>
 *   idCliente()       -> Promise<string>
 *   borrar()          -> Promise<void>
 */
import { crearAlmacenLocal } from './almacenLocal.js';

export const ESTADO_VACIO = {
  version: 2,
  formUrl: '',
  constantes: { 'NOMBRE COMPLETO': '', DNI: '' },
  registros: {},
  bitacora: [],
};

export const repositorio = crearAlmacenLocal();
