'use client';

import { useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Divider, Stack, TextField, Typography } from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { DateField, TimeField } from '../components/fields.jsx';
import { DEFAULT_CLOCK_IN, DEFAULT_CLOCK_OUT, timeNotice, validateTimeFormat } from '../lib/domain/records.js';
import { addDays, formatDuration, formatLongDate, isWeekend, parseTime, workedMinutes } from '../lib/domain/time.js';

export default function SingleDayPanel({ today, draft, submittedDates, busy, actions, onSubmit }) {
  const [date, setDate] = useState(() => addDays(today, -1));
  const [clockIn, setClockIn] = useState(DEFAULT_CLOCK_IN);
  const [clockOut, setClockOut] = useState(DEFAULT_CLOCK_OUT);
  const [note, setNote] = useState('');

  const rejection = validateTimeFormat({ clockIn, clockOut });
  const notice = timeNotice({ clockIn, clockOut });

  const dateProblem = useMemo(() => {
    if (!date) return 'elige una fecha';
    if (date > today) return 'esa fecha todavia no ocurrio';
    if (submittedDates.includes(date)) return 'ese dia ya esta en el historial de enviados';
    return null;
  }, [date, today, submittedDates]);

  const valid = !dateProblem && !rejection && !!parseTime(clockIn) && !!parseTime(clockOut);

  const save = () => actions.saveSingleDay({ date, clockIn, clockOut, note });

  const saveAndSubmit = async () => {
    const result = await save();
    if (result?.user) {
      onSubmit([{ date, weekday: null, clockIn: parseTime(clockIn), clockOut: parseTime(clockOut), note }], 'single');
    }
  };

  return (
    <Stack spacing={2.5}>
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center">
            <EventAvailableIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="h6">Se me olvido un dia</Typography>
          </Stack>

          <Stack spacing={3} sx={{ mt: 3 }}>
            <DateField
              label="Fecha"
              value={date}
              onChange={setDate}
              max={today}
              error={dateProblem}
              help={date ? formatLongDate(date) : ' '}
            />

            <Stack direction="row" spacing={2}>
              <TimeField label="Entrada" value={clockIn} onChange={(value) => setClockIn(value || '')} />
              <TimeField label="Salida" value={clockOut} onChange={(value) => setClockOut(value || '')} />
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip variant="outlined" label={`${DEFAULT_CLOCK_IN} → ${DEFAULT_CLOCK_OUT}`} />
              <Button
                size="small"
                onClick={() => {
                  setClockIn(DEFAULT_CLOCK_IN);
                  setClockOut(DEFAULT_CLOCK_OUT);
                }}
              >
                restablecer
              </Button>
            </Stack>

            <TextField
              label="Observacion (opcional)"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              multiline
              minRows={2}
              fullWidth
            />

            {rejection && <Alert severity="error">{rejection}</Alert>}
            {!rejection && notice && <Alert severity="info">{notice}</Alert>}
            {date && isWeekend(date) && !dateProblem && (
              <Alert severity="warning">{formatLongDate(date)} cae en fin de semana.</Alert>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button startIcon={<SaveIcon />} disabled={!valid || busy} onClick={save}>
                Solo guardar
              </Button>
              <Box sx={{ flex: 1 }} />
              <Button variant="contained" color="error" startIcon={<SendIcon />} disabled={!valid || busy} onClick={saveAndSubmit}>
                Guardar y enviar
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {draft && (
        <Card variant="outlined">
          <CardContent sx={{ pb: 1.5 }}>
            <Typography variant="h6">Guardado sin enviar</Typography>
          </CardContent>
          <Divider />
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, textTransform: 'capitalize' }}>{formatLongDate(draft.date)}</Typography>
                <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {draft.clockIn} → {draft.clockOut} · {formatDuration(workedMinutes(draft.clockIn, draft.clockOut))}
                </Typography>
                {draft.note && (
                  <Typography variant="caption" color="text.secondary">
                    {draft.note}
                  </Typography>
                )}
              </Box>
              <Button startIcon={<DeleteOutlineIcon />} disabled={busy} onClick={actions.removeSingleDay}>
                Borrar
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<SendIcon />}
                disabled={busy}
                onClick={() => onSubmit([draft], 'single')}
              >
                Enviar
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
