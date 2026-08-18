/** Lineas de bitacora, mismo formato que las que emite el servidor. */
export const linea = (accion, detalle) =>
  `[${new Date().toISOString()}] ${accion}${detalle ? ` ${detalle}` : ''}`;

export function anotar(estado, ...lineas) {
  return { ...estado, bitacora: [...(estado.bitacora || []), ...lineas.filter(Boolean)] };
}

const ETIQUETAS = { entrada: 'entrada', salida: 'salida', observacion: 'observacion' };

/** Describe en palabras el cambio entre dos versiones de un registro. */
export function describirCambios(antes, despues) {
  const cambios = [];
  for (const campo of Object.keys(ETIQUETAS)) {
    const a = String(antes?.[campo] ?? '');
    const d = String(despues?.[campo] ?? '');
    if (a === d) continue;
    if (!a) cambios.push(`${ETIQUETAS[campo]} puesta en ${d}`);
    else if (!d) cambios.push(`${ETIQUETAS[campo]} borrada (era ${a})`);
    else cambios.push(`${ETIQUETAS[campo]} de ${a} a ${d}`);
  }
  return cambios;
}
