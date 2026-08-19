const KEY = 'asistencia:user';

export const readUserId = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const writeUserId = (userId) => {
  try {
    localStorage.setItem(KEY, userId);
  } catch {
    return;
  }
};

export const clearUserId = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    return;
  }
};
