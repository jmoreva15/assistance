'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from './api-client.js';
import { clearUserId, readUserId, writeUserId } from './session-storage.js';
import { ACTIONS, describeChanges } from '../domain/activity.js';
import { createRecord, isSubmittable, validateTimeFormat } from '../domain/records.js';
import { currentTime, parseTime, todayIso } from '../domain/time.js';

const EMPTY = { user: null, submissions: [], drafts: { today: null, single: null, bulk: null }, activity: [] };

export function useAttendance() {
  const [workspace, setWorkspace] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const userId = readUserId();
    if (!userId) {
      setLoading(false);
      return;
    }
    apiClient
      .resumeSession(userId)
      .then(setWorkspace)
      .catch(() => clearUserId())
      .finally(() => setLoading(false));
  }, []);

  const run = useCallback(async (work, message) => {
    setBusy(true);
    setError(null);
    try {
      const next = await work();
      if (next?.user) setWorkspace(next);
      if (message) setNotice(message);
      return next ?? { ok: true };
    } catch (failure) {
      setError(failure.message);
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const submittedDates = useMemo(() => workspace.submissions.map((row) => row.date), [workspace.submissions]);
  const today = todayIso();
  const todayDraft = workspace.drafts.today;
  const todaySubmission = useMemo(
    () => workspace.submissions.find((row) => row.date === today) ?? null,
    [workspace.submissions, today],
  );

  const userId = workspace.user?.id;

  const putDraft = useCallback(
    (kind, payload, action, detail) => apiClient.saveDraft({ userId, kind, payload, action, detail }),
    [userId],
  );

  const openSession = useCallback(
    ({ dni, fullName, formUrl }) =>
      run(async () => {
        const next = await apiClient.openSession({ dni, fullName, formUrl });
        writeUserId(next.user.id);
        return next;
      }, 'Sesion abierta.'),
    [run],
  );

  const signOut = useCallback(() => {
    clearUserId();
    setWorkspace(EMPTY);
    setNotice('Sesion cerrada en este dispositivo.');
  }, []);

  const updateProfile = useCallback(
    (body) => run(() => apiClient.updateProfile({ userId, ...body }), 'Configuracion guardada.'),
    [run, userId],
  );

  const clockIn = useCallback(() => {
    if (todaySubmission) return setError('Hoy ya fue enviado.');
    if (todayDraft?.clockIn) return setError(`Hoy ya tiene entrada a las ${todayDraft.clockIn}.`);
    const time = currentTime();
    const record = { ...(todayDraft ?? createRecord({ date: today })), clockIn: time };
    return run(() => putDraft('today', record, ACTIONS.CLOCK_IN, `${today} a las ${time}`), `Entrada registrada a las ${time}.`);
  }, [run, putDraft, today, todayDraft, todaySubmission]);

  const clockOut = useCallback(
    (manualClockIn = null) => {
      if (todaySubmission) return setError('Hoy ya fue enviado.');
      if (todayDraft?.clockOut) return setError(`Hoy ya tiene salida a las ${todayDraft.clockOut}.`);
      const start = todayDraft?.clockIn ?? (manualClockIn ? parseTime(manualClockIn) : null);
      if (manualClockIn && !start) return setError(`No entiendo la hora "${manualClockIn}".`);
      if (!start) return { missingClockIn: true };
      const time = currentTime();
      const record = { ...(todayDraft ?? createRecord({ date: today })), clockIn: start, clockOut: time };
      const detail = todayDraft?.clockIn
        ? `${today} a las ${time}`
        : `${today}: entrada ${start} a mano y salida ${time} en vivo`;
      return run(() => putDraft('today', record, ACTIONS.CLOCK_OUT, detail), `Salida registrada a las ${time}.`);
    },
    [run, putDraft, today, todayDraft, todaySubmission],
  );

  const editToday = useCallback(
    (changes) => {
      const invalid = validateTimeFormat(changes);
      if (invalid) return setError(invalid);
      const current = todayDraft ?? createRecord({ date: today });
      const record = {
        ...current,
        clockIn: 'clockIn' in changes ? parseTime(changes.clockIn) : current.clockIn,
        clockOut: 'clockOut' in changes ? parseTime(changes.clockOut) : current.clockOut,
        note: 'note' in changes ? changes.note : current.note,
      };
      const changed = describeChanges(current, record);
      return run(
        () => putDraft('today', record, changed.length ? ACTIONS.DAY_EDITED : null, `jornada de hoy: ${changed.join('; ')}`),
        changed.length ? changed.join('; ') : 'Sin cambios.',
      );
    },
    [run, putDraft, today, todayDraft],
  );

  const saveSingleDay = useCallback(
    ({ date, clockIn, clockOut, note }) => {
      const invalid = validateTimeFormat({ clockIn, clockOut });
      if (invalid) return setError(invalid);
      if (date > today) return setError(`${date} todavia no ocurrio.`);
      if (submittedDates.includes(date)) return setError(`${date} ya esta en el historial de enviados.`);
      const record = createRecord({ date, clockIn: parseTime(clockIn), clockOut: parseTime(clockOut), note });
      if (!record.clockIn || !record.clockOut) return setError('Las dos horas son obligatorias.');
      return run(
        () => putDraft('single', record, ACTIONS.SINGLE_DAY_SAVED, `${date}: ${record.clockIn} a ${record.clockOut}`),
        `${date} guardado.`,
      );
    },
    [run, putDraft, today, submittedDates],
  );

  const removeSingleDay = useCallback(
    () =>
      run(
        () =>
          apiClient.removeDraft({
            userId,
            kind: 'single',
            action: ACTIONS.SINGLE_DAY_REMOVED,
            detail: workspace.drafts.single?.date ?? '',
          }),
        'Dia descartado.',
      ),
    [run, userId, workspace.drafts.single],
  );

  const createBatch = useCallback(
    ({ from, to, records, alreadySubmitted }) =>
      run(
        () =>
          putDraft(
            'bulk',
            { from, to, createdAt: new Date().toISOString(), records },
            ACTIONS.BATCH_CREATED,
            `${records.length} dia(s) de ${from} a ${to}${alreadySubmitted.length ? `; ${alreadySubmitted.length} ya enviados excluidos` : ''}`,
          ),
        `${records.length} dia(s) generados.`,
      ),
    [run, putDraft],
  );

  const removeBatch = useCallback(
    () =>
      run(
        () =>
          apiClient.removeDraft({
            userId,
            kind: 'bulk',
            action: ACTIONS.BATCH_REMOVED,
            detail: `${workspace.drafts.bulk?.records?.length ?? 0} dia(s)`,
          }),
        'Lote borrado.',
      ),
    [run, userId, workspace.drafts.bulk],
  );

  const editBatchDay = useCallback(
    (date, changes) => {
      const invalid = validateTimeFormat(changes);
      if (invalid) return setError(invalid);
      const batch = workspace.drafts.bulk;
      const previous = batch.records.find((record) => record.date === date);
      const updated = {
        ...previous,
        clockIn: 'clockIn' in changes ? parseTime(changes.clockIn) : previous.clockIn,
        clockOut: 'clockOut' in changes ? parseTime(changes.clockOut) : previous.clockOut,
        note: 'note' in changes ? changes.note : previous.note,
      };
      const changed = describeChanges(previous, updated);
      return run(
        () =>
          putDraft(
            'bulk',
            { ...batch, records: batch.records.map((record) => (record.date === date ? updated : record)) },
            changed.length ? ACTIONS.DAY_EDITED : null,
            `${date} del lote: ${changed.join('; ')}`,
          ),
        changed.length ? `${date}: ${changed.join('; ')}` : 'Sin cambios.',
      );
    },
    [run, putDraft, workspace.drafts.bulk],
  );

  const submit = useCallback(
    (records, origin) => {
      const blocked = records.filter((record) => !isSubmittable(record, today));
      if (blocked.length) return setError(`No se puede enviar: ${blocked.map((record) => record.date).join(', ')}.`);
      return run(async () => {
        const result = await apiClient.submit({ userId, records, origin });
        const failed = result.failed ?? [];
        if (failed.length) setError(`${failed.length} dia(s) no se confirmaron: ${failed.map((row) => `${row.date} — ${row.reason}`).join('; ')}`);
        setNotice(`${result.confirmed.length} de ${records.length} registro(s) confirmados por Google.`);
        return result;
      });
    },
    [run, userId, today],
  );

  return {
    workspace,
    loading,
    busy,
    notice,
    error,
    setNotice,
    setError,
    today,
    todayDraft,
    todaySubmission,
    submittedDates,
    actions: {
      openSession,
      signOut,
      updateProfile,
      clockIn,
      clockOut,
      editToday,
      saveSingleDay,
      removeSingleDay,
      createBatch,
      removeBatch,
      editBatchDay,
      submit,
    },
  };
}
