import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { fechaLarga, hoyISO } from '../dominio/horas.js';

/** Reloj en tiempo real. Es el elemento principal de la pantalla. */
export default function Reloj() {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const p = (n) => String(n).padStart(2, '0');

  return (
    <Box sx={{ textAlign: 'center', py: { xs: 2, sm: 3 } }}>
      <Typography
        sx={{
          textTransform: 'capitalize',
          color: 'text.secondary',
          fontSize: { xs: 13, sm: 15 },
          letterSpacing: '0.02em',
        }}
      >
        {fechaLarga(hoyISO())}
      </Typography>
      <Typography
        component="p"
        aria-live="off"
        sx={{
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: { xs: 52, sm: 76 },
          fontWeight: 300,
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
          mt: 0.5,
        }}
      >
        {p(ahora.getHours())}:{p(ahora.getMinutes())}
        <Box component="span" sx={{ fontSize: '0.45em', color: 'text.secondary', ml: 0.75 }}>
          {p(ahora.getSeconds())}
        </Box>
      </Typography>
    </Box>
  );
}
