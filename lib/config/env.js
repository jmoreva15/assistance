export const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
export const SUBMIT_DELAY_MS = Number(process.env.SUBMIT_DELAY_MS ?? 400);
export const hasSupabase = () => !!SUPABASE_URL && !!SUPABASE_SERVICE_ROLE_KEY;

export const DNI_API_PROVIDER = process.env.DNI_API_PROVIDER ?? 'decolecta';
export const DNI_API_TOKEN = process.env.DNI_API_TOKEN ?? '';
export const hasDniLookup = () => !!DNI_API_TOKEN;
