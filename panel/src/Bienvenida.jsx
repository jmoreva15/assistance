import React, { useRef, useState } from 'react';
import {
  Alert, Box, Button, Container, Divider, Paper, Stack, TextField, Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { ESTADO_VACIO } from './datos/repositorio.js';
import { desdeArchivo } from './datos/portable.js';
import { normalizarHora } from './dominio/horas.js';

/** Primera vez en este navegador: no hay nada en localStorage. */
export default function Bienvenida({ alEmpezar, alFallar }) {
  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [entrada, setEntrada] = useState('09:00');
  const [salida, setSalida] = useState('18:00');
  const archivo = useRef(null);

  const dniOk = /^\d{8}$/.test(dni);
  const urlOk = /^https:\/\/docs\.google\.com\/forms\/.+/.test(formUrl.trim());
  const horasOk = !!normalizarHora(entrada) && !!normalizarHora(salida);
  const listo = nombre.trim() && dniOk && urlOk && horasOk;

  const empezar = () =>
    alEmpezar({
      ...ESTADO_VACIO,
      formUrl: formUrl.trim(),
      constantes: { 'NOMBRE COMPLETO': nombre.trim().toUpperCase(), DNI: dni },
      horario: { entrada: normalizarHora(entrada), salida: normalizarHora(salida) },
    });

  const subir = (evento) => {
    const f = evento.target.files?.[0];
    if (!f) return;
    const lector = new FileReader();
    lector.onload = () => {
      try {
        alEmpezar(desdeArchivo(JSON.parse(String(lector.result))));
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
            Tu horario habitual. Se usa para generar dias en el envio masivo; siempre podes corregir un dia
            concreto despues.
          </Typography>
          <Stack direction="row" spacing={2}>
            <TextField label="Entrada" value={entrada} onChange={(e) => setEntrada(e.target.value)} placeholder="09:00" fullWidth />
            <TextField label="Salida" value={salida} onChange={(e) => setSalida(e.target.value)} placeholder="18:00" fullWidth />
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
