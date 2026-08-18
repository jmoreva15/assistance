import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, Paper, Stack, TextField, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';

const COLORES = [
  [/\bERROR\b|\bFALLO\b|SIN CONFIRMAR/, 'error.main'],
  [/\bOK\b|CONFIRMADOS/, 'success.main'],
  [/CAMBIO|BORRADO|REGISTRO VACIADO/, 'warning.main'],
  [/ENVIO SOLICITADO|DIAS GENERADOS|\bFIN\b|a enviar/, 'text.primary'],
  [/GUARDADO|DATOS|INICIO/, 'info.main'],
];
const colorDe = (linea) => COLORES.find(([re]) => re.test(linea))?.[1] || 'text.secondary';

/**
 * Registro propio de este navegador, siempre visible. Se alimenta de las lineas
 * de tus propios envios: no hay registro compartido con otros usuarios.
 */
export default function PanelRegistro({ registro, activo, destacado, alLimpiar, contenedorRef }) {
  const [filtro, setFiltro] = useState('');
  const caja = useRef(null);
  const tema = useTheme();
  const movil = useMediaQuery(tema.breakpoints.down('sm'));

  useEffect(() => {
    if (activo && caja.current) caja.current.scrollTop = caja.current.scrollHeight;
  }, [registro, activo]);

  const visibles = useMemo(
    () => (filtro ? registro.filter((l) => l.toLowerCase().includes(filtro.toLowerCase())) : registro),
    [registro, filtro],
  );

  return (
    <Paper
      ref={contenedorRef}
      variant="outlined"
      sx={{
        transition: 'box-shadow 220ms, border-color 220ms',
        ...(destacado && { borderColor: 'error.main', boxShadow: (t) => `0 0 0 3px ${t.palette.error.main}33` }),
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1, sm: 2 }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider' }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography variant="h6">Mi registro</Typography>
          {activo ? (
            <Chip color="error" label="ENVIO EN CURSO" icon={<CircularProgress size={11} color="inherit" sx={{ ml: 1 }} />} />
          ) : (
            <Chip variant="outlined" label={`${registro.length} lineas`} />
          )}
          <Box sx={{ flex: 1 }} />
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
          <Button
            startIcon={<DeleteSweepIcon />}
            onClick={alLimpiar}
            disabled={!registro.length || activo}
            sx={{ height: 40, flexShrink: 0 }}
          >
            Limpiar
          </Button>
        </Stack>
      </Stack>

      <Box
        ref={caja}
        sx={{
          bgcolor: 'background.default', height: { xs: 200, sm: 260 }, overflow: 'auto', p: 1.5,
          fontFamily: 'ui-monospace, Menlo, monospace', fontSize: { xs: 10.5, sm: 11.5 }, lineHeight: 1.7,
        }}
      >
        {visibles.length === 0 && (
          <Typography variant="caption" color="text.secondary">
            {registro.length ? 'Nada coincide con el filtro.' : 'Todavia no enviaste nada desde este navegador.'}
          </Typography>
        )}
        {visibles.map((l, i) => (
          <Box key={i} sx={{ color: colorDe(l), whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {l}
          </Box>
        ))}
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1.5, py: 0.75, borderTop: 1, borderColor: 'divider' }}>
        Guardado en este navegador · {filtro ? `${visibles.length} de ${registro.length} lineas` : `${registro.length} lineas`}
      </Typography>
    </Paper>
  );
}
