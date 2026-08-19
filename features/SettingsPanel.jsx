'use client';

import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Divider, IconButton, InputAdornment, Stack, TextField, Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

const IS_FORM_URL = /^https:\/\/docs\.google\.com\/forms\/.+/;
const mask = (value = '') => (value.length > 4 ? '•'.repeat(value.length - 4) + value.slice(-4) : value);

export default function SettingsPanel({ user, storage, busy, actions }) {
  const [fullName, setFullName] = useState(user.fullName);
  const [formUrl, setFormUrl] = useState(user.formUrl);
  const [showDni, setShowDni] = useState(false);

  useEffect(() => {
    setFullName(user.fullName);
    setFormUrl(user.formUrl);
  }, [user]);

  const urlOk = IS_FORM_URL.test(formUrl.trim());
  const dirty = fullName !== user.fullName || formUrl.trim() !== user.formUrl;
  const valid = !!fullName.trim() && urlOk;

  return (
    <Stack spacing={2.5}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">Configuracion</Typography>
          <Typography variant="caption" color="text.secondary">
            Se envia en todos los registros.
          </Typography>

          <Stack spacing={3} sx={{ mt: 3 }}>
            <TextField
              label="DNI"
              value={showDni ? user.dni : mask(user.dni)}
              disabled
              fullWidth
              helperText="Es tu identificador de sesion y no se puede cambiar"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowDni((value) => !value)}>
                      {showDni ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Nombre completo"
              value={fullName}
              onChange={(event) => setFullName(event.target.value.toUpperCase())}
              error={!fullName.trim()}
              helperText={!fullName.trim() ? 'obligatorio' : ' '}
              fullWidth
            />

            <TextField
              label="URL del formulario"
              value={formUrl}
              onChange={(event) => setFormUrl(event.target.value)}
              error={formUrl.length > 0 && !urlOk}
              helperText={formUrl.length > 0 && !urlOk ? 'debe ser un enlace de Formularios de Google' : 'el enlace que termina en /viewform'}
              fullWidth
              InputProps={{
                endAdornment: urlOk ? (
                  <InputAdornment position="end">
                    <IconButton size="small" component="a" href={formUrl} target="_blank" rel="noreferrer">
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />

            <Stack direction="row">
              <Box sx={{ flex: 1 }} />
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={!dirty || !valid || busy}
                onClick={() => actions.updateProfile({ fullName, formUrl: formUrl.trim() })}
              >
                {dirty ? 'Guardar cambios' : 'Sin cambios'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">Sesion</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Tus registros viven en la base de datos, no en este navegador: entra con tu DNI desde cualquier
            dispositivo y aparecen todos.
          </Typography>
          <Divider sx={{ my: 2.5 }} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <Alert severity={storage === 'supabase' ? 'success' : 'warning'} sx={{ flex: 1 }}>
              {storage === 'supabase'
                ? 'Conectado a Supabase.'
                : 'Sin Supabase configurado: los datos viven en memoria y se pierden al reiniciar el servidor.'}
            </Alert>
            <Button startIcon={<LogoutIcon />} onClick={actions.signOut}>
              Cerrar sesion
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
