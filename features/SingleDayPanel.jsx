'use client';

import { useMemo, useState } from 'react';
import { Alert, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import SendIcon from '@mui/icons-material/Send';
import { DateField, TimePickerField } from '../components/fields.jsx';
import { DEFAULT_CLOCK_IN, DEFAULT_CLOCK_OUT, timeNotice, validateTimeFormat } from '../lib/domain/records.js';
import { addDays, formatLongDate, isWeekend, parseTime, weekdayName } from '../lib/domain/time.js';

export default function SingleDayPanel({ today, submittedDates, busy, onSubmit }) {
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

  const send = () =>
    onSubmit(
      [{ date, weekday: weekdayName(date), clockIn: parseTime(clockIn), clockOut: parseTime(clockOut), note }],
      'single',
    );

  return (
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
            <TimePickerField label="Entrada" value={clockIn} onChange={(value) => setClockIn(value || '')} />
            <TimePickerField label="Salida" value={clockOut} onChange={(value) => setClockOut(value || '')} />
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

          <Button variant="contained" color="error" size="large" startIcon={<SendIcon />} disabled={!valid || busy} onClick={send}>
            Registrar asistencia
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
