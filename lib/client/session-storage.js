const KEY = 'asistencia:user';

const parse = (raw) => {
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw);
    return stored?.userId ? stored : null;
  } catch {
    return { userId: raw, savedAt: null };
  }
};

export const readSession = () => {
  try {
    return parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
};

export const readUserId = () => readSession()?.userId ?? null;

export const writeUserId = (userId) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ userId, savedAt: new Date().toISOString() }));
  } catch {
    return;
  }
};

export const touchSession = () => {
  const stored = readSession();
  if (stored) writeUserId(stored.userId);
};

export const clearUserId = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    return;
  }
};
