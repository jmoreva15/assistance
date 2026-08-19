'use client';

import { useEffect, useState } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import { formatLongDate } from '../lib/domain/time.js';

export default function ObservationDialog({ open, record, onClose, onSave }) {
  const mobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open && record) setNote(record.note ?? '');
  }, [open, record]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth fullScreen={mobile}>
      <DialogTitle>Observacion</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textTransform: 'capitalize' }}>
          {record ? formatLongDate(record.date) : ''}
        </Typography>
        <TextField
          value={note}
          onChange={(event) => setNote(event.target.value)}
          multiline
          minRows={3}
          fullWidth
          autoFocus
          placeholder="Lo que quieras que llegue al formulario"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={() => onSave(note)}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
