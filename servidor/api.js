/**
 * API del panel de asistencia. Sin dependencias: solo el modulo http de Node.
 *
 * El servidor NO guarda datos: los datos viven en el localStorage del navegador.
 * Aca solo se hacen tres cosas:
 *   POST /api/enviar             recibe los registros y los envia al formulario
 *   GET  /api/trabajo?cliente=x  estado y lineas del envio de ESE cliente
 *
 * No hay registro compartido: cada navegador guarda su propio registro en su
 * localStorage, a partir de las lineas de sus propios envios.
 * Todo lo demas es servir el panel compilado.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUERTO = Number(process.env.PUERTO || 4321);
// Por defecto solo acepta conexiones locales. Para desplegarlo hay que exponerlo
// con HOST=0.0.0.0, y ahi conviene leer la advertencia del README sobre abusos.
const HOST = process.env.HOST || '127.0.0.1';
const DIR_PANEL = path.join(RAIZ, 'panel', 'dist');
const DIR_TRABAJOS = path.join(RAIZ, '.trabajos');
const MAX_SIMULTANEOS = 3;

/**
 * Un trabajo por cliente. El clienteId lo genera el navegador y vive en su
 * localStorage: asi cada usuario ve solo su envio y su registro, y el envio de
 * uno no bloquea al de otro.
 */
const trabajos = new Map();
const VACIO = { activo: false, iniciado: null, terminado: null, lineas: [], fechas: [], exitosos: [], codigo: null };

/** Suelta los trabajos terminados hace mas de una hora. */
function limpiarViejos() {
  const limite = Date.now() - 3600e3;
  for (const [id, t] of trabajos) {
    if (!t.activo && t.terminado && new Date(t.terminado).getTime() < limite) trabajos.delete(id);
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

const responder = (res, codigo, datos) => {
  res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(datos));
};

const leerCuerpo = (req) =>
  new Promise((resolve, reject) => {
    let bruto = '';
    req.on('data', (c) => {
      bruto += c;
      if (bruto.length > 5e6) reject(new Error('cuerpo demasiado grande'));
    });
    req.on('end', () => {
      try {
        resolve(bruto ? JSON.parse(bruto) : {});
      } catch {
        reject(new Error('JSON invalido en el cuerpo de la peticion'));
      }
    });
    req.on('error', reject);
  });

/** Recibe los registros que manda el panel y corre el envio contra ellos. */
function iniciarEnvio({ clienteId, formUrl, constantes, dias }) {
  if (!clienteId || typeof clienteId !== 'string' || clienteId.length > 100) throw new Error('falta el identificador del cliente');
  limpiarViejos();
  if (trabajos.get(clienteId)?.activo) {
    const enCurso = trabajos.get(clienteId);
    throw new Error(`ya tienes un envio en curso desde ${enCurso.iniciado} con ${enCurso.fechas.length} dia(s); espera que termine`);
  }
  const activos = [...trabajos.values()].filter((t) => t.activo).length;
  if (activos >= MAX_SIMULTANEOS) {
    throw new Error(`el servidor ya esta corriendo ${activos} envios de otros usuarios (el maximo es ${MAX_SIMULTANEOS}); prueba en un minuto`);
  }

  if (!Array.isArray(dias) || !dias.length) throw new Error('no seleccionaste ningun dia para enviar');
  if (!constantes?.['NOMBRE COMPLETO']?.trim()) {
    throw new Error('falta el nombre completo en «Tus datos»: el formulario lo pide como obligatorio');
  }
  const dni = String(constantes?.DNI || '');
  if (!/^\d{8}$/.test(dni)) {
    throw new Error(`el DNI debe ser 8 digitos y llego ${dni.length ? `"${dni.length} caracter(es)"` : 'vacio'}; corregilo en «Tus datos»`);
  }
  if (!/^https:\/\/docs\.google\.com\/forms\/.+/.test(String(formUrl || ''))) {
    throw new Error(`la URL del formulario tiene que empezar con https://docs.google.com/forms/ y terminar en /viewform, pero llego "${String(formUrl || '').slice(0, 80)}"`);
  }

  const hoy = new Date().toLocaleDateString('sv-SE');
  const fechas = dias.map((d) => d.fecha);
  const futuras = fechas.filter((f) => f > hoy);
  if (futuras.length) {
    throw new Error(`no se puede registrar asistencia de dias que todavia no ocurrieron (hoy es ${hoy}): ${futuras.join(', ')}`);
  }
  const incompletos = dias.filter((d) => !String(d.ingreso || '').trim() || !String(d.salida || '').trim());
  if (incompletos.length) {
    throw new Error(
      `faltan horas obligatorias en ${incompletos.length} dia(s): ${incompletos
        .map((d) => `${d.fecha} (${!String(d.ingreso || '').trim() ? 'sin ingreso' : ''}${!String(d.ingreso || '').trim() && !String(d.salida || '').trim() ? ' y ' : ''}${!String(d.salida || '').trim() ? 'sin salida' : ''})`)
        .join('; ')}`,
    );
  }

  fs.mkdirSync(DIR_TRABAJOS, { recursive: true });
  const rutaTrabajo = path.join(DIR_TRABAJOS, `${clienteId.replace(/[^\w-]/g, '')}.json`);
  fs.writeFileSync(rutaTrabajo, JSON.stringify({ formUrl, constantes, dias, segundosEntreEnvios: 6 }, null, 2));

  const trabajo = { ...VACIO, activo: true, iniciado: new Date().toISOString(), lineas: [], fechas, exitosos: [] };
  trabajos.set(clienteId, trabajo);

  const hijo = spawn(process.execPath, [path.join(RAIZ, 'src', 'lote.js')], {
    cwd: RAIZ,
    env: { ...process.env, TRABAJO: rutaTrabajo },
  });

  const acumular = (buf) => {
    for (const linea of String(buf).split('\n')) {
      if (!linea.trim()) continue;
      trabajo.lineas.push(linea.trim());
      const ok = linea.match(/\] OK (\d{4}-\d{2}-\d{2})/);
      if (ok) trabajo.exitosos.push(ok[1]);
    }
  };
  hijo.stdout.on('data', acumular);
  hijo.stderr.on('data', acumular);
  hijo.on('close', (codigo) => {
    trabajo.activo = false;
    trabajo.terminado = new Date().toISOString();
    trabajo.codigo = codigo;
    // El archivo lleva nombre y DNI: se borra en cuanto termina el envio.
    fs.rmSync(rutaTrabajo, { force: true });
  });

  return { iniciado: true, dias: dias.length };
}

function servirPanel(req, res) {
  const relativo = req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0];
  const archivo = path.join(DIR_PANEL, path.normalize(relativo).replace(/^(\.\.[/\\])+/, ''));
  const indice = path.join(DIR_PANEL, 'index.html');

  if (!archivo.startsWith(DIR_PANEL) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) {
    if (!fs.existsSync(indice)) {
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('El panel no esta compilado todavia. Corre: npm run build');
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(indice));
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(archivo)] || 'application/octet-stream' });
  res.end(fs.readFileSync(archivo));
}

const servidor = http.createServer(async (req, res) => {
  const ruta = req.url.split('?')[0];
  try {
    if (ruta === '/api/enviar' && req.method === 'POST') {
      return responder(res, 202, iniciarEnvio(await leerCuerpo(req)));
    }
    if (ruta.startsWith('/api/trabajo') && req.method === 'GET') {
      const cliente = new URL(req.url, 'http://localhost').searchParams.get('cliente');
      if (!cliente) throw new Error('falta el parametro cliente');
      return responder(res, 200, trabajos.get(cliente) || VACIO);
    }
    if (ruta.startsWith('/api/')) {
      return responder(res, 404, { error: `no existe ${req.method} ${ruta}` });
    }
    return servirPanel(req, res);
  } catch (error) {
    responder(res, 400, { error: error.message });
  }
});

servidor.listen(PUERTO, HOST, () => {
  console.log(`Panel de asistencia en http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PUERTO}`);
  if (HOST === '0.0.0.0') console.log('ATENCION: expuesto a la red. Cualquiera que lo alcance puede usarlo para enviar a un formulario.');
  if (!fs.existsSync(path.join(DIR_PANEL, 'index.html'))) console.log('(falta compilar el panel: npm run build)');
});
