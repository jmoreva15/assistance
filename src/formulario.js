/** Utilidades para leer y llenar Formularios de Google. */

export function normalizar(texto = '') {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[*:]/g, '')
    .trim()
    .toLowerCase();
}

/** Reemplaza {{HOY}}, {{AHORA}}, etc. por valores del momento del envio. */
export function resolverValor(valor) {
  if (typeof valor !== 'string') return valor;
  const ahora = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const fechaIso = `${ahora.getFullYear()}-${p(ahora.getMonth() + 1)}-${p(ahora.getDate())}`;
  const reemplazos = {
    '{{HOY}}': fechaIso,
    '{{HOY_CORTO}}': `${p(ahora.getDate())}/${p(ahora.getMonth() + 1)}/${ahora.getFullYear()}`,
    '{{HOY_LARGO}}': ahora.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    '{{AHORA}}': `${p(ahora.getHours())}:${p(ahora.getMinutes())}`,
    '{{HORA}}': p(ahora.getHours()),
    '{{MINUTO}}': p(ahora.getMinutes()),
  };
  return Object.entries(reemplazos).reduce((acc, [k, v]) => acc.split(k).join(v), valor);
}

/** Acepta "9:05 AM", "09:05", "18:30", "6:30pm" y devuelve {hora12, minuto, meridiano}. */
export function parseHora(valor) {
  const texto = String(valor).trim().toLowerCase().replace(/\./g, '');
  const m = texto.match(/^(\d{1,2})[:.h ]?(\d{2})?\s*(am|pm)?$/);
  if (!m) throw new Error(`no entiendo la hora "${valor}" (usa 09:05 AM o 18:30)`);
  let hora = Number(m[1]);
  const minuto = m[2] ? Number(m[2]) : 0;
  let meridiano = m[3] ? m[3].toUpperCase() : null;
  if (!meridiano) {
    meridiano = hora >= 12 ? 'PM' : 'AM';
    if (hora > 12) hora -= 12;
    if (hora === 0) hora = 12;
  }
  if (hora < 1 || hora > 12 || minuto > 59) throw new Error(`hora fuera de rango: "${valor}"`);
  return { hora12: hora, minuto, meridiano };
}

const SEL_ITEM = 'div[role="listitem"]';

/** Devuelve [{ indice, titulo, tipo, opciones }] de la pagina actual del formulario. */
export async function listarPreguntas(page) {
  await page.waitForSelector(SEL_ITEM, { timeout: 30000 });
  const items = page.locator(SEL_ITEM);
  const total = await items.count();
  const preguntas = [];

  for (let i = 0; i < total; i++) {
    const item = items.nth(i);
    const encabezado = item.locator('[role="heading"]').first();
    const titulo = (await encabezado.count())
      ? (await encabezado.innerText()).split('\n')[0].trim()
      : `(pregunta ${i + 1})`;

    const tipo = await detectarTipo(item);
    const opciones = await leerOpciones(item, tipo);
    preguntas.push({ indice: i, titulo, tipo, opciones });
  }
  return preguntas;
}

async function detectarTipo(item) {
  if (await item.locator('div[role="radiogroup"] div[role="radio"]').count()) return 'radio';
  if (await item.locator('div[role="checkbox"]').count()) return 'checkbox';
  if (await item.locator('input[aria-label="Hora"], input[aria-label="Hour"]').count()) return 'hora12';
  if (await item.locator('div[role="listbox"]').count()) return 'desplegable';
  if (await item.locator('input[type="date"]').count()) return 'fecha';
  if (await item.locator('input[type="time"]').count()) return 'hora';
  if (await item.locator('textarea').count()) return 'parrafo';
  if (await item.locator('input[type="text"]').count()) return 'texto';
  return 'desconocido';
}

async function leerOpciones(item, tipo) {
  if (tipo === 'radio' || tipo === 'checkbox') {
    const sel = tipo === 'radio' ? 'div[role="radio"]' : 'div[role="checkbox"]';
    return item.locator(sel).evaluateAll((nodos) =>
      nodos.map((n) => n.getAttribute('aria-label') || n.getAttribute('data-value') || '').filter(Boolean),
    );
  }
  if (tipo === 'hora12') return ['AM', 'PM'];
  if (tipo === 'desplegable') {
    return item.locator('div[role="option"]').evaluateAll((nodos) =>
      nodos.map((n) => n.getAttribute('data-value') || n.textContent.trim()).filter((v) => v && v !== 'Elegir' && v !== 'Choose'),
    );
  }
  return [];
}

/** Busca en `respuestas` la clave que mejor coincida con el titulo de la pregunta. */
function buscarRespuesta(titulo, respuestas) {
  const t = normalizar(titulo);
  const claves = Object.keys(respuestas);
  const exacta = claves.find((k) => normalizar(k) === t);
  if (exacta) return { clave: exacta, valor: respuestas[exacta] };
  const parcial = claves.find((k) => {
    const n = normalizar(k);
    return n.length > 2 && (t.includes(n) || n.includes(t));
  });
  return parcial ? { clave: parcial, valor: respuestas[parcial] } : null;
}

/** Llena todas las preguntas visibles. Devuelve el registro de lo que hizo. */
export async function llenarPagina(page, respuestas) {
  const preguntas = await listarPreguntas(page);
  const items = page.locator(SEL_ITEM);
  const registro = [];

  for (const pregunta of preguntas) {
    const encontrada = buscarRespuesta(pregunta.titulo, respuestas);
    if (!encontrada) {
      registro.push({ ...pregunta, estado: 'sin-respuesta-configurada' });
      continue;
    }
    const item = items.nth(pregunta.indice);
    const valores = (Array.isArray(encontrada.valor) ? encontrada.valor : [encontrada.valor]).map(resolverValor);

    try {
      await aplicar(item, pregunta.tipo, valores, page);
      registro.push({ ...pregunta, estado: 'ok', valor: valores.join(', ') });
    } catch (error) {
      registro.push({ ...pregunta, estado: `error: ${error.message}` });
    }
  }
  return registro;
}

async function aplicar(item, tipo, valores, page) {
  const [primero] = valores;

  switch (tipo) {
    case 'texto':
      await item.locator('input[type="text"]').first().fill(String(primero));
      return;
    case 'parrafo':
      await item.locator('textarea').first().fill(String(primero));
      return;
    case 'fecha':
      await item.locator('input[type="date"]').first().fill(String(primero));
      return;
    case 'hora': {
      const campos = item.locator('input[type="time"]');
      await campos.first().fill(String(primero));
      return;
    }
    case 'hora12': {
      const { hora12, minuto, meridiano } = parseHora(primero);
      await item.locator('input[aria-label="Hora"], input[aria-label="Hour"]').first().fill(String(hora12));
      const campoMinuto = item.locator('input[aria-label="Minuto"], input[aria-label="Minute"]');
      if (await campoMinuto.count()) await campoMinuto.first().fill(String(minuto).padStart(2, '0'));
      const selector = item.locator('div[role="listbox"]').first();
      if (await selector.count()) {
        await selector.click();
        await page.waitForTimeout(250);
        const opcion = item.locator(`div[role="option"][data-value="${meridiano}"]`).first();
        await (await opcion.count() ? opcion : page.locator(`div[role="option"][data-value="${meridiano}"]`).first()).click();
        // el desplegable puede quedar abierto y tapar el boton Enviar
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(200);
      }
      return;
    }
    case 'radio':
      await clicPorEtiqueta(item, 'div[role="radio"]', primero);
      return;
    case 'checkbox':
      for (const valor of valores) await clicPorEtiqueta(item, 'div[role="checkbox"]', valor);
      return;
    case 'desplegable': {
      await item.locator('div[role="listbox"]').first().click();
      const opcion = page.locator(`div[role="option"][data-value="${String(primero).replace(/"/g, '\\"')}"]`).first();
      if (await opcion.count()) await opcion.click();
      else await page.getByRole('option', { name: String(primero) }).first().click();
      return;
    }
    default:
      throw new Error(`tipo de pregunta no soportado (${tipo})`);
  }
}

async function clicPorEtiqueta(item, selector, valor) {
  const objetivo = normalizar(String(valor));
  const opciones = item.locator(selector);
  const total = await opciones.count();
  for (let i = 0; i < total; i++) {
    const opcion = opciones.nth(i);
    const etiqueta = normalizar((await opcion.getAttribute('aria-label')) || (await opcion.getAttribute('data-value')) || '');
    if (etiqueta === objetivo || etiqueta.includes(objetivo)) {
      await opcion.click();
      return;
    }
  }
  throw new Error(`no encontre la opcion "${valor}"`);
}

/** Avanza paginas y envia. Devuelve true si vio la pantalla de confirmacion. */
export async function enviar(page, respuestas, { simulacion = false } = {}) {
  const registros = [];

  for (let pagina = 0; pagina < 15; pagina++) {
    registros.push(...(await llenarPagina(page, respuestas)));

    const botonEnviar = page.getByRole('button', { name: /^(enviar|submit)$/i }).first();
    const botonSiguiente = page.getByRole('button', { name: /^(siguiente|next)$/i }).first();

    if (await botonEnviar.count()) {
      if (simulacion) return { registros, enviado: false, simulacion: true };
      await botonEnviar.click();
      await page.waitForLoadState('networkidle').catch(() => {});
      const texto = await page.locator('body').innerText();
      const confirmado = /respuesta|response|se registr|recorded|gracias|thank/i.test(texto);
      return { registros, enviado: confirmado, confirmacion: texto.slice(0, 300).trim() };
    }

    if (!(await botonSiguiente.count())) break;
    await botonSiguiente.click();
    await page.waitForTimeout(800);
  }

  throw new Error('no encontre el boton Enviar del formulario');
}
