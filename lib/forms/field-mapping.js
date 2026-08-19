const normalize = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[*:]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export const ROLES = {
  FULL_NAME: 'fullName',
  DNI: 'dni',
  DATE: 'date',
  CLOCK_IN: 'clockIn',
  CLOCK_OUT: 'clockOut',
  NOTE: 'note',
};

const ROLE_HINTS = [
  { role: ROLES.FULL_NAME, type: 'short-text', keywords: ['nombre completo', 'nombre y apellido', 'nombre'] },
  { role: ROLES.DNI, type: 'short-text', keywords: ['dni', 'documento', 'cedula', 'identificacion'] },
  { role: ROLES.DATE, type: 'date', keywords: ['fecha', 'dia'] },
  { role: ROLES.CLOCK_IN, type: 'time', keywords: ['ingreso', 'entrada', 'conexion', 'inicio'] },
  { role: ROLES.CLOCK_OUT, type: 'time', keywords: ['salida', 'desconexion', 'fin', 'termino'] },
  { role: ROLES.NOTE, type: 'paragraph', keywords: ['observacion', 'comentario', 'nota'] },
];

function pickField(fields, hint, taken) {
  const candidates = fields.filter((field) => !taken.has(field.entryId));
  const byTypeAndKeyword = candidates.find(
    (field) => field.type === hint.type && hint.keywords.some((word) => normalize(field.title).includes(word)),
  );
  if (byTypeAndKeyword) return byTypeAndKeyword;
  const byKeyword = candidates.find((field) => hint.keywords.some((word) => normalize(field.title).includes(word)));
  if (byKeyword) return byKeyword;
  if (hint.type === 'date' || hint.type === 'time') {
    return candidates.find((field) => field.type === hint.type) ?? null;
  }
  return null;
}

export function mapFields(fields) {
  const taken = new Set();
  const mapping = {};
  const unresolved = [];

  for (const hint of ROLE_HINTS) {
    const field = pickField(fields, hint, taken);
    if (field) {
      taken.add(field.entryId);
      mapping[hint.role] = field;
    } else {
      mapping[hint.role] = null;
      if (hint.role !== ROLES.NOTE) unresolved.push(hint.role);
    }
  }

  const missingRequired = fields.filter((field) => field.required && !taken.has(field.entryId));
  return { mapping, unresolved, missingRequired };
}

const ROLE_NAMES = {
  fullName: 'nombre completo',
  dni: 'DNI',
  date: 'fecha',
  clockIn: 'hora de entrada',
  clockOut: 'hora de salida',
};

export function describeMappingProblems({ unresolved, missingRequired }) {
  const problems = [];
  if (unresolved.length) {
    problems.push(`no encontre en el formulario ${unresolved.map((role) => ROLE_NAMES[role] ?? role).join(', ')}`);
  }
  if (missingRequired.length) {
    problems.push(
      `el formulario tiene preguntas obligatorias que no se llenan: ${missingRequired.map((field) => `"${field.title}"`).join(', ')}`,
    );
  }
  return problems.length ? problems.join('; ') : null;
}
