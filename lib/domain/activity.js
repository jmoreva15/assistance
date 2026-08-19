const FIELD_LABELS = { clockIn: 'entrada', clockOut: 'salida', note: 'observacion' };

export const ACTIONS = {
  SESSION_STARTED: 'SESION',
  PROFILE_UPDATED: 'PERFIL',
  CLOCK_IN: 'ENTRADA',
  CLOCK_OUT: 'SALIDA',
  DAY_EDITED: 'EDICION',
  DAY_DISCARDED: 'DESCARTADO',
  SINGLE_DAY_SAVED: 'UN DIA',
  SINGLE_DAY_REMOVED: 'UN DIA BORRADO',
  BATCH_CREATED: 'LOTE GENERADO',
  BATCH_REMOVED: 'LOTE BORRADO',
  SUBMIT_REQUESTED: 'ENVIO SOLICITADO',
  SUBMIT_CONFIRMED: 'ENVIADO',
  SUBMIT_FAILED: 'FALLO',
  ERROR: 'ERROR',
};

export function describeChanges(before, after) {
  const changes = [];
  for (const field of Object.keys(FIELD_LABELS)) {
    const previous = String(before?.[field] ?? '');
    const next = String(after?.[field] ?? '');
    if (previous === next) continue;
    if (!previous) changes.push(`${FIELD_LABELS[field]} puesta en ${next}`);
    else if (!next) changes.push(`${FIELD_LABELS[field]} borrada (era ${previous})`);
    else changes.push(`${FIELD_LABELS[field]} de ${previous} a ${next}`);
  }
  return changes;
}
