import { isIsoDate, parseTime, toMinutes, todayIso, weekdayName, weekdaysBetween, workedMinutes } from './time.js';

export const DEFAULT_CLOCK_IN = '09:00';
export const DEFAULT_CLOCK_OUT = '18:00';
export const FULL_DAY_MINUTES = 8 * 60;
export const MAX_BATCH_SIZE = 500;

export const SOURCES = {
  TODAY: 'today',
  SINGLE: 'single',
  BULK: 'bulk',
};

export const SOURCE_LABEL = {
  today: 'JORNADA',
  single: 'DIA ATRASADO',
  bulk: 'VARIOS DIAS',
};

export const SOURCE_DESCRIPTION = {
  today: 'marcado con el reloj el mismo dia',
  single: 'cargado despues, como dia olvidado',
  bulk: 'generado en un lote de varios dias',
};

export const COMPLETENESS = {
  EMPTY: 'empty',
  PARTIAL: 'partial',
  COMPLETE: 'complete',
};

export const COMPLETENESS_LABEL = {
  empty: 'SIN HORAS',
  partial: 'INCOMPLETO',
  complete: 'COMPLETO',
};

export function completenessOf(record) {
  if (!record) return COMPLETENESS.EMPTY;
  if (record.clockIn && record.clockOut) return COMPLETENESS.COMPLETE;
  if (record.clockIn || record.clockOut) return COMPLETENESS.PARTIAL;
  return COMPLETENESS.EMPTY;
}

export const isSubmittable = (record, today = todayIso()) =>
  !!record && completenessOf(record) === COMPLETENESS.COMPLETE && record.date <= today;

export function createRecord({ date, clockIn = null, clockOut = null, note = '' }) {
  return { date, weekday: weekdayName(date), clockIn, clockOut, note };
}

export function validateTimeFormat({ clockIn, clockOut }) {
  if (clockIn && !parseTime(clockIn)) {
    return `no entiendo la hora de entrada "${clockIn}" (usa 09:20 o 9:20 AM)`;
  }
  if (clockOut && !parseTime(clockOut)) {
    return `no entiendo la hora de salida "${clockOut}" (usa 18:25 o 6:25 PM)`;
  }
  return null;
}

export function timeNotice({ clockIn, clockOut }) {
  const start = parseTime(clockIn);
  const end = parseTime(clockOut);
  if (!start || !end) return null;
  if (toMinutes(start) === toMinutes(end)) return 'La entrada y la salida son la misma hora.';
  if (toMinutes(end) < toMinutes(start)) {
    return `La salida (${end}) es anterior a la entrada (${start}): se cuenta como jornada que cruza la medianoche.`;
  }
  const minutes = workedMinutes(start, end);
  if (minutes > 14 * 60) return `Son ${Math.floor(minutes / 60)} h de jornada.`;
  if (minutes < 60) return `Son ${minutes} min de jornada.`;
  return null;
}

export function buildBatch({ from, to, submittedDates = [], today = todayIso(), max = MAX_BATCH_SIZE }) {
  if (!from || !to) return { error: 'elige las dos fechas del intervalo' };
  if (!isIsoDate(from) || !isIsoDate(to)) return { error: 'las fechas deben tener formato YYYY-MM-DD' };
  if (from > to) return { error: `la fecha inicial (${from}) es posterior a la final (${to})` };
  if (to >= today) {
    return { error: `aca solo se generan dias anteriores a hoy (${today}); la jornada de hoy se marca en «Mi jornada»` };
  }

  const weekdays = weekdaysBetween(from, to);
  if (!weekdays.length) return { error: `no hay dias de lunes a viernes entre ${from} y ${to}` };
  if (weekdays.length > max) {
    return { error: `el intervalo tiene ${weekdays.length} dias habiles, mas del maximo de ${max}; revisa si te equivocaste de anio` };
  }

  const alreadySubmitted = weekdays.filter((date) => submittedDates.includes(date));
  const records = weekdays
    .filter((date) => !submittedDates.includes(date))
    .map((date) => createRecord({ date, clockIn: DEFAULT_CLOCK_IN, clockOut: DEFAULT_CLOCK_OUT }));

  return { records, alreadySubmitted };
}
