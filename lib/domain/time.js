const pad = (value) => String(value).padStart(2, '0');

const WEEKDAY_NAMES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

export const todayIso = () => new Date().toLocaleDateString('sv-SE');

export const currentTime = () => {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

export function parseTime(text) {
  const raw = String(text ?? '').trim().toLowerCase().replace(/\./g, '');
  if (!raw) return null;
  const match = raw.match(/^(\d{1,2})[:h ]?(\d{1,2})?\s*(am|pm)?$/);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = match[2] === undefined ? 0 : Number(match[2]);
  const meridiem = match[3];
  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return null;
  return `${pad(hours)}:${pad(minutes)}`;
}

export const toMinutes = (time) => {
  const [hours, minutes] = String(time).split(':').map(Number);
  return hours * 60 + minutes;
};

export function workedMinutes(clockIn, clockOut) {
  if (!clockIn || !clockOut) return null;
  const start = toMinutes(clockIn);
  const end = toMinutes(clockOut);
  return end >= start ? end - start : end + 24 * 60 - start;
}

export function formatDuration(minutes) {
  if (minutes == null) return '—';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} h${rest ? ` ${pad(rest)} min` : ''}`;
}

export const weekdayName = (date) => WEEKDAY_NAMES[new Date(`${date}T12:00:00`).getDay()];

export const isWeekend = (date) => [0, 6].includes(new Date(`${date}T12:00:00`).getDay());

export const formatLongDate = (date) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

export const formatShortDate = (date) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });

export const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
};

export function addDays(date, amount) {
  const moved = new Date(`${date}T12:00:00`);
  moved.setDate(moved.getDate() + amount);
  return `${moved.getFullYear()}-${pad(moved.getMonth() + 1)}-${pad(moved.getDate())}`;
}

export function weekdaysBetween(from, to) {
  const dates = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    if (!isWeekend(date)) dates.push(date);
  }
  return dates;
}

export const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''));
