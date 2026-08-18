import React, { useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, Divider, Stack, TextField, Typography,
} from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { CampoFecha, CampoHora } from '../componentes/campos.jsx';
import { duracionTexto, esFinDeSemana, fechaLarga, hoyISO, minutosTrabajados, normalizarHora, sumarDias } from '../dominio/horas.js';
import { ENTRADA_POR_DEFECTO, SALIDA_POR_DEFECTO, notaSobreHoras, validarFormato } from '../dominio/registros.js';

/**
 * Un dia suelto que se olvido marcar. Tiene su propio almacen (`unDia`): al
 * guardar se sobreescribe, se puede borrar, y al enviarlo pasa al historial.
 */
export default function SeccionOlvidado({ datos, acciones, enviando }) {
  const hoy = hoyISO();
  const guardado = datos.unDia;
  const [fecha, setFecha] = useState(() => sumarDias(hoy, -1));
  const [entrada, setEntrada] = useState(ENTRADA_POR_DEFECTO);
  const [salida, setSalida] = useState(SALIDA_POR_DEFECTO);
  const [observacion, setObservacion] = useState('');

  const rechazoHoras = validarFormato({ entrada, salida });
  const notaHoras = notaSobreHoras({ entrada, salida });

  const problemaFecha = useMemo(() => {
    if (!fecha) return 'elige una fecha';
    if (fecha > hoy) return 'esa fecha todavia no ocurrio';
    if (datos.enviados[fecha]) return 'ese dia ya esta en el historial de enviados';
    return null;
  }, [fecha, hoy, datos.enviados]);

  const valido = !problemaFecha && !rechazoHoras && !!normalizarHora(entrada) && !!normalizarHora(salida);

  const guardarDia = () => acciones.guardarUnDia({ fecha, entrada, salida, observacion });
  const guardarYEnviar = async () => {
    const r = await guardarDia();
    if (r?.ok) acciones.enviar([{ fecha, dia: null, entrada: normalizarHora(entrada), salida: normalizarHora(salida), observacion }]);
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

          <Stack spacing={3} sx={{ mt: 3 }}>
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
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip variant="outlined" label={`${ENTRADA_POR_DEFECTO} → ${SALIDA_POR_DEFECTO}`} />
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
              <Alert severity="warning">{fechaLarga(fecha)} cae en fin de semana.</Alert>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button startIcon={<SaveIcon />} disabled={!valido} onClick={guardarDia}>
                Solo guardar
              </Button>
              <Box sx={{ flex: 1 }} />
              <Button variant="contained" color="error" startIcon={<SendIcon />} disabled={!valido || enviando} onClick={guardarYEnviar}>
                Guardar y enviar
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {guardado && (
        <Card variant="outlined">
          <CardContent sx={{ pb: 1.5 }}>
            <Typography variant="h6">Guardado sin enviar</Typography>
          </CardContent>
          <Divider />
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, textTransform: 'capitalize' }}>{fechaLarga(guardado.fecha)}</Typography>
                <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {guardado.entrada} → {guardado.salida} · {duracionTexto(minutosTrabajados(guardado.entrada, guardado.salida))}
                </Typography>
                {guardado.observacion && (
                  <Typography variant="caption" color="text.secondary">{guardado.observacion}</Typography>
                )}
              </Box>
              <Button startIcon={<DeleteOutlineIcon />} onClick={acciones.borrarUnDia}>
                Borrar
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<SendIcon />}
                disabled={enviando}
                onClick={() => acciones.enviar([guardado])}
              >
                Enviar
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
