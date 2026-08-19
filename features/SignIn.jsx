'use client';

import { useState } from 'react';
import { Alert, Button, Container, LinearProgress, Paper, Stack, TextField, Typography } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';

export default function SignIn({ onOpen, busy, error }) {
  const [dni, setDni] = useState('');
  const [fullName, setFullName] = useState('');
  const [askName, setAskName] = useState(null);

  const dniOk = /^\d{8}$/.test(dni);
  const nameOk = fullName.trim().length > 2;
  const ready = askName ? dniOk && nameOk : dniOk;

  const enter = async () => {
    const result = await onOpen({ dni, fullName: askName ? fullName : '' });
    if (result?.needsFullName) setAskName(result.reason);
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
            onChange={(event) => {
              setDni(event.target.value.replace(/\D/g, '').slice(0, 8));
              setAskName(null);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && ready && !busy) enter();
            }}
            error={dni.length > 0 && !dniOk}
            helperText={dni.length > 0 && !dniOk ? '8 digitos' : ' '}
            autoFocus
            fullWidth
          />

          {askName && (
            <>
              <Alert severity="warning">No pude traer tu nombre automaticamente: {askName}.</Alert>
              <TextField
                label="Nombre completo"
                value={fullName}
                onChange={(event) => setFullName(event.target.value.toUpperCase())}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && ready && !busy) enter();
                }}
                autoFocus
                fullWidth
                helperText="Como aparece en el formulario"
              />
            </>
          )}

          <Button variant="contained" startIcon={<LoginIcon />} disabled={!ready || busy} onClick={enter}>
            {busy ? 'Buscando…' : 'Entrar'}
          </Button>

          {busy && (
            <Stack spacing={1}>
              <LinearProgress />
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                {askName ? 'Creando tu cuenta…' : 'Buscando tu DNI y cargando tus registros…'}
              </Typography>
            </Stack>
          )}

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </Paper>
    </Container>
  );
}
