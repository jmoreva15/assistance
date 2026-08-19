'use client';

import { useEffect, useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography,
  useMediaQuery, useTheme,
} from '@mui/material';
import { TimeField } from './fields.jsx';
import { formatLongDate } from '../lib/domain/time.js';
import { timeNotice, validateTimeFormat } from '../lib/domain/records.js';

export default function EditDayDialog({ open, record, onClose, onSave }) {
  const mobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const [clockIn, setClockIn] = useState('');
  const [clockOut, setClockOut] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open || !record) return;
    setClockIn(record.clockIn ?? '');
    setClockOut(record.clockOut ?? '');
    setNote(record.note ?? '');
  }, [open, record]);

  const rejection = validateTimeFormat({ clockIn, clockOut });
  const notice = timeNotice({ clockIn, clockOut });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth fullScreen={mobile}>
      <DialogTitle>Corregir horas</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textTransform: 'capitalize' }}>
          {record ? formatLongDate(record.date) : ''}
        </Typography>
        <Stack spacing={3}>
          <Stack direction="row" spacing={2}>
            <TimeField label="Entrada" value={clockIn} onChange={(value) => setClockIn(value || '')} />
            <TimeField label="Salida" value={clockOut} onChange={(value) => setClockOut(value || '')} />
          </Stack>
          <TextField
            label="Observacion"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
          {rejection && <Alert severity="error">{rejection}</Alert>}
          {!rejection && notice && <Alert severity="info">{notice}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disabled={!!rejection} onClick={() => onSave({ clockIn, clockOut, note })}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
