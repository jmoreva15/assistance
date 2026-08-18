import React, { useRef, useState } from 'react';
import {
  Alert, Box, Button, Container, Divider, Paper, Stack, TextField, Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { VACIO, importar } from './almacen.js';

/** Primera vez en este navegador: no hay nada en localStorage. */
export default function Bienvenida({ alEmpezar, alFallar }) {
  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [ingresoA, setIngresoA] = useState('9:00 AM');
  const [ingresoB, setIngresoB] = useState('9:10 AM');
  const [salidaA, setSalidaA] = useState('6:00 PM');
  const [salidaB, setSalidaB] = useState('6:15 PM');
  const archivo = useRef(null);

  const dniOk = /^\d{8}$/.test(dni);
  const urlOk = /^https:\/\/docs\.google\.com\/forms\/.+/.test(formUrl.trim());
  const listo = nombre.trim() && dniOk && urlOk;

  const empezar = () =>
    alEmpezar({
      ...VACIO,
      formUrl: formUrl.trim(),
      constantes: { 'NOMBRE COMPLETO': nombre.trim().toUpperCase(), DNI: dni },
      rangos: { ingreso: [ingresoA, ingresoB], salida: [salidaA, salidaB] },
      patron: { ingreso: `${ingresoA} a ${ingresoB}`, salida: `${salidaA} a ${salidaB}`, jornada: 'lunes a viernes' },
    });

  const subir = (evento) => {
    const f = evento.target.files?.[0];
    if (!f) return;
    const lector = new FileReader();
    lector.onload = () => {
      try {
        alEmpezar(importar(JSON.parse(String(lector.result))));
      } catch (e) {
        alFallar(`No pude importar el archivo: ${e.message}`);
      }
    };
    lector.readAsText(f);
    evento.target.value = '';
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h5" gutterBottom>
        Control de Asistencia
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Este navegador no tiene datos guardados. Configura los tuyos o importa un archivo exportado antes.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Empezar de cero
        </Typography>
        <Stack spacing={2.5} sx={{ mt: 2 }}>
          <TextField
            label="Nombre completo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value.toUpperCase())}
            fullWidth
          />
          <TextField
            label="DNI"
            value={dni}
            onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
            error={dni.length > 0 && !dniOk}
            helperText={dni.length > 0 && !dniOk ? '8 digitos' : ' '}
            fullWidth
          />
          <TextField
            label="URL del formulario"
            value={formUrl}
            onChange={(e) => setFormUrl(e.target.value)}
            placeholder="https://docs.google.com/forms/d/e/…/viewform"
            error={formUrl.length > 0 && !urlOk}
            helperText={formUrl.length > 0 && !urlOk ? 'debe ser un enlace de Formularios de Google' : 'el enlace que termina en /viewform'}
            fullWidth
          />

          <Divider />
          <Typography variant="body2" color="text.secondary">
            Tu horario habitual. Las horas de cada dia se generan al azar dentro de estos rangos.
          </Typography>
          <Stack direction="row" spacing={2}>
            <TextField label="Ingreso desde" value={ingresoA} onChange={(e) => setIngresoA(e.target.value)} fullWidth />
            <TextField label="Ingreso hasta" value={ingresoB} onChange={(e) => setIngresoB(e.target.value)} fullWidth />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField label="Salida desde" value={salidaA} onChange={(e) => setSalidaA(e.target.value)} fullWidth />
            <TextField label="Salida hasta" value={salidaB} onChange={(e) => setSalidaB(e.target.value)} fullWidth />
          </Stack>

          <Box>
            <Button variant="contained" onClick={empezar} disabled={!listo}>
              Empezar
            </Button>
          </Box>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="h6" gutterBottom>
          Ya tengo mis datos
        </Typography>
        <Alert severity="info" sx={{ my: 1.5 }}>
          Importa el archivo que descargaste con «Descargar mis datos». Recupera tu nombre, DNI, patron,
          dias y el historial de lo ya enviado.
        </Alert>
        <input ref={archivo} type="file" accept="application/json,.json" hidden onChange={subir} />
        <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => archivo.current?.click()}>
          Importar archivo JSON
        </Button>
      </Paper>
    </Container>
  );
}
