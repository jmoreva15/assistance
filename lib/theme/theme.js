import { createTheme } from '@mui/material/styles';
import { TOKENS } from './tokens.js';

const palette = (scheme) => ({
  primary: { main: scheme.primary },
  error: { main: scheme.error },
  success: { main: scheme.success },
  warning: { main: scheme.warning },
  info: { main: scheme.info },
  divider: scheme.divider,
  background: { default: scheme.background, paper: scheme.paper },
});

const typography = {
  fontFamily: TOKENS.shared.fontFamily,
  h5: { fontWeight: 600, fontSize: '1.15rem', letterSpacing: '-0.01em' },
  h6: { fontWeight: 600, fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.06em' },
  body2: { fontSize: '0.8125rem' },
  caption: { fontSize: '0.75rem' },
};

const components = {
  MuiCssBaseline: { styleOverrides: { body: { WebkitFontSmoothing: 'antialiased' } } },
  MuiButton: {
    defaultProps: { size: 'small', disableElevation: true },
    styleOverrides: { root: { textTransform: 'none', fontWeight: 500, borderRadius: TOKENS.shared.radius } },
  },
  MuiChip: {
    defaultProps: { size: 'small' },
    styleOverrides: {
      root: { borderRadius: TOKENS.shared.radius, fontWeight: 600, fontSize: 11, letterSpacing: '0.02em', height: 20 },
    },
  },
  MuiTextField: { defaultProps: { size: 'small' } },
  MuiOutlinedInput: { styleOverrides: { root: { borderRadius: TOKENS.shared.radius } } },
  MuiPaper: {
    defaultProps: { elevation: 0 },
    styleOverrides: {
      root: { backgroundImage: 'none' },
      outlined: { borderColor: 'var(--mui-palette-divider)' },
    },
  },
  MuiTable: { defaultProps: { size: 'small' } },
  MuiTableCell: {
    styleOverrides: {
      root: { paddingTop: 5, paddingBottom: 5, borderColor: 'var(--mui-palette-divider)', fontSize: 13 },
      head: {
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        whiteSpace: 'nowrap',
        color: 'var(--mui-palette-tableHeader-text)',
        backgroundColor: 'var(--mui-palette-tableHeader-background)',
      },
    },
  },
  MuiDialog: { styleOverrides: { paper: { border: '1px solid var(--mui-palette-divider)' } } },
  MuiDialogTitle: {
    styleOverrides: {
      root: {
        fontSize: '0.8125rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        padding: '14px 20px',
        borderBottom: '1px solid var(--mui-palette-divider)',
      },
    },
  },
  MuiDialogContent: {
    styleOverrides: { root: { padding: '24px 20px', '.MuiDialogTitle-root + &': { paddingTop: '24px' } } },
  },
  MuiDialogActions: {
    styleOverrides: { root: { borderTop: '1px solid var(--mui-palette-divider)', padding: 12 } },
  },
  MuiAlert: { styleOverrides: { root: { borderRadius: TOKENS.shared.radius, fontSize: 13 } } },
  MuiTooltip: { defaultProps: { arrow: true } },
  MuiTabs: { styleOverrides: { root: { minHeight: 40 } } },
  MuiTab: { styleOverrides: { root: { minHeight: 40, textTransform: 'none', fontWeight: 600 } } },
};

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'media' },
  colorSchemes: {
    light: {
      palette: {
        ...palette(TOKENS.light),
        tableHeader: { background: TOKENS.light.headerBackground, text: TOKENS.light.headerText },
      },
    },
    dark: {
      palette: {
        ...palette(TOKENS.dark),
        tableHeader: { background: TOKENS.dark.headerBackground, text: TOKENS.dark.headerText },
      },
    },
  },
  shape: { borderRadius: TOKENS.shared.radius },
  typography,
  components,
});

export const MONO = TOKENS.shared.monoFamily;
