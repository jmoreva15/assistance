const STATUS_MESSAGE = {
  404: 'la ruta no existe en el servidor',
  405: 'el servidor rechazo el metodo de la peticion',
  500: 'el servidor tuvo un error interno',
  502: 'el servidor no esta respondiendo',
  503: 'el servidor no esta disponible en este momento',
  504: 'el servidor tardo demasiado en responder',
};

async function readPayload(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function request(path, method, body) {
  let response;
  try {
    response = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    const offline = new Error('no pude conectar con el servidor: revisa tu conexion');
    offline.code = 'NETWORK';
    throw offline;
  }

  const payload = await readPayload(response);

  if (!response.ok) {
    const failure = new Error(
      payload?.error ?? `${STATUS_MESSAGE[response.status] ?? 'el servidor respondio con un error'} (${response.status})`,
    );
    failure.code = payload?.code ?? null;
    failure.status = response.status;
    throw failure;
  }

  if (!payload) {
    const empty = new Error('el servidor respondio vacio');
    empty.code = 'EMPTY';
    throw empty;
  }

  return payload;
}

export const apiClient = {
  openSession: (body) => request('/api/session', 'POST', body),
  resumeSession: (userId) => request('/api/session', 'POST', { userId }),
  updateProfile: (body) => request('/api/profile', 'PUT', body),
  submit: (body) => request('/api/submissions', 'POST', body),
  log: (body) => request('/api/activity', 'POST', body),
  readActivity: (userId) => request(`/api/activity?userId=${encodeURIComponent(userId)}`, 'GET'),
  readForm: () => request('/api/form', 'GET'),
};
