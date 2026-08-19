import { repository } from '../data/repository.js';
import { ACTIONS } from '../domain/activity.js';
import { todayIso } from '../domain/time.js';
import { isGoogleFormUrl } from '../forms/read-form.js';

export const isValidDni = (dni) => /^\d{8}$/.test(String(dni ?? ''));

export async function openSession({ dni, fullName, formUrl }) {
  if (!isValidDni(dni)) throw new Error('el DNI debe tener 8 digitos');

  const db = repository();
  let user = await db.getUserByDni(dni);

  if (!user) {
    if (!String(fullName ?? '').trim()) throw new Error('falta el nombre completo para crear la cuenta');
    if (!isGoogleFormUrl(formUrl)) throw new Error('la URL debe ser un enlace de Formularios de Google');
    user = await db.createUser({ dni, fullName: String(fullName).trim(), formUrl: String(formUrl).trim() });
    await db.logActivity(user.id, ACTIONS.SESSION_STARTED, `cuenta creada para el DNI ${dni}`);
  } else {
    await db.logActivity(user.id, ACTIONS.SESSION_STARTED, 'sesion abierta');
  }

  return loadWorkspace(user);
}

export async function loadWorkspace(user) {
  const db = repository();
  const drafts = await discardStaleToday(user.id, await db.getDrafts(user.id));
  const [submissions, activity] = await Promise.all([db.listSubmissions(user.id), db.listActivity(user.id)]);
  return { user, submissions, drafts, activity, storage: db.name };
}

async function discardStaleToday(userId, drafts) {
  const stale = drafts.today && drafts.today.date !== todayIso();
  if (!stale) return drafts;
  const db = repository();
  await db.deleteDraft(userId, 'today');
  await db.logActivity(
    userId,
    ACTIONS.DAY_DISCARDED,
    `jornada del ${drafts.today.date} (${drafts.today.clockIn ?? '--:--'} a ${drafts.today.clockOut ?? '--:--'}) que nunca se envio`,
  );
  return { ...drafts, today: null };
}

export async function resumeSession(userId) {
  const db = repository();
  const user = await db.getUserById?.(userId);
  if (!user) throw new Error('la sesion ya no existe');
  return loadWorkspace(user);
}

export async function updateProfile({ userId, fullName, formUrl }) {
  if (!String(fullName ?? '').trim()) throw new Error('el nombre completo no puede quedar vacio');
  if (!isGoogleFormUrl(formUrl)) throw new Error('la URL debe ser un enlace de Formularios de Google');
  const db = repository();
  const user = await db.updateProfile(userId, { fullName: String(fullName).trim(), formUrl: String(formUrl).trim() });
  await db.logActivity(userId, ACTIONS.PROFILE_UPDATED, 'nombre o formulario actualizados');
  return loadWorkspace(user);
}
