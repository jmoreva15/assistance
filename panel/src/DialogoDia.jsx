import React, { useEffect, useState } from 'react';
import {
  Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, Stack, TextField, Typography, useMediaQuery, useTheme } from '@mui/material';

const VACIO = { fecha: '', ingreso: '', salida: '', observacion: '', motivo: '', omitir: false };

/** Edicion de un dia. Guarda en localStorage a traves de App. */
export default function DialogoDia({ abierto, diaEditado, alCerrar, alGuardarLocal }) {
  const [campos, setCampos] = useState(VACIO);
  const movil = useMediaQuery(useTheme().breakpoints.down('sm'));

  useEffect(() => {
    if (abierto && diaEditado) setCampos({ ...VACIO, ...diaEditado, omitir: !!diaEditado.omitir });
  }, [abierto, diaEditado]);

  const set = (campo) => (e) =>
    setCampos((c) => ({ ...c, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const invalido = !campos.ingreso.trim() || !campos.salida.trim();

  return (
    <Dialog open={abierto} onClose={alCerrar} maxWidth="xs" fullWidth fullScreen={movil}>
      <DialogTitle>Editar {campos.fecha}</DialogTitle>
      <DialogContent sx={{ pt: 3.5 }}>
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={2}>
            <TextField label="Ingreso" value={campos.ingreso} onChange={set('ingreso')} placeholder="9:20 AM" fullWidth />
            <TextField label="Salida" value={campos.salida} onChange={set('salida')} placeholder="6:25 PM" fullWidth />
          </Stack>
          <TextField
            label="Observacion"
            value={campos.observacion}
            onChange={set('observacion')}
            fullWidth
            helperText="Se envia en el campo OBSERVACION del formulario"
          />
          <TextField
            label="Motivo"
            value={campos.motivo}
            onChange={set('motivo')}
            fullWidth
            helperText="Nota interna tuya: nunca se envia (ej. presencial)"
          />
          <FormControlLabel
            control={<Checkbox size="small" checked={campos.omitir} onChange={set('omitir')} />}
            label={<Typography variant="body2">No enviar este dia — trabajo presencial</Typography>}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={alCerrar}>Cancelar</Button>
        <Button variant="contained" onClick={() => alGuardarLocal(campos)} disabled={invalido}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
