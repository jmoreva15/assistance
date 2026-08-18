/**
 * Todo el estado vive en localStorage. El servidor solo envia al formulario,
 * guarda el registro y respalda en disco lo que se sincroniza.
 */
const CLAVE = 'asistencia:v1';

export const MAX_REGISTRO = 2000;

export const VACIO = {
  version: 1,
  registro: [],
  formUrl: '',
  constantes: { 'NOMBRE COMPLETO': '', DNI: '' },
  rangos: { ingreso: ['9:00 AM', '9:10 AM'], salida: ['6:00 PM', '6:15 PM'] },
  diasPorAdelantado: 5,
  enviados: [],
  dias: [],
};

export const hoyLocal = () => new Date().toLocaleDateString('sv-SE');
const p = (n) => String(n).padStart(2, '0');
const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

export function leer() {
  try {
    const bruto = localStorage.getItem(CLAVE);
    if (!bruto) return null;
    const datos = JSON.parse(bruto);
    return {
      ...VACIO,
      ...datos,
      constantes: { ...VACIO.constantes, ...datos.constantes },
      registro: Array.isArray(datos.registro) ? datos.registro : [],
    };
  } catch {
    return null;
  }
}

/**
 * Identificador de este navegador. El servidor lo usa para separar los envios y
 * el registro de cada usuario: nunca ves el de otro ni te bloquea su envio.
 */
export function clienteId() {
  const CLAVE_ID = 'asistencia:cliente';
  let id = localStorage.getItem(CLAVE_ID);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `c${Date.now()}${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(CLAVE_ID, id);
  }
  return id;
}

/** Agrega lineas al registro propio, recortando al maximo. */
export function agregarAlRegistro(datos, lineas) {
  return { ...datos, registro: [...(datos.registro || []), ...lineas].slice(-MAX_REGISTRO) };
}

/** Una linea con el mismo formato que las del servidor: [fecha ISO] ACCION detalle */
export const linea = (accion, detalle) => `[${new Date().toISOString()}] ${accion}${detalle ? ` ${detalle}` : ''}`;

/** Registra una o varias acciones sobre el estado y lo devuelve. */
export function registrar(datos, ...lineas) {
  return agregarAlRegistro(datos, lineas.filter(Boolean));
}

const ETIQUETA = { ingreso: 'ingreso', salida: 'salida', observacion: 'observacion', motivo: 'motivo' };

/** Describe en palabras que cambio entre dos versiones de un dia. */
export function describirCambios(anterior, nuevo) {
  const cambios = [];
  for (const campo of Object.keys(ETIQUETA)) {
    const antes = String(anterior?.[campo] ?? '');
    const despues = String(nuevo?.[campo] ?? '');
    if (antes === despues) continue;
    if (!antes) cambios.push(`${ETIQUETA[campo]} puesto en "${despues}"`);
    else if (!despues) cambios.push(`${ETIQUETA[campo]} borrado (era "${antes}")`);
    else cambios.push(`${ETIQUETA[campo]} de ${antes} a ${despues}`);
  }
  if (!!anterior?.omitir !== !!nuevo?.omitir) {
    cambios.push(nuevo?.omitir ? 'marcado para NO enviar (presencial)' : 'reactivado: vuelve a pendiente');
  }
  return cambios;
}

export function guardar(datos) {
  localStorage.setItem(CLAVE, JSON.stringify({ ...datos, guardado: new Date().toISOString() }));
  return datos;
}

export const configurado = (datos) =>
  !!datos?.formUrl && !!datos?.constantes?.['NOMBRE COMPLETO']?.trim() && /^\d{8}$/.test(String(datos?.constantes?.DNI || ''));

/** "9:20 AM" -> minutos desde medianoche. */
export function aMinutos(valor) {
  const t = String(valor).trim().toLowerCase().replace(/\./g, '');
  const m = t.match(/^(\d{1,2})[:. ]?(\d{2})?\s*(am|pm)?$/);
  if (!m) throw new Error(`hora invalida: "${valor}"`);
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const mer = m[3] ? m[3].toUpperCase() : h >= 12 ? 'PM' : 'AM';
  if (m[3]) h = mer === 'PM' ? (h === 12 ? 12 : h + 12) : h === 12 ? 0 : h;
  return (h % 24) * 60 + min;
}

export function aHora12(minutos) {
  const h24 = Math.floor(minutos / 60) % 24;
  const mer = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${p(minutos % 60)} ${mer}`;
}

export function horaAlAzar([desde, hasta]) {
  const a = aMinutos(desde);
  const b = aMinutos(hasta);
  const [min, max] = a <= b ? [a, b] : [b, a];
  return aHora12(min + Math.floor(Math.random() * (max - min + 1)));
}

/** Devuelve la fecha siguiente a la dada, en YYYY-MM-DD. */
function diaSiguiente(fecha) {
  const d = new Date(`${fecha}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function sumarDias(fecha, cantidad) {
  const d = new Date(`${fecha}T12:00:00`);
  d.setDate(d.getDate() + cantidad);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Genera los dias de lunes a viernes que falten, con esta regla:
 *
 *   desde  = el dia siguiente al ULTIMO ENVIADO (si nunca enviaste nada, hoy)
 *   hasta  = hoy + diasPorAdelantado
 *
 * Asi, si tu ultimo envio fue el 7 y entras el 20, se crean todos los dias
 * habiles del 8 al 20 como PENDIENTE, mas los siguientes como FUTURO.
 *
 * Es idempotente: nunca duplica un dia que ya este en la lista.
 * No sabe de feriados: si un dia no corresponde, se marca con «omitir» a mano.
 */
export function asegurarVentana(datos) {
  const adelanto = Number(datos.diasPorAdelantado ?? 5);
  if (!Number.isFinite(adelanto) || adelanto < 0) return { datos, agregados: [], desde: null, motivo: 'diasPorAdelantado invalido' };

  const hoy = hoyLocal();
  const enviados = [...(datos.enviados || [])].sort();
  const ultimoEnviado = enviados[enviados.length - 1] || null;

  const desde = ultimoEnviado ? diaSiguiente(ultimoEnviado) : hoy;
  const hasta = sumarDias(hoy, adelanto);
  const motivo = ultimoEnviado
    ? `desde el dia siguiente al ultimo enviado (${ultimoEnviado})`
    : 'desde hoy porque todavia no enviaste nada';

  if (desde > hasta) return { datos, agregados: [], desde, motivo };

  const existentes = new Set((datos.dias || []).map((d) => d.fecha));
  const cursor = new Date(`${desde}T12:00:00`);
  const limite = new Date(`${hasta}T12:00:00`);
  const nuevos = [];

  for (; cursor <= limite; cursor.setDate(cursor.getDate() + 1)) {
    const dow = cursor.getDay();
    if (dow === 0 || dow === 6) continue;
    const fecha = `${cursor.getFullYear()}-${p(cursor.getMonth() + 1)}-${p(cursor.getDate())}`;
    if (existentes.has(fecha)) continue;
    nuevos.push({
      fecha,
      dia: DIAS_SEMANA[dow],
      ingreso: horaAlAzar(datos.rangos.ingreso),
      salida: horaAlAzar(datos.rangos.salida),
      observacion: '',
      motivo: '',
    });
  }

  if (!nuevos.length) return { datos, agregados: [], desde, motivo };

  const dias = [...(datos.dias || []), ...nuevos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const pendientes = nuevos.filter((d) => d.fecha <= hoy).map((d) => d.fecha);
  const futuros = nuevos.filter((d) => d.fecha > hoy).map((d) => d.fecha);
  return { datos: { ...datos, dias }, agregados: nuevos.map((d) => d.fecha), pendientes, futuros, desde, motivo };
}

/** Descarga el estado completo como archivo. */
export function descargar(datos) {
  const contenido = JSON.stringify({ ...datos, exportado: new Date().toISOString() }, null, 2);
  const url = URL.createObjectURL(new Blob([contenido], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `mis-datos-asistencia-${hoyLocal()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Valida e importa un objeto exportado antes. */
export function importar(objeto) {
  if (!objeto || typeof objeto !== 'object') throw new Error('el archivo no tiene un objeto JSON');
  if (!Array.isArray(objeto.dias)) throw new Error('el archivo no tiene un arreglo "dias"');
  if (!objeto.constantes?.['NOMBRE COMPLETO']) throw new Error('el archivo no trae "constantes.NOMBRE COMPLETO"');
  return {
    ...VACIO,
    ...objeto,
    constantes: { ...VACIO.constantes, ...objeto.constantes },
    rangos: objeto.rangos || VACIO.rangos,
    enviados: Array.isArray(objeto.enviados) ? objeto.enviados : [],
  };
}
