import { SUBMIT_DELAY_MS } from '../config/env.js';
import { repository } from '../data/repository.js';
import { ACTIONS } from '../domain/activity.js';
import { isSubmittable } from '../domain/records.js';
import { todayIso } from '../domain/time.js';
import { describeMappingProblems, mapFields } from '../forms/field-mapping.js';
import { readForm } from '../forms/read-form.js';
import { submitRecord } from '../forms/submit-response.js';
import { loadWorkspace } from './session-service.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const DRAFT_KINDS = ['today', 'single', 'bulk'];

function validateBatch(records, submittedDates, today) {
  if (!Array.isArray(records) || !records.length) throw new Error('no hay ningun registro para enviar');

  const duplicated = records.filter((record) => submittedDates.includes(record.date));
  if (duplicated.length) {
    throw new Error(`${duplicated.map((record) => record.date).join(', ')} ya esta(n) en el historial de enviados`);
  }

  const invalid = records.filter((record) => !isSubmittable(record, today));
  if (invalid.length) {
    throw new Error(
      invalid
        .map((record) => `${record.date} ${record.date > today ? 'es una fecha futura' : 'le falta una hora'}`)
        .join('; '),
    );
  }
}

export async function submitRecords({ userId, records, origin }) {
  const db = repository();
  const user = await db.getUserById(userId);
  if (!user) throw new Error('la sesion ya no existe');

  const submissions = await db.listSubmissions(userId);
  validateBatch(records, submissions.map((row) => row.date), todayIso());

  const form = await readForm(user.formUrl);
  const { mapping, unresolved, missingRequired } = mapFields(form.fields);
  const mappingProblem = describeMappingProblems({ unresolved, missingRequired });
  if (mappingProblem) throw new Error(`el formulario no coincide con lo que enviamos: ${mappingProblem}`);

  await db.logActivity(
    userId,
    ACTIONS.SUBMIT_REQUESTED,
    `${records.length} dia(s): ${records.map((record) => `${record.date} ${record.clockIn}-${record.clockOut}`).join(' | ')}`,
  );

  const profile = { fullName: user.fullName, dni: user.dni };
  const results = [];

  for (const [index, record] of records.entries()) {
    try {
      results.push(await submitRecord({ responseUrl: form.responseUrl, mapping, profile, record }));
    } catch (error) {
      results.push({ date: record.date, ok: false, reason: error.message });
    }
    if (index < records.length - 1) await wait(SUBMIT_DELAY_MS);
  }

  const confirmed = results.filter((result) => result.ok).map((result) => result.date);
  const failed = results.filter((result) => !result.ok);

  if (confirmed.length) {
    const source = DRAFT_KINDS.includes(origin) ? origin : 'today';
    await db.insertSubmissions(
      userId,
      records.filter((record) => confirmed.includes(record.date)).map((record) => ({ ...record, source })),
    );
    await db.logActivity(userId, ACTIONS.SUBMIT_CONFIRMED, `${confirmed.length}/${records.length}: ${confirmed.join(', ')}`);
    await clearSubmittedDrafts({ db, userId, origin, confirmed });
  }

  for (const failure of failed) {
    await db.logActivity(userId, ACTIONS.SUBMIT_FAILED, `${failure.date}: ${failure.reason}`);
  }

  const workspace = await loadWorkspace(user);
  return { results, confirmed, failed, ...workspace };
}

async function clearSubmittedDrafts({ db, userId, origin, confirmed }) {
  if (origin === 'today' || origin === 'single') {
    await db.deleteDraft(userId, origin);
    return;
  }
  if (origin !== 'bulk') return;

  const drafts = await db.getDrafts(userId);
  const batch = drafts.bulk;
  if (!batch) return;

  const remaining = (batch.records ?? []).filter((record) => !confirmed.includes(record.date));
  if (remaining.length) await db.saveDraft(userId, 'bulk', { ...batch, records: remaining });
  else await db.deleteDraft(userId, 'bulk');
}
