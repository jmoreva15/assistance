'use client';

import { useEffect, useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import { TimeInput } from './fields.jsx';
import { currentTime, parseTime } from '../lib/domain/time.js';
import { DEFAULT_CLOCK_IN, timeNotice, validateTimeFormat } from '../lib/domain/records.js';

export default function MissingClockInDialog({ open, onClose, onConfirm }) {
  const mobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const [clockIn, setClockIn] = useState(DEFAULT_CLOCK_IN);
  const now = currentTime();

  useEffect(() => {
    if (open) setClockIn(DEFAULT_CLOCK_IN);
  }, [open]);

  const rejection = validateTimeFormat({ clockIn });
  const notice = timeNotice({ clockIn, clockOut: now });
  const valid = !!parseTime(clockIn) && !rejection;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      fullScreen={mobile}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && valid) {
          event.preventDefault();
          onConfirm(clockIn);
        }
      }}
    >
      <DialogTitle>¿A que hora entraste?</DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            No habias marcado la entrada de hoy. La salida se registra ahora, a las <strong>{now}</strong>.
          </Typography>
          <TimeInput
            label="Hora de entrada"
            value={clockIn}
            onChange={(value) => setClockIn(value || '')}
            error={rejection}
            help={`Por defecto ${DEFAULT_CLOCK_IN}`}
          />
          {valid && (
            <Alert severity="info">
              Se guardara: entrada {parseTime(clockIn)} → salida {now}.{notice ? ` ${notice}` : ''}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disabled={!valid} onClick={() => onConfirm(clockIn)} autoFocus>
          Registrar asistencia
        </Button>
      </DialogActions>
    </Dialog>
  );
}
