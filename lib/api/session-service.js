import { FORM_URL } from '../config/form.js';
import { repository } from '../data/repository.js';
import { sessionGone } from './errors.js';
import { ACTIONS } from '../domain/activity.js';
import { todayIso } from '../domain/time.js';
import { lookupFullName } from '../identity/dni-lookup.js';

export const isValidDni = (dni) => /^\d{8}$/.test(String(dni ?? ''));

export async function openSession({ dni, fullName }) {
  if (!isValidDni(dni)) throw new Error('el DNI debe tener 8 digitos');

  const db = repository();
  const existing = await db.getUserByDni(dni);

  if (existing) {
    await db.logActivity(existing.id, ACTIONS.SESSION_STARTED, 'sesion abierta');
    return loadWorkspace(existing);
  }

  const typedName = String(fullName ?? '').trim();
  if (typedName) {
    const created = await db.createUser({ dni, fullName: typedName.toUpperCase() });
    await db.logActivity(created.id, ACTIONS.SESSION_STARTED, `cuenta creada para el DNI ${dni} con el nombre escrito a mano`);
    return loadWorkspace(created);
  }

  const lookup = await lookupFullName(dni);
  if (!lookup.ok) {
    return { needsFullName: true, dni, reason: lookup.reason };
  }

  const created = await db.createUser({ dni, fullName: lookup.fullName });
  await db.logActivity(created.id, ACTIONS.SESSION_STARTED, `cuenta creada para el DNI ${dni} con el nombre de ${lookup.source}`);
  return loadWorkspace(created);
}

export async function loadWorkspace(user) {
  const db = repository();
  const drafts = await discardStaleToday(user.id, await db.getDrafts(user.id));
  const [submissions, activity] = await Promise.all([db.listSubmissions(user.id), db.listActivity(user.id)]);
  return { user, submissions, drafts, activity, storage: db.name, formUrl: FORM_URL };
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
  if (!user) throw sessionGone();
  return loadWorkspace(user);
}

export async function updateProfile({ userId, fullName }) {
  if (!String(fullName ?? '').trim()) throw new Error('el nombre completo no puede quedar vacio');
  const db = repository();
  const user = await db.updateProfile(userId, { fullName: String(fullName).trim() });
  await db.logActivity(userId, ACTIONS.PROFILE_UPDATED, 'nombre actualizado');
  return loadWorkspace(user);
}
