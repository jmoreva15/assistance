import React, { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { enmascarar } from './api.js';

/** Nombre y DNI: se envian en cada registro. Viven en localStorage. */
export default function Identidad({ constantes, alGuardarLocal }) {
  const [nombre, setNombre] = useState(constantes['NOMBRE COMPLETO'] || '');
  const [dni, setDni] = useState(constantes.DNI || '');
  const [verDni, setVerDni] = useState(false);

  useEffect(() => {
    setNombre(constantes['NOMBRE COMPLETO'] || '');
    setDni(constantes.DNI || '');
  }, [constantes]);

  const sucio = nombre !== (constantes['NOMBRE COMPLETO'] || '') || dni !== (constantes.DNI || '');
  const dniOk = /^\d{8}$/.test(dni);

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6">Tus datos</Typography>
        <Typography variant="caption" color="text.secondary">
          Se envian en todos los registros. Se guardan solo en este navegador.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }} alignItems="flex-start">
          <TextField
            label="Nombre completo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value.toUpperCase())}
            fullWidth
            error={!nombre.trim()}
            helperText={!nombre.trim() ? 'obligatorio' : ' '}
          />
          <TextField
            label="DNI"
            value={verDni ? dni : enmascarar(dni)}
            onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
            onFocus={() => setVerDni(true)}
            sx={{ minWidth: 160 }}
            error={dni.length > 0 && !dniOk}
            helperText={dni.length > 0 && !dniOk ? '8 digitos' : ' '}
            InputProps={{
              endAdornment: (
                <Box
                  component="button"
                  type="button"
                  onClick={() => setVerDni((v) => !v)}
                  aria-label={verDni ? 'ocultar DNI' : 'mostrar DNI'}
                  sx={{ border: 0, background: 'none', cursor: 'pointer', color: 'text.secondary', display: 'flex', p: 0 }}
                >
                  {verDni ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                </Box>
              ),
            }}
          />
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!sucio || !nombre.trim() || !dniOk}
            onClick={() => alGuardarLocal({ 'NOMBRE COMPLETO': nombre.trim(), DNI: dni })}
            sx={{ height: 40, flexShrink: 0 }}
          >
            Guardar
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
