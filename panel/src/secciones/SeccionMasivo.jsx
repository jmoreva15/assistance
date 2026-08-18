import React, { useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, IconButton, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography,
  useMediaQuery, useTheme,
} from '@mui/material';
import AutoAwesomeMotionIcon from '@mui/icons-material/AutoAwesomeMotion';
import EditIcon from '@mui/icons-material/Edit';
import SendIcon from '@mui/icons-material/Send';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { CampoFecha } from '../componentes/campos.jsx';
import { diasHabilesEntre, duracionTexto, fechaCorta, hoyISO, minutosTrabajados, sumarDias } from '../dominio/horas.js';
import {
  ENTRADA_POR_DEFECTO, ETIQUETA_ESTADO, SALIDA_POR_DEFECTO, esEnviable, estadoDe,
} from '../dominio/registros.js';

const COLOR_ESTADO = { pendiente: 'default', incompleto: 'warning', listo: 'primary', enviado: 'success' };

/**
 * Generacion por intervalo. Independiente de la jornada de hoy: aca solo se
 * generan dias ANTERIORES. La lista empieza vacia y se llena con lo que produce
 * «Generar»; ese lote es lo unico que se ve y lo unico que se envia.
 */
export default function SeccionMasivo({ datos, acciones, enviando, alEditar }) {
  const ayer = sumarDias(hoyISO(), -1);
  const movil = useMediaQuery(useTheme().breakpoints.down('md'));
  const [desde, setDesde] = useState(() => sumarDias(ayer, -6));
  const [hasta, setHasta] = useState(ayer);
  const [lote, setLote] = useState([]);
  const [seleccion, setSeleccion] = useState(() => new Set());

  const rangoOk = desde && hasta && desde <= hasta && hasta <= ayer;
  const cuantosHabiles = rangoOk ? diasHabilesEntre(desde, hasta).length : 0;

  const generar = async () => {
    const r = await acciones.generarRango({ desde, hasta });
    if (r?.fechas) {
      setLote(r.fechas);
      setSeleccion(new Set(r.fechas));
    }
  };

  const limpiarLote = () => {
    setLote([]);
    setSeleccion(new Set());
  };

  const alternar = (fecha) =>
    setSeleccion((prev) => {
      const s = new Set(prev);
      s.has(fecha) ? s.delete(fecha) : s.add(fecha);
      return s;
    });

  const filas = lote
    .map((f) => datos.registros[f])
    .filter(Boolean)
    .map((r) => ({ r, estado: estadoDe(r), puede: esEnviable(r) }));
  const enviablesDelLote = filas.filter((f) => f.puede).map((f) => f.r.fecha);

  return (
    <Stack spacing={2.5}>
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center">
            <AutoAwesomeMotionIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="h6">Generar varios dias</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Dias de lunes a viernes con {ENTRADA_POR_DEFECTO} a {SALIDA_POR_DEFECTO}. Solo fechas anteriores a hoy.
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2.5 }} alignItems={{ sm: 'flex-start' }}>
            <CampoFecha etiqueta="Desde" valor={desde} alCambiar={setDesde} maxima={ayer} />
            <CampoFecha
              etiqueta="Hasta"
              valor={hasta}
              alCambiar={setHasta}
              maxima={ayer}
              minima={desde}
              ayuda={rangoOk ? `${cuantosHabiles} dia(s) de lunes a viernes` : ' '}
            />
            <Button
              variant="contained"
              startIcon={<AutoAwesomeMotionIcon />}
              onClick={generar}
              disabled={!rangoOk || !cuantosHabiles}
              sx={{ height: 40, flexShrink: 0, minWidth: 130 }}
            >
              Generar
            </Button>
          </Stack>

          {desde && hasta && desde > hasta && (
            <Alert severity="error" sx={{ mt: 2 }}>La fecha inicial es posterior a la final.</Alert>
          )}
          {hasta && hasta > ayer && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Solo se pueden generar dias anteriores a hoy. El maximo es {fechaCorta(ayer)}.
            </Alert>
          )}
        </CardContent>
      </Card>

      {lote.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 5, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Elige un intervalo y dale a <strong>Generar</strong>.
          </Typography>
        </Paper>
      ) : (
        <Box>
          <Paper variant="outlined" sx={{ px: 1.5, py: 1, borderBottom: { md: 0 }, mb: { xs: 1.5, md: 0 } }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h6" sx={{ mr: 1 }}>
                Generados ({lote.length})
              </Typography>
              <Button startIcon={<DoneAllIcon />} onClick={() => setSeleccion(new Set(enviablesDelLote))} disabled={!enviablesDelLote.length}>
                Todos ({enviablesDelLote.length})
              </Button>
              <Button startIcon={<RestartAltIcon />} onClick={limpiarLote}>
                Vaciar lista
              </Button>
              <Box sx={{ flex: 1 }} />
              <Button
                variant="contained"
                color="error"
                startIcon={<SendIcon />}
                disabled={!seleccion.size || enviando}
                onClick={() => acciones.enviar([...seleccion])}
              >
                Enviar {seleccion.size ? `(${seleccion.size})` : ''}
              </Button>
            </Stack>
          </Paper>

          {movil ? (
            <Stack>
              {filas.map(({ r, estado, puede }) => (
                <Paper key={r.fecha} variant="outlined" sx={{ p: 1.5, mt: '-1px' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Checkbox size="small" checked={seleccion.has(r.fecha)} disabled={!puede} onChange={() => alternar(r.fecha)} sx={{ p: 0.5 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700 }}>
                        {fechaCorta(r.fecha)}{' '}
                        <Typography component="span" variant="caption" color="text.secondary">{r.dia}</Typography>
                      </Typography>
                      <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {r.entrada} → {r.salida} · {duracionTexto(minutosTrabajados(r.entrada, r.salida))}
                      </Typography>
                    </Box>
                    <Stack alignItems="flex-end" spacing={0.5}>
                      <Chip label={ETIQUETA_ESTADO[estado]} color={COLOR_ESTADO[estado]} variant="outlined" />
                      <IconButton size="small" onClick={() => alEditar(r)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" />
                    <TableCell>Fecha</TableCell>
                    <TableCell>Dia</TableCell>
                    <TableCell align="right">Entrada</TableCell>
                    <TableCell align="right">Salida</TableCell>
                    <TableCell align="right">Jornada</TableCell>
                    <TableCell>Observacion</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filas.map(({ r, estado, puede }) => (
                    <TableRow key={r.fecha} hover sx={{ opacity: puede ? 1 : 0.7 }}>
                      <TableCell padding="checkbox">
                        <Checkbox size="small" checked={seleccion.has(r.fecha)} disabled={!puede} onChange={() => alternar(r.fecha)} />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{fechaCorta(r.fecha)}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{r.dia}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{r.entrada}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{r.salida}</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                        {duracionTexto(minutosTrabajados(r.entrada, r.salida))}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 180 }}>
                        <Typography variant="body2" noWrap title={r.observacion}>
                          {r.observacion || <Box component="span" sx={{ color: 'text.disabled' }}>—</Box>}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={ETIQUETA_ESTADO[estado]} color={COLOR_ESTADO[estado]} variant="outlined" />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="corregir este dia">
                          <IconButton size="small" onClick={() => alEditar(r)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}
    </Stack>
  );
}
