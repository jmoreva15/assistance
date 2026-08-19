const cleanSupabaseUrl = (value) =>
  String(value ?? '')
    .trim()
    .replace(/\/rest\/v\d+\/?$/, '')
    .replace(/\/+$/, '')
    .replace(/\.supabase\.com$/, '.supabase.co');

export const SUPABASE_URL = cleanSupabaseUrl(process.env.SUPABASE_URL);
export const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
export const SUBMIT_DELAY_MS = Number(process.env.SUBMIT_DELAY_MS ?? 400);
export const hasSupabase = () => !!SUPABASE_URL && !!SUPABASE_SERVICE_ROLE_KEY;

export const DNI_API_PROVIDER = (process.env.DNI_API_PROVIDER ?? 'decolecta').trim();
export const DNI_API_TOKEN = (process.env.DNI_API_TOKEN ?? '').trim();
export const hasDniLookup = () => !!DNI_API_TOKEN;
