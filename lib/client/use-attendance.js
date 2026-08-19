'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from './api-client.js';
import { clearDrafts, readDrafts, writeDrafts } from './draft-storage.js';
import { clearUserId, readUserId, writeUserId } from './session-storage.js';
import { ACTIONS, describeChanges } from '../domain/activity.js';
import { createRecord, isSubmittable, validateTimeFormat } from '../domain/records.js';
import { currentTime, parseTime, todayIso } from '../domain/time.js';

const EMPTY_WORKSPACE = { user: null, submissions: [], activity: [] };
const EMPTY_DRAFTS = { today: null, bulk: null };

export function useAttendance() {
  const [workspace, setWorkspace] = useState(EMPTY_WORKSPACE);
  const [drafts, setDrafts] = useState(EMPTY_DRAFTS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const today = todayIso();
  const userId = workspace.user?.id;
  const loadedFor = useRef(null);

  const log = useCallback(
    (id, action, detail) => {
      if (!id || !action) return;
      apiClient
        .log({ userId: id, action, detail })
        .then(() => apiClient.readActivity(id))
        .then(({ activity }) => setWorkspace((current) => (current.user?.id === id ? { ...current, activity } : current)))
        .catch(() => setWorkspace((current) => current));
    },
    [],
  );

  const adoptDrafts = useCallback(
    (id) => {
      const stored = readDrafts(id, today);
      setDrafts({ today: stored.today, bulk: stored.bulk });
      if (stored.discarded) {
        writeDrafts(id, { today: null, bulk: stored.bulk });
        const gone = stored.discarded;
        log(id, ACTIONS.DAY_DISCARDED, `jornada del ${gone.date} (${gone.clockIn ?? '--:--'} a ${gone.clockOut ?? '--:--'}) que nunca se envio`);
        setNotice(`Se descarto la jornada del ${gone.date}: la marcaste y no la enviaste.`);
      }
    },
    [today, log],
  );

  useEffect(() => {
    const stored = readUserId();
    if (!stored) {
      setLoading(false);
      return;
    }
    apiClient
      .resumeSession(stored)
      .then(setWorkspace)
      .catch(() => clearUserId())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!userId || loadedFor.current === userId) return;
    loadedFor.current = userId;
    adoptDrafts(userId);
  }, [userId, adoptDrafts]);

  const saveDrafts = useCallback(
    (next, action, detail) => {
      setDrafts(next);
      writeDrafts(userId, next);
      if (action) log(userId, action, detail);
    },
    [userId, log],
  );

  const run = useCallback(async (work, message) => {
    setBusy(true);
    setError(null);
    try {
      const next = await work();
      if (next?.user) setWorkspace(next);
      if (message && next?.user) setNotice(message);
      return next ?? { ok: true };
    } catch (failure) {
      if (failure.code === 'SESSION_GONE') {
        clearUserId();
        setWorkspace(EMPTY_WORKSPACE);
        setDrafts(EMPTY_DRAFTS);
        loadedFor.current = null;
      }
      setError(failure.message);
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const submittedDates = useMemo(() => workspace.submissions.map((row) => row.date), [workspace.submissions]);
  const todaySubmission = useMemo(
    () => workspace.submissions.find((row) => row.date === today) ?? null,
    [workspace.submissions, today],
  );

  const openSession = useCallback(
    ({ dni, fullName }) =>
      run(async () => {
        const next = await apiClient.openSession({ dni, fullName });
        if (next.user) writeUserId(next.user.id);
        return next;
      }, 'Sesion abierta.'),
    [run],
  );

  const signOut = useCallback(() => {
    clearUserId();
    setWorkspace(EMPTY_WORKSPACE);
    setDrafts(EMPTY_DRAFTS);
    loadedFor.current = null;
    setNotice('Sesion cerrada en este dispositivo.');
  }, []);

  const updateProfile = useCallback(
    (body) => run(() => apiClient.updateProfile({ userId, ...body }), 'Configuracion guardada.'),
    [run, userId],
  );

  const clockIn = useCallback(() => {
    if (todaySubmission) return setError('Hoy ya fue enviado.');
    if (drafts.today?.clockIn) return setError(`Hoy ya tiene entrada a las ${drafts.today.clockIn}.`);
    const time = currentTime();
    const record = { ...(drafts.today ?? createRecord({ date: today })), clockIn: time };
    saveDrafts({ ...drafts, today: record }, ACTIONS.CLOCK_IN, `${today} a las ${time}`);
    setNotice(`Entrada registrada a las ${time}.`);
    return { ok: true };
  }, [drafts, saveDrafts, today, todaySubmission]);

  const clockOut = useCallback(
    (manualClockIn = null) => {
      if (todaySubmission) return setError('Hoy ya fue enviado.');
      if (drafts.today?.clockOut) return setError(`Hoy ya tiene salida a las ${drafts.today.clockOut}.`);
      const start = drafts.today?.clockIn ?? (manualClockIn ? parseTime(manualClockIn) : null);
      if (manualClockIn && !start) return setError(`No entiendo la hora "${manualClockIn}".`);
      if (!start) return { missingClockIn: true };
      const time = currentTime();
      const record = { ...(drafts.today ?? createRecord({ date: today })), clockIn: start, clockOut: time };
      const detail = drafts.today?.clockIn
        ? `${today} a las ${time}`
        : `${today}: entrada ${start} a mano y salida ${time} en vivo`;
      saveDrafts({ ...drafts, today: record }, drafts.today?.clockIn ? ACTIONS.CLOCK_OUT : ACTIONS.CLOCK_IN, detail);
      setNotice(`Salida registrada a las ${time}.`);
      return { ok: true };
    },
    [drafts, saveDrafts, today, todaySubmission],
  );

  const editToday = useCallback(
    (changes) => {
      const invalid = validateTimeFormat(changes);
      if (invalid) return setError(invalid);
      const current = drafts.today ?? createRecord({ date: today });
      const record = {
        ...current,
        clockIn: 'clockIn' in changes ? parseTime(changes.clockIn) : current.clockIn,
        clockOut: 'clockOut' in changes ? parseTime(changes.clockOut) : current.clockOut,
        note: 'note' in changes ? changes.note : current.note,
      };
      const changed = describeChanges(current, record);
      saveDrafts(
        { ...drafts, today: record },
        changed.length ? ACTIONS.DAY_EDITED : null,
        `jornada de hoy: ${changed.join('; ')}`,
      );
      if (changed.length) setNotice(changed.join('; '));
      return { ok: true };
    },
    [drafts, saveDrafts, today],
  );

  const createBatch = useCallback(
    ({ from, to, records, alreadySubmitted }) => {
      const batch = { from, to, createdAt: new Date().toISOString(), records };
      saveDrafts(
        { ...drafts, bulk: batch },
        ACTIONS.BATCH_CREATED,
        `${records.length} dia(s) de ${from} a ${to}${alreadySubmitted.length ? `; ${alreadySubmitted.length} ya enviados excluidos` : ''}`,
      );
      setNotice(`${records.length} dia(s) generados.`);
      return { ok: true };
    },
    [drafts, saveDrafts],
  );

  const removeBatch = useCallback(() => {
    const count = drafts.bulk?.records?.length ?? 0;
    saveDrafts({ ...drafts, bulk: null }, ACTIONS.BATCH_REMOVED, `${count} dia(s)`);
    setNotice('Lote borrado.');
    return { ok: true };
  }, [drafts, saveDrafts]);

  const editBatchDay = useCallback(
    (date, changes) => {
      const invalid = validateTimeFormat(changes);
      if (invalid) return setError(invalid);
      const batch = drafts.bulk;
      const previous = batch.records.find((record) => record.date === date);
      const updated = {
        ...previous,
        clockIn: 'clockIn' in changes ? parseTime(changes.clockIn) : previous.clockIn,
        clockOut: 'clockOut' in changes ? parseTime(changes.clockOut) : previous.clockOut,
        note: 'note' in changes ? changes.note : previous.note,
      };
      const changed = describeChanges(previous, updated);
      saveDrafts(
        { ...drafts, bulk: { ...batch, records: batch.records.map((record) => (record.date === date ? updated : record)) } },
        changed.length ? ACTIONS.DAY_EDITED : null,
        `${date} del lote: ${changed.join('; ')}`,
      );
      return { ok: true };
    },
    [drafts, saveDrafts],
  );

  const submit = useCallback(
    (records, origin) => {
      const blocked = records.filter((record) => !isSubmittable(record, today));
      if (blocked.length) return setError(`No se puede enviar: ${blocked.map((record) => record.date).join(', ')}.`);
      return run(async () => {
        const result = await apiClient.submit({ userId, records, origin });
        const confirmed = result.confirmed ?? [];
        const failed = result.failed ?? [];

        if (confirmed.length) {
          const next = { ...drafts };
          if (origin === 'today') next.today = null;
          if (origin === 'bulk' && next.bulk) {
            const remaining = next.bulk.records.filter((record) => !confirmed.includes(record.date));
            next.bulk = remaining.length ? { ...next.bulk, records: remaining } : null;
          }
          setDrafts(next);
          writeDrafts(userId, next);
        }

        if (failed.length) {
          setError(`${failed.length} dia(s) no se confirmaron: ${failed.map((row) => `${row.date} — ${row.reason}`).join('; ')}`);
        }
        setNotice(`${confirmed.length} de ${records.length} registro(s) confirmados por Google.`);
        return result;
      });
    },
    [run, userId, today, drafts],
  );

  const clearLocalDrafts = useCallback(() => {
    clearDrafts(userId);
    setDrafts(EMPTY_DRAFTS);
    setNotice('Borradores de este navegador borrados.');
  }, [userId]);

  return {
    workspace,
    drafts,
    loading,
    busy,
    notice,
    error,
    setNotice,
    setError,
    today,
    todayDraft: drafts.today,
    todaySubmission,
    submittedDates,
    actions: {
      openSession,
      signOut,
      updateProfile,
      clockIn,
      clockOut,
      editToday,
      createBatch,
      removeBatch,
      editBatchDay,
      submit,
      clearLocalDrafts,
    },
  };
}
