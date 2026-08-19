import { repository } from '../data/repository.js';
import { sessionGone } from './errors.js';

export async function recordActivity({ userId, action, detail }) {
  if (!action) throw new Error('falta la accion a registrar');
  const db = repository();
  const user = await db.getUserById(userId);
  if (!user) throw sessionGone();

  await db.logActivity(userId, action, String(detail ?? ''));
  return { logged: true };
}

export async function readActivity(userId) {
  const db = repository();
  const user = await db.getUserById(userId);
  if (!user) throw sessionGone();
  return { activity: await db.listActivity(userId) };
}
