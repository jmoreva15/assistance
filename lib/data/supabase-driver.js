import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from '../config/env.js';
import { weekdayName } from '../domain/time.js';

const client = () =>
  createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const toUser = (row) => ({
  id: row.id,
  dni: row.dni,
  fullName: row.full_name,
  createdAt: row.created_at,
});

const toSubmission = (row) => ({
  date: row.work_date,
  weekday: weekdayName(row.work_date),
  clockIn: String(row.clock_in).slice(0, 5),
  clockOut: String(row.clock_out).slice(0, 5),
  note: row.note ?? '',
  source: row.source,
  submittedAt: row.submitted_at,
});

const toActivity = (row) => ({
  id: row.id,
  action: row.action,
  detail: row.detail ?? '',
  createdAt: row.created_at,
});

function fail(context, error) {
  const cause = error?.cause?.message ?? error?.details ?? error?.hint ?? '';
  const code = error?.code ? ` [${error.code}]` : '';
  throw new Error(`${context}: ${error?.message ?? error}${code}${cause ? ` (${cause})` : ''}`);
}

export function createSupabaseDriver() {
  const db = client();

  return {
    name: 'supabase',

    async getUserById(id) {
      const { data, error } = await db.from('users').select('*').eq('id', id).maybeSingle();
      if (error) fail('no pude buscar el usuario', error);
      return data ? toUser(data) : null;
    },

    async getUserByDni(dni) {
      const { data, error } = await db.from('users').select('*').eq('dni', dni).maybeSingle();
      if (error) fail('no pude buscar el usuario', error);
      return data ? toUser(data) : null;
    },

    async createUser({ dni, fullName }) {
      const { data, error } = await db
        .from('users')
        .insert({ dni, full_name: fullName })
        .select()
        .single();
      if (error) fail('no pude crear el usuario', error);
      return toUser(data);
    },

    async updateProfile(userId, { fullName }) {
      const { data, error } = await db
        .from('users')
        .update({ full_name: fullName, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();
      if (error) fail('no pude guardar el perfil', error);
      return toUser(data);
    },

    async listSubmissions(userId) {
      const { data, error } = await db
        .from('submissions')
        .select('*')
        .eq('user_id', userId)
        .order('work_date', { ascending: true });
      if (error) fail('no pude leer los enviados', error);
      return data.map(toSubmission);
    },

    async insertSubmissions(userId, records) {
      if (!records.length) return [];
      const rows = records.map((record) => ({
        user_id: userId,
        work_date: record.date,
        clock_in: record.clockIn,
        clock_out: record.clockOut,
        note: record.note ?? '',
        source: record.source ?? 'today',
      }));
      const { data, error } = await db.from('submissions').upsert(rows, { onConflict: 'user_id,work_date' }).select();
      if (error) fail('no pude guardar los enviados', error);
      return data.map(toSubmission);
    },




    async logActivity(userId, action, detail) {
      const { error } = await db.from('activity_log').insert({ user_id: userId, action, detail });
      if (error) fail('no pude escribir la bitacora', error);
    },

    async listActivity(userId, limit = 300) {
      const { data, error } = await db
        .from('activity_log')
        .select('*')
        .eq('user_id', userId)
        .order('id', { ascending: false })
        .limit(limit);
      if (error) fail('no pude leer la bitacora', error);
      return data.map(toActivity).reverse();
    },
  };
}
