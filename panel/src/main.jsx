import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import useMediaQuery from '@mui/material/useMediaQuery';
import App from './App.jsx';
import { crearTema } from './tema.js';

function Raiz() {
  const oscuro = useMediaQuery('(prefers-color-scheme: dark)');
  const tema = React.useMemo(() => crearTema(oscuro ? 'dark' : 'light'), [oscuro]);
  return (
    <ThemeProvider theme={tema}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
}

createRoot(document.getElementById('raiz')).render(<Raiz />);
