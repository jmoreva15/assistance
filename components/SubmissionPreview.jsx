'use client';

import { Alert, Box, Chip, Paper, Stack, Typography } from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { ROLES } from '../lib/forms/field-mapping.js';
import { formatNumericDate, weekdayName } from '../lib/domain/time.js';
import { MONO } from '../lib/theme/theme.js';

const FALLBACK_FIELDS = [
  { role: ROLES.FULL_NAME, title: 'NOMBRE COMPLETO' },
  { role: ROLES.DNI, title: 'DNI' },
  { role: ROLES.DATE, title: 'FECHA' },
  { role: ROLES.CLOCK_IN, title: 'HORA DE ENTRADA' },
  { role: ROLES.CLOCK_OUT, title: 'HORA DE SALIDA' },
  { role: ROLES.NOTE, title: 'OBSERVACION' },
];

const valueFor = (role, { profile, record }) => {
  if (role === ROLES.FULL_NAME) return profile.fullName;
  if (role === ROLES.DNI) return profile.dni;
  if (role === ROLES.DATE) return `${formatNumericDate(record.date)}  (${weekdayName(record.date)})`;
  if (role === ROLES.CLOCK_IN) return record.clockIn ?? '--:--';
  if (role === ROLES.CLOCK_OUT) return record.clockOut ?? '--:--';
  if (role === ROLES.NOTE) return record.note?.trim() ? record.note.trim() : null;
  return null;
};

export default function SubmissionPreview({ profile, record, form }) {
  const fields = form?.fields?.length ? form.fields : FALLBACK_FIELDS;

  return (
    <Paper variant="outlined">
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider' }}
      >
        <FactCheckIcon sx={{ fontSize: 17, color: 'text.secondary' }} />
        <Typography variant="h6">Lo que se va a enviar</Typography>
        <Box sx={{ flex: 1 }} />
        {form?.title && <Chip variant="outlined" label={form.title} />}
      </Stack>

      <Stack divider={<Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}>
        {fields.map((field) => {
          const value = valueFor(field.role, { profile, record });
          return (
            <Stack
              key={field.role}
              direction={{ xs: 'column', sm: 'row' }}
              spacing={{ xs: 0.25, sm: 2 }}
              sx={{ px: 1.5, py: 1 }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ width: { sm: 260 }, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}
              >
                {field.title}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: MONO,
                  wordBreak: 'break-word',
                  color: value ? 'text.primary' : 'text.disabled',
                }}
              >
                {value ?? 'sin observacion'}
              </Typography>
            </Stack>
          );
        })}
      </Stack>

      {form?.problem && (
        <Alert severity="warning" sx={{ borderRadius: 0 }}>
          {form.problem}
        </Alert>
      )}
    </Paper>
  );
}
