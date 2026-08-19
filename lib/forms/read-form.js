const FIELD_TYPES = {
  0: 'short-text',
  1: 'paragraph',
  2: 'radio',
  3: 'dropdown',
  4: 'checkbox',
  9: 'date',
  10: 'time',
};

const LOAD_DATA_PATTERN = /FB_PUBLIC_LOAD_DATA_ = (\[.*?\]);<\/script>/s;
const FORM_ACTION_PATTERN = /<form[^>]*action="([^"]+formResponse)"/;

export const isGoogleFormUrl = (url) => /^https:\/\/docs\.google\.com\/forms\/.+/.test(String(url ?? ''));

export const toResponseUrl = (viewUrl) =>
  String(viewUrl).replace(/\/viewform.*$/, '/formResponse').replace(/\/edit.*$/, '/formResponse');

export async function readForm(viewUrl) {
  if (!isGoogleFormUrl(viewUrl)) {
    throw new Error('la URL debe empezar con https://docs.google.com/forms/');
  }

  const response = await fetch(viewUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`el formulario respondio ${response.status}: revisa que la URL sea publica`);
  }

  const html = await response.text();
  const match = html.match(LOAD_DATA_PATTERN);
  if (!match) {
    throw new Error('no pude leer la estructura del formulario: puede que pida permiso o que no sea publico');
  }

  const declaredAction = html.match(FORM_ACTION_PATTERN)?.[1];
  const payload = JSON.parse(match[1]);
  const fields = (payload[1]?.[1] ?? []).map((question) => ({
    entryId: String(question[4]?.[0]?.[0] ?? ''),
    title: String(question[1] ?? '').trim(),
    type: FIELD_TYPES[question[3]] ?? String(question[3]),
    required: !!question[4]?.[0]?.[2],
  }));

  return { title: String(payload[1]?.[8] ?? ''), responseUrl: declaredAction ?? toResponseUrl(viewUrl), fields };
}
