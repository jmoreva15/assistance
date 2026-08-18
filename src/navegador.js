import { chromium } from 'playwright';

/**
 * Navegador efimero: el formulario es publico, no hace falta sesion de Google
 * ni perfil persistente en disco.
 */
export async function abrirNavegador({ headless = true } = {}) {
  const opciones = { headless, args: ['--disable-blink-features=AutomationControlled'] };
  let navegador;
  try {
    navegador = await chromium.launch({ ...opciones, channel: 'chrome' });
  } catch {
    navegador = await chromium.launch(opciones);
  }
  const contexto = await navegador.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'es-419',
    timezoneId: process.env.TZ || 'America/Lima',
  });
  contexto.on('close', () => navegador.close().catch(() => {}));
  contexto.cerrarTodo = async () => {
    await contexto.close().catch(() => {});
    await navegador.close().catch(() => {});
  };
  return contexto;
}
