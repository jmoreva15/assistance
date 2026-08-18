/**
 * Reglas de negocio de los registros de asistencia. Funciones puras: no tocan
 * localStorage ni React. Un registro es:
 *
 *   { fecha, entrada, salida, observacion, enviadoEn, origen, editadoEn }
 *
 * Los registros viven en un objeto indexado por fecha, asi que no puede haber
 * dos del mismo dia por construccion.
 */
import { aMinutos, diasHabilesEntre, hoyISO, minutosTrabajados, nombreDia, normalizarHora } from './horas.js';

export const ESTADOS = {
  PENDIENTE: 'pendiente',
  INCOMPLETO: 'incompleto',
  LISTO: 'listo',
  ENVIADO: 'enviado',
};

export const ETIQUETA_ESTADO = {
  pendiente: 'PENDIENTE',
  incompleto: 'INCOMPLETO',
  listo: 'LISTO PARA ENVIAR',
  enviado: 'ENVIADO',
};

export const JORNADA_MINUTOS = 8 * 60;

/** Horas por defecto para todo: marcar, dias olvidados y generacion masiva. */
export const ENTRADA_POR_DEFECTO = '09:00';
export const SALIDA_POR_DEFECTO = '18:00';

export function estadoDe(registro) {
  if (!registro) return ESTADOS.PENDIENTE;
  if (registro.enviadoEn) return ESTADOS.ENVIADO;
  if (registro.entrada && registro.salida) return ESTADOS.LISTO;
  if (registro.entrada || registro.salida) return ESTADOS.INCOMPLETO;
  return ESTADOS.PENDIENTE;
}

/** Solo se puede enviar un dia completo, no enviado y que ya haya ocurrido. */
export function esEnviable(registro, hoy = hoyISO()) {
  return estadoDe(registro) === ESTADOS.LISTO && registro.fecha <= hoy;
}

/**
 * Lo unico que se rechaza es una hora que no se pueda entender. Cualquier hora
 * valida se acepta: el usuario decide que marca y que envia.
 * Devuelve null o el motivo del rechazo.
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

/**
 * Observaciones sobre un par de horas, para mostrar sin bloquear nada.
 * Nunca impide guardar ni enviar: solo avisa por si fue un descuido.
 */
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

/** Registro nuevo, con los campos siempre presentes. */
export function crearRegistro({ fecha, entrada = null, salida = null, observacion = '', origen = 'reloj' }) {
  return { fecha, dia: nombreDia(fecha), entrada, salida, observacion, enviadoEn: null, origen, editadoEn: null };
}

const porFecha = (a, b) => a.fecha.localeCompare(b.fecha);

export const listaDeRegistros = (registros) => Object.values(registros || {}).sort(porFecha);

export const registrosPorEstado = (registros, estado) =>
  listaDeRegistros(registros).filter((r) => estadoDe(r) === estado);

/** Dias anteriores a hoy que quedaron a medias: hay que resolverlos. */
export function incompletosAnteriores(registros, hoy = hoyISO()) {
  return listaDeRegistros(registros).filter(
    (r) => r.fecha < hoy && estadoDe(r) === ESTADOS.INCOMPLETO,
  );
}

export const enviables = (registros, hoy = hoyISO()) =>
  listaDeRegistros(registros).filter((r) => esEnviable(r, hoy));

export function resumen(registros, hoy = hoyISO()) {
  const todos = listaDeRegistros(registros);
  return {
    total: todos.length,
    enviados: todos.filter((r) => estadoDe(r) === ESTADOS.ENVIADO).length,
    listos: todos.filter((r) => estadoDe(r) === ESTADOS.LISTO && r.fecha <= hoy).length,
    incompletos: todos.filter((r) => estadoDe(r) === ESTADOS.INCOMPLETO).length,
    futuros: todos.filter((r) => r.fecha > hoy && estadoDe(r) !== ESTADOS.ENVIADO).length,
  };
}

/**
 * Genera los dias habiles del rango con las horas por defecto.
 *
 * Solo acepta dias ANTERIORES a hoy: la jornada de hoy se marca en su seccion.
 * No hay mas restricciones — el usuario genera el rango que quiera. Si un dia ya
 * existe y no fue enviado, se rehacen sus horas pero se conserva su observacion.
 * Los dias ya enviados no se tocan.
 *
 * Devuelve { generados, yaEnviados, invalido }.
 */
export function generarDelRango({ desde, hasta, registros, hoy = hoyISO(), maximo = 500 }) {
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

  const yaEnviados = habiles.filter((f) => registros[f]?.enviadoEn);
  const generados = habiles
    .filter((f) => !registros[f]?.enviadoEn)
    .map((fecha) => {
      const previo = registros[fecha];
      return {
        ...crearRegistro({ fecha, entrada: ENTRADA_POR_DEFECTO, salida: SALIDA_POR_DEFECTO, origen: 'masivo' }),
        observacion: previo?.observacion || '',
      };
    });

  return { generados, yaEnviados };
}
