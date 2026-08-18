import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import useMediaQuery from '@mui/material/useMediaQuery';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/es';
import App from './App.jsx';
import { crearTema } from './tema.js';

function Raiz() {
  const oscuro = useMediaQuery('(prefers-color-scheme: dark)');
  const tema = React.useMemo(() => crearTema(oscuro ? 'dark' : 'light'), [oscuro]);
  return (
    <ThemeProvider theme={tema}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
        <App />
      </LocalizationProvider>
    </ThemeProvider>
  );
}

createRoot(document.getElementById('raiz')).render(<Raiz />);
