import React, { useEffect, useState } from 'react';
import {
  Alert, AlertTitle, Box, Button, Card, CardContent, Divider, IconButton, LinearProgress,
  Paper, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import EditIcon from '@mui/icons-material/Edit';
import SendIcon from '@mui/icons-material/Send';
import Reloj from '../componentes/Reloj.jsx';
import TarjetaMarcar from '../componentes/TarjetaMarcar.jsx';
import DialogoEntradaFaltante from '../componentes/DialogoEntradaFaltante.jsx';
import { duracionTexto, fechaCorta, hoyISO, minutosTrabajados } from '../dominio/horas.js';
import { ESTADOS, JORNADA_MINUTOS, estadoDe, notaSobreHoras } from '../dominio/registros.js';

/** Seccion principal: el reloj y dos tarjetas que se marcan con un clic. */
export default function SeccionMarcar({ datos, acciones, incompletos, enviando, alEditar }) {
  const hoy = hoyISO();
  const registro = datos.registros[hoy] || null;
  const estado = estadoDe(registro);
  const trabajados = minutosTrabajados(registro?.entrada, registro?.salida);
  const [observacion, setObservacion] = useState(registro?.observacion || '');
  const [transcurrido, setTranscurrido] = useState(0);
  const [pidiendoEntrada, setPidiendoEntrada] = useState(false);

  useEffect(() => setObservacion(registro?.observacion || ''), [registro?.fecha, registro?.observacion]);

  useEffect(() => {
    if (!registro?.entrada || registro?.salida) return setTranscurrido(0);
    const calcular = () => {
      const [h, m] = registro.entrada.split(':').map(Number);
      const inicio = new Date();
      inicio.setHours(h, m, 0, 0);
      setTranscurrido(Math.max(0, Math.round((Date.now() - inicio.getTime()) / 60000)));
    };
    calcular();
    const id = setInterval(calcular, 30000);
    return () => clearInterval(id);
  }, [registro?.entrada, registro?.salida]);

  const faltan = JORNADA_MINUTOS - transcurrido;
  const observacionSucia = (registro?.observacion || '') !== observacion;
  const enviado = estado === ESTADOS.ENVIADO;

  /** Un toque en SALIDA sin entrada previa abre el modal para completarla. */
  const tocarSalida = async () => {
    const r = await acciones.marcarSalida();
    if (r?.faltaEntrada) setPidiendoEntrada(true);
  };

  return (
    <Stack spacing={2.5}>
      {incompletos.length > 0 && (
        <Alert severity="warning" variant="outlined">
          <AlertTitle sx={{ fontSize: 14 }}>{incompletos.length} dia(s) anteriores quedaron a medias</AlertTitle>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Les falta una hora y no se pueden enviar asi.
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {incompletos.map((r) => (
              <Button key={r.fecha} size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => alEditar(r)}>
                {fechaCorta(r.fecha)} · {r.entrada || '--:--'} → {r.salida || '--:--'}
              </Button>
            ))}
          </Stack>
        </Alert>
      )}

      <Card variant="outlined">
        <Reloj />
        <Divider />

        <Stack direction={{ xs: 'column', sm: 'row' }} divider={<Divider orientation={{ xs: 'horizontal', sm: 'vertical' }} flexItem />}>
          <TarjetaMarcar
            etiqueta="Entrada"
            hora={registro?.entrada}
            icono={<LoginIcon sx={{ fontSize: 15 }} />}
            alPulsar={acciones.marcarEntrada}
            deshabilitado={enviado}
            pista={enviado ? 'enviado' : null}
          />
          <TarjetaMarcar
            etiqueta="Salida"
            hora={registro?.salida}
            icono={<LogoutIcon sx={{ fontSize: 15 }} />}
            alPulsar={tocarSalida}
            deshabilitado={enviado}
            pista={enviado ? 'enviado' : null}
          />
        </Stack>

        {registro?.entrada && !registro?.salida && (
          <Box sx={{ px: 2, pb: 1.5 }}>
            <LinearProgress variant="determinate" value={Math.min(100, (transcurrido / JORNADA_MINUTOS) * 100)} sx={{ height: 4 }} />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, textAlign: 'center' }}>
              {faltan > 0
                ? `Llevas ${duracionTexto(transcurrido)} · faltan ${duracionTexto(faltan)} para las 8 h`
                : `Llevas ${duracionTexto(transcurrido)} · ya cumpliste las 8 h`}
            </Typography>
          </Box>
        )}

        {(registro?.entrada || registro?.salida) && !enviado && (
          <>
            <Divider />
            <Stack direction="row" justifyContent="center" sx={{ py: 0.5 }}>
              <Tooltip title="corregir las horas de hoy a mano">
                <IconButton size="small" onClick={() => alEditar(registro)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </>
        )}

        <Divider />
        <CardContent>
          {estado === ESTADOS.PENDIENTE && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              Toca <strong>ENTRADA</strong> al empezar.
            </Typography>
          )}

          {estado === ESTADOS.INCOMPLETO && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              Cuando termines, toca <strong>SALIDA</strong>.
            </Typography>
          )}


          {estado === ESTADOS.LISTO && (
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ px: 2, py: 1.25 }}>
                <Stack direction="row" spacing={1} alignItems="baseline" justifyContent="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="body2" color="text.secondary">
                    Intervalo registrado:
                  </Typography>
                  <Typography sx={{ fontFamily: 'ui-monospace, Menlo, monospace', fontVariantNumeric: 'tabular-nums' }}>
                    {registro.entrada} → {registro.salida}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    · {duracionTexto(trabajados)}
                  </Typography>
                </Stack>
                {notaSobreHoras(registro) && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}>
                    {notaSobreHoras(registro)}
                  </Typography>
                )}
              </Paper>
              <TextField
                label="Observacion (opcional)"
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                multiline
                minRows={2}
                fullWidth
                helperText="Se envia en el campo OBSERVACION del formulario"
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                {observacionSucia && (
                  <Button onClick={() => acciones.editarRegistro(hoy, { observacion })}>Guardar observacion</Button>
                )}
                <Box sx={{ flex: 1 }} />
                <Button
                  variant="contained"
                  color="error"
                  size="large"
                  startIcon={<SendIcon />}
                  disabled={enviando}
                  onClick={async () => {
                    if (observacionSucia) await acciones.editarRegistro(hoy, { observacion });
                    acciones.enviar([hoy]);
                  }}
                >
                  Enviar mi jornada
                </Button>
              </Stack>
            </Stack>
          )}

          {enviado && (
            <Alert severity="success">
              Hoy ya fue enviado y confirmado ({registro.entrada} → {registro.salida}, {duracionTexto(trabajados)}).
            </Alert>
          )}
        </CardContent>
      </Card>

      <DialogoEntradaFaltante
        abierto={pidiendoEntrada}
        alCerrar={() => setPidiendoEntrada(false)}
        alConfirmar={async (entrada) => {
          setPidiendoEntrada(false);
          await acciones.marcarSalida(entrada);
        }}
      />
    </Stack>
  );
}
