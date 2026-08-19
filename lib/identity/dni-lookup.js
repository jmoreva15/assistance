import { DNI_API_PROVIDER, DNI_API_TOKEN, hasDniLookup } from '../config/env.js';

const TIMEOUT_MS = 8000;

const compose = (parts) =>
  parts
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .toUpperCase();

const PROVIDERS = {
  decolecta: {
    label: 'decolecta.com',
    build: (dni, token) => ({
      url: `https://api.decolecta.com/v1/reniec/dni?numero=${dni}`,
      init: { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
    }),
    pick: (body) => compose([body.first_name, body.first_last_name, body.second_last_name]) || compose([body.full_name]),
  },
  apisnetpe: {
    label: 'apis.net.pe',
    build: (dni, token) => ({
      url: `https://api.apis.net.pe/v2/reniec/dni?numero=${dni}`,
      init: { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
    }),
    pick: (body) => compose([body.nombres, body.apellidoPaterno, body.apellidoMaterno]) || compose([body.nombreCompleto]),
  },
  apisperu: {
    label: 'apisperu.com',
    build: (dni, token) => ({
      url: `https://dniruc.apisperu.com/api/v1/dni/${dni}?token=${encodeURIComponent(token)}`,
      init: { headers: { Accept: 'application/json' } },
    }),
    pick: (body) => compose([body.nombres, body.apellidoPaterno, body.apellidoMaterno]),
  },
  migo: {
    label: 'migo.pe',
    build: (dni, token) => ({
      url: `https://api.migo.pe/api/v1/dni`,
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ token, dni }),
      },
    }),
    pick: (body) => compose([body.nombres, body.apellido_paterno, body.apellido_materno]) || compose([body.nombre]),
  },
};

export async function lookupFullName(dni) {
  if (!hasDniLookup()) {
    return { ok: false, reason: 'no hay una clave configurada para consultar el DNI' };
  }

  const provider = PROVIDERS[DNI_API_PROVIDER];
  if (!provider) {
    return { ok: false, reason: `el proveedor "${DNI_API_PROVIDER}" no esta soportado` };
  }

  const { url, init } = provider.build(dni, DNI_API_TOKEN);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
    const text = await response.text();

    if (response.status === 401 || response.status === 403) {
      return { ok: false, reason: `${provider.label} rechazo la clave (${response.status})` };
    }
    if (response.status === 404) {
      return { ok: false, reason: `${provider.label} no encontro el DNI ${dni}` };
    }
    if (response.status === 429) {
      return { ok: false, reason: `${provider.label} corto por limite de consultas` };
    }
    if (!response.ok) {
      return { ok: false, reason: `${provider.label} respondio ${response.status}` };
    }

    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return { ok: false, reason: `${provider.label} no devolvio JSON` };
    }

    const fullName = provider.pick(body);
    if (!fullName) {
      return { ok: false, reason: `${provider.label} respondio sin nombre para el DNI ${dni}` };
    }
    return { ok: true, fullName, source: provider.label };
  } catch (error) {
    const aborted = error.name === 'AbortError';
    return { ok: false, reason: aborted ? `${provider.label} tardo demasiado` : `${provider.label} no respondio: ${error.message}` };
  } finally {
    clearTimeout(timer);
  }
}
