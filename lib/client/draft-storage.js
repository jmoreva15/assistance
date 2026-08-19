const key = (userId) => `asistencia:drafts:${userId}`;

const EMPTY = { today: null, bulk: null };

export function readDrafts(userId, today) {
  if (!userId) return EMPTY;
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return EMPTY;
    const stored = { ...EMPTY, ...JSON.parse(raw) };
    if (stored.today && stored.today.date !== today) return { ...stored, today: null, discarded: stored.today };
    return stored;
  } catch {
    return EMPTY;
  }
}

export function writeDrafts(userId, drafts) {
  if (!userId) return drafts;
  try {
    const { discarded, ...clean } = drafts;
    localStorage.setItem(key(userId), JSON.stringify(clean));
  } catch {
    return drafts;
  }
  return drafts;
}
