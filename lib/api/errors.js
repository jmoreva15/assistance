export const CODES = {
  SESSION_GONE: 'SESSION_GONE',
};

export function sessionGone() {
  const error = new Error('tu sesion se cerro: entra otra vez con tu DNI');
  error.code = CODES.SESSION_GONE;
  return error;
}
