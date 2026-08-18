/**
 * Horas y fechas. Todo se guarda en 24 h ("HH:MM") y en ISO ("YYYY-MM-DD"):
 * sin ambiguedad de AM/PM y ordenable como texto.
 */

const p = (n) => String(n).padStart(2, '0');

export const hoyISO = () => new Date().toLocaleDateString('sv-SE');

export const horaAhora = () => {
  const d = new Date();
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** Acepta "9:5", "09:05", "9:05 AM", "6:30pm", "18:30" y devuelve "HH:MM" o null. */
export function normalizarHora(texto) {
  const t = String(texto ?? '').trim().toLowerCase().replace(/\./g, '');
  if (!t) return null;
  const m = t.match(/^(\d{1,2})[:h ]?(\d{1,2})?\s*(am|pm)?$/);
  if (!m) return null;
  let hora = Number(m[1]);
  const minuto = m[2] === undefined ? 0 : Number(m[2]);
  const meridiano = m[3];
  if (meridiano === 'pm' && hora < 12) hora += 12;
  if (meridiano === 'am' && hora === 12) hora = 0;
  if (hora > 23 || minuto > 59) return null;
  return `${p(hora)}:${p(minuto)}`;
}

export const aMinutos = (hora) => {
  const [h, m] = String(hora).split(':').map(Number);
  return h * 60 + m;
};

/** Minutos trabajados; si la salida es menor, asume que cruzo la medianoche. */
export function minutosTrabajados(entrada, salida) {
  if (!entrada || !salida) return null;
  const a = aMinutos(entrada);
  const b = aMinutos(salida);
  return b >= a ? b - a : b + 24 * 60 - a;
}

export function duracionTexto(minutos) {
  if (minutos == null) return '—';
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h} h${m ? ` ${p(m)} min` : ''}`;
}

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

export const nombreDia = (fecha) => DIAS[new Date(`${fecha}T12:00:00`).getDay()];
export const esFinDeSemana = (fecha) => [0, 6].includes(new Date(`${fecha}T12:00:00`).getDay());

export const fechaLarga = (fecha) =>
  new Date(`${fecha}T12:00:00`).toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

export const fechaCorta = (fecha) =>
  new Date(`${fecha}T12:00:00`).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });

export function sumarDias(fecha, cantidad) {
  const d = new Date(`${fecha}T12:00:00`);
  d.setDate(d.getDate() + cantidad);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Los dias habiles del rango, inclusive. */
export function diasHabilesEntre(desde, hasta) {
  const dias = [];
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) {
    if (!esFinDeSemana(f)) dias.push(f);
  }
  return dias;
}
