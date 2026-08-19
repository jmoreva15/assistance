async function request(path, method, body) {
  const response = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    const failure = new Error(payload.error ?? `error ${response.status}`);
    failure.code = payload.code ?? null;
    failure.status = response.status;
    throw failure;
  }
  return payload;
}

export const apiClient = {
  openSession: (body) => request('/api/session', 'POST', body),
  resumeSession: (userId) => request('/api/session', 'POST', { userId }),
  updateProfile: (body) => request('/api/profile', 'PUT', body),
  saveDraft: (body) => request('/api/drafts', 'PUT', body),
  removeDraft: (body) => request('/api/drafts', 'DELETE', body),
  submit: (body) => request('/api/submissions', 'POST', body),
};
