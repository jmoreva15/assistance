import React, { useEffect, useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField,
  Typography, useMediaQuery, useTheme,
} from '@mui/material';
import { CampoHora } from './campos.jsx';
import { fechaLarga } from '../dominio/horas.js';
import { notaSobreHoras, validarFormato } from '../dominio/registros.js';

/** Correccion manual de un dia. Editar aca no impide seguir marcando en vivo. */
export default function DialogoHoras({ abierto, registro, alCerrar, alGuardar }) {
  const movil = useMediaQuery(useTheme().breakpoints.down('sm'));
  const [entrada, setEntrada] = useState('');
  const [salida, setSalida] = useState('');
  const [observacion, setObservacion] = useState('');

  useEffect(() => {
    if (!abierto || !registro) return;
    setEntrada(registro.entrada || '');
    setSalida(registro.salida || '');
    setObservacion(registro.observacion || '');
  }, [abierto, registro]);

  const rechazo = validarFormato({ entrada, salida });
  const nota = notaSobreHoras({ entrada, salida });

  return (
    <Dialog open={abierto} onClose={alCerrar} maxWidth="xs" fullWidth fullScreen={movil}>
      <DialogTitle sx={{ textTransform: 'none' }}>Corregir horas</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textTransform: 'capitalize' }}>
          {registro ? fechaLarga(registro.fecha) : ''}
        </Typography>
        <Stack spacing={3}>
          <Stack direction="row" spacing={2}>
            <CampoHora etiqueta="Entrada" valor={entrada} alCambiar={(v) => setEntrada(v || '')} />
            <CampoHora etiqueta="Salida" valor={salida} alCambiar={(v) => setSalida(v || '')} />
          </Stack>
          <TextField
            label="Observacion"
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            multiline
            minRows={2}
            fullWidth
            helperText="Se envia en el campo OBSERVACION del formulario"
          />
          {rechazo && <Alert severity="error">{rechazo}</Alert>}
          {!rechazo && nota && <Alert severity="info">{nota}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={alCerrar}>Cancelar</Button>
        <Button variant="contained" disabled={!!rechazo} onClick={() => alGuardar({ entrada, salida, observacion })}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
