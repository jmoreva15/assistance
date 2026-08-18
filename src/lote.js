/**
 * Envia al formulario los registros del archivo de trabajo que prepara la API.
 * Uso: TRABAJO=/ruta/trabajo.json node src/lote.js
 *
 * El archivo trae { formUrl, constantes, dias, segundosEntreEnvios }.
 * No guarda datos del usuario en ningun lado: escribe el detalle en stdout, que
 * la API entrega solo al cliente que pidio el envio. Si algo falla deja una
 * captura en capturas/ para poder mirar que paso.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirNavegador } from './navegador.js';
import { enviar } from './formulario.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUTA_TRABAJO = process.env.TRABAJO;

const registrar = (linea) => console.log(`[${new Date().toISOString()}] ${linea}`);

if (!RUTA_TRABAJO || !fs.existsSync(RUTA_TRABAJO)) {
  console.error('\nfalta TRABAJO=<archivo.json>. Este script lo lanza la API del panel.\n');
  process.exit(1);
}

const { formUrl, constantes, dias, segundosEntreEnvios = 6 } = JSON.parse(fs.readFileSync(RUTA_TRABAJO, 'utf8'));
const capturas = path.join(RAIZ, 'capturas');

const contexto = await abrirNavegador({ headless: true });
const page = await contexto.newPage();
let ok = 0;
let fallos = 0;

registrar(`${dias.length} dia(s) a enviar`);

for (const [i, dia] of dias.entries()) {
  const respuestas = {
    ...constantes,
    FECHA: dia.fecha,
    INGRESO: dia.ingreso,
    SALIDA: dia.salida,
    OBSERVACION: dia.observacion || '',
  };

  try {
    await page.goto(formUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const cuerpo = await page.locator('body').innerText();
    if (/necesitas permiso|need permission|solicitar acceso|request access/i.test(cuerpo)) {
      throw new Error('el formulario pide permiso para verse. La URL no es publica o es de otra cuenta; abrila en una ventana privada para comprobarlo');
    }
    if (/ya (respondiste|enviaste)|already responded|una sola respuesta|only one response/i.test(cuerpo)) {
      throw new Error('el formulario acepta una sola respuesta por persona y ya tiene la tuya');
    }

    const resultado = await enviar(page, respuestas);
    const sinLlenar = resultado.registros.filter((r) => r.estado !== 'ok' && !r.titulo.includes('OBSERVACION'));

    if (resultado.enviado && !sinLlenar.length) {
      ok++;
      registrar(`OK ${dia.fecha} (${dia.dia})  ingreso ${dia.ingreso}  salida ${dia.salida}   [${ok}/${dias.length}]`);
    } else {
      fallos++;
      const detalle = sinLlenar.length
        ? `no pude llenar ${sinLlenar.length} campo(s): ${sinLlenar.map((r) => `"${r.titulo}" (${r.estado})`).join('; ')}`
        : `los campos se llenaron bien, pero tras apretar Enviar no aparecio la pantalla de confirmacion. La pagina decia: "${(resultado.confirmacion || '').slice(0, 160)}"`;
      registrar(`FALLO ${dia.fecha} (${dia.dia}) ingreso ${dia.ingreso} salida ${dia.salida}: ${detalle}`);
      fs.mkdirSync(capturas, { recursive: true });
      const captura = path.join(capturas, `fallo-${dia.fecha}.png`);
      await page.screenshot({ path: captura, fullPage: true });
      registrar(`  captura del fallo: ${path.relative(RAIZ, captura)}`);
    }
  } catch (error) {
    fallos++;
    const causa = /Timeout|timeout/.test(error.message)
      ? 'el formulario no respondio a tiempo (conexion lenta o la pagina cambio de estructura)'
      : error.message;
    registrar(`ERROR ${dia.fecha} (${dia.dia}) ingreso ${dia.ingreso} salida ${dia.salida}: ${causa}`);
    fs.mkdirSync(capturas, { recursive: true });
    const captura = path.join(capturas, `error-${dia.fecha}.png`);
    if (await page.screenshot({ path: captura, fullPage: true }).then(() => true).catch(() => false)) {
      registrar(`  captura del error: ${path.relative(RAIZ, captura)}`);
    }
  }

  if (i < dias.length - 1) await page.waitForTimeout(segundosEntreEnvios * 1000);
}

await contexto.cerrarTodo();
registrar(`FIN: ${ok} enviados, ${fallos} con problema${fallos ? '. Los dias con problema NO quedan marcados como enviados: revisa las lineas FALLO/ERROR de arriba antes de reintentar' : ''}`);
process.exit(fallos ? 1 : 0);
