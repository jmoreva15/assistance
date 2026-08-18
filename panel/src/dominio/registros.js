/**
 * Reglas de los registros de asistencia. Funciones puras: no tocan localStorage
 * ni React.
 *
 * Un registro es { fecha, dia, entrada, salida, observacion }.
 *
 * Los registros NO viven todos juntos: cada seccion tiene su propio almacen y no
 * se mezclan (ver datos/repositorio.js).
 *
 *   jornada   el dia de hoy que se marca con el reloj
 *   unDia     un dia suelto que se olvido marcar
 *   lote      lo que produjo la ultima generacion por intervalo
 *   enviados  el historial: lo unico que se conserva para siempre
 */
import { aMinutos, diasHabilesEntre, hoyISO, minutosTrabajados, nombreDia, normalizarHora } from './horas.js';

export const JORNADA_MINUTOS = 8 * 60;

/** Horas por defecto para todo: dias olvidados y generacion por intervalo. */
export const ENTRADA_POR_DEFECTO = '09:00';
export const SALIDA_POR_DEFECTO = '18:00';

/** Como esta de completo un registro. Que ya se envio no es un estado: es el almacen donde vive. */
export const COMPLETITUD = {
  VACIO: 'vacio',
  INCOMPLETO: 'incompleto',
  COMPLETO: 'completo',
};

export const ETIQUETA_COMPLETITUD = {
  vacio: 'SIN HORAS',
  incompleto: 'INCOMPLETO',
  completo: 'COMPLETO',
};

export function completitudDe(registro) {
  if (!registro) return COMPLETITUD.VACIO;
  if (registro.entrada && registro.salida) return COMPLETITUD.COMPLETO;
  if (registro.entrada || registro.salida) return COMPLETITUD.INCOMPLETO;
  return COMPLETITUD.VACIO;
}

/** Se puede enviar si esta completo y la fecha ya ocurrio. */
export function esEnviable(registro, hoy = hoyISO()) {
  return !!registro && completitudDe(registro) === COMPLETITUD.COMPLETO && registro.fecha <= hoy;
}

/** Registro nuevo, con los campos siempre presentes. */
export function crearRegistro({ fecha, entrada = null, salida = null, observacion = '' }) {
  return { fecha, dia: nombreDia(fecha), entrada, salida, observacion };
}

/**
 * Lo unico que se rechaza es una hora que no se pueda entender. Cualquier hora
 * valida se acepta: el usuario decide que marca y que envia.
 */
export function validarFormato({ entrada, salida }) {
  if (entrada && !normalizarHora(entrada)) {
    return `no entiendo la hora de entrada "${entrada}" (usa 09:20 o 9:20 AM)`;
  }
  if (salida && !normalizarHora(salida)) {
    return `no entiendo la hora de salida "${salida}" (usa 18:25 o 6:25 PM)`;
  }
  return null;
}

/** Observaciones sobre un par de horas, para mostrar sin bloquear nada. */
export function notaSobreHoras({ entrada, salida }) {
  const e = normalizarHora(entrada);
  const s = normalizarHora(salida);
  if (!e || !s) return null;
  if (aMinutos(e) === aMinutos(s)) return 'La entrada y la salida son la misma hora.';
  if (aMinutos(s) < aMinutos(e)) {
    return `La salida (${s}) es anterior a la entrada (${e}): se cuenta como jornada que cruza la medianoche.`;
  }
  const minutos = minutosTrabajados(e, s);
  if (minutos > 14 * 60) return `Son ${Math.floor(minutos / 60)} h de jornada.`;
  if (minutos < 60) return `Son ${minutos} min de jornada.`;
  return null;
}

export const listaDeEnviados = (enviados) =>
  Object.values(enviados || {}).sort((a, b) => a.fecha.localeCompare(b.fecha));

/**
 * Genera los dias habiles del intervalo con las horas por defecto.
 * Solo dias ANTERIORES a hoy: la jornada de hoy se marca en su seccion.
 * Los dias que ya estan en el historial de enviados se excluyen, para no
 * mandar dos veces la misma respuesta.
 */
export function generarLote({ desde, hasta, enviados = {}, hoy = hoyISO(), maximo = 500 }) {
  if (!desde || !hasta) return { invalido: 'elige las dos fechas del intervalo' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
    return { invalido: 'las fechas deben tener formato YYYY-MM-DD' };
  }
  if (desde > hasta) return { invalido: `la fecha inicial (${desde}) es posterior a la final (${hasta})` };
  if (hasta >= hoy) {
    return { invalido: `aca solo se generan dias anteriores a hoy (${hoy}); la jornada de hoy se marca en «Mi jornada»` };
  }

  const habiles = diasHabilesEntre(desde, hasta);
  if (!habiles.length) return { invalido: `no hay dias de lunes a viernes entre ${desde} y ${hasta}` };
  if (habiles.length > maximo) {
    return { invalido: `el intervalo tiene ${habiles.length} dias habiles, mas del maximo de ${maximo}; revisa si te equivocaste de anio` };
  }

  const yaEnviados = habiles.filter((f) => enviados[f]);
  const dias = habiles
    .filter((f) => !enviados[f])
    .map((fecha) => crearRegistro({ fecha, entrada: ENTRADA_POR_DEFECTO, salida: SALIDA_POR_DEFECTO }));

  return { dias, yaEnviados };
}
