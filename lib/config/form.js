const DEFAULT_FORM_URL =
  'https://docs.google.com/forms/d/15VQRkW_MQPFfOxVQpmr6SXVz3oQxhn4ro8gMJH9d28w/viewform';

const normalize = (url) => String(url).replace(/\/edit.*$/, '/viewform').replace(/\?.*$/, '');

export const FORM_URL = normalize(process.env.FORM_URL || DEFAULT_FORM_URL);
