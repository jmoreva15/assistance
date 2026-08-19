import { repository } from '../data/repository.js';
import { loadWorkspace } from './session-service.js';

const KINDS = ['today', 'single', 'bulk'];

export async function saveDraft({ userId, kind, payload, action, detail }) {
  if (!KINDS.includes(kind)) throw new Error(`tipo de borrador desconocido: ${kind}`);
  const db = repository();
  const user = await db.getUserById(userId);
  if (!user) throw new Error('la sesion ya no existe');

  await db.saveDraft(userId, kind, payload);
  if (action) await db.logActivity(userId, action, detail ?? '');
  return loadWorkspace(user);
}

export async function removeDraft({ userId, kind, action, detail }) {
  if (!KINDS.includes(kind)) throw new Error(`tipo de borrador desconocido: ${kind}`);
  const db = repository();
  const user = await db.getUserById(userId);
  if (!user) throw new Error('la sesion ya no existe');

  await db.deleteDraft(userId, kind);
  if (action) await db.logActivity(userId, action, detail ?? '');
  return loadWorkspace(user);
}
