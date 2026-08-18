import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, IconButton, InputAdornment, Stack, TextField, Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { enmascarar } from '../api.js';

const ES_FORMULARIO = /^https:\/\/docs\.google\.com\/forms\/.+/;

/** Nombre, DNI y formulario: lo que se envia en cada registro. */
export default function SeccionConfiguracion({ datos, acciones }) {
  const [nombre, setNombre] = useState(datos.constantes['NOMBRE COMPLETO'] || '');
  const [dni, setDni] = useState(datos.constantes.DNI || '');
  const [formUrl, setFormUrl] = useState(datos.formUrl || '');
  const [verDni, setVerDni] = useState(false);

  useEffect(() => {
    setNombre(datos.constantes['NOMBRE COMPLETO'] || '');
    setDni(datos.constantes.DNI || '');
    setFormUrl(datos.formUrl || '');
  }, [datos.constantes, datos.formUrl]);

  const dniOk = /^\d{8}$/.test(dni);
  const urlOk = ES_FORMULARIO.test(formUrl.trim());
  const sucio =
    nombre !== (datos.constantes['NOMBRE COMPLETO'] || '') ||
    dni !== (datos.constantes.DNI || '') ||
    formUrl.trim() !== (datos.formUrl || '');
  const valido = !!nombre.trim() && dniOk && urlOk;

  return (
    <Stack spacing={2.5}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">Configuracion</Typography>
          <Typography variant="caption" color="text.secondary">
            Se envia en todos los registros. Solo se guarda en este navegador.
          </Typography>

          <Stack spacing={3} sx={{ mt: 3 }}>
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
              fullWidth
              error={dni.length > 0 && !dniOk}
              helperText={dni.length > 0 && !dniOk ? '8 digitos' : ' '}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setVerDni((v) => !v)} aria-label={verDni ? 'ocultar DNI' : 'mostrar DNI'}>
                      {verDni ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="URL del formulario"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              fullWidth
              error={formUrl.length > 0 && !urlOk}
              helperText={formUrl.length > 0 && !urlOk ? 'debe ser un enlace de Formularios de Google' : 'el enlace que termina en /viewform'}
              InputProps={{
                endAdornment: urlOk ? (
                  <InputAdornment position="end">
                    <IconButton size="small" component="a" href={formUrl} target="_blank" rel="noreferrer" aria-label="abrir el formulario">
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />

            <Stack direction="row" alignItems="center">
              <Box sx={{ flex: 1 }} />
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={!sucio || !valido}
                onClick={() => acciones.guardarConfiguracion({ constantes: { 'NOMBRE COMPLETO': nombre.trim(), DNI: dni }, formUrl: formUrl.trim() })}
              >
                {sucio ? 'Guardar cambios' : 'Sin cambios'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Alert severity="info" variant="outlined">
        Todo vive en el localStorage de este navegador. Si borras los datos del sitio, se pierde.
      </Alert>
    </Stack>
  );
}
