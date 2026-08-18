import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, Paper, Stack, TextField, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';

const COLORES = [
  [/\bERROR\b|\bFALLO\b|SIN CONFIRMAR/, 'error.main'],
  [/\bOK\b|CONFIRMADOS/, 'success.main'],
  [/EDICION|BITACORA VACIADA|RESPETADOS/, 'warning.main'],
  [/ENTRADA|SALIDA/, 'primary.main'],
  [/GENERADOS|ENVIO SOLICITADO|\bFIN\b|a enviar/, 'text.primary'],
];
const colorDe = (l) => COLORES.find(([re]) => re.test(l))?.[1] || 'text.secondary';

/**
 * Bitacora de este navegador, siempre visible. Registra cada accion (marcar,
 * editar, generar, enviar) y las lineas que devuelve el servidor de mis envios.
 */
export default function PanelRegistro({ bitacora, activo, alLimpiar }) {
  const [filtro, setFiltro] = useState('');
  const caja = useRef(null);
  const movil = useMediaQuery(useTheme().breakpoints.down('sm'));

  useEffect(() => {
    if (caja.current) caja.current.scrollTop = caja.current.scrollHeight;
  }, [bitacora]);

  const visibles = useMemo(
    () => (filtro ? bitacora.filter((l) => l.toLowerCase().includes(filtro.toLowerCase())) : bitacora),
    [bitacora, filtro],
  );

  return (
    <Paper
      variant="outlined"
      sx={{
        transition: 'box-shadow 220ms, border-color 220ms',
        ...(activo && { borderColor: 'error.main', boxShadow: (t) => `0 0 0 3px ${t.palette.error.main}22` }),
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1, sm: 2 }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider' }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography variant="h6">Bitacora</Typography>
          {activo ? (
            <Chip color="error" label="ENVIO EN CURSO" icon={<CircularProgress size={11} color="inherit" sx={{ ml: 1 }} />} />
          ) : (
            <Chip variant="outlined" label={`${bitacora.length} lineas`} />
          )}
        </Stack>
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            label="Filtrar"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="OK, ERROR, una fecha…"
            sx={{ width: movil ? '100%' : 220 }}
            fullWidth={movil}
          />
          <Button startIcon={<DeleteSweepIcon />} onClick={alLimpiar} disabled={!bitacora.length || activo} sx={{ height: 40, flexShrink: 0 }}>
            Limpiar
          </Button>
        </Stack>
      </Stack>

      <Box
        ref={caja}
        sx={{
          bgcolor: 'background.default', height: { xs: 170, sm: 220 }, overflow: 'auto', p: 1.5,
          fontFamily: 'ui-monospace, Menlo, monospace', fontSize: { xs: 10.5, sm: 11.5 }, lineHeight: 1.7,
        }}
      >
        {visibles.length === 0 && (
          <Typography variant="caption" color="text.secondary">
            {bitacora.length ? 'Nada coincide con el filtro.' : 'Todavia no hay actividad registrada.'}
          </Typography>
        )}
        {visibles.map((l, i) => (
          <Box key={i} sx={{ color: colorDe(l), whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {l}
          </Box>
        ))}
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1.5, py: 0.75, borderTop: 1, borderColor: 'divider' }}>
        Guardada en este navegador · {filtro ? `${visibles.length} de ${bitacora.length} lineas` : `${bitacora.length} lineas`}
      </Typography>
    </Paper>
  );
}
