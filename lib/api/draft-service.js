import { repository } from '../data/repository.js';
import { sessionGone } from './errors.js';
import { loadWorkspace } from './session-service.js';

const KINDS = ['today', 'bulk'];

export async function saveDraft({ userId, kind, payload, action, detail }) {
  if (!KINDS.includes(kind)) throw new Error(`tipo de borrador desconocido: ${kind}`);
  const db = repository();
  const user = await db.getUserById(userId);
  if (!user) throw sessionGone();

  await db.saveDraft(userId, kind, payload);
  if (action) await db.logActivity(userId, action, detail ?? '');
  return loadWorkspace(user);
}

export async function removeDraft({ userId, kind, action, detail }) {
  if (!KINDS.includes(kind)) throw new Error(`tipo de borrador desconocido: ${kind}`);
  const db = repository();
  const user = await db.getUserById(userId);
  if (!user) throw sessionGone();

  await db.deleteDraft(userId, kind);
  if (action) await db.logActivity(userId, action, detail ?? '');
  return loadWorkspace(user);
}
