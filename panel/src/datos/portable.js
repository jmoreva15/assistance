/** Exportar e importar los datos como archivo JSON. */
import { ESTADO_VACIO } from './repositorio.js';

export const NOMBRE_ARCHIVO = (hoy) => `asistencia-${hoy}.json`;

/** Lo que se escribe al archivo: el estado tal cual, con marca de exportacion. */
export function aExportable(datos) {
  return { ...datos, exportadoEn: new Date().toISOString() };
}

/**
 * Valida un archivo importado y lo completa con los valores por defecto.
 * Lanza con un motivo concreto si no sirve.
 */
export function desdeArchivo(objeto) {
  if (!objeto || typeof objeto !== 'object' || Array.isArray(objeto)) {
    throw new Error('el archivo no contiene un objeto JSON');
  }
  if (!objeto.enviados || typeof objeto.enviados !== 'object') {
    throw new Error('el archivo no trae la lista de "enviados"');
  }
  if (!objeto.constantes?.['NOMBRE COMPLETO']) {
    throw new Error('el archivo no trae "constantes.NOMBRE COMPLETO"');
  }

  const enviados = {};
  for (const [fecha, r] of Object.entries(objeto.enviados)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error(`la fecha "${fecha}" no es valida`);
    enviados[fecha] = { ...r, fecha };
  }

  return {
    ...ESTADO_VACIO,
    ...objeto,
    constantes: { ...ESTADO_VACIO.constantes, ...objeto.constantes },
    enviados,
    bitacora: Array.isArray(objeto.bitacora) ? objeto.bitacora : [],
  };
}

/** Dispara la descarga del archivo en el navegador. */
export function descargar(datos, hoy) {
  const contenido = JSON.stringify(aExportable(datos), null, 2);
  const url = URL.createObjectURL(new Blob([contenido], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = NOMBRE_ARCHIVO(hoy);
  a.click();
  URL.revokeObjectURL(url);
}
