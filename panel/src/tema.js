import { createTheme } from '@mui/material/styles';

/** Tema sobrio: esquinas rectas, densidad alta, bordes visibles. */
export const crearTema = (modo) => {
  const oscuro = modo === 'dark';
  const borde = oscuro ? '#333846' : '#d8dce6';
  return createTheme({
    palette: {
      mode: modo,
      primary: { main: oscuro ? '#7c8cff' : '#2f3d8f' },
      error: { main: oscuro ? '#e5484d' : '#c0272d' },
      success: { main: oscuro ? '#3dd68c' : '#0d7a52' },
      warning: { main: oscuro ? '#e0a232' : '#8a5300' },
      divider: borde,
      background: { default: oscuro ? '#0f1117' : '#f2f3f6', paper: oscuro ? '#161922' : '#ffffff' },
    },
    shape: { borderRadius: 0 },
    typography: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      h5: { fontWeight: 600, fontSize: '1.15rem', letterSpacing: '-0.01em' },
      h6: { fontWeight: 600, fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.06em' },
      body2: { fontSize: '0.8125rem' },
      caption: { fontSize: '0.75rem' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: { body: { WebkitFontSmoothing: 'antialiased' } },
      },
      MuiButton: {
        defaultProps: { size: 'small', disableElevation: true },
        styleOverrides: { root: { textTransform: 'none', fontWeight: 500, borderRadius: 2 } },
      },
      MuiChip: {
        defaultProps: { size: 'small' },
        styleOverrides: {
          root: { borderRadius: 2, fontWeight: 600, fontSize: 11, letterSpacing: '0.02em', height: 20 },
        },
      },
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 2 } } },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { backgroundImage: 'none' }, outlined: { border: `1px solid ${borde}` } },
      },
      MuiTable: { defaultProps: { size: 'small' } },
      MuiTableCell: {
        styleOverrides: {
          root: { paddingTop: 5, paddingBottom: 5, borderColor: borde, fontSize: 13 },
          head: {
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: oscuro ? '#8b93a7' : '#5a6172',
            backgroundColor: oscuro ? '#1b1f2a' : '#eceef3',
            whiteSpace: 'nowrap',
          },
        },
      },
      MuiDialog: { styleOverrides: { paper: { border: `1px solid ${borde}` } } },
      MuiDialogTitle: {
        styleOverrides: {
          root: { fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${borde}` },
        },
      },
      MuiDialogActions: { styleOverrides: { root: { borderTop: `1px solid ${borde}`, padding: 12 } } },
      MuiAlert: { styleOverrides: { root: { borderRadius: 2, fontSize: 13 } } },
      MuiTooltip: { defaultProps: { arrow: true } },
    },
  });
};
