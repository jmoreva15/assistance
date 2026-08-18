/**
 * Une el repositorio con las reglas de dominio y expone acciones listas para la
 * UI. Los componentes solo usan este hook: no saben si detras hay localStorage
 * o una API.
 *
 * Cada seccion escribe en su propio almacen. Lo unico que se mueve de un sitio a
 * otro es lo que Google confirma: pasa a `enviados` y se va de donde estaba.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { repositorio } from '../datos/repositorio.js';
import { descargar, desdeArchivo } from '../datos/portable.js';
import { anotar, describirCambios, linea } from '../dominio/bitacora.js';
import { horaAhora, hoyISO, normalizarHora } from '../dominio/horas.js';
import {
  ENTRADA_POR_DEFECTO, SALIDA_POR_DEFECTO, crearRegistro, esEnviable, generarLote, validarFormato,
} from '../dominio/registros.js';

export function useAsistencia() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState(null);
  const [error, setError] = useState(null);
  const [trabajo, setTrabajo] = useState({ activo: false, lineas: [], exitosos: [] });
  const lineasVistas = useRef({ iniciado: null, cantidad: 0 });
  const envioProcesado = useRef(null);

  useEffect(() => {
    repositorio
      .leer()
      .then(async (guardado) => {
        if (!guardado) return setDatos(null);
        // La jornada marcada con el reloj no sobrevive al dia si no se envio.
        if (guardado.jornada && guardado.jornada.fecha !== hoyISO()) {
          const vieja = guardado.jornada;
          const limpio = anotar(
            { ...guardado, jornada: null },
            linea('DESCARTADA', `jornada del ${vieja.fecha} (${vieja.entrada || '--:--'} a ${vieja.salida || '--:--'}) que nunca se envio`),
          );
          setDatos(await repositorio.escribir(limpio));
          setAviso(`Se descarto la jornada del ${vieja.fecha}: la marcaste y no la enviaste.`);
          return;
        }
        setDatos(guardado);
      })
      .catch((e) => setError(`No pude leer tus datos guardados: ${e.message}`))
      .finally(() => setCargando(false));
  }, []);

  const guardar = useCallback(async (siguiente, mensaje) => {
    const persistido = await repositorio.escribir(siguiente);
    setDatos(persistido);
    if (mensaje) setAviso(mensaje);
    return persistido;
  }, []);

  const fallar = useCallback((contexto, motivo) => {
    const texto = `${contexto}: ${motivo}`;
    setError(texto);
    setDatos((prev) => {
      if (!prev) return prev;
      const conError = anotar(prev, linea('ERROR', texto));
      repositorio.escribir(conError);
      return conError;
    });
  }, []);

  // ---------------- Mi jornada ----------------

  const marcarEntrada = useCallback(async () => {
    const fecha = hoyISO();
    if (datos.enviados[fecha]) return fallar('No pude registrar la entrada', 'hoy ya fue enviado');
    if (datos.jornada?.entrada) {
      return fallar('No pude registrar la entrada', `hoy ya tiene entrada a las ${datos.jornada.entrada}; corregila con el lapiz`);
    }
    const hora = horaAhora();
    const jornada = { ...(datos.jornada || crearRegistro({ fecha })), entrada: hora };
    await guardar(anotar({ ...datos, jornada }, linea('ENTRADA', `${fecha} a las ${hora}`)), `Entrada registrada a las ${hora}.`);
  }, [datos, guardar, fallar]);

  /** Si nunca se marco la entrada, se puede pasar la que el usuario escribe en el modal. */
  const marcarSalida = useCallback(async (entradaManual = null) => {
    const fecha = hoyISO();
    if (datos.enviados[fecha]) return fallar('No pude registrar la salida', 'hoy ya fue enviado');
    const entradaFinal = datos.jornada?.entrada || (entradaManual ? normalizarHora(entradaManual) : null);
    if (entradaManual && !entradaFinal) {
      return fallar('No pude registrar la salida', `no entiendo la hora "${entradaManual}"`);
    }
    if (!entradaFinal) return { faltaEntrada: true };
    if (datos.jornada?.salida) {
      return fallar('No pude registrar la salida', `hoy ya tiene salida a las ${datos.jornada.salida}; corregila con el lapiz`);
    }

    const hora = horaAhora();
    const jornada = { ...(datos.jornada || crearRegistro({ fecha })), entrada: entradaFinal, salida: hora };
    await guardar(
      anotar(
        { ...datos, jornada },
        datos.jornada?.entrada
          ? linea('SALIDA', `${fecha} a las ${hora}`)
          : linea('JORNADA', `${fecha}: entrada ${entradaFinal} a mano y salida ${hora} en vivo`),
      ),
      `Salida registrada a las ${hora}.`,
    );
    return { ok: true };
  }, [datos, guardar, fallar]);

  const editarJornada = useCallback(async (cambios) => {
    const formato = validarFormato(cambios);
    if (formato) return fallar('No pude guardar la jornada', formato);
    const actual = datos.jornada || crearRegistro({ fecha: hoyISO() });
    const jornada = {
      ...actual,
      entrada: 'entrada' in cambios ? normalizarHora(cambios.entrada) || null : actual.entrada,
      salida: 'salida' in cambios ? normalizarHora(cambios.salida) || null : actual.salida,
      observacion: 'observacion' in cambios ? cambios.observacion : actual.observacion,
    };
    const cambiosTexto = describirCambios(actual, jornada);
    await guardar(
      anotar({ ...datos, jornada }, cambiosTexto.length ? linea('EDICION', `jornada de hoy: ${cambiosTexto.join('; ')}`) : null),
      cambiosTexto.length ? cambiosTexto.join('; ') : 'Sin cambios.',
    );
  }, [datos, guardar, fallar]);

  // ---------------- Un dia ----------------

  const guardarUnDia = useCallback(async ({ fecha, entrada, salida, observacion = '' }) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha || ''))) return fallar('No pude guardar el dia', 'elige una fecha valida');
    if (fecha > hoyISO()) return fallar('No pude guardar el dia', `${fecha} todavia no ocurrio`);
    if (datos.enviados[fecha]) return fallar('No pude guardar el dia', `${fecha} ya fue enviado`);
    const formato = validarFormato({ entrada, salida });
    if (formato) return fallar(`No pude guardar ${fecha}`, formato);
    const e = normalizarHora(entrada);
    const s = normalizarHora(salida);
    if (!e || !s) return fallar('No pude guardar el dia', 'las dos horas son obligatorias');

    const unDia = { ...crearRegistro({ fecha, entrada: e, salida: s, observacion }) };
    await guardar(
      anotar({ ...datos, unDia }, linea('UN DIA', `${fecha}: ${e} a ${s}${observacion ? ` — ${observacion}` : ''}`)),
      `${fecha} guardado: ${e} a ${s}.`,
    );
    return { ok: true };
  }, [datos, guardar, fallar]);

  const borrarUnDia = useCallback(async () => {
    if (!datos.unDia) return;
    const { fecha } = datos.unDia;
    await guardar(anotar({ ...datos, unDia: null }, linea('UN DIA BORRADO', fecha)), `${fecha} descartado.`);
  }, [datos, guardar]);

  // ---------------- Varios dias ----------------

  const generarElLote = useCallback(async ({ desde, hasta }) => {
    const { dias, yaEnviados, invalido } = generarLote({ desde, hasta, enviados: datos.enviados });
    if (invalido) return fallar('No pude generar el intervalo', invalido);
    if (!dias.length) {
      return fallar('No pude generar el intervalo', `los ${yaEnviados.length} dia(s) habiles de ese rango ya fueron enviados`);
    }
    const habia = datos.lote?.dias?.length || 0;
    await guardar(
      anotar(
        { ...datos, lote: { desde, hasta, generadoEn: new Date().toISOString(), dias } },
        linea('LOTE GENERADO', `${dias.length} dia(s) de ${desde} a ${hasta} con ${ENTRADA_POR_DEFECTO}-${SALIDA_POR_DEFECTO}${habia ? `; reemplaza el lote anterior de ${habia} dia(s)` : ''}`),
        yaEnviados.length ? linea('EXCLUIDOS', `${yaEnviados.length} dia(s) ya enviados: ${yaEnviados.join(', ')}`) : null,
      ),
      `${dias.length} dia(s) generados${habia ? ', reemplazando el lote anterior' : ''}.`,
    );
    return { fechas: dias.map((d) => d.fecha) };
  }, [datos, guardar, fallar]);

  const borrarLote = useCallback(async () => {
    if (!datos.lote) return;
    const cuantos = datos.lote.dias.length;
    await guardar(anotar({ ...datos, lote: null }, linea('LOTE BORRADO', `${cuantos} dia(s)`)), `Lote de ${cuantos} dia(s) borrado.`);
  }, [datos, guardar]);

  const editarDelLote = useCallback(async (fecha, cambios) => {
    const formato = validarFormato(cambios);
    if (formato) return fallar(`No pude guardar ${fecha}`, formato);
    const anterior = datos.lote.dias.find((d) => d.fecha === fecha);
    const nuevo = {
      ...anterior,
      entrada: 'entrada' in cambios ? normalizarHora(cambios.entrada) || null : anterior.entrada,
      salida: 'salida' in cambios ? normalizarHora(cambios.salida) || null : anterior.salida,
      observacion: 'observacion' in cambios ? cambios.observacion : anterior.observacion,
    };
    const cambiosTexto = describirCambios(anterior, nuevo);
    await guardar(
      anotar(
        { ...datos, lote: { ...datos.lote, dias: datos.lote.dias.map((d) => (d.fecha === fecha ? nuevo : d)) } },
        cambiosTexto.length ? linea('EDICION', `${fecha} del lote: ${cambiosTexto.join('; ')}`) : null,
      ),
      cambiosTexto.length ? `${fecha}: ${cambiosTexto.join('; ')}` : 'Sin cambios.',
    );
  }, [datos, guardar, fallar]);

  // ---------------- configuracion ----------------

  const guardarConfiguracion = useCallback(async ({ constantes, formUrl }) => {
    const cambios = [
      constantes['NOMBRE COMPLETO'] !== datos.constantes['NOMBRE COMPLETO'] ? 'nombre' : null,
      constantes.DNI !== datos.constantes.DNI ? `DNI (termina en ${String(constantes.DNI).slice(-4)})` : null,
      formUrl !== datos.formUrl ? 'URL del formulario' : null,
    ].filter(Boolean);
    await guardar(
      anotar({ ...datos, constantes, formUrl }, cambios.length ? linea('CONFIGURACION', `actualizada: ${cambios.join(', ')}`) : null),
      'Configuracion guardada.',
    );
  }, [datos, guardar]);

  // ---------------- envio ----------------

  const consultarTrabajo = useCallback(async () => {
    try {
      const id = await repositorio.idCliente();
      setTrabajo(await api(`/trabajo?cliente=${encodeURIComponent(id)}`));
    } catch (e) {
      fallar('No pude consultar el estado del envio', e.message);
    }
  }, [fallar]);

  useEffect(() => {
    consultarTrabajo();
  }, [consultarTrabajo]);

  useEffect(() => {
    if (!trabajo.activo) return;
    const id = setInterval(consultarTrabajo, 1500);
    return () => clearInterval(id);
  }, [trabajo.activo, consultarTrabajo]);

  useEffect(() => {
    if (!datos || !trabajo?.iniciado) return;
    if (lineasVistas.current.iniciado !== trabajo.iniciado) lineasVistas.current = { iniciado: trabajo.iniciado, cantidad: 0 };
    const nuevas = (trabajo.lineas || []).slice(lineasVistas.current.cantidad);
    if (!nuevas.length) return;
    lineasVistas.current.cantidad += nuevas.length;
    setDatos((prev) => {
      const siguiente = anotar(prev, ...nuevas);
      repositorio.escribir(siguiente);
      return siguiente;
    });
  }, [trabajo, datos]);

  /**
   * Al terminar el envio, lo que Google confirmo se MUEVE al historial de
   * enviados y desaparece de donde estaba (jornada, unDia o lote).
   */
  useEffect(() => {
    if (!datos || trabajo.activo || !trabajo.terminado) return;
    if (envioProcesado.current === trabajo.terminado) return;
    envioProcesado.current = trabajo.terminado;

    const confirmados = (trabajo.exitosos || []).filter((f) => !datos.enviados[f]);
    const pedidos = trabajo.fechas || [];
    if (!confirmados.length) {
      if (pedidos.length) {
        fallar(
          'El envio termino sin confirmaciones',
          `se pidieron ${pedidos.length} dia(s) (${pedidos.join(', ')}) y Google no confirmo ninguno. El motivo esta en las lineas FALLO/ERROR de la bitacora. Codigo de salida ${trabajo.codigo}.`,
        );
      }
      return;
    }

    const cuando = new Date().toISOString();
    const enviados = { ...datos.enviados };
    let jornada = datos.jornada;
    let unDia = datos.unDia;
    let lote = datos.lote;

    for (const fecha of confirmados) {
      const origen =
        (jornada?.fecha === fecha && jornada) ||
        (unDia?.fecha === fecha && unDia) ||
        lote?.dias.find((d) => d.fecha === fecha);
      if (!origen) continue;
      enviados[fecha] = { ...origen, enviadoEn: cuando };
      if (jornada?.fecha === fecha) jornada = null;
      if (unDia?.fecha === fecha) unDia = null;
      if (lote) {
        const quedan = lote.dias.filter((d) => d.fecha !== fecha);
        lote = quedan.length ? { ...lote, dias: quedan } : null;
      }
    }

    const faltaron = pedidos.filter((f) => !trabajo.exitosos.includes(f));
    guardar(
      anotar(
        { ...datos, enviados, jornada, unDia, lote },
        linea('CONFIRMADOS', `${confirmados.length}/${pedidos.length} por Google, pasan al historial: ${confirmados.join(', ')}`),
        faltaron.length ? linea('SIN CONFIRMAR', `${faltaron.join(', ')} — siguen donde estaban`) : null,
      ),
      `${confirmados.length} de ${pedidos.length} registro(s) confirmados y guardados en Enviados.`,
    );
  }, [trabajo, datos, guardar, fallar]);

  const enviar = useCallback(async (registros) => {
    const hoy = hoyISO();
    const lista = registros.filter(Boolean);
    if (!lista.length) return fallar('No pude enviar', 'no hay ningun registro seleccionado');

    const yaEnviados = lista.filter((r) => datos.enviados[r.fecha]);
    if (yaEnviados.length) {
      return fallar('No pude enviar', `${yaEnviados.map((r) => r.fecha).join(', ')} ya esta(n) en el historial de enviados`);
    }
    const noEnviables = lista.filter((r) => !esEnviable(r, hoy));
    if (noEnviables.length) {
      return fallar(
        'No pude enviar',
        noEnviables.map((r) => `${r.fecha} ${r.fecha > hoy ? 'es una fecha futura' : 'le falta una hora'}`).join('; '),
      );
    }

    try {
      const clienteId = await repositorio.idCliente();
      await api('/enviar', {
        method: 'POST',
        body: JSON.stringify({
          clienteId,
          formUrl: datos.formUrl,
          constantes: datos.constantes,
          dias: lista.map((r) => ({
            fecha: r.fecha,
            dia: r.dia,
            ingreso: r.entrada,
            salida: r.salida,
            observacion: r.observacion || '',
          })),
        }),
      });
      await guardar(
        anotar(datos, linea('ENVIO SOLICITADO', `${lista.length} dia(s): ${lista.map((r) => `${r.fecha} ${r.entrada}-${r.salida}`).join(' | ')}`)),
      );
      setAviso('Envio en curso: segui el detalle en la bitacora.');
      consultarTrabajo();
      return true;
    } catch (e) {
      fallar(`No pude enviar ${lista.length} registro(s)`, e.message);
      return false;
    }
  }, [datos, guardar, fallar, consultarTrabajo]);

  const empezar = useCallback(async (inicial) => {
    await guardar(anotar(inicial, linea('INICIO', 'configuracion guardada en este navegador')), 'Listo, ya podes marcar tu jornada.');
  }, [guardar]);

  const exportar = useCallback(async () => {
    descargar(datos, hoyISO());
    await guardar(
      anotar(datos, linea('EXPORTADO', `${Object.keys(datos.enviados).length} enviados y la configuracion`)),
      'Archivo descargado.',
    );
  }, [datos, guardar]);

  const importar = useCallback(
    async (objeto) => {
      try {
        const importado = desdeArchivo(objeto);
        await guardar(
          anotar(importado, linea('IMPORTADO', `${Object.keys(importado.enviados).length} enviados desde archivo`)),
          `Importado: ${Object.keys(importado.enviados).length} enviado(s).`,
        );
        return { ok: true };
      } catch (e) {
        fallar('No pude importar el archivo', e.message);
        return { ok: false };
      }
    },
    [guardar, fallar],
  );

  const borrarTodo = useCallback(async () => {
    await repositorio.borrar();
    setDatos(null);
    setAviso('Datos borrados de este navegador.');
  }, []);

  const limpiarBitacora = useCallback(async () => {
    const cuantas = (datos.bitacora || []).length;
    await guardar(anotar({ ...datos, bitacora: [] }, linea('BITACORA VACIADA', `se borraron ${cuantas} lineas`)), 'Bitacora vaciada.');
  }, [datos, guardar]);

  return {
    datos,
    cargando,
    aviso,
    error,
    trabajo,
    setAviso,
    setError,
    acciones: {
      marcarEntrada,
      marcarSalida,
      editarJornada,
      guardarUnDia,
      borrarUnDia,
      generarElLote,
      borrarLote,
      editarDelLote,
      guardarConfiguracion,
      enviar,
      empezar,
      limpiarBitacora,
      exportar,
      importar,
      borrarTodo,
    },
  };
}
