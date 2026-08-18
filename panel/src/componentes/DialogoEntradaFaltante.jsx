import React, { useEffect, useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack,
  Typography, useMediaQuery, useTheme,
} from '@mui/material';
import { CampoHora } from './campos.jsx';
import { horaAhora, normalizarHora } from '../dominio/horas.js';
import { ENTRADA_POR_DEFECTO, notaSobreHoras, validarFormato } from '../dominio/registros.js';

/** Se marco la salida sin haber marcado la entrada: hay que pedirla. */
export default function DialogoEntradaFaltante({ abierto, alCerrar, alConfirmar }) {
  const movil = useMediaQuery(useTheme().breakpoints.down('sm'));
  const [entrada, setEntrada] = useState(ENTRADA_POR_DEFECTO);
  const ahora = horaAhora();

  useEffect(() => {
    if (abierto) setEntrada(ENTRADA_POR_DEFECTO);
  }, [abierto]);

  const rechazo = validarFormato({ entrada });
  const nota = notaSobreHoras({ entrada, salida: ahora });
  const valido = !!normalizarHora(entrada) && !rechazo;

  return (
    <Dialog open={abierto} onClose={alCerrar} maxWidth="xs" fullWidth fullScreen={movil}>
      <DialogTitle sx={{ textTransform: 'none' }}>¿A que hora entraste?</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5}>
          <Typography variant="body2" color="text.secondary">
            No habias marcado la entrada de hoy. Ponla y guardamos las dos horas: la salida se registra
            ahora mismo, a las <strong>{ahora}</strong>.
          </Typography>
          <CampoHora
            etiqueta="Hora de entrada"
            valor={entrada}
            alCambiar={(v) => setEntrada(v || '')}
            error={rechazo}
            ayuda="Por defecto 09:00"
          />
          {valido && (
            <Alert severity="info">
              Se guardara: entrada {normalizarHora(entrada)} → salida {ahora}.
              {nota ? ` ${nota}` : ''}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={alCerrar}>Cancelar</Button>
        <Button variant="contained" disabled={!valido} onClick={() => alConfirmar(entrada)}>
          Guardar jornada
        </Button>
      </DialogActions>
    </Dialog>
  );
}
