import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import Providers from './providers.jsx';

export const metadata = {
  title: 'Asistencia',
  description: 'Registro de asistencia',
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <InitColorSchemeScript attribute="media" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
