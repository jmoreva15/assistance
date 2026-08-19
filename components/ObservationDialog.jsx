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

  const save = () => onSave(note.trim());

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      fullScreen={mobile}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          save();
        }
      }}
    >
      <DialogTitle>Observacion</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, textTransform: 'capitalize' }}>
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
          helperText={note ? `${note.length} caracteres` : 'Se envia en el campo OBSERVACION'}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        {record?.note && !note.trim() ? (
          <Button color="error" onClick={save}>
            Quitar observacion
          </Button>
        ) : (
          <Button variant="contained" onClick={save} disabled={note.trim() === (record?.note ?? '')}>
            Guardar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
