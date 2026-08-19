'use client';

import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Divider, IconButton, LinearProgress, Paper, Stack, TextField,
  Tooltip, Typography,
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import EditIcon from '@mui/icons-material/Edit';
import SendIcon from '@mui/icons-material/Send';
import Clock from '../components/Clock.jsx';
import PunchCard from '../components/PunchCard.jsx';
import MissingClockInDialog from '../components/MissingClockInDialog.jsx';
import { COMPLETENESS, FULL_DAY_MINUTES, completenessOf, timeNotice } from '../lib/domain/records.js';
import { formatDuration, workedMinutes } from '../lib/domain/time.js';
import { MONO } from '../lib/theme/theme.js';

export default function TodayPanel({ today, draft, submitted, busy, actions, onEdit, onSubmit }) {
  const record = submitted ?? draft ?? null;
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

  const punchOut = async () => {
    const result = await actions.clockOut();
    if (result?.missingClockIn) setAskClockIn(true);
  };

  return (
    <Stack spacing={2.5}>
      <Card variant="outlined">
        <Clock />
        <Divider />

        <Stack direction={{ xs: 'column', sm: 'row' }}>
          <PunchCard
            label="Entrada"
            time={record?.clockIn}
            icon={<LoginIcon sx={{ fontSize: 15 }} />}
            onPunch={actions.clockIn}
            disabled={!!submitted || busy}
            hint={submitted ? 'enviado' : null}
          />
          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
          <Divider sx={{ display: { xs: 'block', sm: 'none' } }} />
          <PunchCard
            label="Salida"
            time={record?.clockOut}
            icon={<LogoutIcon sx={{ fontSize: 15 }} />}
            onPunch={punchOut}
            disabled={!!submitted || busy}
            hint={submitted ? 'enviado' : null}
          />
        </Stack>

        {draft?.clockIn && !draft?.clockOut && (
          <Box sx={{ px: 2, pb: 1.5 }}>
            <LinearProgress variant="determinate" value={Math.min(100, (elapsed / FULL_DAY_MINUTES) * 100)} sx={{ height: 4 }} />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, textAlign: 'center' }}>
              {remaining > 0
                ? `Llevas ${formatDuration(elapsed)} · faltan ${formatDuration(remaining)} para las 8 h`
                : `Llevas ${formatDuration(elapsed)} · ya cumpliste las 8 h`}
            </Typography>
          </Box>
        )}

        {!submitted && (record?.clockIn || record?.clockOut) && (
          <>
            <Divider />
            <Stack direction="row" justifyContent="center" sx={{ py: 0.5 }}>
              <Tooltip title="corregir las horas de hoy">
                <IconButton size="small" onClick={() => onEdit(record)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </>
        )}

        <Divider />
        <CardContent>
          {!submitted && completeness === COMPLETENESS.EMPTY && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              Toca <strong>ENTRADA</strong> al empezar.
            </Typography>
          )}

          {!submitted && completeness === COMPLETENESS.PARTIAL && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              Cuando termines, toca <strong>SALIDA</strong>.
            </Typography>
          )}

          {!submitted && completeness === COMPLETENESS.COMPLETE && (
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ px: 2, py: 1.25 }}>
                <Stack direction="row" spacing={1} alignItems="baseline" justifyContent="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="body2" color="text.secondary">
                    Intervalo registrado:
                  </Typography>
                  <Typography sx={{ fontFamily: MONO, fontVariantNumeric: 'tabular-nums' }}>
                    {record.clockIn} → {record.clockOut}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    · {formatDuration(worked)}
                  </Typography>
                </Stack>
                {timeNotice(record) && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}>
                    {timeNotice(record)}
                  </Typography>
                )}
              </Paper>

              <TextField
                label="Observacion (opcional)"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                multiline
                minRows={2}
                fullWidth
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                {noteChanged && <Button onClick={() => actions.editToday({ note })}>Guardar observacion</Button>}
                <Box sx={{ flex: 1 }} />
                <Button
                  variant="contained"
                  color="error"
                  size="large"
                  startIcon={<SendIcon />}
                  disabled={busy}
                  onClick={async () => {
                    if (noteChanged) await actions.editToday({ note });
                    onSubmit([{ ...record, note }], 'today');
                  }}
                >
                  Enviar mi jornada
                </Button>
              </Stack>
            </Stack>
          )}

          {submitted && (
            <Alert severity="success">
              Hoy ya fue enviado ({submitted.clockIn} → {submitted.clockOut}, {formatDuration(worked)}).
            </Alert>
          )}
        </CardContent>
      </Card>

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
