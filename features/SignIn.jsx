'use client';

import { useState } from 'react';
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import { DEFAULT_CLOCK_IN, DEFAULT_CLOCK_OUT } from '../lib/domain/records.js';

const IS_FORM_URL = /^https:\/\/docs\.google\.com\/forms\/.+/;

export default function SignIn({ onOpen, busy, error }) {
  const [dni, setDni] = useState('');
  const [needsAccount, setNeedsAccount] = useState(false);
  const [fullName, setFullName] = useState('');
  const [formUrl, setFormUrl] = useState('');

  const dniOk = /^\d{8}$/.test(dni);
  const urlOk = IS_FORM_URL.test(formUrl.trim());
  const canCreate = dniOk && fullName.trim() && urlOk;

  const enter = async () => {
    const result = await onOpen({ dni });
    if (!result) setNeedsAccount(true);
  };

  return (
    <Container maxWidth="xs" sx={{ py: { xs: 5, sm: 10 } }}>
      <Typography variant="h5" gutterBottom>
        Asistencia
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Entra con tu DNI y se cargan todos tus registros, desde cualquier dispositivo.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack spacing={3}>
          <TextField
            label="DNI"
            value={dni}
            onChange={(event) => setDni(event.target.value.replace(/\D/g, '').slice(0, 8))}
            error={dni.length > 0 && !dniOk}
            helperText={dni.length > 0 && !dniOk ? '8 digitos' : ' '}
            autoFocus
            fullWidth
          />

          {!needsAccount && (
            <Button variant="contained" startIcon={<LoginIcon />} disabled={!dniOk || busy} onClick={enter}>
              Entrar
            </Button>
          )}

          {needsAccount && (
            <>
              <Alert severity="info">Ese DNI no tiene cuenta todavia. Completa estos datos para crearla.</Alert>
              <TextField
                label="Nombre completo"
                value={fullName}
                onChange={(event) => setFullName(event.target.value.toUpperCase())}
                fullWidth
              />
              <TextField
                label="URL del formulario"
                value={formUrl}
                onChange={(event) => setFormUrl(event.target.value)}
                error={formUrl.length > 0 && !urlOk}
                helperText={formUrl.length > 0 && !urlOk ? 'debe ser un enlace de Formularios de Google' : 'el enlace que termina en /viewform'}
                fullWidth
              />
              <Typography variant="caption" color="text.secondary">
                Las jornadas se generan con {DEFAULT_CLOCK_IN} a {DEFAULT_CLOCK_OUT} y se pueden corregir una por una.
              </Typography>
              <Box>
                <Button
                  variant="contained"
                  disabled={!canCreate || busy}
                  onClick={() => onOpen({ dni, fullName, formUrl })}
                >
                  Crear cuenta y entrar
                </Button>
              </Box>
            </>
          )}

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </Paper>
    </Container>
  );
}
