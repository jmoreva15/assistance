import React, { useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, Stack, TextField, Typography,
} from '@mui/material';
import { CampoFecha, CampoHora } from '../componentes/campos.jsx';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';
import { esFinDeSemana, fechaLarga, hoyISO, normalizarHora, sumarDias } from '../dominio/horas.js';
import {
  ENTRADA_POR_DEFECTO, ESTADOS, ETIQUETA_ESTADO, SALIDA_POR_DEFECTO, estadoDe, notaSobreHoras, validarFormato,
} from '../dominio/registros.js';

/** Seccion para cargar un dia suelto que se olvido marcar, y enviarlo ahi mismo. */
export default function SeccionOlvidado({ datos, acciones, enviando }) {
  const hoy = hoyISO();
  const [fecha, setFecha] = useState(() => sumarDias(hoy, -1));
  const [entrada, setEntrada] = useState(ENTRADA_POR_DEFECTO);
  const [salida, setSalida] = useState(SALIDA_POR_DEFECTO);
  const [observacion, setObservacion] = useState('');

  const existente = datos.registros[fecha];
  const estadoExistente = existente ? estadoDe(existente) : null;
  const rechazoHoras = validarFormato({ entrada, salida });
  const notaHoras = notaSobreHoras({ entrada, salida });

  const problemaFecha = useMemo(() => {
    if (!fecha) return 'elige una fecha';
    if (fecha > hoy) return 'esa fecha todavia no ocurrio';
    if (estadoExistente === ESTADOS.ENVIADO) return 'ese dia ya fue enviado y no se puede modificar';
    return null;
  }, [fecha, hoy, estadoExistente]);

  const valido = !problemaFecha && !rechazoHoras && !!normalizarHora(entrada) && !!normalizarHora(salida);

  const guardar = async () => acciones.guardarDiaOlvidado({ fecha, entrada, salida, observacion });

  const guardarYEnviar = async () => {
    const r = await guardar();
    if (r?.ok) acciones.enviar([fecha]);
  };

  return (
    <Stack spacing={2.5}>
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center">
            <EventAvailableIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="h6">Se me olvido un dia</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Un dia suelto que no marcaste en su momento.
          </Typography>

          <Stack spacing={2.5} sx={{ mt: 2.5 }}>
            <CampoFecha
              etiqueta="Fecha"
              valor={fecha}
              alCambiar={setFecha}
              maxima={hoy}
              error={problemaFecha}
              ayuda={fecha ? fechaLarga(fecha) : ' '}
            />

            <Stack direction="row" spacing={2}>
              <CampoHora etiqueta="Entrada" valor={entrada} alCambiar={(v) => setEntrada(v || '')} />
              <CampoHora etiqueta="Salida" valor={salida} alCambiar={(v) => setSalida(v || '')} />
            </Stack>
            <Stack direction="row" spacing={1}>
              <Chip variant="outlined" label={`por defecto ${ENTRADA_POR_DEFECTO} → ${SALIDA_POR_DEFECTO}`} />
              <Button
                size="small"
                onClick={() => {
                  setEntrada(ENTRADA_POR_DEFECTO);
                  setSalida(SALIDA_POR_DEFECTO);
                }}
              >
                restablecer
              </Button>
            </Stack>

            <TextField
              label="Observacion (opcional)"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              multiline
              minRows={2}
              fullWidth
            />

            {rechazoHoras && <Alert severity="error">{rechazoHoras}</Alert>}
            {!rechazoHoras && notaHoras && <Alert severity="info">{notaHoras}</Alert>}
            {fecha && esFinDeSemana(fecha) && !problemaFecha && (
              <Alert severity="warning">Ojo: {fechaLarga(fecha)} cae en fin de semana.</Alert>
            )}
            {existente && estadoExistente !== ESTADOS.ENVIADO && (
              <Alert severity="warning">
                Ese dia ya existe ({existente.entrada || '--:--'} → {existente.salida || '--:--'},{' '}
                {ETIQUETA_ESTADO[estadoExistente]}). Si guardas, se reemplaza con lo que pongas aca.
              </Alert>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button startIcon={<SaveIcon />} disabled={!valido} onClick={guardar}>
                Solo guardar
              </Button>
              <Box sx={{ flex: 1 }} />
              <Button
                variant="contained"
                color="error"
                startIcon={<SendIcon />}
                disabled={!valido || enviando}
                onClick={guardarYEnviar}
              >
                Guardar y enviar
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
