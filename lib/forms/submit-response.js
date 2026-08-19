import { parseTime } from '../domain/time.js';
import { ROLES } from './field-mapping.js';

function appendText(params, field, value) {
  if (!field) return;
  params.append(`entry.${field.entryId}`, String(value ?? ''));
}

function appendDate(params, field, date) {
  if (!field) return;
  const [year, month, day] = String(date).split('-');
  params.append(`entry.${field.entryId}_year`, String(Number(year)));
  params.append(`entry.${field.entryId}_month`, String(Number(month)));
  params.append(`entry.${field.entryId}_day`, String(Number(day)));
}

function appendTime(params, field, time) {
  if (!field) return;
  const normalized = parseTime(time);
  if (!normalized) throw new Error(`la hora "${time}" no es valida`);
  const [hours, minutes] = normalized.split(':');
  params.append(`entry.${field.entryId}_hour`, String(Number(hours)));
  params.append(`entry.${field.entryId}_minute`, String(Number(minutes)));
}

export function buildParams({ mapping, profile, record }) {
  const params = new URLSearchParams();
  appendText(params, mapping[ROLES.FULL_NAME], profile.fullName);
  appendText(params, mapping[ROLES.DNI], profile.dni);
  appendDate(params, mapping[ROLES.DATE], record.date);
  appendTime(params, mapping[ROLES.CLOCK_IN], record.clockIn);
  appendTime(params, mapping[ROLES.CLOCK_OUT], record.clockOut);
  appendText(params, mapping[ROLES.NOTE], record.note ?? '');
  params.append('fvv', '1');
  return params;
}

const RECORDED_PATTERN = /Se registr|has been recorded|Tu respuesta se|respuesta enviada/i;
const REQUIRED_PATTERN = /pregunta obligatoria|required question|Debes responder/i;

export async function submitRecord({ responseUrl, mapping, profile, record }) {
  const params = buildParams({ mapping, profile, record });

  const response = await fetch(responseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0' },
    body: params.toString(),
    redirect: 'follow',
    cache: 'no-store',
  });

  const body = await response.text();

  if (response.status === 200 && RECORDED_PATTERN.test(body)) {
    return { date: record.date, ok: true, status: response.status };
  }

  if (response.status === 400 || REQUIRED_PATTERN.test(body)) {
    return {
      date: record.date,
      ok: false,
      status: response.status,
      reason: 'Google rechazo la respuesta porque falta o no acepta algun campo obligatorio',
    };
  }

  if (response.status === 404) {
    return { date: record.date, ok: false, status: 404, reason: 'el formulario no existe o cambio de direccion' };
  }

  return {
    date: record.date,
    ok: false,
    status: response.status,
    reason: `respuesta inesperada de Google (${response.status}) sin confirmacion de registro`,
  };
}
