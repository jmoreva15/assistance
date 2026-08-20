'use client';

import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Divider, LinearProgress, Stack, TextField, Typography,
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import SendIcon from '@mui/icons-material/Send';
import Clock from '../components/Clock.jsx';
import PunchCard from '../components/PunchCard.jsx';
import MissingClockInDialog from '../components/MissingClockInDialog.jsx';
import SubmissionPreview from '../components/SubmissionPreview.jsx';
import { COMPLETENESS, FULL_DAY_MINUTES, completenessOf, timeNotice } from '../lib/domain/records.js';
import { formatDuration, workedMinutes } from '../lib/domain/time.js';
import { MONO } from '../lib/theme/theme.js';

export default function TodayPanel({ draft, submitted, profile, form, busy, actions, onSubmit }) {
  const record = submitted ?? draft ?? null;
  const locked = !!submitted;
  const completeness = completenessOf(record);
  const worked = workedMinutes(record?.clockIn, record?.clockOut);
  const [note, setNote] = useState(draft?.note ?? '');
  const [elapsed, setElapsed] = useState(0);
  const [askClockIn, setAskClockIn] = useState(false);

  useEffect(() => setNote(draft?.note ?? ''), [draft?.date, draft?.note]);

  useEffect(() => {
    if (!draft?.clockIn || draft?.clockOut) return setElapsed(0);
    const compute = () => {
      const [hours, minutes] = draft.clockIn.split(':').map(Number);
      const start = new Date();
      start.setHours(hours, minutes, 0, 0);
      setElapsed(Math.max(0, Math.round((Date.now() - start.getTime()) / 60000)));
    };
    compute();
    const timer = setInterval(compute, 30000);
    return () => clearInterval(timer);
  }, [draft?.clockIn, draft?.clockOut]);

  const remaining = FULL_DAY_MINUTES - elapsed;
  const noteChanged = (draft?.note ?? '') !== note;
  const complete = completeness === COMPLETENESS.COMPLETE;

  const punchOut = async () => {
    const result = await actions.clockOut();
    if (result?.missingClockIn) setAskClockIn(true);
  };

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <Clock />
        <Divider />

        <Stack direction={{ xs: 'column', sm: 'row' }}>
          <PunchCard
            label="Entrada"
            time={record?.clockIn}
            icon={<LoginIcon sx={{ fontSize: 15 }} />}
            onPunch={actions.clockIn}
            onEdit={(value) => actions.editToday({ clockIn: value })}
            onRestamp={() => actions.restampToday('clockIn')}
            locked={locked || busy}
          />
          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
          <Divider sx={{ display: { xs: 'block', sm: 'none' } }} />
          <PunchCard
            label="Salida"
            time={record?.clockOut}
            icon={<LogoutIcon sx={{ fontSize: 15 }} />}
            onPunch={punchOut}
            onEdit={(value) => actions.editToday({ clockOut: value })}
            onRestamp={() => actions.restampToday('clockOut')}
            locked={locked || busy}
          />
        </Stack>

        {draft?.clockIn && !draft?.clockOut && (
          <>
            <Divider />
            <Box sx={{ px: 2, py: 1.25 }}>
              <LinearProgress variant="determinate" value={Math.min(100, (elapsed / FULL_DAY_MINUTES) * 100)} sx={{ height: 4 }} />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, textAlign: 'center' }}>
                {formatDuration(elapsed)} {remaining > 0 ? `· faltan ${formatDuration(remaining)}` : '· jornada cumplida'}
              </Typography>
            </Box>
          </>
        )}

        {complete && (
          <>
            <Divider />
            <Stack
              direction="row"
              spacing={1}
              alignItems="baseline"
              justifyContent="center"
              sx={{ px: 2, py: 1.5 }}
              flexWrap="wrap"
              useFlexGap
            >
              <Typography sx={{ fontFamily: MONO, fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>
                {record.clockIn} → {record.clockOut}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatDuration(worked)}
              </Typography>
              {timeNotice(record) && (
                <Typography variant="caption" color="warning.main" sx={{ width: '100%', textAlign: 'center' }}>
                  {timeNotice(record)}
                </Typography>
              )}
            </Stack>
          </>
        )}

        {locked && (
          <>
            <Divider />
            <Box sx={{ p: 2 }}>
              <Alert severity="success" variant="outlined">
                Asistencia de hoy registrada · {formatDuration(worked)}
              </Alert>
            </Box>
          </>
        )}
      </Card>

      {!locked && complete && (
        <>
          <TextField
            label="Observacion"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onBlur={() => {
              if (noteChanged) actions.editToday({ note });
            }}
            multiline
            minRows={2}
            fullWidth
          />

          <SubmissionPreview profile={profile} record={{ ...record, note }} form={form} />

          <Button
            variant="contained"
            color="error"
            size="large"
            startIcon={<SendIcon />}
            disabled={busy}
            sx={{ py: 1.25 }}
            onClick={async () => {
              if (noteChanged) await actions.editToday({ note });
              onSubmit([{ ...record, note }], 'today');
            }}
          >
            Enviar
          </Button>
        </>
      )}

      <MissingClockInDialog
        open={askClockIn}
        onClose={() => setAskClockIn(false)}
        onConfirm={async (clockIn) => {
          setAskClockIn(false);
          await actions.clockOut(clockIn);
        }}
      />
    </Stack>
  );
}
