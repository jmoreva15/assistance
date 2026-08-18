import React from 'react';
import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TouchAppIcon from '@mui/icons-material/TouchApp';

/**
 * Tarjeta grande de marcado. Un clic marca la hora. Cuando ya esta marcada
 * muestra la hora y deja de ser pulsable (se corrige desde el lapiz).
 */
export default function TarjetaMarcar({ etiqueta, hora, icono, alPulsar, deshabilitado, pista }) {
  const marcada = !!hora;
  const pulsable = !marcada && !deshabilitado;

  const contenido = (
    <Stack alignItems="center" spacing={0.5} sx={{ width: '100%', py: { xs: 2.5, sm: 3 }, px: 2 }}>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: marcada ? 'success.main' : 'text.secondary' }}>
        {marcada ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : icono}
        <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
          {etiqueta}
        </Typography>
      </Stack>

      <Typography
        sx={{
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: { xs: 38, sm: 46 },
          fontWeight: 400,
          lineHeight: 1.1,
          fontVariantNumeric: 'tabular-nums',
          color: marcada ? 'text.primary' : 'text.disabled',
        }}
      >
        {hora || '--:--'}
      </Typography>

      {pulsable && (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'primary.main' }}>
          <TouchAppIcon sx={{ fontSize: 15 }} />
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            TOCA PARA MARCAR
          </Typography>
        </Stack>
      )}
      {!pulsable && pista && (
        <Typography variant="caption" color="text.secondary">
          {pista}
        </Typography>
      )}
    </Stack>
  );

  if (!pulsable) {
    return <Box sx={{ flex: 1, minWidth: 0, opacity: deshabilitado && !marcada ? 0.55 : 1 }}>{contenido}</Box>;
  }

  return (
    <ButtonBase
      onClick={alPulsar}
      sx={{
        flex: 1,
        minWidth: 0,
        transition: 'background-color 160ms, transform 120ms',
        '&:hover': { bgcolor: 'action.hover' },
        '&:active': { transform: 'scale(0.985)' },
      }}
    >
      {contenido}
    </ButtonBase>
  );
}
